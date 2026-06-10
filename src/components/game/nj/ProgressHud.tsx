import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Flame, Sparkles, Star, Zap } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import adventurerVictoryImg from "@/assets/sprites/adventurer/adventurer_victory.png";
import adventurerIdleImg from "@/assets/sprites/adventurer/adventurer_bible.png";
import mentorCheerImg from "@/assets/sprites/mentor/mentor_cheer.png";
import npcLoveImg from "@/assets/sprites/npc/npc_love.png";
import smartGuyCheerImg from "@/assets/sprites/smart_guy/smart_guy_cheer.png";
import spiritGlowImg from "@/assets/sprites/spirit/spirit_glow.png";
import wizardIdleImg from "@/assets/sprites/wizard/wizard_idle.png";
import {
  rankForXp,
  type AchievementDef,
  type AwardOutcome,
  type Rarity,
  useProgression,
} from "@/lib/progression";
import { cn } from "@/lib/utils";

type CelebrationListener = (outcome: AwardOutcome) => void;
type XpBurst = {
  id: number;
  amount: number;
};
type RankFlash = {
  id: number;
  title: string;
};

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];
const listeners = new Set<CelebrationListener>();
const pendingOutcomes: AwardOutcome[] = [];

let audioContext: AudioContext | null = null;
let burstId = 0;
let rankFlashId = 0;

const spriteByFamily: Record<AchievementDef["sprite"], string> = {
  adventurer: adventurerIdleImg,
  mentor: mentorCheerImg,
  npc: npcLoveImg,
  smart_guy: smartGuyCheerImg,
  spirit: spiritGlowImg,
  wizard: wizardIdleImg,
};

const rarityTone: Record<
  Rarity,
  {
    chip: string;
    glow: string;
    ring: string;
    shadow: string;
    text: string;
  }
> = {
  common: {
    chip: "border-white/30 bg-white/10 text-white",
    glow: "rgba(255,255,255,0.18)",
    ring: "border-white/35",
    shadow: "shadow-[0_0_44px_rgba(255,255,255,0.18)]",
    text: "text-white",
  },
  rare: {
    chip: "border-teal-200/35 bg-teal-300/10 text-teal-100",
    glow: "rgba(45,212,191,0.22)",
    ring: "border-teal-200/45",
    shadow: "shadow-[0_0_54px_rgba(45,212,191,0.25)]",
    text: "text-teal-100",
  },
  epic: {
    chip: "border-violet-200/35 bg-violet-300/10 text-violet-100",
    glow: "rgba(168,85,247,0.25)",
    ring: "border-violet-200/45",
    shadow: "shadow-[0_0_58px_rgba(168,85,247,0.28)]",
    text: "text-violet-100",
  },
  legendary: {
    chip: "border-amber-200/45 bg-amber-300/15 text-amber-100",
    glow: "rgba(250,204,21,0.28)",
    ring: "border-amber-200/55",
    shadow: "shadow-[0_0_68px_rgba(250,204,21,0.32)]",
    text: "text-amber-100",
  },
};

export function celebrate(outcome: AwardOutcome | null) {
  if (!outcome) return;

  if (listeners.size === 0) {
    pendingOutcomes.push(outcome);
    return;
  }

  listeners.forEach((listener) => listener(outcome));
}

function subscribe(listener: CelebrationListener) {
  listeners.add(listener);
  if (pendingOutcomes.length > 0) {
    const queued = pendingOutcomes.splice(0, pendingOutcomes.length);
    queued.forEach((outcome) => listener(outcome));
  }
  return () => listeners.delete(listener);
}

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioCtor =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;
  try {
    audioContext ??= new AudioCtor();
    if (audioContext.state === "suspended") {
      void audioContext.resume();
    }
  } catch {
    return null;
  }
  return audioContext;
}

function playTone(frequency: number, start: number, duration: number, gainValue = 0.035, type: OscillatorType = "sine") {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime + start);
    gain.gain.setValueAtTime(gainValue, ctx.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + duration);
  } catch {
    // Browser audio policy can block non-gesture sounds.
  }
}

function playCelebrationSound(type: "xp" | "achievement" | "rank") {
  if (type === "xp") {
    playTone(740, 0, 0.09, 0.025);
    return;
  }

  if (type === "achievement") {
    [523.25, 659.25, 783.99, 1046.5].forEach((note, index) => {
      playTone(note, index * 0.055, 0.18, 0.035, "triangle");
    });
    return;
  }

  [261.63, 329.63, 392, 523.25].forEach((note) => {
    playTone(note, 0, 0.42, 0.026, "triangle");
  });
  playTone(783.99, 0.1, 0.34, 0.03, "sine");
}

function ParticleRing({
  color,
  reducedMotion,
}: {
  color: string;
  reducedMotion: boolean;
}) {
  if (reducedMotion) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible">
      {Array.from({ length: 24 }, (_, index) => {
        const angle = (index / 24) * Math.PI * 2;
        const distance = 118 + (index % 4) * 18;
        const dx = `${Math.cos(angle) * distance}px`;
        const dy = `${Math.sin(angle) * distance}px`;

        return (
          <span
            key={index}
            className="absolute left-1/2 top-1/2 h-2 w-2"
            style={{
              "--dx": dx,
              "--dy": dy,
              animation: "particle-drift 1s ease-out forwards",
              animationDelay: `${index * 0.015}s`,
              backgroundColor: color,
              boxShadow: `0 0 16px ${color}`,
            } as CSSProperties}
          />
        );
      })}
    </div>
  );
}

function AchievementBanner({
  achievement,
  reducedMotion,
}: {
  achievement: AchievementDef;
  reducedMotion: boolean;
}) {
  const tone = rarityTone[achievement.rarity];
  const sprite = spriteByFamily[achievement.sprite];

  return (
    <motion.div
      className="pointer-events-none fixed left-1/2 top-1/2 z-[70] w-[min(92vw,620px)] -translate-x-1/2 -translate-y-1/2"
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.78, y: 28 }}
      animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.88, y: -18 }}
      transition={
        reducedMotion
          ? { duration: 0.12 }
          : { type: "spring", stiffness: 230, damping: 21, mass: 0.7 }
      }
    >
      <ParticleRing color={achievement.rarity === "common" ? "#ffffff" : tone.glow} reducedMotion={reducedMotion} />
      <div
        className={cn("relative overflow-hidden border bg-black/88 p-5 backdrop-blur-xl md:p-7", tone.ring, tone.shadow)}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(circle at 50% 14%, ${tone.glow}, transparent 42%), radial-gradient(circle at 16% 86%, rgba(79,127,255,0.14), transparent 28%)`,
          }}
        />
        <div className="relative grid gap-5 sm:grid-cols-[128px_minmax(0,1fr)] sm:items-center">
          <div className="mx-auto grid h-32 w-32 place-items-center border border-white/10 bg-black/60">
            <motion.img
              src={sprite}
              alt=""
              className="h-28 w-28 object-contain [image-rendering:pixelated] drop-shadow-2xl"
              animate={reducedMotion ? undefined : { y: [0, -10, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
          <div className="min-w-0 text-center sm:text-left">
            <p className="text-xs font-bold uppercase tracking-[0.42em] text-signal">Achievement unlocked</p>
            <h3 className={cn("display mt-3 text-4xl uppercase leading-none md:text-6xl", tone.text)}>
              {achievement.name}
            </h3>
            <p className="mt-4 text-sm uppercase leading-6 tracking-[0.22em] text-white/58">
              {achievement.description}
            </p>
            <span
              className={cn(
                "mt-5 inline-flex border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.32em]",
                tone.chip,
              )}
            >
              {achievement.rarity}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function RankUpFlash({
  flash,
  reducedMotion,
}: {
  flash: RankFlash;
  reducedMotion: boolean;
}) {
  return (
    <motion.div
      key={flash.id}
      className="fixed inset-x-0 top-[18%] z-[65] border-y border-amber-200/50 bg-amber-300/15 px-4 py-4 text-amber-50 shadow-[0_0_64px_rgba(250,204,21,0.3)] backdrop-blur-md"
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: "-100%" }}
      animate={reducedMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: "100%" }}
      transition={{ duration: reducedMotion ? 0.12 : 0.42, ease: EASE }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-center gap-4">
        <motion.img
          src={adventurerVictoryImg}
          alt=""
          className="h-16 w-16 object-contain [image-rendering:pixelated] drop-shadow-2xl"
          animate={reducedMotion ? undefined : { y: [0, -8, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
        />
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-amber-100/75">Rank up</p>
          <p className="display mt-1 text-4xl uppercase leading-none text-white md:text-6xl">{flash.title}</p>
        </div>
      </div>
    </motion.div>
  );
}

function WizardFlourish({ active, reducedMotion }: { active: boolean; reducedMotion: boolean }) {
  if (!active) return null;

  return (
    <motion.img
      src={wizardIdleImg}
      alt=""
      className="fixed bottom-[12%] left-[-120px] z-[60] h-24 w-24 object-contain [image-rendering:pixelated] drop-shadow-2xl md:h-32 md:w-32"
      initial={{ x: 0, opacity: 0 }}
      animate={reducedMotion ? { opacity: 1, x: "50vw" } : { opacity: [0, 1, 1, 0], x: "112vw", y: [0, -24, 10, -16] }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0.2 : 7.8, ease: "easeInOut" }}
    />
  );
}

function CelebrationLayer() {
  const reducedMotion = Boolean(useReducedMotion());
  const [bursts, setBursts] = useState<XpBurst[]>([]);
  const [achievementQueue, setAchievementQueue] = useState<AchievementDef[]>([]);
  const [activeAchievement, setActiveAchievement] = useState<AchievementDef | null>(null);
  const [rankFlash, setRankFlash] = useState<RankFlash | null>(null);
  const [wizardMode, setWizardMode] = useState(false);
  const activeTimerRef = useRef<number | null>(null);
  const wizardTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return subscribe((outcome) => {
      if (outcome.xpGained > 0) {
        const id = ++burstId;
        setBursts((current) => [...current, { id, amount: outcome.xpGained }]);
        window.setTimeout(() => {
          setBursts((current) => current.filter((burst) => burst.id !== id));
        }, reducedMotion ? 900 : 1500);
        playCelebrationSound("xp");
      }

      if (outcome.leveledUp) {
        const id = ++rankFlashId;
        setRankFlash({ id, title: outcome.rank.title });
        window.setTimeout(() => setRankFlash((current) => (current?.id === id ? null : current)), 1900);
        playCelebrationSound("rank");
      }

      if (outcome.newAchievements.length > 0) {
        setAchievementQueue((current) => [...current, ...outcome.newAchievements]);
        playCelebrationSound("achievement");
      }

      if (outcome.newAchievements.some((achievement) => achievement.id === "egg-konami")) {
        setWizardMode(true);
        if (wizardTimerRef.current) window.clearTimeout(wizardTimerRef.current);
        wizardTimerRef.current = window.setTimeout(() => setWizardMode(false), 8000);
        if (!reducedMotion && typeof document.documentElement.animate === "function") {
          document.documentElement.animate(
            [
              { filter: "hue-rotate(0deg) saturate(1)" },
              { filter: "hue-rotate(120deg) saturate(1.55)" },
              { filter: "hue-rotate(280deg) saturate(1.35)" },
              { filter: "hue-rotate(0deg) saturate(1)" },
            ],
            { duration: 8000, easing: "ease-in-out" },
          );
        }
      }
    });
  }, [reducedMotion]);

  useEffect(() => {
    if (activeAchievement || achievementQueue.length === 0) return;

    const [next, ...rest] = achievementQueue;
    setActiveAchievement(next);
    setAchievementQueue(rest);
    activeTimerRef.current = window.setTimeout(() => {
      setActiveAchievement(null);
    }, 3500);

    return () => {
      if (activeTimerRef.current) window.clearTimeout(activeTimerRef.current);
    };
  }, [activeAchievement, achievementQueue]);

  useEffect(() => {
    return () => {
      if (activeTimerRef.current) window.clearTimeout(activeTimerRef.current);
      if (wizardTimerRef.current) window.clearTimeout(wizardTimerRef.current);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <AnimatePresence>
        {bursts.map((burst, index) => (
          <motion.div
            key={burst.id}
            className="absolute left-1/2 top-[158px] -translate-x-1/2 border border-amber-100/45 bg-black/80 px-4 py-2 font-mono text-xl font-bold text-amber-100 shadow-[0_0_24px_rgba(250,204,21,0.26)] backdrop-blur-md"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.86 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: -38 - index * 8, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -78, scale: 0.92 }}
            transition={{ duration: reducedMotion ? 0.12 : 0.58, ease: EASE }}
          >
            +{burst.amount} XP
          </motion.div>
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {rankFlash ? <RankUpFlash flash={rankFlash} reducedMotion={reducedMotion} /> : null}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {activeAchievement ? (
          <AchievementBanner
            key={activeAchievement.id}
            achievement={activeAchievement}
            reducedMotion={reducedMotion}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        <WizardFlourish active={wizardMode} reducedMotion={reducedMotion} />
      </AnimatePresence>
    </div>
  );
}

function useKonami(onUnlock: () => void) {
  useEffect(() => {
    const sequence = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
    let index = 0;

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (key === sequence[index]) {
        index += 1;
        if (index === sequence.length) {
          index = 0;
          onUnlock();
        }
        return;
      }
      index = key === sequence[0] ? 1 : 0;
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onUnlock]);
}

export function ProgressHud({
  onKonami,
  onEarlyBird,
  onNightOwl,
}: {
  onKonami: () => void;
  onEarlyBird: () => void;
  onNightOwl: () => void;
}) {
  const progress = useProgression();
  const rank = useMemo(() => rankForXp(progress.xp), [progress.xp]);
  const nextXp = rank.next ? rank.next.xp : rank.xp;
  const currentRankSpan = rank.next ? rank.next.xp - rank.xp : 1;
  const earnedIntoRank = rank.next ? progress.xp - rank.xp : currentRankSpan;
  const progressPct = rank.next ? Math.round(rank.progress * 100) : 100;

  useKonami(onKonami);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5) {
      onNightOwl();
    } else if (hour >= 5 && hour < 6) {
      onEarlyBird();
    }
  }, [onEarlyBird, onNightOwl]);

  return (
    <>
      <motion.section
        className="relative overflow-hidden border border-white/10 bg-black/65 px-4 py-3 backdrop-blur-md"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 14% 24%, rgba(250,204,21,0.14), transparent 28%), radial-gradient(circle at 78% 80%, rgba(45,212,191,0.1), transparent 30%)",
          }}
        />
        <div className="relative grid gap-3 lg:grid-cols-[minmax(190px,0.34fr)_minmax(0,1fr)_auto] lg:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center border border-amber-200/30 bg-amber-300/10 text-amber-100">
              <Zap className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold uppercase tracking-[0.18em] text-white">
                LV {rank.level} <span className="text-white/35">·</span> {rank.title}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.28em] text-white/38">
                {progress.xp.toLocaleString("en-US")} total XP
              </p>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.24em] text-white/38">
              <span>{rank.next ? `${earnedIntoRank}/${currentRankSpan} to ${rank.next.title}` : "Max rank secured"}</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-3 border border-white/10 bg-white/[0.04]">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-300 via-yellow-100 to-teal-100 shadow-[0_0_18px_rgba(250,204,21,0.38)]"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.72, ease: EASE }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 lg:justify-end">
            <span className="inline-flex items-center gap-2 border border-white/10 bg-white/[0.035] px-3 py-2 font-mono text-sm font-bold text-white">
              <Star className="size-4 text-amber-100" />
              {nextXp.toLocaleString("en-US")}
            </span>
            {progress.visitStreak >= 2 ? (
              <span className="inline-flex items-center gap-2 border border-red-200/30 bg-red-300/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.24em] text-red-100">
                <Flame className="size-4" />
                {progress.visitStreak} day streak
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 border border-teal-200/20 bg-teal-300/5 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.24em] text-teal-100/70">
                <Sparkles className="size-4" />
                Console XP
              </span>
            )}
          </div>
        </div>
      </motion.section>
      <CelebrationLayer />
    </>
  );
}
