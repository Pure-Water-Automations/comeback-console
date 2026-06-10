import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Crown, Maximize2, Minimize2, Sparkles, Trophy, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import adventurerVictoryImg from "@/assets/sprites/adventurer/adventurer_victory.png";
import mentorCheerImg from "@/assets/sprites/mentor/mentor_cheer.png";
import npcLoveImg from "@/assets/sprites/npc/npc_love.png";
import smartGuyCheerImg from "@/assets/sprites/smart_guy/smart_guy_cheer.png";
import spiritGlowImg from "@/assets/sprites/spirit/spirit_glow.png";
import wizardTalkingImg from "@/assets/sprites/wizard/wizard_talking.png";
import {
  buildRegionOverview,
  buildWeeklyAwards,
  weeklyAwardsMeta,
  type Award,
  type AwardTone,
  type AwardWinner,
  type OverviewSlide,
} from "@/lib/weeklyAwards";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const TONES: Record<
  AwardTone,
  {
    color: string;
    glow: string;
    wash: string;
    border: string;
    text: string;
    chip: string;
  }
> = {
  gold: {
    color: "#facc15",
    glow: "rgba(250,204,21,0.32)",
    wash: "rgba(250,204,21,0.14)",
    border: "border-amber-300/40",
    text: "text-amber-100",
    chip: "border-amber-200/45 bg-amber-300/15 text-amber-100",
  },
  teal: {
    color: "#2dd4bf",
    glow: "rgba(45,212,191,0.3)",
    wash: "rgba(45,212,191,0.13)",
    border: "border-teal-200/40",
    text: "text-teal-100",
    chip: "border-teal-200/40 bg-teal-300/12 text-teal-100",
  },
  violet: {
    color: "#a855f7",
    glow: "rgba(168,85,247,0.32)",
    wash: "rgba(168,85,247,0.14)",
    border: "border-violet-200/40",
    text: "text-violet-100",
    chip: "border-violet-200/40 bg-violet-300/12 text-violet-100",
  },
  rose: {
    color: "#fb7185",
    glow: "rgba(251,113,133,0.32)",
    wash: "rgba(251,113,133,0.14)",
    border: "border-rose-200/40",
    text: "text-rose-100",
    chip: "border-rose-200/40 bg-rose-300/12 text-rose-100",
  },
  blue: {
    color: "#4f7fff",
    glow: "rgba(79,127,255,0.32)",
    wash: "rgba(79,127,255,0.14)",
    border: "border-blue-200/40",
    text: "text-blue-100",
    chip: "border-blue-200/40 bg-blue-300/12 text-blue-100",
  },
};

const spriteByMascot: Record<AwardWinner["mascot"], string> = {
  adventurer: adventurerVictoryImg,
  mentor: mentorCheerImg,
  npc: npcLoveImg,
  smart_guy: smartGuyCheerImg,
  spirit: spiritGlowImg,
  wizard: wizardTalkingImg,
};

type Burst = {
  id: number;
  color: string;
};

type Star = {
  id: number;
  left: string;
  top: string;
  size: number;
  opacity: number;
};

type DeckSlide =
  | { kind: "title"; id: "title"; tone: AwardTone }
  | { kind: "overview"; id: string; overview: OverviewSlide; overviewNumber: number; tone: AwardTone }
  | { kind: "award"; id: string; award: Award; awardNumber: number; tone: AwardTone }
  | { kind: "finale"; id: "finale"; tone: AwardTone };

const OPENING_SLIDE: DeckSlide = { kind: "title", id: "title", tone: "gold" };

let awardsAudioContext: AudioContext | null = null;

function makeStars(count: number, offset = 0): Star[] {
  return Array.from({ length: count }, (_, index) => {
    const id = index + offset;
    return {
      id,
      left: `${(id * 37) % 101}%`,
      top: `${(id * 53) % 103}%`,
      size: 1 + (id % 3),
      opacity: 0.16 + (id % 7) * 0.08,
    };
  });
}

function getAudioContext() {
  if (typeof window === "undefined") return null;

  const AudioCtor =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;

  try {
    awardsAudioContext ??= new AudioCtor();
    if (awardsAudioContext.state === "suspended") {
      void awardsAudioContext.resume();
    }
  } catch {
    return null;
  }

  return awardsAudioContext;
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
    // Audio is decorative and browser policy can block it before a gesture.
  }
}

function playNoiseBurst(start: number, duration: number, gainValue: number) {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const sampleCount = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);
    }

    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(900, ctx.currentTime + start);
    gain.gain.setValueAtTime(gainValue, ctx.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(ctx.currentTime + start);
  } catch {
    // Decorative only.
  }
}

function playFanfare(finale = false) {
  playNoiseBurst(0, finale ? 0.28 : 0.16, finale ? 0.035 : 0.022);

  if (finale) {
    [261.63, 329.63, 392, 523.25].forEach((note) => playTone(note, 0.02, 0.56, 0.032, "triangle"));
    [659.25, 783.99, 1046.5].forEach((note, index) => playTone(note, 0.16 + index * 0.08, 0.34, 0.034, "sine"));
    playTone(130.81, 0, 0.72, 0.026, "sawtooth");
    return;
  }

  [523.25, 659.25, 783.99, 1046.5].forEach((note, index) => {
    playTone(note, 0.02 + index * 0.055, 0.18, 0.03, "triangle");
  });
}

function ordinal(value: number) {
  if (value === 1) return "1st";
  if (value === 2) return "2nd";
  if (value === 3) return "3rd";
  return `${value}th`;
}

function winnerIndexes(count: number) {
  if (count === 3) return [1, 0, 2];
  return Array.from({ length: count }, (_, index) => index);
}

function overviewTone(overview: OverviewSlide, index: number): AwardTone {
  return overview.stats.find((stat) => stat.tone)?.tone ?? (["blue", "teal", "violet"] as AwardTone[])[index % 3];
}

function isFinaleMoment(slide: DeckSlide) {
  return slide.kind === "finale" || (slide.kind === "award" && slide.award.id === "league-champion");
}

function slideProgressLabel(slide: DeckSlide, overviewCount: number, awardCount: number) {
  if (slide.kind === "title") return "Opening";
  if (slide.kind === "overview") return `Region ${slide.overviewNumber} / ${overviewCount}`;
  if (slide.kind === "award") return `Award ${slide.awardNumber} / ${awardCount}`;
  return "Finale";
}

function slideDotLabel(slide: DeckSlide, overviewCount: number, awardCount: number) {
  if (slide.kind === "title") return "Go to opening slide";
  if (slide.kind === "overview") return `Go to region overview ${slide.overviewNumber} of ${overviewCount}`;
  if (slide.kind === "award") return `Go to award ${slide.awardNumber} of ${awardCount}: ${slide.award.title}`;
  return "Go to finale recap";
}

function isInteractiveElement(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest("button, a, input, select, textarea"));
}

function CosmicBackdrop({ tone }: { tone: AwardTone }) {
  const farStars = useMemo(() => makeStars(58), []);
  const midStars = useMemo(() => makeStars(46, 100), []);
  const nearStars = useMemo(() => makeStars(36, 200), []);
  const activeTone = TONES[tone];

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#0a0a0b]">
      <div
        className="absolute inset-0 transition-all duration-700"
        style={{
          background: `radial-gradient(circle at 50% 20%, ${activeTone.wash}, transparent 36%), radial-gradient(circle at 14% 72%, rgba(45,212,191,0.12), transparent 30%), radial-gradient(circle at 86% 74%, rgba(255,255,255,0.06), transparent 34%)`,
        }}
      />
      <motion.div
        className="absolute inset-0"
        animate={{ y: [0, -26, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      >
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
      <motion.div
        className="absolute inset-0"
        animate={{ y: [0, -48, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      >
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
      <motion.div
        className="absolute inset-0"
        animate={{ y: [0, -72, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      >
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

function ParticleBurst({ burst, reducedMotion }: { burst: Burst | null; reducedMotion: boolean }) {
  if (!burst || reducedMotion) return null;

  return (
    <div key={burst.id} className="pointer-events-none fixed inset-0 z-20 overflow-hidden">
      {Array.from({ length: 32 }, (_, index) => {
        const angle = (index / 32) * Math.PI * 2;
        const distance = 150 + (index % 5) * 26;
        const dx = `${Math.cos(angle) * distance}px`;
        const dy = `${Math.sin(angle) * distance}px`;

        return (
          <span
            key={`ring-${index}`}
            className="absolute left-1/2 top-[42%] h-2 w-2"
            style={
              {
                "--dx": dx,
                "--dy": dy,
                animation: "particle-drift 1s ease-out forwards",
                animationDelay: `${index * 0.012}s`,
                backgroundColor: burst.color,
                boxShadow: `0 0 18px ${burst.color}`,
              } as CSSProperties
            }
          />
        );
      })}
      {Array.from({ length: 38 }, (_, index) => {
        const x = 12 + ((index * 19) % 78);
        const y = -8 - (index % 4) * 7;
        const dx = `${-80 + ((index * 37) % 160)}px`;
        const dy = `${260 + (index % 6) * 24}px`;

        return (
          <span
            key={`confetti-${index}`}
            className="absolute h-3 w-1.5"
            style={
              {
                left: `${x}%`,
                top: `${y}%`,
                "--dx": dx,
                "--dy": dy,
                animation: "particle-drift 1.25s ease-out forwards",
                animationDelay: `${index * 0.01}s`,
                backgroundColor: index % 4 === 0 ? "#ffffff" : burst.color,
                boxShadow: `0 0 10px ${burst.color}`,
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
}

function Sprite({
  winner,
  primary,
  reducedMotion,
  color,
}: {
  winner: AwardWinner;
  primary: boolean;
  reducedMotion: boolean;
  color: string;
}) {
  return (
    <motion.img
      src={spriteByMascot[winner.mascot]}
      alt={`${winner.community} mascot`}
      className={cn(
        "mx-auto object-contain [image-rendering:pixelated] drop-shadow-2xl",
        primary
          ? "h-[min(16vh,9.5rem)] w-[min(16vh,9.5rem)]"
          : "h-[min(10vh,5.75rem)] w-[min(10vh,5.75rem)] md:h-[min(12vh,7rem)] md:w-[min(12vh,7rem)]",
      )}
      style={{ filter: `drop-shadow(0 0 ${primary ? 34 : 24}px ${color})` }}
      animate={reducedMotion ? undefined : { y: [0, primary ? -14 : -10, 0] }}
      transition={{ duration: primary ? 0.95 : 1.1, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function WinnerCard({
  winner,
  rank,
  primary,
  compact,
  tone,
  reducedMotion,
}: {
  winner: AwardWinner;
  rank: number;
  primary: boolean;
  compact: boolean;
  tone: (typeof TONES)[AwardTone];
  reducedMotion: boolean;
}) {
  return (
    <motion.div
      className={cn(
        "relative min-w-0 overflow-hidden border bg-black/68 backdrop-blur-md",
        tone.border,
        primary ? "p-4 shadow-[0_0_48px_rgba(255,255,255,0.13)] md:p-5" : "p-3 md:p-4",
        compact && "p-2.5 md:p-3",
      )}
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.94 }}
      animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      transition={
        reducedMotion
          ? { duration: 0.12 }
          : { type: "spring", stiffness: 190, damping: 18, mass: 0.7, delay: 0.1 + rank * 0.06 }
      }
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 6%, ${tone.glow}, transparent 42%)`,
        }}
      />
      <div className="relative">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className={cn("border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.28em]", tone.chip)}>
            {ordinal(rank)}
          </span>
          <span className="text-[10px] uppercase tracking-[0.28em] text-white/38">Winner</span>
        </div>
        <Sprite winner={winner} primary={primary && !compact} reducedMotion={reducedMotion} color={tone.color} />
        <div className="mt-3 text-center">
          <h3
            className={cn(
              "display mx-auto max-w-[15ch] break-words uppercase leading-[0.86] text-white text-balance [overflow-wrap:anywhere]",
              primary && !compact
                ? "text-[clamp(1.7rem,3.5vw,3rem)]"
                : compact
                  ? "text-[clamp(1rem,2vw,1.75rem)]"
                  : "text-[clamp(1.2rem,2.7vw,2.35rem)]",
            )}
          >
            {winner.community}
          </h3>
          <p
            className={cn(
              "mt-2 break-words font-black uppercase leading-[0.9] [overflow-wrap:anywhere]",
              tone.text,
              primary && !compact
                ? "text-[clamp(1.35rem,2.7vw,2.45rem)]"
                : compact
                  ? "text-[clamp(0.95rem,1.8vw,1.45rem)]"
                  : "text-[clamp(1.1rem,2.35vw,2.1rem)]",
            )}
          >
            {winner.stat}
          </p>
          {winner.detail ? (
            <p className="mt-2 break-words text-[10px] uppercase leading-4 tracking-[0.2em] text-white/50 [overflow-wrap:anywhere]">
              {winner.detail}
            </p>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

function WinnersStage({ award, tone, reducedMotion }: { award: Award; tone: (typeof TONES)[AwardTone]; reducedMotion: boolean }) {
  const indexes = winnerIndexes(award.winners.length);
  const many = award.winners.length > 3;
  const single = award.winners.length === 1;

  return (
    <div
      className={cn(
        "mx-auto mt-[min(2.6vh,1.5rem)] grid w-full gap-2.5 sm:gap-3 lg:gap-4",
        single && "max-w-4xl",
        award.winners.length === 2 && "max-w-5xl md:grid-cols-2 md:items-end",
        award.winners.length === 3 && "max-w-6xl md:grid-cols-3 md:items-end",
        many && "max-w-7xl grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
      )}
    >
      {indexes.map((winnerIndex) => {
        const winner = award.winners[winnerIndex];
        const rank = winnerIndex + 1;
        const primary = winnerIndex === 0;

        return (
          <div key={`${award.id}-${winner.community}`} className={cn(primary && award.winners.length === 3 && "md:-mt-8")}>
            <WinnerCard
              winner={winner}
              rank={rank}
              primary={primary}
              compact={many}
              tone={tone}
              reducedMotion={reducedMotion}
            />
          </div>
        );
      })}
    </div>
  );
}

function SlideShell({ children, slideKey, reducedMotion }: { children: ReactNode; slideKey: string; reducedMotion: boolean }) {
  return (
    <motion.section
      key={slideKey}
      className="relative z-10 grid h-screen h-[100dvh] w-full place-items-center overflow-hidden px-4 py-[clamp(2.75rem,5vh,4rem)] text-white sm:px-5 md:px-8 lg:px-10"
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 34, scale: 0.96 }}
      animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      transition={
        reducedMotion ? { duration: 0.12 } : { type: "spring", stiffness: 120, damping: 18, mass: 0.75 }
      }
    >
      {children}
    </motion.section>
  );
}

function TitleSlide({
  meta,
  onBegin,
  reducedMotion,
}: {
  meta: ReturnType<typeof weeklyAwardsMeta>;
  onBegin: (event: MouseEvent<HTMLButtonElement>) => void;
  reducedMotion: boolean;
}) {
  return (
    <SlideShell slideKey="title" reducedMotion={reducedMotion}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 22%, rgba(250,204,21,0.18), transparent 34%), radial-gradient(circle at 80% 42%, rgba(79,127,255,0.16), transparent 30%)",
        }}
      />
      <div className="relative mx-auto grid max-h-[calc(100dvh-5.5rem)] w-full max-w-7xl gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.95fr)] lg:items-center">
        <div>
          <motion.p
            className="text-xs font-bold uppercase tracking-[0.4em] text-signal sm:text-sm"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            Wednesday Northeast recognition
          </motion.p>
          <h1 className="display mt-4 text-[clamp(3.25rem,9vw,8.5rem)] uppercase leading-[0.84] text-white">
            <span className="block text-[0.72em] leading-none">🏆</span>
            Awards Night
          </h1>
          <p className="mt-4 text-sm uppercase tracking-[0.34em] text-white/62 md:text-base">{meta.trimesterLabel}</p>
          <p className="mt-3 text-xl font-black uppercase text-white md:text-3xl">
            {meta.communityCount} communities · {meta.awardCount} awards
          </p>
          <button
            type="button"
            onClick={onBegin}
            className="mt-6 inline-flex items-center gap-3 border border-amber-200/45 bg-amber-300/15 px-5 py-3.5 text-xs font-black uppercase tracking-[0.34em] text-amber-100 shadow-[0_0_42px_rgba(250,204,21,0.24)] backdrop-blur-md transition-colors hover:border-amber-100 hover:bg-amber-300/22"
          >
            <Sparkles className="h-5 w-5" />
            Begin the Ceremony
          </button>
        </div>
        <div className="relative hidden h-[min(42vh,390px)] lg:block">
          <div className="absolute left-1/2 top-1/2 h-[min(28vh,17rem)] w-[min(28vh,17rem)] -translate-x-1/2 -translate-y-1/2 border border-white/10 bg-black/50 shadow-[0_0_70px_rgba(250,204,21,0.18)] backdrop-blur-md" />
          <motion.img
            src={mentorCheerImg}
            alt=""
            className="absolute left-[18%] top-[22%] h-[min(17vh,10rem)] w-[min(17vh,10rem)] object-contain [image-rendering:pixelated] drop-shadow-2xl"
            animate={reducedMotion ? undefined : { y: [0, -12, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.img
            src={adventurerVictoryImg}
            alt=""
            className="absolute left-[38%] top-[7%] h-[min(21vh,13rem)] w-[min(21vh,13rem)] object-contain [image-rendering:pixelated] drop-shadow-2xl"
            animate={reducedMotion ? undefined : { y: [0, -16, 0] }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
          />
          <motion.img
            src={spiritGlowImg}
            alt=""
            className="absolute left-[56%] top-[35%] h-[min(15vh,9rem)] w-[min(15vh,9rem)] object-contain [image-rendering:pixelated] drop-shadow-2xl"
            animate={reducedMotion ? undefined : { y: [0, -10, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
          />
          <div className="absolute bottom-6 left-10 right-10 border border-white/10 bg-black/70 p-3 text-center text-xs font-bold uppercase tracking-[0.34em] text-white/58 backdrop-blur-md">
            Operation COMEBACK
          </div>
        </div>
      </div>
    </SlideShell>
  );
}

function RegionOverviewSlide({
  overview,
  overviewNumber,
  overviewCount,
  reducedMotion,
}: {
  overview: OverviewSlide;
  overviewNumber: number;
  overviewCount: number;
  reducedMotion: boolean;
}) {
  const activeTone = overviewTone(overview, overviewNumber - 1);
  const tone = TONES[activeTone];

  return (
    <SlideShell slideKey={overview.id} reducedMotion={reducedMotion}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 18%, ${tone.wash}, transparent 34%), radial-gradient(circle at 12% 74%, rgba(45,212,191,0.12), transparent 28%), radial-gradient(circle at 88% 68%, rgba(168,85,247,0.12), transparent 30%)`,
        }}
      />
      <div className="relative mx-auto flex max-h-[calc(100dvh-5.5rem)] w-full max-w-7xl flex-col justify-center text-center">
        <p className="text-xs font-bold uppercase tracking-[0.4em] text-signal sm:text-sm">
          {overview.kicker} · Region {overviewNumber} / {overviewCount}
        </p>
        <h2 className="display mx-auto mt-3 max-w-[12ch] break-words text-[clamp(2.35rem,6.4vw,6.6rem)] uppercase leading-[0.84] text-white text-balance [overflow-wrap:anywhere]">
          {overview.title}
        </h2>
        <p className="mx-auto mt-3 max-w-4xl text-[clamp(0.82rem,1.6vw,1.15rem)] font-bold uppercase leading-[1.35] tracking-[0.3em] text-white/55">
          {overview.subtitle}
        </p>

        <div
          className={cn(
            "mt-[min(4vh,2rem)] grid w-full gap-3",
            overview.stats.length === 3 ? "sm:grid-cols-3" : "grid-cols-2 lg:grid-cols-4",
          )}
        >
          {overview.stats.map((stat, index) => {
            const statTone = TONES[stat.tone ?? activeTone];

            return (
              <motion.div
                key={`${overview.id}-${stat.label}`}
                className={cn("relative min-w-0 overflow-hidden border bg-black/66 p-3 backdrop-blur-md md:p-4 lg:p-5", statTone.border)}
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.96 }}
                animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.45, ease: EASE, delay: reducedMotion ? 0 : 0.06 * index }}
              >
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background: `radial-gradient(circle at 50% 0%, ${statTone.wash}, transparent 48%)`,
                  }}
                />
                <div className="relative">
                  <p className="text-[10px] font-black uppercase leading-4 tracking-[0.28em] text-white/46">
                    {stat.label}
                  </p>
                  <p
                    className="display mt-2 break-words text-[clamp(2rem,5vw,5.1rem)] uppercase leading-[0.82] [overflow-wrap:anywhere]"
                    style={{
                      color: statTone.color,
                      textShadow: `0 0 34px ${statTone.glow}`,
                    }}
                  >
                    {stat.value}
                  </p>
                  {stat.sub ? (
                    <p className="mx-auto mt-3 max-w-[22ch] text-[clamp(0.65rem,1.1vw,0.86rem)] font-bold uppercase leading-[1.3] tracking-[0.18em] text-white/45">
                      {stat.sub}
                    </p>
                  ) : null}
                </div>
              </motion.div>
            );
          })}
        </div>

        {overview.blurb ? (
          <motion.p
            className="mx-auto mt-[min(3vh,1.5rem)] max-w-5xl border-l-2 border-white/18 bg-black/45 px-4 py-2.5 text-center text-[clamp(0.72rem,1.18vw,0.98rem)] font-bold uppercase leading-[1.35] tracking-[0.16em] text-white/70 backdrop-blur-md"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.2 }}
          >
            {overview.blurb}
          </motion.p>
        ) : null}
      </div>
    </SlideShell>
  );
}

function AwardSlide({
  award,
  awardNumber,
  awardCount,
  reducedMotion,
}: {
  award: Award;
  awardNumber: number;
  awardCount: number;
  reducedMotion: boolean;
}) {
  const tone = TONES[award.tone];
  const isChampion = award.id === "league-champion";

  return (
    <SlideShell slideKey={award.id} reducedMotion={reducedMotion}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 18%, ${tone.wash}, transparent 34%), radial-gradient(circle at 12% 74%, rgba(255,255,255,0.06), transparent 28%)`,
        }}
      />
      <div className="relative mx-auto flex max-h-[calc(100dvh-5.5rem)] w-full max-w-7xl flex-col justify-center">
        <div className="grid gap-4 lg:grid-cols-[minmax(170px,0.34fr)_minmax(0,1fr)] lg:items-center">
          <div className="relative mx-auto grid h-[min(18vh,12rem)] w-[min(18vh,12rem)] place-items-center md:h-[min(20vh,14rem)] md:w-[min(20vh,14rem)] lg:h-[min(22vh,16rem)] lg:w-[min(22vh,16rem)]">
            <div
              className={cn("absolute inset-0 border bg-black/55 backdrop-blur-md", tone.border)}
              style={{ boxShadow: `0 0 86px ${tone.glow}` }}
            />
            <motion.div
              className="relative text-[clamp(3.75rem,10vh,7.5rem)]"
              style={{ textShadow: `0 0 42px ${tone.color}` }}
              animate={reducedMotion ? undefined : { scale: [1, 1.06, 1], rotate: [0, -2, 0, 2, 0] }}
              transition={{ duration: isChampion ? 1.2 : 1.6, repeat: Infinity, ease: "easeInOut" }}
            >
              {award.emoji}
            </motion.div>
          </div>
          <div className="text-center lg:text-left">
            <p className={cn("text-xs font-bold uppercase tracking-[0.4em] sm:text-sm", tone.text)}>
              {String(awardNumber).padStart(2, "0")} · Award {awardNumber} / {awardCount}
            </p>
            <p className="mt-2 text-[10px] font-bold uppercase leading-4 tracking-[0.34em] text-white/45 sm:text-xs">
              {award.subtitle}
            </p>
            <h2
              className={cn(
                "display mt-3 break-words uppercase leading-[0.84] text-white text-balance [overflow-wrap:anywhere]",
                isChampion ? "text-[clamp(2.5rem,7.8vw,7.6rem)]" : "text-[clamp(2.25rem,7vw,6.9rem)]",
              )}
            >
              {award.title}
            </h2>
          </div>
        </div>
        <WinnersStage award={award} tone={tone} reducedMotion={reducedMotion} />
        {award.blurb ? (
          <motion.p
            className="mx-auto mt-[min(2vh,1rem)] max-w-5xl border-l-2 border-white/18 bg-black/45 px-4 py-2.5 text-center text-[clamp(0.68rem,1.12vw,0.95rem)] font-bold uppercase leading-[1.35] tracking-[0.16em] text-white/70 backdrop-blur-md"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.2 }}
          >
            {award.blurb}
          </motion.p>
        ) : null}
      </div>
    </SlideShell>
  );
}

function FinaleSlide({
  awards,
  meta,
  reducedMotion,
}: {
  awards: Award[];
  meta: ReturnType<typeof weeklyAwardsMeta>;
  reducedMotion: boolean;
}) {
  return (
    <SlideShell slideKey="finale" reducedMotion={reducedMotion}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 18%, rgba(250,204,21,0.2), transparent 34%), radial-gradient(circle at 16% 78%, rgba(45,212,191,0.13), transparent 30%), radial-gradient(circle at 84% 76%, rgba(168,85,247,0.16), transparent 30%)",
        }}
      />
      <div className="relative mx-auto flex max-h-[calc(100dvh-5.5rem)] w-full max-w-7xl flex-col justify-center">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.4em] text-amber-100 sm:text-sm">Finale Recap</p>
            <h2 className="display mt-2 break-words text-[clamp(2.6rem,7.2vw,6.8rem)] uppercase leading-[0.86] text-white text-balance [overflow-wrap:anywhere]">
              Tonight's Winners
            </h2>
          </div>
          <div className="border border-amber-200/35 bg-amber-300/12 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.28em] text-amber-100 backdrop-blur-md sm:text-xs">
            {meta.trimesterLabel}
          </div>
        </div>
        <div className="mt-[min(3vh,1.5rem)] grid grid-cols-2 gap-2.5 xl:grid-cols-3">
          {awards.map((award, index) => {
            const tone = TONES[award.tone];
            const winners = award.winners.map((winner) => `${winner.community} (${winner.stat})`).join(" · ");

            return (
              <motion.div
                key={award.id}
                className={cn("relative min-w-0 overflow-hidden border bg-black/64 p-2.5 backdrop-blur-md sm:p-3", tone.border)}
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 18 }}
                animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: EASE, delay: reducedMotion ? 0 : 0.025 * index }}
              >
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background: `radial-gradient(circle at 0% 0%, ${tone.wash}, transparent 46%)`,
                  }}
                />
                <div className="relative flex items-start gap-3">
                  <span className="shrink-0 text-[clamp(1.35rem,2vw,2rem)] leading-none" style={{ textShadow: `0 0 22px ${tone.color}` }}>
                    {award.emoji}
                  </span>
                  <div className="min-w-0">
                    <p className={cn("break-words text-[9px] font-black uppercase leading-3 tracking-[0.22em] [overflow-wrap:anywhere]", tone.text)}>
                      {String(index + 1).padStart(2, "0")} · {award.title}
                    </p>
                    <p className="mt-1.5 break-words text-[clamp(0.62rem,0.92vw,0.82rem)] font-bold uppercase leading-[1.15] text-white text-balance [overflow-wrap:anywhere]">
                      {winners}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        <div className="mt-[min(2.6vh,1.25rem)] flex items-center justify-center gap-3 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-white/48 sm:text-xs">
          <Crown className="h-4 w-4 text-amber-200 sm:h-5 sm:w-5" />
          League Champion energy carries into next Wednesday
        </div>
      </div>
    </SlideShell>
  );
}

function ProgressRail({
  slideIndex,
  deck,
  overviewCount,
  awardCount,
  onDot,
}: {
  slideIndex: number;
  deck: DeckSlide[];
  overviewCount: number;
  awardCount: number;
  onDot: (index: number, event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const activeSlide = deck[slideIndex] ?? OPENING_SLIDE;
  const label = slideProgressLabel(activeSlide, overviewCount, awardCount);

  return (
    <div className="fixed left-4 top-4 z-40 flex items-center gap-3 border border-white/10 bg-black/62 px-3 py-2 text-white/70 backdrop-blur-md md:left-6 md:top-6">
      <Trophy className="h-4 w-4 text-amber-200" />
      <span className="text-[10px] font-bold uppercase tracking-[0.3em]">{label}</span>
      <span className="hidden border-l border-white/12 pl-3 text-[10px] font-bold uppercase tracking-[0.24em] text-white/38 lg:inline">
        Slide {slideIndex + 1} / {deck.length}
      </span>
      <div className="hidden items-center gap-1.5 md:flex">
        {deck.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            aria-label={slideDotLabel(slide, overviewCount, awardCount)}
            onClick={(event) => onDot(index, event)}
            className={cn(
              "h-1.5 transition-all",
              slideIndex === index ? "w-8 bg-white" : "w-1.5 bg-white/25 hover:bg-white/60",
            )}
          />
        ))}
      </div>
    </div>
  );
}

function Controls({
  canBack,
  canNext,
  onBack,
  onNext,
  onToggleFullscreen,
  onExit,
  isFullscreen,
}: {
  canBack: boolean;
  canNext: boolean;
  onBack: (event: MouseEvent<HTMLButtonElement>) => void;
  onNext: (event: MouseEvent<HTMLButtonElement>) => void;
  onToggleFullscreen: (event: MouseEvent<HTMLButtonElement>) => void;
  onExit: (event: MouseEvent<HTMLButtonElement>) => void;
  isFullscreen: boolean;
}) {
  return (
    <>
      <div className="fixed right-4 top-4 z-40 flex items-center gap-2 md:right-6 md:top-6">
        <button
          type="button"
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          onClick={onToggleFullscreen}
          className="grid h-10 w-10 place-items-center border border-white/12 bg-black/62 text-white/62 backdrop-blur-md transition-colors hover:border-white/35 hover:text-white"
        >
          {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
        </button>
        <button
          type="button"
          aria-label="Return to title"
          onClick={onExit}
          className="grid h-10 w-10 place-items-center border border-white/12 bg-black/62 text-white/62 backdrop-blur-md transition-colors hover:border-white/35 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="fixed bottom-4 left-4 right-4 z-40 flex flex-col gap-3 md:bottom-6 md:left-6 md:right-6 md:flex-row md:items-center md:justify-between">
        <div className="border border-white/10 bg-black/62 px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-white/45 backdrop-blur-md md:text-left">
          → next · ← back · F fullscreen · Esc exit
        </div>
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={onBack}
            disabled={!canBack}
            className="inline-flex h-11 items-center gap-2 border border-white/12 bg-black/62 px-4 text-xs font-bold uppercase tracking-[0.28em] text-white/70 backdrop-blur-md transition-colors hover:border-white/35 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!canNext}
            className="inline-flex h-11 items-center gap-2 border border-white/20 bg-white/10 px-4 text-xs font-bold uppercase tracking-[0.28em] text-white backdrop-blur-md transition-colors hover:border-white/45 hover:bg-white/16 disabled:cursor-not-allowed disabled:opacity-35"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}

export function AwardsShow() {
  const awards = useMemo(() => buildWeeklyAwards(), []);
  const overviewSlides = useMemo(() => buildRegionOverview(), []);
  const meta = useMemo(() => weeklyAwardsMeta(awards), [awards]);
  const deck = useMemo<DeckSlide[]>(() => {
    const slides: DeckSlide[] = [
      OPENING_SLIDE,
      ...overviewSlides.map((overview, index): DeckSlide => ({
        kind: "overview",
        id: `overview-${overview.id}`,
        overview,
        overviewNumber: index + 1,
        tone: overviewTone(overview, index),
      })),
      ...awards.map((award, index): DeckSlide => ({
        kind: "award",
        id: `award-${award.id}`,
        award,
        awardNumber: index + 1,
        tone: award.tone,
      })),
      { kind: "finale", id: "finale", tone: "gold" },
    ];

    return slides;
  }, [awards, overviewSlides]);
  const reducedMotion = useReducedMotion() ?? false;
  const totalSlides = deck.length;
  const rootRef = useRef<HTMLDivElement>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [burst, setBurst] = useState<Burst | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const activeSlide = deck[slideIndex] ?? OPENING_SLIDE;
  const activeTone = activeSlide.tone;

  const toggleFullscreen = useCallback(() => {
    if (typeof document === "undefined") return;

    if (document.fullscreenElement) {
      if (document.exitFullscreen) {
        void document.exitFullscreen().catch(() => undefined);
      }
      return;
    }

    if (rootRef.current?.requestFullscreen) {
      void rootRef.current.requestFullscreen().catch(() => undefined);
    }
  }, []);

  const triggerSlideEffects = useCallback(
    (nextIndex: number) => {
      const nextSlide = deck[nextIndex] ?? OPENING_SLIDE;

      const nextTone = nextSlide.tone;
      if (!reducedMotion) {
        setBurst({ id: Date.now(), color: TONES[nextTone].color });
      }
      if (nextSlide.kind !== "title") {
        playFanfare(isFinaleMoment(nextSlide));
      }
    },
    [deck, reducedMotion],
  );

  const goTo = useCallback(
    (targetIndex: number, silent = false) => {
      const nextIndex = Math.max(0, Math.min(totalSlides - 1, targetIndex));
      if (nextIndex === slideIndex) return;
      if (!silent) {
        triggerSlideEffects(nextIndex);
      }
      setSlideIndex(nextIndex);
    },
    [slideIndex, totalSlides, triggerSlideEffects],
  );

  const goNext = useCallback(() => goTo(slideIndex + 1), [goTo, slideIndex]);
  const goBack = useCallback(() => goTo(slideIndex - 1), [goTo, slideIndex]);
  const goTitle = useCallback(() => goTo(0, true), [goTo]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === rootRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    handleFullscreenChange();
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isInteractiveElement(event.target)) return;

      if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        toggleFullscreen();
        return;
      }

      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        goNext();
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "Backspace") {
        event.preventDefault();
        goBack();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        goTitle();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goBack, goNext, goTitle, toggleFullscreen]);

  const handleStageClick = (event: MouseEvent<HTMLDivElement>) => {
    if (isInteractiveElement(event.target)) return;
    goNext();
  };

  const handleBegin = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    goNext();
  };

  const handleBack = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    goBack();
  };

  const handleNext = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    goNext();
  };

  const handleToggleFullscreen = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    toggleFullscreen();
  };

  const handleExit = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    goTitle();
  };

  const handleDot = (index: number, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    goTo(index);
  };

  return (
    <div
      ref={rootRef}
      className="relative h-screen h-[100dvh] overflow-hidden bg-[#0a0a0b] text-white"
      onClick={handleStageClick}
    >
      <CosmicBackdrop tone={activeTone} />
      <ParticleBurst burst={burst} reducedMotion={reducedMotion} />
      <ProgressRail
        slideIndex={slideIndex}
        deck={deck}
        overviewCount={overviewSlides.length}
        awardCount={awards.length}
        onDot={handleDot}
      />
      <Controls
        canBack={slideIndex > 0}
        canNext={slideIndex < totalSlides - 1}
        onBack={handleBack}
        onNext={handleNext}
        onToggleFullscreen={handleToggleFullscreen}
        onExit={handleExit}
        isFullscreen={isFullscreen}
      />

      {activeSlide.kind === "title" ? (
        <TitleSlide meta={meta} onBegin={handleBegin} reducedMotion={reducedMotion} />
      ) : activeSlide.kind === "overview" ? (
        <RegionOverviewSlide
          overview={activeSlide.overview}
          overviewNumber={activeSlide.overviewNumber}
          overviewCount={overviewSlides.length}
          reducedMotion={reducedMotion}
        />
      ) : activeSlide.kind === "award" ? (
        <AwardSlide
          award={activeSlide.award}
          awardNumber={activeSlide.awardNumber}
          awardCount={awards.length}
          reducedMotion={reducedMotion}
        />
      ) : (
        <FinaleSlide awards={awards} meta={meta} reducedMotion={reducedMotion} />
      )}
    </div>
  );
}
