import { useCallback, useEffect, useMemo, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Crown, Sparkles, Trophy, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import adventurerVictoryImg from "@/assets/sprites/adventurer/adventurer_victory.png";
import mentorCheerImg from "@/assets/sprites/mentor/mentor_cheer.png";
import npcLoveImg from "@/assets/sprites/npc/npc_love.png";
import smartGuyCheerImg from "@/assets/sprites/smart_guy/smart_guy_cheer.png";
import spiritGlowImg from "@/assets/sprites/spirit/spirit_glow.png";
import wizardTalkingImg from "@/assets/sprites/wizard/wizard_talking.png";
import { buildWeeklyAwards, weeklyAwardsMeta, type Award, type AwardTone, type AwardWinner } from "@/lib/weeklyAwards";
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

function toneForSlide(slideIndex: number, awards: Award[]): AwardTone {
  if (slideIndex > 0 && slideIndex <= awards.length) {
    return awards[slideIndex - 1].tone;
  }

  return "gold";
}

function isFinaleIndex(slideIndex: number, awards: Award[]) {
  return slideIndex === awards.length || slideIndex === awards.length + 1;
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
        primary ? "h-40 w-40 md:h-52 md:w-52" : "h-28 w-28 md:h-36 md:w-36",
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
        primary ? "p-5 shadow-[0_0_58px_rgba(255,255,255,0.13)] md:p-7" : "p-4 md:p-5",
        compact && "p-4 md:p-4",
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
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className={cn("border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.28em]", tone.chip)}>
            {ordinal(rank)}
          </span>
          <span className="text-[10px] uppercase tracking-[0.28em] text-white/38">Winner</span>
        </div>
        <Sprite winner={winner} primary={primary && !compact} reducedMotion={reducedMotion} color={tone.color} />
        <div className="mt-4 text-center">
          <h3
            className={cn(
              "display mx-auto max-w-[12ch] uppercase leading-none text-white",
              primary && !compact ? "text-4xl md:text-6xl" : "text-3xl md:text-4xl",
            )}
          >
            {winner.community}
          </h3>
          <p className={cn("mt-3 font-black uppercase leading-none", tone.text, primary ? "text-3xl md:text-5xl" : "text-2xl md:text-3xl")}>
            {winner.stat}
          </p>
          {winner.detail ? <p className="mt-3 text-xs uppercase tracking-[0.24em] text-white/50">{winner.detail}</p> : null}
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
        "mx-auto mt-7 grid w-full gap-4",
        single && "max-w-4xl",
        award.winners.length === 2 && "max-w-5xl md:grid-cols-2 md:items-end",
        award.winners.length === 3 && "max-w-6xl md:grid-cols-3 md:items-end",
        many && "max-w-7xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
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
      className="relative z-10 flex min-h-screen w-full flex-col justify-center overflow-hidden px-5 py-20 text-white md:px-10 lg:px-14"
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
      <div className="relative mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:items-center">
        <div>
          <motion.p
            className="text-sm font-bold uppercase tracking-[0.4em] text-signal"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            Wednesday Northeast recognition
          </motion.p>
          <h1 className="display mt-5 text-6xl uppercase leading-[0.86] text-white sm:text-8xl md:text-9xl lg:text-[9.5rem]">
            <span className="block text-[0.72em] leading-none">🏆</span>
            Awards Night
          </h1>
          <p className="mt-6 text-base uppercase tracking-[0.34em] text-white/62 md:text-lg">{meta.trimesterLabel}</p>
          <p className="mt-4 text-2xl font-black uppercase text-white md:text-4xl">
            {meta.communityCount} communities · {meta.awardCount} awards
          </p>
          <button
            type="button"
            onClick={onBegin}
            className="mt-9 inline-flex items-center gap-3 border border-amber-200/45 bg-amber-300/15 px-6 py-4 text-xs font-black uppercase tracking-[0.34em] text-amber-100 shadow-[0_0_42px_rgba(250,204,21,0.24)] backdrop-blur-md transition-colors hover:border-amber-100 hover:bg-amber-300/22"
          >
            <Sparkles className="h-5 w-5" />
            Begin the Ceremony
          </button>
        </div>
        <div className="relative hidden min-h-[420px] lg:block">
          <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 border border-white/10 bg-black/50 shadow-[0_0_70px_rgba(250,204,21,0.18)] backdrop-blur-md" />
          <motion.img
            src={mentorCheerImg}
            alt=""
            className="absolute left-[18%] top-[22%] h-44 w-44 object-contain [image-rendering:pixelated] drop-shadow-2xl"
            animate={reducedMotion ? undefined : { y: [0, -12, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.img
            src={adventurerVictoryImg}
            alt=""
            className="absolute left-[38%] top-[7%] h-56 w-56 object-contain [image-rendering:pixelated] drop-shadow-2xl"
            animate={reducedMotion ? undefined : { y: [0, -16, 0] }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
          />
          <motion.img
            src={spiritGlowImg}
            alt=""
            className="absolute left-[56%] top-[35%] h-40 w-40 object-contain [image-rendering:pixelated] drop-shadow-2xl"
            animate={reducedMotion ? undefined : { y: [0, -10, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
          />
          <div className="absolute bottom-8 left-10 right-10 border border-white/10 bg-black/70 p-4 text-center text-xs font-bold uppercase tracking-[0.34em] text-white/58 backdrop-blur-md">
            Operation COMEBACK
          </div>
        </div>
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
      <div className="relative mx-auto w-full max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[minmax(240px,0.42fr)_minmax(0,1fr)] lg:items-center">
          <div className="relative mx-auto grid h-48 w-48 place-items-center md:h-64 md:w-64 lg:h-80 lg:w-80">
            <div
              className={cn("absolute inset-0 border bg-black/55 backdrop-blur-md", tone.border)}
              style={{ boxShadow: `0 0 86px ${tone.glow}` }}
            />
            <motion.div
              className="relative text-8xl md:text-9xl lg:text-[10rem]"
              style={{ textShadow: `0 0 42px ${tone.color}` }}
              animate={reducedMotion ? undefined : { scale: [1, 1.06, 1], rotate: [0, -2, 0, 2, 0] }}
              transition={{ duration: isChampion ? 1.2 : 1.6, repeat: Infinity, ease: "easeInOut" }}
            >
              {award.emoji}
            </motion.div>
          </div>
          <div className="text-center lg:text-left">
            <p className={cn("text-sm font-bold uppercase tracking-[0.4em]", tone.text)}>
              {String(awardNumber).padStart(2, "0")} · Award {awardNumber} / {awardCount}
            </p>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.4em] text-white/45">{award.subtitle}</p>
            <h2
              className={cn(
                "display mt-5 uppercase leading-none text-white",
                isChampion ? "text-6xl md:text-8xl lg:text-[8.5rem]" : "text-5xl md:text-7xl lg:text-8xl",
              )}
            >
              {award.title}
            </h2>
          </div>
        </div>
        <WinnersStage award={award} tone={tone} reducedMotion={reducedMotion} />
        {award.blurb ? (
          <motion.p
            className="mx-auto mt-6 max-w-5xl border-l-2 border-white/18 bg-black/45 px-5 py-4 text-center text-base font-bold uppercase leading-7 tracking-[0.16em] text-white/70 backdrop-blur-md md:text-lg"
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
      <div className="relative mx-auto w-full max-w-7xl">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.4em] text-amber-100">Finale Recap</p>
            <h2 className="display mt-4 text-5xl uppercase leading-none text-white md:text-7xl lg:text-8xl">
              Tonight's Winners
            </h2>
          </div>
          <div className="border border-amber-200/35 bg-amber-300/12 px-4 py-3 text-xs font-bold uppercase tracking-[0.28em] text-amber-100 backdrop-blur-md">
            {meta.trimesterLabel}
          </div>
        </div>
        <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {awards.map((award, index) => {
            const tone = TONES[award.tone];
            const winners = award.winners.map((winner) => `${winner.community} (${winner.stat})`).join(" · ");

            return (
              <motion.div
                key={award.id}
                className={cn("relative overflow-hidden border bg-black/64 p-4 backdrop-blur-md", tone.border)}
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
                  <span className="text-3xl" style={{ textShadow: `0 0 22px ${tone.color}` }}>
                    {award.emoji}
                  </span>
                  <div className="min-w-0">
                    <p className={cn("text-[10px] font-black uppercase tracking-[0.28em]", tone.text)}>
                      {String(index + 1).padStart(2, "0")} · {award.title}
                    </p>
                    <p className="mt-2 text-sm font-bold uppercase leading-5 text-white">{winners}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        <div className="mt-8 flex items-center justify-center gap-3 text-center text-xs font-bold uppercase tracking-[0.34em] text-white/48">
          <Crown className="h-5 w-5 text-amber-200" />
          League Champion energy carries into next Wednesday
        </div>
      </div>
    </SlideShell>
  );
}

function ProgressRail({
  slideIndex,
  awards,
  onDot,
}: {
  slideIndex: number;
  awards: Award[];
  onDot: (index: number, event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const totalSlides = awards.length + 2;
  const label =
    slideIndex === 0
      ? "Opening"
      : slideIndex === totalSlides - 1
        ? "Finale"
        : `Award ${slideIndex} / ${awards.length}`;

  return (
    <div className="fixed left-4 top-4 z-40 flex items-center gap-3 border border-white/10 bg-black/62 px-3 py-2 text-white/70 backdrop-blur-md md:left-6 md:top-6">
      <Trophy className="h-4 w-4 text-amber-200" />
      <span className="text-[10px] font-bold uppercase tracking-[0.3em]">{label}</span>
      <div className="hidden items-center gap-1.5 md:flex">
        {Array.from({ length: totalSlides }, (_, index) => (
          <button
            key={index}
            type="button"
            aria-label={`Go to slide ${index + 1}`}
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
  onExit,
}: {
  canBack: boolean;
  canNext: boolean;
  onBack: (event: MouseEvent<HTMLButtonElement>) => void;
  onNext: (event: MouseEvent<HTMLButtonElement>) => void;
  onExit: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <>
      <button
        type="button"
        aria-label="Return to title"
        onClick={onExit}
        className="fixed right-4 top-4 z-40 grid h-10 w-10 place-items-center border border-white/12 bg-black/62 text-white/62 backdrop-blur-md transition-colors hover:border-white/35 hover:text-white md:right-6 md:top-6"
      >
        <X className="h-5 w-5" />
      </button>
      <div className="fixed bottom-4 left-4 right-4 z-40 flex flex-col gap-3 md:bottom-6 md:left-6 md:right-6 md:flex-row md:items-center md:justify-between">
        <div className="border border-white/10 bg-black/62 px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-white/45 backdrop-blur-md md:text-left">
          → next · ← back · Esc exit
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
  const meta = useMemo(() => weeklyAwardsMeta(awards), [awards]);
  const reducedMotion = useReducedMotion() ?? false;
  const totalSlides = awards.length + 2;
  const [slideIndex, setSlideIndex] = useState(0);
  const [burst, setBurst] = useState<Burst | null>(null);
  const activeTone = toneForSlide(slideIndex, awards);

  const triggerSlideEffects = useCallback(
    (nextIndex: number) => {
      const nextTone = toneForSlide(nextIndex, awards);
      if (!reducedMotion) {
        setBurst({ id: Date.now(), color: TONES[nextTone].color });
      }
      if (nextIndex > 0) {
        playFanfare(isFinaleIndex(nextIndex, awards));
      }
    },
    [awards, reducedMotion],
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
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isInteractiveElement(event.target)) return;

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
  }, [goBack, goNext, goTitle]);

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

  const handleExit = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    goTitle();
  };

  const handleDot = (index: number, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    goTo(index);
  };

  const activeAward = slideIndex > 0 && slideIndex <= awards.length ? awards[slideIndex - 1] : null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0b] text-white" onClick={handleStageClick}>
      <CosmicBackdrop tone={activeTone} />
      <ParticleBurst burst={burst} reducedMotion={reducedMotion} />
      <ProgressRail slideIndex={slideIndex} awards={awards} onDot={handleDot} />
      <Controls
        canBack={slideIndex > 0}
        canNext={slideIndex < totalSlides - 1}
        onBack={handleBack}
        onNext={handleNext}
        onExit={handleExit}
      />

      {slideIndex === 0 ? (
        <TitleSlide meta={meta} onBegin={handleBegin} reducedMotion={reducedMotion} />
      ) : activeAward ? (
        <AwardSlide
          award={activeAward}
          awardNumber={slideIndex}
          awardCount={awards.length}
          reducedMotion={reducedMotion}
        />
      ) : (
        <FinaleSlide awards={awards} meta={meta} reducedMotion={reducedMotion} />
      )}
    </div>
  );
}
