// Full 18-community standings with the FAB category toggle VA Marc asked for
// (Overall / Income / Members / Blessing) and provenance popovers explaining
// how each number is calculated (metric catalog governance metadata).

import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { METRIC_BY_ID, type MetricDef } from "@/lib/awards-engine/metricCatalog";
import type { RankedCommunity } from "@/lib/comebackData";
import { cn } from "@/lib/utils";

type CategoryKey = "overall" | "finance" | "members" | "blessing";

const CATEGORIES: { key: CategoryKey; label: string; metric: MetricDef; points: (c: RankedCommunity) => number }[] = [
  { key: "overall", label: "Overall", metric: METRIC_BY_ID.total_points, points: (c) => c.points },
  { key: "finance", label: "Income", metric: METRIC_BY_ID.finance_points, points: (c) => c.financePoints },
  { key: "members", label: "Members", metric: METRIC_BY_ID.member_points, points: (c) => c.memberPoints },
  { key: "blessing", label: "Blessing", metric: METRIC_BY_ID.blessing_points, points: (c) => c.blessingPoints },
];

function ProvenanceInfo({ metric }: { metric: MetricDef }) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={`How is ${metric.label} calculated?`}
        className="inline-flex text-white/40 transition-colors hover:text-white"
      >
        <Info className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent className="w-72 border-white/15 bg-black/90 text-white backdrop-blur-md">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-signal">{metric.label}</p>
        <p className="mt-2 text-xs leading-5 text-white/70">{metric.sourceDescription}</p>
        <p className="mt-2 text-[10px] uppercase tracking-[0.24em] text-white/40">
          Updates: {metric.updateCadence}
        </p>
      </PopoverContent>
    </Popover>
  );
}

const signed = (n: number) => `${n > 0 ? "+" : ""}${n}`;

export function StandingsTable({ standings }: { standings: RankedCommunity[] }) {
  const [category, setCategory] = useState<CategoryKey>("overall");
  const active = CATEGORIES.find((c) => c.key === category)!;

  const rows = useMemo(
    () =>
      [...standings]
        .sort((a, b) => active.points(b) - active.points(a) || a.shortName.localeCompare(b.shortName))
        .map((c, i) => ({ c, rank: i + 1 })),
    [standings, active],
  );

  return (
    <section className="border border-white/10 bg-black/60 p-5 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold uppercase tracking-[0.32em] text-white">Full Standings</h3>
          <ProvenanceInfo metric={active.metric} />
        </div>
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
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-[10px] uppercase tracking-[0.24em] text-white/40">
              <th className="py-2 pr-3">#</th>
              <th className="py-2 pr-3">Community</th>
              <th className="py-2 pr-3">Size</th>
              <th className="py-2 pr-3 text-right">{active.label} pts</th>
              <th className="py-2 text-right">Total pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ c, rank }) => (
              <tr key={c.id} className="border-b border-white/5 text-white/80">
                <td className={cn("py-2 pr-3 font-mono", rank <= 3 && "text-amber-200")}>{rank}</td>
                <td className="py-2 pr-3 font-bold text-white">{c.shortName}</td>
                <td className="py-2 pr-3 text-xs text-white/50">{c.size}</td>
                <td className="py-2 pr-3 text-right font-mono">{signed(active.points(c))}</td>
                <td className="py-2 text-right font-mono text-white/60">{signed(c.points)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
