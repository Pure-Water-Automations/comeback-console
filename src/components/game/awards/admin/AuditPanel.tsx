// Read-only audit trail — every config change, run, and issuance transition.

import type { AdminStatePayload } from "@/lib/awardsAdminApi";

export function AuditPanel({ state }: { state: AdminStatePayload }) {
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full text-left text-xs text-white/70">
        <thead>
          <tr className="border-b border-white/10 text-[10px] uppercase tracking-[0.2em] text-white/40">
            <th className="py-2 pr-3">When</th><th className="py-2 pr-3">Actor</th>
            <th className="py-2 pr-3">Action</th><th className="py-2 pr-3">Entity</th><th className="py-2">Detail</th>
          </tr>
        </thead>
        <tbody>
          {state.audit.map((a) => (
            <tr key={a.id} className="border-b border-white/5 align-top">
              <td className="whitespace-nowrap py-1.5 pr-3 font-mono">{new Date(a.ts).toLocaleString("en-US")}</td>
              <td className="py-1.5 pr-3">{a.actor}</td>
              <td className="py-1.5 pr-3 font-bold text-white/90">{a.action}</td>
              <td className="py-1.5 pr-3">{a.entity} {a.entityId}</td>
              <td className="max-w-[320px] break-all py-1.5 font-mono text-white/40">{a.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
