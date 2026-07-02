// Live regional scoreboard → Awards Night.
//
// Reads the real "2026 Northeast Region Scoreboard" Google Sheet, parses the
// current month's tab into the same Community[] shape the awards engine uses,
// then builds the awards + region overview from LIVE data. The Awards Night
// route calls this on mount and swaps the live results in over the static
// snapshot (which stays as an instant fallback if the sheet read fails).
//
// Column map verified against the June 2026 tab (0-indexed):
//   1 Reg · 2 Size · 3 Name
//   Finance:        4 baseline · 5 target · 7 T2 result (cumulative)
//   Sunday Service: 10 baseline · 11 target · 12 month avg · 14-18 weekly
//   Active Members: 32 baseline · 33 target · 34 current
//   Blessing:       37 baseline · 38 target · 39 current
// Points on the sheet = growth% over baseline × 10, which matches the awards
// engine's categoryPoints, so the standings line up with the official board.

import { createServerFn } from "@tanstack/react-start";
import {
  COMMUNITIES,
  type Community,
  type CommunitySize,
} from "@/lib/comebackData";
import {
  buildRegionOverview,
  buildWeeklyAwards,
  weeklyAwardsMeta,
  type Award,
  type OverviewSlide,
  type WeeklyAwardsMeta,
} from "@/lib/weeklyAwards";

const SCOREBOARD_SHEET_ID = "1B2n0xjDppwGGJyvZH2zP_il-CsdctNA4xozEMuYJTT4";
// Latest first — the parser uses the first tab that yields real community rows.
export const MONTH_TABS = ["June 2026", "May 2026", "April 2026", "March 2026", "Feb 2026", "Jan 2026"];
const VALID_SIZES = new Set<CommunitySize>(["Extra Large", "Medium", "Small", "Family Group"]);

const num = (v: string | undefined): number => {
  if (!v) return 0;
  const cleaned = v.replace(/[$,%\s]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};
const cell = (row: string[], i: number) => (row[i] ?? "").toString().trim();

// Match a sheet row to the static community (for stable id, shortName, mascot).
const STATIC_BY_NAME = new Map(COMMUNITIES.map((c) => [c.name.toLowerCase(), c]));
const MASCOT_CYCLE: Community["mascot"][] = ["adventurer", "mentor", "npc", "smart_guy", "spirit", "wizard"];

function toCommunity(row: string[], index: number): Community | null {
  const size = cell(row, 2) as CommunitySize;
  const name = cell(row, 3);
  if (!name || !VALID_SIZES.has(size)) return null;

  const fin = { baseline: num(row[4]), target: num(row[5]), result: num(row[7]) };
  const mem = { baseline: num(row[32]), target: num(row[33]), result: num(row[34]) };
  const ble = { baseline: num(row[37]), target: num(row[38]), result: num(row[39]) };
  const ss = { baseline: num(row[10]), target: num(row[11]), result: num(row[12]) };

  // Weekly Sunday Service results live in cols 14-18; keep numeric weeks only.
  const weekly: (number | null)[] = [];
  for (let i = 14; i <= 18; i++) {
    const raw = cell(row, i);
    if (!raw || /no service/i.test(raw)) {
      weekly.push(null);
      continue;
    }
    const n = num(raw);
    weekly.push(n > 0 ? n : null);
  }

  const matched = STATIC_BY_NAME.get(name.toLowerCase());
  const id = matched?.id ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const shortName = matched?.shortName ?? name.replace(/\s*Family (Church|Group)$/i, "").trim();
  const mascot = matched?.mascot ?? MASCOT_CYCLE[index % MASCOT_CYCLE.length];
  const team = (cell(row, 1) || "NE") as Community["team"];

  return {
    id,
    name,
    shortName,
    team,
    size,
    mascot,
    finance: fin,
    activeMembers: mem,
    blessing: ble,
    sundayService: ss,
    weeklyAttendance: weekly,
    lesGoals: [],
  };
}

export interface LiveCommunitiesResult {
  communities: Community[];
  month: string | null;
  source: "live" | "snapshot";
  message?: string;
}

/**
 * Parse the freshest month tab (optionally trying preferTab first) into
 * Community[]; falls back to the static snapshot on any failure.
 */
export async function loadLiveCommunities(preferTab?: string): Promise<LiveCommunitiesResult> {
  try {
    const { getValues } = await import("@/lib/server/sheets");
    const tabs = preferTab ? [preferTab, ...MONTH_TABS.filter((t) => t !== preferTab)] : MONTH_TABS;
    for (const tab of tabs) {
      let rows: string[][] = [];
      try {
        rows = await getValues(SCOREBOARD_SHEET_ID, `${tab}!A4:BN40`);
      } catch {
        continue;
      }
      const communities = rows.map((r, i) => toCommunity(r, i)).filter((c): c is Community => c !== null);
      if (communities.length >= 5) return { communities, month: tab, source: "live" };
    }
    return {
      communities: COMMUNITIES, month: null, source: "snapshot",
      message: "Live scoreboard returned no community rows; showing the snapshot.",
    };
  } catch (err) {
    return {
      communities: COMMUNITIES, month: null, source: "snapshot",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

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
    const live = await loadLiveCommunities();
    const awards = buildWeeklyAwards(live.communities);
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
