// Passcode-gated admin server fns. Every fn validates the passcode SERVER-side
// against ADMIN_PASSCODE (unset env = admin disabled entirely).
// zod-validated inputs; every mutation writes to the audit trail via the repo.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { METRICS } from "@/lib/awards-engine/metricCatalog";
import type { AwardDef, AwardRunResult, EngineData } from "@/lib/awards-engine/types";
import type { AuditRow, AwardRunRow, IssuanceRow, PrizeRow } from "@/lib/server/awardsRepo";

const ACTOR = "admin";

function requireAdmin(passcode: unknown): void {
  const expected = process.env.ADMIN_PASSCODE;
  if (!expected || passcode !== expected) {
    throw new Error("Unauthorized: bad or missing admin passcode");
  }
}

async function repo() {
  const [{ getDb }, { makeAwardsRepo }, { SEED_AWARD_DEFS }] = await Promise.all([
    import("@/lib/server/db"),
    import("@/lib/server/awardsRepo"),
    import("@/lib/awards-engine/seeds"),
  ]);
  const r = makeAwardsRepo(getDb());
  r.seedIfEmpty(SEED_AWARD_DEFS);
  return r;
}

// --- schemas ---

const scopeSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("all") }),
  z.object({
    type: z.literal("size"),
    sizes: z.array(z.enum(["Extra Large", "Medium", "Small", "Family Group"])).min(1),
  }),
  z.object({ type: z.literal("list"), communityIds: z.array(z.string()).min(1) }),
]);

const metricIdSchema = z.enum(METRICS.map((m) => m.id) as [string, ...string[]]);

export const defSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]{1,39}$/, "lowercase slug, 2-40 chars"),
    name: z.string().min(2).max(60),
    subtitle: z.string().max(120).default(""),
    emoji: z.string().min(1).max(8),
    tone: z.enum(["gold", "teal", "violet", "rose", "blue"]),
    evaluator: z.enum(["metric_rank", "david", "triple_header", "trophy_count"]),
    metricId: metricIdSchema.optional(),
    scope: scopeSchema,
    tiers: z.union([z.literal(1), z.literal(3)]),
    window: z.string().max(40).default("campaign"),
    tieBreakers: z.array(metricIdSchema).max(4).default([]),
    eligibility: z
      .object({
        minWeeksReported: z.number().int().min(0).max(5).optional(),
        requireAllCategories: z.boolean().optional(),
        excludeCommunityIds: z.array(z.string()).optional(),
        requirePositive: z.boolean().optional(),
      })
      .default({}),
    prizes: z
      .array(
        z.object({
          tier: z.number().int().min(1).max(3),
          type: z.enum(["cash", "gift_card", "other"]),
          valueUsd: z.number().min(0).max(100000),
          label: z.string().max(80),
        }),
      )
      .max(3)
      .default([]),
    blurb: z.string().max(200).default(""),
    status: z.enum(["draft", "active", "archived"]),
    sort: z.number().int().default(0),
  })
  .superRefine((v, ctx) => {
    if (v.evaluator === "metric_rank" && !v.metricId) {
      ctx.addIssue({ code: "custom", message: "metric_rank awards need a metric", path: ["metricId"] });
    }
  });

const prizeSchema = z.object({
  id: z.number().int().positive().optional(),
  label: z.string().min(2).max(80),
  type: z.enum(["cash", "gift_card", "other"]),
  valueUsd: z.number().min(0).max(100000),
  qtyTotal: z.number().int().min(0).max(10000),
  notes: z.string().max(300).default(""),
});

// --- run computation shared by preview/finalize ---

async function computeRun(defId: string) {
  const r = await repo();
  const def = r.getDef(defId);
  if (!def) throw new Error(`Unknown award: ${defId}`);
  const { loadLiveCommunities } = await import("@/lib/server/liveCommunities");
  const { evaluateAward } = await import("@/lib/awards-engine/engine");
  const preferTab = def.window.startsWith("month:") ? def.window.slice(6) : undefined;
  const live = await loadLiveCommunities(preferTab);
  const data: EngineData = { communities: live.communities, trophyCounts: r.trophyCounts() };
  const results = evaluateAward(def, data);
  return { r, def, live, results, preferTab };
}

// --- server fns ---

export interface AdminStatePayload {
  ok: boolean;
  defs: AwardDef[];
  latestRuns: Record<string, AwardRunRow>;
  prizes: PrizeRow[];
  issuances: IssuanceRow[];
  audit: AuditRow[];
  trophyCounts: Record<string, number>;
}

export const adminState = createServerFn({ method: "POST" })
  .inputValidator((d: { passcode: string }) => d)
  .handler(async ({ data }): Promise<AdminStatePayload> => {
    requireAdmin(data.passcode);
    const r = await repo();
    return {
      ok: true,
      defs: r.listDefs(true),
      latestRuns: r.latestFinalRuns(),
      prizes: r.listPrizes(),
      issuances: r.listIssuances(),
      audit: r.listAudit(100),
      trophyCounts: r.trophyCounts(),
    };
  });

export const adminSaveDef = createServerFn({ method: "POST" })
  .inputValidator((d: { passcode: string; def: unknown; isNew?: boolean }) => d)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    requireAdmin(data.passcode);
    const parsed = defSchema.safeParse(data.def);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
    }
    const r = await repo();
    if (data.isNew && r.getDef(parsed.data.id)) {
      return { ok: false, error: `An award with id "${parsed.data.id}" already exists — pick a different id.` };
    }
    r.saveDef(parsed.data as AwardDef, ACTOR);
    return { ok: true };
  });

export interface RunPreviewPayload {
  ok: boolean;
  results: AwardRunResult;
  source: "live" | "snapshot";
  month: string | null;
  message?: string;
}

export const adminRunPreview = createServerFn({ method: "POST" })
  .inputValidator((d: { passcode: string; defId: string }) => d)
  .handler(async ({ data }): Promise<RunPreviewPayload> => {
    requireAdmin(data.passcode);
    const { live, results } = await computeRun(data.defId);
    return { ok: true, results, source: live.source, month: live.month, message: live.message };
  });

export const adminRunFinalize = createServerFn({ method: "POST" })
  .inputValidator((d: { passcode: string; defId: string; allowSnapshot?: boolean }) => d)
  .handler(async ({ data }): Promise<{ ok: boolean; runId?: number; issuances?: number; error?: string }> => {
    requireAdmin(data.passcode);
    const { r, def, live, results, preferTab } = await computeRun(data.defId);
    if (live.source === "snapshot" && !data.allowSnapshot) {
      return { ok: false, error: "Live sheet unavailable — re-run with “allow snapshot data” to finalize anyway." };
    }
    if (preferTab && live.month !== preferTab && !data.allowSnapshot) {
      return {
        ok: false,
        error: `This award is scoped to "${preferTab}" but live data came from ${live.month ?? "the snapshot"} — tick “allow snapshot data” to finalize on that data anyway.`,
      };
    }
    const { runId, issuances } = r.finalizeRunAndIssue(
      {
        awardId: def.id,
        windowLabel: live.month ?? def.window,
        dataSource: live.source,
        results,
      },
      def,
      ACTOR,
    );
    if (live.source === "snapshot" || (preferTab && live.month !== preferTab)) {
      r.audit(ACTOR, "run.data-override", "award_run", String(runId), {
        requested: preferTab ?? "latest", used: live.month ?? "snapshot",
      });
    }
    return { ok: true, runId, issuances };
  });

export const adminSavePrize = createServerFn({ method: "POST" })
  .inputValidator((d: { passcode: string; prize: unknown }) => d)
  .handler(async ({ data }): Promise<{ ok: boolean; id?: number; error?: string }> => {
    requireAdmin(data.passcode);
    const parsed = prizeSchema.safeParse(data.prize);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
    }
    const r = await repo();
    const id = r.savePrize(parsed.data, ACTOR);
    return { ok: true, id };
  });

export const adminTransitionIssuance = createServerFn({ method: "POST" })
  .inputValidator((d: { passcode: string; id: number; to: "approved" | "issued" | "void"; prizeId?: number }) => d)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    requireAdmin(data.passcode);
    try {
      const r = await repo();
      r.transitionIssuance(data.id, data.to, ACTOR, data.prizeId);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });
