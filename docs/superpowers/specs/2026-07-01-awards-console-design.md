# Awards Console: Configurable Recognition Engine — Design

**Date:** 2026-07-01
**App:** comeback-console (Operation COMEBACK Gamified Console, POC)
**Status:** Proposed

## Goal

Replace the hardcoded weekly-awards logic with a configurable recognition
engine: awards are defined at runtime in an in-app admin UI (name, tiers,
community scope, metric, window, tie-breakers, prizes), evaluated against
live scoreboard data, and rendered on the existing Awards Night surface.
Alongside it: a live-data scoreboard with a standard graph set, a stripped
per-community local console, server-side trophy tracking that awards can
trigger on, and a prize inventory + issuance workflow with an audit trail.

## Decisions already made (with Justin, 2026-07-01)

- Award definitions are edited in an **in-app admin UI** (not a config sheet,
  not config-as-code).
- Persistence is **SQLite on the VPS**. The VPS runs Node 20.20.2, so the
  driver is `better-sqlite3` (prebuilt binaries; `node:sqlite` needs ≥22.5).
- The local console variant **evolves the existing `/dashboard` route**.
- All four subsystems are in scope for this build: award engine + config,
  scoreboard graphs + live feed, local console, trophies + prize management.

## Approach

**Chosen: typed evaluator registry + DB-configured awards.**
Metric definitions and evaluator implementations live in code (typed, unit-
tested); award definitions, policies, prizes, issuances, runs, and audit rows
live in SQLite; the admin UI composes awards from the code-side catalog.

Rejected alternatives:

- *Fully generic engine* (metrics + formulas defined in the DB via a formula
  DSL): maximum configurability, but the DSL becomes a large correctness and
  governance surface — wrong trade for a POC.
- *Hybrid-lite* (keep `weeklyAwards.ts` untouched; engine only for new
  awards): cheapest, but leaves two parallel award systems and the existing
  seven categories non-configurable.

The existing seven award categories (Biggest Weekly Jump, Full House, three
category podiums, Division Champions, David Award, Triple Header, League
Champion) are migrated as **seed rows** so the Awards Night show looks the
same on day one but every award becomes editable.

## Architecture

```
src/lib/awards-engine/          pure domain logic (no I/O, fully unit-tested)
  metricCatalog.ts              METRICS registry + governance metadata
  evaluators.ts                 evaluator registry (metric_rank + specials)
  engine.ts                     evaluateAward(def, data) -> AwardRunResult
  types.ts                      AwardDef, AwardRunResult, EligibilityRules...
src/lib/server/db.ts            better-sqlite3 open/migrate (schema v1, WAL)
src/lib/server/awardsRepo.ts    typed queries for defs/runs/prizes/audit
src/lib/awardsApi.ts            public createServerFn reads
src/lib/awardsAdminApi.ts       passcode-gated createServerFn writes
src/lib/scoreboardApi.ts        getScoreboardLive() (refactored from
                                regionalScoreboard.ts parsing)
src/routes/awards_.admin.tsx    admin UI route at /awards/admin (pathless-
                                parent naming so it does NOT nest inside the
                                awards ceremony's outlet-less route)
src/components/game/awards/admin/*   admin panels
src/components/game/GameNav.tsx      shared global nav
```

### Metric catalog (code)

A typed registry, exposed read-only to the admin UI picker. Each entry:
`id`, `label`, `format` (currency/count/percent/points), `source`
(scoreboard-sheet column group or derived), `windows` supported,
`higherIsBetter`, and governance metadata (`sourceDescription`,
`updateCadence`). Initial metrics (~12): total points, finance/member/
blessing points, income result, active members, blessings result, Sunday
average, Sunday peak, biggest weekly jump, % of target per category.

### Evaluators (code)

- `metric_rank` — the generic one: filter to scope → apply eligibility →
  rank by metric over window → take 1 or 3 tiers → apply tie-breakers.
- `division_champions`, `david`, `triple_header` — special evaluators ported
  from `weeklyAwards.ts` so those seeds keep their bespoke semantics.
- `trophy_count` — ranks communities by trophies unlocked in the window,
  reading server-side `trophy_events`.

Every evaluator returns the same shape: winners (tier, communityId, stat
value + formatted stat + detail line), tie-breaks applied, and disqualified
communities with reasons.

### Policies

Per-award JSON config validated with zod:

- **Scope:** `all` | `size` (one or more of XL/Medium/Small/Family Group) |
  explicit community list.
- **Tiers:** podium (1st/2nd/3rd) or single winner.
- **Window:** `campaign` | `month:<tab name>` | `latest-week`.
- **Tie-breakers:** ordered list of metric ids; final fallback is stable
  alphabetical (deterministic, recorded in the run).
- **Eligibility / disqualification:** `minWeeksReported`,
  `requireAllCategories`, `excludeCommunityIds`. Failures are recorded per
  run with reasons (visible in admin, part of audit).
- **Prize per tier:** type `cash` | `gift_card` | `other`, USD value, label.

## Data model (SQLite, schema v1)

- `award_defs` — id, name, subtitle, emoji, tone, evaluator, metric_id,
  scope JSON, tiers, window, tie_breakers JSON, eligibility JSON,
  prizes JSON, status (`draft`/`active`/`archived`), sort, timestamps.
- `award_runs` — id, award_id, ran_at, window_label, data_source
  (`live`/`snapshot`), results JSON (winners + disqualifications +
  tie-break notes), status (`final`).
- `prizes` — inventory: id, label, type, value_usd, qty_total, qty_issued,
  notes.
- `prize_issuances` — run_id, award_id, tier, community_id, prize_id,
  status `pending` → `approved` → `issued` (or `void`), transition
  timestamps. **Tracking only — the app never moves money.**
- `trophy_events` — community_id, achievement_id, source
  (`console`/`ministry_os`), unlocked_at, reported_at; unique on
  (community_id, achievement_id, source) so client reporting is idempotent.
- `audit_log` — ts, actor, action, entity, entity_id, detail JSON. Written
  on every def change, run, prize change, and issuance transition.

**DB file location:** `COMEBACK_DB_PATH` env var. Local default
`./data/comeback.db` (gitignored). VPS:
`/app/SecondBrain/comeback-console/data/comeback.db` — outside `current/`
so rsync deploys never touch it. Set in `comeback-console.service`.

**Seeding:** on first open with an empty `award_defs`, insert the seven
legacy categories (idempotent, marked `seed: true` in audit).

## Server functions

Public (read):

- `getActiveAwards()` — active defs + their latest final run, shaped for the
  existing `AwardsShow` renderer.
- `getScoreboardLive()` — live ranked communities + weekly series parsed
  from the regional scoreboard sheet (refactor of `regionalScoreboard.ts`
  internals), with the static snapshot as fallback and a
  `source: "live" | "snapshot"` flag.
- `reportTrophies({ communityId, achievementIds })` — idempotent upsert into
  `trophy_events`; fire-and-forget from the client.

Admin (all validate a passcode argument server-side):

- Award def CRUD (+ archive), `previewRun(defId)` (compute, don't persist),
  `finalizeRun(defId)` (persist run + audit + create pending issuances).
- Prize CRUD; issuance transitions (approve/issue/void).
- `listAudit(filter)`.

**Admin auth (POC-grade):** `ADMIN_PASSCODE` env var. A gate screen on
`/awards/admin` stores the passcode in `sessionStorage`; every admin server
fn checks it. No accounts, no sessions — consistent with the app's
"open POC" posture, but writes are no longer anonymous-by-URL. Actor in
audit rows is `"admin"`.

## UX & navigation

- **Global nav (`GameNav`)** on index, awards, scoreboard, dashboard:
  Awards · Standings · Rulebook · My Console. Rulebook links to the existing
  rules narrative on `/`. Admin is reachable at `/awards/admin` (footer
  link on the awards page, not in primary nav).
- **`/awards`** — Awards Night show unchanged visually; winner data now comes
  from `getActiveAwards()`. If the DB is empty/unavailable it falls back to
  the legacy `buildWeeklyAwards()` snapshot path.
- **`/awards/admin`** — dark-cosmic admin per DESIGN_BRIEF: award list with
  status chips; editor form (pickers driven by the metric catalog and
  evaluator registry; zod-validated); Run panel showing a preview table
  (winners, tie-breaks, disqualifications) with a Finalize button; Prizes
  panel (inventory + issuance queue with status transitions); Audit tab.
- **`/scoreboard`** — switches to `getScoreboardLive()` via react-query,
  with a source badge ("LIVE" or "Snapshot · Jun 9"). Adds a graphs section
  limited to the three standard chart types (recharts, chart tokens):
  **trend** (weekly attendance/points lines), **leaderboard** (points bar),
  **distribution** (points by size tier).
- **`/dashboard`** — becomes the stripped local console: `GameNav`,
  community picker (kept), scoreboard-first stat blocks, "our award wins"
  strip (from finalized runs), trophy teaser linking to the rulebook/awards.
  No motion gating of load-bearing data (existing house rule).
- **Trophy link:** `progression.ts#award()` also fire-and-forget POSTs new
  unlocks via `reportTrophies` (NJ console reports as `new-jersey`).
  Ministry OS trophies: the `trophy_events.source` column and a documented
  import stub are the extension point — **actual Ministry OS integration is
  deferred** until that side has an API.

## Error handling

- Live sheet read fails → snapshot fallback, clearly badged; `finalizeRun`
  **refuses** to persist a run from snapshot data unless the admin toggles
  "allow snapshot data" (recorded in the run + audit).
- DB unavailable → public pages fall back to legacy snapshot awards; admin
  route shows an explicit error state.
- All admin inputs zod-validated server-side; passcode failures return 401.
- Trophy reporting is idempotent and silent on failure (never blocks UX).

## Testing

Vitest (already configured):

- Engine: each evaluator against fixtures built from the static
  `COMMUNITIES` snapshot; scope filtering, eligibility/disqualification,
  tie-breaker ordering, determinism.
- Repo layer: against `better-sqlite3` `:memory:` DB — migrations, seed
  idempotency, issuance state machine (illegal transitions rejected),
  trophy upsert idempotency.
- Seed parity: seeded defs evaluated against the snapshot reproduce the same
  winners as legacy `buildWeeklyAwards()`.
- UI verified manually via dev preview (no RTL setup in repo; not adding it
  for the POC).

## Deploy notes

- `better-sqlite3` as a production dependency (prebuilt binary installs fine
  on VPS Node 20 during `npm ci --omit=dev`); nitro externalizes it in the
  server build.
- `mkdir -p /app/SecondBrain/comeback-console/data` once; add
  `COMEBACK_DB_PATH` and `ADMIN_PASSCODE` to `comeback-console.service`.
- No change to the deploy script flow (rsync + npm ci + restart).

## Out of scope

- Ministry OS trophy import (extension point only).
- Actual payment/gift-card fulfillment — the ledger tracks status only.
- Auth beyond the shared admin passcode; per-user identity.
- Editing the metric catalog at runtime (metrics are code).
- Multi-region support (Northeast's 18 communities only, per the POC).
