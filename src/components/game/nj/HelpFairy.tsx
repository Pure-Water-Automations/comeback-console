import { useCallback, useEffect, useRef, useState } from "react";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";

// Floating fairy sprite (original Navi)
import naviImg from "@/assets/sprites/spirit/navi.gif";

// Davi Rendelwing face frames for the JRPG dialog.
// These are the *cleaned* sprites: background checkerboard keyed to real
// transparency and every frame re-aligned to a common top-center anchor
// (see scripts/clean-davi-sprites.cjs) so the head doesn't jitter when cycling.
import faceMouthClosed from "@/assets/sprites/davi/clean/David_neutral_pleasant.png";
import faceMouthSlightlyOpen from "@/assets/sprites/davi/clean/David_mouth_slightly_open.png";
import faceMouthOpen from "@/assets/sprites/davi/clean/David_mouth_open.png";
import faceMouthWideOpen from "@/assets/sprites/davi/clean/David_mouth_wide_open.png";
import faceEyesClosed from "@/assets/sprites/davi/clean/David_eyes_closed.png";
import faceGentleSmile from "@/assets/sprites/davi/clean/David_gentle_smile.png";
import faceNeutralSmile from "@/assets/sprites/davi/clean/David_neutral_smile.png";

import naviHeySfx from "@/assets/audio/navi-hey.mp3";
import helloSfx from "@/assets/audio/hello.mp3";
import listenSfx from "@/assets/audio/listen.mp3";
import lookSfx from "@/assets/audio/look.mp3";
import finishSfx from "@/assets/audio/finish-tutorial.mp3";
import { awardOnce } from "@/lib/progression";
import { celebrate } from "./ProgressHud";
import type { NJTabId } from "./NJConsole";

// ─── Audio ───────────────────────────────────────────────────────────────────

// Davi's voice clips. `hello` greets on open, `finish` plays on completion, and
// the step-arrival sounds rotate through a small pool so it doesn't feel repetitive.
const audioCache = new Map<string, HTMLAudioElement>();
function playClip(src: string, volume = 0.45) {
  if (typeof window === "undefined") return;
  try {
    let base = audioCache.get(src);
    if (!base) { base = new Audio(src); audioCache.set(src, base); }
    // Clone so rapid step-throughs can overlap instead of cutting each other off.
    const clip = base.cloneNode(true) as HTMLAudioElement;
    clip.volume = volume;
    void clip.play().catch(() => {});
  } catch {
    /* ignore autoplay blocks */
  }
}

// Rotating pool of "arrived at a step" sounds — keeps the original navi chime
// plus Davi's "Listen!" and "Look!" so each advance feels varied.
const STEP_SFX = [listenSfx, lookSfx, naviHeySfx];
function playStepSfx(stepIndex: number) {
  playClip(STEP_SFX[stepIndex % STEP_SFX.length], 0.45);
}
const playHello = () => playClip(helloSfx, 0.5);
const playFinish = () => playClip(finishSfx, 0.55);

// ─── Tab helpers ──────────────────────────────────────────────────────────────

// Find a top-tab trigger button by its visible label (Radix renders role="tab").
// Used only to position the highlight ring; tab *switching* goes through the
// onNavigateTab callback (the same path the route uses) — NOT a DOM click, which
// is unreliable for driving the controlled <Tabs>.
function getTabTrigger(label: string): HTMLElement | null {
  const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
  const lower = label.toLowerCase();
  return (
    (tabs.find((t) => t.textContent?.trim().toLowerCase() === lower) as HTMLElement) ||
    (tabs.find((t) => t.textContent?.trim().toLowerCase().includes(lower)) as HTMLElement) ||
    null
  );
}

// ─── Tour steps ──────────────────────────────────────────────────────────────

interface TourStep {
  id: string;
  title: string;
  text: string;
  selector: string | (() => HTMLElement | null);
  /** When set, the tour switches to this tab as the step becomes active. */
  tab?: NJTabId;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "header",
    title: "NJ Console Overview",
    selector: "header",
    text: "Welcome, Pastor! This is the New Jersey community console at a glance — your capacity, pastor roles, and the latest campaign snapshot date.",
  },
  {
    id: "mascot",
    title: "Your Lead Pastor",
    selector: '[aria-label="New Jersey leader mascot"]',
    text: "This is your community's lead pastor in JRPG form! Clicking them triggers a pulse animation — and doing it 7 times unlocks a hidden Easter egg!",
  },
  {
    id: "hud",
    title: "Progression HUD",
    selector: "section",
    text: "This HUD tracks your community XP, Rank level, and active campaign bonuses. Achievements slide in at the top the moment they're unlocked!",
  },
  {
    id: "tabs",
    title: "Scoreboard Tabs",
    selector: '[role="tablist"]',
    text: "These six tabs are the heart of the console. Let me walk you through each one — here's what every view is for.",
  },
  {
    id: "tab-overview",
    title: "Overview Tab",
    tab: "overview",
    selector: () => getTabTrigger("Overview"),
    text: "Your Pastor HQ: Sunday momentum, active members, blessing progress, year-to-date finances, your T2 standing, and the items that need attention this trimester.",
  },
  {
    id: "tab-finance",
    title: "Finance Tab",
    tab: "finance",
    selector: () => getTabTrigger("Finance"),
    text: "Track tithing and offering trends, your monthly net, and how those dollars convert into Finance points on the regional scoreboard.",
  },
  {
    id: "tab-attendance",
    title: "Attendance Tab",
    tab: "attendance",
    selector: () => getTabTrigger("Attendance"),
    text: "Watch your Sunday Service and event attendance trends, then sharpen your recall in the Memory Training mini-game.",
  },
  {
    id: "tab-people",
    title: "People Tab",
    tab: "people",
    selector: () => getTabTrigger("People"),
    text: "Your community directory — core, active, and inactive members — with reconnect lanes for the people you haven't seen in a while.",
  },
  {
    id: "tab-blessing",
    title: "Blessing Tab",
    tab: "blessing",
    selector: () => getTabTrigger("Blessing"),
    text: "Your blessing campaign: progress toward the annual goal and the Blessing points it earns for New Jersey.",
  },
  {
    id: "tab-trophies",
    title: "Trophies Tab",
    tab: "trophies",
    selector: () => getTabTrigger("Trophies"),
    text: "The trophy room: every achievement, badge, and hidden Easter egg you've unlocked on the console. That's the full tour — go get 'em!",
  },
];

// ─── Face animation ───────────────────────────────────────────────────────────

const SPEAKING_FRAMES = [
  faceMouthClosed,
  faceMouthSlightlyOpen,
  faceMouthOpen,
  faceMouthWideOpen,
  faceMouthOpen,
  faceMouthSlightlyOpen,
  faceMouthClosed,
  faceNeutralSmile,
];

const IDLE_FRAMES = [
  faceGentleSmile,
  faceGentleSmile,
  faceGentleSmile,
  faceGentleSmile,
  faceEyesClosed, // blink
  faceGentleSmile,
];

const SPEAKING_MS = 110;
const IDLE_MS = 320;
const TYPEWRITER_MS = 28;

function useFaceFrame(isSpeaking: boolean, reducedMotion: boolean): string {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (reducedMotion) { setFrame(0); return; }
    const frames = isSpeaking ? SPEAKING_FRAMES : IDLE_FRAMES;
    const ms = isSpeaking ? SPEAKING_MS : IDLE_MS;
    const id = setInterval(() => setFrame((f) => (f + 1) % frames.length), ms);
    return () => clearInterval(id);
  }, [isSpeaking, reducedMotion]);
  const frames = isSpeaking ? SPEAKING_FRAMES : IDLE_FRAMES;
  return frames[frame % frames.length];
}

function useTypewriter(text: string, active: boolean) {
  const [displayed, setDisplayed] = useState("");
  const indexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setDisplayed("");
    indexRef.current = 0;
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (!active || !text) return;
    intervalRef.current = setInterval(() => {
      indexRef.current += 1;
      setDisplayed(text.slice(0, indexRef.current));
      if (indexRef.current >= text.length && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, TYPEWRITER_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [text, active]);

  // Instantly reveal the whole line (click / key to skip the animation).
  const skip = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    indexRef.current = text.length;
    setDisplayed(text);
  }, [text]);

  return { displayed, done: displayed.length >= text.length, skip };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HelpFairy({
  open,
  onClose,
  onNavigateTab,
}: {
  open: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: NJTabId) => void;
}) {
  const reducedMotion = useReducedMotion() ?? false;
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [firstRender, setFirstRender] = useState(true);

  const currentStep = TOUR_STEPS[currentStepIndex];
  const fullText = currentStep?.text ?? "";
  const { displayed, done: typewriterDone, skip } = useTypewriter(fullText, open);
  const faceImg = useFaceFrame(!typewriterDone, reducedMotion);

  // ── Element helpers ──────────────────────────────────────────────────────

  const getStepElement = useCallback((step: TourStep): HTMLElement | null => {
    if (typeof step.selector === "function") return step.selector();
    try { return document.querySelector(step.selector) as HTMLElement | null; }
    catch { return null; }
  }, []);

  const findNextValidIndex = useCallback(
    (startIndex: number, direction: 1 | -1): number | null => {
      let idx = startIndex;
      while (idx >= 0 && idx < TOUR_STEPS.length) {
        if (getStepElement(TOUR_STEPS[idx])) return idx;
        idx += direction;
      }
      return null;
    },
    [getStepElement],
  );

  const updateRect = useCallback(() => {
    if (!currentStep) return;
    const el = getStepElement(currentStep);
    setTargetRect(el ? el.getBoundingClientRect() : null);
  }, [currentStep, getStepElement]);

  // ── Navigation ───────────────────────────────────────────────────────────

  // JRPG advance: first interaction completes the typewriter, the next advances.
  const handleAdvance = useCallback(() => {
    if (!typewriterDone) { skip(); return; }
    const nextIdx = findNextValidIndex(currentStepIndex + 1, 1);
    if (nextIdx !== null) {
      setCurrentStepIndex(nextIdx);
      playStepSfx(nextIdx);
    } else {
      celebrate(awardOnce("tour_completed", "tour:done"));
      playFinish();
      onClose();
    }
  }, [typewriterDone, skip, currentStepIndex, findNextValidIndex, onClose]);

  const handlePrev = useCallback(() => {
    const prevIdx = findNextValidIndex(currentStepIndex - 1, -1);
    if (prevIdx !== null) {
      setCurrentStepIndex(prevIdx);
      playStepSfx(prevIdx);
    }
  }, [currentStepIndex, findNextValidIndex]);

  // ── Effects ──────────────────────────────────────────────────────────────

  // Switch to the step's tab FIRST (through the same route callback the console
  // uses), before measuring the highlight position.
  useEffect(() => {
    if (!open) return;
    if (currentStep?.tab) onNavigateTab?.(currentStep.tab);
  }, [open, currentStepIndex]);

  useEffect(() => {
    if (!open) return;
    celebrate(awardOnce("help_opened", "help"));
    if (currentStep) celebrate(awardOnce("tour_step", `tour:${currentStep.id}`));
  }, [open, currentStepIndex]);

  useEffect(() => {
    if (!open) { setFirstRender(true); return; }

    if (firstRender) {
      const firstIdx = findNextValidIndex(0, 1);
      if (firstIdx !== null) { setCurrentStepIndex(firstIdx); }
      else { onClose(); return; }
      setFirstRender(false);
      playHello();
    }

    updateRect();
    window.addEventListener("scroll", updateRect, { passive: true });
    window.addEventListener("resize", updateRect);

    if (currentStep) {
      const el = getStepElement(currentStep);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        // Re-measure after the tab switch + scroll settle.
        const t1 = setTimeout(updateRect, 120);
        const t2 = setTimeout(updateRect, 380);
        return () => {
          window.removeEventListener("scroll", updateRect);
          window.removeEventListener("resize", updateRect);
          clearTimeout(t1);
          clearTimeout(t2);
        };
      }
    }
    return () => {
      window.removeEventListener("scroll", updateRect);
      window.removeEventListener("resize", updateRect);
    };
  }, [open, currentStepIndex, firstRender, findNextValidIndex, updateRect, getStepElement, onClose]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
        e.preventDefault(); handleAdvance();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault(); handlePrev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleAdvance, handlePrev, onClose]);

  if (!open) return null;

  // ── Floating fairy layout ─────────────────────────────────────────────────

  const getFloatingLayout = () => {
    const w = typeof window !== "undefined" ? window.innerWidth : 1024;
    const h = typeof window !== "undefined" ? window.innerHeight : 768;
    const fairyWidth = 80;
    const fairyHeight = 80;
    const dialogHeight = 170;
    const safeBottom = h - dialogHeight - fairyHeight - 16;

    if (!targetRect) {
      return { x: w / 2 - fairyWidth / 2, y: Math.min(h / 2 - fairyHeight / 2, safeBottom) };
    }
    let x = targetRect.left + targetRect.width / 2 - fairyWidth / 2;
    let y = targetRect.bottom + 12;
    if (y + fairyHeight > safeBottom) {
      y = targetRect.top - fairyHeight - 12;
    }
    x = Math.max(16, Math.min(w - fairyWidth - 16, x));
    y = Math.max(16, Math.min(safeBottom, y));
    return { x, y };
  };

  const { x: fairyX, y: fairyY } = getFloatingLayout();
  const isLast = currentStepIndex === TOUR_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Dim backdrop — click anywhere to skip the text / advance */}
      <div
        className="absolute inset-0 bg-black/50 pointer-events-auto cursor-pointer"
        onClick={handleAdvance}
      />

      {/* Target element highlight ring */}
      {targetRect && (
        <motion.div
          className="fixed pointer-events-none z-50 border border-cyan-400/80 shadow-[0_0_16px_rgba(34,211,238,0.3)]"
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0.6, 1, 0.6],
            boxShadow: ["0 0 8px rgba(34,211,238,0.2)", "0 0 20px rgba(34,211,238,0.5)", "0 0 8px rgba(34,211,238,0.2)"],
          }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
          }}
        />
      )}

      {/* ── Floating Navi fairy ───────────────────────────────────────── */}
      <motion.div
        className="fixed z-50 pointer-events-none"
        animate={{ x: fairyX, y: fairyY }}
        transition={
          reducedMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 85, damping: 19, mass: 0.8 }
        }
      >
        <motion.div
          className="relative flex items-center justify-center w-20 h-20"
          animate={reducedMotion ? {} : { y: [0, -6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="absolute animate-ping h-8 w-8 rounded-full bg-cyan-400/10" />
            <Sparkles className="absolute text-cyan-300 size-4 opacity-30 animate-pulse" />
          </div>
          <img
            src={naviImg}
            alt="Davi Rendelwing"
            className="w-20 h-20 object-contain drop-shadow-[0_0_14px_rgba(34,211,238,0.7)]"
          />
        </motion.div>
      </motion.div>

      {/* ── JRPG dialog box ───────────────────────────────────────────── */}
      <AnimatePresence>
        {currentStep && (
          <motion.div
            key={currentStepIndex}
            className="fixed bottom-0 left-0 right-0 z-50 pointer-events-auto"
            initial={{ y: 140, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 140, opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 28 }}
          >
            <div className="relative mx-auto max-w-5xl">
              <div className="h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />

              {/* Click the portrait/text area to skip text or advance (JRPG style) */}
              <div
                className="flex gap-0 border-t border-x border-cyan-500/20 shadow-[0_-8px_40px_rgba(6,182,212,0.18)] cursor-pointer"
                style={{ background: "#040812", minHeight: "160px" }}
                onClick={handleAdvance}
              >
                {/* Portrait panel */}
                <div
                  className="relative flex-shrink-0 flex flex-col items-center justify-end border-r border-cyan-500/15"
                  style={{ width: "160px", background: "#040812" }}
                >
                  <div className="absolute top-0 left-0 right-0 z-10 border-b border-cyan-500/25 px-2 py-1 text-center"
                    style={{ background: "rgba(8,30,48,0.92)" }}>
                    <span className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-300">
                      Davi Rendelwing
                    </span>
                  </div>
                  <div
                    className="flex items-end justify-center overflow-hidden"
                    style={{ width: "152px", height: "168px", marginTop: "20px" }}
                  >
                    <img
                      src={faceImg}
                      alt="Davi Rendelwing"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        objectPosition: "50% 100%",
                        display: "block",
                        imageRendering: "auto",
                      }}
                    />
                  </div>
                </div>

                {/* Text panel */}
                <div className="flex-1 flex flex-col justify-between p-5 pl-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {TOUR_STEPS.map((_, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                              i === currentStepIndex ? "bg-cyan-400" : i < currentStepIndex ? "bg-cyan-700" : "bg-white/15"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-white/35">
                        {currentStepIndex + 1} / {TOUR_STEPS.length}
                      </span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); onClose(); }}
                      className="text-white/30 hover:text-white/70 transition p-1 -mr-1"
                      title="Close Tour"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>

                  <div className="mb-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-400">
                      {currentStep.title}
                    </span>
                  </div>

                  <div className="flex-1">
                    <p className="text-[13px] text-white/85 leading-relaxed font-sans min-h-[2.8em]">
                      {reducedMotion ? fullText : displayed}
                      {!typewriterDone && !reducedMotion && (
                        <motion.span
                          className="inline-block ml-0.5 w-0.5 h-3.5 bg-cyan-300 align-middle"
                          animate={{ opacity: [1, 0] }}
                          transition={{ duration: 0.55, repeat: Infinity, repeatType: "reverse" }}
                        />
                      )}
                    </p>
                  </div>

                  {/* Nav row — stop propagation so its buttons don't double-fire advance */}
                  <div
                    className="flex items-center justify-between mt-3 pt-2 border-t border-white/5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={onClose}
                      className="text-[9px] font-bold uppercase tracking-widest text-white/30 hover:text-white/60 transition"
                    >
                      Skip Tour
                    </button>

                    <div className="flex items-center gap-2">
                      {currentStepIndex > 0 && (
                        <button
                          onClick={handlePrev}
                          className="flex items-center gap-0.5 text-white/40 hover:text-white/70 border border-white/10 hover:border-white/25 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-widest transition"
                        >
                          <ChevronLeft className="size-3" />
                          <span>Back</span>
                        </button>
                      )}
                      <button
                        onClick={handleAdvance}
                        className="flex items-center gap-1 px-4 py-1.5 text-[9px] font-black uppercase tracking-widest transition border bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border-cyan-500/30 hover:border-cyan-500/55"
                      >
                        <span>{!typewriterDone ? "Skip" : isLast ? "Finish" : "Next"}</span>
                        <ChevronRight className="size-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
