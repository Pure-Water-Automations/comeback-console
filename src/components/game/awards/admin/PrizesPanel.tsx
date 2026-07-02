// Prize inventory — tracking ledger only; the app never moves money.

import { useState } from "react";
import { adminSavePrize, type AdminStatePayload } from "@/lib/awardsAdminApi";
import type { PrizeRow } from "@/lib/server/awardsRepo";

const inputCls =
  "w-full border border-white/15 bg-black/60 px-2.5 py-1.5 text-sm text-white outline-none focus:border-white/40";

const EMPTY: Omit<PrizeRow, "id" | "qtyIssued"> = { label: "", type: "gift_card", valueUsd: 0, qtyTotal: 0, notes: "" };

export function PrizesPanel({
  state, passcode, onChanged,
}: { state: AdminStatePayload; passcode: string; onChanged: () => void }) {
  const [draft, setDraft] = useState<(typeof EMPTY & { id?: number }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!draft) return;
    const res = await adminSavePrize({ data: { passcode, prize: draft } });
    if (!res.ok) return setError(res.error ?? "Save failed");
    setDraft(null);
    setError(null);
    onChanged();
  };

  return (
    <div className="mt-6 space-y-4">
      {error ? <p className="border border-rose-300/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{error}</p> : null}
      <table className="w-full text-left text-sm text-white/80">
        <thead>
          <tr className="border-b border-white/10 text-[10px] uppercase tracking-[0.2em] text-white/40">
            <th className="py-2 pr-2">Prize</th><th className="py-2 pr-2">Type</th>
            <th className="py-2 pr-2 text-right">Value</th><th className="py-2 pr-2 text-right">Issued / Total</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {state.prizes.map((p) => (
            <tr key={p.id} className="border-b border-white/5">
              <td className="py-2 pr-2 font-bold text-white">{p.label}</td>
              <td className="py-2 pr-2 text-xs uppercase tracking-[0.14em] text-white/50">{p.type.replace("_", " ")}</td>
              <td className="py-2 pr-2 text-right font-mono">${p.valueUsd.toLocaleString("en-US")}</td>
              <td className="py-2 pr-2 text-right font-mono">{p.qtyIssued} / {p.qtyTotal}</td>
              <td className="py-2 text-right">
                <button type="button" onClick={() => setDraft(p)} className="text-xs uppercase tracking-[0.2em] text-white/40 hover:text-white">Edit</button>
              </td>
            </tr>
          ))}
          {state.prizes.length === 0 ? (
            <tr><td colSpan={5} className="py-4 text-white/40">No prizes in inventory yet.</td></tr>
          ) : null}
        </tbody>
      </table>

      {draft ? (
        <div className="grid gap-3 border border-white/10 bg-black/60 p-4 sm:grid-cols-5">
          <input className={inputCls} placeholder="Label" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
          <select className={inputCls} value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as PrizeRow["type"] })}>
            <option value="cash">Cash</option><option value="gift_card">Gift card</option><option value="other">Other</option>
          </select>
          <input className={inputCls} type="number" min={0} placeholder="Value USD" value={draft.valueUsd} onChange={(e) => setDraft({ ...draft, valueUsd: Number(e.target.value) })} />
          <input className={inputCls} type="number" min={0} placeholder="Qty" value={draft.qtyTotal} onChange={(e) => setDraft({ ...draft, qtyTotal: Number(e.target.value) })} />
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void save()} className="border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white hover:bg-white/20">Save</button>
            <button type="button" onClick={() => setDraft(null)} className="text-xs uppercase tracking-[0.2em] text-white/40 hover:text-white">Cancel</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setDraft({ ...EMPTY })} className="border border-dashed border-white/20 px-3 py-2 text-xs font-bold uppercase tracking-[0.24em] text-white/60 hover:border-white/50 hover:text-white">
          + Add prize
        </button>
      )}
    </div>
  );
}
