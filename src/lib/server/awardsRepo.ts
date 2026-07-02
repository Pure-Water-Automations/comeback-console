// Typed SQLite queries for the Awards Console. Server-only.
// Every write goes through audit() — the audit trail is not optional.

import type { AwardDef, AwardRunResult } from "@/lib/awards-engine/types";
import type { DB } from "./db";

export interface AwardRunRow {
  id: number;
  awardId: string;
  ranAt: string;
  windowLabel: string;
  dataSource: "live" | "snapshot";
  results: AwardRunResult;
  status: string;
}

export interface AuditRow {
  id: number;
  ts: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  detail: unknown;
}

export type IssuanceStatus = "pending" | "approved" | "issued" | "void";

export interface PrizeRow {
  id: number;
  label: string;
  type: "cash" | "gift_card" | "other";
  valueUsd: number;
  qtyTotal: number;
  qtyIssued: number;
  notes: string;
}

export interface IssuanceRow {
  id: number;
  runId: number;
  awardId: string;
  tier: number;
  communityId: string;
  prizeId: number | null;
  status: IssuanceStatus;
  createdAt: string;
  updatedAt: string;
}

const ISSUANCE_TRANSITIONS: Record<IssuanceStatus, IssuanceStatus[]> = {
  pending: ["approved", "void"],
  approved: ["issued", "void"],
  issued: [],
  void: [],
};

const now = () => new Date().toISOString();

/* eslint-disable @typescript-eslint/no-explicit-any */
function defFromRow(r: any): AwardDef {
  return {
    id: r.id, name: r.name, subtitle: r.subtitle, emoji: r.emoji, tone: r.tone,
    evaluator: r.evaluator, metricId: r.metric_id ?? undefined,
    scope: JSON.parse(r.scope), tiers: r.tiers, window: r.window,
    tieBreakers: JSON.parse(r.tie_breakers), eligibility: JSON.parse(r.eligibility),
    prizes: JSON.parse(r.prizes), blurb: r.blurb, status: r.status, sort: r.sort,
  };
}

function runFromRow(r: any): AwardRunRow {
  return {
    id: r.id, awardId: r.award_id, ranAt: r.ran_at, windowLabel: r.window_label,
    dataSource: r.data_source, results: JSON.parse(r.results), status: r.status,
  };
}

function prizeFromRow(r: any): PrizeRow {
  return {
    id: r.id, label: r.label, type: r.type, valueUsd: r.value_usd,
    qtyTotal: r.qty_total, qtyIssued: r.qty_issued, notes: r.notes,
  };
}

function issuanceFromRow(r: any): IssuanceRow {
  return {
    id: r.id, runId: r.run_id, awardId: r.award_id, tier: r.tier,
    communityId: r.community_id, prizeId: r.prize_id, status: r.status,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

export function makeAwardsRepo(db: DB) {
  const audit = (actor: string, action: string, entity: string, entityId: string, detail: unknown = {}) => {
    db.prepare("INSERT INTO audit_log (ts, actor, action, entity, entity_id, detail) VALUES (?,?,?,?,?,?)")
      .run(now(), actor, action, entity, entityId, JSON.stringify(detail));
  };

  const upsertDef = db.prepare(`
    INSERT INTO award_defs (id, name, subtitle, emoji, tone, evaluator, metric_id, scope, tiers, window,
      tie_breakers, eligibility, prizes, blurb, status, sort, created_at, updated_at)
    VALUES (@id, @name, @subtitle, @emoji, @tone, @evaluator, @metricId, @scope, @tiers, @window,
      @tieBreakers, @eligibility, @prizes, @blurb, @status, @sort, @now, @now)
    ON CONFLICT(id) DO UPDATE SET
      name=@name, subtitle=@subtitle, emoji=@emoji, tone=@tone, evaluator=@evaluator,
      metric_id=@metricId, scope=@scope, tiers=@tiers, window=@window, tie_breakers=@tieBreakers,
      eligibility=@eligibility, prizes=@prizes, blurb=@blurb, status=@status, sort=@sort, updated_at=@now
  `);

  const writeDef = (def: AwardDef) =>
    upsertDef.run({
      id: def.id, name: def.name, subtitle: def.subtitle, emoji: def.emoji, tone: def.tone,
      evaluator: def.evaluator, metricId: def.metricId ?? null,
      scope: JSON.stringify(def.scope), tiers: def.tiers, window: def.window,
      tieBreakers: JSON.stringify(def.tieBreakers), eligibility: JSON.stringify(def.eligibility),
      prizes: JSON.stringify(def.prizes), blurb: def.blurb, status: def.status, sort: def.sort,
      now: now(),
    });

  return {
    audit,

    // --- award defs ---
    listDefs(includeArchived = false): AwardDef[] {
      const rows = includeArchived
        ? db.prepare("SELECT * FROM award_defs ORDER BY sort, id").all()
        : db.prepare("SELECT * FROM award_defs WHERE status != 'archived' ORDER BY sort, id").all();
      return rows.map(defFromRow);
    },
    getDef(id: string): AwardDef | null {
      const row = db.prepare("SELECT * FROM award_defs WHERE id = ?").get(id);
      return row ? defFromRow(row) : null;
    },
    saveDef(def: AwardDef, actor: string): void {
      writeDef(def);
      audit(actor, "def.save", "award_def", def.id, { name: def.name, status: def.status });
    },
    seedIfEmpty(seeds: AwardDef[]): boolean {
      const count = (db.prepare("SELECT COUNT(*) AS n FROM award_defs").get() as any).n as number;
      if (count > 0) return false;
      const insertAll = db.transaction((defs: AwardDef[]) => {
        for (const d of defs) writeDef(d);
      });
      insertAll(seeds);
      audit("system", "seed", "award_def", "*", { count: seeds.length });
      return true;
    },

    // --- runs ---
    insertRun(
      run: { awardId: string; windowLabel: string; dataSource: "live" | "snapshot"; results: AwardRunResult },
      actor: string,
    ): number {
      const info = db
        .prepare("INSERT INTO award_runs (award_id, ran_at, window_label, data_source, results, status) VALUES (?,?,?,?,?,'final')")
        .run(run.awardId, now(), run.windowLabel, run.dataSource, JSON.stringify(run.results));
      const id = Number(info.lastInsertRowid);
      audit(actor, "run.finalize", "award_run", String(id), {
        awardId: run.awardId, windowLabel: run.windowLabel, dataSource: run.dataSource,
        winners: run.results.winners.map((w) => w.communityId),
      });
      return id;
    },
    listRuns(awardId?: string): AwardRunRow[] {
      const rows = awardId
        ? db.prepare("SELECT * FROM award_runs WHERE award_id = ? ORDER BY id DESC").all(awardId)
        : db.prepare("SELECT * FROM award_runs ORDER BY id DESC").all();
      return rows.map(runFromRow);
    },
    latestFinalRuns(): Record<string, AwardRunRow> {
      const rows = db
        .prepare("SELECT r.* FROM award_runs r JOIN (SELECT award_id, MAX(id) AS mid FROM award_runs WHERE status='final' GROUP BY award_id) m ON r.id = m.mid")
        .all();
      return Object.fromEntries(rows.map(runFromRow).map((r) => [r.awardId, r]));
    },

    // --- prizes & issuances ---
    listPrizes(): PrizeRow[] {
      return db.prepare("SELECT * FROM prizes ORDER BY id").all().map(prizeFromRow);
    },
    savePrize(p: Omit<PrizeRow, "id" | "qtyIssued"> & { id?: number }, actor: string): number {
      if (p.id) {
        db.prepare("UPDATE prizes SET label=?, type=?, value_usd=?, qty_total=?, notes=? WHERE id=?")
          .run(p.label, p.type, p.valueUsd, p.qtyTotal, p.notes, p.id);
        audit(actor, "prize.update", "prize", String(p.id), p);
        return p.id;
      }
      const info = db
        .prepare("INSERT INTO prizes (label, type, value_usd, qty_total, qty_issued, notes) VALUES (?,?,?,?,0,?)")
        .run(p.label, p.type, p.valueUsd, p.qtyTotal, p.notes);
      const id = Number(info.lastInsertRowid);
      audit(actor, "prize.create", "prize", String(id), p);
      return id;
    },
    createIssuancesForRun(runId: number, def: AwardDef, results: AwardRunResult, actor: string): number {
      const ins = db.prepare(
        "INSERT INTO prize_issuances (run_id, award_id, tier, community_id, prize_id, status, created_at, updated_at) VALUES (?,?,?,?,NULL,'pending',?,?)",
      );
      let created = 0;
      for (const w of results.winners) {
        if (!def.prizes.some((p) => p.tier === w.tier)) continue;
        ins.run(runId, def.id, w.tier, w.communityId, now(), now());
        created++;
      }
      if (created) audit(actor, "issuance.create", "award_run", String(runId), { created });
      return created;
    },
    listIssuances(status?: IssuanceStatus): IssuanceRow[] {
      const rows = status
        ? db.prepare("SELECT * FROM prize_issuances WHERE status = ? ORDER BY id DESC").all(status)
        : db.prepare("SELECT * FROM prize_issuances ORDER BY id DESC").all();
      return rows.map(issuanceFromRow);
    },
    transitionIssuance(id: number, to: IssuanceStatus, actor: string, prizeId?: number): IssuanceRow {
      const row = db.prepare("SELECT * FROM prize_issuances WHERE id = ?").get(id);
      if (!row) throw new Error(`Issuance ${id} not found`);
      const cur = issuanceFromRow(row);
      if (!ISSUANCE_TRANSITIONS[cur.status].includes(to)) {
        throw new Error(`Illegal issuance transition ${cur.status} → ${to}`);
      }
      db.prepare("UPDATE prize_issuances SET status=?, prize_id=COALESCE(?, prize_id), updated_at=? WHERE id=?")
        .run(to, prizeId ?? null, now(), id);
      if (to === "issued") {
        const linked = prizeId ?? cur.prizeId;
        if (linked) db.prepare("UPDATE prizes SET qty_issued = qty_issued + 1 WHERE id = ?").run(linked);
      }
      audit(actor, `issuance.${to}`, "prize_issuance", String(id), { from: cur.status, prizeId: prizeId ?? cur.prizeId });
      return issuanceFromRow(db.prepare("SELECT * FROM prize_issuances WHERE id = ?").get(id));
    },

    // --- trophies ---
    recordTrophies(communityId: string, achievementIds: string[], source = "console"): number {
      const ins = db.prepare(
        "INSERT OR IGNORE INTO trophy_events (community_id, achievement_id, source, unlocked_at, reported_at) VALUES (?,?,?,?,?)",
      );
      let inserted = 0;
      const tx = db.transaction((ids: string[]) => {
        for (const a of ids) inserted += ins.run(communityId, a, source, now(), now()).changes;
      });
      tx(achievementIds);
      return inserted;
    },
    trophyCounts(): Record<string, number> {
      const rows = db.prepare("SELECT community_id AS id, COUNT(*) AS n FROM trophy_events GROUP BY community_id").all();
      return Object.fromEntries(rows.map((r: any) => [r.id, r.n]));
    },

    // --- audit ---
    listAudit(limit = 200): AuditRow[] {
      return db
        .prepare("SELECT * FROM audit_log ORDER BY id DESC LIMIT ?")
        .all(limit)
        .map((r: any) => ({
          id: r.id, ts: r.ts, actor: r.actor, action: r.action,
          entity: r.entity, entityId: r.entity_id, detail: JSON.parse(r.detail),
        }));
    },
  };
}

export type AwardsRepo = ReturnType<typeof makeAwardsRepo>;
