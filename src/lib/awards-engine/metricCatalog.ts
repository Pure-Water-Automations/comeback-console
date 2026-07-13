// Metric catalog — the governed list of numbers an award may rank on.
// Metric MATH lives here in code (typed + tested); award DEFINITIONS live in
// SQLite and reference metrics by id. sourceDescription/updateCadence feed the
// provenance popovers ("how is this calculated?") on the scoreboard and admin.

import {
  categoryPoints,
  pctOfTarget,
  totalPoints,
  type Community,
} from "@/lib/comebackData";

export type MetricId =
  | "total_points"
  | "finance_points"
  | "member_points"
  | "blessing_points"
  | "income_result"
  | "active_members"
  | "blessing_result"
  | "sunday_avg"
  | "sunday_peak"
  | "weekly_jump"
  | "finance_pct_target"
  | "members_pct_target"
  | "blessing_pct_target";

export interface MetricDef {
  id: MetricId;
  label: string;
  format: "currency" | "count" | "percent" | "points" | "delta";
  higherIsBetter: boolean;
  /** Governance: where the number comes from — shown in provenance popovers */
  sourceDescription: string;
  /** Governance: how often the underlying source updates */
  updateCadence: string;
  /** null = this community has no data for the metric yet */
  compute: (c: Community) => number | null;
}

const reportedWeeks = (c: Community) =>
  c.weeklyAttendance.filter((w): w is number => w !== null && w > 0);

const POINTS_RULE =
  "Campaign rule: growth % over baseline × 10 (e.g. +19.2% growth = +192 points).";
const SHEET = "Read live from the 2026 Northeast Region Scoreboard sheet";
const WEEKLY = "Weekly — pastors log results on the regional scoreboard";
const MONTHLY = "Monthly — cumulative for the current scoreboard month tab";

export const METRICS: MetricDef[] = [
  { id: "total_points", label: "Total Points", format: "points", higherIsBetter: true,
    sourceDescription: `${POINTS_RULE} Summed across Income, Active Members and Blessing. ${SHEET}.`,
    updateCadence: WEEKLY, compute: (c) => totalPoints(c) },
  { id: "finance_points", label: "Income Points", format: "points", higherIsBetter: true,
    sourceDescription: `${POINTS_RULE} Income lane only. ${SHEET}.`,
    updateCadence: WEEKLY, compute: (c) => categoryPoints(c.finance) },
  { id: "member_points", label: "Member Points", format: "points", higherIsBetter: true,
    sourceDescription: `${POINTS_RULE} Active-members lane only. ${SHEET}.`,
    updateCadence: WEEKLY, compute: (c) => categoryPoints(c.activeMembers) },
  { id: "blessing_points", label: "Blessing Points", format: "points", higherIsBetter: true,
    sourceDescription: `${POINTS_RULE} Blessing lane only. ${SHEET}.`,
    updateCadence: WEEKLY, compute: (c) => categoryPoints(c.blessing) },
  { id: "income_result", label: "Income (USD)", format: "currency", higherIsBetter: true,
    sourceDescription: `Cumulative trimester income entered on the scoreboard. ${SHEET}.`,
    updateCadence: MONTHLY, compute: (c) => ((c.finance.result ?? 0) > 0 ? c.finance.result : null) },
  { id: "active_members", label: "Active Members", format: "count", higherIsBetter: true,
    sourceDescription: `People with 3+ attendances in the last 3 months. ${SHEET}.`,
    updateCadence: MONTHLY, compute: (c) => ((c.activeMembers.result ?? 0) > 0 ? c.activeMembers.result : null) },
  { id: "blessing_result", label: "Blessing Steps", format: "count", higherIsBetter: true,
    sourceDescription: `Total Blessing Journey process steps logged. ${SHEET}.`,
    updateCadence: MONTHLY, compute: (c) => ((c.blessing.result ?? 0) > 0 ? c.blessing.result : null) },
  { id: "sunday_avg", label: "Avg Sunday Attendance", format: "count", higherIsBetter: true,
    sourceDescription: `Average of this month's reported Sunday services (weeks with no service excluded). ${SHEET}.`,
    updateCadence: WEEKLY,
    compute: (c) => {
      const w = reportedWeeks(c);
      return w.length ? Math.round(w.reduce((a, b) => a + b, 0) / w.length) : null;
    } },
  { id: "sunday_peak", label: "Peak Sunday", format: "count", higherIsBetter: true,
    sourceDescription: `Highest single-Sunday attendance this month. ${SHEET}.`,
    updateCadence: WEEKLY,
    compute: (c) => {
      const w = reportedWeeks(c);
      return w.length ? Math.max(...w) : null;
    } },
  { id: "weekly_jump", label: "Weekly Attendance Jump", format: "delta", higherIsBetter: true,
    sourceDescription: `Change between the two most recent reported Sundays. ${SHEET}.`,
    updateCadence: WEEKLY,
    compute: (c) => {
      const w = reportedWeeks(c);
      return w.length < 2 ? null : w[w.length - 1] - w[w.length - 2];
    } },
  { id: "finance_pct_target", label: "% of Income Target", format: "percent", higherIsBetter: true,
    sourceDescription: `Income result ÷ trimester target (baseline +10%). ${SHEET}.`,
    updateCadence: MONTHLY, compute: (c) => ((c.finance.result ?? 0) > 0 ? pctOfTarget(c.finance) : null) },
  { id: "members_pct_target", label: "% of Members Target", format: "percent", higherIsBetter: true,
    sourceDescription: `Active members ÷ trimester target (baseline +20%). ${SHEET}.`,
    updateCadence: MONTHLY, compute: (c) => ((c.activeMembers.result ?? 0) > 0 ? pctOfTarget(c.activeMembers) : null) },
  { id: "blessing_pct_target", label: "% of Blessing Target", format: "percent", higherIsBetter: true,
    sourceDescription: `Blessing steps ÷ trimester target (baseline +30%). ${SHEET}.`,
    updateCadence: MONTHLY, compute: (c) => ((c.blessing.result ?? 0) > 0 ? pctOfTarget(c.blessing) : null) },
];

export const METRIC_BY_ID = Object.fromEntries(METRICS.map((m) => [m.id, m])) as Record<
  MetricId,
  MetricDef
>;

export function formatMetricValue(def: MetricDef, value: number): string {
  switch (def.format) {
    case "currency":
      return `$${Math.round(value).toLocaleString("en-US")}`;
    case "percent":
      return `${value.toFixed(1)}%`;
    case "points":
      return `${value > 0 ? "+" : ""}${Math.round(value)} pts`;
    case "delta":
      return `${value > 0 ? "+" : ""}${Math.round(value)}`;
    default:
      return Math.round(value).toLocaleString("en-US");
  }
}
