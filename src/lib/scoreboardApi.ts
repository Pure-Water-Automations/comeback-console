// Live standings for /scoreboard — ranked communities parsed from the live
// regional sheet, with the static snapshot as fallback (source-badged).

import { createServerFn } from "@tanstack/react-start";
import type { CommunityBoard } from "@/lib/boardTypes";
import { rankedCommunities, type RankedCommunity } from "@/lib/comebackData";

export interface ScoreboardPayload {
  source: "live" | "snapshot";
  month: string | null;
  generatedAt: string;
  standings: RankedCommunity[];
  /** Full board rows keyed by community id — empty on snapshot fallback */
  boards: Record<string, CommunityBoard>;
  message?: string;
}

export const getScoreboardLive = createServerFn({ method: "GET" }).handler(
  async (): Promise<ScoreboardPayload> => {
    const { loadLiveCommunities } = await import("@/lib/server/liveCommunities");
    const live = await loadLiveCommunities();
    return {
      source: live.source,
      month: live.month,
      generatedAt: new Date().toISOString(),
      standings: rankedCommunities(live.communities),
      boards: live.boards,
      message: live.message,
    };
  },
);
