import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Crown, Maximize2, Minimize2, Sparkles, Trophy, Volume2, VolumeX, X } from "lucide-react";
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
import { AsciiFireworks } from "./AsciiFireworks";

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

type FireworkCue = {
  id: number;
  tone: AwardTone;
  finale: boolean;
};

type FireworkBurst = {
  id: number;
  color: string;
  delay: number;
  duration: number;
  launchX: number;
  sparkCount: number;
  sparkDistance: number;
  x: number;
  y: number;
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

type PodiumRank = 1 | 2 | 3;

const PODIUM_ORDER: PodiumRank[] = [2, 1, 3];
const PODIUM_AWARD_IDS = new Set(["treasury", "gatherers", "blessing", "league-champion"]);

const PODIUM_META: Record<
  PodiumRank,
  {
    color: string;
    glow: string;
    height: string;
    widthClass: string;
  }
> = {
  1: {
    color: "#facc15",
    glow: "rgba(250,204,21,0.48)",
    height: "min(15vh,10rem)",
    widthClass: "w-[min(28vw,21rem)] min-w-[min(28vw,21rem)]",
  },
  2: {
    color: "#e2e8f0",
    glow: "rgba(226,232,240,0.38)",
    height: "min(9.9vh,6.6rem)",
    widthClass: "w-[min(23vw,17rem)] min-w-[min(23vw,17rem)]",
  },
  3: {
    color: "#fb923c",
    glow: "rgba(251,146,60,0.42)",
    height: "min(7.5vh,5rem)",
    widthClass: "w-[min(21vw,15.5rem)] min-w-[min(21vw,15.5rem)]",
  },
};

const FIREWORK_STYLES = `
@keyframes awards-shell-launch {
  0% { transform: translate3d(0, 0, 0) scale(0.62); opacity: 0; }
  8% { opacity: 1; }
  78% { opacity: 1; }
  100% { transform: translate3d(var(--shell-dx), var(--shell-dy), 0) scale(0.24); opacity: 0; }
}
@keyframes awards-spark-fall {
  0% { transform: translate(-50%, -50%) scale(0.36); opacity: 0; }
  7% { opacity: 1; }
  54% { transform: translate(var(--spark-mid-x), var(--spark-mid-y)) scale(0.96); opacity: 0.95; }
  100% { transform: translate(var(--spark-x), calc(var(--spark-y) + var(--spark-gravity))) scale(0); opacity: 0; }
}
.awards-firework-shell {
  animation: awards-shell-launch var(--shell-duration) cubic-bezier(0.18, 0.72, 0.16, 1) both;
}
.awards-firework-spark {
  animation: awards-spark-fall var(--spark-duration) cubic-bezier(0.12, 0.72, 0.2, 1) both;
}
`;

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

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function fireworkPalette(tone: AwardTone) {
  return Array.from(new Set([TONES[tone].color, "#fff7ed", "#2dd4bf", "#facc15"]));
}

function makeFireworkBursts(cue: FireworkCue): FireworkBurst[] {
  const count = cue.finale ? 11 : 2 + Math.floor(Math.random() * 3);
  const palette = fireworkPalette(cue.tone);

  return Array.from({ length: count }, (_, index) => {
    const x = cue.finale ? 9 + ((index * 17 + Math.random() * 12) % 82) : 16 + ((index * 23 + Math.random() * 14) % 68);
    const y = cue.finale ? 14 + Math.random() * 44 : 22 + Math.random() * 34;
    const launchX = clampNumber(x + (Math.random() * 34 - 17), 7, 93);

    return {
      id: cue.id + index,
      color: palette[index % palette.length],
      delay: cue.finale ? index * 0.26 + Math.random() * 0.18 : index * 0.2 + Math.random() * 0.14,
      duration: cue.finale ? 0.72 + Math.random() * 0.22 : 0.62 + Math.random() * 0.18,
      launchX,
      sparkCount: cue.finale ? 34 + (index % 4) * 4 : 23 + (index % 3) * 3,
      sparkDistance: cue.finale ? 122 + Math.random() * 66 : 92 + Math.random() * 48,
      x,
      y,
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
    if (awardsAudioContext?.state === "closed") {
      awardsAudioContext = null;
    }
    awardsAudioContext ??= new AudioCtor();
    if (awardsAudioContext.state === "suspended") {
      void awardsAudioContext.resume();
    }
  } catch {
    return null;
  }

  return awardsAudioContext;
}

function stopAwardsAudio() {
  if (!awardsAudioContext || awardsAudioContext.state === "closed") {
    awardsAudioContext = null;
    return;
  }

  const context = awardsAudioContext;
  awardsAudioContext = null;
  void context.close().catch(() => undefined);
}

function makeNoiseBuffer(ctx: AudioContext, duration: number, tapered = true) {
  const sampleCount = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < sampleCount; i += 1) {
    const progress = i / sampleCount;
    const taper = tapered ? Math.max(0.08, 1 - progress) : 1;
    data[i] = (Math.random() * 2 - 1) * taper;
  }

  return buffer;
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
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(900, ctx.currentTime + start);
    gain.gain.setValueAtTime(gainValue, ctx.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
    source.buffer = makeNoiseBuffer(ctx, duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(ctx.currentTime + start);
  } catch {
    // Decorative only.
  }
}

function playApplause({ duration = 1.9, clapCount = 42, gainValue = 0.024 } = {}) {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime + 0.02;
    const noise = makeNoiseBuffer(ctx, 0.095);

    for (let i = 0; i < clapCount; i += 1) {
      const position = Math.random();
      const start = now + position * duration + (Math.random() - 0.5) * 0.04;
      const clapDuration = 0.036 + Math.random() * 0.058;
      const swell = 0.24 + Math.sin(Math.PI * position) * 0.9;
      const peak = gainValue * swell * (0.74 + Math.random() * 0.74);
      const source = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      source.buffer = noise;
      source.playbackRate.setValueAtTime(0.76 + Math.random() * 0.72, start);
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(950 + Math.random() * 1850, start);
      filter.Q.setValueAtTime(0.6 + Math.random() * 0.9, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(peak, start + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + clapDuration);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start(start);
      source.stop(start + clapDuration + 0.03);
    }
  } catch {
    // Decorative only.
  }
}

function playCheerSwell(duration = 2.8, gainValue = 0.034) {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime + 0.04;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    source.buffer = makeNoiseBuffer(ctx, duration, false);
    filter.type = "bandpass";
    filter.Q.setValueAtTime(0.54, now);
    filter.frequency.setValueAtTime(420, now);
    filter.frequency.linearRampToValueAtTime(1280, now + duration * 0.46);
    filter.frequency.linearRampToValueAtTime(760, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainValue, now + duration * 0.35);
    gain.gain.linearRampToValueAtTime(gainValue * 0.82, now + duration * 0.62);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(now);
    source.stop(now + duration);

    [196, 246.94, 293.66].forEach((frequency, index) => {
      const osc = ctx.createOscillator();
      const voiceGain = ctx.createGain();
      const voiceStart = now + index * 0.04;
      osc.type = "triangle";
      osc.frequency.setValueAtTime(frequency, voiceStart);
      osc.frequency.linearRampToValueAtTime(frequency * 1.22, voiceStart + duration * 0.52);
      osc.frequency.linearRampToValueAtTime(frequency * 1.08, voiceStart + duration);
      voiceGain.gain.setValueAtTime(0.0001, voiceStart);
      voiceGain.gain.linearRampToValueAtTime(gainValue * 0.22, voiceStart + duration * 0.26);
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, voiceStart + duration);
      osc.connect(voiceGain);
      voiceGain.connect(ctx.destination);
      osc.start(voiceStart);
      osc.stop(voiceStart + duration);
    });
  } catch {
    // Decorative only.
  }
}

function playCrowdCelebration(finale = false) {
  if (finale) {
    playApplause({ duration: 3.1, clapCount: 74, gainValue: 0.027 });
    playCheerSwell(3.25, 0.04);
    return;
  }

  playApplause({
    duration: 1.65 + Math.random() * 0.45,
    clapCount: 34 + Math.floor(Math.random() * 16),
    gainValue: 0.023,
  });
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

function FireworksLayer({ cue, reducedMotion }: { cue: FireworkCue | null; reducedMotion: boolean }) {
  const [bursts, setBursts] = useState<FireworkBurst[]>([]);

  useEffect(() => {
    if (!cue || reducedMotion) {
      setBursts([]);
      return undefined;
    }

    const nextBursts = makeFireworkBursts(cue);
    setBursts(nextBursts);

    const longest = Math.max(...nextBursts.map((burst) => burst.delay + burst.duration + 1.45));
    const timeout = window.setTimeout(() => setBursts([]), longest * 1000 + 120);
    return () => window.clearTimeout(timeout);
  }, [cue, reducedMotion]);

  if (!bursts.length || reducedMotion) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden" aria-hidden="true">
      <style>{FIREWORK_STYLES}</style>
      {bursts.map((burst) => (
        <div key={burst.id} className="absolute inset-0 overflow-hidden">
          <span
            className="awards-firework-shell absolute bottom-[-1.5vh] h-2 w-2"
            style={
              {
                left: `${burst.launchX}%`,
                "--shell-dx": `${burst.x - burst.launchX}vw`,
                "--shell-dy": `-${98 - burst.y}vh`,
                "--shell-duration": `${burst.duration}s`,
                animationDelay: `${burst.delay}s`,
                backgroundColor: burst.color,
                boxShadow: `0 0 18px ${burst.color}`,
              } as CSSProperties
            }
          />
          {Array.from({ length: burst.sparkCount }, (_, index) => {
            const angle = (index / burst.sparkCount) * Math.PI * 2 + (burst.id % 9) * 0.08;
            const distance = burst.sparkDistance * (0.72 + (index % 5) * 0.08);
            const dx = Math.cos(angle) * distance;
            const dy = Math.sin(angle) * distance;
            const sparkColor = index % 7 === 0 ? "#ffffff" : index % 5 === 0 ? "#2dd4bf" : burst.color;

            return (
              <span
                key={`${burst.id}-${index}`}
                className="awards-firework-spark absolute h-1.5 w-1.5"
                style={
                  {
                    left: `${burst.x}%`,
                    top: `${burst.y}%`,
                    "--spark-duration": `${1.02 + (index % 5) * 0.07}s`,
                    "--spark-gravity": `${62 + (index % 6) * 14}px`,
                    "--spark-mid-x": `${dx * 0.68}px`,
                    "--spark-mid-y": `${dy * 0.68 - 10}px`,
                    "--spark-x": `${dx}px`,
                    "--spark-y": `${dy}px`,
                    animationDelay: `${burst.delay + burst.duration - 0.03 + index * 0.0025}s`,
                    backgroundColor: sparkColor,
                    boxShadow: `0 0 14px ${sparkColor}`,
                  } as CSSProperties
                }
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function Sprite({
  winner,
  primary,
  reducedMotion,
  color,
  podium = false,
}: {
  winner: AwardWinner;
  primary: boolean;
  reducedMotion: boolean;
  color: string;
  podium?: boolean;
}) {
  return (
    <motion.img
      src={spriteByMascot[winner.mascot]}
      alt={`${winner.community} mascot`}
      className={cn(
        "mx-auto object-contain [image-rendering:pixelated] drop-shadow-2xl",
        podium
          ? primary
            ? "h-[min(12vh,7.75rem)] w-[min(12vh,7.75rem)]"
            : "h-[min(7.4vh,4.75rem)] w-[min(7.4vh,4.75rem)] md:h-[min(8.5vh,5.5rem)] md:w-[min(8.5vh,5.5rem)]"
          : primary
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
  podium = false,
}: {
  winner: AwardWinner;
  rank: number;
  primary: boolean;
  compact: boolean;
  tone: (typeof TONES)[AwardTone];
  reducedMotion: boolean;
  podium?: boolean;
}) {
  return (
    <motion.div
      className={cn(
        "relative min-w-0 overflow-hidden border bg-black/68 backdrop-blur-md",
        tone.border,
        podium
          ? primary
            ? "p-3 shadow-[0_0_42px_rgba(255,255,255,0.13)] md:p-4"
            : "p-2.5 md:p-3"
          : primary
            ? "p-4 shadow-[0_0_48px_rgba(255,255,255,0.13)] md:p-5"
            : "p-3 md:p-4",
        !podium && compact && "p-2.5 md:p-3",
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
        <Sprite winner={winner} primary={primary && !compact} reducedMotion={reducedMotion} color={tone.color} podium={podium} />
        <div className="mt-3 text-center">
          <h3
            className={cn(
              "display mx-auto max-w-[15ch] break-words uppercase leading-[0.86] text-white text-balance [overflow-wrap:anywhere]",
              podium
                ? primary && !compact
                  ? "text-[clamp(1.35rem,2.85vw,2.55rem)]"
                  : "text-[clamp(0.82rem,1.45vw,1.28rem)]"
                : primary && !compact
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
              podium
                ? primary && !compact
                  ? "text-[clamp(1.05rem,2.15vw,1.95rem)]"
                  : "text-[clamp(0.72rem,1.18vw,1.05rem)]"
                : primary && !compact
                  ? "text-[clamp(1.35rem,2.7vw,2.45rem)]"
                  : compact
                    ? "text-[clamp(0.95rem,1.8vw,1.45rem)]"
                    : "text-[clamp(1.1rem,2.35vw,2.1rem)]",
            )}
          >
            {winner.stat}
          </p>
          {winner.detail ? (
            <p
              className={cn(
                "mt-2 break-words uppercase tracking-[0.2em] text-white/50 [overflow-wrap:anywhere]",
                podium ? "text-[8.5px] leading-3 sm:text-[9px]" : "text-[10px] leading-4",
              )}
            >
              {winner.detail}
            </p>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

function podiumDelay(rank: PodiumRank) {
  if (rank === 3) return 0.04;
  if (rank === 2) return 0.22;
  return 0.42;
}

function usesPodium(award: Award) {
  return PODIUM_AWARD_IDS.has(award.id) && award.winners.length >= 3;
}

function PodiumPedestal({ rank }: { rank: PodiumRank }) {
  const meta = PODIUM_META[rank];

  return (
    <div
      className="relative z-10 w-full flex-none border-x border-b border-white/22"
      style={{
        height: meta.height,
        backgroundColor: meta.color,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.34), inset 0 -28px 42px rgba(0,0,0,0.34), 0 0 34px ${meta.glow}`,
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-[min(1.8vh,1rem)] origin-bottom border border-white/18"
        style={{
          background: `linear-gradient(90deg, rgba(255,255,255,0.42), ${meta.color}, rgba(0,0,0,0.2))`,
          clipPath: "polygon(6% 0, 100% 0, 94% 100%, 0 100%)",
          transform: "translateY(-78%) skewX(-10deg)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.24), rgba(255,255,255,0.05) 22%, rgba(0,0,0,0.24) 100%), linear-gradient(90deg, rgba(0,0,0,0.28), transparent 22%, rgba(255,255,255,0.16) 50%, transparent 74%, rgba(0,0,0,0.3))",
        }}
      />
      <span
        className="display absolute inset-0 grid place-items-center select-none text-[clamp(2.3rem,5.6vw,5.7rem)] font-black leading-none"
        style={{
          color: "rgba(0,0,0,0.44)",
          textShadow: "0 1px 0 rgba(255,255,255,0.34), 0 -1px 0 rgba(0,0,0,0.55)",
        }}
      >
        {rank}
      </span>
    </div>
  );
}

function PodiumWinner({
  award,
  winner,
  rank,
  tone,
  reducedMotion,
}: {
  award: Award;
  winner: AwardWinner;
  rank: PodiumRank;
  tone: (typeof TONES)[AwardTone];
  reducedMotion: boolean;
}) {
  const meta = PODIUM_META[rank];
  const delay = podiumDelay(rank);
  const primary = rank === 1;

  return (
    <motion.div
      key={`${award.id}-${winner.community}-podium`}
      className={cn(
        "relative flex h-full min-h-0 flex-col items-center justify-end",
        meta.widthClass,
        primary ? "z-20" : rank === 2 ? "z-10" : "z-0",
      )}
      initial={reducedMotion ? { opacity: 1, y: "0%" } : { opacity: 0, y: "28%" }}
      animate={{ opacity: 1, y: "0%" }}
      transition={
        reducedMotion
          ? { duration: 0.08 }
          : { type: "spring", stiffness: primary ? 180 : 160, damping: primary ? 10 : 17, mass: primary ? 0.78 : 0.7, delay }
      }
    >
      <span
        className="pointer-events-none absolute left-1/2 z-0 w-px -translate-x-1/2"
        style={{
          bottom: meta.height,
          height: primary ? "min(30vh,19rem)" : "min(24vh,15rem)",
          background: `linear-gradient(to top, transparent, ${meta.color} 48%, transparent)`,
          boxShadow: `0 0 18px ${meta.glow}`,
        }}
      />
      <div className="relative z-20 w-full">
        <WinnerCard
          winner={winner}
          rank={rank}
          primary={primary}
          compact={!primary}
          tone={tone}
          reducedMotion={reducedMotion}
          podium
        />
      </div>
      <PodiumPedestal rank={rank} />
    </motion.div>
  );
}

function PodiumStage({ award, tone, reducedMotion }: { award: Award; tone: (typeof TONES)[AwardTone]; reducedMotion: boolean }) {
  return (
    <div className="relative mx-auto mt-[min(1.8vh,1.1rem)] h-[min(48vh,31rem)] w-full max-w-6xl overflow-hidden px-1 sm:px-2">
      <div
        className="pointer-events-none absolute inset-x-[4%] bottom-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${tone.color}, transparent)`,
          boxShadow: `0 0 22px ${tone.glow}`,
        }}
      />
      <div className="relative z-10 flex h-full min-h-0 items-end justify-center gap-[clamp(0.35rem,1.2vw,1.15rem)]">
        {PODIUM_ORDER.map((rank) => {
          const winner = award.winners[rank - 1];
          if (!winner) return null;

          return <PodiumWinner key={`${award.id}-${rank}`} award={award} winner={winner} rank={rank} tone={tone} reducedMotion={reducedMotion} />;
        })}
      </div>
    </div>
  );
}

function WinnersStage({ award, tone, reducedMotion }: { award: Award; tone: (typeof TONES)[AwardTone]; reducedMotion: boolean }) {
  if (usesPodium(award)) {
    return <PodiumStage award={award} tone={tone} reducedMotion={reducedMotion} />;
  }

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
  onToggleMute,
  onToggleFullscreen,
  onExit,
  isFullscreen,
  muted,
}: {
  canBack: boolean;
  canNext: boolean;
  onBack: (event: MouseEvent<HTMLButtonElement>) => void;
  onNext: (event: MouseEvent<HTMLButtonElement>) => void;
  onToggleMute: (event: MouseEvent<HTMLButtonElement>) => void;
  onToggleFullscreen: (event: MouseEvent<HTMLButtonElement>) => void;
  onExit: (event: MouseEvent<HTMLButtonElement>) => void;
  isFullscreen: boolean;
  muted: boolean;
}) {
  return (
    <>
      <div className="fixed right-4 top-4 z-40 flex items-center gap-2 md:right-6 md:top-6">
        <button
          type="button"
          aria-label={muted ? "Unmute ceremony audio" : "Mute ceremony audio"}
          onClick={onToggleMute}
          className="grid h-10 w-10 place-items-center border border-white/12 bg-black/62 text-white/62 backdrop-blur-md transition-colors hover:border-white/35 hover:text-white"
        >
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
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
          → next · ← back · M mute · F fullscreen · Esc exit
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
  const finaleMusicRef = useRef<HTMLAudioElement>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [fireworkCue, setFireworkCue] = useState<FireworkCue | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [muted, setMuted] = useState(false);
  const activeSlide = deck[slideIndex] ?? OPENING_SLIDE;
  const activeTone = activeSlide.tone;
  const finaleMusicActive = isFinaleMoment(activeSlide);
  // ASCII text-art fireworks are the celebration effect on every winner slide
  // (awards + finale), replacing the old particle dots entirely.
  const fireworksActive = activeSlide.kind === "award" || activeSlide.kind === "finale";

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

  const toggleMute = useCallback(() => {
    setMuted((current) => {
      const next = !current;
      if (next) {
        stopAwardsAudio();
      }
      return next;
    });
  }, []);

  const triggerSlideEffects = useCallback(
    (nextIndex: number) => {
      const nextSlide = deck[nextIndex] ?? OPENING_SLIDE;

      if (!muted && nextSlide.kind !== "title") {
        const finale = isFinaleMoment(nextSlide);
        playFanfare(finale);
        if (nextSlide.kind === "award" || nextSlide.kind === "finale") {
          playCrowdCelebration(finale);
        }
      }
    },
    [deck, muted, reducedMotion],
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
    const audio = finaleMusicRef.current;
    if (!audio) return;

    audio.volume = 0.5;
    audio.loop = true;
    audio.muted = muted;

    if (finaleMusicActive && !muted) {
      void audio.play().catch(() => undefined);
      return;
    }

    audio.pause();

    if (!finaleMusicActive) {
      try {
        audio.currentTime = 0;
      } catch {
        // Some browsers reject seeking before metadata is available.
      }
    }
  }, [finaleMusicActive, muted]);

  useEffect(() => {
    return () => {
      const audio = finaleMusicRef.current;
      if (!audio) return;

      audio.pause();
      try {
        audio.currentTime = 0;
      } catch {
        // Decorative audio cleanup only.
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isInteractiveElement(event.target)) return;

      if (event.key.toLowerCase() === "m") {
        event.preventDefault();
        toggleMute();
        return;
      }

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
  }, [goBack, goNext, goTitle, toggleFullscreen, toggleMute]);

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

  const handleToggleMute = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    toggleMute();
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
      <AsciiFireworks active={fireworksActive} />
      <audio ref={finaleMusicRef} src="/music/dawn_of_the_kingdom.mp3" loop preload="auto" className="hidden" />
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
        onToggleMute={handleToggleMute}
        onToggleFullscreen={handleToggleFullscreen}
        onExit={handleExit}
        isFullscreen={isFullscreen}
        muted={muted}
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
