// The three standard scoreboard graphs (graph standards: trend, leaderboard,
// distribution — nothing else, to avoid chart fatigue). recharts with the
// app's chart tokens; dark grid per DESIGN_BRIEF.

import { useMemo } from "react";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import type { RankedCommunity } from "@/lib/comebackData";

const GRID = "rgba(255,255,255,0.08)";
const AXIS = { fill: "rgba(255,255,255,0.45)", fontSize: 10 };
const TOOLTIP_STYLE = {
  background: "rgba(0,0,0,0.9)", border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 0, fontSize: 12, color: "#fff",
} as const;

function Panel({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="border border-white/10 bg-black/60 p-4 backdrop-blur-md">
      <p className="text-xs font-bold uppercase tracking-[0.28em] text-white">{title}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/40">{sub}</p>
      <div className="mt-3 h-56">{children}</div>
    </div>
  );
}

export function ScoreboardCharts({ standings }: { standings: RankedCommunity[] }) {
  // TREND — region-wide Sunday attendance per week of the month
  const trend = useMemo(() => {
    const weekCount = Math.max(...standings.map((c) => c.weeklyAttendance.length), 0);
    return Array.from({ length: weekCount }, (_, w) => ({
      week: `Wk ${w + 1}`,
      region: standings.reduce((sum, c) => sum + (c.weeklyAttendance[w] ?? 0), 0),
    })).filter((row) => row.region > 0);
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

  // DISTRIBUTION — average points per size tier
  const distribution = useMemo(() => {
    const tiers = ["Extra Large", "Medium", "Small", "Family Group"] as const;
    return tiers.map((size) => {
      const group = standings.filter((c) => c.size === size);
      const avg = group.length ? Math.round(group.reduce((s, c) => s + c.points, 0) / group.length) : 0;
      return { size: size === "Family Group" ? "Family Grp" : size, avg, n: group.length };
    });
  }, [standings]);

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <Panel title="Attendance Trend" sub="Region-wide Sunday worship, this month">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="week" tick={AXIS} tickLine={false} axisLine={false} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: GRID }} />
            <Line type="monotone" dataKey="region" stroke="var(--chart-2)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </Panel>
      <Panel title="Points Leaderboard" sub="Top 10 communities by total points">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={leaderboard} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 10 }}>
            <CartesianGrid stroke={GRID} horizontal={false} />
            <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" width={82} tick={AXIS} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="points" fill="var(--chart-1)" maxBarSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>
      <Panel title="Points by Division" sub="Average total points per size tier">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={distribution} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="size" tick={AXIS} tickLine={false} axisLine={false} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="avg" fill="var(--chart-4)" maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>
    </section>
  );
}
