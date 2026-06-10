import { useMemo } from "react";
import { motion } from "motion/react";
import { buildWeeklyAwards, type Award } from "@/lib/weeklyAwards";

const TONE_COLORS = {
  gold: "#facc15",
  teal: "#2dd4bf",
  violet: "#a855f7",
  rose: "#fb7185",
  blue: "#4f7fff",
} as const;

function AwardChip({ award }: { award: Award }) {
  const firstWinner = award.winners[0];
  const hasMore = award.winners.length > 1;
  const moreCount = award.winners.length - 1;
  const glowColor = TONE_COLORS[award.tone] || TONE_COLORS.gold;

  if (!firstWinner) return null;

  return (
    <div className="flex items-center gap-3 border border-white/5 bg-white/[0.02] p-3 transition hover:border-white/15 hover:bg-white/[0.04] rounded-none">
      {/* Emoji Glyph with Tone-Colored Glow */}
      <div
        className="flex size-10 shrink-0 items-center justify-center border bg-black/40 text-xl font-bold rounded-none"
        style={{
          borderColor: `${glowColor}40`,
          boxShadow: `0 0 12px ${glowColor}26`,
          textShadow: `0 0 6px ${glowColor}80`,
        }}
      >
        {award.emoji}
      </div>

      {/* Title & Winner */}
      <div className="min-w-0 flex-1">
        <span className="block truncate text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">
          {award.title}
        </span>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-white">
          <span className="truncate">
            🏅 {firstWinner.community} · {firstWinner.stat}
          </span>
          {hasMore && (
            <span className="shrink-0 border border-white/10 bg-white/[0.05] px-1.5 py-0.5 font-mono text-[9px] font-bold text-white/60">
              +{moreCount} more
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function AwardsRecap() {
  const awards = useMemo(() => buildWeeklyAwards(), []);

  return (
    <motion.div
      className="relative border border-white/10 bg-black/60 p-6 md:p-8 backdrop-blur-md rounded-none overflow-hidden"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Radial glow background in the card container */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(circle at 50% 20%, rgba(79,127,255,0.08), transparent 45%)",
        }}
      />

      <div className="relative z-10">
        {/* Header section with Title and CTA Button */}
        <div className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-signal font-bold">
              WEDNESDAY RECOGNITION
            </p>
            <h2 className="display mt-1.5 text-3xl uppercase tracking-[-0.03em] text-white md:text-4xl">
              THIS WEEK’S AWARDS
            </h2>
          </div>
          <div className="flex flex-col items-stretch sm:items-start md:items-end gap-1.5">
            <a
              href="/awards"
              className="inline-flex h-11 items-center justify-center gap-2 border border-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 px-5 text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-100 transition shadow-[0_0_12px_rgba(45,212,191,0.2)] hover:shadow-[0_0_18px_rgba(45,212,191,0.35)] cursor-pointer"
            >
              <span>PRESENT THE AWARDS →</span>
            </a>
            <p className="text-[10px] uppercase tracking-[0.15em] text-white/35 text-center md:text-right">
              Screen-share for the Wednesday meeting
            </p>
          </div>
        </div>

        {/* Responsive Grid of Award Chips */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {awards.map((award) => (
            <AwardChip key={award.id} award={award} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
