import { type FormEvent, type ReactNode, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  CalendarDays,
  DoorClosed,
  ExternalLink,
  HeartHandshake,
  Loader2,
  Radar,
  UserPlus,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import npcConfusedImg from "@/assets/sprites/npc/npc_confused.png";
import npcLoveImg from "@/assets/sprites/npc/npc_love.png";
import npcReadingImg from "@/assets/sprites/npc/npc_reading.png";
import npcSaluteImg from "@/assets/sprites/npc/npc_salute.png";
import npcWalkingImg from "@/assets/sprites/npc/npc_walking.png";
import npcWaveImg from "@/assets/sprites/npc/npc_wave.png";
import { ACTION_QUEUE_URL, addGuest } from "@/lib/njActions";
import { GUEST_FUNNEL, MEMBERSHIP, RECENT_GUESTS } from "@/lib/njData";
import { award } from "@/lib/progression";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { celebrate } from "./ProgressHud";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];
const CARD = "border border-white/10 bg-black/60 backdrop-blur-md";

const npcSprites = [npcWaveImg, npcReadingImg, npcSaluteImg, npcWalkingImg, npcLoveImg, npcConfusedImg];

const activityData = [
  {
    key: "core",
    label: "Core",
    value: MEMBERSHIP.activityLevels.core,
    color: "#facc15",
    tone: "text-amber-100",
  },
  {
    key: "active",
    label: "Active",
    value: MEMBERSHIP.activityLevels.active,
    color: "#2dd4bf",
    tone: "text-teal-100",
  },
  {
    key: "inactive",
    label: "Inactive",
    value: MEMBERSHIP.activityLevels.inactive,
    color: "#7f1d1d",
    tone: "text-red-200/70",
  },
];

const labelMap: Record<string, string> = {
  male: "Male",
  female: "Female",
  g1: "G1",
  g2: "G2",
  g3: "G3",
  "0-18": "0-18",
  "19-39": "19-39",
  "40-59": "40-59",
  "60+": "60+",
  "0-3 mo": "0-3 mo",
  "4-11 mo": "4-11 mo",
  "12+ mo": "12+ mo",
};

const demographicGroups: {
  title: string;
  eyebrow: string;
  icon: LucideIcon;
  entries: [string, number][];
}[] = [
  {
    title: "Gender",
    eyebrow: "Active by gender",
    icon: UsersRound,
    entries: Object.entries(MEMBERSHIP.activeByGender),
  },
  {
    title: "Age",
    eyebrow: "Active by age",
    icon: Radar,
    entries: Object.entries(MEMBERSHIP.activeByAge),
  },
  {
    title: "Lineage",
    eyebrow: "Active by lineage",
    icon: HeartHandshake,
    entries: Object.entries(MEMBERSHIP.activeByLineage),
  },
  {
    title: "Tenure",
    eyebrow: "Active by tenure",
    icon: CalendarDays,
    entries: Object.entries(MEMBERSHIP.activeByTenure),
  },
];

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
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
      viewport={{ once: true, amount: 0.2 }}
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

function FloatingNpc({ src, alt, className }: { src: string; alt: string; className?: string }) {
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

function ActivityBreakdown() {
  const total = activityData.reduce((sum, item) => sum + item.value, 0);
  const inactivePool = MEMBERSHIP.activityLevels.inactive;

  return (
    <section>
      <SectionHeader index="01" kicker="Fellowship" title="Activity signal">
        <p className="max-w-md text-right text-xs uppercase leading-5 tracking-[0.28em] text-white/42">
          Core strength is real. The next win is reactivation.
        </p>
      </SectionHeader>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Reveal className={cn(CARD, "relative min-h-[360px] overflow-hidden p-5")}>
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                "radial-gradient(circle at 50% 32%, rgba(45,212,191,0.16), transparent 38%), radial-gradient(circle at 72% 80%, rgba(234,179,8,0.12), transparent 34%)",
            }}
          />
          <div className="relative h-[270px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={activityData}
                  dataKey="value"
                  nameKey="label"
                  innerRadius="58%"
                  outerRadius="82%"
                  paddingAngle={2}
                  stroke="#0a0a0b"
                  strokeWidth={4}
                >
                  {activityData.map((item) => (
                    <Cell key={item.key} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#050509",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 0,
                    color: "#fff",
                  }}
                  labelStyle={{ color: "rgba(255,255,255,0.72)" }}
                  formatter={(value: unknown) => [formatNumber(Number(value)), "People"]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="text-[11px] uppercase tracking-[0.34em] text-white/38">Directory pool</p>
                <p className="mt-2 font-mono text-5xl font-bold text-white">{formatNumber(total)}</p>
              </div>
            </div>
          </div>

          <div className="relative grid gap-2 sm:grid-cols-3">
            {activityData.map((item) => (
              <div key={item.key} className="border border-white/10 bg-white/[0.04] p-3">
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-2.5 w-2.5" style={{ backgroundColor: item.color }} />
                  <p className="text-[11px] uppercase tracking-[0.28em] text-white/42">{item.label}</p>
                </div>
                <p className={cn("font-mono text-3xl font-bold", item.tone)}>{formatNumber(item.value)}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal className={cn(CARD, "relative overflow-hidden p-6")} delay={0.08}>
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: "radial-gradient(circle at 24% 20%, rgba(127,29,29,0.3), transparent 35%)",
            }}
          />
          <div className="relative grid gap-6 md:grid-cols-[minmax(0,1fr)_150px] md:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-red-200/60">Re-engagement pool</p>
              <h4 className="mt-4 text-4xl font-bold uppercase leading-none tracking-[-0.04em] text-white md:text-6xl">
                {formatNumber(inactivePool)} inactive people
              </h4>
              <p className="mt-5 max-w-xl text-sm uppercase leading-6 tracking-[0.24em] text-white/48">
                This is the biggest re-engagement pool in the directory. Treat it as a care list, not a lost list.
              </p>
            </div>
            <div className="flex justify-center">
              <FloatingNpc src={npcConfusedImg} alt="Confused NPC sprite" className="h-36 w-36 md:h-44 md:w-44" />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function DemographicGrid() {
  return (
    <section>
      <SectionHeader index="02" kicker="People map" title="Active member texture" />
      <div className="grid gap-4 lg:grid-cols-4">
        {demographicGroups.map((group, groupIndex) => {
          const Icon = group.icon;

          return (
            <Reveal key={group.title} className={cn(CARD, "p-4")} delay={groupIndex * 0.06}>
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.32em] text-white/35">{group.eyebrow}</p>
                  <h4 className="mt-1 text-2xl font-bold uppercase text-white">{group.title}</h4>
                </div>
                <Icon className="size-6 text-teal-100" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {group.entries.map(([label, value]) => (
                  <div key={label} className="border border-white/10 bg-white/[0.035] p-3">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/38">
                      {labelMap[label] ?? label}
                    </p>
                    <p className="mt-1 font-mono text-2xl font-bold text-white">{formatNumber(value)}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

function GuestFunnel() {
  const maxCount = Math.max(...GUEST_FUNNEL.map((step) => step.count));
  const brokenStepIndex = GUEST_FUNNEL.findIndex((step, index) => {
    const previous = GUEST_FUNNEL[index - 1];
    return index > 0 && step.count === 0 && Boolean(previous && previous.count > 0);
  });

  return (
    <section>
      <SectionHeader index="03" kicker="Guest funnel" title="Harvest at the door">
        <p className="max-w-lg text-right text-xs uppercase leading-5 tracking-[0.28em] text-white/42">
          A huge guest harvest is reaching Sunday, then stopping before orientation.
        </p>
      </SectionHeader>

      <Reveal className={cn(CARD, "relative overflow-hidden p-5 md:p-7")}>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 15%, rgba(234,179,8,0.18), transparent 34%), radial-gradient(circle at 58% 74%, rgba(239,68,68,0.16), transparent 36%)",
          }}
        />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center">
          <div className="space-y-3">
            {GUEST_FUNNEL.map((step, index) => {
              const isBroken = index === brokenStepIndex;
              const ratio = maxCount > 0 ? step.count / maxCount : 0;
              const visualWidth = step.count > 0 ? Math.max(48, ratio * 100) : Math.max(24, 58 - index * 7);

              return (
                <motion.div
                  key={step.stage}
                  className="mx-auto"
                  style={{ width: `${visualWidth}%` }}
                  initial={{ opacity: 0, scaleX: 0.92, y: 18 }}
                  whileInView={{ opacity: 1, scaleX: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.32 }}
                  transition={{ duration: 0.56, delay: index * 0.08, ease: EASE }}
                >
                  <div
                    className={cn(
                      "relative overflow-hidden border bg-black/70 px-4 py-4 text-center backdrop-blur-md",
                      isBroken
                        ? "border-red-300/45 shadow-[0_0_30px_rgba(248,113,113,0.22)]"
                        : "border-white/10",
                    )}
                    style={{
                      clipPath: "polygon(5% 0, 95% 0, 100% 100%, 0 100%)",
                    }}
                  >
                    <div
                      className="absolute inset-0 opacity-55"
                      style={{
                        background: isBroken
                          ? "linear-gradient(90deg, rgba(127,29,29,0.55), rgba(0,0,0,0.1), rgba(127,29,29,0.55))"
                          : "linear-gradient(90deg, rgba(45,212,191,0.12), rgba(255,255,255,0.03), rgba(234,179,8,0.1))",
                      }}
                    />
                    <div className="relative flex flex-col items-center justify-between gap-2 sm:flex-row">
                      <div className="flex items-center gap-3 text-left">
                        <span
                          className={cn(
                            "grid h-10 w-10 place-items-center border bg-white/[0.04]",
                            isBroken ? "border-red-200/40 text-red-100" : "border-white/10 text-teal-100",
                          )}
                        >
                          {isBroken ? <DoorClosed className="size-5" /> : <UsersRound className="size-5" />}
                        </span>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.3em] text-white/35">
                            Step {String(index + 1).padStart(2, "0")}
                          </p>
                          <p className="mt-1 text-sm font-bold uppercase tracking-[0.08em] text-white md:text-base">
                            {step.stage}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-4xl font-bold text-white">{formatNumber(step.count)}</p>
                        <p className="text-[10px] uppercase tracking-[0.25em] text-white/35">
                          {Math.round(ratio * 100)}% of list
                        </p>
                      </div>
                    </div>
                  </div>
                  {index < GUEST_FUNNEL.length - 1 ? (
                    <ArrowDown className="mx-auto my-2 size-5 text-white/22" />
                  ) : null}
                </motion.div>
              );
            })}
          </div>

          <div className="border border-red-300/25 bg-red-950/20 p-5 shadow-[0_0_28px_rgba(248,113,113,0.16)]">
            <AlertTriangle className="mb-4 size-8 text-red-100" />
            <p className="text-xs uppercase tracking-[0.4em] text-red-100/70">Broken step</p>
            <h4 className="mt-3 text-3xl font-bold uppercase leading-tight tracking-[-0.03em] text-white">
              The door is orientation.
            </h4>
            <p className="mt-4 text-sm uppercase leading-6 tracking-[0.22em] text-white/48">
              Guests are attending, but the next recorded step is empty. Follow-up needs a named owner and a weekly
              handoff.
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function CaptureGuestCard() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [firstSunday, setFirstSunday] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    try {
      const res = await addGuest({
        data: {
          firstName,
          lastName,
          firstSunday,
          notes,
        },
      });

      if (res.ok) {
        celebrate(award("guest_added"));
        toast.success(res.message, {
          description: "Action Queue entry ready for office review.",
        });
        setFirstName("");
        setLastName("");
        setFirstSunday("");
        setNotes("");
      } else {
        toast.error(res.message);
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <Reveal className={cn(CARD, "relative overflow-hidden p-4")} delay={0.02}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 18% 16%, rgba(234,179,8,0.18), transparent 34%), radial-gradient(circle at 84% 70%, rgba(45,212,191,0.12), transparent 32%)",
        }}
      />
      <form className="relative space-y-3" onSubmit={handleSubmit}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-amber-100/75">Capture new guest</p>
            <h4 className="mt-1 text-2xl font-bold uppercase text-white">New face</h4>
          </div>
          <span className="grid h-11 w-11 place-items-center border border-amber-200/30 bg-amber-300/10 text-amber-100">
            <UserPlus className="size-5" />
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[10px] uppercase tracking-[0.26em] text-white/35">First</span>
            <input
              className="h-10 w-full border border-white/10 bg-black/70 px-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-amber-100/45 disabled:cursor-not-allowed disabled:opacity-50"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              disabled={pending}
              required
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] uppercase tracking-[0.26em] text-white/35">Last</span>
            <input
              className="h-10 w-full border border-white/10 bg-black/70 px-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-amber-100/45 disabled:cursor-not-allowed disabled:opacity-50"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              disabled={pending}
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[10px] uppercase tracking-[0.26em] text-white/35">First Sunday</span>
          <input
            className="h-10 w-full border border-white/10 bg-black/70 px-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-amber-100/45 disabled:cursor-not-allowed disabled:opacity-50"
            value={firstSunday}
            onChange={(event) => setFirstSunday(event.target.value)}
            placeholder="6/14/26"
            disabled={pending}
            required
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[10px] uppercase tracking-[0.26em] text-white/35">Note</span>
          <textarea
            className="min-h-20 w-full resize-none border border-white/10 bg-black/70 px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-amber-100/45 disabled:cursor-not-allowed disabled:opacity-50"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={pending}
          />
        </label>

        <button
          type="submit"
          className="flex h-11 w-full items-center justify-center gap-2 border border-amber-100/45 bg-amber-300/10 px-4 text-[10px] font-bold uppercase tracking-[0.28em] text-amber-50 transition hover:bg-amber-300/15 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={pending || firstName.trim().length === 0 || firstSunday.trim().length === 0}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
          Capture
        </button>

        <a
          href={ACTION_QUEUE_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between gap-3 border border-white/10 bg-white/[0.035] p-3 text-[10px] font-bold uppercase leading-5 tracking-[0.22em] text-white/48 transition hover:text-white"
        >
          <span>HQ tracker is protected — actions queue here for the office</span>
          <ExternalLink className="size-4 shrink-0 text-amber-100" />
        </a>
      </form>
    </Reveal>
  );
}

function RecentGuests() {
  return (
    <section>
      <SectionHeader index="04" kicker="New faces" title="Follow-up queue">
        <div className="flex items-center gap-2 text-teal-100">
          <UserPlus className="size-5" />
          <span className="text-xs uppercase tracking-[0.3em]">Follow up</span>
        </div>
      </SectionHeader>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <CaptureGuestCard />
        {RECENT_GUESTS.map((guest, index) => (
          <Reveal key={`${guest.firstName}-${guest.firstSunday}`} className={cn(CARD, "p-4")} delay={index * 0.035}>
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center border border-white/10 bg-white/[0.035]">
                <FloatingNpc
                  src={npcSprites[index % npcSprites.length]}
                  alt={`${guest.firstName} NPC avatar`}
                  className="h-14 w-14"
                />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/35">New face</p>
                <h4 className="truncate text-2xl font-bold uppercase text-white">{guest.firstName}</h4>
                <p className="mt-1 font-mono text-sm text-teal-100">First Sunday {guest.firstSunday}</p>
              </div>
            </div>
            <div className="mt-4 border-t border-white/10 pt-3">
              <p className="text-[10px] uppercase tracking-[0.28em] text-white/38">Frame as care: invite next step</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function PeoplePanel() {
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 24,
    mass: 0.4,
  });
  const haloY = useTransform(smoothProgress, [0, 1], ["0px", "-80px"]);

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
            "radial-gradient(circle at 50% 20%, rgba(45,212,191,0.18), transparent 38%), radial-gradient(circle at 82% 34%, rgba(234,179,8,0.12), transparent 30%)",
        }}
      />

      <div className="relative space-y-12">
        <div className="grid gap-5 border border-white/10 bg-black/60 p-5 backdrop-blur-md md:grid-cols-[minmax(0,1fr)_160px] md:items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-signal">Fellowship</p>
            <h2 className="mt-3 text-5xl font-bold uppercase tracking-[-0.04em] text-white md:text-7xl">
              People are the mission.
            </h2>
          </div>
          <div className="flex justify-center md:justify-end">
            <FloatingNpc src={npcWaveImg} alt="Waving NPC sprite" className="h-32 w-32 md:h-40 md:w-40" />
          </div>
        </div>

        <ActivityBreakdown />
        <DemographicGrid />
        <GuestFunnel />
        <RecentGuests />
      </div>
    </motion.div>
  );
}
