// The full scoreboard row for one community, presented as a game card instead
// of a wall of numbers: FAB lanes as progress bars with %/points chips, weekly
// attendance minis, new-member counts, and LES goal chips.

import type { CommunityBoard, LaneScore, WeeklyLane } from "@/lib/boardTypes";
import type { RankedCommunity } from "@/lib/comebackData";
import { cn } from "@/lib/utils";
import { communityIsLeaderArt, communitySprite } from "./mascots";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const int = (n: number) => Math.round(n).toLocaleString("en-US");
const signed = (n: number) => `${n > 0 ? "+" : ""}${Math.round(n)}`;
const dash = "—";

/**
 * The sheet's % is GROWTH vs baseline (100 = holding steady), so it renders
 * as a signed delta — "+19.6% vs baseline" — never as progress-to-target.
 */
function ChipGrowth({ growthPct }: { growthPct: number | null }) {
  if (growthPct === null) return null;
  const delta = growthPct - 100;
  const flat = Math.abs(delta) < 0.05;
  const growing = delta > 0;
  return (
    <span
      title="The board's % — this trimester's result vs baseline"
      className={cn(
        "whitespace-nowrap border px-1.5 py-0.5 font-mono text-[10px] font-bold",
        flat
          ? "border-white/15 bg-white/[0.04] text-white/50"
          : growing
            ? "border-teal-200/40 bg-teal-300/10 text-teal-100"
            : "border-white/15 bg-white/[0.04] text-white/60",
      )}
    >
      {flat ? "· at baseline" : `${growing ? "▲" : "▼"} ${Math.abs(delta).toFixed(1)}% vs baseline`}
    </span>
  );
}

function ChipPts({ points }: { points: number | null }) {
  if (points === null) return null;
  const good = points > 0;
  return (
    <span
      className={cn(
        "border px-1.5 py-0.5 font-mono text-[10px] font-bold",
        good ? "border-amber-200/40 bg-amber-300/10 text-amber-100" : "border-rose-200/30 bg-rose-300/5 text-rose-200/80",
      )}
    >
      {signed(points)} pts
    </span>
  );
}

function LaneTile({
  label, lane, money, monthLabel,
}: { label: string; lane: LaneScore; money?: boolean; monthLabel: string }) {
  const fmt = money ? usd : int;
  // The bar is progress toward TARGET (computed) — distinct from the sheet's
  // growth-% chip above it, which compares against baseline.
  const targetPct =
    lane.t2Result !== null && lane.target ? (lane.t2Result / lane.target) * 100 : null;
  const fillPct = targetPct === null ? 0 : Math.max(0, Math.min(100, targetPct));
  return (
    <div className="border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/50">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        <ChipGrowth growthPct={lane.growthPct} />
        <ChipPts points={lane.points} />
      </div>
      <p className="mt-2 font-mono text-2xl font-bold text-white">
        {lane.t2Result !== null ? fmt(lane.t2Result) : dash}
      </p>
      <div
        className="mt-2 h-2 border border-white/10 bg-white/[0.04]"
        title={targetPct === null ? undefined : `${targetPct.toFixed(1)}% of the trimester target`}
      >
        <div
          className={cn(
            "h-full transition-[width]",
            targetPct !== null && targetPct >= 100
              ? "bg-gradient-to-r from-teal-300 to-teal-100"
              : "bg-gradient-to-r from-amber-300/80 to-yellow-100/80",
          )}
          style={{ width: `${fillPct}%` }}
        />
      </div>
      <p className="mt-1.5 flex justify-between text-[10px] uppercase tracking-[0.14em] text-white/40">
        <span>Baseline {lane.baseline !== null ? fmt(lane.baseline) : dash}</span>
        <span>Target {lane.target !== null ? fmt(lane.target) : dash}</span>
      </p>
      {lane.monthResult !== null && lane.monthResult !== lane.t2Result ? (
        <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/35">
          {monthLabel}: {fmt(lane.monthResult)}
        </p>
      ) : null}
    </div>
  );
}

function WeeklyTile({ label, lane }: { label: string; lane: WeeklyLane }) {
  const peak = Math.max(...lane.weeks.map((w) => w ?? 0), 1);
  const nothingReported = lane.monthAvg === null && lane.weeks.every((w) => w === null);
  return (
    <div className="border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/50">{label}</p>
        {lane.pctGrowth !== null && !nothingReported ? <ChipGrowth growthPct={lane.pctGrowth} /> : null}
      </div>
      {nothingReported ? (
        <p className="mt-4 text-sm text-white/40">Nothing reported yet this month.</p>
      ) : (
        <>
          <p className="mt-2 font-mono text-2xl font-bold text-white">
            {lane.monthAvg !== null ? int(lane.monthAvg) : dash}
            <span className="ml-2 text-xs font-normal text-white/40">weekly avg</span>
          </p>
          <div className="mt-2 flex gap-1">
            {lane.weeks.map((w, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-12 w-full items-end">
                  <div
                    className={cn("w-full", w === null ? "h-px bg-white/15" : "bg-gradient-to-t from-cyan-500/60 to-cyan-200/80")}
                    style={w === null ? undefined : { height: `${Math.max(10, (w / peak) * 100)}%` }}
                    title={w === null ? "No service reported" : `Week ${i + 1}: ${int(w)}`}
                  />
                </div>
                <span className="font-mono text-[9px] text-white/35">{w === null ? "·" : int(w)}</span>
              </div>
            ))}
          </div>
        </>
      )}
      <p className="mt-1.5 flex justify-between text-[10px] uppercase tracking-[0.14em] text-white/40">
        <span>Baseline {lane.baseline !== null ? int(lane.baseline) : dash}</span>
        <span>Target {lane.target !== null ? int(lane.target) : dash}</span>
      </p>
    </div>
  );
}

const LES_LABEL = { leadership: "Leadership", environment: "Environment", special: "Special" } as const;

export function CommunityBoardCard({
  community, board, monthLabel,
}: { community: RankedCommunity; board: CommunityBoard | null; monthLabel: string }) {
  const sprite = communitySprite(community, "hero");
  if (!board) {
    return (
      <div className="border border-white/10 bg-black/50 p-4 text-sm text-white/50">
        Full board detail comes from the live scoreboard sheet — it isn't available while the console is
        showing the snapshot.
      </div>
    );
  }
  return (
    <div className="space-y-3 border border-white/10 bg-black/50 p-4">
      <div className="flex items-center gap-3">
        <img
          src={sprite}
          alt=""
          className={cn("h-12 w-12 object-contain drop-shadow-xl", !communityIsLeaderArt(community) && "[image-rendering:pixelated]")}
        />
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-white">{community.name}</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">
            {community.size} · Rank #{community.rank} · {signed(community.points)} pts total
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <LaneTile label="Income" lane={board.finance} money monthLabel={monthLabel} />
        <LaneTile label="Active Members" lane={board.activeMembers} monthLabel={monthLabel} />
        <LaneTile label="Blessing Journey" lane={board.blessing} monthLabel={monthLabel} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <WeeklyTile label="Sunday Service" lane={board.sunday} />
        <WeeklyTile label="Other Events" lane={board.otherEvents} />
        <div className="border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/50">New Members</p>
          <p className="mt-2 font-mono text-2xl font-bold text-white">
            {board.newMembers.t2Result !== null ? int(board.newMembers.t2Result) : dash}
            <span className="ml-2 text-xs font-normal text-white/40">this trimester</span>
          </p>
          <p className="mt-1.5 text-[10px] uppercase tracking-[0.14em] text-white/40">
            {monthLabel}: {board.newMembers.monthResult !== null ? int(board.newMembers.monthResult) : dash} · Target{" "}
            {board.newMembers.target !== null ? int(board.newMembers.target) : dash}
          </p>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.24em] text-white/50">LES Quests</p>
          {board.lesGoals.length === 0 ? (
            <p className="mt-1.5 text-xs text-white/40">No quests posted yet.</p>
          ) : (
            <ul className="mt-1.5 space-y-1">
              {board.lesGoals.map((g, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-white/70">
                  <span className={cn("font-mono", g.completedDate ? "text-teal-200" : "text-white/35")}>
                    {g.completedDate ? "✓" : "◇"}
                  </span>
                  <span className="truncate">{g.title}</span>
                  <span className="ml-auto shrink-0 text-[9px] uppercase tracking-[0.14em] text-white/35">
                    {LES_LABEL[g.category]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
