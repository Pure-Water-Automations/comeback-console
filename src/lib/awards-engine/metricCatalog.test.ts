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
    expect(formatMetricValue(METRIC_BY_ID.finance_pct_target, 87.36)).toBe("87.4%");
  });
});
