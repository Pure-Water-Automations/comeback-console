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

// This is a REGIONAL recognition — no STRATCOM vs non-STRATCOM distinction.
// Size tiers: the region has only one true Extra Large community, so XL +
// (Large) + Medium are grouped into a single "XLM" division alongside Small
// and Family Group.
type SizeGroup = "XLM" | "Small" | "Family Group";
function sizeGroup(size: CommunitySize): SizeGroup {
  if (size === "Extra Large" || size === "Medium") return "XLM";
  if (size === "Small") return "Small";
  return "Family Group";
}
const SIZE_GROUPS: { group: SizeGroup; title: string; emoji: string }[] = [
  { group: "XLM", title: "XLM", emoji: "🐘" },
  { group: "Small", title: "Small", emoji: "🐢" },
  { group: "Family Group", title: "Family Group", emoji: "🐣" },
];

/** Build the full week's award list, in presentation order (build to the finale) */
export function buildWeeklyAwards(communities: Community[] = COMMUNITIES): Award[] {
  const ranked = rankedCommunities(communities);
  const byIdLocal = (id: string) => communities.find((c) => c.id === id) ?? byId(id);
  const awards: Award[] = [];

  // --- Biggest weekly jump (opens the show with momentum) ---
  const movers = communities
    .map((c) => ({ c, d: lastWeekDelta(c) }))
    .filter((x): x is { c: Community; d: number } => x.d !== null && x.d > 0)
    .sort((a, b) => b.d - a.d);
  if (movers.length) {
    awards.push({
      id: "biggest-jump",
      title: "Biggest Weekly Jump",
      subtitle: "Largest Sunday attendance gain in the past week",
      emoji: "🚀",
      tone: "teal",
      winners: [winner(movers[0].c, `${signed(movers[0].d)} this week`, movers[0].c.size)],
      blurb: "Something is moving here — whatever they did last week, do it again.",
    });
  }

  // --- Full House (highest single Sunday) ---
  const fullest = [...communities].sort((a, b) => peakWeek(b) - peakWeek(a))[0];
  if (fullest && peakWeek(fullest) > 0) {
    awards.push({
      id: "full-house",
      title: "Full House",
      subtitle: "Highest single-Sunday worship attendance",
      emoji: "🏠",
      tone: "blue",
      winners: [winner(fullest, `${peakWeek(fullest)} in one service`, fullest.size)],
      blurb: "The room was packed. That is what momentum looks like.",
    });
  }

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
    const top3 = [...communities]
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
        winner(c, `${signed(pts)} pts`, `${["🥇", "🥈", "🥉"][i]} ${c.size}`),
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

  // --- Division champions: XLM / Small / Family Group ---
  for (const { group, title, emoji } of SIZE_GROUPS) {
    const inGroup = ranked.filter((c) => sizeGroup(c.size) === group);
    if (!inGroup.length) continue;
    const champ = inGroup[0];
    awards.push({
      id: `size-${group.toLowerCase().replace(/\s+/g, "-")}`,
      title: `${title} Champion`,
      subtitle: `Best ${title} community by total points`,
      emoji,
      tone: "violet",
      winners: [winner(byIdLocal(champ.id), `${signed(champ.points)} pts`, champ.size)],
      blurb:
        group === "Small" || group === "Family Group"
          ? "Punching above their weight — growth is measured from your own baseline."
          : "Leading the division and setting the pace.",
    });
  }

  // --- David Award: best Small/Family community out-pointing the XLM tier ---
  const small = ranked.filter((c) => sizeGroup(c.size) === "Small" || sizeGroup(c.size) === "Family Group");
  const bestXlmRank = ranked.find((r) => sizeGroup(r.size) === "XLM")?.rank ?? Infinity;
  const davidBeatsXlm = small.find((c) => c.rank < bestXlmRank);
  if (davidBeatsXlm) {
    awards.push({
      id: "david",
      title: "The David Award",
      subtitle: "A small community out-pointing the giants",
      emoji: "🪨",
      tone: "gold",
      winners: [
        winner(
          byIdLocal(davidBeatsXlm.id),
          `#${davidBeatsXlm.rank} overall · ${signed(davidBeatsXlm.points)} pts`,
          davidBeatsXlm.size,
        ),
      ],
      blurb: "Size is not destiny. Baselines are. Well done.",
    });
  }

  // --- Triple Header: beat target in all three lanes at once ---
  const triple = communities.filter(
    (c) => pctOfTarget(c.finance) >= 100 && pctOfTarget(c.activeMembers) >= 100 && pctOfTarget(c.blessing) >= 100,
  );
  if (triple.length) {
    awards.push({
      id: "triple-header",
      title: "Triple-Header Honors",
      subtitle: "Beat target in Income, Members, AND Blessing",
      emoji: "⭐",
      tone: "gold",
      winners: triple.map((c) => winner(c, "All three lanes cleared", c.size)),
      blurb: "The rarest feat in the campaign. Standing ovation.",
    });
  }

  // --- League Champion (the finale) ---
  const champ = ranked[0];
  const runnerUp = ranked[1];
  const third = ranked[2];
  if (champ) {
    awards.push({
      id: "league-champion",
      title: "League Champion",
      subtitle: "Overall #1 — most total points this trimester",
      emoji: "👑",
      tone: "gold",
      winners: [
        winner(byIdLocal(champ.id), `${signed(champ.points)} pts`, "🥇 Region #1"),
        ...(runnerUp ? [winner(byIdLocal(runnerUp.id), `${signed(runnerUp.points)} pts`, "🥈 Runner-up")] : []),
        ...(third ? [winner(byIdLocal(third.id), `${signed(third.points)} pts`, "🥉 Third place")] : []),
      ],
      blurb: "Top of the standings. The score is a mirror of the mission — and the mission is winning.",
    });
  }

  return awards;
}

export interface WeeklyAwardsMeta {
  /** ISO date the report was generated (caller stamps it; Date is unavailable here) */
  trimesterLabel: string;
  communityCount: number;
  awardCount: number;
}

export function weeklyAwardsMeta(awards: Award[], communities: Community[] = COMMUNITIES): WeeklyAwardsMeta {
  return {
    trimesterLabel: "Trimester 2 · May–Aug 2026",
    communityCount: communities.length,
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

function beatTarget(list: Community[], key: "finance" | "activeMembers" | "blessing"): number {
  return list.filter((c) => pctOfTarget(c[key]) >= 100).length;
}

/** Latest recorded Sunday across the region (sum of each community's last week) */
function regionLatestSunday(list: Community[]): number {
  return sum(
    list.map((c) => {
      const weeks = c.weeklyAttendance.filter((w): w is number => w !== null && w > 0);
      return weeks.length ? weeks[weeks.length - 1] : 0;
    }),
  );
}

export function buildRegionOverview(communities: Community[] = COMMUNITIES): OverviewSlide[] {
  // Growth is computed only over communities that have ENTERED data for a lane
  // (result > 0). Several communities haven't logged income/blessing for the
  // partial month yet; counting their zeros as "decline" would slander them and
  // tank the region total. So we aggregate reporters only — true and fairer.
  const laneGrowth = (key: "finance" | "activeMembers" | "blessing") => {
    const reporters = communities.filter((c) => c[key].result > 0);
    const result = sum(reporters.map((c) => c[key].result));
    const baseline = sum(reporters.map((c) => c[key].baseline));
    return { result, growth: baseline ? (result / baseline - 1) * 100 : 0, reporters: reporters.length };
  };
  const income = laneGrowth("finance");
  const members = laneGrowth("activeMembers");
  const blessing = laneGrowth("blessing");

  // Region points = sum of points from reporting communities only (a 0-result
  // lane contributes 0, never a negative), so the headline reflects real work.
  const regionPoints = sum(communities.map((c) => Math.max(0, totalPoints(c))));
  const reporting = income.reporters;

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
        { label: "Communities", value: `${communities.length}`, sub: `${reporting} reporting income`, tone: "blue" },
        { label: "Latest Sunday", value: regionLatestSunday(communities).toLocaleString("en-US"), sub: "in worship region-wide", tone: "teal" },
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
        { label: "Income Target", value: `${beatTarget(communities, "finance")} / ${communities.length}`, sub: "beat income goal", tone: "gold" },
        { label: "Members Target", value: `${beatTarget(communities, "activeMembers")} / ${communities.length}`, sub: "beat membership goal", tone: "teal" },
        { label: "Blessing Target", value: `${beatTarget(communities, "blessing")} / ${communities.length}`, sub: "beat blessing goal", tone: "rose" },
      ],
      blurb: "Now — let's honor the communities who made it happen.",
    },
  ];
}
