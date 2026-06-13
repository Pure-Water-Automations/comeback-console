import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  Hammer,
  Loader2,
  ScrollText,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { toast } from "sonner";

import mentorLetterImg from "@/assets/sprites/mentor/mentor_letter.png";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ACTION_QUEUE_URL,
  completeQuest,
  fetchLiveQuests,
  postQuest,
  type QuestLane,
} from "@/lib/njActions";
import { LES_QUESTS, type LesQuest } from "@/lib/njData";
import { award, awardOnce } from "@/lib/progression";
import { cn } from "@/lib/utils";
import { celebrate } from "./ProgressHud";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];
const CARD = "border border-white/10 bg-black/60 backdrop-blur-md";
const DIALOG_CONTENT =
  "max-h-[calc(100vh-2rem)] overflow-y-auto rounded-none border-white/15 bg-[#050509]/95 text-white shadow-[0_0_48px_rgba(168,85,247,0.2)] backdrop-blur-xl sm:rounded-none [&>button]:rounded-none [&>button]:text-white/60 [&>button:hover]:text-white";

const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const questMonthOptions = Array.from({ length: 12 }, (_, index) => `${index + 1}/2026`);
type MonthName = (typeof monthOrder)[number];

const laneConfig: {
  lane: LesQuest["lane"];
  icon: LucideIcon;
  accent: string;
  text: string;
  glow: string;
}[] = [
  {
    lane: "Leadership",
    icon: ShieldCheck,
    accent: "#facc15",
    text: "text-amber-100",
    glow: "rgba(234,179,8,0.18)",
  },
  {
    lane: "Environment",
    icon: Hammer,
    accent: "#2dd4bf",
    text: "text-teal-100",
    glow: "rgba(45,212,191,0.16)",
  },
  {
    lane: "Special Projects",
    icon: Sparkles,
    accent: "#a78bfa",
    text: "text-violet-100",
    glow: "rgba(168,85,247,0.16)",
  },
];

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

function monthIndex(month: string) {
  const trimmed = month.trim();
  const index = monthOrder.indexOf(trimmed as MonthName);
  if (index !== -1) return index;

  const match = trimmed.match(/^(\d{1,2})\/2026$/);
  if (!match) return -1;

  const numericMonth = Number(match[1]);
  return numericMonth >= 1 && numericMonth <= 12 ? numericMonth - 1 : -1;
}

function questStatsFor(quests: LesQuest[]) {
  const total = quests.length;
  const done = quests.filter((quest) => Boolean(quest.completedDate)).length;
  const open = total - done;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return { total, done, open, pct };
}

function questKey(quest: Pick<LesQuest, "lane" | "month" | "title">) {
  return `${quest.lane}::${quest.month}::${quest.title}`;
}

function todayShortDate() {
  return new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
    timeZone: "America/New_York",
  }).format(new Date());
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
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.62, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function SectionHeader({
  index,
  kicker,
  title,
  children,
}: {
  index: string;
  kicker: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-white/38">
          {index} &middot; {kicker}
        </p>
        <h3 className="mt-2 text-3xl font-bold uppercase tracking-[-0.03em] text-white md:text-5xl">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function FloatingMentor({ className }: { className?: string }) {
  return (
    <motion.img
      src={mentorLetterImg}
      alt="Mentor questgiver sprite"
      className={cn("object-contain [image-rendering:pixelated] drop-shadow-2xl", className)}
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 0.9, repeat: Infinity }}
    />
  );
}

function QuestgiverCallout({ quests }: { quests: LesQuest[] }) {
  const validMonthIndexes = quests.map((quest) => monthIndex(quest.month)).filter((index) => index >= 0);
  const latestQuestMonthIndex = validMonthIndexes.length ? Math.max(...validMonthIndexes) : 2;
  const latestQuestMonth = monthOrder[latestQuestMonthIndex] ?? "Mar";
  const emptyMonths = monthOrder.slice(latestQuestMonthIndex + 1, 6);
  const emptyWindow =
    emptyMonths.length > 1 ? `${emptyMonths[0]}-${emptyMonths[emptyMonths.length - 1]}` : (emptyMonths[0] ?? "Apr-Jun");
  const latestQuestMonthLabel = latestQuestMonth === "Mar" ? "March" : latestQuestMonth;
  const gapLine =
    emptyMonths.length > 0
      ? `The ${emptyWindow} sheets are empty; post this month's goals.`
      : "Keep the next sheet ready with this month's goals.";

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <Reveal className={cn(CARD, "relative overflow-hidden p-6 md:p-8")}>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 24% 18%, rgba(234,179,8,0.18), transparent 34%), radial-gradient(circle at 78% 68%, rgba(168,85,247,0.14), transparent 36%)",
          }}
        />
        <div className="relative">
          <p className="text-sm uppercase tracking-[0.4em] text-signal">Quest Log</p>
          <h2 className="mt-3 text-5xl font-bold uppercase leading-none tracking-[-0.04em] text-white md:text-7xl">
            LES field orders
          </h2>
          <p className="mt-6 max-w-2xl text-sm uppercase leading-6 tracking-[0.24em] text-white/50">
            Leadership, environment, and special projects need posted quests so the team knows the next mission.
          </p>
        </div>
      </Reveal>

      <Reveal className={cn(CARD, "relative overflow-hidden p-5")} delay={0.1}>
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(circle at 50% 22%, rgba(234,179,8,0.18), transparent 42%)" }}
        />
        <div className="relative flex flex-col items-center text-center">
          <FloatingMentor className="h-40 w-40" />
          <div className="mt-4 border border-amber-200/25 bg-amber-950/15 p-4 text-left">
            <div className="mb-3 flex items-center gap-2 text-amber-100">
              <CalendarPlus className="size-5" />
              <p className="text-[10px] uppercase tracking-[0.28em]">Quest posting gap</p>
            </div>
            <p className="text-sm uppercase leading-6 tracking-[0.22em] text-white/55">
              No new quests have been posted since {latestQuestMonthLabel}. {gapLine}
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function LaneProgress({ quests }: { quests: LesQuest[] }) {
  return (
    <section>
      <SectionHeader index="01" kicker="Lane progress" title="Quest lanes">
        <p className="max-w-md text-right text-xs uppercase leading-5 tracking-[0.28em] text-white/42">
          Progress is computed per lane from completed dates.
        </p>
      </SectionHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        {laneConfig.map((config, index) => {
          const laneQuests = quests.filter((quest) => quest.lane === config.lane);
          const stats = questStatsFor(laneQuests);
          const Icon = config.icon;

          return (
            <Reveal key={config.lane} className={cn(CARD, "relative overflow-hidden p-5")} delay={index * 0.07}>
              <div
                className="pointer-events-none absolute inset-0"
                style={{ background: `radial-gradient(circle at 50% 14%, ${config.glow}, transparent 42%)` }}
              />
              <div className="relative">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.32em] text-white/35">LES lane</p>
                    <h4 className="mt-1 text-2xl font-bold uppercase text-white">{config.lane}</h4>
                  </div>
                  <span className="grid h-12 w-12 place-items-center border border-white/10 bg-white/[0.04]">
                    <Icon className={cn("size-6", config.text)} />
                  </span>
                </div>

                <div className="mb-4 flex items-end justify-between gap-5">
                  <div>
                    <p className="font-mono text-5xl font-bold text-white">{stats.pct}%</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.26em] text-white/35">Complete</p>
                  </div>
                  <div className="text-right">
                    <p className={cn("font-mono text-2xl font-bold", config.text)}>
                      {stats.done}/{stats.total}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.26em] text-white/35">Cleared</p>
                  </div>
                </div>

                <div className="h-3 border border-white/10 bg-white/[0.04]">
                  <motion.div
                    className="h-full"
                    style={{ backgroundColor: config.accent }}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${stats.pct}%` }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ duration: 0.75, ease: EASE }}
                  />
                </div>

                <p className="mt-4 text-[10px] uppercase tracking-[0.25em] text-white/38">
                  {formatNumber(stats.open)} in progress
                </p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

function QuestCard({
  quest,
  index,
  accent,
  completionBusy,
  completionQueued,
  isCompleting,
  onComplete,
}: {
  quest: LesQuest;
  index: number;
  accent: string;
  completionBusy: boolean;
  completionQueued: boolean;
  isCompleting: boolean;
  onComplete: (quest: LesQuest, completedDate: string) => void;
}) {
  const completed = Boolean(quest.completedDate);
  const [confirming, setConfirming] = useState(false);
  const [completionDate, setCompletionDate] = useState("");

  function openConfirm() {
    setCompletionDate(todayShortDate());
    setConfirming(true);
  }

  function cancelConfirm() {
    setConfirming(false);
    setCompletionDate("");
  }

  function submitComplete() {
    onComplete(quest, completionDate || todayShortDate());
    setConfirming(false);
    setCompletionDate("");
  }

  return (
    <motion.article
      className={cn(
        CARD,
        "relative overflow-hidden p-4",
        completed ? "border-amber-200/35 shadow-[0_0_24px_rgba(234,179,8,0.2)]" : "opacity-[0.78]",
      )}
      initial={{ opacity: 0, x: -18 }}
      whileInView={{ opacity: completed ? 1 : 0.78, x: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.55, delay: index * 0.045, ease: EASE }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background: completed
            ? "radial-gradient(circle at 12% 18%, rgba(234,179,8,0.16), transparent 32%)"
            : `radial-gradient(circle at 12% 18%, ${accent}22, transparent 32%)`,
        }}
      />
      <div className="relative grid gap-4 md:grid-cols-[auto_minmax(0,1fr)_220px] md:items-center">
        <span
          className={cn(
            "grid h-12 w-12 place-items-center border bg-white/[0.04]",
            completed ? "border-amber-200/40 text-amber-100" : "border-white/10 text-white/35",
          )}
        >
          {completed ? <CheckCircle2 className="size-6" /> : <CircleDashed className="size-6" />}
        </span>

        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.32em] text-white/35">
            {quest.month} quest {String(index + 1).padStart(2, "0")}
          </p>
          <h4 className="mt-1 text-xl font-bold uppercase leading-snug text-white md:text-2xl">{quest.title}</h4>
        </div>

        <div className="border border-white/10 bg-white/[0.035] p-3">
          {completed ? (
            <>
              <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.26em] text-amber-100/80">
                <Trophy className="size-4" />
                Completed
              </p>
              <p className="mt-2 font-mono text-lg font-bold text-white">{quest.completedDate}</p>
            </>
          ) : confirming ? (
            <>
              <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.26em] text-amber-100/80">
                <CalendarDays className="size-4" />
                Completion date
              </p>
              <input
                className="mt-2 h-9 w-full border border-amber-100/35 bg-black/70 px-3 font-mono text-sm text-white outline-none transition placeholder:text-white/25 focus:border-amber-100/55"
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
                placeholder="6/30/26"
                autoFocus
              />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="flex h-9 items-center justify-center gap-1.5 border border-white/15 bg-white/[0.04] px-3 text-[9px] font-bold uppercase tracking-[0.22em] text-white/45 transition hover:bg-white/[0.07] hover:text-white/70"
                  onClick={cancelConfirm}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="flex h-9 items-center justify-center gap-1.5 border border-amber-100/45 bg-amber-300/15 px-3 text-[9px] font-bold uppercase tracking-[0.22em] text-amber-50 transition hover:bg-amber-300/20 disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={completionBusy || !completionDate.trim()}
                  onClick={submitComplete}
                >
                  {isCompleting ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                  Confirm
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.26em] text-white/35">
                <CalendarDays className="size-4" />
                Target
              </p>
              <p className="mt-2 font-mono text-lg font-bold text-white">{quest.targetDate ?? "Needs date"}</p>
              <p className="mt-2 text-[10px] uppercase tracking-[0.26em] text-white/28">In progress</p>
              <button
                type="button"
                className="mt-3 flex h-9 w-full items-center justify-center gap-2 border border-amber-100/35 bg-amber-300/10 px-3 text-[9px] font-bold uppercase tracking-[0.24em] text-amber-50 transition hover:bg-amber-300/15 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={completionBusy || completionQueued}
                onClick={openConfirm}
              >
                <CheckCircle2 className="size-4" />
                {completionQueued ? "Queued" : "Mark complete"}
              </button>
            </>
          )}
        </div>
      </div>
    </motion.article>
  );
}

function PostQuestCard() {
  const [open, setOpen] = useState(false);
  const [lane, setLane] = useState<QuestLane>("Leadership");
  const [month, setMonth] = useState("6/2026");
  const [title, setTitle] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    try {
      const res = await postQuest({
        data: {
          lane,
          month,
          title,
          targetDate,
        },
      });

      if (res.ok) {
        celebrate(award("quest_posted"));
        celebrate(awardOnce("feature_first_use", "feature:quest_post"));
        toast.success(res.message, {
          description: "Action Queue entry ready for office review.",
        });
        setTitle("");
        setTargetDate("");
        setOpen(false);
      } else {
        toast.error(res.message);
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <Reveal className={cn(CARD, "relative overflow-hidden p-5")}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 18% 18%, rgba(168,85,247,0.18), transparent 34%), radial-gradient(circle at 82% 64%, rgba(234,179,8,0.12), transparent 32%)",
        }}
      />
      <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-end">
        <div>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.34em] text-violet-100/75">Post a quest</p>
              <h4 className="mt-1 text-3xl font-bold uppercase tracking-[-0.03em] text-white">New field order</h4>
            </div>
            <span className="grid h-12 w-12 place-items-center border border-violet-200/30 bg-violet-300/10 text-violet-100">
              <ScrollText className="size-6" />
            </span>
          </div>
          <a
            href={ACTION_QUEUE_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-3 border border-white/10 bg-white/[0.035] p-3 text-[10px] font-bold uppercase leading-5 tracking-[0.22em] text-white/48 transition hover:text-white"
          >
            <span>HQ tracker is protected — actions queue here for the office</span>
            <ExternalLink className="size-4 shrink-0 text-violet-100" />
          </a>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {laneConfig.map((config) => {
            const Icon = config.icon;
            return (
              <button
                key={config.lane}
                type="button"
                className="flex h-14 items-center justify-center gap-2.5 border px-4 text-[10px] font-bold uppercase tracking-[0.28em] transition"
                style={{
                  borderColor: `${config.accent}55`,
                  backgroundColor: `${config.accent}15`,
                  color: config.accent,
                  textShadow: `0 0 12px ${config.accent}88`,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = `${config.accent}25`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = `${config.accent}15`;
                }}
                onClick={() => {
                  setLane(config.lane as QuestLane);
                  setOpen(true);
                }}
              >
                <Icon className="size-4 shrink-0" />
                {config.lane}
                <span className="opacity-60">+</span>
              </button>
            );
          })}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className={cn(DIALOG_CONTENT, "max-w-2xl")}>
            <DialogHeader className="pr-8 text-left">
              <DialogTitle className="text-2xl font-bold uppercase tracking-[0.28em] text-white">
                Post a quest
              </DialogTitle>
              <DialogDescription className="text-[10px] uppercase leading-5 tracking-[0.24em] text-white/40">
                New field order
              </DialogDescription>
            </DialogHeader>
            <form className="grid gap-3" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-1.5 block text-[10px] uppercase tracking-[0.26em] text-white/35">Month</span>
                <select
                  className="h-10 w-full border border-white/10 bg-black/70 px-3 text-sm text-white outline-none transition focus:border-violet-100/45 disabled:cursor-not-allowed disabled:opacity-50"
                  value={month}
                  onChange={(event) => setMonth(event.target.value)}
                  disabled={pending}
                >
                  {questMonthOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[10px] uppercase tracking-[0.26em] text-white/35">Title</span>
                <input
                  className="h-10 w-full border border-white/10 bg-black/70 px-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-violet-100/45 disabled:cursor-not-allowed disabled:opacity-50"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  disabled={pending}
                  required
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <label className="block">
                  <span className="mb-1.5 block text-[10px] uppercase tracking-[0.26em] text-white/35">
                    Target date
                  </span>
                  <input
                    className="h-10 w-full border border-white/10 bg-black/70 px-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-violet-100/45 disabled:cursor-not-allowed disabled:opacity-50"
                    value={targetDate}
                    onChange={(event) => setTargetDate(event.target.value)}
                    placeholder="6/30/26"
                    disabled={pending}
                  />
                </label>
                <button
                  type="submit"
                  className="mt-auto flex h-10 min-w-36 items-center justify-center gap-2 border border-violet-100/45 bg-violet-300/10 px-4 text-[10px] font-bold uppercase tracking-[0.28em] text-violet-50 transition hover:bg-violet-300/15 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={pending || title.trim().length === 0}
                >
                  {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Post
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Reveal>
  );
}

function GroupedQuestLog({
  completingQuestKey,
  onCompleteQuest,
  queuedCompletionKeys,
  quests,
}: {
  completingQuestKey: string | null;
  onCompleteQuest: (quest: LesQuest, completedDate: string) => void;
  queuedCompletionKeys: Set<string>;
  quests: LesQuest[];
}) {
  return (
    <section>
      <SectionHeader index="02" kicker="RPG cards" title="Active quest log">
        <div className="flex items-center gap-2 text-amber-100">
          <ScrollText className="size-5" />
          <span className="text-xs uppercase tracking-[0.3em]">Live tracker</span>
        </div>
      </SectionHeader>

      <div className="space-y-5">
        <PostQuestCard />
        {laneConfig.map((config) => {
          const laneQuests = quests.filter((quest) => quest.lane === config.lane);
          const stats = questStatsFor(laneQuests);
          const Icon = config.icon;

          return (
            <Reveal key={config.lane} className={cn(CARD, "relative overflow-hidden p-5")}>
              <div
                className="pointer-events-none absolute inset-0"
                style={{ background: `radial-gradient(circle at 12% 10%, ${config.glow}, transparent 36%)` }}
              />
              <div className="relative">
                <div className="mb-5 flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <span className="grid h-12 w-12 place-items-center border border-white/10 bg-white/[0.04]">
                      <Icon className={cn("size-6", config.text)} />
                    </span>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.32em] text-white/35">Lane</p>
                      <h4 className="text-3xl font-bold uppercase text-white">{config.lane}</h4>
                    </div>
                  </div>
                  <div className="min-w-[210px]">
                    <div className="mb-2 flex items-center justify-between gap-4">
                      <span className="text-[10px] uppercase tracking-[0.26em] text-white/35">Progress</span>
                      <span className={cn("font-mono text-sm font-bold", config.text)}>
                        {stats.done}/{stats.total}
                      </span>
                    </div>
                    <div className="h-2 border border-white/10 bg-white/[0.04]">
                      <div className="h-full" style={{ width: `${stats.pct}%`, backgroundColor: config.accent }} />
                    </div>
                  </div>
                </div>

                <div className="grid gap-3">
                  {laneQuests.map((quest, index) => (
                    <QuestCard
                      key={`${quest.lane}-${quest.month}-${quest.title}`}
                      quest={quest}
                      index={index}
                      accent={config.accent}
                      completionBusy={Boolean(completingQuestKey)}
                      completionQueued={queuedCompletionKeys.has(questKey(quest))}
                      isCompleting={completingQuestKey === questKey(quest)}
                      onComplete={onCompleteQuest}
                    />
                  ))}
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

export function QuestsPanel() {
  const [quests, setQuests] = useState<LesQuest[]>(LES_QUESTS);
  const [completingQuestKey, setCompletingQuestKey] = useState<string | null>(null);
  const [queuedCompletionKeys, setQueuedCompletionKeys] = useState<Set<string>>(() => new Set());
  const totalStats = useMemo(() => questStatsFor(quests), [quests]);
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 24,
    mass: 0.4,
  });
  const haloY = useTransform(smoothProgress, [0, 1], ["0px", "-72px"]);

  useEffect(() => {
    let cancelled = false;

    async function refreshLiveQuests() {
      try {
        const res = await fetchLiveQuests();
        if (!cancelled && res.ok) {
          setQuests(
            res.quests.map((quest) => ({
              lane: quest.lane,
              month: quest.month,
              title: quest.title,
              targetDate: quest.targetDate || undefined,
              completedDate: quest.completedDate || undefined,
            })),
          );
        }
      } catch {
        // Keep the static LES_QUESTS fallback.
      }
    }

    void refreshLiveQuests();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleCompleteQuest = useCallback(
    async (quest: LesQuest, completedDate: string) => {
      const key = questKey(quest);
      if (completingQuestKey || queuedCompletionKeys.has(key)) return;

      setCompletingQuestKey(key);
      try {
        const res = await completeQuest({
          data: {
            lane: quest.lane as QuestLane,
            month: quest.month,
            title: quest.title,
            completedDate: completedDate || todayShortDate(),
          },
        });

        if (res.ok) {
          celebrate(award("quest_completed"));
          celebrate(awardOnce("feature_first_use", "feature:quest_complete"));
          toast.success(res.message, {
            description: "Action Queue entry ready for office review.",
          });
          setQueuedCompletionKeys((current) => {
            const next = new Set(current);
            next.add(key);
            return next;
          });
        } else {
          toast.error(res.message);
        }
      } finally {
        setCompletingQuestKey((current) => (current === key ? null : current));
      }
    },
    [completingQuestKey, queuedCompletionKeys],
  );

  return (
    <motion.div
      className="relative overflow-hidden text-white"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE }}
    >
      <motion.div
        className="pointer-events-none absolute inset-x-0 top-0 h-80 opacity-80"
        style={{
          y: haloY,
          background:
            "radial-gradient(circle at 50% 20%, rgba(168,85,247,0.17), transparent 35%), radial-gradient(circle at 82% 42%, rgba(234,179,8,0.12), transparent 34%)",
        }}
      />

      <div className="relative space-y-12">
        <QuestgiverCallout quests={quests} />

        <div className="grid gap-3 border border-white/10 bg-black/60 p-4 backdrop-blur-md sm:grid-cols-3">
          <div className="border border-white/10 bg-white/[0.035] p-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/35">Total quests</p>
            <p className="mt-1 font-mono text-3xl font-bold text-white">{formatNumber(totalStats.total)}</p>
          </div>
          <div className="border border-white/10 bg-white/[0.035] p-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/35">Completed</p>
            <p className="mt-1 font-mono text-3xl font-bold text-amber-100">{formatNumber(totalStats.done)}</p>
          </div>
          <div className="border border-white/10 bg-white/[0.035] p-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/35">In progress</p>
            <p className="mt-1 font-mono text-3xl font-bold text-white/65">{formatNumber(totalStats.open)}</p>
          </div>
        </div>

        <LaneProgress quests={quests} />
        <GroupedQuestLog
          completingQuestKey={completingQuestKey}
          onCompleteQuest={handleCompleteQuest}
          queuedCompletionKeys={queuedCompletionKeys}
          quests={quests}
        />

        <Reveal className={cn(CARD, "border-amber-200/25 p-5 shadow-[0_0_24px_rgba(234,179,8,0.12)]")}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 place-items-center border border-amber-200/30 bg-amber-300/10 text-amber-100">
                <Target className="size-6" />
              </span>
              <div>
                <p className="text-[10px] uppercase tracking-[0.32em] text-white/35">Next pastoral move</p>
                <h4 className="text-2xl font-bold uppercase text-white">Post this month's LES goals</h4>
              </div>
            </div>
            <p className="max-w-xl text-sm uppercase leading-6 tracking-[0.22em] text-white/48">
              A fresh June quest in each lane turns the console from history into a live field order.
            </p>
          </div>
        </Reveal>
      </div>
    </motion.div>
  );
}
