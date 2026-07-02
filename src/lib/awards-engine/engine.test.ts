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
