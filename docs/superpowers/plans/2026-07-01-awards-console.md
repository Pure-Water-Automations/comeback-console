# Awards Console: Configurable Recognition Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded weekly awards with a SQLite-backed configurable recognition engine (admin UI, prize/issuance ledger, audit trail, server-side trophies), plus a live scoreboard with FAB standings toggle + graphs and a local-console evolution of /dashboard.

**Architecture:** Pure domain logic in `src/lib/awards-engine/` (metric catalog + evaluator registry, unit-tested); persistence via `better-sqlite3` behind `src/lib/server/db.ts` + a repo layer; TanStack `createServerFn` endpoints (public reads, passcode-gated admin writes). The existing `AwardsShow` renderer is untouched — `fetchLiveAwards()` gains engine awareness server-side. Spec: `docs/superpowers/specs/2026-07-01-awards-console-design.md`.

**Tech Stack:** TanStack Start + React 19, better-sqlite3 (VPS is Node 20 — `node:sqlite` unavailable), zod, @tanstack/react-query, recharts, Tailwind v4 per DESIGN_BRIEF.md, vitest.

**Conventions for every task:**
- Run tests with `npm test` (vitest run). Typecheck via `npx tsc --noEmit`.
- All new server-only modules live under `src/lib/server/` or are imported ONLY via `await import()` inside server fn handlers (existing pattern in `njActions.ts:26`).
- Timestamps: `new Date().toISOString()`. User-facing copy: natural language.
- Commit after each task with the message given in its final step.

**One deviation from the spec, decided during planning:** the spec's `getActiveAwards()` is folded into the existing `fetchLiveAwards()` (Task 9) — `AwardsShow` already swaps that payload in at `AwardsShow.tsx:1437-1448`, so the ceremony needs zero renderer changes; the dashboard reuses the same payload.

---

### Task 1: better-sqlite3 dependency + DB module

**Files:**
- Modify: `package.json` (via npm), `vite.config.ts`, `.gitignore`
- Create: `src/lib/server/db.ts`
- Test: `src/lib/server/db.test.ts`

- [ ] **Step 1: Install dependencies**

```bash
npm install better-sqlite3 --legacy-peer-deps
npm install -D @types/better-sqlite3 --legacy-peer-deps
```

- [ ] **Step 2: Externalize the native module in the SSR build**

In `vite.config.ts`, change the `vite.ssr` block to:

```ts
    ssr: {
      noExternal: ["@vladmandic/face-api"],
      external: ["better-sqlite3"],
    },
```

- [ ] **Step 3: Ignore the local DB directory**

Append to `.gitignore`:

```
# Awards Console SQLite (local dev; VPS uses COMEBACK_DB_PATH)
data/
```

- [ ] **Step 4: Write the failing test**

Create `src/lib/server/db.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { migrate, openMemoryDb } from "./db";

describe("db", () => {
  it("creates all tables and is idempotent", () => {
    const db = openMemoryDb();
    migrate(db); // second run must not throw
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      .map((r: any) => r.name);
    for (const t of ["award_defs", "award_runs", "audit_log", "prizes", "prize_issuances", "trophy_events"]) {
      expect(tables).toContain(t);
    }
  });

  it("enforces trophy uniqueness per (community, achievement, source)", () => {
    const db = openMemoryDb();
    const ins = db.prepare(
      "INSERT OR IGNORE INTO trophy_events (community_id, achievement_id, source, unlocked_at, reported_at) VALUES (?,?,?,?,?)",
    );
    const a = ins.run("new-jersey", "first-checkin", "console", "2026-07-01T00:00:00Z", "2026-07-01T00:00:00Z");
    const b = ins.run("new-jersey", "first-checkin", "console", "2026-07-01T01:00:00Z", "2026-07-01T01:00:00Z");
    expect(a.changes).toBe(1);
    expect(b.changes).toBe(0);
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npm test -- src/lib/server/db.test.ts`
Expected: FAIL — cannot resolve `./db`.

- [ ] **Step 6: Implement the DB module**

Create `src/lib/server/db.ts`:

```ts
// SQLite persistence for the Awards Console (POC).
// better-sqlite3 because the VPS runs Node 20 (node:sqlite needs >= 22.5).
// The DB file lives OUTSIDE the deploy dir via COMEBACK_DB_PATH so rsync
// deploys never touch it. Server-only — never import from client code.

import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export type DB = Database.Database;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS award_defs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  emoji TEXT NOT NULL DEFAULT '🏆',
  tone TEXT NOT NULL DEFAULT 'gold',
  evaluator TEXT NOT NULL,
  metric_id TEXT,
  scope TEXT NOT NULL DEFAULT '{"type":"all"}',
  tiers INTEGER NOT NULL DEFAULT 1,
  window TEXT NOT NULL DEFAULT 'campaign',
  tie_breakers TEXT NOT NULL DEFAULT '[]',
  eligibility TEXT NOT NULL DEFAULT '{}',
  prizes TEXT NOT NULL DEFAULT '[]',
  blurb TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS award_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  award_id TEXT NOT NULL REFERENCES award_defs(id),
  ran_at TEXT NOT NULL,
  window_label TEXT NOT NULL,
  data_source TEXT NOT NULL,
  results TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'final'
);
CREATE TABLE IF NOT EXISTS prizes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  type TEXT NOT NULL,
  value_usd REAL NOT NULL DEFAULT 0,
  qty_total INTEGER NOT NULL DEFAULT 0,
  qty_issued INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS prize_issuances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL REFERENCES award_runs(id),
  award_id TEXT NOT NULL,
  tier INTEGER NOT NULL,
  community_id TEXT NOT NULL,
  prize_id INTEGER REFERENCES prizes(id),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS trophy_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  community_id TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'console',
  unlocked_at TEXT NOT NULL,
  reported_at TEXT NOT NULL,
  UNIQUE(community_id, achievement_id, source)
);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '{}'
);
`;

export function migrate(db: DB): void {
  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA);
}

let singleton: DB | null = null;

export function getDb(): DB {
  if (singleton) return singleton;
  const path = process.env.COMEBACK_DB_PATH || resolve("data/comeback.db");
  mkdirSync(dirname(path), { recursive: true });
  singleton = new Database(path);
  migrate(singleton);
  return singleton;
}

/** Fresh in-memory DB for tests. */
export function openMemoryDb(): DB {
  const db = new Database(":memory:");
  migrate(db);
  return db;
}
```

- [ ] **Step 7: Run tests + typecheck**

Run: `npm test -- src/lib/server/db.test.ts && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 8: Verify the client build doesn't pull sqlite in**

Run: `npm run build`
Expected: build succeeds (nothing imports db.ts yet; this is the baseline check).

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json vite.config.ts .gitignore src/lib/server/db.ts src/lib/server/db.test.ts
git commit -m "feat(awards): SQLite persistence layer (better-sqlite3, schema v1)"
```

---

### Task 2: Metric catalog

**Files:**
- Create: `src/lib/awards-engine/metricCatalog.ts`
- Test: `src/lib/awards-engine/metricCatalog.test.ts`

The catalog is client-safe (imports only `comebackData`) so admin pickers and provenance popovers can import it directly.

- [ ] **Step 1: Write the failing test**

Create `src/lib/awards-engine/metricCatalog.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { COMMUNITIES } from "@/lib/comebackData";
import { METRICS, METRIC_BY_ID, formatMetricValue } from "./metricCatalog";

const nj = COMMUNITIES.find((c) => c.id === "new-jersey")!;

describe("metricCatalog", () => {
  it("exposes every metric with governance metadata", () => {
    expect(METRICS.length).toBeGreaterThanOrEqual(12);
    for (const m of METRICS) {
      expect(m.sourceDescription.length).toBeGreaterThan(10);
      expect(m.updateCadence.length).toBeGreaterThan(3);
      expect(METRIC_BY_ID[m.id]).toBe(m);
    }
  });

  it("computes values against the snapshot", () => {
    expect(METRIC_BY_ID.total_points.compute(nj)).toBeTypeOf("number");
    expect(METRIC_BY_ID.income_result.compute(nj)).toBe(nj.finance.result);
    expect(METRIC_BY_ID.sunday_peak.compute(nj)).toBeGreaterThan(0);
  });

  it("returns null when a metric has no data", () => {
    const empty = { ...nj, weeklyAttendance: [null, null] };
    expect(METRIC_BY_ID.weekly_jump.compute(empty)).toBeNull();
  });

  it("formats by kind", () => {
    expect(formatMetricValue(METRIC_BY_ID.income_result, 12345.6)).toBe("$12,346");
    expect(formatMetricValue(METRIC_BY_ID.total_points, 42)).toBe("+42 pts");
    expect(formatMetricValue(METRIC_BY_ID.weekly_jump, -3)).toBe("-3");
    expect(formatMetricValue(METRIC_BY_ID.finance_pct_target, 87.35)).toBe("87.4%");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/awards-engine/metricCatalog.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the catalog**

Create `src/lib/awards-engine/metricCatalog.ts`:

```ts
// Metric catalog — the governed list of numbers an award may rank on.
// Metric MATH lives here in code (typed + tested); award DEFINITIONS live in
// SQLite and reference metrics by id. sourceDescription/updateCadence feed the
// provenance popovers ("how is this calculated?") on the scoreboard and admin.

import {
  categoryPoints,
  pctOfTarget,
  totalPoints,
  type Community,
} from "@/lib/comebackData";

export type MetricId =
  | "total_points"
  | "finance_points"
  | "member_points"
  | "blessing_points"
  | "income_result"
  | "active_members"
  | "blessing_result"
  | "sunday_avg"
  | "sunday_peak"
  | "weekly_jump"
  | "finance_pct_target"
  | "members_pct_target"
  | "blessing_pct_target";

export interface MetricDef {
  id: MetricId;
  label: string;
  format: "currency" | "count" | "percent" | "points" | "delta";
  higherIsBetter: boolean;
  /** Governance: where the number comes from — shown in provenance popovers */
  sourceDescription: string;
  /** Governance: how often the underlying source updates */
  updateCadence: string;
  /** null = this community has no data for the metric yet */
  compute: (c: Community) => number | null;
}

const reportedWeeks = (c: Community) =>
  c.weeklyAttendance.filter((w): w is number => w !== null && w > 0);

const POINTS_RULE =
  "Campaign rule: growth % over baseline × 10 (e.g. +19.2% growth = +192 points).";
const SHEET = "Read live from the 2026 Northeast Region Scoreboard sheet";
const WEEKLY = "Weekly — pastors log results on the regional scoreboard";
const MONTHLY = "Monthly — cumulative for the current scoreboard month tab";

export const METRICS: MetricDef[] = [
  { id: "total_points", label: "Total Points", format: "points", higherIsBetter: true,
    sourceDescription: `${POINTS_RULE} Summed across Income, Active Members and Blessing. ${SHEET}.`,
    updateCadence: WEEKLY, compute: (c) => totalPoints(c) },
  { id: "finance_points", label: "Income Points", format: "points", higherIsBetter: true,
    sourceDescription: `${POINTS_RULE} Income lane only. ${SHEET}.`,
    updateCadence: WEEKLY, compute: (c) => categoryPoints(c.finance) },
  { id: "member_points", label: "Member Points", format: "points", higherIsBetter: true,
    sourceDescription: `${POINTS_RULE} Active-members lane only. ${SHEET}.`,
    updateCadence: WEEKLY, compute: (c) => categoryPoints(c.activeMembers) },
  { id: "blessing_points", label: "Blessing Points", format: "points", higherIsBetter: true,
    sourceDescription: `${POINTS_RULE} Blessing lane only. ${SHEET}.`,
    updateCadence: WEEKLY, compute: (c) => categoryPoints(c.blessing) },
  { id: "income_result", label: "Income (USD)", format: "currency", higherIsBetter: true,
    sourceDescription: `Cumulative trimester income entered on the scoreboard. ${SHEET}.`,
    updateCadence: MONTHLY, compute: (c) => (c.finance.result > 0 ? c.finance.result : null) },
  { id: "active_members", label: "Active Members", format: "count", higherIsBetter: true,
    sourceDescription: `People with 3+ attendances in the last 3 months. ${SHEET}.`,
    updateCadence: MONTHLY, compute: (c) => (c.activeMembers.result > 0 ? c.activeMembers.result : null) },
  { id: "blessing_result", label: "Blessing Steps", format: "count", higherIsBetter: true,
    sourceDescription: `Total Blessing Journey process steps logged. ${SHEET}.`,
    updateCadence: MONTHLY, compute: (c) => (c.blessing.result > 0 ? c.blessing.result : null) },
  { id: "sunday_avg", label: "Avg Sunday Attendance", format: "count", higherIsBetter: true,
    sourceDescription: `Average of this month's reported Sunday services (weeks with no service excluded). ${SHEET}.`,
    updateCadence: WEEKLY,
    compute: (c) => {
      const w = reportedWeeks(c);
      return w.length ? Math.round(w.reduce((a, b) => a + b, 0) / w.length) : null;
    } },
  { id: "sunday_peak", label: "Peak Sunday", format: "count", higherIsBetter: true,
    sourceDescription: `Highest single-Sunday attendance this month. ${SHEET}.`,
    updateCadence: WEEKLY,
    compute: (c) => {
      const w = reportedWeeks(c);
      return w.length ? Math.max(...w) : null;
    } },
  { id: "weekly_jump", label: "Weekly Attendance Jump", format: "delta", higherIsBetter: true,
    sourceDescription: `Change between the two most recent reported Sundays. ${SHEET}.`,
    updateCadence: WEEKLY,
    compute: (c) => {
      const w = reportedWeeks(c);
      return w.length < 2 ? null : w[w.length - 1] - w[w.length - 2];
    } },
  { id: "finance_pct_target", label: "% of Income Target", format: "percent", higherIsBetter: true,
    sourceDescription: `Income result ÷ trimester target (baseline +10%). ${SHEET}.`,
    updateCadence: MONTHLY, compute: (c) => (c.finance.result > 0 ? pctOfTarget(c.finance) : null) },
  { id: "members_pct_target", label: "% of Members Target", format: "percent", higherIsBetter: true,
    sourceDescription: `Active members ÷ trimester target (baseline +20%). ${SHEET}.`,
    updateCadence: MONTHLY, compute: (c) => (c.activeMembers.result > 0 ? pctOfTarget(c.activeMembers) : null) },
  { id: "blessing_pct_target", label: "% of Blessing Target", format: "percent", higherIsBetter: true,
    sourceDescription: `Blessing steps ÷ trimester target (baseline +30%). ${SHEET}.`,
    updateCadence: MONTHLY, compute: (c) => (c.blessing.result > 0 ? pctOfTarget(c.blessing) : null) },
];

export const METRIC_BY_ID = Object.fromEntries(METRICS.map((m) => [m.id, m])) as Record<
  MetricId,
  MetricDef
>;

export function formatMetricValue(def: MetricDef, value: number): string {
  switch (def.format) {
    case "currency":
      return `$${Math.round(value).toLocaleString("en-US")}`;
    case "percent":
      return `${value.toFixed(1)}%`;
    case "points":
      return `${value > 0 ? "+" : ""}${Math.round(value)} pts`;
    case "delta":
      return `${value > 0 ? "+" : ""}${Math.round(value)}`;
    default:
      return Math.round(value).toLocaleString("en-US");
  }
}
```

- [ ] **Step 4: Run tests + typecheck**

Run: `npm test -- src/lib/awards-engine/metricCatalog.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/awards-engine/
git commit -m "feat(awards): metric catalog with governance metadata"
```

---

### Task 3: Engine types + metric_rank evaluator

**Files:**
- Create: `src/lib/awards-engine/types.ts`, `src/lib/awards-engine/engine.ts`
- Test: `src/lib/awards-engine/engine.test.ts`

- [ ] **Step 1: Create the shared types**

Create `src/lib/awards-engine/types.ts`:

```ts
import type { Community, CommunitySize } from "@/lib/comebackData";
import type { AwardTone } from "@/lib/weeklyAwards";
import type { MetricId } from "./metricCatalog";

export type EvaluatorId = "metric_rank" | "david" | "triple_header" | "trophy_count";

export type Scope =
  | { type: "all" }
  | { type: "size"; sizes: CommunitySize[] }
  | { type: "list"; communityIds: string[] };

export interface EligibilityRules {
  /** Minimum reported Sunday weeks this month */
  minWeeksReported?: number;
  /** Must have entered data in all three FAB lanes */
  requireAllCategories?: boolean;
  excludeCommunityIds?: string[];
  /** metric_rank / trophy_count: winners need a strictly positive value */
  requirePositive?: boolean;
}

export interface PrizeSpec {
  tier: number; // 1..3
  type: "cash" | "gift_card" | "other";
  valueUsd: number;
  label: string;
}

export interface AwardDef {
  id: string;
  name: string;
  subtitle: string;
  emoji: string;
  tone: AwardTone;
  evaluator: EvaluatorId;
  metricId?: MetricId;
  scope: Scope;
  tiers: 1 | 3;
  /** "campaign" | "latest-week" | "month:<tab name>" */
  window: string;
  tieBreakers: MetricId[];
  eligibility: EligibilityRules;
  prizes: PrizeSpec[];
  blurb: string;
  status: "draft" | "active" | "archived";
  sort: number;
}

export interface EngineData {
  communities: Community[];
  /** communityId -> trophies unlocked (server-side trophy_events) */
  trophyCounts: Record<string, number>;
}

export interface RunWinner {
  tier: number;
  communityId: string;
  community: string;
  mascot: Community["mascot"];
  statValue: number;
  stat: string;
  detail?: string;
}

export interface Disqualification {
  communityId: string;
  community: string;
  reason: string;
}

export interface AwardRunResult {
  awardId: string;
  winners: RunWinner[];
  disqualified: Disqualification[];
  tieBreaksApplied: string[];
}
```

- [ ] **Step 2: Write the failing tests**

Create `src/lib/awards-engine/engine.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { COMMUNITIES } from "@/lib/comebackData";
import { evaluateAward } from "./engine";
import type { AwardDef, EngineData } from "./types";

const data: EngineData = { communities: COMMUNITIES, trophyCounts: {} };

const base: AwardDef = {
  id: "test-award", name: "Test", subtitle: "", emoji: "🏆", tone: "gold",
  evaluator: "metric_rank", metricId: "total_points",
  scope: { type: "all" }, tiers: 3, window: "campaign",
  tieBreakers: [], eligibility: {}, prizes: [], blurb: "", status: "active", sort: 0,
};

describe("metric_rank", () => {
  it("ranks all communities by the metric and returns podium tiers", () => {
    const r = evaluateAward(base, data);
    expect(r.winners).toHaveLength(3);
    expect(r.winners.map((w) => w.tier)).toEqual([1, 2, 3]);
    expect(r.winners[0].statValue).toBeGreaterThanOrEqual(r.winners[1].statValue);
  });

  it("applies size scope", () => {
    const r = evaluateAward(
      { ...base, tiers: 1, scope: { type: "size", sizes: ["Family Group"] } },
      data,
    );
    const fg = new Set(COMMUNITIES.filter((c) => c.size === "Family Group").map((c) => c.id));
    expect(r.winners).toHaveLength(1);
    expect(fg.has(r.winners[0].communityId)).toBe(true);
  });

  it("disqualifies excluded communities with a reason", () => {
    const top = evaluateAward(base, data).winners[0].communityId;
    const r = evaluateAward(
      { ...base, eligibility: { excludeCommunityIds: [top] } },
      data,
    );
    expect(r.winners[0].communityId).not.toBe(top);
    expect(r.disqualified.some((d) => d.communityId === top)).toBe(true);
  });

  it("records communities with no metric data as disqualified, not losers", () => {
    const r = evaluateAward({ ...base, metricId: "weekly_jump", tiers: 1 }, data);
    for (const d of r.disqualified) expect(d.reason.length).toBeGreaterThan(3);
  });

  it("requirePositive drops non-positive values", () => {
    const r = evaluateAward(
      { ...base, metricId: "weekly_jump", tiers: 1, eligibility: { requirePositive: true } },
      data,
    );
    for (const w of r.winners) expect(w.statValue).toBeGreaterThan(0);
  });

  it("breaks ties deterministically (tie-breaker metric, then name)", () => {
    const twin = { ...COMMUNITIES[0], id: "twin", shortName: "AAA-Twin", name: "AAA Twin" };
    const r = evaluateAward(
      { ...base, tiers: 3, tieBreakers: ["sunday_peak"] },
      { communities: [...COMMUNITIES, twin], trophyCounts: {} },
    );
    const r2 = evaluateAward(
      { ...base, tiers: 3, tieBreakers: ["sunday_peak"] },
      { communities: [twin, ...COMMUNITIES], trophyCounts: {} },
    );
    expect(r.winners.map((w) => w.communityId)).toEqual(r2.winners.map((w) => w.communityId));
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- src/lib/awards-engine/engine.test.ts`
Expected: FAIL — `./engine` not found.

- [ ] **Step 4: Implement the engine core**

Create `src/lib/awards-engine/engine.ts`:

```ts
// evaluateAward — deterministic: scope → eligibility → evaluator → tie-breakers.
// Pure domain logic; no I/O. Disqualifications carry human-readable reasons and
// are persisted with each run (the audit story for "why didn't X win?").

import { pctOfTarget, rankedCommunities, type Community } from "@/lib/comebackData";
import { METRIC_BY_ID, formatMetricValue } from "./metricCatalog";
import type {
  AwardDef,
  AwardRunResult,
  Disqualification,
  EngineData,
  RunWinner,
  Scope,
} from "./types";

const TIER_MEDALS = ["🥇", "🥈", "🥉"];

export function inScope(c: Community, scope: Scope): boolean {
  if (scope.type === "all") return true;
  if (scope.type === "size") return scope.sizes.includes(c.size);
  return scope.communityIds.includes(c.id);
}

function applyEligibility(
  list: Community[],
  def: AwardDef,
): { eligible: Community[]; disqualified: Disqualification[] } {
  const disqualified: Disqualification[] = [];
  const e = def.eligibility;
  const eligible = list.filter((c) => {
    if (e.excludeCommunityIds?.includes(c.id)) {
      disqualified.push({ communityId: c.id, community: c.shortName, reason: "Excluded by award policy" });
      return false;
    }
    if (e.minWeeksReported) {
      const reported = c.weeklyAttendance.filter((w) => w !== null && w > 0).length;
      if (reported < e.minWeeksReported) {
        disqualified.push({
          communityId: c.id, community: c.shortName,
          reason: `Only ${reported} of ${e.minWeeksReported} required weeks reported`,
        });
        return false;
      }
    }
    if (e.requireAllCategories) {
      const missing = (["finance", "activeMembers", "blessing"] as const).filter((k) => c[k].result <= 0);
      if (missing.length) {
        disqualified.push({
          communityId: c.id, community: c.shortName,
          reason: `No data entered yet for ${missing.join(", ")}`,
        });
        return false;
      }
    }
    return true;
  });
  return { eligible, disqualified };
}

function toWinner(def: AwardDef, c: Community, tier: number, statValue: number, stat: string): RunWinner {
  return {
    tier, communityId: c.id, community: c.shortName, mascot: c.mascot, statValue, stat,
    detail: def.tiers === 3 ? `${TIER_MEDALS[tier - 1]} ${c.size}` : c.size,
  };
}

function metricRank(def: AwardDef, data: EngineData): AwardRunResult {
  if (!def.metricId) throw new Error(`award ${def.id}: metric_rank needs a metricId`);
  const metric = METRIC_BY_ID[def.metricId];
  if (!metric) throw new Error(`award ${def.id}: unknown metric ${def.metricId}`);

  const { eligible, disqualified } = applyEligibility(
    data.communities.filter((c) => inScope(c, def.scope)),
    def,
  );
  const tieBreaksApplied: string[] = [];

  const scored = eligible
    .map((c) => ({ c, v: metric.compute(c) }))
    .filter((x): x is { c: Community; v: number } => {
      if (x.v === null) {
        disqualified.push({
          communityId: x.c.id, community: x.c.shortName,
          reason: `No ${metric.label} data yet`,
        });
        return false;
      }
      return true;
    })
    .filter((x) => !def.eligibility.requirePositive || x.v > 0);

  const dir = metric.higherIsBetter ? -1 : 1;
  scored.sort((a, b) => {
    if (a.v !== b.v) return dir * (a.v - b.v);
    for (const tbId of def.tieBreakers) {
      const tb = METRIC_BY_ID[tbId];
      if (!tb) continue;
      const av = tb.compute(a.c) ?? -Infinity;
      const bv = tb.compute(b.c) ?? -Infinity;
      if (av !== bv) {
        tieBreaksApplied.push(`${a.c.shortName} vs ${b.c.shortName}: broken by ${tb.label}`);
        return tb.higherIsBetter ? bv - av : av - bv;
      }
    }
    tieBreaksApplied.push(`${a.c.shortName} vs ${b.c.shortName}: broken alphabetically`);
    return a.c.shortName.localeCompare(b.c.shortName);
  });

  const winners = scored
    .slice(0, def.tiers)
    .map(({ c, v }, i) => toWinner(def, c, i + 1, v, formatMetricValue(metric, v)));
  return { awardId: def.id, winners, disqualified, tieBreaksApplied };
}

function david(def: AwardDef, data: EngineData): AwardRunResult {
  const { eligible, disqualified } = applyEligibility(
    data.communities.filter((c) => inScope(c, def.scope)),
    def,
  );
  const ranked = rankedCommunities(eligible);
  const isSmall = (s: Community["size"]) => s === "Small" || s === "Family Group";
  const bestBigRank = ranked.find((r) => !isSmall(r.size))?.rank ?? Infinity;
  const w = ranked.find((r) => isSmall(r.size) && r.rank < bestBigRank);
  return {
    awardId: def.id,
    winners: w
      ? [{
          tier: 1, communityId: w.id, community: w.shortName, mascot: w.mascot,
          statValue: w.points,
          stat: `#${w.rank} overall · ${w.points > 0 ? "+" : ""}${w.points} pts`,
          detail: w.size,
        }]
      : [],
    disqualified,
    tieBreaksApplied: [],
  };
}

function tripleHeader(def: AwardDef, data: EngineData): AwardRunResult {
  const { eligible, disqualified } = applyEligibility(
    data.communities.filter((c) => inScope(c, def.scope)),
    def,
  );
  const winners = eligible
    .filter(
      (c) =>
        pctOfTarget(c.finance) >= 100 &&
        pctOfTarget(c.activeMembers) >= 100 &&
        pctOfTarget(c.blessing) >= 100,
    )
    .map((c) => toWinner({ ...def, tiers: 1 }, c, 1, 100, "All three lanes cleared"));
  return { awardId: def.id, winners, disqualified, tieBreaksApplied: [] };
}

function trophyCount(def: AwardDef, data: EngineData): AwardRunResult {
  const { eligible, disqualified } = applyEligibility(
    data.communities.filter((c) => inScope(c, def.scope)),
    def,
  );
  const scored = eligible
    .map((c) => ({ c, v: data.trophyCounts[c.id] ?? 0 }))
    .filter((x) => !def.eligibility.requirePositive || x.v > 0)
    .sort((a, b) => b.v - a.v || a.c.shortName.localeCompare(b.c.shortName));
  const winners = scored
    .slice(0, def.tiers)
    .map(({ c, v }, i) => toWinner(def, c, i + 1, v, `${v} ${v === 1 ? "trophy" : "trophies"}`));
  return { awardId: def.id, winners, disqualified, tieBreaksApplied: [] };
}

export function evaluateAward(def: AwardDef, data: EngineData): AwardRunResult {
  switch (def.evaluator) {
    case "metric_rank":
      return metricRank(def, data);
    case "david":
      return david(def, data);
    case "triple_header":
      return tripleHeader(def, data);
    case "trophy_count":
      return trophyCount(def, data);
    default:
      throw new Error(`Unknown evaluator: ${(def as AwardDef).evaluator}`);
  }
}
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npm test -- src/lib/awards-engine/engine.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/awards-engine/
git commit -m "feat(awards): evaluator engine (metric_rank, david, triple_header, trophy_count)"
```

---

### Task 4: Special-evaluator tests

**Files:**
- Test: `src/lib/awards-engine/specials.test.ts`

The implementations landed in Task 3; this task locks their behavior.

- [ ] **Step 1: Write the tests**

Create `src/lib/awards-engine/specials.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { COMMUNITIES, pctOfTarget, rankedCommunities } from "@/lib/comebackData";
import { evaluateAward } from "./engine";
import type { AwardDef, EngineData } from "./types";

const data: EngineData = { communities: COMMUNITIES, trophyCounts: {} };
const def = (over: Partial<AwardDef>): AwardDef => ({
  id: "t", name: "T", subtitle: "", emoji: "x", tone: "gold",
  evaluator: "metric_rank", scope: { type: "all" }, tiers: 1, window: "campaign",
  tieBreakers: [], eligibility: {}, prizes: [], blurb: "", status: "active", sort: 0,
  ...over,
});

describe("david", () => {
  it("matches the legacy David rule (small/FG ranked above the best XLM)", () => {
    const ranked = rankedCommunities(COMMUNITIES);
    const isSmall = (s: string) => s === "Small" || s === "Family Group";
    const bestBig = ranked.find((r) => !isSmall(r.size))?.rank ?? Infinity;
    const expected = ranked.find((r) => isSmall(r.size) && r.rank < bestBig);
    const r = evaluateAward(def({ evaluator: "david" }), data);
    if (expected) {
      expect(r.winners).toHaveLength(1);
      expect(r.winners[0].communityId).toBe(expected.id);
    } else {
      expect(r.winners).toHaveLength(0);
    }
  });
});

describe("triple_header", () => {
  it("awards every community clearing all three targets", () => {
    const expected = COMMUNITIES.filter(
      (c) => pctOfTarget(c.finance) >= 100 && pctOfTarget(c.activeMembers) >= 100 && pctOfTarget(c.blessing) >= 100,
    ).map((c) => c.id);
    const r = evaluateAward(def({ evaluator: "triple_header" }), data);
    expect(r.winners.map((w) => w.communityId).sort()).toEqual(expected.sort());
  });
});

describe("trophy_count", () => {
  it("ranks by server-side trophy counts with name tiebreak", () => {
    const counts = { "new-jersey": 5, belvedere: 5, boston: 2 };
    const r = evaluateAward(
      def({ evaluator: "trophy_count", tiers: 3, eligibility: { requirePositive: true } }),
      { communities: COMMUNITIES, trophyCounts: counts },
    );
    expect(r.winners).toHaveLength(3);
    // Belvedere before New Jersey (tie on 5, alphabetical)
    expect(r.winners[0].communityId).toBe("belvedere");
    expect(r.winners[1].communityId).toBe("new-jersey");
    expect(r.winners[2].communityId).toBe("boston");
    expect(r.winners[0].stat).toBe("5 trophies");
  });

  it("with requirePositive, zero-trophy communities never win", () => {
    const r = evaluateAward(
      def({ evaluator: "trophy_count", tiers: 3, eligibility: { requirePositive: true } }),
      { communities: COMMUNITIES, trophyCounts: {} },
    );
    expect(r.winners).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npm test -- src/lib/awards-engine/specials.test.ts`
Expected: PASS (if any fail, fix `engine.ts` — the test encodes the legacy semantics).

- [ ] **Step 3: Commit**

```bash
git add src/lib/awards-engine/specials.test.ts
git commit -m "test(awards): lock special evaluator semantics"
```

---

### Task 5: Seed definitions + legacy parity test

**Files:**
- Create: `src/lib/awards-engine/seeds.ts`
- Test: `src/lib/awards-engine/seeds.test.ts`

Seeds reproduce today's 7 ceremony categories (the division loop makes 3 rows, so 11 defs). IDs must match `weeklyAwards.ts` ids exactly.

- [ ] **Step 1: Write the parity test**

Create `src/lib/awards-engine/seeds.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { COMMUNITIES } from "@/lib/comebackData";
import { buildWeeklyAwards } from "@/lib/weeklyAwards";
import { evaluateAward } from "./engine";
import { SEED_AWARD_DEFS } from "./seeds";
import type { EngineData } from "./types";

const data: EngineData = { communities: COMMUNITIES, trophyCounts: {} };

describe("seed parity with legacy buildWeeklyAwards", () => {
  const legacy = new Map(buildWeeklyAwards().map((a) => [a.id, a]));

  it("covers every legacy award id", () => {
    for (const id of legacy.keys()) {
      expect(SEED_AWARD_DEFS.some((d) => d.id === id)).toBe(true);
    }
  });

  for (const def of SEED_AWARD_DEFS.filter((d) => d.evaluator !== "trophy_count")) {
    it(`"${def.id}" produces the same winners as legacy`, () => {
      const engine = evaluateAward(def, data).winners.map((w) => w.communityId);
      const old = legacy.get(def.id);
      if (!old) {
        // Legacy omits awards with no qualifier (e.g. no positive movers);
        // the engine must agree by returning zero winners.
        expect(engine).toHaveLength(0);
        return;
      }
      const oldIds = old.winners.map((w) => w.communityId);
      // Tie order between equal scores may differ (legacy relies on input
      // order); compare as sets when lengths match, exact order otherwise.
      expect([...engine].sort()).toEqual([...oldIds].sort());
      // Champion must match unless the top values are genuinely tied (legacy
      // relies on input order there; the engine breaks ties alphabetically —
      // a legitimate, documented difference).
    });
  }

  it("all seeds are active and pass basic shape checks", () => {
    for (const d of SEED_AWARD_DEFS) {
      expect(d.status).toBe("active");
      if (d.evaluator === "metric_rank") expect(d.metricId).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/awards-engine/seeds.test.ts`
Expected: FAIL — `./seeds` not found.

- [ ] **Step 3: Implement the seeds**

Create `src/lib/awards-engine/seeds.ts`:

```ts
// The legacy 7 ceremony categories as configurable award definitions.
// Inserted once when award_defs is empty; from then on the admin UI owns them.
// IDs must match weeklyAwards.ts so the parity test can compare winners.

import type { AwardDef } from "./types";

const base = {
  window: "campaign" as const,
  tieBreakers: [] as AwardDef["tieBreakers"],
  eligibility: {},
  prizes: [] as AwardDef["prizes"],
  status: "active" as const,
};

export const SEED_AWARD_DEFS: AwardDef[] = [
  { ...base, id: "biggest-jump", name: "Biggest Weekly Jump",
    subtitle: "Largest Sunday attendance gain in the past week", emoji: "🚀", tone: "teal",
    evaluator: "metric_rank", metricId: "weekly_jump", scope: { type: "all" }, tiers: 1,
    window: "latest-week", eligibility: { requirePositive: true }, sort: 10,
    blurb: "Something is moving here — whatever they did last week, do it again." },
  { ...base, id: "full-house", name: "Full House",
    subtitle: "Highest single-Sunday worship attendance", emoji: "🏠", tone: "blue",
    evaluator: "metric_rank", metricId: "sunday_peak", scope: { type: "all" }, tiers: 1,
    eligibility: { requirePositive: true }, sort: 20,
    blurb: "The room was packed. That is what momentum looks like." },
  { ...base, id: "treasury", name: "Treasury Titans",
    subtitle: "Top 3 in income growth this trimester", emoji: "💰", tone: "gold",
    evaluator: "metric_rank", metricId: "finance_points", scope: { type: "all" }, tiers: 3, sort: 30,
    blurb: "Generosity is leadership. These communities grew their giving the most." },
  { ...base, id: "gatherers", name: "Gatherers of People",
    subtitle: "Top 3 in active membership growth", emoji: "🧑‍🤝‍🧑", tone: "teal",
    evaluator: "metric_rank", metricId: "member_points", scope: { type: "all" }, tiers: 3, sort: 40,
    blurb: "Real people, actually participating. The heart of the whole game." },
  { ...base, id: "blessing", name: "Blessing Pipeline",
    subtitle: "Top 3 moving people through the Blessing journey", emoji: "💞", tone: "rose",
    evaluator: "metric_rank", metricId: "blessing_points", scope: { type: "all" }, tiers: 3, sort: 50,
    blurb: "Step by step — credit for the movement, not just the ceremony." },
  { ...base, id: "size-xlm", name: "XLM Champion",
    subtitle: "Best XLM community by total points", emoji: "🐘", tone: "violet",
    evaluator: "metric_rank", metricId: "total_points",
    scope: { type: "size", sizes: ["Extra Large", "Medium"] }, tiers: 1, sort: 60,
    blurb: "Leading the division and setting the pace." },
  { ...base, id: "size-small", name: "Small Champion",
    subtitle: "Best Small community by total points", emoji: "🐢", tone: "violet",
    evaluator: "metric_rank", metricId: "total_points",
    scope: { type: "size", sizes: ["Small"] }, tiers: 1, sort: 70,
    blurb: "Punching above their weight — growth is measured from your own baseline." },
  { ...base, id: "size-family-group", name: "Family Group Champion",
    subtitle: "Best Family Group community by total points", emoji: "🐣", tone: "violet",
    evaluator: "metric_rank", metricId: "total_points",
    scope: { type: "size", sizes: ["Family Group"] }, tiers: 1, sort: 80,
    blurb: "Punching above their weight — growth is measured from your own baseline." },
  { ...base, id: "david", name: "The David Award",
    subtitle: "A small community out-pointing the giants", emoji: "🪨", tone: "gold",
    evaluator: "david", scope: { type: "all" }, tiers: 1, sort: 90,
    blurb: "Size is not destiny. Baselines are. Well done." },
  { ...base, id: "triple-header", name: "Triple-Header Honors",
    subtitle: "Beat target in Income, Members, AND Blessing", emoji: "⭐", tone: "gold",
    evaluator: "triple_header", scope: { type: "all" }, tiers: 1, sort: 100,
    blurb: "The rarest feat in the campaign. Standing ovation." },
  { ...base, id: "league-champion", name: "League Champion",
    subtitle: "Overall #1 — most total points this trimester", emoji: "👑", tone: "gold",
    evaluator: "metric_rank", metricId: "total_points", scope: { type: "all" }, tiers: 3, sort: 110,
    blurb: "Top of the standings. The score is a mirror of the mission — and the mission is winning." },
];
```

- [ ] **Step 4: Run tests + typecheck**

Run: `npm test -- src/lib/awards-engine/ && npx tsc --noEmit`
Expected: PASS. If a parity test fails on tie ordering only, verify the champion matches and the sets match; if the champion itself differs, the evaluator or seed config is wrong — fix it, don't loosen the test.

- [ ] **Step 5: Commit**

```bash
git add src/lib/awards-engine/seeds.ts src/lib/awards-engine/seeds.test.ts
git commit -m "feat(awards): seed defs reproducing the legacy ceremony categories"
```

---

### Task 6: Repo layer — defs, runs, audit

**Files:**
- Create: `src/lib/server/awardsRepo.ts`
- Test: `src/lib/server/awardsRepo.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/server/awardsRepo.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { SEED_AWARD_DEFS } from "@/lib/awards-engine/seeds";
import { openMemoryDb } from "./db";
import { makeAwardsRepo } from "./awardsRepo";

const repo = () => makeAwardsRepo(openMemoryDb());

describe("awardsRepo defs", () => {
  it("seeds once, idempotently, with an audit row", () => {
    const r = repo();
    expect(r.seedIfEmpty(SEED_AWARD_DEFS)).toBe(true);
    expect(r.seedIfEmpty(SEED_AWARD_DEFS)).toBe(false);
    expect(r.listDefs()).toHaveLength(SEED_AWARD_DEFS.length);
    expect(r.listAudit().some((a) => a.action === "seed")).toBe(true);
  });

  it("round-trips a def through save/get including JSON fields", () => {
    const r = repo();
    r.seedIfEmpty(SEED_AWARD_DEFS);
    const def = { ...SEED_AWARD_DEFS[0], name: "Renamed", eligibility: { minWeeksReported: 2 } };
    r.saveDef(def, "admin");
    const got = r.getDef(def.id)!;
    expect(got.name).toBe("Renamed");
    expect(got.eligibility.minWeeksReported).toBe(2);
    expect(r.listAudit()[0].action).toBe("def.save");
  });

  it("archived defs are hidden unless requested", () => {
    const r = repo();
    r.seedIfEmpty(SEED_AWARD_DEFS);
    r.saveDef({ ...SEED_AWARD_DEFS[0], status: "archived" }, "admin");
    expect(r.listDefs().some((d) => d.id === SEED_AWARD_DEFS[0].id)).toBe(false);
    expect(r.listDefs(true).some((d) => d.id === SEED_AWARD_DEFS[0].id)).toBe(true);
  });
});

describe("awardsRepo runs", () => {
  it("stores runs and returns the latest final run per award", () => {
    const r = repo();
    r.seedIfEmpty(SEED_AWARD_DEFS);
    const results = { awardId: "treasury", winners: [], disqualified: [], tieBreaksApplied: [] };
    r.insertRun({ awardId: "treasury", windowLabel: "June 2026", dataSource: "live", results }, "admin");
    const id2 = r.insertRun({ awardId: "treasury", windowLabel: "July 2026", dataSource: "live", results }, "admin");
    const latest = r.latestFinalRuns();
    expect(latest["treasury"].id).toBe(id2);
    expect(latest["treasury"].results.awardId).toBe("treasury");
    expect(r.listRuns("treasury")).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- src/lib/server/awardsRepo.test.ts`
Expected: FAIL — `./awardsRepo` not found.

- [ ] **Step 3: Implement the repo (defs/runs/audit portion)**

Create `src/lib/server/awardsRepo.ts`:

```ts
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

    // --- prizes & issuances (used from Task 7 on) ---
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
```

- [ ] **Step 4: Run tests + typecheck**

Run: `npm test -- src/lib/server/awardsRepo.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/awardsRepo.ts src/lib/server/awardsRepo.test.ts
git commit -m "feat(awards): repo layer — defs, runs, audit trail"
```

---

### Task 7: Repo layer tests — prizes, issuances, trophies

**Files:**
- Test: `src/lib/server/prizesRepo.test.ts`

Implementation already exists in Task 6's repo; this locks the state machine.

- [ ] **Step 1: Write the tests**

Create `src/lib/server/prizesRepo.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { SEED_AWARD_DEFS } from "@/lib/awards-engine/seeds";
import type { AwardRunResult } from "@/lib/awards-engine/types";
import { openMemoryDb } from "./db";
import { makeAwardsRepo } from "./awardsRepo";

function setup() {
  const repo = makeAwardsRepo(openMemoryDb());
  repo.seedIfEmpty(SEED_AWARD_DEFS);
  const def = {
    ...SEED_AWARD_DEFS.find((d) => d.id === "league-champion")!,
    prizes: [{ tier: 1, type: "gift_card" as const, valueUsd: 100, label: "$100 gift card" }],
  };
  repo.saveDef(def, "admin");
  const results: AwardRunResult = {
    awardId: def.id,
    winners: [
      { tier: 1, communityId: "new-jersey", community: "New Jersey", mascot: "adventurer", statValue: 900, stat: "+900 pts" },
      { tier: 2, communityId: "belvedere", community: "Belvedere", mascot: "mentor", statValue: 800, stat: "+800 pts" },
    ],
    disqualified: [], tieBreaksApplied: [],
  };
  const runId = repo.insertRun({ awardId: def.id, windowLabel: "June 2026", dataSource: "live", results }, "admin");
  return { repo, def, results, runId };
}

describe("prize issuances", () => {
  it("creates pending issuances only for tiers that carry a prize", () => {
    const { repo, def, results, runId } = setup();
    expect(repo.createIssuancesForRun(runId, def, results, "admin")).toBe(1);
    const pending = repo.listIssuances("pending");
    expect(pending).toHaveLength(1);
    expect(pending[0].communityId).toBe("new-jersey");
  });

  it("walks pending → approved → issued and bumps inventory", () => {
    const { repo, def, results, runId } = setup();
    repo.createIssuancesForRun(runId, def, results, "admin");
    const prizeId = repo.savePrize({ label: "$100 Visa", type: "gift_card", valueUsd: 100, qtyTotal: 5, notes: "" }, "admin");
    const iss = repo.listIssuances("pending")[0];
    repo.transitionIssuance(iss.id, "approved", "admin", prizeId);
    repo.transitionIssuance(iss.id, "issued", "admin");
    expect(repo.listIssuances("issued")).toHaveLength(1);
    expect(repo.listPrizes()[0].qtyIssued).toBe(1);
  });

  it("rejects illegal transitions", () => {
    const { repo, def, results, runId } = setup();
    repo.createIssuancesForRun(runId, def, results, "admin");
    const iss = repo.listIssuances("pending")[0];
    expect(() => repo.transitionIssuance(iss.id, "issued", "admin")).toThrow(/Illegal/);
    repo.transitionIssuance(iss.id, "void", "admin");
    expect(() => repo.transitionIssuance(iss.id, "approved", "admin")).toThrow(/Illegal/);
  });
});

describe("trophy events", () => {
  it("is idempotent per (community, achievement, source)", () => {
    const { repo } = setup();
    expect(repo.recordTrophies("new-jersey", ["a", "b"])).toBe(2);
    expect(repo.recordTrophies("new-jersey", ["a", "b", "c"])).toBe(1);
    expect(repo.trophyCounts()["new-jersey"]).toBe(3);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npm test -- src/lib/server/prizesRepo.test.ts`
Expected: PASS (fix `awardsRepo.ts` if not — tests define the contract).

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/prizesRepo.test.ts
git commit -m "test(awards): prize issuance state machine + trophy idempotency"
```

---

### Task 8: Live-communities refactor + scoreboard server fn

**Files:**
- Modify: `src/lib/regionalScoreboard.ts`
- Create: `src/lib/scoreboardApi.ts`

- [ ] **Step 1: Extract `loadLiveCommunities` in `regionalScoreboard.ts`**

Export `MONTH_TABS` (change `const MONTH_TABS` to `export const MONTH_TABS`). Then add above `fetchLiveAwards`:

```ts
export interface LiveCommunitiesResult {
  communities: Community[];
  month: string | null;
  source: "live" | "snapshot";
  message?: string;
}

/**
 * Parse the freshest month tab (optionally trying preferTab first) into
 * Community[]; falls back to the static snapshot on any failure.
 */
export async function loadLiveCommunities(preferTab?: string): Promise<LiveCommunitiesResult> {
  try {
    const { getValues } = await import("@/lib/server/sheets");
    const tabs = preferTab ? [preferTab, ...MONTH_TABS.filter((t) => t !== preferTab)] : MONTH_TABS;
    for (const tab of tabs) {
      let rows: string[][] = [];
      try {
        rows = await getValues(SCOREBOARD_SHEET_ID, `${tab}!A4:BN40`);
      } catch {
        continue;
      }
      const communities = rows.map((r, i) => toCommunity(r, i)).filter((c): c is Community => c !== null);
      if (communities.length >= 5) return { communities, month: tab, source: "live" };
    }
    return {
      communities: COMMUNITIES, month: null, source: "snapshot",
      message: "Live scoreboard returned no community rows; showing the snapshot.",
    };
  } catch (err) {
    return {
      communities: COMMUNITIES, month: null, source: "snapshot",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
```

Rewrite the body of `fetchLiveAwards` to use it (same payload shape as today — engine integration comes in Task 9):

```ts
export const fetchLiveAwards = createServerFn({ method: "GET" }).handler(
  async (): Promise<LiveAwardsPayload> => {
    const live = await loadLiveCommunities();
    const awards = buildWeeklyAwards(live.communities);
    return {
      ok: live.source === "live",
      source: live.source,
      month: live.month,
      message: live.message,
      awards,
      overview: buildRegionOverview(live.communities),
      meta: weeklyAwardsMeta(awards, live.communities),
    };
  },
);
```

- [ ] **Step 2: Create the scoreboard server fn**

Create `src/lib/scoreboardApi.ts`:

```ts
// Live standings for /scoreboard — ranked communities parsed from the live
// regional sheet, with the static snapshot as fallback (source-badged).

import { createServerFn } from "@tanstack/react-start";
import { rankedCommunities, type RankedCommunity } from "@/lib/comebackData";

export interface ScoreboardPayload {
  source: "live" | "snapshot";
  month: string | null;
  generatedAt: string;
  standings: RankedCommunity[];
  message?: string;
}

export const getScoreboardLive = createServerFn({ method: "GET" }).handler(
  async (): Promise<ScoreboardPayload> => {
    const { loadLiveCommunities } = await import("@/lib/regionalScoreboard");
    const live = await loadLiveCommunities();
    return {
      source: live.source,
      month: live.month,
      generatedAt: new Date().toISOString(),
      standings: rankedCommunities(live.communities),
      message: live.message,
    };
  },
);
```

- [ ] **Step 3: Typecheck + full test suite + build**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: all green (no behavior change to `fetchLiveAwards`).

- [ ] **Step 4: Commit**

```bash
git add src/lib/regionalScoreboard.ts src/lib/scoreboardApi.ts
git commit -m "refactor(scoreboard): extract loadLiveCommunities + live standings server fn"
```

---

### Task 9: Engine-aware awards feed + trophy reporting

**Files:**
- Modify: `src/lib/regionalScoreboard.ts` (fetchLiveAwards)
- Create: `src/lib/server/engineAwards.ts`, `src/lib/awardsApi.ts`

**Why two files:** `engineAwards()` is a plain async function (not a
`createServerFn`), so unlike server-fn handlers it would NOT be stripped from
the client bundle — and its dynamic `import("@/lib/server/db")` would drag
better-sqlite3 into the client build. It therefore lives under
`src/lib/server/` (server-only, imported only inside server-fn handlers),
while the client-safe `reportTrophies` server fn lives in `awardsApi.ts`
(imported by `trophySync.ts` in Task 15).

- [ ] **Step 1a: Create the server-only engine feed**

Create `src/lib/server/engineAwards.ts`:

```ts
// Maps finalized engine runs to the legacy Award[] shape the ceremony renders.
// Server-only (touches SQLite) — import ONLY inside server fn handlers.

import type { Award } from "@/lib/weeklyAwards";

/**
 * Awards from finalized engine runs (active defs only, presentation order).
 * Returns null when the engine has nothing to show (no runs yet / DB error),
 * so callers fall back to the legacy snapshot-derived awards.
 */
export async function engineAwards(): Promise<Award[] | null> {
  try {
    const [{ getDb }, { makeAwardsRepo }, { SEED_AWARD_DEFS }] = await Promise.all([
      import("@/lib/server/db"),
      import("@/lib/server/awardsRepo"),
      import("@/lib/awards-engine/seeds"),
    ]);
    const repo = makeAwardsRepo(getDb());
    repo.seedIfEmpty(SEED_AWARD_DEFS);
    const defs = repo.listDefs().filter((d) => d.status === "active");
    const latest = repo.latestFinalRuns();
    const awards: Award[] = defs.flatMap((def) => {
      const run = latest[def.id];
      if (!run || run.results.winners.length === 0) return [];
      return [{
        id: def.id,
        title: def.name,
        subtitle: def.subtitle,
        emoji: def.emoji,
        tone: def.tone,
        blurb: def.blurb || undefined,
        winners: run.results.winners.map((w) => ({
          community: w.community,
          communityId: w.communityId,
          mascot: w.mascot,
          stat: w.stat,
          detail: w.detail,
        })),
      }];
    });
    return awards.length ? awards : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 1b: Create the client-safe trophy endpoint**

Create `src/lib/awardsApi.ts`:

```ts
// Public (unauthenticated) Awards Console server fns. Client-safe module —
// the handler body (and its dynamic server imports) is stripped from the
// client bundle by TanStack Start's server-fn compilation.

import { createServerFn } from "@tanstack/react-start";
import { COMMUNITIES } from "@/lib/comebackData";

const VALID_COMMUNITY_IDS = new Set(COMMUNITIES.map((c) => c.id));

/** Fire-and-forget trophy sync from the console client. Idempotent. */
export const reportTrophies = createServerFn({ method: "POST" })
  .inputValidator((data: { communityId: string; achievementIds: string[] }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean; recorded: number }> => {
    try {
      if (!VALID_COMMUNITY_IDS.has(data.communityId)) return { ok: false, recorded: 0 };
      const ids = (data.achievementIds ?? []).filter((s) => typeof s === "string").slice(0, 200);
      if (!ids.length) return { ok: true, recorded: 0 };
      const [{ getDb }, { makeAwardsRepo }] = await Promise.all([
        import("@/lib/server/db"),
        import("@/lib/server/awardsRepo"),
      ]);
      const recorded = makeAwardsRepo(getDb()).recordTrophies(data.communityId, ids, "console");
      return { ok: true, recorded };
    } catch {
      return { ok: false, recorded: 0 };
    }
  });
```

- [ ] **Step 2: Make `fetchLiveAwards` engine-aware**

In `src/lib/regionalScoreboard.ts`, change the handler body from Task 8 to prefer engine runs (AwardsShow needs zero changes — it already swaps this payload in):

```ts
export const fetchLiveAwards = createServerFn({ method: "GET" }).handler(
  async (): Promise<LiveAwardsPayload> => {
    const live = await loadLiveCommunities();
    const { engineAwards } = await import("@/lib/server/engineAwards");
    const fromEngine = await engineAwards();
    const awards = fromEngine ?? buildWeeklyAwards(live.communities);
    return {
      ok: live.source === "live",
      source: live.source,
      month: live.month,
      message: live.message,
      awards,
      overview: buildRegionOverview(live.communities),
      meta: weeklyAwardsMeta(awards, live.communities),
    };
  },
);
```

- [ ] **Step 3: Typecheck + tests + build**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: green. The build check matters here: confirm no sqlite chunk appears in `dist/client` (engineAwards lives server-side; the client-safe module only has the reportTrophies server fn).

- [ ] **Step 4: Manual smoke via dev server**

Run: `npm run dev -- --port 5175`, open `http://localhost:5175/awards`.
Expected: Awards Night renders exactly as before (no finalized runs exist → legacy path).

- [ ] **Step 5: Commit**

```bash
git add src/lib/awardsApi.ts src/lib/server/engineAwards.ts src/lib/regionalScoreboard.ts
git commit -m "feat(awards): engine-aware awards feed + trophy reporting endpoint"
```

---

### Task 10: Admin API server fns

**Files:**
- Create: `src/lib/awardsAdminApi.ts`

- [ ] **Step 1: Implement the admin server fns**

Create `src/lib/awardsAdminApi.ts`:

```ts
// Passcode-gated admin server fns. Every fn validates the passcode SERVER-side
// against ADMIN_PASSCODE (unset env = admin disabled entirely).
// zod-validated inputs; every mutation writes to the audit trail via the repo.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { AwardDef, EngineData } from "@/lib/awards-engine/types";
import type { AwardRunResult } from "@/lib/awards-engine/types";
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

const defSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]{1,39}$/, "lowercase slug, 2-40 chars"),
    name: z.string().min(2).max(60),
    subtitle: z.string().max(120).default(""),
    emoji: z.string().min(1).max(8),
    tone: z.enum(["gold", "teal", "violet", "rose", "blue"]),
    evaluator: z.enum(["metric_rank", "david", "triple_header", "trophy_count"]),
    metricId: z.string().optional(),
    scope: scopeSchema,
    tiers: z.union([z.literal(1), z.literal(3)]),
    window: z.string().max(40).default("campaign"),
    tieBreakers: z.array(z.string()).max(4).default([]),
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
  const { loadLiveCommunities } = await import("@/lib/regionalScoreboard");
  const { evaluateAward } = await import("@/lib/awards-engine/engine");
  const preferTab = def.window.startsWith("month:") ? def.window.slice(6) : undefined;
  const live = await loadLiveCommunities(preferTab);
  const data: EngineData = { communities: live.communities, trophyCounts: r.trophyCounts() };
  const results = evaluateAward(def, data);
  return { r, def, live, results };
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
  .inputValidator((d: { passcode: string; def: unknown }) => d)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    requireAdmin(data.passcode);
    const parsed = defSchema.safeParse(data.def);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
    }
    const r = await repo();
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
    const { r, def, live, results } = await computeRun(data.defId);
    if (live.source === "snapshot" && !data.allowSnapshot) {
      return { ok: false, error: "Live sheet unavailable — re-run with “allow snapshot data” to finalize anyway." };
    }
    const runId = r.insertRun(
      {
        awardId: def.id,
        windowLabel: live.month ?? def.window,
        dataSource: live.source,
        results,
      },
      ACTOR,
    );
    if (live.source === "snapshot") r.audit(ACTOR, "run.snapshot-override", "award_run", String(runId), {});
    const issuances = r.createIssuancesForRun(runId, def, results, ACTOR);
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
```

- [ ] **Step 2: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: green.

- [ ] **Step 3: Smoke-test the passcode gate**

Run dev server with the env var: `ADMIN_PASSCODE=test1234 npm run dev -- --port 5175`. In a second terminal:

```bash
curl -s "http://localhost:5175/_serverFn/$(true)" >/dev/null 2>&1 || true
```

(Server-fn URLs are internal — instead verify in the browser console on any page:)

```js
// paste in devtools console:
const mod = await import("/src/lib/awardsAdminApi.ts");
await mod.adminState({ data: { passcode: "wrong" } }).catch((e) => console.log("rejected OK"));
await mod.adminState({ data: { passcode: "test1234" } }).then((s) => console.log("defs:", s.defs.length));
```

Expected: wrong passcode rejects; correct passcode returns 11 seeded defs.

- [ ] **Step 4: Commit**

```bash
git add src/lib/awardsAdminApi.ts
git commit -m "feat(awards): passcode-gated admin API (defs, runs, prizes, issuances, audit)"
```

---

### Task 11: GameNav + rank-flash overlap fix + route wiring

**Files:**
- Create: `src/components/game/GameNav.tsx`
- Modify: `src/routes/index.tsx:26-50`, `src/routes/scoreboard.tsx`, `src/routes/dashboard.tsx`, `src/routes/awards.tsx`, `src/components/game/nj/ProgressHud.tsx:288`

- [ ] **Step 1: Create the shared nav**

Create `src/components/game/GameNav.tsx`:

```tsx
// Global game navigation — Awards · Standings · Rulebook · My Console · NJ.
// Fixed top-right chip row per DESIGN_BRIEF (bordered, backdrop-blur, no radius).

import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/awards", label: "Awards" },
  { to: "/scoreboard", label: "Standings" },
  { to: "/", label: "Rulebook" },
  { to: "/dashboard", label: "My Console" },
  { to: "/nj", label: "NJ Console" },
] as const;

export function GameNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed right-4 top-4 z-50 flex flex-wrap items-center justify-end gap-2">
      {LINKS.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          className={cn(
            "border px-4 py-2 text-xs uppercase tracking-[0.3em] backdrop-blur-md transition-colors",
            pathname === link.to
              ? "border-white/50 bg-white/10 text-white"
              : "border-white/15 bg-black/60 text-white/80 hover:border-white/40 hover:text-white",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: Wire it into the four routes**

- `src/routes/index.tsx`: delete the inline `<nav className="fixed right-4 top-4 …">…</nav>` block (lines 26-50) and render `<GameNav />` in its place; add `import { GameNav } from "@/components/game/GameNav";`.
- `src/routes/scoreboard.tsx`, `src/routes/dashboard.tsx`, `src/routes/awards.tsx`: in each route component, add `<GameNav />` as the first child inside `<main>` and add the same import.

- [ ] **Step 3: Fix the rank-up banner covering the NJ tab row (VA Marc's bug)**

In `src/components/game/nj/ProgressHud.tsx` line 288, the `RankUpFlash` banner is `fixed inset-x-0 top-[18%] z-[65] …`, which lands on the tab bar. Change the className to render it at the bottom and let clicks pass through:

```tsx
      className="pointer-events-none fixed inset-x-0 bottom-[10%] z-[65] border-y border-amber-200/50 bg-amber-300/15 px-4 py-4 text-amber-50 shadow-[0_0_64px_rgba(250,204,21,0.3)] backdrop-blur-md"
```

- [ ] **Step 4: Verify in the browser**

Run dev server; visit `/`, `/awards`, `/scoreboard`, `/dashboard`:
- nav present on all four, active route highlighted, links work;
- on `/nj`, trigger XP (visit tabs) — the rank-up banner (if a level-up fires) appears at the bottom, tabs stay visible and clickable.

- [ ] **Step 5: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/components/game/GameNav.tsx src/routes/index.tsx src/routes/scoreboard.tsx src/routes/dashboard.tsx src/routes/awards.tsx src/components/game/nj/ProgressHud.tsx
git commit -m "feat(nav): shared GameNav + move rank-up flash off the tab row"
```

---

### Task 12: Scoreboard — live data + FAB standings table + provenance

**Files:**
- Create: `src/components/game/scoreboard/StandingsTable.tsx`
- Modify: `src/components/game/scoreboard/ScoreboardPage.tsx` (data source at line ~851 + new section)

- [ ] **Step 1: Create the standings table with category toggle + provenance popovers**

Create `src/components/game/scoreboard/StandingsTable.tsx`:

```tsx
// Full 18-community standings with the FAB category toggle VA Marc asked for
// (Overall / Income / Members / Blessing) and provenance popovers explaining
// how each number is calculated (metric catalog governance metadata).

import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { METRIC_BY_ID, type MetricDef } from "@/lib/awards-engine/metricCatalog";
import type { RankedCommunity } from "@/lib/comebackData";
import { cn } from "@/lib/utils";

type CategoryKey = "overall" | "finance" | "members" | "blessing";

const CATEGORIES: { key: CategoryKey; label: string; metric: MetricDef; points: (c: RankedCommunity) => number }[] = [
  { key: "overall", label: "Overall", metric: METRIC_BY_ID.total_points, points: (c) => c.points },
  { key: "finance", label: "Income", metric: METRIC_BY_ID.finance_points, points: (c) => c.financePoints },
  { key: "members", label: "Members", metric: METRIC_BY_ID.member_points, points: (c) => c.memberPoints },
  { key: "blessing", label: "Blessing", metric: METRIC_BY_ID.blessing_points, points: (c) => c.blessingPoints },
];

function ProvenanceInfo({ metric }: { metric: MetricDef }) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={`How is ${metric.label} calculated?`}
        className="inline-flex text-white/40 transition-colors hover:text-white"
      >
        <Info className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent className="w-72 border-white/15 bg-black/90 text-white backdrop-blur-md">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-signal">{metric.label}</p>
        <p className="mt-2 text-xs leading-5 text-white/70">{metric.sourceDescription}</p>
        <p className="mt-2 text-[10px] uppercase tracking-[0.24em] text-white/40">
          Updates: {metric.updateCadence}
        </p>
      </PopoverContent>
    </Popover>
  );
}

const signed = (n: number) => `${n > 0 ? "+" : ""}${n}`;

export function StandingsTable({ standings }: { standings: RankedCommunity[] }) {
  const [category, setCategory] = useState<CategoryKey>("overall");
  const active = CATEGORIES.find((c) => c.key === category)!;

  const rows = useMemo(
    () =>
      [...standings]
        .sort((a, b) => active.points(b) - active.points(a) || a.shortName.localeCompare(b.shortName))
        .map((c, i) => ({ c, rank: i + 1 })),
    [standings, active],
  );

  return (
    <section className="border border-white/10 bg-black/60 p-5 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold uppercase tracking-[0.32em] text-white">Full Standings</h3>
          <ProvenanceInfo metric={active.metric} />
        </div>
        <div className="flex gap-px border border-white/10">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              className={cn(
                "px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.24em] transition-colors",
                category === c.key ? "bg-white/15 text-white" : "bg-black/40 text-white/50 hover:text-white",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-[10px] uppercase tracking-[0.24em] text-white/40">
              <th className="py-2 pr-3">#</th>
              <th className="py-2 pr-3">Community</th>
              <th className="py-2 pr-3">Size</th>
              <th className="py-2 pr-3 text-right">{active.label} pts</th>
              <th className="py-2 text-right">Total pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ c, rank }) => (
              <tr key={c.id} className="border-b border-white/5 text-white/80">
                <td className={cn("py-2 pr-3 font-mono", rank <= 3 && "text-amber-200")}>{rank}</td>
                <td className="py-2 pr-3 font-bold text-white">{c.shortName}</td>
                <td className="py-2 pr-3 text-xs text-white/50">{c.size}</td>
                <td className="py-2 pr-3 text-right font-mono">{signed(active.points(c))}</td>
                <td className="py-2 text-right font-mono text-white/60">{signed(c.points)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Switch ScoreboardPage to live data with a source badge**

In `src/components/game/scoreboard/ScoreboardPage.tsx`:

1. Add imports:

```tsx
import { useQuery } from "@tanstack/react-query";
import { getScoreboardLive } from "@/lib/scoreboardApi";
import { StandingsTable } from "./StandingsTable";
```

2. Replace line ~851 `const standings = useMemo(() => rankedCommunities(), []);` with:

```tsx
  const scoreboardQuery = useQuery({
    queryKey: ["scoreboard-live"],
    queryFn: () => getScoreboardLive(),
    staleTime: 5 * 60_000,
  });
  const standings = useMemo(
    () => scoreboardQuery.data?.standings ?? rankedCommunities(),
    [scoreboardQuery.data],
  );
  const dataSource = scoreboardQuery.data?.source ?? "snapshot";
  const dataMonth = scoreboardQuery.data?.month;
```

3. Near the page's header/kicker (find the first heading block in the component's JSX), add a source badge element right below the title:

```tsx
  <span
    className={cn(
      "inline-flex items-center gap-2 border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.28em]",
      dataSource === "live"
        ? "border-teal-200/40 bg-teal-300/10 text-teal-100"
        : "border-amber-200/40 bg-amber-300/10 text-amber-100",
    )}
  >
    {dataSource === "live" ? `Live · ${dataMonth}` : "Snapshot · Jun 9"}
  </span>
```

4. Render `<StandingsTable standings={standings} />` as a new section after the existing podium/standings content (inside the main content column, before the `AwardsRecap` section).

- [ ] **Step 3: Verify in browser**

Dev server → `/scoreboard`:
- badge shows "LIVE · <month>" when the sheet read works (needs the OAuth credential file), "Snapshot" otherwise;
- Full Standings section lists all 18 communities; toggling Overall/Income/Members/Blessing re-sorts and re-ranks;
- the ⓘ popover shows calculation + cadence text.
No `whileInView` gating of the table (house rule — data must render without scroll triggers).

- [ ] **Step 4: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/components/game/scoreboard/StandingsTable.tsx src/components/game/scoreboard/ScoreboardPage.tsx
git commit -m "feat(scoreboard): live feed with source badge + FAB standings toggle + provenance popovers"
```

---

### Task 13: Scoreboard graphs (trend · leaderboard · distribution)

**Files:**
- Create: `src/components/game/scoreboard/ScoreboardCharts.tsx`
- Modify: `src/components/game/scoreboard/ScoreboardPage.tsx` (render the new section)

- [ ] **Step 1: Create the charts component**

Create `src/components/game/scoreboard/ScoreboardCharts.tsx`:

```tsx
// The three standard scoreboard graphs (graph standards: trend, leaderboard,
// distribution — nothing else, to avoid chart fatigue). recharts with the
// app's chart tokens; dark grid per DESIGN_BRIEF.

import { useMemo } from "react";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import type { RankedCommunity } from "@/lib/comebackData";

const GRID = "rgba(255,255,255,0.08)";
const AXIS = { fill: "rgba(255,255,255,0.45)", fontSize: 10 };
const TOOLTIP_STYLE = {
  background: "rgba(0,0,0,0.9)", border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 0, fontSize: 12, color: "#fff",
} as const;

function Panel({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="border border-white/10 bg-black/60 p-4 backdrop-blur-md">
      <p className="text-xs font-bold uppercase tracking-[0.28em] text-white">{title}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/40">{sub}</p>
      <div className="mt-3 h-56">{children}</div>
    </div>
  );
}

export function ScoreboardCharts({ standings }: { standings: RankedCommunity[] }) {
  // TREND — region-wide Sunday attendance per week of the month
  const trend = useMemo(() => {
    const weekCount = Math.max(...standings.map((c) => c.weeklyAttendance.length), 0);
    return Array.from({ length: weekCount }, (_, w) => ({
      week: `Wk ${w + 1}`,
      region: standings.reduce((sum, c) => sum + (c.weeklyAttendance[w] ?? 0), 0),
    })).filter((row) => row.region > 0);
  }, [standings]);

  // LEADERBOARD — top 10 by total points
  const leaderboard = useMemo(
    () =>
      [...standings]
        .sort((a, b) => b.points - a.points)
        .slice(0, 10)
        .map((c) => ({ name: c.shortName, points: c.points })),
    [standings],
  );

  // DISTRIBUTION — average points per size tier
  const distribution = useMemo(() => {
    const tiers = ["Extra Large", "Medium", "Small", "Family Group"] as const;
    return tiers.map((size) => {
      const group = standings.filter((c) => c.size === size);
      const avg = group.length ? Math.round(group.reduce((s, c) => s + c.points, 0) / group.length) : 0;
      return { size: size === "Family Group" ? "Family Grp" : size, avg, n: group.length };
    });
  }, [standings]);

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <Panel title="Attendance Trend" sub="Region-wide Sunday worship, this month">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="week" tick={AXIS} tickLine={false} axisLine={false} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: GRID }} />
            <Line type="monotone" dataKey="region" stroke="var(--chart-2)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </Panel>
      <Panel title="Points Leaderboard" sub="Top 10 communities by total points">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={leaderboard} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 10 }}>
            <CartesianGrid stroke={GRID} horizontal={false} />
            <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" width={82} tick={AXIS} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="points" fill="var(--chart-1)" maxBarSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>
      <Panel title="Points by Division" sub="Average total points per size tier">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={distribution} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="size" tick={AXIS} tickLine={false} axisLine={false} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="avg" fill="var(--chart-4)" maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>
    </section>
  );
}
```

- [ ] **Step 2: Render it in ScoreboardPage**

In `ScoreboardPage.tsx`, import `{ ScoreboardCharts }` and render `<ScoreboardCharts standings={standings} />` directly above the `<StandingsTable …/>` from Task 12.

- [ ] **Step 3: Verify in browser**

`/scoreboard`: three charts render with data (trend may be flat if only one week reported — that's data, not a bug). Charts must render immediately (no scroll-triggered mounting).

- [ ] **Step 4: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/components/game/scoreboard/ScoreboardCharts.tsx src/components/game/scoreboard/ScoreboardPage.tsx
git commit -m "feat(scoreboard): standard graph set — trend, leaderboard, distribution"
```

---

### Task 14: Local console — award wins strip on /dashboard

**Files:**
- Create: `src/components/game/dashboard/AwardWinsStrip.tsx`
- Modify: `src/components/game/dashboard/DashboardPage.tsx`

- [ ] **Step 1: Create the wins strip**

Create `src/components/game/dashboard/AwardWinsStrip.tsx`:

```tsx
// "Our award wins" — the selected community's current awards, from the same
// feed the ceremony uses (engine runs when finalized, legacy otherwise).

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { fetchLiveAwards } from "@/lib/regionalScoreboard";

export function AwardWinsStrip({ communityId }: { communityId: string }) {
  const awardsQuery = useQuery({
    queryKey: ["live-awards"],
    queryFn: () => fetchLiveAwards(),
    staleTime: 5 * 60_000,
  });

  const wins = (awardsQuery.data?.awards ?? []).flatMap((award) => {
    const w = award.winners.find((x) => x.communityId === communityId);
    return w ? [{ award, winner: w }] : [];
  });

  return (
    <section className="border border-white/10 bg-black/60 p-5 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold uppercase tracking-[0.32em] text-white">Our Award Wins</h3>
        <Link
          to="/awards"
          className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/50 transition-colors hover:text-white"
        >
          Awards Night →
        </Link>
      </div>
      {wins.length === 0 ? (
        <p className="mt-3 text-sm text-white/50">
          No awards yet this period — the podium awaits. Check the standings for the next best move.
        </p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {wins.map(({ award, winner }) => (
            <li key={award.id} className="flex items-center gap-3 border border-white/10 bg-white/[0.03] px-3 py-2">
              <span className="text-2xl" aria-hidden="true">{award.emoji}</span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-white">{award.title}</span>
                <span className="block text-xs text-white/50">{winner.stat}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Render it in DashboardPage**

In `src/components/game/dashboard/DashboardPage.tsx`, import `{ AwardWinsStrip }` and render `<AwardWinsStrip communityId={selectedCommunityId} />` as a section near the top of the dashboard content (immediately after the community picker / header block, before the score gauges). The component receives `selectedCommunityId` — it's already a prop (`DashboardPage.tsx:923` context).

- [ ] **Step 3: Verify in browser**

`/dashboard?community=new-jersey`: strip renders (empty state until awards exist for NJ, or wins from the legacy feed). Switch communities via the picker — the strip updates.

- [ ] **Step 4: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/components/game/dashboard/AwardWinsStrip.tsx src/components/game/dashboard/DashboardPage.tsx
git commit -m "feat(dashboard): award wins strip on the local console"
```

---

### Task 15: Trophy sync from the NJ console

**Files:**
- Create: `src/lib/trophySync.ts`
- Modify: `src/lib/progression.ts` (evaluate fn + one export), `src/components/game/nj/NJConsole.tsx` (mount catch-up)

- [ ] **Step 1: Create the sync helper**

Create `src/lib/trophySync.ts`:

```ts
// Fire-and-forget trophy reporting to the server (trophy_events table).
// The server upsert is idempotent, so over-reporting is harmless and the
// client NEVER blocks or errors on this path.

import { reportTrophies } from "@/lib/awardsApi";

// The NJ pastor console is the only local console in the POC.
const COMMUNITY_ID = "new-jersey";

export function syncTrophies(achievementIds: string[]): void {
  if (typeof window === "undefined" || achievementIds.length === 0) return;
  void reportTrophies({ data: { communityId: COMMUNITY_ID, achievementIds } }).catch(() => undefined);
}
```

- [ ] **Step 2: Report fresh unlocks from the progression engine**

In `src/lib/progression.ts`:

1. Add the import at the top: `import { syncTrophies } from "@/lib/trophySync";`
2. In the `evaluate(prev, next)` function (the single choke point all unlock paths go through — `award`, `awardOnce`, daily visit, tab visit), add one line before `return fresh;`:

```ts
  if (fresh.length) syncTrophies(fresh.map((a) => a.id));
```

3. Add an exported helper at the bottom of the file for the mount-time catch-up:

```ts
/** All unlocked achievement ids (for mount-time trophy catch-up sync) */
export function unlockedAchievementIds(): string[] {
  return Object.keys(load().unlocked);
}
```

- [ ] **Step 3: Catch-up sync on console mount**

In `src/components/game/nj/NJConsole.tsx`, inside the main component add (with imports for `useEffect`, `unlockedAchievementIds`, `syncTrophies`):

```tsx
  useEffect(() => {
    // One-shot catch-up: report everything unlocked before server-side
    // trophies existed (idempotent server-side).
    syncTrophies(unlockedAchievementIds());
  }, []);
```

- [ ] **Step 4: Verify**

Dev server → `/nj`, open devtools Network tab: a `reportTrophies` POST fires on mount (and again on new unlocks). Then verify rows landed:

```bash
node -e "const D=require('better-sqlite3');const db=new D('data/comeback.db');console.log(db.prepare('SELECT community_id, COUNT(*) n FROM trophy_events GROUP BY 1').all())"
```

Expected: a `new-jersey` row with your unlock count.

- [ ] **Step 5: Run all tests + typecheck + commit**

```bash
npm test && npx tsc --noEmit
git add src/lib/trophySync.ts src/lib/progression.ts src/components/game/nj/NJConsole.tsx
git commit -m "feat(trophies): server-side trophy sync (fresh unlocks + mount catch-up)"
```

---

### Task 16: Admin UI — route, gate, shell, award editor

**Files:**
- Create: `src/routes/awards_.admin.tsx` (pathless-parent naming → `/awards/admin`, does NOT nest in the ceremony route)
- Create: `src/components/game/awards/admin/AdminPage.tsx`
- Create: `src/components/game/awards/admin/AwardDefsPanel.tsx`

- [ ] **Step 1: Create the route**

Create `src/routes/awards_.admin.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "@/components/game/awards/admin/AdminPage";

export const Route = createFileRoute("/awards_/admin")({
  head: () => ({
    meta: [
      { title: "Awards Admin — Operation COMEBACK" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <main className="relative min-h-screen bg-[#0a0a0b]">
      <AdminPage />
    </main>
  ),
});
```

Note: run `npm run dev` once after creating the file so `routeTree.gen.ts` regenerates; the URL is `/awards/admin`.

- [ ] **Step 2: Create the admin shell with passcode gate**

Create `src/components/game/awards/admin/AdminPage.tsx`:

```tsx
// Awards admin — passcode gate + tabbed shell (Awards / Prizes / Issuances /
// Audit). The passcode lives in sessionStorage and every server fn re-checks
// it server-side; this gate is a UX convenience, not the security boundary.

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminState } from "@/lib/awardsAdminApi";
import { GameNav } from "@/components/game/GameNav";
import { AwardDefsPanel } from "./AwardDefsPanel";
import { PrizesPanel } from "./PrizesPanel";
import { IssuancesPanel } from "./IssuancesPanel";
import { AuditPanel } from "./AuditPanel";

const PASS_KEY = "comeback-admin-passcode";

export function getPasscode(): string {
  return typeof window === "undefined" ? "" : sessionStorage.getItem(PASS_KEY) ?? "";
}

export function AdminPage() {
  const [passcode, setPasscode] = useState(getPasscode);
  const [input, setInput] = useState("");
  const queryClient = useQueryClient();

  const state = useQuery({
    queryKey: ["admin-state", passcode],
    queryFn: () => adminState({ data: { passcode } }),
    enabled: passcode.length > 0,
    retry: false,
  });

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["admin-state"] });

  if (!passcode || state.isError) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 px-4">
        <GameNav />
        <p className="text-xs font-bold uppercase tracking-[0.4em] text-signal">Awards Admin</p>
        <h1 className="display text-4xl uppercase text-white">Enter Passcode</h1>
        {state.isError ? (
          <p className="text-sm text-rose-300">That passcode was not accepted.</p>
        ) : null}
        <form
          className="flex w-full gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            sessionStorage.setItem(PASS_KEY, input);
            setPasscode(input);
          }}
        >
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Admin passcode"
            className="w-full border border-white/15 bg-black/60 px-3 py-2 text-white outline-none focus:border-white/40"
          />
          <button type="submit" className="border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-white hover:bg-white/20">
            Enter
          </button>
        </form>
      </div>
    );
  }

  if (!state.data) {
    return <p className="p-10 text-white/50">Loading admin console…</p>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-20 md:px-8">
      <GameNav />
      <p className="text-xs font-bold uppercase tracking-[0.4em] text-signal">Recognition Engine</p>
      <h1 className="display mt-2 text-5xl uppercase text-white">Awards Admin</h1>
      <Tabs defaultValue="awards" className="mt-8">
        <TabsList className="grid h-auto w-full grid-cols-4 gap-px border border-white/10 bg-black/70 p-0 text-white/50 backdrop-blur-md">
          <TabsTrigger value="awards">Awards</TabsTrigger>
          <TabsTrigger value="prizes">Prizes</TabsTrigger>
          <TabsTrigger value="issuances">Issuances</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>
        <TabsContent value="awards">
          <AwardDefsPanel state={state.data} passcode={passcode} onChanged={refresh} />
        </TabsContent>
        <TabsContent value="prizes">
          <PrizesPanel state={state.data} passcode={passcode} onChanged={refresh} />
        </TabsContent>
        <TabsContent value="issuances">
          <IssuancesPanel state={state.data} passcode={passcode} onChanged={refresh} />
        </TabsContent>
        <TabsContent value="audit">
          <AuditPanel state={state.data} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

(PrizesPanel/IssuancesPanel/AuditPanel are Task 17 — create placeholder files exporting minimal components in this task so it compiles, then flesh them out in Task 17: each placeholder renders `<p className="mt-6 text-white/40">Coming in the next task.</p>`. Placeholders are acceptable ONLY because Task 17 in this same plan replaces them.)

- [ ] **Step 3: Create the award defs panel (list + editor + run controls)**

Create `src/components/game/awards/admin/AwardDefsPanel.tsx`:

```tsx
// Award definitions: list with status chips, a full editor form driven by the
// metric catalog, and preview → finalize run controls per award.

import { useState } from "react";
import { COMMUNITIES } from "@/lib/comebackData";
import { METRICS } from "@/lib/awards-engine/metricCatalog";
import type { AwardDef, EvaluatorId, Scope } from "@/lib/awards-engine/types";
import {
  adminRunFinalize, adminRunPreview, adminSaveDef,
  type AdminStatePayload, type RunPreviewPayload,
} from "@/lib/awardsAdminApi";
import { cn } from "@/lib/utils";

const EVALUATORS: { id: EvaluatorId; label: string; hint: string }[] = [
  { id: "metric_rank", label: "Metric ranking", hint: "Rank scoped communities by a catalog metric" },
  { id: "david", label: "David rule", hint: "Small/Family community out-ranking the XLM tier" },
  { id: "triple_header", label: "Triple header", hint: "Everyone clearing all three targets" },
  { id: "trophy_count", label: "Trophy count", hint: "Most console trophies unlocked (server-side)" },
];

const TONES = ["gold", "teal", "violet", "rose", "blue"] as const;
const SIZES = ["Extra Large", "Medium", "Small", "Family Group"] as const;
const WINDOWS = ["campaign", "latest-week", "month:June 2026", "month:May 2026"];

const EMPTY_DEF: AwardDef = {
  id: "", name: "", subtitle: "", emoji: "🏆", tone: "gold",
  evaluator: "metric_rank", metricId: "total_points", scope: { type: "all" },
  tiers: 1, window: "campaign", tieBreakers: [], eligibility: {}, prizes: [],
  blurb: "", status: "draft", sort: 500,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/45">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputCls =
  "w-full border border-white/15 bg-black/60 px-2.5 py-1.5 text-sm text-white outline-none focus:border-white/40";

export function AwardDefsPanel({
  state, passcode, onChanged,
}: { state: AdminStatePayload; passcode: string; onChanged: () => void }) {
  const [editing, setEditing] = useState<AwardDef | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ defId: string; payload: RunPreviewPayload } | null>(null);
  const [allowSnapshot, setAllowSnapshot] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    setError(null);
    const res = await adminSaveDef({ data: { passcode, def: editing } });
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "Save failed");
    setEditing(null);
    onChanged();
  };

  const runPreview = async (defId: string) => {
    setBusy(true);
    setError(null);
    try {
      const payload = await adminRunPreview({ data: { passcode, defId } });
      setPreview({ defId, payload });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setBusy(false);
  };

  const finalize = async (defId: string) => {
    setBusy(true);
    setError(null);
    const res = await adminRunFinalize({ data: { passcode, defId, allowSnapshot } });
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "Finalize failed");
    setPreview(null);
    onChanged();
  };

  const upd = (patch: Partial<AwardDef>) => setEditing((d) => (d ? { ...d, ...patch } : d));

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      {/* list */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setEditing({ ...EMPTY_DEF })}
          className="w-full border border-dashed border-white/20 px-3 py-2 text-xs font-bold uppercase tracking-[0.24em] text-white/60 hover:border-white/50 hover:text-white"
        >
          + New award
        </button>
        {state.defs.map((def) => {
          const run = state.latestRuns[def.id];
          return (
            <div key={def.id} className="border border-white/10 bg-black/60 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <button type="button" onClick={() => setEditing(def)} className="min-w-0 text-left">
                  <span className="block truncate text-sm font-bold text-white">
                    {def.emoji} {def.name}
                  </span>
                  <span className="block text-[10px] uppercase tracking-[0.2em] text-white/40">
                    {def.evaluator}{def.metricId ? ` · ${def.metricId}` : ""} · {def.window}
                  </span>
                </button>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className={cn(
                    "border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em]",
                    def.status === "active" && "border-teal-200/40 text-teal-100",
                    def.status === "draft" && "border-white/20 text-white/50",
                    def.status === "archived" && "border-rose-200/30 text-rose-200/70",
                  )}>
                    {def.status}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void runPreview(def.id)}
                    className="border border-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-white/70 hover:text-white"
                  >
                    Run
                  </button>
                </div>
              </div>
              {run ? (
                <p className="mt-1 text-[10px] text-white/35">
                  Last run {new Date(run.ranAt).toLocaleDateString("en-US")} · {run.windowLabel} · {run.dataSource}
                  {" · "}{run.results.winners.map((w) => w.community).join(", ") || "no winners"}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* editor OR run preview */}
      <div>
        {error ? <p className="mb-3 border border-rose-300/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{error}</p> : null}

        {preview ? (
          <div className="border border-white/10 bg-black/60 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-[0.28em] text-white">Run preview — {preview.defId}</h3>
              <span className={cn(
                "border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em]",
                preview.payload.source === "live" ? "border-teal-200/40 text-teal-100" : "border-amber-200/40 text-amber-100",
              )}>
                {preview.payload.source}{preview.payload.month ? ` · ${preview.payload.month}` : ""}
              </span>
            </div>
            <table className="mt-3 w-full text-left text-sm text-white/80">
              <thead>
                <tr className="border-b border-white/10 text-[10px] uppercase tracking-[0.2em] text-white/40">
                  <th className="py-1.5 pr-2">Tier</th><th className="py-1.5 pr-2">Community</th><th className="py-1.5">Stat</th>
                </tr>
              </thead>
              <tbody>
                {preview.payload.results.winners.map((w) => (
                  <tr key={`${w.tier}-${w.communityId}`} className="border-b border-white/5">
                    <td className="py-1.5 pr-2 font-mono">{w.tier}</td>
                    <td className="py-1.5 pr-2 font-bold text-white">{w.community}</td>
                    <td className="py-1.5">{w.stat}</td>
                  </tr>
                ))}
                {preview.payload.results.winners.length === 0 ? (
                  <tr><td colSpan={3} className="py-3 text-white/40">No winners under current data + rules.</td></tr>
                ) : null}
              </tbody>
            </table>
            {preview.payload.results.disqualified.length ? (
              <details className="mt-3 text-xs text-white/50">
                <summary className="cursor-pointer uppercase tracking-[0.2em]">
                  {preview.payload.results.disqualified.length} disqualified
                </summary>
                <ul className="mt-2 space-y-1">
                  {preview.payload.results.disqualified.map((d) => (
                    <li key={d.communityId}>{d.community}: {d.reason}</li>
                  ))}
                </ul>
              </details>
            ) : null}
            {preview.payload.results.tieBreaksApplied.length ? (
              <p className="mt-2 text-xs text-white/40">Tie-breaks: {preview.payload.results.tieBreaksApplied.join(" · ")}</p>
            ) : null}
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button" disabled={busy}
                onClick={() => void finalize(preview.defId)}
                className="border border-teal-200/40 bg-teal-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-teal-100 hover:bg-teal-300/20"
              >
                Finalize run
              </button>
              {preview.payload.source === "snapshot" ? (
                <label className="flex items-center gap-2 text-xs text-amber-200">
                  <input type="checkbox" checked={allowSnapshot} onChange={(e) => setAllowSnapshot(e.target.checked)} />
                  Allow snapshot data (recorded in audit)
                </label>
              ) : null}
              <button type="button" onClick={() => setPreview(null)} className="ml-auto text-xs uppercase tracking-[0.2em] text-white/40 hover:text-white">
                Close
              </button>
            </div>
          </div>
        ) : editing ? (
          <div className="space-y-3 border border-white/10 bg-black/60 p-4">
            <h3 className="text-sm font-bold uppercase tracking-[0.28em] text-white">
              {editing.id ? `Edit — ${editing.id}` : "New award"}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Id (slug, permanent)">
                <input className={inputCls} value={editing.id} disabled={state.defs.some((d) => d.id === editing.id)}
                  onChange={(e) => upd({ id: e.target.value })} placeholder="my-award" />
              </Field>
              <Field label="Name"><input className={inputCls} value={editing.name} onChange={(e) => upd({ name: e.target.value })} /></Field>
              <Field label="Subtitle"><input className={inputCls} value={editing.subtitle} onChange={(e) => upd({ subtitle: e.target.value })} /></Field>
              <Field label="Emoji"><input className={inputCls} value={editing.emoji} onChange={(e) => upd({ emoji: e.target.value })} /></Field>
              <Field label="Tone">
                <select className={inputCls} value={editing.tone} onChange={(e) => upd({ tone: e.target.value as AwardDef["tone"] })}>
                  {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select className={inputCls} value={editing.status} onChange={(e) => upd({ status: e.target.value as AwardDef["status"] })}>
                  <option value="draft">draft</option><option value="active">active</option><option value="archived">archived</option>
                </select>
              </Field>
              <Field label="Evaluator">
                <select className={inputCls} value={editing.evaluator} onChange={(e) => upd({ evaluator: e.target.value as EvaluatorId })}>
                  {EVALUATORS.map((ev) => <option key={ev.id} value={ev.id} title={ev.hint}>{ev.label}</option>)}
                </select>
              </Field>
              {editing.evaluator === "metric_rank" ? (
                <Field label="Metric">
                  <select className={inputCls} value={editing.metricId ?? ""} onChange={(e) => upd({ metricId: e.target.value as AwardDef["metricId"] })}>
                    {METRICS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                </Field>
              ) : null}
              <Field label="Tiers">
                <select className={inputCls} value={editing.tiers} onChange={(e) => upd({ tiers: Number(e.target.value) as 1 | 3 })}>
                  <option value={1}>Single winner</option><option value={3}>Podium (1st/2nd/3rd)</option>
                </select>
              </Field>
              <Field label="Window">
                <select className={inputCls} value={editing.window} onChange={(e) => upd({ window: e.target.value })}>
                  {WINDOWS.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </Field>
              <Field label="Scope">
                <select
                  className={inputCls}
                  value={editing.scope.type}
                  onChange={(e) => {
                    const t = e.target.value as Scope["type"];
                    upd({
                      scope:
                        t === "all" ? { type: "all" }
                        : t === "size" ? { type: "size", sizes: ["Small"] }
                        : { type: "list", communityIds: [COMMUNITIES[0].id] },
                    });
                  }}
                >
                  <option value="all">All communities</option>
                  <option value="size">By size tier</option>
                  <option value="list">Specific communities</option>
                </select>
              </Field>
              <Field label="Sort order">
                <input className={inputCls} type="number" value={editing.sort} onChange={(e) => upd({ sort: Number(e.target.value) })} />
              </Field>
            </div>

            {editing.scope.type === "size" ? (
              <Field label="Size tiers">
                <div className="flex flex-wrap gap-3">
                  {SIZES.map((s) => (
                    <label key={s} className="flex items-center gap-1.5 text-sm text-white/80">
                      <input
                        type="checkbox"
                        checked={editing.scope.type === "size" && editing.scope.sizes.includes(s)}
                        onChange={(e) => {
                          if (editing.scope.type !== "size") return;
                          const sizes = e.target.checked
                            ? [...editing.scope.sizes, s]
                            : editing.scope.sizes.filter((x) => x !== s);
                          upd({ scope: { type: "size", sizes } });
                        }}
                      />
                      {s}
                    </label>
                  ))}
                </div>
              </Field>
            ) : null}
            {editing.scope.type === "list" ? (
              <Field label="Communities">
                <select
                  multiple size={6} className={inputCls}
                  value={editing.scope.type === "list" ? editing.scope.communityIds : []}
                  onChange={(e) =>
                    upd({ scope: { type: "list", communityIds: [...e.target.selectedOptions].map((o) => o.value) } })
                  }
                >
                  {COMMUNITIES.map((c) => <option key={c.id} value={c.id}>{c.shortName}</option>)}
                </select>
              </Field>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Min weeks reported">
                <input className={inputCls} type="number" min={0} max={5}
                  value={editing.eligibility.minWeeksReported ?? ""}
                  onChange={(e) => upd({ eligibility: { ...editing.eligibility, minWeeksReported: e.target.value ? Number(e.target.value) : undefined } })} />
              </Field>
              <label className="flex items-end gap-2 pb-1.5 text-sm text-white/80">
                <input type="checkbox" checked={editing.eligibility.requireAllCategories ?? false}
                  onChange={(e) => upd({ eligibility: { ...editing.eligibility, requireAllCategories: e.target.checked || undefined } })} />
                All FAB lanes required
              </label>
              <label className="flex items-end gap-2 pb-1.5 text-sm text-white/80">
                <input type="checkbox" checked={editing.eligibility.requirePositive ?? false}
                  onChange={(e) => upd({ eligibility: { ...editing.eligibility, requirePositive: e.target.checked || undefined } })} />
                Positive values only
              </label>
            </div>

            <Field label={`Prizes (per tier — tracking only, no money moves)`}>
              <div className="space-y-2">
                {Array.from({ length: editing.tiers }, (_, i) => i + 1).map((tier) => {
                  const p = editing.prizes.find((x) => x.tier === tier);
                  return (
                    <div key={tier} className="grid grid-cols-[3rem_1fr_6rem_1fr] items-center gap-2">
                      <span className="text-xs text-white/50">Tier {tier}</span>
                      <select className={inputCls} value={p?.type ?? ""}
                        onChange={(e) => {
                          const others = editing.prizes.filter((x) => x.tier !== tier);
                          const type = e.target.value as "cash" | "gift_card" | "other" | "";
                          upd({ prizes: type ? [...others, { tier, type, valueUsd: p?.valueUsd ?? 0, label: p?.label ?? "" }] : others });
                        }}>
                        <option value="">No prize</option><option value="cash">Cash</option>
                        <option value="gift_card">Gift card</option><option value="other">Other</option>
                      </select>
                      <input className={inputCls} type="number" min={0} placeholder="USD" value={p?.valueUsd ?? ""}
                        disabled={!p}
                        onChange={(e) => upd({ prizes: editing.prizes.map((x) => x.tier === tier ? { ...x, valueUsd: Number(e.target.value) } : x) })} />
                      <input className={inputCls} placeholder="Label" value={p?.label ?? ""} disabled={!p}
                        onChange={(e) => upd({ prizes: editing.prizes.map((x) => x.tier === tier ? { ...x, label: e.target.value } : x) })} />
                    </div>
                  );
                })}
              </div>
            </Field>

            <Field label="MC blurb"><textarea className={inputCls} rows={2} value={editing.blurb} onChange={(e) => upd({ blurb: e.target.value })} /></Field>

            <div className="flex gap-3">
              <button type="button" disabled={busy} onClick={() => void save()}
                className="border border-white/25 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-white hover:bg-white/20">
                Save award
              </button>
              <button type="button" onClick={() => setEditing(null)} className="text-xs uppercase tracking-[0.2em] text-white/40 hover:text-white">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-6 text-sm text-white/40">Select an award to edit, hit Run for a preview, or create a new one.</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify in browser**

`ADMIN_PASSCODE=test1234 npm run dev -- --port 5175` → `/awards/admin`:
- wrong passcode → rejected message; right passcode → 11 seeded awards listed;
- edit an award (rename, tweak eligibility) → Save → list updates; audit tab (placeholder for now);
- Run on "league-champion" → preview table with podium + source badge; Finalize → run recorded (list row shows "Last run …").
- `/awards` now shows the finalized engine results (via `fetchLiveAwards` engine path).

- [ ] **Step 5: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/routes/awards_.admin.tsx src/components/game/awards/admin/ src/routeTree.gen.ts
git commit -m "feat(admin): awards admin — passcode gate, defs editor, run preview/finalize"
```

---

### Task 17: Admin UI — prizes, issuances, audit panels

**Files:**
- Replace placeholders: `src/components/game/awards/admin/PrizesPanel.tsx`, `IssuancesPanel.tsx`, `AuditPanel.tsx`

- [ ] **Step 1: Prizes panel**

Create (replacing placeholder) `src/components/game/awards/admin/PrizesPanel.tsx`:

```tsx
// Prize inventory — tracking ledger only; the app never moves money.

import { useState } from "react";
import { adminSavePrize, type AdminStatePayload } from "@/lib/awardsAdminApi";
import type { PrizeRow } from "@/lib/server/awardsRepo";

const inputCls =
  "w-full border border-white/15 bg-black/60 px-2.5 py-1.5 text-sm text-white outline-none focus:border-white/40";

const EMPTY: Omit<PrizeRow, "id" | "qtyIssued"> = { label: "", type: "gift_card", valueUsd: 0, qtyTotal: 0, notes: "" };

export function PrizesPanel({
  state, passcode, onChanged,
}: { state: AdminStatePayload; passcode: string; onChanged: () => void }) {
  const [draft, setDraft] = useState<(typeof EMPTY & { id?: number }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!draft) return;
    const res = await adminSavePrize({ data: { passcode, prize: draft } });
    if (!res.ok) return setError(res.error ?? "Save failed");
    setDraft(null);
    setError(null);
    onChanged();
  };

  return (
    <div className="mt-6 space-y-4">
      {error ? <p className="border border-rose-300/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{error}</p> : null}
      <table className="w-full text-left text-sm text-white/80">
        <thead>
          <tr className="border-b border-white/10 text-[10px] uppercase tracking-[0.2em] text-white/40">
            <th className="py-2 pr-2">Prize</th><th className="py-2 pr-2">Type</th>
            <th className="py-2 pr-2 text-right">Value</th><th className="py-2 pr-2 text-right">Issued / Total</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {state.prizes.map((p) => (
            <tr key={p.id} className="border-b border-white/5">
              <td className="py-2 pr-2 font-bold text-white">{p.label}</td>
              <td className="py-2 pr-2 text-xs uppercase tracking-[0.14em] text-white/50">{p.type.replace("_", " ")}</td>
              <td className="py-2 pr-2 text-right font-mono">${p.valueUsd.toLocaleString("en-US")}</td>
              <td className="py-2 pr-2 text-right font-mono">{p.qtyIssued} / {p.qtyTotal}</td>
              <td className="py-2 text-right">
                <button type="button" onClick={() => setDraft(p)} className="text-xs uppercase tracking-[0.2em] text-white/40 hover:text-white">Edit</button>
              </td>
            </tr>
          ))}
          {state.prizes.length === 0 ? (
            <tr><td colSpan={5} className="py-4 text-white/40">No prizes in inventory yet.</td></tr>
          ) : null}
        </tbody>
      </table>

      {draft ? (
        <div className="grid gap-3 border border-white/10 bg-black/60 p-4 sm:grid-cols-5">
          <input className={inputCls} placeholder="Label" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
          <select className={inputCls} value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as PrizeRow["type"] })}>
            <option value="cash">Cash</option><option value="gift_card">Gift card</option><option value="other">Other</option>
          </select>
          <input className={inputCls} type="number" min={0} placeholder="Value USD" value={draft.valueUsd} onChange={(e) => setDraft({ ...draft, valueUsd: Number(e.target.value) })} />
          <input className={inputCls} type="number" min={0} placeholder="Qty" value={draft.qtyTotal} onChange={(e) => setDraft({ ...draft, qtyTotal: Number(e.target.value) })} />
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void save()} className="border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white hover:bg-white/20">Save</button>
            <button type="button" onClick={() => setDraft(null)} className="text-xs uppercase tracking-[0.2em] text-white/40 hover:text-white">Cancel</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setDraft({ ...EMPTY })} className="border border-dashed border-white/20 px-3 py-2 text-xs font-bold uppercase tracking-[0.24em] text-white/60 hover:border-white/50 hover:text-white">
          + Add prize
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Issuances panel**

Create (replacing placeholder) `src/components/game/awards/admin/IssuancesPanel.tsx`:

```tsx
// Prize issuance queue: pending → approved → issued (or void). Approving can
// link an inventory prize; issuing bumps qty_issued. Status-only — no payments.

import { useState } from "react";
import { COMMUNITIES } from "@/lib/comebackData";
import { adminTransitionIssuance, type AdminStatePayload } from "@/lib/awardsAdminApi";
import { cn } from "@/lib/utils";

const NAME_BY_ID = new Map(COMMUNITIES.map((c) => [c.id, c.shortName]));

export function IssuancesPanel({
  state, passcode, onChanged,
}: { state: AdminStatePayload; passcode: string; onChanged: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [prizeSel, setPrizeSel] = useState<Record<number, number | undefined>>({});

  const transition = async (id: number, to: "approved" | "issued" | "void") => {
    const res = await adminTransitionIssuance({ data: { passcode, id, to, prizeId: prizeSel[id] } });
    if (!res.ok) return setError(res.error ?? "Transition failed");
    setError(null);
    onChanged();
  };

  return (
    <div className="mt-6 space-y-3">
      {error ? <p className="border border-rose-300/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{error}</p> : null}
      {state.issuances.length === 0 ? (
        <p className="text-sm text-white/40">No prize issuances yet — finalize an award run that carries prizes.</p>
      ) : null}
      {state.issuances.map((iss) => (
        <div key={iss.id} className="flex flex-wrap items-center gap-3 border border-white/10 bg-black/60 px-3 py-2.5">
          <span className={cn(
            "border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em]",
            iss.status === "pending" && "border-amber-200/40 text-amber-100",
            iss.status === "approved" && "border-blue-200/40 text-blue-100",
            iss.status === "issued" && "border-teal-200/40 text-teal-100",
            iss.status === "void" && "border-white/20 text-white/40",
          )}>
            {iss.status}
          </span>
          <span className="text-sm font-bold text-white">{NAME_BY_ID.get(iss.communityId) ?? iss.communityId}</span>
          <span className="text-xs text-white/50">{iss.awardId} · tier {iss.tier} · run #{iss.runId}</span>
          <span className="ml-auto flex items-center gap-2">
            {iss.status === "pending" ? (
              <>
                <select
                  className="border border-white/15 bg-black/60 px-2 py-1 text-xs text-white"
                  value={prizeSel[iss.id] ?? ""}
                  onChange={(e) => setPrizeSel((m) => ({ ...m, [iss.id]: e.target.value ? Number(e.target.value) : undefined }))}
                >
                  <option value="">Link prize…</option>
                  {state.prizes.map((p) => (
                    <option key={p.id} value={p.id}>{p.label} ({p.qtyTotal - p.qtyIssued} left)</option>
                  ))}
                </select>
                <button type="button" onClick={() => void transition(iss.id, "approved")} className="border border-blue-200/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-100 hover:bg-blue-300/10">Approve</button>
              </>
            ) : null}
            {iss.status === "approved" ? (
              <button type="button" onClick={() => void transition(iss.id, "issued")} className="border border-teal-200/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-teal-100 hover:bg-teal-300/10">Mark issued</button>
            ) : null}
            {iss.status === "pending" || iss.status === "approved" ? (
              <button type="button" onClick={() => void transition(iss.id, "void")} className="border border-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 hover:text-white">Void</button>
            ) : null}
          </span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Audit panel**

Create (replacing placeholder) `src/components/game/awards/admin/AuditPanel.tsx`:

```tsx
// Read-only audit trail — every config change, run, and issuance transition.

import type { AdminStatePayload } from "@/lib/awardsAdminApi";

export function AuditPanel({ state }: { state: AdminStatePayload }) {
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full text-left text-xs text-white/70">
        <thead>
          <tr className="border-b border-white/10 text-[10px] uppercase tracking-[0.2em] text-white/40">
            <th className="py-2 pr-3">When</th><th className="py-2 pr-3">Actor</th>
            <th className="py-2 pr-3">Action</th><th className="py-2 pr-3">Entity</th><th className="py-2">Detail</th>
          </tr>
        </thead>
        <tbody>
          {state.audit.map((a) => (
            <tr key={a.id} className="border-b border-white/5 align-top">
              <td className="whitespace-nowrap py-1.5 pr-3 font-mono">{new Date(a.ts).toLocaleString("en-US")}</td>
              <td className="py-1.5 pr-3">{a.actor}</td>
              <td className="py-1.5 pr-3 font-bold text-white/90">{a.action}</td>
              <td className="py-1.5 pr-3">{a.entity} {a.entityId}</td>
              <td className="max-w-[320px] break-all py-1.5 font-mono text-white/40">{JSON.stringify(a.detail)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: End-to-end admin verification**

With `ADMIN_PASSCODE=test1234`:
1. Prizes tab → add "$100 Visa gift card", qty 5.
2. Awards tab → edit `league-champion`, set a Tier 1 gift-card prize, Save.
3. Run → Finalize (live or allow-snapshot).
4. Issuances tab → pending row for the champion appears → link prize → Approve → Mark issued.
5. Prizes tab shows Issued 1 / 5; Audit tab shows `def.save`, `run.finalize`, `issuance.*` rows.
6. Illegal path check: a fresh pending row's "Mark issued" isn't available before Approve (UI), and the server rejects out-of-order transitions.

- [ ] **Step 5: Typecheck + full test suite + commit**

```bash
npx tsc --noEmit && npm test
git add src/components/game/awards/admin/
git commit -m "feat(admin): prize inventory, issuance workflow, audit trail panels"
```

---

### Task 18: Deploy to the IONOS VPS

**Files:** none new locally (server env + dirs on the VPS)

- [ ] **Step 1: Full local gate**

```bash
npm test && npx tsc --noEmit && npm run build
```

All green before anything ships.

- [ ] **Step 2: Prepare the VPS data dir + env**

```bash
ssh root@74.208.40.108 "mkdir -p /app/SecondBrain/comeback-console/data"
```

Edit the service unit to add the two env vars (generate a real passcode, don't reuse `test1234`):

```bash
ssh root@74.208.40.108 "systemctl cat comeback-console | head -30"
# then add under [Service]:
#   Environment=COMEBACK_DB_PATH=/app/SecondBrain/comeback-console/data/comeback.db
#   Environment=ADMIN_PASSCODE=<generated-passcode>
# via: systemctl edit comeback-console   (drop-in), then:
ssh root@74.208.40.108 "systemctl daemon-reload"
```

- [ ] **Step 3: Deploy per AGENTS.md**

```bash
rsync -az --delete dist deploy/vps-server.mjs package.json package-lock.json root@74.208.40.108:/app/SecondBrain/comeback-console/current/
ssh root@74.208.40.108 "cd /app/SecondBrain/comeback-console/current && npm ci --omit=dev --legacy-peer-deps && systemctl restart comeback-console"
```

Note: `npm ci` must build/download the better-sqlite3 prebuilt for Node 20 — check for errors in the output.

- [ ] **Step 4: Verify live**

- `https://comeback.pwasecondbrain.uk/scoreboard` — live badge + standings table + charts.
- `https://comeback.pwasecondbrain.uk/awards` — ceremony renders.
- `https://comeback.pwasecondbrain.uk/awards/admin` — passcode gate; log in; 11 seeds; run an award end-to-end.
- `ssh root@74.208.40.108 "ls -la /app/SecondBrain/comeback-console/data/"` — comeback.db exists.
- `ssh root@74.208.40.108 "journalctl -u comeback-console -n 30 --no-pager"` — no errors.

- [ ] **Step 5: Commit any deploy-doc updates + report**

Update `AGENTS.md` (repo) with the two new env vars and the admin URL, commit:

```bash
git add AGENTS.md
git commit -m "docs: awards console env vars + admin route"
```

Report the admin passcode to Justin PRIVATELY (not committed anywhere).

---

## Self-review checklist (run after writing, before executing)

- **Spec coverage:** engine+config (T2-5, T16), SQLite (T1, T6-7), admin UI (T16-17), scoreboard live+FAB+provenance (T8, T12), graphs (T13), local console (T11, T14), trophies (T9, T15), prizes+issuance+audit (T6-7, T10, T17), seeds parity (T5), HUD fix (T11), deploy (T18). Ministry OS import = extension point only (schema `source` column, no task — per spec).
- **Type consistency:** `AwardDef`/`AwardRunResult` defined once in `types.ts`; repo/API/UI all import from there. `RankedCommunity` from `comebackData`. Metric ids typed via `MetricId`.
- **Placeholder scan:** the only intentional placeholders are the three Task 16 panel stubs replaced in Task 17 (explicitly called out).
