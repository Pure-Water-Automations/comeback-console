import { useState, type ComponentType } from "react";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  SignalHigh,
  TrendingDown,
  Trophy,
  Upload,
} from "lucide-react";
import { motion } from "motion/react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ATTENDANCE_2026, NJ_PROFILE, WEEKLY_SUNDAY_2026 } from "@/lib/njData";
import { cn } from "@/lib/utils";
import { EventLogSection } from "./EventLogSection";
import { PhotoRollCall } from "./PhotoRollCall";
import { RollCallSection } from "./RollCallSection";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

type AttendanceSubTabId = "roll-call" | "events" | "photo-check-in" | "trends";

const ATTENDANCE_SUB_TABS = [
  { id: "roll-call", label: "Roll Call", icon: CheckCircle2 },
  { id: "events", label: "Events", icon: CalendarDays },
  { id: "photo-check-in", label: "Photo Check-In", icon: Upload },
  { id: "trends", label: "Trends", icon: SignalHigh },
] satisfies Array<{
  id: AttendanceSubTabId;
  label: string;
  icon: ComponentType<{ className?: string }>;
}>;

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

function monthByName(month: string) {
  const found = ATTENDANCE_2026.find((entry) => entry.month === month);
  if (!found) {
    throw new Error(`Missing attendance month ${month}`);
  }
  return found;
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  delay = 0,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ComponentType<{ className?: string }>;
  delay?: number;
}) {
  return (
    <motion.div
      className="border border-white/10 bg-black/60 p-4 backdrop-blur-md"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">{label}</p>
        <Icon className="size-5 text-cyan-100" />
      </div>
      <p className="font-mono text-3xl font-bold text-white md:text-4xl">{value}</p>
      <p className="mt-3 text-xs uppercase tracking-[0.22em] text-white/45">{detail}</p>
    </motion.div>
  );
}

export function AttendancePanel() {
  const [activeSubTab, setActiveSubTab] = useState<AttendanceSubTabId>("roll-call");
  const jan = monthByName("Jan");
  const feb = monthByName("Feb");
  const may = monthByName("May");
  const weeklyPeak = WEEKLY_SUNDAY_2026.reduce((best, week) =>
    week.count > best.count ? week : best,
  );
  const otherEventDrop = feb.otherEvents - may.otherEvents;
  const weeklyData = WEEKLY_SUNDAY_2026.map((week) => ({
    ...week,
    capacity: NJ_PROFILE.capacity,
  }));

  return (
    <motion.section
      className="relative min-h-[60vh] overflow-hidden border border-white/10 bg-black/60 p-4 backdrop-blur-md md:p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, ease: EASE }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(circle at 50% 20%, rgba(45,212,191,0.17), transparent 35%)",
        }}
      />
      <div className="relative">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-signal">03 · Gatherings</p>
            <h2 className="display mt-2 text-5xl uppercase text-white md:text-7xl">Attendance</h2>
          </div>
          <p className="max-w-xl text-sm uppercase tracking-[0.22em] text-white/45">
            Weekly Sunday service, monthly attendance mix, and other-event signal health.
          </p>
        </div>

        <Tabs
          value={activeSubTab}
          onValueChange={(value) => setActiveSubTab(value as AttendanceSubTabId)}
          className="w-full"
        >
          <TabsList className="grid h-auto w-full grid-cols-1 gap-px rounded-none border border-white/10 bg-black/70 p-0 text-white/50 backdrop-blur-md sm:grid-cols-2 lg:inline-grid lg:w-auto lg:grid-cols-4">
            {ATTENDANCE_SUB_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={cn(
                    "relative h-10 rounded-none border-0 bg-black/45 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/45 shadow-none transition-colors",
                    "after:absolute after:inset-x-2 after:bottom-0 after:h-px after:bg-transparent after:shadow-none",
                    "hover:bg-white/[0.055] hover:text-white",
                    "data-[state=active]:bg-white/[0.08] data-[state=active]:text-white data-[state=active]:shadow-[0_0_18px_rgba(45,212,191,0.16)] data-[state=active]:after:bg-teal-200 data-[state=active]:after:shadow-[0_0_12px_rgba(45,212,191,0.9)]",
                  )}
                >
                  <Icon className="mr-2 size-3.5 shrink-0 text-teal-100/70" />
                  <span>{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="roll-call" className="mt-5">
            <RollCallSection />
          </TabsContent>
          <TabsContent value="events" className="mt-5">
            <EventLogSection />
          </TabsContent>
          <TabsContent value="photo-check-in" className="mt-5">
            <PhotoRollCall />
          </TabsContent>
          <TabsContent value="trends" className="mt-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="May Sunday avg"
                value={formatNumber(may.sundayTotal)}
                detail={`Jan baseline readout ${formatNumber(jan.sundayTotal)}`}
                icon={Activity}
              />
              <StatCard
                label="Peak week"
                value={`${weeklyPeak.week} · ${formatNumber(weeklyPeak.count)}`}
                detail={`Capacity signal ${formatNumber(NJ_PROFILE.capacity)}`}
                icon={Trophy}
                delay={0.06}
              />
              <StatCard
                label="May in person"
                value={formatNumber(may.sundayInPerson)}
                detail={`Online avg ${formatNumber(may.sundayOnline)}`}
                icon={SignalHigh}
                delay={0.12}
              />
              <StatCard
                label="Other-event drop"
                value={`${formatNumber(feb.otherEvents)} -> ${formatNumber(may.otherEvents)}`}
                detail={`${formatNumber(otherEventDrop)} fewer since February`}
                icon={TrendingDown}
                delay={0.18}
              />
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
              <motion.div
                className="border border-white/10 bg-black/60 p-4 backdrop-blur-md"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
              >
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] uppercase tracking-[0.32em] text-white/42">
                    Weekly Sunday service
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-white/42">
                    {WEEKLY_SUNDAY_2026.length} recorded weeks
                  </p>
                </div>
                <div className="h-[390px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={weeklyData}
                      margin={{ top: 24, right: 24, bottom: 8, left: 0 }}
                    >
                      <defs>
                        <linearGradient id="attendanceFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.42} />
                          <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#ffffff14" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="week"
                        interval={1}
                        tick={{ fill: "rgba(255,255,255,0.52)", fontSize: 11 }}
                        tickLine={{ stroke: "#ffffff24" }}
                        axisLine={{ stroke: "#ffffff24" }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: "rgba(255,255,255,0.52)", fontSize: 12 }}
                        tickLine={{ stroke: "#ffffff24" }}
                        axisLine={{ stroke: "#ffffff24" }}
                      />
                      <Tooltip
                        cursor={{ stroke: "#ffffff22" }}
                        contentStyle={{
                          background: "#050509",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 0,
                          color: "#fff",
                        }}
                        labelStyle={{ color: "rgba(255,255,255,0.72)" }}
                        formatter={(value) => [formatNumber(Number(value)), "Attendance"]}
                      />
                      <ReferenceLine
                        y={NJ_PROFILE.capacity}
                        stroke="var(--chart-4)"
                        strokeDasharray="6 6"
                        label={{
                          value: `Capacity ${NJ_PROFILE.capacity}`,
                          position: "insideTopRight",
                          fill: "#fde68a",
                          fontSize: 11,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="transparent"
                        fill="url(#attendanceFill)"
                        fillOpacity={1}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="var(--chart-2)"
                        strokeWidth={3}
                        dot={{ r: 4, strokeWidth: 2, fill: "#0a0a0b", stroke: "var(--chart-2)" }}
                        activeDot={{ r: 7, stroke: "#fff", strokeWidth: 1, fill: "var(--chart-2)" }}
                      />
                      <ReferenceDot
                        x={weeklyPeak.week}
                        y={weeklyPeak.count}
                        r={6}
                        fill="var(--chart-5)"
                        stroke="#fff"
                        label={{
                          value: `${weeklyPeak.week} peak`,
                          position: "top",
                          fill: "#fecdd3",
                          fontSize: 11,
                        }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              <div className="grid gap-5">
                <motion.div
                  className="border border-white/10 bg-black/60 p-4 backdrop-blur-md"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.14, ease: EASE }}
                >
                  <p className="mb-4 text-[11px] uppercase tracking-[0.32em] text-white/42">
                    In-person vs online
                  </p>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={ATTENDANCE_2026}
                        margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
                      >
                        <CartesianGrid stroke="#ffffff14" strokeDasharray="3 3" />
                        <XAxis
                          dataKey="month"
                          tick={{ fill: "rgba(255,255,255,0.52)", fontSize: 11 }}
                          tickLine={{ stroke: "#ffffff24" }}
                          axisLine={{ stroke: "#ffffff24" }}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fill: "rgba(255,255,255,0.52)", fontSize: 11 }}
                          tickLine={{ stroke: "#ffffff24" }}
                          axisLine={{ stroke: "#ffffff24" }}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(255,255,255,0.04)" }}
                          contentStyle={{
                            background: "#050509",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: 0,
                            color: "#fff",
                          }}
                          labelStyle={{ color: "rgba(255,255,255,0.72)" }}
                          formatter={(value, name) => [formatNumber(Number(value)), String(name)]}
                        />
                        <Bar
                          dataKey="sundayInPerson"
                          name="In person"
                          stackId="sunday"
                          fill="var(--chart-2)"
                        />
                        <Bar
                          dataKey="sundayOnline"
                          name="Online"
                          stackId="sunday"
                          fill="var(--chart-1)"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                <motion.div
                  className="border border-white/10 bg-black/60 p-4 backdrop-blur-md"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.18, ease: EASE }}
                >
                  <div className="mb-4 flex items-center gap-3">
                    <CalendarDays className="size-5 text-signal" />
                    <p className="text-[11px] uppercase tracking-[0.32em] text-white/42">
                      Other events
                    </p>
                  </div>
                  <div className="border border-signal/30 bg-signal/10 p-4 shadow-[0_0_18px_rgba(239,68,68,0.16)]">
                    <p className="font-mono text-4xl font-bold text-white">
                      {formatNumber(feb.otherEvents)} → {formatNumber(may.otherEvents)}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-white/68">
                      Other-event attendance dropped sharply since February. That is a clear
                      follow-up and calendar-planning signal.
                    </p>
                  </div>
                  <div className="mt-4 h-[190px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={ATTENDANCE_2026}
                        margin={{ top: 10, right: 12, bottom: 0, left: 0 }}
                      >
                        <CartesianGrid stroke="#ffffff14" strokeDasharray="3 3" />
                        <XAxis
                          dataKey="month"
                          tick={{ fill: "rgba(255,255,255,0.52)", fontSize: 11 }}
                          tickLine={{ stroke: "#ffffff24" }}
                          axisLine={{ stroke: "#ffffff24" }}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fill: "rgba(255,255,255,0.52)", fontSize: 11 }}
                          tickLine={{ stroke: "#ffffff24" }}
                          axisLine={{ stroke: "#ffffff24" }}
                        />
                        <Tooltip
                          cursor={{ stroke: "#ffffff22" }}
                          contentStyle={{
                            background: "#050509",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: 0,
                            color: "#fff",
                          }}
                          labelStyle={{ color: "rgba(255,255,255,0.72)" }}
                          formatter={(value) => [formatNumber(Number(value)), "Other events"]}
                        />
                        <Line
                          type="monotone"
                          dataKey="otherEvents"
                          stroke="var(--chart-5)"
                          strokeWidth={3}
                          dot={{ r: 4, strokeWidth: 2, fill: "#0a0a0b", stroke: "var(--chart-5)" }}
                          activeDot={{
                            r: 7,
                            stroke: "#fff",
                            strokeWidth: 1,
                            fill: "var(--chart-5)",
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              </div>
            </div>

            <motion.div
              className="mt-5 border border-white/10 bg-black/60 p-4 text-sm leading-6 text-white/62 backdrop-blur-md"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.22, ease: EASE }}
            >
              Peak week was {weeklyPeak.week} with {formatNumber(weeklyPeak.count)} total Sunday
              participants. The building capacity is {formatNumber(NJ_PROFILE.capacity)}, so high
              in-person Sundays press near capacity and need room-flow attention even when online
              attendance is part of the total.
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </motion.section>
  );
}
