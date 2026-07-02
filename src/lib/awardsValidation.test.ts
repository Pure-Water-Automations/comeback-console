import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, sanitizeAchievementIds } from "@/lib/progression";
import { defSchema } from "@/lib/awardsAdminApi";
import { SEED_AWARD_DEFS } from "@/lib/awards-engine/seeds";

describe("sanitizeAchievementIds (trophy endpoint guard)", () => {
  it("keeps only ids from the real achievement registry, deduped", () => {
    const real = ACHIEVEMENTS[0].id;
    expect(sanitizeAchievementIds([real, real, "totally-fake", 42, null, "x".repeat(5000)])).toEqual([real]);
  });

  it("returns empty for non-arrays", () => {
    expect(sanitizeAchievementIds("not-an-array")).toEqual([]);
    expect(sanitizeAchievementIds(undefined)).toEqual([]);
  });
});

describe("defSchema", () => {
  const valid = SEED_AWARD_DEFS.find((d) => d.id === "league-champion")!;

  it("accepts every seed definition", () => {
    for (const seed of SEED_AWARD_DEFS) {
      expect(defSchema.safeParse(seed).success, seed.id).toBe(true);
    }
  });

  it("rejects an unknown metricId", () => {
    expect(defSchema.safeParse({ ...valid, metricId: "bogus_metric" }).success).toBe(false);
  });

  it("rejects unknown tie-breaker metrics", () => {
    expect(defSchema.safeParse({ ...valid, tieBreakers: ["bogus_metric"] }).success).toBe(false);
  });

  it("rejects metric_rank without a metric", () => {
    expect(defSchema.safeParse({ ...valid, metricId: undefined }).success).toBe(false);
  });
});
