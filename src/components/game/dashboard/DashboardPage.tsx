import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  Coins,
  Crown,
  Heart,
  LockKeyhole,
  MessageSquareQuote,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  COMMUNITIES,
  TEAM_LABELS,
  TRIMESTER,
  categoryPoints,
  coachingTips,
  communityBadges,
  communityLevel,
  pctOfTarget,
  totalPoints,
  type CategoryScore,
  type Community,
} from "@/lib/comebackData";
import { cn } from "@/lib/utils";
import { getCommunityAttendance } from "@/lib/scoreboardApi";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { dashboardSpriteFor, isLeaderArt, mentorCoachSprite } from "./sprites";
import { AwardWinsStrip } from "./AwardWinsStrip";
import { ClaimCommunityChip } from "./ClaimCommunityChip";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

type DashboardPageProps = {
  selectedCommunityId: string;
  onCommunityChange: (communityId: string) => void;
};

type CategoryAccent = "cyan" | "teal" | "violet";

type CategoryMetric = {
  key: "finance" | "activeMembers" | "blessing";
  label: string;
  shortLabel: string;
  stat: CategoryScore;
  icon: LucideIcon;
  accent: CategoryAccent;
  format: (value: number) => string;
};

type Star = {
  id: number;
  left: string;
  top: string;
  size: number;
  opacity: number;
};

const BADGE_ICONS: Record<string, LucideIcon> = {
  "triple-header": Crown,
  treasury: Coins,
  gatherer: Users,
  matchmaker: Heart,
  "quest-complete": CheckCircle2,
  "faithful-scribe": ShieldCheck,
};

const ACCENTS: Record<
  CategoryAccent,
  {
    text: string;
    border: string;
    fill: string;
    glow: string;
    radial: string;
  }
> = {
  cyan: {
    text: "text-cyan-100",
    border: "border-cyan-200/30",
    fill: "bg-cyan-200",
    glow: "shadow-[0_0_18px_rgba(45,212,191,0.18)]",
    radial: "rgba(45,212,191,0.16)",
  },
  teal: {
    text: "text-teal-100",
    border: "border-teal-200/30",
    fill: "bg-teal-200",
    glow: "shadow-[0_0_18px_rgba(20,184,166,0.18)]",
    radial: "rgba(20,184,166,0.15)",
  },
  violet: {
    text: "text-violet-100",
    border: "border-violet-200/30",
    fill: "bg-violet-200",
    glow: "shadow-[0_0_18px_rgba(168,85,247,0.18)]",
    radial: "rgba(168,85,247,0.16)",
  },
};

function makeStars(count: number, offset = 0): Star[] {
  return Array.from({ length: count }, (_, index) => {
    const id = index + offset;
    return {
      id,
      left: `${(id * 37) % 101}%`,
      top: `${(id * 53) % 103}%`,
      size: 1 + (id % 3),
      opacity: 0.16 + (id % 7) * 0.075,
    };
  });
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatWhole(value: number) {
  return Math.round(value).toLocaleString("en-US");
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function formatPoints(value: number) {
  const rounded = Math.round(value);
  if (rounded === 0) return "0";
  const absolute = Math.abs(rounded).toLocaleString("en-US");
  return rounded > 0 ? `+${absolute}` : `-${absolute}`;
}

function formatDate(iso: string, includeYear = false) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(includeYear ? { year: "numeric" } : {}),
  }).format(new Date(`${iso}T12:00:00`));
}

function pointTone(value: number) {
  if (value > 0) return "text-amber-100";
  if (value < 0) return "text-red-200/80";
  return "text-white/45";
}

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.68, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function CosmicBackdrop() {
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 24,
    mass: 0.4,
  });
  const farY = useTransform(smoothProgress, [0, 1], ["0px", "-120px"]);
  const midY = useTransform(smoothProgress, [0, 1], ["0px", "-220px"]);
  const nearY = useTransform(smoothProgress, [0, 1], ["0px", "-320px"]);

  const farStars = useMemo(() => makeStars(48), []);
  const midStars = useMemo(() => makeStars(42, 100), []);
  const nearStars = useMemo(() => makeStars(28, 200), []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#0a0a0b]">
      <div
        className="absolute inset-0 opacity-85"
        style={{
          background:
            "radial-gradient(circle at 50% 20%, rgba(79,127,255,0.2), transparent 35%), radial-gradient(circle at 13% 46%, rgba(45,212,191,0.13), transparent 30%), radial-gradient(circle at 82% 72%, rgba(234,179,8,0.1), transparent 34%), radial-gradient(circle at 42% 92%, rgba(168,85,247,0.12), transparent 34%)",
        }}
      />
      <motion.div className="absolute inset-0" style={{ y: farY }}>
        {farStars.map((star) => (
          <span
            key={star.id}
            className={cn("absolute bg-white", star.id % 2 === 0 && "animate-twinkle")}
            style={{
              left: star.left,
              top: star.top,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
              animationDelay: `${(star.id * 0.13) % 4}s`,
            }}
          />
        ))}
      </motion.div>
      <motion.div className="absolute inset-0" style={{ y: midY }}>
        {midStars.map((star) => (
          <span
            key={star.id}
            className={cn("absolute bg-cyan-100", star.id % 3 === 0 && "animate-twinkle")}
            style={{
              left: star.left,
              top: star.top,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
              animationDelay: `${(star.id * 0.19) % 5}s`,
            }}
          />
        ))}
      </motion.div>
      <motion.div className="absolute inset-0" style={{ y: nearY }}>
        {nearStars.map((star) => (
          <span
            key={star.id}
            className={cn("absolute bg-amber-100", star.id % 4 === 0 && "animate-twinkle")}
            style={{
              left: star.left,
              top: star.top,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
              animationDelay: `${(star.id * 0.23) % 6}s`,
            }}
          />
        ))}
      </motion.div>
      <span className="animate-shooting-star absolute left-[88%] top-[12%] h-[1px] w-[120px] bg-gradient-to-r from-white via-white/50 to-transparent" />
      <span className="animate-shooting-star absolute left-[62%] top-[38%] h-[1px] w-[90px] bg-gradient-to-r from-cyan-100 via-white/45 to-transparent [animation-delay:4.2s]" />
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#0a0a0b] to-transparent" />
    </div>
  );
}

function SectionShell({
  index,
  kicker,
  title,
  glow,
  children,
}: {
  index: string;
  kicker: string;
  title: string;
  glow: string;
  children: ReactNode;
}) {
  return (
    <motion.section
      className="relative z-10 overflow-hidden px-5 py-12 md:px-12 lg:px-16"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.14 }}
      transition={{ duration: 0.72, ease: EASE }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 20%, ${glow}, transparent 35%)`,
        }}
      />
      <div className="relative mx-auto w-full max-w-7xl">
        <div className="mb-7 flex flex-col gap-2">
          <p className="text-sm uppercase tracking-[0.4em] text-signal">
            {index} - {kicker}
          </p>
          <h2 className="display max-w-5xl text-5xl uppercase text-white md:text-7xl lg:text-8xl">
            {title}
          </h2>
        </div>
        {children}
      </div>
    </motion.section>
  );
}

function CommunityPicker({
  selectedCommunityId,
  onCommunityChange,
}: {
  selectedCommunityId: string;
  onCommunityChange: (communityId: string) => void;
}) {
  return (
    <Select value={selectedCommunityId} onValueChange={onCommunityChange}>
      <SelectTrigger className="h-12 rounded-none border-white/15 bg-black/70 px-4 text-left text-xs uppercase tracking-[0.22em] text-white shadow-[0_0_18px_rgba(45,212,191,0.08)] backdrop-blur-md focus:ring-cyan-200/30">
        <SelectValue placeholder="Choose community" />
      </SelectTrigger>
      <SelectContent className="rounded-none border-white/15 bg-[#050509]/95 text-white shadow-[0_0_28px_rgba(45,212,191,0.14)] backdrop-blur-xl">
        <SelectGroup>
          <SelectLabel className="px-3 py-2 text-[11px] uppercase tracking-[0.3em] text-white/45">
            Communities
          </SelectLabel>
          {COMMUNITIES.map((community) => (
            <SelectItem
              key={community.id}
              textValue={community.shortName}
              value={community.id}
              className="rounded-none py-2 pl-3 pr-9 text-white/80 focus:bg-cyan-300/10 focus:text-cyan-50"
            >
              <span className="text-sm font-bold uppercase tracking-[0.12em]">
                {community.shortName} / {community.team}
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function LevelBar({ points }: { points: number }) {
  const level = communityLevel(points);
  const progressPct = level.level >= 10 ? 100 : Math.round(level.progress * 100);

  return (
    <div className="border border-white/10 bg-black/60 p-4 backdrop-blur-md">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.32em] text-white/40">RPG level</p>
          <p className="mt-1 font-mono text-4xl font-bold text-amber-100">LV {level.level}</p>
        </div>
        <div className="text-right">
          <p className={cn("font-mono text-3xl font-bold", pointTone(points))}>
            {formatPoints(points)}
          </p>
          <p className="text-[11px] uppercase tracking-[0.26em] text-white/35">total points</p>
        </div>
      </div>
      <div className="relative h-5 border border-white/10 bg-white/[0.04]">
        <motion.div
          className="h-full bg-cyan-200 shadow-[0_0_18px_rgba(45,212,191,0.42)]"
          initial={{ width: 0 }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.9, ease: EASE }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0,transparent_82%,rgba(255,255,255,0.18)_82%,rgba(255,255,255,0.18)_84%,transparent_84%)] bg-[length:18px_100%]" />
      </div>
    </div>
  );
}

function DashboardHeader({
  community,
  selectedCommunityId,
  onCommunityChange,
}: DashboardPageProps & { community: Community }) {
  const points = totalPoints(community);
  const mascot = dashboardSpriteFor(community);
  const mascotIsLeader = isLeaderArt(community);
  const trimesterRange = `${formatDate(TRIMESTER.start)} - ${formatDate(TRIMESTER.end, true)}`;

  return (
    <section className="relative z-10 overflow-hidden px-5 pb-12 pt-20 md:px-12 lg:px-16">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 20%, rgba(79,127,255,0.22), transparent 36%), radial-gradient(circle at 78% 34%, rgba(45,212,191,0.16), transparent 32%)",
        }}
      />
      <div className="relative mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)] lg:items-center">
        <div>
          <motion.p
            className="mb-5 text-sm uppercase tracking-[0.4em] text-signal"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            Pastor's command center / Operation COMEBACK
          </motion.p>
          <h1 className="display max-w-5xl text-6xl uppercase text-white md:text-8xl lg:text-9xl">
            {community.name}
          </h1>
          <motion.div
            className="mt-7 flex flex-wrap gap-3"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: EASE }}
          >
            <span className="border border-white/10 bg-black/60 px-4 py-2 text-xs font-bold uppercase tracking-[0.26em] text-white/70 backdrop-blur-md">
              {community.size}
            </span>
            <span className="border border-cyan-200/25 bg-cyan-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.26em] text-cyan-100 backdrop-blur-md">
              {community.team} / {TEAM_LABELS[community.team]}
            </span>
            <span className="border border-amber-200/25 bg-amber-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.26em] text-amber-100 backdrop-blur-md">
              {TRIMESTER.label} / {trimesterRange}
            </span>
          </motion.div>
          <Reveal className="mt-8 max-w-3xl" delay={0.18}>
            <LevelBar points={points} />
          </Reveal>
        </div>
        <motion.aside
          className="border border-white/10 bg-black/60 p-5 shadow-[0_0_34px_rgba(45,212,191,0.13)] backdrop-blur-md"
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.72, delay: 0.45, ease: EASE }}
        >
          <div className="mb-5">
            <p className="mb-2 text-[11px] uppercase tracking-[0.32em] text-white/40">
              Community channel
            </p>
            <CommunityPicker
              selectedCommunityId={selectedCommunityId}
              onCommunityChange={onCommunityChange}
            />
          </div>
          <motion.img
            src={mascot}
            alt={mascotIsLeader ? `${community.shortName} leader` : `${community.shortName} mascot`}
            className={cn(
              "mx-auto h-56 w-56 object-contain drop-shadow-2xl md:h-72 md:w-72",
              !mascotIsLeader && "[image-rendering:pixelated]",
            )}
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 0.9, repeat: Infinity }}
          />
          <div className="mt-3 grid grid-cols-3 border border-white/10 bg-white/[0.03]">
            <StatCell label="Income" value={formatPoints(categoryPoints(community.finance))} />
            <StatCell
              label="Members"
              value={formatPoints(categoryPoints(community.activeMembers))}
            />
            <StatCell label="Blessing" value={formatPoints(categoryPoints(community.blessing))} />
          </div>
        </motion.aside>
      </div>
    </section>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-white/10 p-3 text-center first:border-l-0 [&+&]:border-l">
      <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">{label}</p>
      <p className="mt-1 font-mono text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function CategoryGaugeCard({ metric, index }: { metric: CategoryMetric; index: number }) {
  const pct = pctOfTarget(metric.stat);
  const points = categoryPoints(metric.stat);
  const accent = ACCENTS[metric.accent];
  const Icon = metric.icon;
  const baseWidth = Math.min(100, Math.max(0, pct));
  const overshootWidth = Math.min(100, Math.max(0, pct - 100));

  return (
    <motion.article
      className={cn(
        "relative overflow-hidden border bg-black/60 p-5 backdrop-blur-md",
        accent.border,
        pct >= 100 && accent.glow,
      )}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.62, delay: index * 0.08, ease: EASE }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-75"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${accent.radial}, transparent 44%)`,
        }}
      />
      <div className="relative">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-white/40">
              {metric.shortLabel}
            </p>
            <h3 className="mt-2 text-3xl font-bold uppercase text-white">{metric.label}</h3>
          </div>
          <span className={cn("border border-white/10 bg-white/[0.04] p-3", accent.text)}>
            <Icon className="size-6" />
          </span>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-3 text-center">
          <ValueBlock label="Baseline" value={metric.format(metric.stat.baseline)} />
          <span className="font-mono text-xl text-white/24">-&gt;</span>
          <ValueBlock label="Target" value={metric.format(metric.stat.target)} />
          <span className="font-mono text-xl text-white/24">-&gt;</span>
          <ValueBlock
            label="Current"
            value={metric.stat.result !== null ? metric.format(metric.stat.result) : "Pending"}
            strong
          />
        </div>
        <div className="mt-7">
          <div className="mb-2 flex items-end justify-between gap-4">
            <p className="text-xs uppercase tracking-[0.26em] text-white/40">
              {formatPercent(pct)} of target
            </p>
            <p className={cn("font-mono text-3xl font-bold", pointTone(points))}>
              {formatPoints(points)}
            </p>
          </div>
          <div className="relative h-5 border border-white/10 bg-white/[0.04]">
            <motion.div
              className={cn("h-full", pct > 0 ? accent.fill : "bg-white/15")}
              initial={{ width: 0 }}
              whileInView={{ width: `${baseWidth}%` }}
              viewport={{ once: true, amount: 0.45 }}
              transition={{ duration: 0.78, ease: EASE }}
            />
            {pct > 100 ? (
              <motion.div
                className="absolute inset-y-0 right-0 bg-amber-200 shadow-[0_0_18px_rgba(234,179,8,0.55)]"
                initial={{ width: 0 }}
                whileInView={{ width: `${overshootWidth}%` }}
                viewport={{ once: true, amount: 0.45 }}
                transition={{ duration: 0.78, delay: 0.16, ease: EASE }}
              />
            ) : null}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function ValueBlock({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <span className="min-w-0">
      <span className="block text-[10px] uppercase tracking-[0.24em] text-white/35">{label}</span>
      <span
        className={cn(
          "mt-2 block truncate font-mono text-lg font-bold text-white/68",
          strong && "text-amber-100",
        )}
      >
        {value}
      </span>
    </span>
  );
}

function CategoryGauges({ community }: { community: Community }) {
  const metrics: CategoryMetric[] = [
    {
      key: "finance",
      label: "Income",
      shortLabel: "INC",
      stat: community.finance,
      icon: Coins,
      accent: "cyan",
      format: formatUsd,
    },
    {
      key: "activeMembers",
      label: "Active Members",
      shortLabel: "MEM",
      stat: community.activeMembers,
      icon: Users,
      accent: "teal",
      format: formatWhole,
    },
    {
      key: "blessing",
      label: "Blessing Journey",
      shortLabel: "BLS",
      stat: community.blessing,
      icon: Heart,
      accent: "violet",
      format: formatWhole,
    },
  ];

  return (
    <SectionShell
      index="01"
      kicker="Core gauges"
      title="Three scoring lanes"
      glow="rgba(45,212,191,0.16)"
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {metrics.map((metric, index) => (
          <CategoryGaugeCard index={index} key={metric.key} metric={metric} />
        ))}
      </div>
    </SectionShell>
  );
}

type AttendanceRange = "month" | "T1" | "T2" | "year";

const ATTENDANCE_RANGES: { key: AttendanceRange; label: string }[] = [
  { key: "month", label: "This Month" },
  { key: "T1", label: "T1" },
  { key: "T2", label: "T2" },
  { key: "year", label: "Year" },
];

// Trimester month spans (0-based): T1 Jan–Apr, T2 May–Aug, T3 Sep–Dec.
const RANGE_MONTHS: Record<Exclude<AttendanceRange, "month">, number[]> = {
  T1: [0, 1, 2, 3],
  T2: [4, 5, 6, 7],
  year: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

function AttendanceChart({ community }: { community: Community }) {
  const [range, setRange] = useState<AttendanceRange>("month");
  const isMonthly = range !== "month";

  // Per-community monthly history is read from the live sheet only once the user
  // asks for a trimester/year view — the default "This Month" needs no fetch.
  const monthlyQuery = useQuery({
    queryKey: ["community-attendance"],
    queryFn: () => getCommunityAttendance(),
    staleTime: 30 * 60_000,
    enabled: isMonthly,
  });
  const monthlySeries = monthlyQuery.data?.byCommunity?.[community.id] ?? [];

  const weeklyData =
    community.weeklyAttendance.length > 0
      ? community.weeklyAttendance.map((attendance, index) => ({
          label: `W${index + 1}`,
          attendance,
        }))
      : [{ label: "W1", attendance: null as number | null }];

  const monthlyData = isMonthly
    ? monthlySeries
        .filter((p) => RANGE_MONTHS[range].includes(p.month))
        .map((p) => ({ label: p.label, attendance: p.attendance as number | null }))
    : [];

  const data = isMonthly ? monthlyData : weeklyData;
  const loadingMonthly = isMonthly && monthlyQuery.isLoading;
  const emptyMonthly = isMonthly && !monthlyQuery.isLoading && monthlyData.length === 0;

  const target = community.sundayService.target;
  const values = data.map((point) => point.attendance ?? 0);
  const maxValue = Math.max(
    target,
    community.sundayService.baseline,
    community.sundayService.result ?? 0,
    ...values,
    0,
  );

  return (
    <SectionShell
      index="02"
      kicker="Sunday service"
      title="Attendance signal"
      glow="rgba(79,127,255,0.18)"
    >
      <div className="mb-4 flex w-fit items-center gap-px border border-white/10">
        {ATTENDANCE_RANGES.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => setRange(o.key)}
            className={cn(
              "px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.24em] transition-colors",
              range === o.key
                ? "bg-white/15 text-white"
                : "bg-black/40 text-white/50 hover:text-white",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Reveal className="border border-white/10 bg-black/60 p-4 backdrop-blur-md">
          <div className="h-[360px] w-full">
            {loadingMonthly || emptyMonthly ? (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/45">
                {loadingMonthly
                  ? "Loading attendance history…"
                  : "No attendance history for this range yet."}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 24, right: 28, bottom: 8, left: 0 }}>
                  <CartesianGrid stroke="#ffffff14" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
                    tickLine={{ stroke: "#ffffff24" }}
                    axisLine={{ stroke: "#ffffff24" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    domain={[0, Math.ceil(maxValue * 1.18 + 4)]}
                    tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
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
                    itemStyle={{ color: "#bae6fd" }}
                    formatter={(value) => [
                      value === null ? "No service recorded" : value,
                      "Attendance",
                    ]}
                  />
                  <ReferenceLine
                    y={target}
                    stroke="#facc15"
                    strokeDasharray="5 5"
                    label={{
                      value: `Target ${formatWhole(target)}`,
                      position: "insideTopRight",
                      fill: "#fde68a",
                      fontSize: 11,
                    }}
                  />
                  {!isMonthly &&
                    weeklyData
                      .filter((point) => point.attendance === null)
                      .map((point) => (
                        <ReferenceDot
                          key={point.label}
                          x={point.label}
                          y={0}
                          r={6}
                          fill="rgba(255,255,255,0.12)"
                          stroke="rgba(255,255,255,0.22)"
                          label={{
                            value: "no service recorded",
                            position: "top",
                            fill: "rgba(255,255,255,0.42)",
                            fontSize: 10,
                          }}
                        />
                      ))}
                  <Line
                    type="monotone"
                    dataKey="attendance"
                    connectNulls={false}
                    stroke="var(--chart-2)"
                    strokeWidth={3}
                    dot={{ r: 5, strokeWidth: 2, fill: "#0a0a0b", stroke: "var(--chart-2)" }}
                    activeDot={{ r: 7, stroke: "#fff", strokeWidth: 1, fill: "var(--chart-2)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Reveal>
        <Reveal className="border border-white/10 bg-black/60 p-5 backdrop-blur-md" delay={0.12}>
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.32em] text-white/40">Current avg</p>
              <p className="mt-2 font-mono text-5xl font-bold text-cyan-100">
                {formatWhole(community.sundayService.result ?? 0)}
              </p>
            </div>
            <TrendingUp className="size-8 text-cyan-100" />
          </div>
          <div className="space-y-3 border-t border-white/10 pt-5">
            <SummaryRow label="Baseline" value={formatWhole(community.sundayService.baseline)} />
            <SummaryRow label="Target" value={formatWhole(target)} />
            <SummaryRow
              label={isMonthly ? "Months shown" : "Recorded weeks"}
              value={
                isMonthly
                  ? `${monthlyData.length}`
                  : `${community.weeklyAttendance.filter((week) => week !== null).length}/${Math.max(1, weeklyData.length)}`
              }
            />
          </div>
        </Reveal>
      </div>
    </SectionShell>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-5">
      <span className="text-xs uppercase tracking-[0.26em] text-white/40">{label}</span>
      <span className="font-mono text-lg font-bold text-white">{value}</span>
    </div>
  );
}

function QuestLog({ community }: { community: Community }) {
  return (
    <SectionShell
      index="03"
      kicker="Quest log"
      title="LES field orders"
      glow="rgba(234,179,8,0.15)"
    >
      {community.lesGoals.length > 0 ? (
        <div className="grid gap-3">
          {community.lesGoals.map((goal, index) => {
            const completed = Boolean(goal.completedDate);
            return (
              <motion.article
                key={`${goal.title}-${goal.targetDate}`}
                className={cn(
                  "grid gap-4 border border-white/10 bg-black/60 p-5 backdrop-blur-md md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center",
                  completed && "border-amber-200/35 shadow-[0_0_22px_rgba(234,179,8,0.2)]",
                )}
                initial={{ opacity: 0, x: -22 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.28 }}
                transition={{ duration: 0.55, delay: index * 0.07, ease: EASE }}
              >
                <span
                  className={cn(
                    "flex h-12 w-12 items-center justify-center border border-white/10 bg-white/[0.04]",
                    completed ? "text-amber-100" : "text-cyan-100",
                  )}
                >
                  {completed ? (
                    <CheckCircle2 className="size-6" />
                  ) : (
                    <CircleDashed className="size-6" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.32em] text-white/35">
                    Quest {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-1 text-2xl font-bold uppercase text-white">{goal.title}</h3>
                </div>
                <div className="border border-white/10 bg-white/[0.03] px-4 py-3 text-left md:text-right">
                  <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.26em] text-white/40 md:justify-end">
                    <CalendarDays className="size-4" />
                    Target
                  </p>
                  <p className="mt-1 font-mono text-lg font-bold text-white">
                    {formatDate(goal.targetDate, true)}
                  </p>
                  {goal.completedDate ? (
                    <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-amber-100/80">
                      Cleared {formatDate(goal.completedDate, true)}
                    </p>
                  ) : null}
                </div>
              </motion.article>
            );
          })}
        </div>
      ) : (
        <Reveal className="border border-white/10 bg-black/60 p-8 text-center backdrop-blur-md">
          <Target className="mx-auto size-10 text-cyan-100" />
          <h3 className="mt-4 text-3xl font-bold uppercase text-white">Post the next LES goal</h3>
          <p className="mx-auto mt-3 max-w-xl text-sm uppercase tracking-[0.22em] text-white/45">
            A clear leadership, environment, or special project quest gives the team a next move.
          </p>
        </Reveal>
      )}
    </SectionShell>
  );
}

function Achievements({ community }: { community: Community }) {
  const badges = communityBadges(community);

  return (
    <SectionShell index="04" kicker="Achievements" title="Badge grid" glow="rgba(168,85,247,0.16)">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {badges.map((badge, index) => {
          const Icon = badge.earned ? (BADGE_ICONS[badge.id] ?? Sparkles) : LockKeyhole;
          return (
            <motion.article
              key={badge.id}
              className={cn(
                "border border-white/10 bg-black/60 p-5 backdrop-blur-md",
                badge.earned
                  ? "border-amber-200/35 shadow-[0_0_24px_rgba(234,179,8,0.2)]"
                  : "opacity-55",
              )}
              initial={{ opacity: 0, scale: 0.96, y: 18 }}
              whileInView={{ opacity: badge.earned ? 1 : 0.55, scale: 1, y: 0 }}
              viewport={{ once: true, amount: 0.24 }}
              transition={{ duration: 0.52, delay: index * 0.05, ease: EASE }}
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <span
                  className={cn(
                    "grid h-14 w-14 place-items-center border bg-white/[0.04]",
                    badge.earned
                      ? "border-amber-200/35 text-amber-100 shadow-[0_0_16px_rgba(234,179,8,0.2)]"
                      : "border-white/10 text-white/30",
                  )}
                >
                  <Icon className="size-7 [filter:drop-shadow(2px_2px_0_rgba(0,0,0,0.65))]" />
                </span>
                <span className="font-mono text-xs uppercase tracking-[0.24em] text-white/35">
                  {badge.earned ? "Earned" : "Locked"}
                </span>
              </div>
              <h3 className="text-2xl font-bold uppercase text-white">{badge.label}</h3>
              <p className="mt-3 text-sm leading-6 text-white/52">{badge.description}</p>
            </motion.article>
          );
        })}
      </div>
    </SectionShell>
  );
}

function CoachCorner({ community }: { community: Community }) {
  const tips = coachingTips(community);

  return (
    <SectionShell
      index="05"
      kicker="Coach's corner"
      title="Next best moves"
      glow="rgba(45,212,191,0.14)"
    >
      <div className="grid gap-6 border border-white/10 bg-black/60 p-5 backdrop-blur-md lg:grid-cols-[260px_minmax(0,1fr)] lg:items-center">
        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.62, ease: EASE }}
        >
          <motion.img
            src={mentorCoachSprite}
            alt="Mentor coach sprite"
            className="h-56 w-56 object-contain [image-rendering:pixelated] drop-shadow-2xl"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 0.9, repeat: Infinity }}
          />
        </motion.div>
        <div className="grid gap-4">
          {tips.map((tip, index) => (
            <motion.div
              key={tip}
              className="relative border border-white/10 bg-white/[0.04] p-5"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.54, delay: index * 0.08, ease: EASE }}
            >
              <MessageSquareQuote className="mb-4 size-6 text-cyan-100" />
              <p className="text-lg font-bold uppercase leading-7 text-white">{tip}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

export function DashboardPage({ selectedCommunityId, onCommunityChange }: DashboardPageProps) {
  const community = useMemo(
    () => COMMUNITIES.find((entry) => entry.id === selectedCommunityId) ?? COMMUNITIES[0],
    [selectedCommunityId],
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0b] text-white">
      <CosmicBackdrop />
      <DashboardHeader
        community={community}
        selectedCommunityId={community.id}
        onCommunityChange={onCommunityChange}
      />
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-3 px-5 pb-4 md:px-10">
        <div className="flex justify-end">
          <ClaimCommunityChip communityId={community.id} />
        </div>
        <AwardWinsStrip communityId={community.id} />
      </div>
      <CategoryGauges community={community} />
      <AttendanceChart community={community} />
      <QuestLog community={community} />
      <Achievements community={community} />
      <CoachCorner community={community} />
    </div>
  );
}
