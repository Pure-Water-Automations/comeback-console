import { describe, expect, it } from "vitest";
import { categoryPoints, pctOfTarget } from "@/lib/comebackData";

describe("comebackData scoring", () => {
  // A null result means "not reported yet" (e.g. income typically posts
  // ~mid-month for the prior month) — it must score the same as a community
  // that simply hasn't logged anything, never as a collapse to zero.
  it("scores a pending (null) result the same as a truly-absent one", () => {
    const baseline = { baseline: 1000, target: 1100 };
    expect(categoryPoints({ ...baseline, result: null })).toBe(0);
    expect(pctOfTarget({ ...baseline, result: null })).toBe(0);
  });

  it("still scores a genuine reported result normally", () => {
    const score = { baseline: 1000, target: 1100, result: 1200 };
    expect(categoryPoints(score)).toBe(200);
    expect(pctOfTarget(score)).toBeCloseTo(109.09, 1);
  });

  it("does not treat a real reported zero the same as missing baseline/target data", () => {
    // An explicit 0 result (distinct from a blank/pending cell) still scores
    // as "no growth to report" rather than a crash — categoryPoints requires
    // a truthy result to award points either way.
    expect(categoryPoints({ baseline: 1000, target: 1100, result: 0 })).toBe(0);
  });
});
