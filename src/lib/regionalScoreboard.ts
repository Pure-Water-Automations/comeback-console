// Live regional scoreboard → Awards Night.
//
// The sheet parsing lives in the server-only module
// src/lib/server/liveCommunities.ts (import-protection denies **/server/**
// from client-reachable code, and this module IS client-reachable — the
// ceremony and the dashboard import fetchLiveAwards). This file only holds
// the client-safe payload type and the server fn whose handler body is
// stripped from the client bundle.

import { createServerFn } from "@tanstack/react-start";
import {
  buildRegionOverview,
  buildWeeklyAwards,
  weeklyAwardsMeta,
  type Award,
  type OverviewSlide,
  type WeeklyAwardsMeta,
} from "@/lib/weeklyAwards";

export interface LiveAwardsPayload {
  ok: boolean;
  source: "live" | "snapshot";
  month: string | null;
  message?: string;
  awards: Award[];
  overview: OverviewSlide[];
  meta: WeeklyAwardsMeta;
}

export const fetchLiveAwards = createServerFn({ method: "GET" }).handler(
  async (): Promise<LiveAwardsPayload> => {
    const { loadLiveCommunities } = await import("@/lib/server/liveCommunities");
    const { engineAwards } = await import("@/lib/server/engineAwards");
    const live = await loadLiveCommunities();
    const fromEngine = await engineAwards();
    // Merge: a finalized engine run overrides its legacy-computed counterpart,
    // but awards without runs keep their live-computed results — finalizing
    // one award must not shrink the whole ceremony to a single slide.
    const legacy = buildWeeklyAwards(live.communities);
    let awards = legacy;
    if (fromEngine) {
      const engineById = new Map(fromEngine.map((a) => [a.id, a]));
      const legacyIds = new Set(legacy.map((a) => a.id));
      awards = [
        ...legacy.map((a) => engineById.get(a.id) ?? a),
        ...fromEngine.filter((a) => !legacyIds.has(a.id)),
      ];
    }
    return {
      ok: live.source === "live",
      source: live.source,
      month: live.month,
      message: live.message,
      awards,
      overview: buildRegionOverview(live.communities),
      meta: weeklyAwardsMeta(awards, live.communities),
    };
  },
);
