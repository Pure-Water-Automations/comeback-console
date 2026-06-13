import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Check,
  ExternalLink,
  Loader2,
  Radar,
  Send,
  Sparkles,
  UserCheck,
  Database,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { toast } from "sonner";

import mentorCoffeeImg from "@/assets/sprites/mentor/mentor_coffee.png";
import mentorLetterImg from "@/assets/sprites/mentor/mentor_letter.png";
import npcSaluteImg from "@/assets/sprites/npc/npc_salute.png";
import npcWaveImg from "@/assets/sprites/npc/npc_wave.png";
import { ACTION_QUEUE_URL } from "@/lib/njActions";
import {
  fetchOutreachRadar,
  queueOutreach,
  type OutreachAction,
  type OutreachRadar,
  type RadarPerson,
} from "@/lib/njInsights";
import { award, awardOnce } from "@/lib/progression";
import { cn } from "@/lib/utils";
import { DataPatrolSection } from "./DataPatrolSection";
import { celebrate } from "./ProgressHud";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];
const CARD = "border border-white/10 bg-black/60 backdrop-blur-md";

type SectionId = "conversionGuests" | "oneAway" | "slipping";

type SectionConfig = {
  id: SectionId;
  index: string;
  title: string;
  subtitle: string;
  action: OutreachAction;
  buttonLabel: string;
  accentText: string;
  accentBorder: string;
  accentBg: string;
  glow: string;
  sprite: string;
  spriteAlt: string;
  reason: (person: RadarPerson) => string;
};

const EMPTY_RADAR: OutreachRadar = {
  ok: true,
  conversionGuests: [],
  oneAway: [],
  slipping: [],
  totals: { conversionGuests: 0, oneAway: 0, slipping: 0 },
};

const SECTIONS: SectionConfig[] = [
  {
    id: "conversionGuests",
    index: "01",
    title: "Ready to convert",
    subtitle: "Guests who attended 3+ times in the last 3 months.",
    action: "membership-invite",
    buttonLabel: "Invite to membership",
    accentText: "text-amber-100",
    accentBorder: "border-amber-200/35",
    accentBg: "bg-amber-300/10",
    glow: "rgba(234,179,8,0.18)",
    sprite: npcWaveImg,
    spriteAlt: "NPC wave sprite",
    reason: (person) => `Guest, ${person.lastThreeMonths} attendances in the last 3 months`,
  },
  {
    id: "oneAway",
    index: "02",
    title: "One visit away",
    subtitle: "Exactly 2 attendances, one short of Active.",
    action: "comeback-nudge",
    buttonLabel: "Send comeback nudge",
    accentText: "text-teal-100",
    accentBorder: "border-teal-200/35",
    accentBg: "bg-teal-300/10",
    glow: "rgba(45,212,191,0.18)",
    sprite: mentorLetterImg,
    spriteAlt: "Mentor letter sprite",
    reason: (person) =>
      `${person.name} has attended twice in the last 3 months and is one visit away from Active`,
  },
  {
    id: "slipping",
    index: "03",
    title: "Slipping active",
    subtitle: "Active members at exactly 3, close to dropping.",
    action: "coffee-invite",
    buttonLabel: "Invite for coffee",
    accentText: "text-violet-100",
    accentBorder: "border-violet-200/35",
    accentBg: "bg-violet-300/10",
    glow: "rgba(168,85,247,0.18)",
    sprite: mentorCoffeeImg,
    spriteAlt: "Mentor coffee sprite",
    reason: (person) =>
      `${person.name} is Active with 3 attendances in the last 3 months and may slip without follow-up`,
  },
];

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

function personKey(person: RadarPerson, action: OutreachAction) {
  return `${action}::${person.name}`;
}

function lastSeenLine(person: RadarPerson) {
  const date = person.lastAttended || "No recent date";
  const event = person.lastEvent || "No event recorded";
  return `${date} · ${event}`;
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
    <motion.div className={className} transition={{ duration: 0.62, delay, ease: EASE }}>
      {children}
    </motion.div>
  );
}

function CountBadge({ value, loading }: { value: number; loading: boolean }) {
  return (
    <span className="border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-sm font-bold text-white">
      {loading ? "..." : formatNumber(value)}
    </span>
  );
}

function Mascot({ config }: { config: SectionConfig }) {
  return (
    <motion.div
      className={cn(
        "hidden h-24 w-24 shrink-0 items-center justify-center border bg-black/35 md:flex",
        config.accentBorder,
      )}
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
    >
      <img
        src={config.sprite}
        alt={config.spriteAlt}
        className="h-20 w-20 object-contain [image-rendering:pixelated] drop-shadow-2xl"
      />
    </motion.div>
  );
}

function LoadingRows({ config }: { config: SectionConfig }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="grid gap-3 border border-white/10 bg-white/[0.03] p-4">
          <div className="space-y-3">
            <div className="h-4 w-2/5 animate-pulse bg-white/12" />
            <div className="h-3 w-4/5 animate-pulse bg-white/8" />
          </div>
          <div className={cn("h-10 animate-pulse border", config.accentBorder, config.accentBg)} />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ config }: { config: SectionConfig }) {
  return (
    <div className="border border-white/10 bg-white/[0.03] p-5">
      <p className="text-sm uppercase leading-6 tracking-[0.22em] text-white/42">
        No names in this lane right now.
      </p>
      <p className={cn("mt-3 text-[10px] uppercase tracking-[0.28em]", config.accentText)}>
        Radar clear
      </p>
    </div>
  );
}

function PersonRow({
  config,
  person,
  pending,
  queued,
  onQueue,
}: {
  config: SectionConfig;
  person: RadarPerson;
  pending: boolean;
  queued: boolean;
  onQueue: (config: SectionConfig, person: RadarPerson) => void;
}) {
  return (
    <motion.article
      className="grid gap-4 border border-white/10 bg-white/[0.035] p-4"
      transition={{ duration: 0.5, ease: EASE }}
    >
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h4 className="min-w-0 text-xl font-bold uppercase leading-tight text-white">
            {person.name}
          </h4>
          <span
            className={cn(
              "border px-2 py-1 font-mono text-xs font-bold",
              config.accentBorder,
              config.accentText,
            )}
          >
            {person.lastThreeMonths}x in 3 months
          </span>
        </div>
        <p className="text-[10px] uppercase leading-5 tracking-[0.26em] text-white/42">
          {lastSeenLine(person)}
        </p>
        <p className="mt-2 text-[10px] uppercase tracking-[0.24em] text-white/28">
          {person.status || "Status unknown"} / {person.activity || "Activity unknown"}
        </p>
      </div>

      <button
        type="button"
        className={cn(
          "flex h-11 w-full items-center justify-center gap-2 border px-3 text-[10px] font-bold uppercase tracking-[0.22em] transition disabled:cursor-not-allowed",
          queued
            ? "border-white/10 bg-white/[0.025] text-white/32"
            : cn(
                config.accentBorder,
                config.accentBg,
                config.accentText,
                "hover:bg-white/[0.08] disabled:opacity-45",
              ),
        )}
        disabled={pending || queued}
        onClick={() => onQueue(config, person)}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : queued ? (
          <Check className="size-4" />
        ) : (
          <Send className="size-4" />
        )}
        {queued ? "Queued ✓" : config.buttonLabel}
      </button>
    </motion.article>
  );
}

function RadarSection({
  config,
  people,
  total,
  loading,
  pendingKeys,
  queuedKeys,
  onQueue,
}: {
  config: SectionConfig;
  people: RadarPerson[];
  total: number;
  loading: boolean;
  pendingKeys: Set<string>;
  queuedKeys: Set<string>;
  onQueue: (config: SectionConfig, person: RadarPerson) => void;
}) {
  return (
    <Reveal
      className={cn(CARD, "relative overflow-hidden p-5")}
      delay={Number(config.index) * 0.05}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at 16% 18%, ${config.glow}, transparent 34%), radial-gradient(circle at 86% 72%, rgba(255,255,255,0.06), transparent 32%)`,
        }}
      />
      <div className="relative">
        <div className="mb-5 flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Mascot config={config} />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.34em] text-white/35">
                {config.index} · Low-hanging fruit
              </p>
              <h3 className="mt-1 text-3xl font-bold uppercase tracking-[-0.03em] text-white md:text-4xl">
                {config.title}
              </h3>
              <p className="mt-2 text-xs uppercase leading-5 tracking-[0.22em] text-white/42">
                {config.subtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.28em] text-white/35">Count</span>
            <CountBadge value={total} loading={loading} />
          </div>
        </div>

        {loading ? (
          <LoadingRows config={config} />
        ) : people.length ? (
          <div className="grid gap-3">
            {people.map((person) => {
              const key = personKey(person, config.action);
              return (
                <PersonRow
                  key={key}
                  config={config}
                  person={person}
                  pending={pendingKeys.has(key)}
                  queued={queuedKeys.has(key)}
                  onQueue={onQueue}
                />
              );
            })}
            {total > people.length ? (
              <p className="pt-1 text-[10px] uppercase tracking-[0.24em] text-white/30">
                Showing top {people.length} of {formatNumber(total)} live matches.
              </p>
            ) : null}
          </div>
        ) : (
          <EmptyState config={config} />
        )}
      </div>
    </Reveal>
  );
}

export function OutreachPanel() {
  const [radar, setRadar] = useState<OutreachRadar | null>(null);
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(() => new Set());
  const [queuedKeys, setQueuedKeys] = useState<Set<string>>(() => new Set());
  const [activeSubTab, setActiveSubTab] = useState<string>("ready");
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 24,
    mass: 0.4,
  });
  const haloY = useTransform(smoothProgress, [0, 1], ["0px", "-84px"]);
  const data = radar ?? EMPTY_RADAR;
  const loading = radar === null;

  const totals = useMemo(() => data.totals, [data.totals]);

  useEffect(() => {
    let cancelled = false;

    async function loadRadar() {
      try {
        const res = await fetchOutreachRadar();
        if (cancelled) return;
        setRadar(res);
        if (!res.ok) {
          toast.error(res.message || "Could not load outreach radar.");
        }
      } catch (err) {
        if (cancelled) return;
        setRadar({
          ...EMPTY_RADAR,
          ok: false,
          message: err instanceof Error ? err.message : String(err),
        });
        toast.error("Could not load outreach radar.");
      }
    }

    void loadRadar();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleQueue = useCallback(async (config: SectionConfig, person: RadarPerson) => {
    const key = personKey(person, config.action);
    setPendingKeys((current) => {
      const next = new Set(current);
      next.add(key);
      return next;
    });

    try {
      const res = await queueOutreach({
        data: {
          person: person.name,
          action: config.action,
          reason: config.reason(person),
        },
      });

      if (res.ok) {
        celebrate(award("outreach_sent"));
        celebrate(awardOnce("feature_first_use", "feature:outreach"));
        setQueuedKeys((current) => {
          const next = new Set(current);
          next.add(key);
          return next;
        });
        toast.success(res.message, {
          description: "Action Queue entry ready for office review.",
        });
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error("Could not queue outreach.", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setPendingKeys((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  }, []);

  return (
    <motion.section
      className="relative overflow-hidden text-white"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE }}
    >
      <motion.div
        className="pointer-events-none absolute inset-x-0 top-0 h-96 opacity-90"
        style={{
          y: haloY,
          background:
            "radial-gradient(circle at 50% 20%, rgba(79,127,255,0.18), transparent 35%), radial-gradient(circle at 18% 62%, rgba(45,212,191,0.13), transparent 32%), radial-gradient(circle at 86% 64%, rgba(234,179,8,0.11), transparent 34%)",
        }}
      />

      <div className="relative space-y-5">
        <Reveal className={cn(CARD, "relative overflow-hidden p-5 md:p-7")}>
          <div className="pointer-events-none absolute inset-0">
            <span className="animate-twinkle absolute left-[12%] top-[24%] h-1 w-1 bg-white/70" />
            <span className="animate-twinkle absolute left-[74%] top-[18%] h-1 w-1 bg-cyan-100/80 [animation-delay:1.2s]" />
            <span className="animate-shooting-star absolute left-[94%] top-[16%] h-[1px] w-24 bg-gradient-to-r from-white via-white/45 to-transparent [animation-delay:2.8s]" />
          </div>
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 24% 18%, rgba(79,127,255,0.2), transparent 35%), radial-gradient(circle at 82% 62%, rgba(168,85,247,0.15), transparent 34%)",
            }}
          />

          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-signal">07 · Outreach</p>
              <h2 className="display mt-3 text-[15vw] uppercase text-white sm:text-[10vw] lg:text-[5.8rem]">
                Harvest radar
              </h2>
              <p className="mt-5 max-w-3xl text-sm uppercase leading-6 tracking-[0.22em] text-white/48">
                These are the people one step from the next level of engagement: repeat guests,
                near-active attenders, and active members who need a timely pastoral touch.
              </p>
              <a
                href={ACTION_QUEUE_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex max-w-full items-center gap-3 border border-white/10 bg-white/[0.035] px-3 py-2 text-[10px] font-bold uppercase leading-5 tracking-[0.2em] text-white/48 transition hover:border-cyan-100/35 hover:text-white"
              >
                <span>
                  Review-only POC — invites queue for the office, nothing sends automatically
                </span>
                <ExternalLink className="size-4 shrink-0 text-cyan-100" />
              </a>
            </div>

            <motion.div
              className="mx-auto flex h-40 w-40 items-center justify-center border border-cyan-100/25 bg-black/45 shadow-[0_0_28px_rgba(45,212,191,0.16)] md:h-48 md:w-48"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
            >
              <img
                src={npcSaluteImg}
                alt="NPC salute sprite"
                className="h-32 w-32 object-contain [image-rendering:pixelated] drop-shadow-2xl md:h-40 md:w-40"
              />
            </motion.div>
          </div>
        </Reveal>

        <div className="grid gap-3 border border-white/10 bg-black/60 p-4 backdrop-blur-md md:grid-cols-3">
          <button
            type="button"
            onClick={() => setActiveSubTab("ready")}
            className={cn(
              "text-left border border-white/10 bg-white/[0.035] p-4 transition-all hover:bg-white/[0.06] cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-200/50",
              activeSubTab === "ready" && "ring-1 ring-amber-200/50 bg-white/[0.06]",
            )}
          >
            <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/35">
              <Radar className="size-4 text-amber-100" />
              Ready
            </p>
            <p className="mt-1 font-mono text-3xl font-bold text-amber-100">
              {loading ? "..." : formatNumber(totals.conversionGuests)}
            </p>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("oneAway")}
            className={cn(
              "text-left border border-white/10 bg-white/[0.035] p-4 transition-all hover:bg-white/[0.06] cursor-pointer focus:outline-none focus:ring-1 focus:ring-teal-200/50",
              activeSubTab === "oneAway" && "ring-1 ring-teal-200/50 bg-white/[0.06]",
            )}
          >
            <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/35">
              <Sparkles className="size-4 text-teal-100" />
              One away
            </p>
            <p className="mt-1 font-mono text-3xl font-bold text-teal-100">
              {loading ? "..." : formatNumber(totals.oneAway)}
            </p>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("slipping")}
            className={cn(
              "text-left border border-white/10 bg-white/[0.035] p-4 transition-all hover:bg-white/[0.06] cursor-pointer focus:outline-none focus:ring-1 focus:ring-violet-200/50",
              activeSubTab === "slipping" && "ring-1 ring-violet-200/50 bg-white/[0.06]",
            )}
          >
            <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/35">
              <Radar className="size-4 text-violet-100" />
              Slipping
            </p>
            <p className="mt-1 font-mono text-3xl font-bold text-violet-100">
              {loading ? "..." : formatNumber(totals.slipping)}
            </p>
          </button>
        </div>

        <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full space-y-5">
          <TabsList className="inline-flex h-auto w-full md:w-auto flex-wrap gap-2 rounded-none border-0 bg-transparent p-0">
            <TabsTrigger
              value="ready"
              className="relative h-10 rounded-none border border-white/10 bg-black/40 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/45 shadow-none transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-transparent hover:bg-white/[0.06] hover:text-white data-[state=active]:bg-white/[0.08] data-[state=active]:text-white data-[state=active]:shadow-[0_0_18px_rgba(45,212,191,0.28)] data-[state=active]:after:bg-teal-400 cursor-pointer"
            >
              <UserCheck className="mr-2 size-3.5 shrink-0 text-amber-100" />
              <span>Ready to Convert</span>
            </TabsTrigger>
            <TabsTrigger
              value="oneAway"
              className="relative h-10 rounded-none border border-white/10 bg-black/40 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/45 shadow-none transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-transparent hover:bg-white/[0.06] hover:text-white data-[state=active]:bg-white/[0.08] data-[state=active]:text-white data-[state=active]:shadow-[0_0_18px_rgba(45,212,191,0.28)] data-[state=active]:after:bg-teal-400 cursor-pointer"
            >
              <Sparkles className="mr-2 size-3.5 shrink-0 text-teal-100" />
              <span>One Visit Away</span>
            </TabsTrigger>
            <TabsTrigger
              value="slipping"
              className="relative h-10 rounded-none border border-white/10 bg-black/40 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/45 shadow-none transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-transparent hover:bg-white/[0.06] hover:text-white data-[state=active]:bg-white/[0.08] data-[state=active]:text-white data-[state=active]:shadow-[0_0_18px_rgba(45,212,191,0.28)] data-[state=active]:after:bg-teal-400 cursor-pointer"
            >
              <Radar className="mr-2 size-3.5 shrink-0 text-violet-100" />
              <span>Slipping</span>
            </TabsTrigger>
            <TabsTrigger
              value="dataPatrol"
              className="relative h-10 rounded-none border border-white/10 bg-black/40 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/45 shadow-none transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-transparent hover:bg-white/[0.06] hover:text-white data-[state=active]:bg-white/[0.08] data-[state=active]:text-white data-[state=active]:shadow-[0_0_18px_rgba(45,212,191,0.28)] data-[state=active]:after:bg-teal-400 cursor-pointer"
            >
              <Database className="mr-2 size-3.5 shrink-0 text-cyan-100" />
              <span>Data Patrol</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ready" className="mt-5 outline-none">
            <RadarSection
              config={SECTIONS[0]}
              people={data.conversionGuests}
              total={totals.conversionGuests}
              loading={loading}
              pendingKeys={pendingKeys}
              queuedKeys={queuedKeys}
              onQueue={handleQueue}
            />
          </TabsContent>
          <TabsContent value="oneAway" className="mt-5 outline-none">
            <RadarSection
              config={SECTIONS[1]}
              people={data.oneAway}
              total={totals.oneAway}
              loading={loading}
              pendingKeys={pendingKeys}
              queuedKeys={queuedKeys}
              onQueue={handleQueue}
            />
          </TabsContent>
          <TabsContent value="slipping" className="mt-5 outline-none">
            <RadarSection
              config={SECTIONS[2]}
              people={data.slipping}
              total={totals.slipping}
              loading={loading}
              pendingKeys={pendingKeys}
              queuedKeys={queuedKeys}
              onQueue={handleQueue}
            />
          </TabsContent>
          <TabsContent value="dataPatrol" className="mt-5 outline-none">
            <DataPatrolSection />
          </TabsContent>
        </Tabs>
      </div>
    </motion.section>
  );
}
