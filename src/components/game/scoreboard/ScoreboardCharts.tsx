// The three standard scoreboard graphs (graph standards: trend, leaderboard,
// distribution — nothing else, to avoid chart fatigue). recharts with the
// app's chart tokens; dark grid per DESIGN_BRIEF.

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { pctOfTarget, type RankedCommunity } from "@/lib/comebackData";

const GRID = "rgba(255,255,255,0.08)";
const AXIS = { fill: "rgba(255,255,255,0.45)", fontSize: 10 };
const TOOLTIP_STYLE = {
  background: "rgba(0,0,0,0.9)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 0,
  fontSize: 12,
  color: "#fff",
} as const;
// recharts colors each tooltip row by its series/Cell color, so a dark bar fill
// (e.g. --chart-4 for sub-target tiers) renders dark-on-black. Force readable
// text on every tooltip regardless of the underlying mark color.
const TOOLTIP_ITEM_STYLE = { color: "#fff" } as const;
const TOOLTIP_LABEL_STYLE = { color: "rgba(255,255,255,0.6)" } as const;

function Panel({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-white/10 bg-black/60 p-4 backdrop-blur-md">
      <p className="text-xs font-bold uppercase tracking-[0.28em] text-white">{title}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/40">{sub}</p>
      <div className="mt-3 h-56">{children}</div>
    </div>
  );
}

export function ScoreboardCharts({
  standings,
  sourceKey,
  ytd,
}: {
  standings: RankedCommunity[];
  /** Changes when live data replaces the snapshot — remounts the charts so
   *  ResponsiveContainer re-measures after layout has settled (its initial
   *  measurement can race the grid and stick at a tiny width). */
  sourceKey: string;
  /** Region-wide avg Sunday attendance per month, YTD. Empty → weekly fallback. */
  ytd: { label: string; attendance: number }[];
}) {
  // Prefer the YTD monthly trend (needs ≥2 months); otherwise the current
  // month's weekly line below, which is all the snapshot fallback can offer.
  const useYtd = ytd.length >= 2;
  // TREND — region-wide Sunday attendance per week of the month. Weeks that
  // only a handful of communities have reported yet are dropped: summing them
  // makes the region line nosedive and reads as collapse, not missing data.
  const trend = useMemo(() => {
    const weekCount = Math.max(...standings.map((c) => c.weeklyAttendance.length), 0);
    const weeks = Array.from({ length: weekCount }, (_, w) => {
      const reported = standings.filter((c) => (c.weeklyAttendance[w] ?? 0) > 0);
      return {
        week: `Wk ${w + 1}`,
        region: reported.reduce((sum, c) => sum + (c.weeklyAttendance[w] ?? 0), 0),
        reporters: reported.length,
      };
    });
    const maxReporters = Math.max(...weeks.map((w) => w.reporters), 1);
    return weeks.filter((w) => w.reporters >= Math.max(3, Math.ceil(maxReporters / 2)));
  }, [standings]);

  // LEADERBOARD — top 10 by total points
  const leaderboard = useMemo(
    () =>
      [...standings]
        .sort((a, b) => b.points - a.points)
        .slice(0, 10)
        .map((c) => ({ name: c.shortName, points: c.points })),
    [standings],
  );

  // DISTRIBUTION — average % of target per size tier (across the three FAB
  // lanes). Percent reads upward and fair across divisions, where raw points
  // mid-campaign are often all negative and render as a wall of sad bars.
  const distribution = useMemo(() => {
    const tiers = ["Extra Large", "Medium", "Small", "Family Group"] as const;
    const communityPct = (c: RankedCommunity) =>
      (pctOfTarget(c.finance) + pctOfTarget(c.activeMembers) + pctOfTarget(c.blessing)) / 3;
    return tiers.map((size) => {
      const group = standings.filter((c) => c.size === size);
      const avg = group.length
        ? Math.round(group.reduce((s, c) => s + communityPct(c), 0) / group.length)
        : 0;
      return { size: size === "Family Group" ? "Family Grp" : size, avg, n: group.length };
    });
  }, [standings]);

  return (
    <section key={sourceKey} className="grid gap-4 lg:grid-cols-3">
      <Panel
        title="Attendance Trend"
        sub={
          useYtd
            ? "Region-wide Sunday worship, monthly YTD"
            : "Region-wide Sunday worship, this month"
        }
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={useYtd ? ytd : trend}
            margin={{ top: 8, right: 8, bottom: 0, left: -18 }}
          >
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis
              dataKey={useYtd ? "label" : "week"}
              tick={AXIS}
              tickLine={false}
              axisLine={false}
            />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
              cursor={{ stroke: GRID }}
            />
            <Line
              isAnimationActive={false}
              type="monotone"
              dataKey={useYtd ? "attendance" : "region"}
              stroke="var(--chart-2)"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Panel>
      <Panel title="Points Leaderboard" sub="Top 10 communities by total points">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={leaderboard}
            layout="vertical"
            margin={{ top: 0, right: 8, bottom: 0, left: 10 }}
          >
            <CartesianGrid stroke={GRID} horizontal={false} />
            <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              width={82}
              interval={0}
              tick={AXIS}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
            />
            <Bar isAnimationActive={false} dataKey="points" maxBarSize={14}>
              {leaderboard.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={entry.points > 0 ? "var(--chart-1)" : "rgba(255,255,255,0.22)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>
      <Panel title="Target Progress by Division" sub="Average % of trimester target per size tier">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={distribution} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="size" tick={AXIS} tickLine={false} axisLine={false} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              formatter={(v: number) => [`${v}% of target`, "Average"]}
            />
            <Bar isAnimationActive={false} dataKey="avg" maxBarSize={40}>
              {distribution.map((entry) => (
                <Cell
                  key={entry.size}
                  fill={entry.avg >= 100 ? "var(--chart-2)" : "var(--chart-4)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>
    </section>
  );
}
