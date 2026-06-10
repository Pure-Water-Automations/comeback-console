// Weekly Awards — a fun recognition layer for the Wednesday Northeast meeting.
// Computes "award show" categories from the real regional scoreboard snapshot
// (src/lib/comebackData.ts). POC: a future version would read live weekly
// deltas; here we derive last-week movement from the weeklyAttendance arrays.

import {
  COMMUNITIES,
  TEAM_LABELS,
  categoryPoints,
  pctOfTarget,
  rankedCommunities,
  totalPoints,
  type Community,
  type CommunitySize,
  type RankedCommunity,
} from "@/lib/comebackData";

export interface AwardWinner {
  community: string;
  mascot: Community["mascot"];
  /** The headline stat for this award, pre-formatted */
  stat: string;
  /** Optional secondary line (team, size, context) */
  detail?: string;
}

export type AwardTone = "gold" | "teal" | "violet" | "rose" | "blue";

export interface Award {
  id: string;
  /** Short ceremonial name announced on the slide */
  title: string;
  /** One-line description of what it honors */
  subtitle: string;
  /** Emoji used as the trophy glyph */
  emoji: string;
  tone: AwardTone;
  /** The winner (or winners, for podium-style awards) */
  winners: AwardWinner[];
  /** Optional MC-style blurb shown under the winner */
  blurb?: string;
}

const byId = (id: string) => COMMUNITIES.find((c) => c.id === id)!;
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** Last week-over-week change in Sunday attendance (ignores null/no-service) */
function lastWeekDelta(c: Community): number | null {
  const weeks = c.weeklyAttendance.filter((w): w is number => w !== null && w > 0);
  if (weeks.length < 2) return null;
  return weeks[weeks.length - 1] - weeks[weeks.length - 2];
}

/** Peak single Sunday this month */
function peakWeek(c: Community): number {
  const weeks = c.weeklyAttendance.filter((w): w is number => w !== null);
  return weeks.length ? Math.max(...weeks) : 0;
}

function winner(c: Community, stat: string, detail?: string): AwardWinner {
  return { community: c.shortName, mascot: c.mascot, stat, detail };
}

const SIZE_ORDER: CommunitySize[] = ["Extra Large", "Medium", "Small", "Family Group"];

/** Build the full week's award list, in presentation order (build to the finale) */
export function buildWeeklyAwards(): Award[] {
  const ranked = rankedCommunities();
  const awards: Award[] = [];

  // --- Biggest weekly jump (opens the show with momentum) ---
  const movers = COMMUNITIES.map((c) => ({ c, d: lastWeekDelta(c) }))
    .filter((x): x is { c: Community; d: number } => x.d !== null && x.d > 0)
    .sort((a, b) => b.d - a.d);
  if (movers.length) {
    awards.push({
      id: "biggest-jump",
      title: "Biggest Weekly Jump",
      subtitle: "Largest Sunday attendance gain in the past week",
      emoji: "🚀",
      tone: "teal",
      winners: [winner(movers[0].c, `${signed(movers[0].d)} this week`, TEAM_LABELS[movers[0].c.team])],
      blurb: "Something is moving here — whatever they did last week, do it again.",
    });
  }

  // --- Full House (highest single Sunday) ---
  const fullest = [...COMMUNITIES].sort((a, b) => peakWeek(b) - peakWeek(a))[0];
  awards.push({
    id: "full-house",
    title: "Full House",
    subtitle: "Highest single-Sunday worship attendance",
    emoji: "🏠",
    tone: "blue",
    winners: [winner(fullest, `${peakWeek(fullest)} in one service`, fullest.size)],
    blurb: "The room was packed. That is what momentum looks like.",
  });

  // --- Category podiums: Income, Members, Blessing ---
  const categoryAward = (
    id: string,
    title: string,
    subtitle: string,
    emoji: string,
    tone: AwardTone,
    key: "finance" | "activeMembers" | "blessing",
    blurb: string,
  ): Award => {
    const top3 = [...COMMUNITIES]
      .map((c) => ({ c, pts: categoryPoints(c[key]) }))
      .sort((a, b) => b.pts - a.pts)
      .slice(0, 3);
    return {
      id,
      title,
      subtitle,
      emoji,
      tone,
      winners: top3.map(({ c, pts }, i) =>
        winner(c, `${signed(pts)} pts`, `${["🥇", "🥈", "🥉"][i]} ${TEAM_LABELS[c.team]}`),
      ),
      blurb,
    };
  };

  awards.push(
    categoryAward(
      "treasury",
      "Treasury Titans",
      "Top 3 in income growth this trimester",
      "💰",
      "gold",
      "finance",
      "Generosity is leadership. These communities grew their giving the most.",
    ),
  );
  awards.push(
    categoryAward(
      "gatherers",
      "Gatherers of People",
      "Top 3 in active membership growth",
      "🧑‍🤝‍🧑",
      "teal",
      "activeMembers",
      "Real people, actually participating. The heart of the whole game.",
    ),
  );
  awards.push(
    categoryAward(
      "blessing",
      "Blessing Pipeline",
      "Top 3 moving people through the Blessing journey",
      "💞",
      "rose",
      "blessing",
      "Step by step — credit for the movement, not just the ceremony.",
    ),
  );

  // --- Size-class champions (every size has a chance to shine) ---
  for (const size of SIZE_ORDER) {
    const inSize = ranked.filter((c) => c.size === size);
    if (!inSize.length) continue;
    const champ = inSize[0];
    awards.push({
      id: `size-${size.toLowerCase().replace(/\s+/g, "-")}`,
      title: `${size} Champion`,
      subtitle: `Best ${size.toLowerCase()} community by total points`,
      emoji: size === "Extra Large" ? "🐘" : size === "Medium" ? "🦌" : size === "Small" ? "🐢" : "🐣",
      tone: "violet",
      winners: [winner(byId(champ.id), `${signed(champ.points)} pts`, TEAM_LABELS[champ.team])],
      blurb:
        size === "Small" || size === "Family Group"
          ? "Punching above their weight — growth is measured from your own baseline."
          : "Leading their division and setting the pace.",
    });
  }

  // --- David Award: best Small/Family community beating bigger ones ---
  const small = ranked.filter((c) => c.size === "Small" || c.size === "Family Group");
  const davidBeatsMediumPlus = small.find(
    (c) => c.rank < (ranked.find((r) => r.size === "Medium")?.rank ?? Infinity),
  );
  if (davidBeatsMediumPlus) {
    awards.push({
      id: "david",
      title: "The David Award",
      subtitle: "A small community out-pointing the giants",
      emoji: "🪨",
      tone: "gold",
      winners: [
        winner(
          byId(davidBeatsMediumPlus.id),
          `#${davidBeatsMediumPlus.rank} overall · ${signed(davidBeatsMediumPlus.points)} pts`,
          `${davidBeatsMediumPlus.size} · ${TEAM_LABELS[davidBeatsMediumPlus.team]}`,
        ),
      ],
      blurb: "Size is not destiny. Baselines are. Well done.",
    });
  }

  // --- STRATCOM Cup (team with the most aggregate points) ---
  const teamTotals = new Map<Community["team"], number>();
  for (const c of COMMUNITIES) {
    teamTotals.set(c.team, (teamTotals.get(c.team) || 0) + totalPoints(c));
  }
  const topTeam = [...teamTotals.entries()].sort((a, b) => b[1] - a[1])[0];
  awards.push({
    id: "stratcom-cup",
    title: "STRATCOM Cup",
    subtitle: "Challenge team with the most combined points",
    emoji: "🏆",
    tone: "violet",
    winners: [
      {
        community: TEAM_LABELS[topTeam[0]],
        mascot: "mentor",
        stat: `${signed(topTeam[1])} combined pts`,
        detail: `${COMMUNITIES.filter((c) => c.team === topTeam[0]).length} communities`,
      },
    ],
    blurb: "Cross-regional teamwork carries the region. This is the team to beat.",
  });

  // --- Triple Header: beat target in all three lanes at once ---
  const triple = COMMUNITIES.filter(
    (c) => pctOfTarget(c.finance) >= 100 && pctOfTarget(c.activeMembers) >= 100 && pctOfTarget(c.blessing) >= 100,
  );
  if (triple.length) {
    awards.push({
      id: "triple-header",
      title: "Triple-Header Honors",
      subtitle: "Beat target in Income, Members, AND Blessing",
      emoji: "⭐",
      tone: "gold",
      winners: triple.map((c) => winner(c, "All three lanes cleared", TEAM_LABELS[c.team])),
      blurb: "The rarest feat in the campaign. Standing ovation.",
    });
  }

  // --- League Champion (the finale) ---
  const champ = ranked[0];
  const runnerUp = ranked[1];
  const third = ranked[2];
  awards.push({
    id: "league-champion",
    title: "League Champion",
    subtitle: "Overall #1 — most total points this trimester",
    emoji: "👑",
    tone: "gold",
    winners: [
      winner(byId(champ.id), `${signed(champ.points)} pts`, `🥇 ${TEAM_LABELS[champ.team]}`),
      winner(byId(runnerUp.id), `${signed(runnerUp.points)} pts`, "🥈 Runner-up"),
      winner(byId(third.id), `${signed(third.points)} pts`, "🥉 Third place"),
    ],
    blurb: "Top of the standings. The score is a mirror of the mission — and the mission is winning.",
  });

  return awards;
}

export interface WeeklyAwardsMeta {
  /** ISO date the report was generated (caller stamps it; Date is unavailable here) */
  trimesterLabel: string;
  communityCount: number;
  awardCount: number;
}

export function weeklyAwardsMeta(awards: Award[]): WeeklyAwardsMeta {
  return {
    trimesterLabel: "Trimester 2 · May–Aug 2026",
    communityCount: COMMUNITIES.length,
    awardCount: awards.length,
  };
}

export type { RankedCommunity };

// ---------------------------------------------------------------------------
// Region overview — "how did we do as a region" stat slides that OPEN the show
// before individual community awards. All aggregates from the live snapshot.
// ---------------------------------------------------------------------------

export interface OverviewStat {
  label: string;
  value: string;
  sub?: string;
  /** highlight tone for the value */
  tone?: AwardTone;
}

export interface OverviewSlide {
  id: string;
  kicker: string;
  title: string;
  subtitle: string;
  stats: OverviewStat[];
  blurb?: string;
}

function sum(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}

function beatTarget(key: "finance" | "activeMembers" | "blessing"): number {
  return COMMUNITIES.filter((c) => pctOfTarget(c[key]) >= 100).length;
}

/** Latest recorded Sunday across the region (sum of each community's last week) */
function regionLatestSunday(): number {
  return sum(
    COMMUNITIES.map((c) => {
      const weeks = c.weeklyAttendance.filter((w): w is number => w !== null && w > 0);
      return weeks.length ? weeks[weeks.length - 1] : 0;
    }),
  );
}

export function buildRegionOverview(): OverviewSlide[] {
  // Growth is computed only over communities that have ENTERED data for a lane
  // (result > 0). Several communities haven't logged income/blessing for the
  // partial month yet; counting their zeros as "decline" would slander them and
  // tank the region total. So we aggregate reporters only — true and fairer.
  const laneGrowth = (key: "finance" | "activeMembers" | "blessing") => {
    const reporters = COMMUNITIES.filter((c) => c[key].result > 0);
    const result = sum(reporters.map((c) => c[key].result));
    const baseline = sum(reporters.map((c) => c[key].baseline));
    return { result, growth: baseline ? (result / baseline - 1) * 100 : 0, reporters: reporters.length };
  };
  const income = laneGrowth("finance");
  const members = laneGrowth("activeMembers");
  const blessing = laneGrowth("blessing");

  // Region points = sum of points from reporting communities only (a 0-result
  // lane contributes 0, never a negative), so the headline reflects real work.
  const regionPoints = sum(COMMUNITIES.map((c) => Math.max(0, totalPoints(c))));
  const reporting = income.reporters;
  const teamCount = new Set(COMMUNITIES.map((c) => c.team)).size;

  const incomeResult = income.result;
  const incomeGrowth = income.growth;
  const memberResult = members.result;
  const memberGrowth = members.growth;
  const blessingResult = blessing.result;
  const blessingGrowth = blessing.growth;

  const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

  return [
    {
      id: "region-headline",
      kicker: "State of the Region",
      title: "How We Did Together",
      subtitle: "The Northeast at a glance this trimester",
      stats: [
        { label: "Region Points", value: `${regionPoints >= 0 ? "+" : ""}${regionPoints.toLocaleString("en-US")}`, sub: "combined growth points", tone: "gold" },
        { label: "Communities", value: `${COMMUNITIES.length}`, sub: `${reporting} reporting income`, tone: "blue" },
        { label: "Challenge Teams", value: `${teamCount}`, sub: "STRATCOMs in play", tone: "violet" },
        { label: "Latest Sunday", value: regionLatestSunday().toLocaleString("en-US"), sub: "in worship region-wide", tone: "teal" },
      ],
      blurb: "Before we celebrate communities, here is the whole field — this is us, together.",
    },
    {
      id: "region-growth",
      kicker: "Growth vs Baseline",
      title: "The Three Lanes",
      subtitle: "Where the region grew against its own starting line",
      stats: [
        { label: "Income", value: pct(incomeGrowth), sub: `${usd(incomeResult)} this period`, tone: "gold" },
        { label: "Active Members", value: pct(memberGrowth), sub: `${memberResult.toLocaleString("en-US")} active region-wide`, tone: "teal" },
        { label: "Blessing Journey", value: pct(blessingGrowth), sub: `${blessingResult.toLocaleString("en-US")} steps logged`, tone: "rose" },
      ],
      blurb: "Growth is measured from your own baseline — every community started somewhere.",
    },
    {
      id: "region-targets",
      kicker: "Hitting the Mark",
      title: "Who Cleared Target",
      subtitle: "Communities at or above their trimester target",
      stats: [
        { label: "Income Target", value: `${beatTarget("finance")} / ${COMMUNITIES.length}`, sub: "beat income goal", tone: "gold" },
        { label: "Members Target", value: `${beatTarget("activeMembers")} / ${COMMUNITIES.length}`, sub: "beat membership goal", tone: "teal" },
        { label: "Blessing Target", value: `${beatTarget("blessing")} / ${COMMUNITIES.length}`, sub: "beat blessing goal", tone: "rose" },
      ],
      blurb: "Now — let's honor the communities who made it happen.",
    },
  ];
}
