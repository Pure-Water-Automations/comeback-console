// Client-safe types for the full live-scoreboard board view. The server-only
// parser (src/lib/server/liveCommunities.ts) fills these from the sheet's own
// cells — including the sheet's reported % and points columns — so the board
// mirrors the official scoreboard exactly.

export interface LaneScore {
  baseline: number | null;
  target: number | null;
  /** Current month result (e.g. June income, June weekly avg) */
  monthResult: number | null;
  /** Cumulative trimester result where the sheet tracks one */
  t2Result: number | null;
  /** The sheet's own % cell for this lane */
  pct: number | null;
  /** The sheet's own points cell (finance / members / blessing only) */
  points: number | null;
}

export interface WeeklyLane {
  baseline: number | null;
  target: number | null;
  monthAvg: number | null;
  pctGrowth: number | null;
  /** Weekly results for the month; null = no service / not reported */
  weeks: (number | null)[];
}

export interface LesGoal {
  category: "leadership" | "environment" | "special";
  title: string;
  targetDate?: string;
  completedDate?: string;
}

export interface CommunityBoard {
  communityId: string;
  finance: LaneScore;
  activeMembers: LaneScore;
  blessing: LaneScore;
  sunday: WeeklyLane;
  otherEvents: WeeklyLane;
  newMembers: { target: number | null; monthResult: number | null; t2Result: number | null; pctGrowth: number | null };
  lesGoals: LesGoal[];
}
