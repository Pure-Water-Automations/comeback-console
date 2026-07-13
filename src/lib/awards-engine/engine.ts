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
      const missing = (["finance", "activeMembers", "blessing"] as const).filter((k) => (c[k].result ?? 0) <= 0);
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
