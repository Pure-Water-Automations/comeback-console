// Ceremony merge: a finalized engine run overrides its legacy-computed
// counterpart by id; engine-only awards append; awards whose FINAL run says
// "no winners" are dropped (the admin's decision beats the live computation).
// Finalizing one award must never shrink the whole ceremony to a single slide.

import type { Award } from "@/lib/weeklyAwards";

export function mergeAwards(legacy: Award[], engine: Award[] | null): Award[] {
  if (!engine) return legacy;
  const engineById = new Map(engine.map((a) => [a.id, a]));
  const legacyIds = new Set(legacy.map((a) => a.id));
  return [
    ...legacy.map((a) => engineById.get(a.id) ?? a),
    ...engine.filter((a) => !legacyIds.has(a.id)),
  ].filter((a) => a.winners.length > 0);
}
