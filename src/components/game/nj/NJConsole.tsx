import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  CalendarDays,
  Coins,
  Heart,
  MapPin,
  Radar,
  ScrollText,
  Sparkles,
  Trophy,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { Toaster } from "sonner";

import adventurerSprite from "@/assets/sprites/adventurer/adventurer_victory.png";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TEAM_LABELS } from "@/lib/comebackData";
import { NJ_PROFILE, SNAPSHOT_DATE } from "@/lib/njData";
import { recordDailyVisit, recordTabVisit, unlockEgg } from "@/lib/progression";
import { cn } from "@/lib/utils";
import { AttendancePanel } from "./AttendancePanel";
import { BlessingPanel } from "./BlessingPanel";
import { FinancePanel } from "./FinancePanel";
import { OverviewPanel } from "./OverviewPanel";
import { OutreachPanel } from "./OutreachPanel";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PartyPanel } from "./party/PartyPanel";
import { PeoplePanel } from "./PeoplePanel";
import { celebrate, ProgressHud } from "./ProgressHud";
import { QuestsPanel } from "./QuestsPanel";
import { TrophyRoom } from "./TrophyRoom";

export const NJ_TAB_IDS = [
  "overview",
  "finance",
  "attendance",
  "people",
  "blessing",
  "quests",
  "outreach",
  "trophies",
] as const;

export type NJTabId = (typeof NJ_TAB_IDS)[number];

type NJConsoleProps = {
  activeTab: NJTabId;
  onTabChange: (tab: NJTabId) => void;
};

type TabConfig = {
  id: NJTabId;
  label: string;
  icon: LucideIcon;
};

type Star = {
  id: number;
  left: string;
  top: string;
  size: number;
  opacity: number;
};

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const TABS = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "finance", label: "Finance", icon: Coins },
  { id: "attendance", label: "Attendance", icon: CalendarDays },
  { id: "people", label: "People", icon: Users },
  { id: "blessing", label: "Blessing", icon: Heart },
  { id: "quests", label: "Quests", icon: ScrollText },
  { id: "outreach", label: "Outreach", icon: Radar },
  { id: "trophies", label: "Trophies", icon: Trophy },
] satisfies TabConfig[];

function makeStars(count: number, offset = 0): Star[] {
  return Array.from({ length: count }, (_, index) => {
    const id = index + offset;
    return {
      id,
      left: `${(id * 41) % 101}%`,
      top: `${(id * 59) % 103}%`,
      size: 1 + (id % 3),
      opacity: 0.18 + (id % 6) * 0.08,
    };
  });
}

function CosmicBackdrop() {
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 24,
    mass: 0.4,
  });
  const farY = useTransform(smoothProgress, [0, 1], ["0px", "-110px"]);
  const nearY = useTransform(smoothProgress, [0, 1], ["0px", "-240px"]);

  const farStars = useMemo(() => makeStars(58), []);
  const nearStars = useMemo(() => makeStars(38, 120), []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#0a0a0b]">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 20%, rgba(79,127,255,0.2), transparent 35%), radial-gradient(circle at 18% 64%, rgba(45,212,191,0.14), transparent 30%), radial-gradient(circle at 84% 72%, rgba(250,204,21,0.12), transparent 34%)",
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
              animationDelay: `${(star.id * 0.17) % 4}s`,
            }}
          />
        ))}
      </motion.div>
      <motion.div className="absolute inset-0" style={{ y: nearY }}>
        {nearStars.map((star) => (
          <span
            key={star.id}
            className={cn("absolute bg-cyan-100", star.id % 3 === 0 && "animate-twinkle")}
            style={{
              left: star.left,
              top: star.top,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
              animationDelay: `${(star.id * 0.23) % 5}s`,
            }}
          />
        ))}
      </motion.div>
      <span className="animate-shooting-star absolute left-[88%] top-[12%] h-[1px] w-[112px] bg-gradient-to-r from-white via-white/50 to-transparent" />
      <span className="animate-shooting-star absolute left-[68%] top-[42%] h-[1px] w-[92px] bg-gradient-to-r from-cyan-100 via-white/45 to-transparent [animation-delay:4s]" />
      <div className="absolute inset-x-0 bottom-0 h-60 bg-gradient-to-t from-[#0a0a0b] to-transparent" />
    </div>
  );
}

function HeaderStarfield() {
  const stars = useMemo(() => makeStars(26, 300), []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {stars.map((star) => (
        <span
          key={star.id}
          className={cn("absolute bg-white", star.id % 2 === 0 && "animate-twinkle")}
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            opacity: star.opacity,
            animationDelay: `${(star.id * 0.11) % 4}s`,
          }}
        />
      ))}
      <span className="animate-shooting-star absolute left-[92%] top-[22%] h-[1px] w-24 bg-gradient-to-r from-white via-white/50 to-transparent [animation-delay:2.4s]" />
    </div>
  );
}

function HeaderChip({ children }: { children: ReactNode }) {
  return (
    <span className="border border-white/15 bg-white/[0.03] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.28em] text-white/72">
      {children}
    </span>
  );
}

function ConsoleHeader({
  mascotPulse,
  onMascotClick,
  onOpenParty,
}: {
  mascotPulse: number;
  onMascotClick: () => void;
  onOpenParty: () => void;
}) {
  return (
    <motion.header
      className="relative overflow-hidden border border-white/10 bg-black/60 p-5 backdrop-blur-md md:p-7"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, ease: EASE }}
    >
      <HeaderStarfield />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 25% 10%, rgba(79,127,255,0.22), transparent 34%), radial-gradient(circle at 78% 42%, rgba(45,212,191,0.16), transparent 30%)",
        }}
      />
      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_210px] lg:items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-signal">
            New Jersey console
          </p>
          <h1 className="display mt-3 text-[17vw] uppercase text-white sm:text-[12vw] lg:text-[6.6rem]">
            {NJ_PROFILE.shortName}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <p className="mr-2 text-xs font-bold uppercase tracking-[0.34em] text-white/80">
              {NJ_PROFILE.name}
            </p>
            <HeaderChip>{NJ_PROFILE.sizeTier}</HeaderChip>
            <HeaderChip>{TEAM_LABELS[NJ_PROFILE.team]}</HeaderChip>
            <HeaderChip>{NJ_PROFILE.ownership}</HeaderChip>
          </div>
          <div className="mt-5 grid gap-3 text-xs uppercase tracking-[0.24em] text-white/50 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-cyan-100" />
              <span>
                {NJ_PROFILE.address} / Capacity {NJ_PROFILE.capacity}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-amber-100" />
              <span>Snapshot {SNAPSHOT_DATE}</span>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[11px] uppercase tracking-[0.22em] text-white/45">
            {NJ_PROFILE.pastors.map((pastor) => (
              <span key={pastor.name}>
                {pastor.role}: <span className="text-white/70">{pastor.name}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="mx-auto flex flex-col items-center gap-3">
          <motion.button
            type="button"
            className="flex h-40 w-40 cursor-pointer items-center justify-center border border-white/10 bg-black/50 shadow-[0_0_28px_rgba(45,212,191,0.18)] outline-none transition hover:border-teal-100/45 focus-visible:border-teal-100/70 md:h-48 md:w-48"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
            onClick={onMascotClick}
            aria-label="Adventurer mascot"
          >
            <motion.div
              key={mascotPulse}
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ duration: 0.22, ease: EASE }}
            >
              <img
                src={adventurerSprite}
                alt=""
                className="h-32 w-32 object-contain [image-rendering:pixelated] drop-shadow-2xl md:h-40 md:w-40"
              />
            </motion.div>
          </motion.button>
          <button
            type="button"
            onClick={onOpenParty}
            className="flex w-40 items-center justify-center gap-2 border border-teal-200/35 bg-teal-300/10 px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.26em] text-teal-100 shadow-[0_0_22px_rgba(45,212,191,0.18)] backdrop-blur-md transition hover:border-teal-100/60 hover:bg-teal-300/20 md:w-48"
          >
            <UsersRound className="size-4" />
            Your Party
          </button>
        </div>
      </div>
    </motion.header>
  );
}

export function NJConsole({ activeTab, onTabChange }: NJConsoleProps) {
  const mascotClicksRef = useRef(0);
  const [mascotPulse, setMascotPulse] = useState(0);
  const [partyOpen, setPartyOpen] = useState(false);

  const handleMascotClick = useCallback(() => {
    setMascotPulse((current) => current + 1);
    mascotClicksRef.current += 1;
    if (mascotClicksRef.current === 7) {
      celebrate(unlockEgg("egg-mascot"));
    }
  }, []);

  const handleKonami = useCallback(() => {
    celebrate(unlockEgg("egg-konami"));
  }, []);

  const handleNightOwl = useCallback(() => {
    celebrate(unlockEgg("egg-night-owl"));
  }, []);

  const handleEarlyBird = useCallback(() => {
    celebrate(unlockEgg("egg-early-bird"));
  }, []);

  useEffect(() => {
    celebrate(recordDailyVisit());
  }, []);

  useEffect(() => {
    celebrate(recordTabVisit(activeTab));
  }, [activeTab]);

  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      <Toaster
        richColors
        theme="dark"
        position="top-right"
        toastOptions={{
          classNames: {
            toast: "border border-white/10 bg-black/90 text-white backdrop-blur-md",
            title: "text-sm font-bold uppercase tracking-[0.16em]",
            description: "text-white/60",
          },
        }}
      />
      <CosmicBackdrop />
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 md:px-8 lg:px-10">
        <ConsoleHeader
          mascotPulse={mascotPulse}
          onMascotClick={handleMascotClick}
          onOpenParty={() => setPartyOpen(true)}
        />
        <Dialog open={partyOpen} onOpenChange={setPartyOpen}>
          <DialogContent
            className="h-[92dvh] w-[min(96vw,1280px)] max-w-none overflow-y-auto rounded-none border-white/15 bg-[#070710]/97 p-5 text-white backdrop-blur-xl md:p-8"
            aria-describedby={undefined}
          >
            <DialogTitle className="sr-only">Your Party</DialogTitle>
            <PartyPanel />
          </DialogContent>
        </Dialog>
        <ProgressHud onKonami={handleKonami} onEarlyBird={handleEarlyBird} onNightOwl={handleNightOwl} />

        <Tabs
          value={activeTab}
          onValueChange={(value) => onTabChange(value as NJTabId)}
          className="w-full"
        >
          <TabsList className="grid h-auto w-full grid-cols-2 gap-px border border-white/10 bg-black/70 p-0 text-white/50 backdrop-blur-md md:grid-cols-4 xl:grid-cols-9">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="relative h-14 rounded-none border-0 bg-black/40 px-3 py-3 text-[10px] font-bold uppercase tracking-[0.3em] text-white/45 shadow-none transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-transparent hover:bg-white/[0.06] hover:text-white data-[state=active]:bg-white/[0.08] data-[state=active]:text-white data-[state=active]:shadow-[0_0_18px_rgba(239,68,68,0.28)] data-[state=active]:after:bg-signal"
                >
                  <Icon className="mr-2 size-4 shrink-0" />
                  <span>{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="overview" className="mt-5">
            <OverviewPanel />
          </TabsContent>
          <TabsContent value="finance" className="mt-5">
            <FinancePanel />
          </TabsContent>
          <TabsContent value="attendance" className="mt-5">
            <AttendancePanel />
          </TabsContent>
          <TabsContent value="people" className="mt-5">
            <PeoplePanel />
          </TabsContent>
          <TabsContent value="blessing" className="mt-5">
            <BlessingPanel />
          </TabsContent>
          <TabsContent value="quests" className="mt-5">
            <QuestsPanel />
          </TabsContent>
          <TabsContent value="outreach" className="mt-5">
            <OutreachPanel />
          </TabsContent>
          <TabsContent value="trophies" className="mt-5">
            <TrophyRoom />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
