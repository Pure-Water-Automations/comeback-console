import type { ComponentType } from "react";
import { Coins, Landmark, TrendingUp, Wallet } from "lucide-react";
import { motion } from "motion/react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  FINANCE_2025_AVG,
  FINANCE_2026,
  FINANCE_COMPLETE_THROUGH,
  ytdFinance,
} from "@/lib/njData";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatUsd(value: number) {
  return USD.format(value);
}

function formatCompactUsd(value: number | string) {
  return `$${(Number(value) / 1000).toFixed(1)}k`;
}

function completeFinanceMonths() {
  const completeThroughIndex = FINANCE_2026.findIndex(
    (month) => month.month === FINANCE_COMPLETE_THROUGH,
  );
  return FINANCE_2026.filter((_, index) => index <= completeThroughIndex);
}

function chartMonths() {
  const completeThroughIndex = FINANCE_2026.findIndex(
    (month) => month.month === FINANCE_COMPLETE_THROUGH,
  );
  return FINANCE_2026.map((month, index) => ({
    ...month,
    monthLabel: index > completeThroughIndex ? `${month.month}*` : month.month,
    inProgress: index > completeThroughIndex,
  }));
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  className,
  delay = 0,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ComponentType<{ className?: string }>;
  className?: string;
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
        <Icon className={cn("size-5", className)} />
      </div>
      <p className="font-mono text-2xl font-bold text-white md:text-3xl">{value}</p>
      <p className="mt-3 text-xs uppercase tracking-[0.22em] text-white/45">{detail}</p>
    </motion.div>
  );
}

function BreakdownBar({
  label,
  value,
  total,
  className,
}: {
  label: string;
  value: number;
  total: number;
  className: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[10px] uppercase tracking-[0.28em] text-white/42">{label}</span>
        <span className="font-mono text-sm text-white/70">
          {formatUsd(value)} / {pct.toFixed(1)}%
        </span>
      </div>
      <div className="h-3 border border-white/10 bg-white/[0.03]">
        <div className={cn("h-full", className)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function FinancePanel() {
  const completeMonths = completeFinanceMonths();
  const ytd = ytdFinance();
  const bestMonth = completeMonths.reduce((best, month) =>
    month.totalIncome > best.totalIncome ? month : best,
  );
  const donationIncome = completeMonths.reduce((sum, month) => sum + month.donationIncome, 0);
  const otherIncome = completeMonths.reduce((sum, month) => sum + month.otherIncome, 0);
  const totalIncome = donationIncome + otherIncome;
  const data = chartMonths();

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
          background:
            "radial-gradient(circle at 50% 20%, rgba(250,204,21,0.16), transparent 35%)",
        }}
      />
      <div className="relative">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-signal">02 · Treasury</p>
            <h2 className="display mt-2 text-5xl uppercase text-white md:text-7xl">
              Finance
            </h2>
          </div>
          <p className="max-w-xl text-sm uppercase tracking-[0.22em] text-white/45">
            Books complete through {FINANCE_COMPLETE_THROUGH}. Asterisked months are still in
            progress.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="YTD income"
            value={formatUsd(ytd.income)}
            detail={`${ytd.months} complete months`}
            icon={Wallet}
            className="text-emerald-100"
          />
          <StatCard
            label="YTD expense"
            value={formatUsd(ytd.expense)}
            detail="Operating spend"
            icon={Landmark}
            className="text-cyan-100"
            delay={0.06}
          />
          <StatCard
            label="YTD net"
            value={formatUsd(ytd.net)}
            detail="Income less expense"
            icon={TrendingUp}
            className="text-amber-100"
            delay={0.12}
          />
          <StatCard
            label="Best month"
            value={`${bestMonth.month} ${formatCompactUsd(bestMonth.totalIncome)}`}
            detail="Highest total income"
            icon={Coins}
            className="text-signal"
            delay={0.18}
          />
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <motion.div
            className="border border-white/10 bg-black/60 p-4 backdrop-blur-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
          >
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] uppercase tracking-[0.32em] text-white/42">
                Income / expense / net
              </p>
              <p className="text-[10px] uppercase tracking-[0.28em] text-white/42">
                2025 avg income reference: {formatUsd(FINANCE_2025_AVG.totalIncome)}
              </p>
            </div>
            <div className="h-[390px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 24, right: 24, bottom: 8, left: 0 }}>
                  <CartesianGrid stroke="#ffffff14" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="monthLabel"
                    tick={{ fill: "rgba(255,255,255,0.52)", fontSize: 12 }}
                    tickLine={{ stroke: "#ffffff24" }}
                    axisLine={{ stroke: "#ffffff24" }}
                  />
                  <YAxis
                    tickFormatter={formatCompactUsd}
                    tick={{ fill: "rgba(255,255,255,0.52)", fontSize: 12 }}
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
                    formatter={(value, name) => [formatUsd(Number(value)), String(name)]}
                  />
                  <Legend
                    wrapperStyle={{
                      color: "rgba(255,255,255,0.58)",
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.2em",
                    }}
                  />
                  <ReferenceLine
                    y={FINANCE_2025_AVG.totalIncome}
                    stroke="var(--chart-4)"
                    strokeDasharray="6 6"
                    label={{
                      value: "2025 avg income",
                      position: "insideTopRight",
                      fill: "#fde68a",
                      fontSize: 11,
                    }}
                  />
                  <Bar dataKey="totalIncome" name="Income" fill="var(--chart-2)">
                    {data.map((month) => (
                      <Cell
                        key={`income-${month.month}`}
                        fill={month.inProgress ? "rgba(45,212,191,0.35)" : "var(--chart-2)"}
                      />
                    ))}
                  </Bar>
                  <Bar dataKey="totalExpense" name="Expense" fill="var(--chart-5)">
                    {data.map((month) => (
                      <Cell
                        key={`expense-${month.month}`}
                        fill={month.inProgress ? "rgba(244,63,94,0.34)" : "var(--chart-5)"}
                      />
                    ))}
                  </Bar>
                  <Line
                    type="monotone"
                    dataKey="net"
                    name="Net"
                    stroke="var(--chart-4)"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: "#0a0a0b", stroke: "var(--chart-4)" }}
                    activeDot={{ r: 7, stroke: "#fff", strokeWidth: 1, fill: "var(--chart-4)" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            className="border border-white/10 bg-black/60 p-5 backdrop-blur-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16, ease: EASE }}
          >
            <p className="text-[11px] uppercase tracking-[0.32em] text-white/42">
              Donation vs other income
            </p>
            <p className="mt-3 font-mono text-4xl font-bold text-white">{formatUsd(totalIncome)}</p>
            <div className="mt-6 space-y-5">
              <BreakdownBar
                label="Donation income"
                value={donationIncome}
                total={totalIncome}
                className="bg-emerald-200 shadow-[0_0_14px_rgba(110,231,183,0.4)]"
              />
              <BreakdownBar
                label="Other income"
                value={otherIncome}
                total={totalIncome}
                className="bg-cyan-200 shadow-[0_0_14px_rgba(125,211,252,0.34)]"
              />
            </div>
            <div className="mt-8 border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[10px] uppercase tracking-[0.28em] text-white/42">
                In-progress note
              </p>
              <p className="mt-3 text-sm leading-6 text-white/62">
                The chart includes partial June entries, but YTD cards and breakdowns use completed
                books through {FINANCE_COMPLETE_THROUGH}.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}
