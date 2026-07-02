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
