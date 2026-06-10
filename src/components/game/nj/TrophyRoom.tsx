import { Lock, Medal, ScrollText, Sparkles, Trophy, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";

import adventurerIdleImg from "@/assets/sprites/adventurer/adventurer_bible.png";
import mentorCheerImg from "@/assets/sprites/mentor/mentor_cheer.png";
import npcLoveImg from "@/assets/sprites/npc/npc_love.png";
import smartGuyCheerImg from "@/assets/sprites/smart_guy/smart_guy_cheer.png";
import spiritGlowImg from "@/assets/sprites/spirit/spirit_glow.png";
import wizardIdleImg from "@/assets/sprites/wizard/wizard_idle.png";
import {
  ACHIEVEMENTS,
  RARITY_ORDER,
  XP_VALUES,
  type AchievementDef,
  type Rarity,
  type XpEvent,
  useProgression,
} from "@/lib/progression";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];
const CARD = "border border-white/10 bg-black/60 backdrop-blur-md";

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
    bg: string;
    border: string;
    chip: string;
    glow: string;
    text: string;
  }
> = {
  common: {
    bg: "rgba(255,255,255,0.1)",
    border: "border-white/25",
    chip: "border-white/25 bg-white/10 text-white",
    glow: "shadow-[0_0_22px_rgba(255,255,255,0.13)]",
    text: "text-white",
  },
  rare: {
    bg: "rgba(45,212,191,0.14)",
    border: "border-teal-200/35",
    chip: "border-teal-200/35 bg-teal-300/10 text-teal-100",
    glow: "shadow-[0_0_28px_rgba(45,212,191,0.18)]",
    text: "text-teal-100",
  },
  epic: {
    bg: "rgba(168,85,247,0.15)",
    border: "border-violet-200/35",
    chip: "border-violet-200/35 bg-violet-300/10 text-violet-100",
    glow: "shadow-[0_0_32px_rgba(168,85,247,0.2)]",
    text: "text-violet-100",
  },
  legendary: {
    bg: "rgba(250,204,21,0.17)",
    border: "border-amber-200/45",
    chip: "border-amber-200/45 bg-amber-300/15 text-amber-100",
    glow: "shadow-[0_0_38px_rgba(250,204,21,0.24)]",
    text: "text-amber-100",
  },
};

const xpLabels: Record<XpEvent, string> = {
  checkin: "Per person checked in on Sunday",
  event_checkin: "Per person checked in at an event",
  quest_posted: "Post a LES quest",
  quest_completed: "Mark a LES quest complete",
  guest_added: "Capture a new guest",
  sunday_added: "Add a Sunday attendance column",
  event_created: "Create an event",
  tab_visited: "First visit to a console tab",
  daily_visit: "First console open each day",
  easter_egg: "Discover a hidden feat",
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function CompletionStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="border border-white/10 bg-white/[0.035] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/35">{label}</p>
        <Icon className={cn("size-5", tone)} />
      </div>
      <p className="font-mono text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function RarityBreakdown({
  unlockedByRarity,
  totalByRarity,
}: {
  unlockedByRarity: Record<Rarity, number>;
  totalByRarity: Record<Rarity, number>;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-4">
      {RARITY_ORDER.map((rarity) => {
        const tone = rarityTone[rarity];
        return (
          <div key={rarity} className={cn("border bg-white/[0.03] p-3", tone.border)}>
            <p className={cn("text-[10px] font-bold uppercase tracking-[0.28em]", tone.text)}>{rarity}</p>
            <p className="mt-2 font-mono text-2xl font-bold text-white">
              {unlockedByRarity[rarity]}/{totalByRarity[rarity]}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function TrophyCard({
  achievement,
  index,
  unlockedAt,
}: {
  achievement: AchievementDef;
  index: number;
  unlockedAt?: string;
}) {
  const unlocked = Boolean(unlockedAt);
  const hidden = achievement.secret && !unlocked;
  const tone = rarityTone[achievement.rarity];
  const name = hidden ? "???" : achievement.name;
  const description = hidden ? "Hidden feat - keep exploring" : achievement.description;

  return (
    <motion.article
      className={cn(
        "relative min-h-[260px] overflow-hidden border bg-black/60 p-4 backdrop-blur-md",
        unlocked ? cn(tone.border, tone.glow) : "border-white/10 opacity-55 grayscale",
      )}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: unlocked ? 1 : 0.55, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.55, delay: index * 0.035, ease: EASE }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: unlocked
            ? `radial-gradient(circle at 50% 18%, ${tone.bg}, transparent 42%)`
            : "radial-gradient(circle at 50% 18%, rgba(255,255,255,0.07), transparent 38%)",
        }}
      />
      <div className="relative flex h-full flex-col">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="grid h-20 w-20 shrink-0 place-items-center border border-white/10 bg-black/55">
            {hidden ? (
              <Lock className="size-8 text-white/40" />
            ) : (
              <motion.img
                src={spriteByFamily[achievement.sprite]}
                alt=""
                className="h-16 w-16 object-contain [image-rendering:pixelated] drop-shadow-2xl"
                animate={unlocked ? { y: [0, -7, 0] } : undefined}
                transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
          </div>
          <span
            className={cn(
              "border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.24em]",
              unlocked ? tone.chip : "border-white/10 bg-white/[0.035] text-white/30",
            )}
          >
            {achievement.rarity}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.28em] text-white/32">
            {achievement.family === "pastor" ? "Pastor feat" : "Community feat"}
          </p>
          <h4 className={cn("mt-2 text-2xl font-bold uppercase leading-tight", unlocked ? tone.text : "text-white/60")}>
            {name}
          </h4>
          <p className="mt-3 text-xs uppercase leading-5 tracking-[0.18em] text-white/45">{description}</p>
        </div>

        <div className="mt-5 border-t border-white/10 pt-3">
          {unlockedAt ? (
            <p className="font-mono text-sm text-white">
              <span className="mr-2 text-[10px] uppercase tracking-[0.24em] text-white/35">Unlocked</span>
              {formatDate(unlockedAt)}
            </p>
          ) : (
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.26em] text-white/28">
              <Lock className="size-4" />
              Locked
            </p>
          )}
        </div>
      </div>
    </motion.article>
  );
}

function TrophySection({
  achievements,
  title,
  unlocked,
}: {
  achievements: AchievementDef[];
  title: string;
  unlocked: Record<string, string>;
}) {
  return (
    <section>
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/38">
            {title === "PASTOR FEATS" ? "01" : "02"} · achievement family
          </p>
          <h3 className="mt-2 text-3xl font-bold uppercase tracking-[-0.03em] text-white md:text-5xl">{title}</h3>
        </div>
        <p className="max-w-md text-xs uppercase leading-5 tracking-[0.28em] text-white/42">
          {achievements.filter((achievement) => unlocked[achievement.id]).length}/{achievements.length} unlocked
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {achievements.map((achievement, index) => (
          <TrophyCard
            key={achievement.id}
            achievement={achievement}
            index={index}
            unlockedAt={unlocked[achievement.id]}
          />
        ))}
      </div>
    </section>
  );
}

function HowToEarn() {
  return (
    <motion.section
      className={cn(CARD, "relative overflow-hidden p-4 md:p-5")}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.55, ease: EASE }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 18% 20%, rgba(45,212,191,0.12), transparent 32%), radial-gradient(circle at 86% 66%, rgba(250,204,21,0.12), transparent 34%)",
        }}
      />
      <div className="relative">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center border border-amber-200/30 bg-amber-300/10 text-amber-100">
            <ScrollText className="size-5" />
          </span>
          <div>
            <p className="text-[10px] uppercase tracking-[0.32em] text-white/35">How to earn</p>
            <h4 className="text-2xl font-bold uppercase text-white">XP value table</h4>
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {(Object.entries(XP_VALUES) as [XpEvent, number][]).map(([event, value]) => (
            <div key={event} className="flex items-center justify-between gap-4 border border-white/10 bg-white/[0.035] px-3 py-2">
              <p className="text-[10px] uppercase leading-5 tracking-[0.22em] text-white/45">{xpLabels[event]}</p>
              <p className="shrink-0 font-mono text-lg font-bold text-amber-100">+{value}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

export function TrophyRoom() {
  const progress = useProgression();
  const unlocked = progress.unlocked;
  const unlockedCount = ACHIEVEMENTS.filter((achievement) => unlocked[achievement.id]).length;
  const total = ACHIEVEMENTS.length;
  const completionPct = total > 0 ? Math.round((unlockedCount / total) * 100) : 0;
  const pastorFeats = ACHIEVEMENTS.filter((achievement) => achievement.family === "pastor");
  const communityFeats = ACHIEVEMENTS.filter((achievement) => achievement.family === "community");
  const totalByRarity = RARITY_ORDER.reduce(
    (acc, rarity) => ({
      ...acc,
      [rarity]: ACHIEVEMENTS.filter((achievement) => achievement.rarity === rarity).length,
    }),
    {} as Record<Rarity, number>,
  );
  const unlockedByRarity = RARITY_ORDER.reduce(
    (acc, rarity) => ({
      ...acc,
      [rarity]: ACHIEVEMENTS.filter((achievement) => achievement.rarity === rarity && unlocked[achievement.id]).length,
    }),
    {} as Record<Rarity, number>,
  );

  return (
    <motion.div
      className="relative overflow-hidden text-white"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-96 opacity-80"
        style={{
          background:
            "radial-gradient(circle at 50% 18%, rgba(250,204,21,0.16), transparent 36%), radial-gradient(circle at 82% 42%, rgba(168,85,247,0.13), transparent 32%)",
        }}
      />

      <div className="relative space-y-12">
        <section className={cn(CARD, "relative overflow-hidden p-5 md:p-7")}>
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 16% 18%, rgba(250,204,21,0.18), transparent 32%), radial-gradient(circle at 80% 72%, rgba(45,212,191,0.12), transparent 34%)",
            }}
          />
          <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.72fr)] xl:items-end">
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-signal">Trophy room</p>
              <h2 className="display mt-3 text-5xl uppercase leading-none text-white md:text-7xl">
                {unlockedCount}/{total} unlocked
              </h2>
              <div className="mt-5 h-3 border border-white/10 bg-white/[0.04]">
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-300 via-teal-100 to-violet-200 shadow-[0_0_20px_rgba(250,204,21,0.22)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${completionPct}%` }}
                  transition={{ duration: 0.8, ease: EASE }}
                />
              </div>
              <p className="mt-3 text-[10px] uppercase tracking-[0.3em] text-white/38">
                {completionPct}% completion
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <CompletionStat icon={Trophy} label="Pastor feats" value={`${pastorFeats.filter((a) => unlocked[a.id]).length}/${pastorFeats.length}`} tone="text-amber-100" />
              <CompletionStat icon={Sparkles} label="Community feats" value={`${communityFeats.filter((a) => unlocked[a.id]).length}/${communityFeats.length}`} tone="text-teal-100" />
              <CompletionStat icon={Medal} label="Total XP" value={progress.xp.toLocaleString("en-US")} tone="text-violet-100" />
            </div>
          </div>
          <div className="relative mt-5">
            <RarityBreakdown unlockedByRarity={unlockedByRarity} totalByRarity={totalByRarity} />
          </div>
        </section>

        <TrophySection achievements={pastorFeats} title="PASTOR FEATS" unlocked={unlocked} />
        <TrophySection achievements={communityFeats} title="COMMUNITY FEATS" unlocked={unlocked} />
        <HowToEarn />
      </div>
    </motion.div>
  );
}
