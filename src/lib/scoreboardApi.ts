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

export interface AttendanceTrendPayload {
  source: "live" | "empty";
  /** Region-wide avg weekly Sunday attendance, one point per month (Jan → now). */
  points: { label: string; attendance: number }[];
}

export const getAttendanceTrend = createServerFn({ method: "GET" }).handler(
  async (): Promise<AttendanceTrendPayload> => {
    try {
      const { loadAttendanceYtd } = await import("@/lib/server/liveAttendance");
      const points = await loadAttendanceYtd();
      return {
        source: points.length ? "live" : "empty",
        points: points.map((p) => ({ label: p.label, attendance: p.attendance })),
      };
    } catch {
      return { source: "empty", points: [] };
    }
  },
);

export interface CommunityAttendancePayload {
  source: "live" | "empty";
  /** communityId → monthly Sunday-Service avg points (month index 0-11, YTD). */
  byCommunity: Record<string, { month: number; label: string; attendance: number }[]>;
}

export const getCommunityAttendance = createServerFn({ method: "GET" }).handler(
  async (): Promise<CommunityAttendancePayload> => {
    try {
      const { loadAttendanceByCommunity } = await import("@/lib/server/liveAttendance");
      const byCommunity = await loadAttendanceByCommunity();
      return { source: Object.keys(byCommunity).length ? "live" : "empty", byCommunity };
    } catch {
      return { source: "empty", byCommunity: {} };
    }
  },
);
