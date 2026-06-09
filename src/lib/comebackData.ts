// Operation COMEBACK — T2 (May 1 – Aug 31, 2026) Northeast Region data.
// Snapshot of the May 2026 regional scoreboard (sanitized POC copy).
// Scoring follows the campaign rule: points = (result % of target − 100) × 10,
// so a community at exactly its growth target scores 0 and every percent of
// growth beyond it earns 10 points. Targets are baseline +10% donations,
// +20% active members, +30% blessing.

export type CommunitySize = "Extra Large" | "Medium" | "Small" | "Family Group";

export interface CategoryScore {
  /** Prior-period baseline the community grows from */
  baseline: number;
  /** T2 target (baseline + campaign growth %) */
  target: number;
  /** Current T2 result */
  result: number;
}

export interface Community {
  id: string;
  name: string;
  shortName: string;
  /** STRATCOM challenge team (from the scoreboard's Reg column) */
  team: "NE" | "SE" | "MW" | "W" | "S" | "CAN";
  size: CommunitySize;
  /** Sprite family used as the community's mascot */
  mascot: "adventurer" | "mentor" | "npc" | "smart_guy" | "spirit" | "wizard";
  /** Average monthly income (USD) */
  finance: CategoryScore;
  /** Active members (3+ attendances in the last 91 days) */
  activeMembers: CategoryScore;
  /** Total Blessing Journey process steps */
  blessing: CategoryScore;
  /** Avg weekly Sunday Service attendance vs target */
  sundayService: CategoryScore;
  /** Weekly Sunday Service results for the current month (null = no service) */
  weeklyAttendance: (number | null)[];
  /** Sample LES (Leadership / Environment / Special projects) quests */
  lesGoals: { title: string; targetDate: string; completedDate?: string }[];
}

export const TRIMESTER = {
  key: "T2",
  label: "Trimester 2",
  start: "2026-05-01",
  end: "2026-08-31",
  growthTargets: { finance: 0.1, activeMembers: 0.2, blessing: 0.3 },
} as const;

export const COMMUNITIES: Community[] = [
  {
    id: "new-jersey",
    name: "New Jersey Family Church",
    shortName: "New Jersey",
    team: "NE",
    size: "Extra Large",
    mascot: "adventurer",
    finance: { baseline: 61599, target: 67759, result: 73456 },
    activeMembers: { baseline: 489, target: 587, result: 396 },
    blessing: { baseline: 126, target: 164, result: 128 },
    sundayService: { baseline: 217, target: 238, result: 230 },
    weeklyAttendance: [225, 231, 250, 215],
    lesGoals: [
      { title: "Launch young-adult leadership cohort", targetDate: "2026-06-15" },
      { title: "Sanctuary refresh: paint + lighting", targetDate: "2026-07-01" },
    ],
  },
  {
    id: "belvedere",
    name: "Belvedere Family Church",
    shortName: "Belvedere",
    team: "NE",
    size: "Medium",
    mascot: "mentor",
    finance: { baseline: 32684, target: 35952, result: 0 },
    activeMembers: { baseline: 213, target: 256, result: 193 },
    blessing: { baseline: 61, target: 79, result: 61 },
    sundayService: { baseline: 135, target: 148, result: 45 },
    weeklyAttendance: [29, 38, 68],
    lesGoals: [{ title: "Grounds beautification day", targetDate: "2026-06-20" }],
  },
  {
    id: "new-york-kea",
    name: "New York KEA",
    shortName: "NY KEA",
    team: "NE",
    size: "Medium",
    mascot: "smart_guy",
    finance: { baseline: 16545, target: 18200, result: 17827 },
    activeMembers: { baseline: 82, target: 98, result: 87 },
    blessing: { baseline: 28, target: 36, result: 28 },
    sundayService: { baseline: 42, target: 46, result: 54 },
    weeklyAttendance: [49, 64, 64, 40],
    lesGoals: [{ title: "Train two new Sunday school teachers", targetDate: "2026-07-12" }],
  },
  {
    id: "manhattan",
    name: "Manhattan Family Church",
    shortName: "Manhattan",
    team: "SE",
    size: "Medium",
    mascot: "wizard",
    finance: { baseline: 13290, target: 14619, result: 9188 },
    activeMembers: { baseline: 69, target: 83, result: 53 },
    blessing: { baseline: 33, target: 43, result: 33 },
    sundayService: { baseline: 39, target: 43, result: 47 },
    weeklyAttendance: [54, 45, 43],
    lesGoals: [{ title: "Host community open-house night", targetDate: "2026-06-28" }],
  },
  {
    id: "connecticut",
    name: "Connecticut Family Church",
    shortName: "Connecticut",
    team: "SE",
    size: "Medium",
    mascot: "spirit",
    finance: { baseline: 11638, target: 12802, result: 12132 },
    activeMembers: { baseline: 135, target: 162, result: 128 },
    blessing: { baseline: 31, target: 40, result: 32 },
    sundayService: { baseline: 82, target: 90, result: 88 },
    weeklyAttendance: [90, 85, 88],
    lesGoals: [{ title: "Renovate fellowship hall kitchen", targetDate: "2026-08-01" }],
  },
  {
    id: "boston",
    name: "Boston Family Church",
    shortName: "Boston",
    team: "NE",
    size: "Medium",
    mascot: "npc",
    finance: { baseline: 13010, target: 14311, result: 10793 },
    activeMembers: { baseline: 81, target: 97, result: 79 },
    blessing: { baseline: 36, target: 47, result: 36 },
    sundayService: { baseline: 62, target: 68, result: 60 },
    weeklyAttendance: [61, 53, 57, 70],
    lesGoals: [{ title: "Start monthly prayer breakfast", targetDate: "2026-06-07" }],
  },
  {
    id: "philadelphia",
    name: "Philadelphia Family Church",
    shortName: "Philadelphia",
    team: "S",
    size: "Small",
    mascot: "adventurer",
    finance: { baseline: 7524, target: 8276, result: 0 },
    activeMembers: { baseline: 52, target: 62, result: 51 },
    blessing: { baseline: 6, target: 8, result: 6 },
    sundayService: { baseline: 31, target: 34, result: 34 },
    weeklyAttendance: [35, 30, 32, 39],
    lesGoals: [{ title: "Youth-led service Sunday", targetDate: "2026-07-19" }],
  },
  {
    id: "queens",
    name: "Queens Family Church",
    shortName: "Queens",
    team: "MW",
    size: "Small",
    mascot: "mentor",
    finance: { baseline: 7674, target: 8441, result: 0 },
    activeMembers: { baseline: 40, target: 48, result: 36 },
    blessing: { baseline: 6, target: 8, result: 6 },
    sundayService: { baseline: 25, target: 28, result: 24 },
    weeklyAttendance: [19, 24, 28],
    lesGoals: [
      {
        title: "Witnessing meeting with core members & staff",
        targetDate: "2026-05-02",
        completedDate: "2026-05-02",
      },
    ],
  },
  {
    id: "worcester",
    name: "Worcester Family Church",
    shortName: "Worcester",
    team: "MW",
    size: "Small",
    mascot: "smart_guy",
    finance: { baseline: 5556, target: 6112, result: 0 },
    activeMembers: { baseline: 46, target: 55, result: 51 },
    blessing: { baseline: 9, target: 12, result: 9 },
    sundayService: { baseline: 36, target: 40, result: 43 },
    weeklyAttendance: [44, 42],
    lesGoals: [{ title: "Plant a community garden", targetDate: "2026-06-30" }],
  },
  {
    id: "elizabeth",
    name: "Elizabeth Family Church",
    shortName: "Elizabeth",
    team: "MW",
    size: "Small",
    mascot: "spirit",
    finance: { baseline: 5538, target: 6092, result: 6911 },
    activeMembers: { baseline: 106, target: 127, result: 103 },
    blessing: { baseline: 17, target: 22, result: 17 },
    sundayService: { baseline: 69, target: 76, result: 63 },
    weeklyAttendance: [79, 35, 51, 85],
    lesGoals: [{ title: "Family movie + testimony night", targetDate: "2026-07-25" }],
  },
  {
    id: "mid-hudson",
    name: "Mid-Hudson Valley Family Church",
    shortName: "Mid-Hudson",
    team: "MW",
    size: "Small",
    mascot: "npc",
    finance: { baseline: 3993, target: 4392, result: 0 },
    activeMembers: { baseline: 52, target: 62, result: 50 },
    blessing: { baseline: 3, target: 4, result: 3 },
    sundayService: { baseline: 40, target: 44, result: 32 },
    weeklyAttendance: [41, 22],
    lesGoals: [{ title: "Refresh welcome signage", targetDate: "2026-06-14" }],
  },
  {
    id: "bronx",
    name: "Bronx Family Church",
    shortName: "Bronx",
    team: "W",
    size: "Small",
    mascot: "wizard",
    finance: { baseline: 2890, target: 3179, result: 3228 },
    activeMembers: { baseline: 22, target: 26, result: 22 },
    blessing: { baseline: 1, target: 1, result: 1 },
    sundayService: { baseline: 23, target: 25, result: 14 },
    weeklyAttendance: [14, null, 13],
    lesGoals: [{ title: "Neighborhood cleanup Saturday", targetDate: "2026-06-21" }],
  },
  {
    id: "albany",
    name: "Albany Family Church",
    shortName: "Albany",
    team: "W",
    size: "Small",
    mascot: "adventurer",
    finance: { baseline: 1916, target: 2108, result: 1333 },
    activeMembers: { baseline: 11, target: 13, result: 0 },
    blessing: { baseline: 1, target: 1, result: 1 },
    sundayService: { baseline: 11, target: 12, result: 6 },
    weeklyAttendance: [6],
    lesGoals: [{ title: "Host a Mother's Day event", targetDate: "2026-05-10" }],
  },
  {
    id: "rhode-island",
    name: "Rhode Island Family Church",
    shortName: "Rhode Island",
    team: "W",
    size: "Small",
    mascot: "mentor",
    finance: { baseline: 2380, target: 2618, result: 0 },
    activeMembers: { baseline: 11, target: 13, result: 12 },
    blessing: { baseline: 1, target: 1, result: 1 },
    sundayService: { baseline: 9, target: 10, result: 8 },
    weeklyAttendance: [9, 7, 8, 7],
    lesGoals: [{ title: "Coastal retreat planning", targetDate: "2026-08-08" }],
  },
  {
    id: "long-island",
    name: "Long Island Family Church",
    shortName: "Long Island",
    team: "CAN",
    size: "Family Group",
    mascot: "npc",
    finance: { baseline: 2156, target: 2372, result: 186 },
    activeMembers: { baseline: 0, target: 0, result: 0 },
    blessing: { baseline: 0, target: 0, result: 0 },
    sundayService: { baseline: 2, target: 2, result: 0 },
    weeklyAttendance: [null, null],
    lesGoals: [],
  },
  {
    id: "maine",
    name: "Maine Family Church",
    shortName: "Maine",
    team: "CAN",
    size: "Family Group",
    mascot: "spirit",
    finance: { baseline: 2559, target: 2815, result: 0 },
    activeMembers: { baseline: 0, target: 0, result: 0 },
    blessing: { baseline: 2, target: 3, result: 2 },
    sundayService: { baseline: 0, target: 0, result: 0 },
    weeklyAttendance: [],
    lesGoals: [],
  },
  {
    id: "new-hampshire",
    name: "New Hampshire Family Church",
    shortName: "New Hampshire",
    team: "CAN",
    size: "Family Group",
    mascot: "smart_guy",
    finance: { baseline: 1278, target: 1406, result: 0 },
    activeMembers: { baseline: 17, target: 20, result: 18 },
    blessing: { baseline: 0, target: 0, result: 0 },
    sundayService: { baseline: 14, target: 15, result: 13 },
    weeklyAttendance: [null, 13, null],
    lesGoals: [{ title: "Developing a ministry team", targetDate: "2026-05-31" }],
  },
  {
    id: "vermont",
    name: "Vermont Family Church",
    shortName: "Vermont",
    team: "W",
    size: "Family Group",
    mascot: "wizard",
    finance: { baseline: 2316, target: 2548, result: 0 },
    activeMembers: { baseline: 5, target: 6, result: 5 },
    blessing: { baseline: 5, target: 7, result: 4 },
    sundayService: { baseline: 5, target: 6, result: 5 },
    weeklyAttendance: [6, 3],
    lesGoals: [],
  },
];

// ---------------------------------------------------------------------------
// Scoring (mirrors the regional scoreboard formulas)
// ---------------------------------------------------------------------------

/** % of target achieved (0 when there's no target or no result yet) */
export function pctOfTarget(s: CategoryScore): number {
  if (!s.target || !s.result) return 0;
  return (s.result / s.target) * 100;
}

/** Campaign points: every percent above/below target is worth ±10 points */
export function categoryPoints(s: CategoryScore): number {
  const pct = pctOfTarget(s);
  if (pct === 0) return 0;
  return Math.round((pct - 100) * 10);
}

export function totalPoints(c: Community): number {
  return (
    categoryPoints(c.finance) + categoryPoints(c.activeMembers) + categoryPoints(c.blessing)
  );
}

export interface RankedCommunity extends Community {
  rank: number;
  points: number;
  financePoints: number;
  memberPoints: number;
  blessingPoints: number;
}

/** Communities sorted by total points, with per-category point breakdown */
export function rankedCommunities(): RankedCommunity[] {
  return COMMUNITIES.map((c) => ({
    ...c,
    points: totalPoints(c),
    financePoints: categoryPoints(c.finance),
    memberPoints: categoryPoints(c.activeMembers),
    blessingPoints: categoryPoints(c.blessing),
  }))
    .sort((a, b) => b.points - a.points)
    .map((c, i) => ({ ...c, rank: i + 1 }));
}

// ---------------------------------------------------------------------------
// Gamification layer
// ---------------------------------------------------------------------------

export interface Badge {
  id: string;
  label: string;
  description: string;
  earned: boolean;
}

/** Achievement badges derived from a community's current standing */
export function communityBadges(c: Community): Badge[] {
  const fin = pctOfTarget(c.finance);
  const mem = pctOfTarget(c.activeMembers);
  const ble = pctOfTarget(c.blessing);
  const lesDone = c.lesGoals.some((g) => g.completedDate);
  return [
    {
      id: "triple-header",
      label: "Triple Header",
      description: "Beat target in Income, Members, and Blessing at once.",
      earned: fin >= 100 && mem >= 100 && ble >= 100,
    },
    {
      id: "treasury",
      label: "Treasury Keeper",
      description: "Income at or above the T2 target.",
      earned: fin >= 100,
    },
    {
      id: "gatherer",
      label: "Gatherer of People",
      description: "Active membership at or above the T2 target.",
      earned: mem >= 100,
    },
    {
      id: "matchmaker",
      label: "Blessing Guide",
      description: "Blessing Journey steps at or above the T2 target.",
      earned: ble >= 100,
    },
    {
      id: "quest-complete",
      label: "Quest Complete",
      description: "Completed an LES goal this trimester.",
      earned: lesDone,
    },
    {
      id: "faithful-scribe",
      label: "Faithful Scribe",
      description: "Attendance recorded every week this month.",
      earned:
        c.weeklyAttendance.length > 0 && c.weeklyAttendance.every((w) => w !== null && w > 0),
    },
  ];
}

/** Simple XP/level curve: 1 level per 250 positive points, capped at 10 */
export function communityLevel(points: number): { level: number; progress: number } {
  const xp = Math.max(0, points + 500); // floor so struggling communities still see a bar
  const level = Math.min(10, Math.floor(xp / 250) + 1);
  const progress = level >= 10 ? 1 : (xp % 250) / 250;
  return { level, progress };
}

/** Coaching tips keyed to the weakest category, phrased from the pastor guide */
export function coachingTips(c: Community): string[] {
  const cats = [
    { key: "finance", pct: pctOfTarget(c.finance) },
    { key: "members", pct: pctOfTarget(c.activeMembers) },
    { key: "blessing", pct: pctOfTarget(c.blessing) },
  ].sort((a, b) => a.pct - b.pct);
  const tips: Record<string, string> = {
    finance:
      "Income points come from growth vs. baseline — make sure monthly giving is entered in the finance source and watch your target line.",
    members:
      "Active members are people with 3+ attendances in 91 days. Record every Sunday and event, then follow up with drifting members.",
    blessing:
      "Blessing points reward process steps, not just ceremonies. Record every step a candidate takes — movement is the score.",
  };
  return cats.slice(0, 2).map((cat) => tips[cat.key]);
}

export const TEAM_LABELS: Record<Community["team"], string> = {
  NE: "Northeast STRATCOM",
  SE: "Southeast STRATCOM",
  MW: "Midwest STRATCOM",
  W: "West STRATCOM",
  S: "South STRATCOM",
  CAN: "Canaan Team",
};
