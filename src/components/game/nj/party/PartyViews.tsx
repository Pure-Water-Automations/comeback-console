// Stub — replaced by the PartyViews fanout task. Keep the export + props stable.
import type { PartyMember } from "@/lib/partyData";

export function PartyViews({ members }: { members: PartyMember[] }) {
  return (
    <div className="border border-white/10 bg-black/60 p-10 text-center text-xs uppercase tracking-[0.3em] text-white/40">
      Party views loading… ({members.length})
    </div>
  );
}
