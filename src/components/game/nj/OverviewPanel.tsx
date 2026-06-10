import type { ComponentType } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Coins,
  Heart,
  Signal,
  Trophy,
  Users,
} from "lucide-react";
import { motion } from "motion/react";

import { rankedCommunities, TRIMESTER } from "@/lib/comebackData";
import {
  ATTENDANCE_2026,
  GUEST_FUNNEL,
  MEMBERSHIP,
  SOURCE_SHEETS,
  latestBlessing,
  ytdFinance,
} from "@/lib/njData";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPoints(value: number) {
  const rounded = Math.round(value);
  if (rounded === 0) return "0";
  const absolute = Math.abs(rounded).toLocaleString("en-US");
  return rounded > 0 ? `+${absolute}` : `-${absolute}`;
}

function sheetUrl(id: string) {
  return `https://docs.google.com/spreadsheets/d/${id}`;
}

function monthByName(month: string) {
  const found = ATTENDANCE_2026.find((entry) => entry.month === month);
  if (!found) {
    throw new Error(`Missing attendance month ${month}`);
  }
  return found;
}

function guestStage(stage: string) {
  const found = GUEST_FUNNEL.find((entry) => entry.stage === stage);
  if (!found) {
    throw new Error(`Missing guest funnel stage ${stage}`);
  }
  return found;
}

function StatCard({
  label,
  value,
  detail,
  accent,
  icon: Icon,
  delay = 0,
}: {
  label: string;
  value: string;
  detail: string;
  accent: string;
  icon: ComponentType<{ className?: string }>;
  delay?: number;
}) {
  return (
    <motion.div
      className={cn(
        "border border-white/10 bg-black/60 p-4 backdrop-blur-md",
        "shadow-[0_0_18px_rgba(255,255,255,0.04)]",
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">{label}</p>
        <Icon className={cn("size-5", accent)} />
      </div>
      <p className="font-mono text-3xl font-bold text-white md:text-4xl">{value}</p>
      <p className="mt-3 text-xs uppercase tracking-[0.24em] text-white/45">{detail}</p>
    </motion.div>
  );
}

function LanePoints({ label, points, className }: { label: string; points: number; className: string }) {
  return (
    <div className="border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] uppercase tracking-[0.28em] text-white/42">{label}</span>
        <span className={cn("font-mono text-xl font-bold", className)}>{formatPoints(points)}</span>
      </div>
    </div>
  );
}

export function OverviewPanel() {
  const janAttendance = monthByName("Jan");
  const mayAttendance = monthByName("May");
  const febAttendance = monthByName("Feb");
  const blessing = latestBlessing();
  const finance = ytdFinance();
  const standings = rankedCommunities();
  const newJersey = standings.find((community) => community.id === "new-jersey");

  if (!newJersey) {
    throw new Error("New Jersey community is missing from comebackData");
  }

  const attendedGuests = guestStage("Attended Sunday Service");
  const registeredGuests = guestStage("Registration");

  const attentionItems = [
    {
      label: "Guest pipeline",
      value: `${formatNumber(attendedGuests.count)} attended / ${formatNumber(
        registeredGuests.count,
      )} registered`,
      detail: "Registration follow-up is the biggest immediate data-to-care gap.",
    },
    {
      label: "Other-event signal",
      value: `${formatNumber(febAttendance.otherEvents)} -> ${formatNumber(
        mayAttendance.otherEvents,
      )}`,
      detail: "Other-event attendance collapsed from February to May.",
    },
    {
      label: "Inactive members",
      value: formatNumber(MEMBERSHIP.activityLevels.inactive),
      detail: "This is a full reconnect lane, not just an archive number.",
    },
  ];

  return (
    <motion.section
      className="relative min-h-[60vh] overflow-hidden border border-white/10 bg-black/60 p-4 backdrop-blur-md md:p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, ease: EASE }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 20%, rgba(79,127,255,0.18), transparent 35%)",
        }}
      />
      <div className="relative">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-signal">01 · Pastor HQ</p>
            <h2 className="display mt-2 text-5xl uppercase text-white md:text-7xl">At-a-glance</h2>
          </div>
          <p className="max-w-xl text-sm uppercase tracking-[0.22em] text-white/45">
            {TRIMESTER.label} local command readout for Sunday momentum, members, Blessing, and
            score position.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="May Sunday avg"
            value={formatNumber(mayAttendance.sundayTotal)}
            detail={`vs Jan ${formatNumber(janAttendance.sundayTotal)}`}
            accent="text-cyan-100"
            icon={Signal}
          />
          <StatCard
            label="Active members"
            value={`${formatNumber(MEMBERSHIP.activityLevels.core)} + ${formatNumber(
              MEMBERSHIP.activityLevels.active,
            )}`}
            detail="Core + active directory groups"
            accent="text-teal-100"
            icon={Users}
            delay={0.06}
          />
          <StatCard
            label="Blessing goal"
            value={`${blessing.pctAnnualGoal.toFixed(1)}%`}
            detail="Annual goal progress"
            accent="text-rose-100"
            icon={Heart}
            delay={0.12}
          />
          <StatCard
            label="YTD net"
            value={formatCurrency(finance.net)}
            detail={`${finance.months} complete months`}
            accent="text-amber-100"
            icon={Coins}
            delay={0.18}
          />
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <motion.div
            className="border border-white/10 bg-black/60 p-5 backdrop-blur-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-white/42">
                  {TRIMESTER.key} standing
                </p>
                <p className="mt-2 font-mono text-5xl font-bold text-white">
                  #{newJersey.rank}
                </p>
              </div>
              <Trophy className="size-8 text-amber-100" />
            </div>
            <div className="border-y border-white/10 py-5">
              <p className="text-[10px] uppercase tracking-[0.28em] text-white/42">Total points</p>
              <p className="mt-2 font-mono text-6xl font-bold text-signal">
                {formatPoints(newJersey.points)}
              </p>
            </div>
            <div className="mt-4 grid gap-3">
              <LanePoints label="Finance" points={newJersey.financePoints} className="text-amber-100" />
              <LanePoints label="Members" points={newJersey.memberPoints} className="text-teal-100" />
              <LanePoints label="Blessing" points={newJersey.blessingPoints} className="text-rose-100" />
            </div>
          </motion.div>

          <motion.div
            className="border border-white/10 bg-black/60 p-5 backdrop-blur-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18, ease: EASE }}
          >
            <div className="mb-5 flex items-center gap-3">
              <AlertTriangle className="size-5 text-signal" />
              <p className="text-xs uppercase tracking-[0.34em] text-white/70">
                What needs attention
              </p>
            </div>
            <div className="grid gap-3">
              {attentionItems.map((item) => (
                <div key={item.label} className="border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-white/42">
                      {item.label}
                    </p>
                    <p className="font-mono text-xl font-bold text-white">{item.value}</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/58">{item.detail}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div
          className="mt-5 border border-white/10 bg-black/60 p-4 backdrop-blur-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.22, ease: EASE }}
        >
          <p className="mb-4 text-[11px] uppercase tracking-[0.32em] text-white/42">
            Source sheets
          </p>
          <div className="flex flex-wrap gap-2">
            {SOURCE_SHEETS.map((sheet) => (
              <a
                key={sheet.id}
                href={sheetUrl(sheet.id)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.24em] text-white/60 transition-colors hover:border-white/30 hover:text-white"
              >
                {sheet.label}
                <ArrowUpRight className="size-3" />
              </a>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
