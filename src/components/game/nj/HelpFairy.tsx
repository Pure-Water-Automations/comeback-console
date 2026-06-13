import { useCallback, useEffect, useState } from "react";
import { X, ChevronRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import spiritGlowImg from "@/assets/sprites/spirit/spirit_glow.png";
import spiritWaveImg from "@/assets/sprites/spirit/spirit_wave.png";

// Lazy WebAudio AudioContext
let audioContext: AudioContext | null = null;

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

function playTone(
  frequency: number,
  start: number,
  duration: number,
  gainValue = 0.015,
  type: OscillatorType = "sine",
) {
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
    // Ignore audio policy blocks
  }
}

function playPopSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.03, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  } catch {
    void 0;
  }
}

function playSparkleSound() {
  // Sparkle arpeggio (E5, G5, C6)
  const notes = [659.25, 783.99, 1046.5];
  notes.forEach((freq, idx) => {
    playTone(freq, idx * 0.08, 0.22, 0.012, "triangle");
  });
}

interface TourStep {
  id: string;
  title: string;
  text: string;
  selector: string | (() => HTMLElement | null);
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "header",
    title: "NJ Console Overview",
    selector: "header",
    text: "Welcome, Pastor! This is the New Jersey community console at a glance. It displays your capacity, pastor roles, and the latest campaign snapshot date.",
  },
  {
    id: "mascot",
    title: "Adventurer Mascot",
    selector: '[aria-label="Adventurer mascot"]',
    text: "This is your community adventurer mascot. Clicking them triggers a pulse animation, and doing it 7 times unlocks a hidden Easter egg!",
  },
  {
    id: "party",
    title: "Your Party Staff",
    selector: () => {
      const buttons = Array.from(document.querySelectorAll("button"));
      return buttons.find((b) => b.textContent?.includes("Your Party")) || null;
    },
    text: "Click 'Your Party' to build and manage your staff team. Gather active community builders here to boost your progress standings.",
  },
  {
    id: "hud",
    title: "Progression HUD",
    selector: "section",
    text: "This HUD tracks your community XP, Rank level, and active campaign bonuses. Achievements will slide in at the top when unlocked!",
  },
  {
    id: "tabs",
    title: "Scoreboard Tabs",
    selector: '[role="tablist"]',
    text: "Switch between Overview, Finance, Attendance, People, Blessing, Quests, Outreach, and Trophies to view different aspects of your community.",
  },
];

export function HelpFairy({ open, onClose }: { open: boolean; onClose: () => void }) {
  const reducedMotion = useReducedMotion();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [sprite, setSprite] = useState(spiritGlowImg);
  const [firstRender, setFirstRender] = useState(true);

  // Helper to retrieve real DOM element for current step
  const getStepElement = useCallback((step: TourStep): HTMLElement | null => {
    if (typeof step.selector === "function") {
      return step.selector();
    }
    try {
      return document.querySelector(step.selector) as HTMLElement | null;
    } catch {
      return null;
    }
  }, []);

  // Find next valid index where elements exist
  const findNextValidIndex = useCallback(
    (startIndex: number, direction: 1 | -1): number | null => {
      let idx = startIndex;
      while (idx >= 0 && idx < TOUR_STEPS.length) {
        const el = getStepElement(TOUR_STEPS[idx]);
        if (el) return idx;
        idx += direction;
      }
      return null;
    },
    [getStepElement],
  );

  // Measure current targeted element's rect
  const updateRect = useCallback(() => {
    const currentStep = TOUR_STEPS[currentStepIndex];
    if (!currentStep) return;
    const el = getStepElement(currentStep);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [currentStepIndex, getStepElement]);

  // Handle navigation
  const handleNext = useCallback(() => {
    const nextIdx = findNextValidIndex(currentStepIndex + 1, 1);
    if (nextIdx !== null) {
      setCurrentStepIndex(nextIdx);
    } else {
      onClose();
    }
  }, [currentStepIndex, findNextValidIndex, onClose]);

  const handlePrev = useCallback(() => {
    const prevIdx = findNextValidIndex(currentStepIndex - 1, -1);
    if (prevIdx !== null) {
      setCurrentStepIndex(prevIdx);
    }
  }, [currentStepIndex, findNextValidIndex]);

  // Set up keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleNext, handlePrev, onClose]);

  // Scroll current element into view and calculate coordinates
  useEffect(() => {
    if (!open) {
      setFirstRender(true);
      return;
    }

    // Initialize first valid step when opening
    if (firstRender) {
      const firstIdx = findNextValidIndex(0, 1);
      if (firstIdx !== null) {
        setCurrentStepIndex(firstIdx);
      } else {
        onClose();
        return;
      }
      playPopSound();
      setFirstRender(false);
    }

    // Play sparkle sound when step arrives
    const soundTimer = setTimeout(() => {
      playSparkleSound();
    }, 80);

    // Wave sprite effect when arriving
    setSprite(spiritWaveImg);
    const spriteTimer = setTimeout(() => {
      setSprite(spiritGlowImg);
    }, 900);

    updateRect();
    window.addEventListener("scroll", updateRect, { passive: true });
    window.addEventListener("resize", updateRect);

    // Scroll step element into view
    const currentStep = TOUR_STEPS[currentStepIndex];
    if (currentStep) {
      const el = getStepElement(currentStep);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        // Re-measure after scroll animation
        const measureTimer = setTimeout(updateRect, 350);
        return () => {
          window.removeEventListener("scroll", updateRect);
          window.removeEventListener("resize", updateRect);
          clearTimeout(soundTimer);
          clearTimeout(spriteTimer);
          clearTimeout(measureTimer);
        };
      }
    }

    return () => {
      window.removeEventListener("scroll", updateRect);
      window.removeEventListener("resize", updateRect);
      clearTimeout(soundTimer);
      clearTimeout(spriteTimer);
    };
  }, [
    open,
    currentStepIndex,
    firstRender,
    findNextValidIndex,
    updateRect,
    getStepElement,
    onClose,
  ]);

  if (!open) return null;

  // Calculate coordinates & layout classes
  const getLayout = () => {
    const w = typeof window !== "undefined" ? window.innerWidth : 1024;
    const h = typeof window !== "undefined" ? window.innerHeight : 768;

    const fairyWidth = 80;
    const fairyHeight = 80;
    const bubbleWidth = 280;
    const bubbleHeight = 130;
    const spacing = 16;

    if (!targetRect) {
      // Center placement when element not resolved
      return {
        x: w / 2 - (bubbleWidth + fairyWidth + spacing) / 2,
        y: h / 2 - bubbleHeight / 2,
        flexDirection: "flex-row items-center",
        arrowClass: "hidden",
      };
    }

    const currentStep = TOUR_STEPS[currentStepIndex];
    const isHeader = currentStep?.selector === "header";
    const isTabList = currentStep?.selector === '[role="tablist"]';
    const isWide = targetRect.width > w * 0.6 || isHeader || isTabList;

    let x = 0;
    let y = 0;
    let flexDirection = "flex-row";
    let arrowClass = "";

    if (isWide) {
      // Wide element -> place vertically (top/bottom)
      if (targetRect.bottom > h - 260) {
        // Near bottom -> place above
        flexDirection = "flex-col-reverse items-center";
        x = targetRect.left + targetRect.width / 2 - bubbleWidth / 2;
        y = targetRect.top - (fairyHeight + spacing + bubbleHeight);
        arrowClass =
          "absolute top-full left-1/2 -translate-x-1/2 border-x-8 border-x-transparent border-t-8 border-t-cyan-500/30 after:absolute after:bottom-[2px] after:left-1/2 after:-translate-x-1/2 after:border-x-6 after:border-x-transparent after:border-t-6 after:border-t-[#070710]/95";
      } else {
        // Default -> place below
        flexDirection = "flex-col items-center";
        x = targetRect.left + targetRect.width / 2 - bubbleWidth / 2;
        y = targetRect.bottom + spacing;
        arrowClass =
          "absolute bottom-full left-1/2 -translate-x-1/2 border-x-8 border-x-transparent border-b-8 border-b-cyan-500/30 after:absolute after:top-[2px] after:left-1/2 after:-translate-x-1/2 after:border-x-6 after:border-x-transparent after:border-b-6 after:border-b-[#070710]/95";
      }
      // Clamp coordinates
      x = Math.max(16, Math.min(w - bubbleWidth - 16, x));
      y = Math.max(16, Math.min(h - (fairyHeight + spacing + bubbleHeight) - 16, y));
    } else {
      // Narrow element -> place horizontally (left/right)
      const targetCenterX = targetRect.left + targetRect.width / 2;
      if (targetCenterX > w / 2) {
        // Place left of target
        flexDirection = "flex-row-reverse items-center";
        x = targetRect.left - (bubbleWidth + fairyWidth + spacing);
        y = targetRect.top + targetRect.height / 2 - Math.max(fairyHeight, bubbleHeight) / 2;
        arrowClass =
          "absolute left-full top-1/2 -translate-y-1/2 border-y-8 border-y-transparent border-l-8 border-l-cyan-500/30 after:absolute after:right-[2px] after:top-1/2 after:-translate-y-1/2 after:border-y-6 after:border-y-transparent after:border-l-6 after:border-l-[#070710]/95";
      } else {
        // Place right of target
        flexDirection = "flex-row items-center";
        x = targetRect.right + spacing;
        y = targetRect.top + targetRect.height / 2 - Math.max(fairyHeight, bubbleHeight) / 2;
        arrowClass =
          "absolute right-full top-1/2 -translate-y-1/2 border-y-8 border-y-transparent border-r-8 border-r-cyan-500/30 after:absolute after:left-[2px] after:top-1/2 after:-translate-y-1/2 after:border-y-6 after:border-y-transparent after:border-r-6 after:border-r-[#070710]/95";
      }
      // Clamp coordinates
      x = Math.max(16, Math.min(w - (bubbleWidth + fairyWidth + spacing) - 16, x));
      y = Math.max(16, Math.min(h - Math.max(fairyHeight, bubbleHeight) - 16, y));
    }

    return { x, y, flexDirection, arrowClass };
  };

  const layout = getLayout();
  const currentStep = TOUR_STEPS[currentStepIndex];

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Dim backdrop to block interaction and advance on click */}
      <div
        className="absolute inset-0 bg-black/45 pointer-events-auto cursor-pointer"
        onClick={handleNext}
      />

      {/* Target Element Outline Ring */}
      {targetRect && (
        <motion.div
          className="fixed border border-cyan-400/80 shadow-[0_0_16px_rgba(34,211,238,0.3)] pointer-events-none z-50 rounded-none"
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0.6, 1, 0.6],
            boxShadow: [
              "0 0 8px rgba(34,211,238,0.2)",
              "0 0 20px rgba(34,211,238,0.5)",
              "0 0 8px rgba(34,211,238,0.2)",
            ],
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
          }}
        />
      )}

      {/* Fairy + Speech Bubble Wrapper */}
      <motion.div
        className={`fixed z-50 flex gap-4 pointer-events-auto ${layout.flexDirection}`}
        animate={{
          x: layout.x,
          y: layout.y,
        }}
        transition={
          reducedMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 85, damping: 19, mass: 0.8 }
        }
      >
        {/* The Fairy Sprite */}
        <motion.div
          className="relative flex items-center justify-center w-20 h-20 shrink-0"
          animate={
            reducedMotion
              ? {}
              : {
                  y: [0, -6, 0],
                }
          }
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {/* Sparkle particles around fairy */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="absolute animate-ping h-8 w-8 rounded-full bg-cyan-400/10" />
            <Sparkles className="absolute text-cyan-300 size-4 opacity-30 animate-pulse" />
          </div>
          <img
            src={sprite}
            alt="Help Fairy"
            className="w-16 h-16 object-contain [image-rendering:pixelated] drop-shadow-[0_0_12px_rgba(34,211,238,0.6)]"
          />
        </motion.div>

        {/* Speech Bubble Tooltip */}
        {currentStep && (
          <div
            className="relative w-[280px] border border-cyan-500/25 bg-[#070710]/95 p-4 shadow-[0_0_24px_rgba(6,182,212,0.2)] rounded-none"
            onClick={(e) => e.stopPropagation()} // Stop event bubbling so clicking bubble does not advance step
          >
            {/* The little pointer arrow */}
            <div className={layout.arrowClass} />

            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
                Step {currentStepIndex + 1} of {TOUR_STEPS.length}
              </span>
              <button
                onClick={onClose}
                className="text-white/40 hover:text-white transition p-0.5"
                title="Close Tour"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <h3 className="text-xs font-bold uppercase tracking-wider text-white mt-3 font-sans">
              {currentStep.title}
            </h3>

            <p className="text-[11px] text-white/70 mt-2 leading-relaxed font-sans">
              {currentStep.text}
            </p>

            <div className="flex items-center justify-between mt-4 border-t border-white/5 pt-3">
              <button
                onClick={onClose}
                className="text-[9px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition"
              >
                Skip Tour
              </button>
              <button
                onClick={handleNext}
                className="flex items-center gap-1 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/25 hover:border-cyan-500/45 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition"
              >
                <span>{currentStepIndex === TOUR_STEPS.length - 1 ? "Finish" : "Next"}</span>
                <ChevronRight className="size-3" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
