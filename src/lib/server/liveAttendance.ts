// Server-only: region-wide YTD Sunday-attendance trend. Each calendar month is
// its own tab on the scoreboard sheet, so we read this year's month tabs (Jan →
// current) and sum every community's monthly Sunday-Service average into one
// region point per month. Import ONLY from server fn handlers (never client).

import { SCOREBOARD_SHEET_ID } from "@/lib/server/liveCommunities";

const VALID_SIZES = new Set(["Extra Large", "Medium", "Small", "Family Group"]);
const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];
const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const num = (v: string | undefined): number => {
  if (!v) return 0;
  const n = Number(v.replace(/[$,%\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/** "Jun 2026" / "June 2026" → { month: 5, year: 2026 }; null if not a month tab. */
function parseMonthTab(title: string): { month: number; year: number } | null {
  const m = title.trim().match(/^([A-Za-z]{3,9})\s+(\d{4})$/);
  if (!m) return null;
  const key = m[1].toLowerCase();
  const idx = MONTHS.findIndex((name) => name === key || name.slice(0, 3) === key.slice(0, 3));
  return idx < 0 ? null : { month: idx, year: Number(m[2]) };
}

export interface AttendancePoint {
  label: string;
  attendance: number;
  reporters: number;
}

/**
 * Region-wide average weekly Sunday attendance, one point per month, Jan →
 * current month of this year. Empty array on any failure (caller falls back to
 * the current-month weekly view).
 */
export async function loadAttendanceYtd(): Promise<AttendancePoint[]> {
  const { listTabs, batchGetValues } = await import("@/lib/server/sheets");
  const today = new Date();
  const year = today.getFullYear();

  // One tab per month; dedupe if both "Jan 2026" and "January 2026" exist.
  const byMonth = new Map<number, string>();
  for (const title of await listTabs(SCOREBOARD_SHEET_ID)) {
    const p = parseMonthTab(title);
    if (p && p.year === year && p.month <= today.getMonth() && !byMonth.has(p.month)) {
      byMonth.set(p.month, title);
    }
  }
  const months = [...byMonth.entries()].sort((a, b) => a[0] - b[0]);
  if (!months.length) return [];

  const grids = await batchGetValues(
    SCOREBOARD_SHEET_ID,
    months.map(([, title]) => `${title}!A4:BN40`),
  );

  const points: AttendancePoint[] = [];
  months.forEach(([month], i) => {
    let attendance = 0;
    let reporters = 0;
    for (const row of grids[i] || []) {
      if (!VALID_SIZES.has((row[2] ?? "").toString().trim())) continue;
      const avg = num(row[12]); // Sunday Service monthly average
      if (avg > 0) {
        attendance += avg;
        reporters += 1;
      }
    }
    if (reporters > 0) points.push({ label: SHORT[month], attendance, reporters });
  });

  // Drop sparsely-reported months (e.g. the current month mid-update) so the
  // line reflects the region, not just who has logged so far.
  const maxReporters = Math.max(...points.map((p) => p.reporters), 1);
  return points.filter((p) => p.reporters >= Math.max(3, Math.ceil(maxReporters / 2)));
}
