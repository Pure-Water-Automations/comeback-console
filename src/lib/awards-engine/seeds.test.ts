import { describe, expect, it } from "vitest";
import { COMMUNITIES } from "@/lib/comebackData";
import { buildWeeklyAwards } from "@/lib/weeklyAwards";
import { evaluateAward } from "./engine";
import { METRIC_BY_ID } from "./metricCatalog";
import { SEED_AWARD_DEFS } from "./seeds";
import type { AwardDef, EngineData } from "./types";

const data: EngineData = { communities: COMMUNITIES, trophyCounts: {} };
const byId = new Map(COMMUNITIES.map((c) => [c.id, c]));

/** Metric value per community for a metric_rank seed (null for specials). */
function metricValue(def: AwardDef, communityId: string): number | null {
  if (def.evaluator !== "metric_rank" || !def.metricId) return null;
  return METRIC_BY_ID[def.metricId].compute(byId.get(communityId)!);
}

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
      expect(engine).toHaveLength(oldIds.length);
      if (def.evaluator === "metric_rank") {
        // Ties may resolve to different members (legacy uses input order, the
        // engine alphabetical — a legitimate, documented difference), so the
        // strong invariant is: the podium VALUES match position by position,
        // and ids match wherever the value is unique across both podiums.
        const engineVals = engine.map((id) => metricValue(def, id));
        const oldVals = oldIds.map((id) => metricValue(def, id));
        expect(engineVals).toEqual(oldVals);
        // A value is unambiguous only if exactly one community in the whole
        // field holds it — many-way ties put just one member on each podium.
        const fieldCounts = new Map<number | null, number>();
        for (const c of COMMUNITIES) {
          const v = metricValue(def, c.id);
          fieldCounts.set(v, (fieldCounts.get(v) ?? 0) + 1);
        }
        engine.forEach((id, i) => {
          if (fieldCounts.get(engineVals[i]) === 1) expect(id).toBe(oldIds[i]);
        });
      } else {
        expect([...engine].sort()).toEqual([...oldIds].sort());
      }
    });
  }

  it("all seeds are active and pass basic shape checks", () => {
    for (const d of SEED_AWARD_DEFS) {
      expect(d.status).toBe("active");
      if (d.evaluator === "metric_rank") expect(d.metricId).toBeTruthy();
    }
  });
});
