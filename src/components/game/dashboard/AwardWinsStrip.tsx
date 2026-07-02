// "Our award wins" — the selected community's current awards, from the same
// feed the ceremony uses (engine runs when finalized, legacy otherwise).

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { fetchLiveAwards } from "@/lib/regionalScoreboard";

export function AwardWinsStrip({ communityId }: { communityId: string }) {
  const awardsQuery = useQuery({
    queryKey: ["live-awards"],
    queryFn: () => fetchLiveAwards(),
    staleTime: 5 * 60_000,
  });

  const wins = (awardsQuery.data?.awards ?? []).flatMap((award) => {
    const w = award.winners.find((x) => x.communityId === communityId);
    return w ? [{ award, winner: w }] : [];
  });

  return (
    <section className="border border-white/10 bg-black/60 p-5 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold uppercase tracking-[0.32em] text-white">Our Award Wins</h3>
        <Link
          to="/awards"
          className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/50 transition-colors hover:text-white"
        >
          Awards Night →
        </Link>
      </div>
      {wins.length === 0 ? (
        <p className="mt-3 text-sm text-white/50">
          No awards yet this period — the podium awaits. Check the standings for the next best move.
        </p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {wins.map(({ award, winner }) => (
            <li key={award.id} className="flex items-center gap-3 border border-white/10 bg-white/[0.03] px-3 py-2">
              <span className="text-2xl" aria-hidden="true">{award.emoji}</span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-white">{award.title}</span>
                <span className="block text-xs text-white/50">{winner.stat}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
