// Prize issuance queue: pending → approved → issued (or void). Approving can
// link an inventory prize; issuing bumps qty_issued. Status-only — no payments.

import { useState } from "react";
import { COMMUNITIES } from "@/lib/comebackData";
import { adminTransitionIssuance, type AdminStatePayload } from "@/lib/awardsAdminApi";
import { cn } from "@/lib/utils";

const NAME_BY_ID = new Map(COMMUNITIES.map((c) => [c.id, c.shortName]));

export function IssuancesPanel({
  state, passcode, onChanged,
}: { state: AdminStatePayload; passcode: string; onChanged: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [prizeSel, setPrizeSel] = useState<Record<number, number | undefined>>({});

  const transition = async (id: number, to: "approved" | "issued" | "void") => {
    const res = await adminTransitionIssuance({ data: { passcode, id, to, prizeId: prizeSel[id] } });
    if (!res.ok) return setError(res.error ?? "Transition failed");
    setError(null);
    onChanged();
  };

  return (
    <div className="mt-6 space-y-3">
      {error ? <p className="border border-rose-300/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{error}</p> : null}
      {state.issuances.length === 0 ? (
        <p className="text-sm text-white/40">No prize issuances yet — finalize an award run that carries prizes.</p>
      ) : null}
      {state.issuances.map((iss) => (
        <div key={iss.id} className="flex flex-wrap items-center gap-3 border border-white/10 bg-black/60 px-3 py-2.5">
          <span className={cn(
            "border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em]",
            iss.status === "pending" && "border-amber-200/40 text-amber-100",
            iss.status === "approved" && "border-blue-200/40 text-blue-100",
            iss.status === "issued" && "border-teal-200/40 text-teal-100",
            iss.status === "void" && "border-white/20 text-white/40",
          )}>
            {iss.status}
          </span>
          <span className="text-sm font-bold text-white">{NAME_BY_ID.get(iss.communityId) ?? iss.communityId}</span>
          <span className="text-xs text-white/50">{iss.awardId} · tier {iss.tier} · run #{iss.runId}</span>
          <span className="ml-auto flex items-center gap-2">
            {iss.status === "pending" ? (
              <>
                <select
                  className="border border-white/15 bg-black/60 px-2 py-1 text-xs text-white"
                  value={prizeSel[iss.id] ?? ""}
                  onChange={(e) => setPrizeSel((m) => ({ ...m, [iss.id]: e.target.value ? Number(e.target.value) : undefined }))}
                >
                  <option value="">Link prize…</option>
                  {state.prizes.map((p) => (
                    <option key={p.id} value={p.id}>{p.label} ({p.qtyTotal - p.qtyIssued} left)</option>
                  ))}
                </select>
                <button type="button" onClick={() => void transition(iss.id, "approved")} className="border border-blue-200/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-100 hover:bg-blue-300/10">Approve</button>
              </>
            ) : null}
            {iss.status === "approved" ? (
              <button type="button" onClick={() => void transition(iss.id, "issued")} className="border border-teal-200/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-teal-100 hover:bg-teal-300/10">Mark issued</button>
            ) : null}
            {iss.status === "pending" || iss.status === "approved" ? (
              <button type="button" onClick={() => void transition(iss.id, "void")} className="border border-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 hover:text-white">Void</button>
            ) : null}
          </span>
        </div>
      ))}
    </div>
  );
}
