import { type ReactNode } from "react";
import {
  BadgeCheck,
  CalendarDays,
  ChevronRight,
  Flame,
  Gem,
  Heart,
  HeartHandshake,
  MessageCircle,
  Sparkles,
  TrendingUp,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import spiritGlowImg from "@/assets/sprites/spirit/spirit_glow.png";
import spiritLoveImg from "@/assets/sprites/spirit/spirit_love.png";
import { BLESSING_2026, latestBlessing } from "@/lib/njData";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];
const CARD = "border border-white/10 bg-black/60 backdrop-blur-md";

type TrendKey = "candidate" | "inConversation" | "engaged" | "registered";

const trendKeys: TrendKey[] = ["candidate", "inConversation", "engaged", "registered"];

const metricLabels: Record<TrendKey, string> = {
  candidate: "Candidate",
  inConversation: "In conversation",
  engaged: "Engaged",
  registered: "Registered",
};

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

function signed(value: number) {
  if (value > 0) return `+${formatNumber(value)}`;
  return formatNumber(value);
}

function trendLabel(name: unknown) {
  const key = String(name);
  return key in metricLabels ? metricLabels[key as TrendKey] : key;
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
      viewport={{ once: true, amount: 0.22 }}
      transition={{ duration: 0.62, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function SectionHeader({
  index,
  kicker,
  title,
  children,
}: {
  index: string;
  kicker: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-white/38">
          {index} &middot; {kicker}
        </p>
        <h3 className="mt-2 text-3xl font-bold uppercase tracking-[-0.03em] text-white md:text-5xl">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function FloatingSpirit({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <motion.img
      src={src}
      alt={alt}
      className={cn("object-contain [image-rendering:pixelated] drop-shadow-2xl", className)}
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 0.9, repeat: Infinity }}
    />
  );
}

function GoalHero() {
  const latest = latestBlessing();
  const first = BLESSING_2026[0];
  const candidateDelta = latest.candidate - first.candidate;
  const registrationDelta = latest.registered - first.registered;

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Reveal
        className={cn(
          CARD,
          "relative min-h-[340px] overflow-hidden p-6 shadow-[0_0_36px_rgba(234,179,8,0.18)] md:p-8",
        )}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 28% 22%, rgba(234,179,8,0.24), transparent 34%), radial-gradient(circle at 78% 68%, rgba(45,212,191,0.12), transparent 36%)",
          }}
        />
        <div className="relative grid h-full gap-8 md:grid-cols-[minmax(0,1fr)_210px] md:items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-amber-100/80">Journey</p>
            <h2 className="mt-4 text-5xl font-bold uppercase leading-none tracking-[-0.04em] text-white md:text-7xl">
              {latest.pctAnnualGoal.toFixed(1)}%
            </h2>
            <p className="mt-3 text-xl font-bold uppercase tracking-[0.18em] text-amber-100">
              of annual Blessing goal
            </p>
            <p className="mt-6 max-w-2xl text-sm uppercase leading-6 tracking-[0.24em] text-white/50">
              The goal line has been cleared. Now protect the people moving through conversation, engagement, and
              registration.
            </p>
          </div>
          <div className="flex justify-center md:justify-end">
            <FloatingSpirit src={spiritGlowImg} alt="Glowing spirit sprite" className="h-44 w-44 md:h-56 md:w-56" />
          </div>
        </div>
      </Reveal>

      <Reveal className={cn(CARD, "relative overflow-hidden p-5")} delay={0.1}>
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(circle at 50% 10%, rgba(45,212,191,0.16), transparent 38%)" }}
        />
        <div className="relative">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.36em] text-white/38">Momentum</p>
              <h3 className="mt-2 text-3xl font-bold uppercase text-white">January to June</h3>
            </div>
            <TrendingUp className="size-8 text-teal-100" />
          </div>
          <div className="grid gap-3">
            <div className="border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[10px] uppercase tracking-[0.28em] text-white/35">Candidates added</p>
              <p className="mt-1 font-mono text-4xl font-bold text-teal-100">{signed(candidateDelta)}</p>
            </div>
            <div className="border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[10px] uppercase tracking-[0.28em] text-white/35">Registrations added</p>
              <p className="mt-1 font-mono text-4xl font-bold text-amber-100">{signed(registrationDelta)}</p>
            </div>
          </div>
          <p className="mt-5 text-sm uppercase leading-6 tracking-[0.22em] text-white/48">
            The pipeline added {signed(candidateDelta)} candidates and {signed(registrationDelta)} registrations since
            January.
          </p>
        </div>
      </Reveal>
    </section>
  );
}

function PipelineSnapshot() {
  const latest = latestBlessing();
  const stages: {
    label: string;
    value: number;
    icon: LucideIcon;
    tone: string;
    glow: string;
  }[] = [
    {
      label: "Eligible",
      value: latest.eligibleSingles,
      icon: UsersRound,
      tone: "text-cyan-100",
      glow: "rgba(34,211,238,0.16)",
    },
    {
      label: "HJBG Registered",
      value: latest.hjbgRegistered,
      icon: BadgeCheck,
      tone: "text-teal-100",
      glow: "rgba(45,212,191,0.16)",
    },
    {
      label: "Candidate",
      value: latest.candidate,
      icon: Heart,
      tone: "text-pink-100",
      glow: "rgba(244,114,182,0.14)",
    },
    {
      label: "In Conversation",
      value: latest.inConversation,
      icon: MessageCircle,
      tone: "text-violet-100",
      glow: "rgba(168,85,247,0.16)",
    },
    {
      label: "Engaged",
      value: latest.engaged,
      icon: Gem,
      tone: "text-amber-100",
      glow: "rgba(234,179,8,0.18)",
    },
    {
      label: "Registered",
      value: latest.registered,
      icon: HeartHandshake,
      tone: "text-emerald-100",
      glow: "rgba(16,185,129,0.16)",
    },
  ];

  return (
    <section>
      <SectionHeader index="01" kicker="Pipeline" title="Stage snapshot">
        <p className="max-w-md text-right text-xs uppercase leading-5 tracking-[0.28em] text-white/42">
          Latest Blessing workbook state, rendered as the Journey path.
        </p>
      </SectionHeader>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {stages.map((stage, index) => {
          const Icon = stage.icon;

          return (
            <Reveal key={stage.label} className="relative" delay={index * 0.055}>
              <article className={cn(CARD, "relative min-h-52 overflow-hidden p-4")}>
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{ background: `radial-gradient(circle at 50% 8%, ${stage.glow}, transparent 42%)` }}
                />
                <div className="relative flex h-full flex-col justify-between gap-8">
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid h-11 w-11 place-items-center border border-white/10 bg-white/[0.04]">
                      <Icon className={cn("size-5", stage.tone)} />
                    </span>
                    <span className="font-mono text-xs uppercase tracking-[0.24em] text-white/30">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.28em] text-white/35">{stage.label}</p>
                    <p className={cn("mt-2 font-mono text-5xl font-bold", stage.tone)}>
                      {formatNumber(stage.value)}
                    </p>
                  </div>
                </div>
              </article>
              {index < stages.length - 1 ? (
                <ChevronRight className="absolute -right-3 top-1/2 z-10 hidden size-6 -translate-y-1/2 text-white/24 xl:block" />
              ) : null}
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

function BlessingTrendChart() {
  const maxValue = Math.max(
    ...BLESSING_2026.flatMap((month) => [month.candidate, month.inConversation, month.engaged, month.registered]),
  );

  return (
    <section>
      <SectionHeader index="02" kicker="Trend" title="Jan-Jun Journey curve">
        <div className="flex items-center gap-2 text-amber-100">
          <Flame className="size-5" />
          <span className="text-xs uppercase tracking-[0.3em]">Blessing momentum</span>
        </div>
      </SectionHeader>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <Reveal className={cn(CARD, "h-[390px] p-4")}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={BLESSING_2026} margin={{ top: 22, right: 24, bottom: 8, left: 0 }}>
              <defs>
                <linearGradient id="candidateFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.34} />
                  <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="registeredFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#facc15" stopOpacity={0.32} />
                  <stop offset="95%" stopColor="#facc15" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#ffffff14" strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
                tickLine={{ stroke: "#ffffff24" }}
                axisLine={{ stroke: "#ffffff24" }}
              />
              <YAxis
                allowDecimals={false}
                domain={[0, Math.ceil(maxValue * 1.25)]}
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
                formatter={(value: unknown, name: unknown) => [formatNumber(Number(value)), trendLabel(name)]}
              />
              <Area
                type="monotone"
                dataKey="candidate"
                fill="url(#candidateFill)"
                stroke="var(--chart-2)"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: "#0a0a0b", stroke: "var(--chart-2)" }}
                activeDot={{ r: 7, stroke: "#fff", strokeWidth: 1, fill: "var(--chart-2)" }}
              />
              <Line
                type="monotone"
                dataKey="inConversation"
                stroke="var(--chart-4)"
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2, fill: "#0a0a0b", stroke: "var(--chart-4)" }}
              />
              <Line
                type="monotone"
                dataKey="engaged"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2, fill: "#0a0a0b", stroke: "#f59e0b" }}
              />
              <Area
                type="monotone"
                dataKey="registered"
                fill="url(#registeredFill)"
                stroke="#facc15"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: "#0a0a0b", stroke: "#facc15" }}
                activeDot={{ r: 7, stroke: "#fff", strokeWidth: 1, fill: "#facc15" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Reveal>

        <Reveal className={cn(CARD, "relative overflow-hidden p-5")} delay={0.1}>
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(circle at 60% 20%, rgba(168,85,247,0.16), transparent 38%)" }}
          />
          <div className="relative">
            <FloatingSpirit src={spiritLoveImg} alt="Spirit love sprite" className="mx-auto h-32 w-32" />
            <div className="mt-5 space-y-3 border-t border-white/10 pt-5">
              {trendKeys.map((key) => {
                const latest = latestBlessing();

                return (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <span className="text-[10px] uppercase tracking-[0.24em] text-white/36">
                      {metricLabels[key]}
                    </span>
                    <span className="font-mono text-lg font-bold text-white">{formatNumber(latest[key])}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function BlessingPanel() {
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 24,
    mass: 0.4,
  });
  const haloY = useTransform(smoothProgress, [0, 1], ["0px", "-76px"]);

  return (
    <motion.div
      className="relative overflow-hidden text-white"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE }}
    >
      <motion.div
        className="pointer-events-none absolute inset-x-0 top-0 h-80 opacity-80"
        style={{
          y: haloY,
          background:
            "radial-gradient(circle at 50% 20%, rgba(234,179,8,0.2), transparent 35%), radial-gradient(circle at 18% 62%, rgba(168,85,247,0.13), transparent 34%)",
        }}
      />

      <div className="relative space-y-12">
        <GoalHero />
        <PipelineSnapshot />
        <BlessingTrendChart />
      </div>
    </motion.div>
  );
}
