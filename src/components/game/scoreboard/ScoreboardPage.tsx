import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Coins,
  Crown,
  Heart,
  Medal,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { motion, useScroll, useSpring, useTransform } from "motion/react";

import {
  TEAM_LABELS,
  TRIMESTER,
  communityBadges,
  rankedCommunities,
  type Community,
  type RankedCommunity,
} from "@/lib/comebackData";
import { cn } from "@/lib/utils";
import { mascotFor } from "./mascots";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];
const DAY_MS = 24 * 60 * 60 * 1000;

type CategoryKey = "financePoints" | "memberPoints" | "blessingPoints";

const CATEGORIES = [
  { key: "financePoints", label: "Income", shortLabel: "INC", accent: "gold" },
  { key: "memberPoints", label: "Members", shortLabel: "MEM", accent: "teal" },
  { key: "blessingPoints", label: "Blessing", shortLabel: "BLS", accent: "gold" },
] satisfies Array<{
  key: CategoryKey;
  label: string;
  shortLabel: string;
  accent: "gold" | "teal";
}>;

const PODIUM_STYLE = {
  1: {
    label: "Gold",
    glow: "shadow-[0_0_34px_rgba(234,179,8,0.34)]",
    text: "text-amber-200",
    border: "border-amber-300/35",
    pedestal: "from-amber-300/45 via-amber-200/18 to-black/20",
  },
  2: {
    label: "Silver",
    glow: "shadow-[0_0_28px_rgba(226,232,240,0.26)]",
    text: "text-slate-100",
    border: "border-slate-200/30",
    pedestal: "from-slate-200/35 via-slate-100/14 to-black/20",
  },
  3: {
    label: "Bronze",
    glow: "shadow-[0_0_28px_rgba(251,146,60,0.25)]",
    text: "text-orange-200",
    border: "border-orange-300/30",
    pedestal: "from-orange-300/35 via-orange-200/14 to-black/20",
  },
} as const;

const BADGE_ICONS: Record<string, LucideIcon> = {
  "triple-header": Crown,
  treasury: Coins,
  gatherer: Users,
  matchmaker: Heart,
  "quest-complete": CheckCircle2,
  "faithful-scribe": ShieldCheck,
};

type Star = {
  id: number;
  left: string;
  top: string;
  size: number;
  opacity: number;
};

function makeStars(count: number, offset = 0): Star[] {
  return Array.from({ length: count }, (_, index) => {
    const id = index + offset;
    return {
      id,
      left: `${(id * 37) % 101}%`,
      top: `${(id * 53) % 103}%`,
      size: 1 + (id % 3),
      opacity: 0.18 + (id % 7) * 0.08,
    };
  });
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

function daysRemainingInTrimester() {
  const end = new Date(`${TRIMESTER.end}T23:59:59`);
  return Math.max(0, Math.ceil((end.getTime() - Date.now()) / DAY_MS));
}

function useDaysRemaining() {
  const [days, setDays] = useState(0);

  useEffect(() => {
    const updateDays = () => setDays(daysRemainingInTrimester());
    updateDays();
    const interval = window.setInterval(updateDays, 60 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  return days;
}

function CountUpPoints({
  value,
  className,
  delay = 0,
  pad = false,
}: {
  value: number;
  className?: string;
  delay?: number;
  pad?: boolean;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let frame = 0;
    const timeout = window.setTimeout(() => {
      const started = performance.now();
      const duration = 1100;

      const tick = (now: number) => {
        const elapsed = Math.min(1, (now - started) / duration);
        const eased = 1 - Math.pow(1 - elapsed, 3);
        setDisplay(Math.round(value * eased));

        if (elapsed < 1) {
          frame = window.requestAnimationFrame(tick);
        }
      };

      frame = window.requestAnimationFrame(tick);
    }, delay * 1000);

    return () => {
      window.clearTimeout(timeout);
      window.cancelAnimationFrame(frame);
    };
  }, [delay, value]);

  const label = pad ? display.toString().padStart(2, "0") : formatPoints(display);
  return <span className={className}>{label}</span>;
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
  const nearY = useTransform(smoothProgress, [0, 1], ["0px", "-340px"]);

  const farStars = useMemo(() => makeStars(52), []);
  const midStars = useMemo(() => makeStars(46, 100), []);
  const nearStars = useMemo(() => makeStars(32, 200), []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#0a0a0b]">
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(circle at 50% 20%, rgba(79,127,255,0.2), transparent 35%), radial-gradient(circle at 12% 55%, rgba(45,212,191,0.14), transparent 30%), radial-gradient(circle at 82% 78%, rgba(234,179,8,0.12), transparent 34%)",
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
      <span className="animate-shooting-star absolute left-[86%] top-[10%] h-[1px] w-[120px] bg-gradient-to-r from-white via-white/50 to-transparent" />
      <span className="animate-shooting-star absolute left-[62%] top-[36%] h-[1px] w-[88px] bg-gradient-to-r from-cyan-100 via-white/45 to-transparent [animation-delay:3.8s]" />
      <span className="animate-shooting-star absolute left-[94%] top-[62%] h-[1px] w-[104px] bg-gradient-to-r from-amber-100 via-white/45 to-transparent [animation-delay:7s]" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#0a0a0b] to-transparent" />
    </div>
  );
}

function SectionShell({
  children,
  index,
  kicker,
  title,
  glow,
}: {
  children: React.ReactNode;
  index: string;
  kicker: string;
  title: string;
  glow: string;
}) {
  return (
    <motion.section
      className="relative z-10 flex min-h-screen flex-col justify-center overflow-hidden px-5 py-24 md:px-12 lg:px-16"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.7, ease: EASE }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 20%, ${glow}, transparent 35%)`,
        }}
      />
      <div className="relative mx-auto w-full max-w-7xl">
        <div className="mb-10 flex flex-col gap-3 md:mb-12">
          <p className="text-sm uppercase tracking-[0.4em] text-signal">
            {index} - {kicker}
          </p>
          <h2 className="display max-w-5xl text-[13vw] text-white md:text-[7vw] lg:text-[5.8vw]">
            {title}
          </h2>
        </div>
        {children}
      </div>
    </motion.section>
  );
}

function HeroHeader({ leader, communityCount }: { leader: RankedCommunity; communityCount: number }) {
  const daysRemaining = useDaysRemaining();
  const trimesterRange = `${formatDate(TRIMESTER.start)} - ${formatDate(TRIMESTER.end, true)}`;

  return (
    <section className="relative z-10 flex min-h-screen items-center overflow-hidden px-5 py-20 md:px-12 lg:px-16">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 20%, rgba(79,127,255,0.22), transparent 36%), radial-gradient(circle at 78% 35%, rgba(45,212,191,0.16), transparent 32%)",
        }}
      />
      <div className="relative mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] lg:items-center">
        <div>
          <motion.p
            className="mb-5 text-sm uppercase tracking-[0.4em] text-signal"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            Operation COMEBACK regional scoreboard
          </motion.p>
          <h1 className="display text-[20vw] uppercase text-white md:text-[12vw] lg:text-[8.8vw]">
            {"T2 LEAGUE STANDINGS".split(" ").map((word, wordIndex) => (
              <span className="block overflow-hidden" key={word}>
                <motion.span
                  className="inline-block"
                  initial={{ y: "115%" }}
                  animate={{ y: "0%" }}
                  transition={{
                    duration: 0.8,
                    ease: EASE,
                    delay: 0.08 + wordIndex * 0.12,
                  }}
                >
                  {word}
                </motion.span>
              </span>
            ))}
          </h1>
          <motion.div
            className="mt-8 grid max-w-3xl grid-cols-1 border border-white/10 bg-black/60 backdrop-blur-md md:grid-cols-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.65, ease: EASE }}
          >
            <StatCell label={TRIMESTER.label} value={trimesterRange} />
            <StatCell label="Communities" value={communityCount.toString()} />
            <div className="border-white/10 p-5 md:border-l">
              <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.32em] text-white/45">
                <Timer className="size-4 text-cyan-200" />
                Days left
              </div>
              <CountUpPoints
                value={daysRemaining}
                pad
                className="font-mono text-5xl font-bold leading-none text-cyan-100"
              />
              <p className="mt-2 text-xs uppercase tracking-[0.26em] text-white/35">
                Ends {formatDate(TRIMESTER.end, true)}
              </p>
            </div>
          </motion.div>
        </div>
        <motion.aside
          className="border border-white/10 bg-black/60 p-6 shadow-[0_0_34px_rgba(45,212,191,0.16)] backdrop-blur-md"
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.85, ease: EASE }}
        >
          <p className="mb-6 text-xs uppercase tracking-[0.34em] text-amber-200/80">
            League leader
          </p>
          <motion.img
            src={mascotFor(leader.mascot, "hero")}
            alt={`${leader.shortName} mascot`}
            className="mx-auto mb-4 h-48 w-48 object-contain [image-rendering:pixelated] drop-shadow-2xl md:h-64 md:w-64"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 0.9, repeat: Infinity }}
          />
          <div className="border-t border-white/10 pt-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.32em] text-white/40">Rank 01</p>
                <h2 className="mt-2 text-3xl font-bold uppercase text-white">{leader.shortName}</h2>
              </div>
              <Trophy className="mt-1 size-9 text-amber-200" />
            </div>
            <CountUpPoints
              value={leader.points}
              delay={0.25}
              className="mt-5 block font-mono text-5xl font-bold text-amber-100"
            />
          </div>
        </motion.aside>
      </div>
    </section>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-white/10 p-5 md:border-l md:first:border-l-0">
      <p className="mb-3 text-[11px] uppercase tracking-[0.32em] text-white/45">{label}</p>
      <p className="font-mono text-xl font-bold uppercase text-white md:text-2xl">{value}</p>
    </div>
  );
}

function PodiumSection({ standings }: { standings: RankedCommunity[] }) {
  const topThree = standings.slice(0, 3);
  const slots = [
    { community: topThree[1], place: 2 as const, pedestal: 176, delay: 0.1 },
    { community: topThree[0], place: 1 as const, pedestal: 230, delay: 0 },
    { community: topThree[2], place: 3 as const, pedestal: 142, delay: 0.2 },
  ].filter((slot): slot is { community: RankedCommunity; place: 1 | 2 | 3; pedestal: number; delay: number } =>
    Boolean(slot.community),
  );

  return (
    <SectionShell
      index="01"
      kicker="Podium"
      title="Top three communities"
      glow="rgba(234,179,8,0.18)"
    >
      <div className="grid gap-5 lg:grid-cols-3 lg:items-end">
        {slots.map((slot) => {
          const style = PODIUM_STYLE[slot.place];
          return (
            <motion.article
              key={slot.community.id}
              className={cn(
                "relative border bg-black/60 p-5 backdrop-blur-md",
                style.border,
                style.glow,
                slot.place === 1 && "lg:-mt-12",
              )}
              initial={{ opacity: 0, y: 42, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.75, delay: slot.delay, ease: EASE }}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-white/45">
                    {style.label} seed
                  </p>
                  <p className={cn("mt-1 font-mono text-4xl font-bold", style.text)}>
                    #{slot.place}
                  </p>
                </div>
                <Medal className={cn("size-10", style.text)} />
              </div>
              <motion.img
                src={mascotFor(slot.community.mascot, "podium")}
                alt={`${slot.community.shortName} mascot`}
                className="mx-auto h-40 w-40 object-contain [image-rendering:pixelated] drop-shadow-2xl md:h-52 md:w-52"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: slot.delay }}
              />
              <div className="mt-4 min-h-28">
                <h3 className="text-2xl font-bold uppercase text-white md:text-3xl">
                  {slot.community.shortName}
                </h3>
                <p className="mt-1 text-sm uppercase tracking-[0.26em] text-white/45">
                  {slot.community.size}
                </p>
                <CountUpPoints
                  value={slot.community.points}
                  delay={slot.delay + 0.15}
                  className={cn("mt-5 block font-mono text-5xl font-bold", style.text)}
                />
              </div>
              <motion.div
                className={cn("mt-6 border border-white/10 bg-gradient-to-b", style.pedestal)}
                initial={{ height: 20 }}
                whileInView={{ height: slot.pedestal }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.8, delay: slot.delay + 0.12, ease: EASE }}
              >
                <div className="flex h-full items-end justify-center pb-5 font-mono text-7xl font-bold text-white/14">
                  {slot.place}
                </div>
              </motion.div>
            </motion.article>
          );
        })}
      </div>
    </SectionShell>
  );
}

function StandingsSection({ standings }: { standings: RankedCommunity[] }) {
  const maxCategoryMagnitude = Math.max(
    1,
    ...standings.flatMap((community) =>
      CATEGORIES.map((category) => Math.abs(community[category.key])),
    ),
  );

  return (
    <SectionShell
      index="02"
      kicker="Full table"
      title="Every community ranked"
      glow="rgba(45,212,191,0.16)"
    >
      <div className="overflow-x-auto border border-white/10 bg-black/60 p-3 backdrop-blur-md">
        <div className="min-w-[1060px]">
          <div className="grid grid-cols-[4rem_minmax(260px,1.4fr)_9rem_repeat(3,minmax(126px,0.75fr))_8rem_minmax(150px,0.8fr)] gap-3 px-4 py-3 text-[11px] uppercase tracking-[0.28em] text-white/40">
            <span>Rank</span>
            <span>Community</span>
            <span>Tier</span>
            {CATEGORIES.map((category) => (
              <span key={category.key}>{category.label}</span>
            ))}
            <span>Total</span>
            <span>Badges</span>
          </div>
          <div className="space-y-2">
            {standings.map((community, index) => (
              <StandingsRow
                community={community}
                index={index}
                key={community.id}
                maxCategoryMagnitude={maxCategoryMagnitude}
              />
            ))}
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

function StandingsRow({
  community,
  index,
  maxCategoryMagnitude,
}: {
  community: RankedCommunity;
  index: number;
  maxCategoryMagnitude: number;
}) {
  const earnedBadges = communityBadges(community).filter((badge) => badge.earned);

  return (
    <motion.a
      href={`/dashboard?community=${community.id}`}
      className="grid grid-cols-[4rem_minmax(260px,1.4fr)_9rem_repeat(3,minmax(126px,0.75fr))_8rem_minmax(150px,0.8fr)] items-center gap-3 border border-white/10 bg-black/60 px-4 py-3 text-white transition-colors hover:border-cyan-200/35 hover:bg-cyan-950/10"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.035, 0.45), ease: EASE }}
    >
      <span className="font-mono text-2xl font-bold text-white/70">
        {community.rank.toString().padStart(2, "0")}
      </span>
      <span className="flex min-w-0 items-center gap-3">
        <img
          src={mascotFor(community.mascot, "thumb")}
          alt={`${community.shortName} mascot`}
          className="h-14 w-14 shrink-0 object-contain [image-rendering:pixelated] drop-shadow-2xl"
          loading="lazy"
        />
        <span className="min-w-0">
          <span className="block truncate text-lg font-bold uppercase text-white">
            {community.shortName}
          </span>
          <span className="block truncate text-xs uppercase tracking-[0.24em] text-white/35">
            {community.name}
          </span>
        </span>
      </span>
      <span className="border border-white/10 bg-white/[0.03] px-3 py-2 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">
        {community.size}
      </span>
      {CATEGORIES.map((category) => (
        <CategoryMeter
          key={category.key}
          accent={category.accent}
          label={category.shortLabel}
          maxMagnitude={maxCategoryMagnitude}
          value={community[category.key]}
        />
      ))}
      <span
        className={cn(
          "font-mono text-2xl font-bold",
          community.points >= 0 ? "text-cyan-100" : "text-red-200/75",
        )}
      >
        {formatPoints(community.points)}
      </span>
      <span className="flex flex-wrap gap-2">
        {earnedBadges.length > 0 ? (
          earnedBadges.map((badge) => {
            const Icon = BADGE_ICONS[badge.id] ?? Sparkles;
            return (
              <span
                key={badge.id}
                title={`${badge.label}: ${badge.description}`}
                className="inline-flex h-9 w-9 items-center justify-center border border-amber-200/35 bg-amber-300/10 text-amber-100 shadow-[0_0_12px_rgba(234,179,8,0.16)]"
              >
                <Icon className="size-4" />
              </span>
            );
          })
        ) : (
          <span className="border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.24em] text-white/30">
            Open
          </span>
        )}
      </span>
    </motion.a>
  );
}

function CategoryMeter({
  accent,
  label,
  maxMagnitude,
  value,
}: {
  accent: "gold" | "teal";
  label: string;
  maxMagnitude: number;
  value: number;
}) {
  const positive = value > 0;
  const negative = value < 0;
  const width = value === 0 ? 0 : Math.max(8, (Math.abs(value) / maxMagnitude) * 100);
  const positiveClass =
    accent === "gold"
      ? "border-amber-200/35 text-amber-100 shadow-[0_0_12px_rgba(234,179,8,0.16)]"
      : "border-cyan-200/35 text-cyan-100 shadow-[0_0_12px_rgba(45,212,191,0.16)]";
  const fillClass = positive
    ? accent === "gold"
      ? "bg-amber-200"
      : "bg-cyan-200"
    : negative
      ? "bg-red-400/55"
      : "bg-white/20";

  return (
    <span
      className={cn(
        "block border bg-white/[0.03] px-2 py-2",
        positive && positiveClass,
        negative && "border-red-400/20 bg-red-950/10 text-red-200/70",
        !positive && !negative && "border-white/10 text-white/35",
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{label}</span>
        <span className="font-mono text-sm font-bold">{formatPoints(value)}</span>
      </span>
      <span className="mt-2 block h-1 bg-white/10">
        <motion.span
          className={cn("block h-full", fillClass)}
          initial={{ width: 0 }}
          whileInView={{ width: `${Math.min(100, width)}%` }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: EASE }}
        />
      </span>
    </span>
  );
}

function TeamBattleSection({ standings }: { standings: RankedCommunity[] }) {
  const teams = useMemo(() => {
    const entries = Object.entries(TEAM_LABELS) as Array<[Community["team"], string]>;
    return entries
      .map(([team, label]) => {
        const communities = standings.filter((community) => community.team === team);
        return {
          team,
          label,
          count: communities.length,
          points: communities.reduce((sum, community) => sum + community.points, 0),
        };
      })
      .sort((a, b) => b.points - a.points);
  }, [standings]);

  const values = teams.map((team) => team.points);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(1, max - min);

  return (
    <SectionShell
      index="03"
      kicker="STRATCOM battle"
      title="Challenge team race"
      glow="rgba(168,85,247,0.18)"
    >
      <div className="space-y-4">
        {teams.map((team, index) => {
          const width = 18 + ((team.points - min) / range) * 78;
          const leading = index === 0;
          const positive = team.points >= 0;

          return (
            <motion.div
              key={team.team}
              className={cn(
                "border border-white/10 bg-black/60 p-4 backdrop-blur-md",
                leading && "border-amber-200/35 shadow-[0_0_24px_rgba(234,179,8,0.18)]",
              )}
              initial={{ opacity: 0, x: -26 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.55, delay: index * 0.08, ease: EASE }}
            >
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-white/40">
                    {leading ? "Current lead" : `Seed ${index + 1}`}
                  </p>
                  <h3 className="mt-1 text-2xl font-bold uppercase text-white">{team.label}</h3>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      "font-mono text-3xl font-bold",
                      positive ? "text-cyan-100" : "text-red-200/75",
                    )}
                  >
                    {formatPoints(team.points)}
                  </p>
                  <p className="text-xs uppercase tracking-[0.24em] text-white/35">
                    {team.count} communities
                  </p>
                </div>
              </div>
              <div className="h-8 border border-white/10 bg-white/[0.03]">
                <motion.div
                  className={cn(
                    "h-full",
                    leading
                      ? "bg-amber-200 shadow-[0_0_18px_rgba(234,179,8,0.38)]"
                      : positive
                        ? "bg-cyan-200 shadow-[0_0_16px_rgba(45,212,191,0.28)]"
                        : "bg-red-500/45",
                  )}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${width}%` }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ duration: 0.9, delay: index * 0.08, ease: EASE }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </SectionShell>
  );
}

function CategoryChampionsSection({ standings }: { standings: RankedCommunity[] }) {
  const champions = CATEGORIES.map((category) => {
    const community = standings.reduce((best, candidate) =>
      candidate[category.key] > best[category.key] ? candidate : best,
    );
    return { category, community };
  });

  return (
    <SectionShell
      index="04"
      kicker="Category champions"
      title="Lane leaders"
      glow="rgba(234,179,8,0.14)"
    >
      <div className="grid gap-5 lg:grid-cols-3">
        {champions.map(({ category, community }, index) => (
          <motion.article
            key={category.key}
            className={cn(
              "border bg-black/60 p-6 backdrop-blur-md",
              category.accent === "gold"
                ? "border-amber-200/35 shadow-[0_0_24px_rgba(234,179,8,0.18)]"
                : "border-cyan-200/35 shadow-[0_0_24px_rgba(45,212,191,0.18)]",
            )}
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.6, delay: index * 0.1, ease: EASE }}
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-white/40">
                  {category.label} champion
                </p>
                <h3 className="mt-2 text-3xl font-bold uppercase text-white">
                  {community.shortName}
                </h3>
              </div>
              <div
                className={cn(
                  "flex h-16 w-16 items-center justify-center border",
                  category.accent === "gold"
                    ? "border-amber-200/35 bg-amber-200/10 text-amber-100"
                    : "border-cyan-200/35 bg-cyan-200/10 text-cyan-100",
                )}
              >
                <Target className="size-8" />
              </div>
            </div>
            <motion.img
              src={mascotFor(community.mascot, "podium")}
              alt={`${community.shortName} mascot`}
              className="mx-auto h-44 w-44 object-contain [image-rendering:pixelated] drop-shadow-2xl"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: index * 0.12 }}
            />
            <div className="mt-6 border-t border-white/10 pt-5">
              <p className="text-xs uppercase tracking-[0.28em] text-white/40">Lane score</p>
              <CountUpPoints
                value={community[category.key]}
                delay={0.12 + index * 0.08}
                className={cn(
                  "mt-2 block font-mono text-5xl font-bold",
                  category.accent === "gold" ? "text-amber-100" : "text-cyan-100",
                )}
              />
              <p className="mt-4 text-sm uppercase tracking-[0.24em] text-white/35">
                Overall rank #{community.rank.toString().padStart(2, "0")}
              </p>
            </div>
          </motion.article>
        ))}
      </div>
    </SectionShell>
  );
}

export function ScoreboardPage() {
  const standings = useMemo(() => rankedCommunities(), []);
  const leader = standings[0];

  if (!leader) {
    return null;
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0a0a0b] text-white">
      <CosmicBackdrop />
      <HeroHeader communityCount={standings.length} leader={leader} />
      <PodiumSection standings={standings} />
      <StandingsSection standings={standings} />
      <TeamBattleSection standings={standings} />
      <CategoryChampionsSection standings={standings} />
    </div>
  );
}
