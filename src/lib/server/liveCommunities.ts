// Live regional scoreboard parser — server-only (reads Google Sheets via the
// OAuth credential). Import ONLY inside server fn handlers; TanStack's
// import-protection denies **/server/** modules from client-reachable code.
//
// Column map verified against the June 2026 tab (0-indexed):
//   1 Reg · 2 Size · 3 Name
//   Finance:        4 baseline · 5 target · 7 T2 result (cumulative)
//   Sunday Service: 10 baseline · 11 target · 12 month avg · 14-18 weekly
//   Active Members: 32 baseline · 33 target · 34 current
//   Blessing:       37 baseline · 38 target · 39 current

import type { CommunityBoard, LesGoal } from "@/lib/boardTypes";
import {
  COMMUNITIES,
  type Community,
  type CommunitySize,
} from "@/lib/comebackData";

export const SCOREBOARD_SHEET_ID = "1B2n0xjDppwGGJyvZH2zP_il-CsdctNA4xozEMuYJTT4";
// Known legacy tab names (the sheet is inconsistent — "Feb 2026", not
// "February 2026"), kept as fallbacks behind the date-derived candidates.
export const MONTH_TABS = ["June 2026", "May 2026", "April 2026", "March 2026", "Feb 2026", "Jan 2026"];

/**
 * Candidate tabs, freshest first: the current month and the 11 before it
 * (derived from today's date so new sheet tabs are picked up automatically),
 * then any legacy names not already covered.
 */
function candidateTabs(): string[] {
  const tabs: string[] = [];
  const today = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    tabs.push(`${d.toLocaleString("en-US", { month: "long" })} ${d.getFullYear()}`);
  }
  for (const t of MONTH_TABS) if (!tabs.includes(t)) tabs.push(t);
  return tabs;
}
const VALID_SIZES = new Set<CommunitySize>(["Extra Large", "Medium", "Small", "Family Group"]);

const num = (v: string | undefined): number => {
  if (!v) return 0;
  const cleaned = v.replace(/[$,%\s]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};
const cell = (row: string[], i: number) => (row[i] ?? "").toString().trim();

/** Like num() but empty / "--" / junk stays null (board view shows a dash). */
const numOrNull = (row: string[], i: number): number | null => {
  const raw = cell(row, i);
  if (!raw || raw === "--") return null;
  const n = Number(raw.replace(/[$,%\s]/g, ""));
  return Number.isFinite(n) ? n : null;
};

// Match a sheet row to the static community (for stable id, shortName, mascot).
const STATIC_BY_NAME = new Map(COMMUNITIES.map((c) => [c.name.toLowerCase(), c]));
const MASCOT_CYCLE: Community["mascot"][] = ["adventurer", "mentor", "npc", "smart_guy", "spirit", "wizard"];

function toCommunity(row: string[], index: number): Community | null {
  const size = cell(row, 2) as CommunitySize;
  const name = cell(row, 3);
  if (!name || !VALID_SIZES.has(size)) return null;

  // result uses numOrNull: a blank cell means "not reported yet" (e.g. income
  // typically posts ~mid-month for the prior month), distinct from a real 0.
  const fin = { baseline: num(row[4]), target: num(row[5]), result: numOrNull(row, 7) };
  const mem = { baseline: num(row[32]), target: num(row[33]), result: numOrNull(row, 34) };
  const ble = { baseline: num(row[37]), target: num(row[38]), result: numOrNull(row, 39) };
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

/** Weekly result cells → (number|null)[] (null = no service / not reported) */
function weeklyCells(row: string[], from: number, to: number): (number | null)[] {
  const weeks: (number | null)[] = [];
  for (let i = from; i <= to; i++) {
    const raw = cell(row, i);
    if (!raw || raw === "--" || /no service/i.test(raw)) {
      weeks.push(null);
      continue;
    }
    const n = num(raw);
    weeks.push(n > 0 ? n : null);
  }
  return weeks;
}

// LES goal blocks: Leadership 42-50, Environmental 51-59, Special 60-65.
// Placeholder cells ("[Post goal description here]", "00-00-00") are skipped.
const LES_BLOCKS: { category: LesGoal["category"]; start: number; goals: number }[] = [
  { category: "leadership", start: 42, goals: 3 },
  { category: "environment", start: 51, goals: 3 },
  { category: "special", start: 60, goals: 2 },
];

function lesDate(row: string[], i: number): string | undefined {
  const raw = cell(row, i);
  if (!raw || raw.startsWith("[") || raw === "00-00-00") return undefined;
  return raw;
}

function parseLesGoals(row: string[]): LesGoal[] {
  const goals: LesGoal[] = [];
  for (const block of LES_BLOCKS) {
    for (let g = 0; g < block.goals; g++) {
      const base = block.start + g * 3;
      const title = cell(row, base);
      if (!title || title.startsWith("[")) continue;
      goals.push({
        category: block.category,
        title,
        targetDate: lesDate(row, base + 1),
        completedDate: lesDate(row, base + 2),
      });
    }
  }
  return goals;
}

/** Everything on the community's scoreboard row, using the sheet's own cells. */
function toBoard(row: string[], communityId: string): CommunityBoard {
  return {
    communityId,
    finance: {
      baseline: numOrNull(row, 4), target: numOrNull(row, 5),
      monthResult: numOrNull(row, 6), t2Result: numOrNull(row, 7),
      growthPct: numOrNull(row, 8), points: numOrNull(row, 9),
    },
    activeMembers: {
      baseline: numOrNull(row, 32), target: numOrNull(row, 33),
      monthResult: numOrNull(row, 34), t2Result: numOrNull(row, 34),
      growthPct: numOrNull(row, 35), points: numOrNull(row, 36),
    },
    blessing: {
      baseline: numOrNull(row, 37), target: numOrNull(row, 38),
      monthResult: numOrNull(row, 39), t2Result: numOrNull(row, 39),
      growthPct: numOrNull(row, 40), points: numOrNull(row, 41),
    },
    sunday: {
      baseline: numOrNull(row, 10), target: numOrNull(row, 11),
      monthAvg: numOrNull(row, 12), pctGrowth: numOrNull(row, 13),
      weeks: weeklyCells(row, 14, 18),
    },
    otherEvents: {
      baseline: numOrNull(row, 19), target: numOrNull(row, 20),
      monthAvg: numOrNull(row, 21), pctGrowth: numOrNull(row, 22),
      weeks: weeklyCells(row, 23, 27),
    },
    newMembers: {
      target: numOrNull(row, 28), monthResult: numOrNull(row, 29),
      t2Result: numOrNull(row, 30), pctGrowth: numOrNull(row, 31),
    },
    lesGoals: parseLesGoals(row),
  };
}

export interface LiveCommunitiesResult {
  communities: Community[];
  /** Full board rows keyed by community id — empty on snapshot fallback */
  boards: Record<string, CommunityBoard>;
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
    const candidates = candidateTabs();
    const tabs = preferTab ? [preferTab, ...candidates.filter((t) => t !== preferTab)] : candidates;
    for (const tab of tabs) {
      let rows: string[][] = [];
      try {
        rows = await getValues(SCOREBOARD_SHEET_ID, `${tab}!A4:BN40`);
      } catch {
        continue;
      }
      const parsed = rows.flatMap((r, i) => {
        const c = toCommunity(r, i);
        return c ? [{ community: c, board: toBoard(r, c.id) }] : [];
      });
      if (parsed.length >= 5) {
        return {
          communities: parsed.map((p) => p.community),
          boards: Object.fromEntries(parsed.map((p) => [p.board.communityId, p.board])),
          month: tab,
          source: "live",
        };
      }
    }
    return {
      communities: COMMUNITIES, boards: {}, month: null, source: "snapshot",
      message: "Live scoreboard returned no community rows; showing the snapshot.",
    };
  } catch (err) {
    return {
      communities: COMMUNITIES, boards: {}, month: null, source: "snapshot",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
