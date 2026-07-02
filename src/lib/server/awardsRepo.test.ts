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
