import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeftRight, ArrowRight, Check, ExternalLink, Loader2, Send } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

import smartGuyHologramImg from "@/assets/sprites/smart_guy/smart_guy_hologram.png";
import { ACTION_QUEUE_URL } from "@/lib/njActions";
import {
  fetchDataCleanup,
  queueDataFix,
  type AliasCandidate,
  type DataCleanup,
  type DataFixType,
  type DirectoryDuplicate,
  type MissingRegular,
} from "@/lib/njInsights";
import { award } from "@/lib/progression";
import { cn } from "@/lib/utils";
import { celebrate } from "./ProgressHud";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];
const CARD = "border border-white/10 bg-black/60 backdrop-blur-md";

const EMPTY_CLEANUP: DataCleanup = {
  ok: true,
  aliasCandidates: [],
  directoryDuplicates: [],
  missingFromDirectory: [],
};

type DataFixRequest = {
  fixType: DataFixType;
  person: string;
  detail: string;
  reason: string;
};

type PatrolSectionProps = {
  title: string;
  index: string;
  count: number;
  loading: boolean;
  accentText: string;
  accentBorder: string;
  accentBg: string;
  glow: string;
  children: ReactNode;
};

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

function visitsChip(visits: number) {
  return `${formatNumber(visits)}x in 3 months`;
}

function requestKey(request: DataFixRequest) {
  return `${request.fixType}::${request.person}::${request.detail}`;
}

function CountBadge({ value, loading }: { value: number; loading: boolean }) {
  return (
    <span className="border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-sm font-bold text-white">
      {loading ? "..." : formatNumber(value)}
    </span>
  );
}

function ActivityChip({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <span className={cn("border border-white/10 bg-white/[0.035] px-2 py-1 font-mono text-xs font-bold text-white/62", className)}>
      {value || "Activity unknown"}
    </span>
  );
}

function QueueButton({
  label,
  pending,
  queued,
  onClick,
  accentText,
  accentBorder,
  accentBg,
}: {
  label: string;
  pending: boolean;
  queued: boolean;
  onClick: () => void;
  accentText: string;
  accentBorder: string;
  accentBg: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-11 w-full items-center justify-center gap-2 border px-3 text-[10px] font-bold uppercase tracking-[0.22em] transition disabled:cursor-not-allowed sm:w-auto sm:min-w-44",
        queued
          ? "border-white/10 bg-white/[0.025] text-white/32"
          : cn(accentBorder, accentBg, accentText, "hover:bg-white/[0.08] disabled:opacity-45"),
      )}
      disabled={pending || queued}
      onClick={onClick}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : queued ? (
        <Check className="size-4" />
      ) : (
        <Send className="size-4" />
      )}
      {queued ? "QUEUED ✓" : label}
    </button>
  );
}

function LoadingRows({ accentBorder, accentBg }: { accentBorder: string; accentBg: string }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="grid gap-3 border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-[1fr_176px] sm:items-center">
          <div className="space-y-3">
            <div className="h-5 w-3/5 animate-pulse bg-white/12" />
            <div className="h-3 w-4/5 animate-pulse bg-white/8" />
          </div>
          <div className={cn("h-10 animate-pulse border", accentBorder, accentBg)} />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border border-white/10 bg-white/[0.03] p-5">
      <p className="text-sm uppercase leading-6 tracking-[0.22em] text-white/42">
        Data Patrol found nothing — the Book is clean
      </p>
    </div>
  );
}

function PatrolSection({
  title,
  index,
  count,
  loading,
  accentText,
  accentBorder,
  glow,
  children,
}: PatrolSectionProps) {
  return (
    <section className={cn(CARD, "relative overflow-hidden p-5")}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at 14% 18%, ${glow}, transparent 34%), radial-gradient(circle at 88% 78%, rgba(255,255,255,0.06), transparent 32%)`,
        }}
      />
      <div className="relative">
        <div className="mb-5 flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.34em] text-white/35">
              {index} · Identity lane
            </p>
            <h3 className="mt-1 text-3xl font-bold uppercase tracking-[-0.03em] text-white md:text-4xl">
              {title}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.28em] text-white/35">Count</span>
            <CountBadge value={count} loading={loading} />
          </div>
        </div>
        <div className={cn("grid gap-3", accentText, accentBorder)}>{children}</div>
      </div>
    </section>
  );
}

function AliasRow({
  candidate,
  pending,
  queued,
  onQueue,
}: {
  candidate: AliasCandidate;
  pending: boolean;
  queued: boolean;
  onQueue: (request: DataFixRequest) => void;
}) {
  const request = {
    fixType: "link-alias" as const,
    person: candidate.guest,
    detail: candidate.member,
    reason: candidate.reason,
  };

  return (
    <article className="grid gap-4 border border-white/10 bg-white/[0.035] p-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_176px] lg:items-center">
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h4 className="min-w-0 text-xl font-bold uppercase leading-tight text-white">{candidate.guest}</h4>
          <span className="border border-amber-200/35 bg-amber-300/10 px-2 py-1 font-mono text-xs font-bold text-amber-100">
            {visitsChip(candidate.guestVisits)}
          </span>
        </div>
        <p className="text-[10px] uppercase tracking-[0.24em] text-white/30">Attendance guest record</p>
      </div>

      <ArrowRight className="hidden size-5 text-cyan-100/70 lg:block" />

      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h4 className="min-w-0 text-xl font-bold uppercase leading-tight text-white">{candidate.member}</h4>
          <ActivityChip value={candidate.memberActivity} className="border-cyan-200/30 bg-cyan-300/10 text-cyan-100" />
        </div>
        <p className="text-xs leading-5 text-white/42">{candidate.reason}</p>
      </div>

      <QueueButton
        label="LINK AS ALIAS"
        pending={pending}
        queued={queued}
        onClick={() => onQueue(request)}
        accentText="text-cyan-100"
        accentBorder="border-cyan-200/35"
        accentBg="bg-cyan-300/10"
      />
    </article>
  );
}

function DuplicateRow({
  duplicate,
  pending,
  queued,
  onQueue,
}: {
  duplicate: DirectoryDuplicate;
  pending: boolean;
  queued: boolean;
  onQueue: (request: DataFixRequest) => void;
}) {
  const request = {
    fixType: "merge-duplicates" as const,
    person: duplicate.a,
    detail: duplicate.b,
    reason: "Same family name + birth date",
  };

  return (
    <article className="grid gap-4 border border-white/10 bg-white/[0.035] p-4 lg:grid-cols-[minmax(0,1fr)_176px] lg:items-center">
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h4 className="min-w-0 text-xl font-bold uppercase leading-tight text-white">
            {duplicate.a} <span className="text-violet-100/70">↔</span> {duplicate.b}
          </h4>
          <span className="border border-violet-200/35 bg-violet-300/10 px-2 py-1 font-mono text-xs font-bold text-violet-100">
            {duplicate.birthDate || "Birth date unknown"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ActivityChip value={duplicate.activityA} />
          <ArrowLeftRight className="size-4 text-violet-100/65" />
          <ActivityChip value={duplicate.activityB} />
        </div>
      </div>

      <QueueButton
        label="QUEUE MERGE"
        pending={pending}
        queued={queued}
        onClick={() => onQueue(request)}
        accentText="text-violet-100"
        accentBorder="border-violet-200/35"
        accentBg="bg-violet-300/10"
      />
    </article>
  );
}

function MissingRow({
  regular,
  pending,
  queued,
  onQueue,
}: {
  regular: MissingRegular;
  pending: boolean;
  queued: boolean;
  onQueue: (request: DataFixRequest) => void;
}) {
  const request = {
    fixType: "add-to-directory" as const,
    person: regular.name,
    detail: "",
    reason: `${regular.visits}x in 3 months but no Directory record`,
  };

  return (
    <article className="grid gap-4 border border-white/10 bg-white/[0.035] p-4 sm:grid-cols-[minmax(0,1fr)_176px] sm:items-center">
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h4 className="min-w-0 text-xl font-bold uppercase leading-tight text-white">{regular.name}</h4>
          <span className="border border-emerald-200/35 bg-emerald-300/10 px-2 py-1 font-mono text-xs font-bold text-emerald-100">
            {visitsChip(regular.visits)}
          </span>
        </div>
        <p className="text-xs leading-5 text-white/42">No Directory record matched this regular attender.</p>
      </div>

      <QueueButton
        label="ADD TO DIRECTORY"
        pending={pending}
        queued={queued}
        onClick={() => onQueue(request)}
        accentText="text-emerald-100"
        accentBorder="border-emerald-200/35"
        accentBg="bg-emerald-300/10"
      />
    </article>
  );
}

export function DataPatrolSection() {
  const [cleanup, setCleanup] = useState<DataCleanup | null>(null);
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(() => new Set());
  const [queuedKeys, setQueuedKeys] = useState<Set<string>>(() => new Set());
  const data = cleanup ?? EMPTY_CLEANUP;
  const loading = cleanup === null;

  const counts = useMemo(
    () => ({
      aliasCandidates: data.aliasCandidates.length,
      directoryDuplicates: data.directoryDuplicates.length,
      missingFromDirectory: data.missingFromDirectory.length,
    }),
    [data.aliasCandidates.length, data.directoryDuplicates.length, data.missingFromDirectory.length],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadCleanup() {
      try {
        const res = await fetchDataCleanup();
        if (cancelled) return;
        setCleanup(res);
        if (!res.ok) {
          toast.error(res.message || "Could not load Data Patrol.");
        }
      } catch (err) {
        if (cancelled) return;
        setCleanup({
          ...EMPTY_CLEANUP,
          ok: false,
          message: err instanceof Error ? err.message : String(err),
        });
        toast.error("Could not load Data Patrol.");
      }
    }

    void loadCleanup();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleQueue = useCallback(async (request: DataFixRequest) => {
    const key = requestKey(request);
    setPendingKeys((current) => {
      const next = new Set(current);
      next.add(key);
      return next;
    });

    try {
      const res = await queueDataFix({ data: request });

      if (res.ok) {
        celebrate(award("data_fix"));
        setQueuedKeys((current) => {
          const next = new Set(current);
          next.add(key);
          return next;
        });
        toast.success(res.message, {
          description: "Data Fix Requests entry ready for office review.",
        });
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error("Could not queue data fix.", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setPendingKeys((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  }, []);

  return (
    <section className="relative overflow-hidden text-white">
      <motion.div
        className={cn(CARD, "relative overflow-hidden p-5 md:p-7")}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        <div className="pointer-events-none absolute inset-0">
          <span className="animate-twinkle absolute left-[16%] top-[18%] h-1 w-1 bg-white/70" />
          <span className="animate-twinkle absolute left-[72%] top-[22%] h-1 w-1 bg-cyan-100/80 [animation-delay:1.1s]" />
          <span className="animate-shooting-star absolute left-[92%] top-[18%] h-[1px] w-24 bg-gradient-to-r from-white via-white/45 to-transparent [animation-delay:3.4s]" />
        </div>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 24% 18%, rgba(45,212,191,0.18), transparent 35%), radial-gradient(circle at 82% 68%, rgba(168,85,247,0.15), transparent 34%), radial-gradient(circle at 52% 94%, rgba(234,179,8,0.1), transparent 30%)",
          }}
        />

        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-signal">08 · DATA PATROL</p>
            <h2 className="display mt-3 text-[12vw] uppercase text-white sm:text-[8vw] lg:text-[4.8rem]">
              CLEAN DATA IS PASTORAL CARE
            </h2>
            <p className="mt-5 max-w-3xl text-sm uppercase leading-6 tracking-[0.22em] text-white/48">
              Wrong names hide real growth: guests counted as strangers may be long-time members under another name.
            </p>
            <a
              href={ACTION_QUEUE_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex max-w-full items-center gap-3 border border-white/10 bg-white/[0.035] px-3 py-2 text-[10px] font-bold uppercase leading-5 tracking-[0.2em] text-white/48 transition hover:border-cyan-100/35 hover:text-white"
            >
              <span>Fixes queue for the office — the Directory is the identity source of truth</span>
              <ExternalLink className="size-4 shrink-0 text-cyan-100" />
            </a>
          </div>

          <motion.div
            className="mx-auto flex h-40 w-40 items-center justify-center border border-cyan-100/25 bg-black/45 shadow-[0_0_28px_rgba(45,212,191,0.16)] md:h-48 md:w-48"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
          >
            <img
              src={smartGuyHologramImg}
              alt="Smart Guy hologram sprite"
              className="h-32 w-32 object-contain [image-rendering:pixelated] drop-shadow-2xl md:h-40 md:w-40"
            />
          </motion.div>
        </div>
      </motion.div>

      <div className="mt-5 grid gap-5">
        <PatrolSection
          title="PROBABLY ALREADY MEMBERS"
          index="08A"
          count={counts.aliasCandidates}
          loading={loading}
          accentText="text-cyan-100"
          accentBorder="border-cyan-200/35"
          accentBg="bg-cyan-300/10"
          glow="rgba(45,212,191,0.16)"
        >
          {loading ? (
            <LoadingRows accentBorder="border-cyan-200/35" accentBg="bg-cyan-300/10" />
          ) : data.aliasCandidates.length ? (
            data.aliasCandidates.map((candidate) => {
              const key = requestKey({
                fixType: "link-alias",
                person: candidate.guest,
                detail: candidate.member,
                reason: candidate.reason,
              });
              return (
                <AliasRow
                  key={key}
                  candidate={candidate}
                  pending={pendingKeys.has(key)}
                  queued={queuedKeys.has(key)}
                  onQueue={handleQueue}
                />
              );
            })
          ) : (
            <EmptyState />
          )}
        </PatrolSection>

        <PatrolSection
          title="POSSIBLE DUPLICATE RECORDS"
          index="08B"
          count={counts.directoryDuplicates}
          loading={loading}
          accentText="text-violet-100"
          accentBorder="border-violet-200/35"
          accentBg="bg-violet-300/10"
          glow="rgba(168,85,247,0.16)"
        >
          {loading ? (
            <LoadingRows accentBorder="border-violet-200/35" accentBg="bg-violet-300/10" />
          ) : data.directoryDuplicates.length ? (
            data.directoryDuplicates.map((duplicate) => {
              const key = requestKey({
                fixType: "merge-duplicates",
                person: duplicate.a,
                detail: duplicate.b,
                reason: "Same family name + birth date",
              });
              return (
                <DuplicateRow
                  key={key}
                  duplicate={duplicate}
                  pending={pendingKeys.has(key)}
                  queued={queuedKeys.has(key)}
                  onQueue={handleQueue}
                />
              );
            })
          ) : (
            <EmptyState />
          )}
        </PatrolSection>

        <PatrolSection
          title="REGULARS MISSING FROM DIRECTORY"
          index="08C"
          count={counts.missingFromDirectory}
          loading={loading}
          accentText="text-emerald-100"
          accentBorder="border-emerald-200/35"
          accentBg="bg-emerald-300/10"
          glow="rgba(16,185,129,0.15)"
        >
          {loading ? (
            <LoadingRows accentBorder="border-emerald-200/35" accentBg="bg-emerald-300/10" />
          ) : data.missingFromDirectory.length ? (
            data.missingFromDirectory.map((regular) => {
              const key = requestKey({
                fixType: "add-to-directory",
                person: regular.name,
                detail: "",
                reason: `${regular.visits}x in 3 months but no Directory record`,
              });
              return (
                <MissingRow
                  key={key}
                  regular={regular}
                  pending={pendingKeys.has(key)}
                  queued={queuedKeys.has(key)}
                  onQueue={handleQueue}
                />
              );
            })
          ) : (
            <EmptyState />
          )}
        </PatrolSection>
      </div>
    </section>
  );
}
