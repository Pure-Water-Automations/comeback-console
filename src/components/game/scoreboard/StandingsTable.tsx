// Full 18-community standings with the FAB category toggle VA Marc asked for
// (Overall / Income / Members / Blessing), a value-mode switch (Points ·
// % of Target · Actuals), provenance popovers, and click-to-expand board
// cards showing everything on the community's live scoreboard row.

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { CommunityBoard } from "@/lib/boardTypes";
import { METRIC_BY_ID, type MetricDef } from "@/lib/awards-engine/metricCatalog";
import type { CategoryScore, RankedCommunity } from "@/lib/comebackData";
import { cn } from "@/lib/utils";
import { CommunityBoardCard } from "./CommunityBoardCard";

type CategoryKey = "overall" | "finance" | "members" | "blessing";
type ValueMode = "pts" | "pct" | "actual";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const int = (n: number) => Math.round(n).toLocaleString("en-US");
const signed = (n: number) => `${n > 0 ? "+" : ""}${Math.round(n)}`;

/**
 * Growth vs baseline — the board's own % (result ÷ baseline × 100).
 * Null when the result hasn't been reported yet (distinct from a real 0,
 * which would mean "collapsed to nothing" rather than "not posted yet").
 */
const growthOf = (s: CategoryScore): number | null =>
  s.baseline && s.result ? (s.result / s.baseline) * 100 : s.result === null ? null : 0;

interface Lane {
  key: Exclude<CategoryKey, "overall">;
  label: string;
  metric: MetricDef;
  pts: (c: RankedCommunity) => number;
  /** The sheet's growth-% (vs baseline); computed fallback on snapshot */
  growth: (c: RankedCommunity, b?: CommunityBoard) => number | null;
  actual: (c: RankedCommunity, b?: CommunityBoard) => number | null;
  fmtActual: (n: number) => string;
}

const LANES: Lane[] = [
  {
    key: "finance", label: "Income", metric: METRIC_BY_ID.finance_points,
    pts: (c) => c.financePoints,
    growth: (c, b) => b?.finance.growthPct ?? growthOf(c.finance),
    actual: (c, b) => b?.finance.t2Result ?? c.finance.result,
    fmtActual: usd,
  },
  {
    key: "members", label: "Members", metric: METRIC_BY_ID.member_points,
    pts: (c) => c.memberPoints,
    growth: (c, b) => b?.activeMembers.growthPct ?? growthOf(c.activeMembers),
    actual: (c, b) => b?.activeMembers.t2Result ?? c.activeMembers.result,
    fmtActual: int,
  },
  {
    key: "blessing", label: "Blessing", metric: METRIC_BY_ID.blessing_points,
    pts: (c) => c.blessingPoints,
    growth: (c, b) => b?.blessing.growthPct ?? growthOf(c.blessing),
    actual: (c, b) => b?.blessing.t2Result ?? c.blessing.result,
    fmtActual: int,
  },
];

const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: "overall", label: "Overall" },
  ...LANES.map((l) => ({ key: l.key as CategoryKey, label: l.label })),
];

const MODES: { key: ValueMode; label: string; hint: string }[] = [
  { key: "pts", label: "Points", hint: "Campaign points: growth % over baseline × 10" },
  { key: "pct", label: "% Growth", hint: "The board's own % — this trimester's result vs baseline" },
  { key: "actual", label: "Actuals", hint: "The real numbers behind the score" },
];

const GROWTH_PROVENANCE = {
  label: "% Growth (the board's %)",
  sourceDescription:
    "The scoreboard's own % column: this trimester's result ÷ the community's baseline × 100. 100% means holding steady at baseline — it is NOT progress toward the target. Points come straight from it: (% − 100) × 10.",
  updateCadence: "Weekly — pastors log results on the regional scoreboard",
};

interface ProvenanceContent {
  label: string;
  sourceDescription: string;
  updateCadence: string;
}

function ProvenanceInfo({ content }: { content: ProvenanceContent }) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={`How is ${content.label} calculated?`}
        className="inline-flex text-white/40 transition-colors hover:text-white"
      >
        <Info className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent className="w-72 border-white/15 bg-black/90 text-white backdrop-blur-md">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-signal">{content.label}</p>
        <p className="mt-2 text-xs leading-5 text-white/70">{content.sourceDescription}</p>
        <p className="mt-2 text-[10px] uppercase tracking-[0.24em] text-white/40">
          Updates: {content.updateCadence}
        </p>
      </PopoverContent>
    </Popover>
  );
}

/** Growth vs baseline: ▲ growing (teal), ▼ shrinking (muted), · flat, · Pending (not reported yet). */
function GrowthCell({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <span className="font-mono text-white/35" title="Not reported yet this month">
        · Pending
      </span>
    );
  }
  const delta = value - 100;
  if (Math.abs(delta) < 0.05) return <span className="font-mono text-white/40">· 0.0%</span>;
  const growing = delta > 0;
  return (
    <span className={cn("font-mono", growing ? "text-teal-100" : "text-white/60")}>
      {growing ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
    </span>
  );
}

/** Shared "—" rendering for a nullable actual value (not reported yet). */
function fmtActualOrDash(lane: Pick<Lane, "fmtActual">, value: number | null): string {
  return value === null ? "—" : lane.fmtActual(value);
}

interface Column {
  header: string;
  render: (c: RankedCommunity, b?: CommunityBoard) => React.ReactNode;
}

function columnsFor(category: CategoryKey, mode: ValueMode): Column[] {
  if (category === "overall") {
    if (mode === "pts") {
      return [
        ...LANES.map((l) => ({ header: `${l.label} pts`, render: (c: RankedCommunity) => <span className="font-mono">{signed(l.pts(c))}</span> })),
        { header: "Total pts", render: (c) => <span className="font-mono font-bold text-white">{signed(c.points)}</span> },
      ];
    }
    if (mode === "pct") {
      return LANES.map((l) => ({ header: `${l.label} growth`, render: (c: RankedCommunity, b?: CommunityBoard) => <GrowthCell value={l.growth(c, b)} /> }));
    }
    return LANES.map((l) => ({ header: l.label, render: (c: RankedCommunity, b?: CommunityBoard) => <span className="font-mono">{fmtActualOrDash(l, l.actual(c, b))}</span> }));
  }
  const lane = LANES.find((l) => l.key === category)!;
  if (mode === "pts") {
    return [
      { header: `${lane.label} pts`, render: (c) => <span className="font-mono font-bold text-white">{signed(lane.pts(c))}</span> },
      { header: "Total pts", render: (c) => <span className="font-mono text-white/60">{signed(c.points)}</span> },
    ];
  }
  if (mode === "pct") {
    return [{ header: "Growth vs baseline", render: (c, b) => <GrowthCell value={lane.growth(c, b)} /> }];
  }
  return [
    { header: "Baseline", render: (c, b) => <span className="font-mono text-white/50">{fmtLaneField(lane, b, c, "baseline")}</span> },
    { header: "Current", render: (c, b) => <span className="font-mono font-bold text-white">{fmtActualOrDash(lane, lane.actual(c, b))}</span> },
    { header: "Target", render: (c, b) => <span className="font-mono text-white/50">{fmtLaneField(lane, b, c, "target")}</span> },
  ];
}

function fmtLaneField(lane: Lane, b: CommunityBoard | undefined, c: RankedCommunity, field: "baseline" | "target"): string {
  const boardLane = b ? { finance: b.finance, members: b.activeMembers, blessing: b.blessing }[lane.key] : undefined;
  const fallback = { finance: c.finance, members: c.activeMembers, blessing: c.blessing }[lane.key][field];
  const v = boardLane?.[field] ?? fallback;
  return v ? lane.fmtActual(v) : "—";
}

/**
 * Sort keys need a real number even for a "Pending" lane. 100 is the neutral
 * substitute for growth (0% delta vs baseline — neither rewards nor punishes
 * not having reported yet); 0 is the neutral substitute for a raw actual.
 */
function rankValue(c: RankedCommunity, b: CommunityBoard | undefined, category: CategoryKey, mode: ValueMode): number {
  if (category === "overall") {
    if (mode === "pct") return LANES.reduce((s, l) => s + (l.growth(c, b) ?? 100), 0) / LANES.length;
    return c.points;
  }
  const lane = LANES.find((l) => l.key === category)!;
  if (mode === "pts") return lane.pts(c);
  if (mode === "pct") return lane.growth(c, b) ?? 100;
  return lane.actual(c, b) ?? 0;
}

export function StandingsTable({
  standings, boards, monthLabel,
}: { standings: RankedCommunity[]; boards: Record<string, CommunityBoard>; monthLabel: string }) {
  const [category, setCategory] = useState<CategoryKey>("overall");
  const [mode, setMode] = useState<ValueMode>("pts");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const activeMetric =
    category === "overall" ? METRIC_BY_ID.total_points : LANES.find((l) => l.key === category)!.metric;
  const provenance: ProvenanceContent = mode === "pct" ? GROWTH_PROVENANCE : activeMetric;

  const rows = useMemo(
    () =>
      [...standings]
        .sort((a, b) => {
          const av = rankValue(a, boards[a.id], category, mode);
          const bv = rankValue(b, boards[b.id], category, mode);
          return bv - av || a.shortName.localeCompare(b.shortName);
        })
        .map((c, i) => ({ c, rank: i + 1 })),
    [standings, boards, category, mode],
  );

  const columns = columnsFor(category, mode);

  return (
    <section className="border border-white/10 bg-black/60 p-5 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold uppercase tracking-[0.32em] text-white">Full Standings</h3>
          <ProvenanceInfo content={provenance} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-px border border-white/10">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.24em] transition-colors",
                  category === c.key ? "bg-white/15 text-white" : "bg-black/40 text-white/50 hover:text-white",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex gap-px border border-white/10">
            {MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                title={m.hint}
                onClick={() => setMode(m.key)}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.24em] transition-colors",
                  mode === m.key ? "bg-white/15 text-white" : "bg-black/40 text-white/50 hover:text-white",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-white/35">
        Tap a community to open its full board
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-[10px] uppercase tracking-[0.24em] text-white/40">
              <th className="py-2 pr-3">#</th>
              <th className="py-2 pr-3">Community</th>
              <th className="py-2 pr-3">Size</th>
              {columns.map((col) => (
                <th key={col.header} className="py-2 pr-3 text-right">{col.header}</th>
              ))}
              <th className="w-6 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ c, rank }) => {
              const expanded = expandedId === c.id;
              return (
                <Fragment key={c.id}>
                  <tr
                    className={cn(
                      "cursor-pointer border-b border-white/5 text-white/80 transition-colors hover:bg-white/[0.04]",
                      expanded && "bg-white/[0.05]",
                    )}
                    onClick={() => setExpandedId(expanded ? null : c.id)}
                  >
                    <td className={cn("py-2 pr-3 font-mono", rank <= 3 && "text-amber-200")}>{rank}</td>
                    <td className="py-2 pr-3 font-bold text-white">{c.shortName}</td>
                    <td className="py-2 pr-3 text-xs text-white/50">{c.size}</td>
                    {columns.map((col) => (
                      <td key={col.header} className="py-2 pr-3 text-right">{col.render(c, boards[c.id])}</td>
                    ))}
                    <td className="py-2 text-white/30">
                      <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} />
                    </td>
                  </tr>
                  {expanded ? (
                    <tr className="border-b border-white/5">
                      <td colSpan={columns.length + 4} className="py-3">
                        <CommunityBoardCard community={c} board={boards[c.id] ?? null} monthLabel={monthLabel} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
