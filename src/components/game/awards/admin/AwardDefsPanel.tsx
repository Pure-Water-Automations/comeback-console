// Award definitions: list with status chips, a full editor form driven by the
// metric catalog, and preview → finalize run controls per award.

import { useState } from "react";
import { COMMUNITIES } from "@/lib/comebackData";
import { METRICS } from "@/lib/awards-engine/metricCatalog";
import type { AwardDef, EvaluatorId, Scope } from "@/lib/awards-engine/types";
import {
  adminRunFinalize, adminRunPreview, adminSaveDef,
  type AdminStatePayload, type RunPreviewPayload,
} from "@/lib/awardsAdminApi";
import { cn } from "@/lib/utils";

const EVALUATORS: { id: EvaluatorId; label: string; hint: string }[] = [
  { id: "metric_rank", label: "Metric ranking", hint: "Rank scoped communities by a catalog metric" },
  { id: "david", label: "David rule", hint: "Small/Family community out-ranking the XLM tier" },
  { id: "triple_header", label: "Triple header", hint: "Everyone clearing all three targets" },
  { id: "trophy_count", label: "Trophy count", hint: "Most console trophies unlocked (server-side)" },
];

const TONES = ["gold", "teal", "violet", "rose", "blue"] as const;
const SIZES = ["Extra Large", "Medium", "Small", "Family Group"] as const;
const WINDOWS = ["campaign", "latest-week", "month:June 2026", "month:May 2026"];

const EMPTY_DEF: AwardDef = {
  id: "", name: "", subtitle: "", emoji: "🏆", tone: "gold",
  evaluator: "metric_rank", metricId: "total_points", scope: { type: "all" },
  tiers: 1, window: "campaign", tieBreakers: [], eligibility: {}, prizes: [],
  blurb: "", status: "draft", sort: 500,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/45">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputCls =
  "w-full border border-white/15 bg-black/60 px-2.5 py-1.5 text-sm text-white outline-none focus:border-white/40";

export function AwardDefsPanel({
  state, passcode, onChanged,
}: { state: AdminStatePayload; passcode: string; onChanged: () => void }) {
  const [editing, setEditing] = useState<AwardDef | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ defId: string; payload: RunPreviewPayload } | null>(null);
  const [allowSnapshot, setAllowSnapshot] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    setError(null);
    const res = await adminSaveDef({ data: { passcode, def: editing } });
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "Save failed");
    setEditing(null);
    onChanged();
  };

  const runPreview = async (defId: string) => {
    setBusy(true);
    setError(null);
    try {
      const payload = await adminRunPreview({ data: { passcode, defId } });
      setPreview({ defId, payload });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setBusy(false);
  };

  const finalize = async (defId: string) => {
    setBusy(true);
    setError(null);
    const res = await adminRunFinalize({ data: { passcode, defId, allowSnapshot } });
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "Finalize failed");
    setPreview(null);
    onChanged();
  };

  const upd = (patch: Partial<AwardDef>) => setEditing((d) => (d ? { ...d, ...patch } : d));

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      {/* list */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setEditing({ ...EMPTY_DEF })}
          className="w-full border border-dashed border-white/20 px-3 py-2 text-xs font-bold uppercase tracking-[0.24em] text-white/60 hover:border-white/50 hover:text-white"
        >
          + New award
        </button>
        {state.defs.map((def) => {
          const run = state.latestRuns[def.id];
          return (
            <div key={def.id} className="border border-white/10 bg-black/60 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <button type="button" onClick={() => setEditing(def)} className="min-w-0 text-left">
                  <span className="block truncate text-sm font-bold text-white">
                    {def.emoji} {def.name}
                  </span>
                  <span className="block text-[10px] uppercase tracking-[0.2em] text-white/40">
                    {def.evaluator}{def.metricId ? ` · ${def.metricId}` : ""} · {def.window}
                  </span>
                </button>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className={cn(
                    "border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em]",
                    def.status === "active" && "border-teal-200/40 text-teal-100",
                    def.status === "draft" && "border-white/20 text-white/50",
                    def.status === "archived" && "border-rose-200/30 text-rose-200/70",
                  )}>
                    {def.status}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void runPreview(def.id)}
                    className="border border-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-white/70 hover:text-white"
                  >
                    Run
                  </button>
                </div>
              </div>
              {run ? (
                <p className="mt-1 text-[10px] text-white/35">
                  Last run {new Date(run.ranAt).toLocaleDateString("en-US")} · {run.windowLabel} · {run.dataSource}
                  {" · "}{run.results.winners.map((w) => w.community).join(", ") || "no winners"}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* editor OR run preview */}
      <div>
        {error ? <p className="mb-3 border border-rose-300/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{error}</p> : null}

        {preview ? (
          <div className="border border-white/10 bg-black/60 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-[0.28em] text-white">Run preview — {preview.defId}</h3>
              <span className={cn(
                "border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em]",
                preview.payload.source === "live" ? "border-teal-200/40 text-teal-100" : "border-amber-200/40 text-amber-100",
              )}>
                {preview.payload.source}{preview.payload.month ? ` · ${preview.payload.month}` : ""}
              </span>
            </div>
            <table className="mt-3 w-full text-left text-sm text-white/80">
              <thead>
                <tr className="border-b border-white/10 text-[10px] uppercase tracking-[0.2em] text-white/40">
                  <th className="py-1.5 pr-2">Tier</th><th className="py-1.5 pr-2">Community</th><th className="py-1.5">Stat</th>
                </tr>
              </thead>
              <tbody>
                {preview.payload.results.winners.map((w) => (
                  <tr key={`${w.tier}-${w.communityId}`} className="border-b border-white/5">
                    <td className="py-1.5 pr-2 font-mono">{w.tier}</td>
                    <td className="py-1.5 pr-2 font-bold text-white">{w.community}</td>
                    <td className="py-1.5">{w.stat}</td>
                  </tr>
                ))}
                {preview.payload.results.winners.length === 0 ? (
                  <tr><td colSpan={3} className="py-3 text-white/40">No winners under current data + rules.</td></tr>
                ) : null}
              </tbody>
            </table>
            {preview.payload.results.disqualified.length ? (
              <details className="mt-3 text-xs text-white/50">
                <summary className="cursor-pointer uppercase tracking-[0.2em]">
                  {preview.payload.results.disqualified.length} disqualified
                </summary>
                <ul className="mt-2 space-y-1">
                  {preview.payload.results.disqualified.map((d) => (
                    <li key={d.communityId}>{d.community}: {d.reason}</li>
                  ))}
                </ul>
              </details>
            ) : null}
            {preview.payload.results.tieBreaksApplied.length ? (
              <p className="mt-2 text-xs text-white/40">Tie-breaks: {preview.payload.results.tieBreaksApplied.join(" · ")}</p>
            ) : null}
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button" disabled={busy}
                onClick={() => void finalize(preview.defId)}
                className="border border-teal-200/40 bg-teal-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-teal-100 hover:bg-teal-300/20"
              >
                Finalize run
              </button>
              {preview.payload.source === "snapshot" ? (
                <label className="flex items-center gap-2 text-xs text-amber-200">
                  <input type="checkbox" checked={allowSnapshot} onChange={(e) => setAllowSnapshot(e.target.checked)} />
                  Allow snapshot data (recorded in audit)
                </label>
              ) : null}
              <button type="button" onClick={() => setPreview(null)} className="ml-auto text-xs uppercase tracking-[0.2em] text-white/40 hover:text-white">
                Close
              </button>
            </div>
          </div>
        ) : editing ? (
          <div className="space-y-3 border border-white/10 bg-black/60 p-4">
            <h3 className="text-sm font-bold uppercase tracking-[0.28em] text-white">
              {editing.id && state.defs.some((d) => d.id === editing.id) ? `Edit — ${editing.id}` : "New award"}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Id (slug, permanent)">
                <input className={inputCls} value={editing.id} disabled={state.defs.some((d) => d.id === editing.id)}
                  onChange={(e) => upd({ id: e.target.value })} placeholder="my-award" />
              </Field>
              <Field label="Name"><input className={inputCls} value={editing.name} onChange={(e) => upd({ name: e.target.value })} /></Field>
              <Field label="Subtitle"><input className={inputCls} value={editing.subtitle} onChange={(e) => upd({ subtitle: e.target.value })} /></Field>
              <Field label="Emoji"><input className={inputCls} value={editing.emoji} onChange={(e) => upd({ emoji: e.target.value })} /></Field>
              <Field label="Tone">
                <select className={inputCls} value={editing.tone} onChange={(e) => upd({ tone: e.target.value as AwardDef["tone"] })}>
                  {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select className={inputCls} value={editing.status} onChange={(e) => upd({ status: e.target.value as AwardDef["status"] })}>
                  <option value="draft">draft</option><option value="active">active</option><option value="archived">archived</option>
                </select>
              </Field>
              <Field label="Evaluator">
                <select className={inputCls} value={editing.evaluator} onChange={(e) => upd({ evaluator: e.target.value as EvaluatorId })}>
                  {EVALUATORS.map((ev) => <option key={ev.id} value={ev.id} title={ev.hint}>{ev.label}</option>)}
                </select>
              </Field>
              {editing.evaluator === "metric_rank" ? (
                <Field label="Metric">
                  <select className={inputCls} value={editing.metricId ?? ""} onChange={(e) => upd({ metricId: e.target.value as AwardDef["metricId"] })}>
                    {METRICS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                </Field>
              ) : null}
              <Field label="Tiers">
                <select className={inputCls} value={editing.tiers} onChange={(e) => upd({ tiers: Number(e.target.value) as 1 | 3 })}>
                  <option value={1}>Single winner</option><option value={3}>Podium (1st/2nd/3rd)</option>
                </select>
              </Field>
              <Field label="Window">
                <select className={inputCls} value={editing.window} onChange={(e) => upd({ window: e.target.value })}>
                  {WINDOWS.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </Field>
              <Field label="Scope">
                <select
                  className={inputCls}
                  value={editing.scope.type}
                  onChange={(e) => {
                    const t = e.target.value as Scope["type"];
                    upd({
                      scope:
                        t === "all" ? { type: "all" }
                        : t === "size" ? { type: "size", sizes: ["Small"] }
                        : { type: "list", communityIds: [COMMUNITIES[0].id] },
                    });
                  }}
                >
                  <option value="all">All communities</option>
                  <option value="size">By size tier</option>
                  <option value="list">Specific communities</option>
                </select>
              </Field>
              <Field label="Sort order">
                <input className={inputCls} type="number" value={editing.sort} onChange={(e) => upd({ sort: Number(e.target.value) })} />
              </Field>
            </div>

            {editing.scope.type === "size" ? (
              <Field label="Size tiers">
                <div className="flex flex-wrap gap-3">
                  {SIZES.map((s) => (
                    <label key={s} className="flex items-center gap-1.5 text-sm text-white/80">
                      <input
                        type="checkbox"
                        checked={editing.scope.type === "size" && editing.scope.sizes.includes(s)}
                        onChange={(e) => {
                          if (editing.scope.type !== "size") return;
                          const sizes = e.target.checked
                            ? [...editing.scope.sizes, s]
                            : editing.scope.sizes.filter((x) => x !== s);
                          upd({ scope: { type: "size", sizes } });
                        }}
                      />
                      {s}
                    </label>
                  ))}
                </div>
              </Field>
            ) : null}
            {editing.scope.type === "list" ? (
              <Field label="Communities">
                <select
                  multiple size={6} className={inputCls}
                  value={editing.scope.type === "list" ? editing.scope.communityIds : []}
                  onChange={(e) =>
                    upd({ scope: { type: "list", communityIds: [...e.target.selectedOptions].map((o) => o.value) } })
                  }
                >
                  {COMMUNITIES.map((c) => <option key={c.id} value={c.id}>{c.shortName}</option>)}
                </select>
              </Field>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Min weeks reported">
                <input className={inputCls} type="number" min={0} max={5}
                  value={editing.eligibility.minWeeksReported ?? ""}
                  onChange={(e) => upd({ eligibility: { ...editing.eligibility, minWeeksReported: e.target.value ? Number(e.target.value) : undefined } })} />
              </Field>
              <label className="flex items-end gap-2 pb-1.5 text-sm text-white/80">
                <input type="checkbox" checked={editing.eligibility.requireAllCategories ?? false}
                  onChange={(e) => upd({ eligibility: { ...editing.eligibility, requireAllCategories: e.target.checked || undefined } })} />
                All FAB lanes required
              </label>
              <label className="flex items-end gap-2 pb-1.5 text-sm text-white/80">
                <input type="checkbox" checked={editing.eligibility.requirePositive ?? false}
                  onChange={(e) => upd({ eligibility: { ...editing.eligibility, requirePositive: e.target.checked || undefined } })} />
                Positive values only
              </label>
            </div>

            <Field label="Prizes (per tier — tracking only, no money moves)">
              <div className="space-y-2">
                {Array.from({ length: editing.tiers }, (_, i) => i + 1).map((tier) => {
                  const p = editing.prizes.find((x) => x.tier === tier);
                  return (
                    <div key={tier} className="grid grid-cols-[3rem_1fr_6rem_1fr] items-center gap-2">
                      <span className="text-xs text-white/50">Tier {tier}</span>
                      <select className={inputCls} value={p?.type ?? ""}
                        onChange={(e) => {
                          const others = editing.prizes.filter((x) => x.tier !== tier);
                          const type = e.target.value as "cash" | "gift_card" | "other" | "";
                          upd({ prizes: type ? [...others, { tier, type, valueUsd: p?.valueUsd ?? 0, label: p?.label ?? "" }] : others });
                        }}>
                        <option value="">No prize</option><option value="cash">Cash</option>
                        <option value="gift_card">Gift card</option><option value="other">Other</option>
                      </select>
                      <input className={inputCls} type="number" min={0} placeholder="USD" value={p?.valueUsd ?? ""}
                        disabled={!p}
                        onChange={(e) => upd({ prizes: editing.prizes.map((x) => x.tier === tier ? { ...x, valueUsd: Number(e.target.value) } : x) })} />
                      <input className={inputCls} placeholder="Label" value={p?.label ?? ""} disabled={!p}
                        onChange={(e) => upd({ prizes: editing.prizes.map((x) => x.tier === tier ? { ...x, label: e.target.value } : x) })} />
                    </div>
                  );
                })}
              </div>
            </Field>

            <Field label="MC blurb"><textarea className={inputCls} rows={2} value={editing.blurb} onChange={(e) => upd({ blurb: e.target.value })} /></Field>

            <div className="flex gap-3">
              <button type="button" disabled={busy} onClick={() => void save()}
                className="border border-white/25 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-white hover:bg-white/20">
                Save award
              </button>
              <button type="button" onClick={() => setEditing(null)} className="text-xs uppercase tracking-[0.2em] text-white/40 hover:text-white">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-6 text-sm text-white/40">Select an award to edit, hit Run for a preview, or create a new one.</p>
        )}
      </div>
    </div>
  );
}
