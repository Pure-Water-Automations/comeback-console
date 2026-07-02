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
