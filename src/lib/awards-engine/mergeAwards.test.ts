import { describe, expect, it } from "vitest";
import type { Award, AwardWinner } from "@/lib/weeklyAwards";
import { mergeAwards } from "./mergeAwards";

const w = (communityId: string): AwardWinner => ({
  community: communityId, communityId, mascot: "adventurer", stat: "+1 pts",
});
const award = (id: string, winners: AwardWinner[]): Award => ({
  id, title: id, subtitle: "", emoji: "🏆", tone: "gold", winners,
});

describe("mergeAwards", () => {
  const legacy = [award("a", [w("x")]), award("b", [w("y")]), award("c", [w("z")])];

  it("returns legacy untouched when the engine has nothing", () => {
    expect(mergeAwards(legacy, null)).toEqual(legacy);
  });

  it("overrides by id in place, keeps the rest, no duplicates", () => {
    const engine = [award("b", [w("q")])];
    const merged = mergeAwards(legacy, engine);
    expect(merged.map((a) => a.id)).toEqual(["a", "b", "c"]);
    expect(merged[1].winners[0].communityId).toBe("q");
  });

  it("appends engine-only awards at the end", () => {
    const merged = mergeAwards(legacy, [award("new-award", [w("n")])]);
    expect(merged.map((a) => a.id)).toEqual(["a", "b", "c", "new-award"]);
  });

  it("drops awards whose finalized run has zero winners", () => {
    const merged = mergeAwards(legacy, [award("b", [])]);
    expect(merged.map((a) => a.id)).toEqual(["a", "c"]);
  });
});
