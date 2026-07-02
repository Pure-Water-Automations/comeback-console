// Maps finalized engine runs to the legacy Award[] shape the ceremony renders.
// Server-only (touches SQLite) — import ONLY inside server fn handlers.

import type { Award } from "@/lib/weeklyAwards";

/**
 * Awards from finalized engine runs (active defs only, presentation order).
 * Returns null when the engine has nothing to show (no runs yet / DB error),
 * so callers fall back to the legacy snapshot-derived awards.
 */
export async function engineAwards(): Promise<Award[] | null> {
  try {
    const [{ getDb }, { makeAwardsRepo }, { SEED_AWARD_DEFS }] = await Promise.all([
      import("@/lib/server/db"),
      import("@/lib/server/awardsRepo"),
      import("@/lib/awards-engine/seeds"),
    ]);
    const repo = makeAwardsRepo(getDb());
    repo.seedIfEmpty(SEED_AWARD_DEFS);
    const defs = repo.listDefs().filter((d) => d.status === "active");
    const latest = repo.latestFinalRuns();
    const awards: Award[] = defs.flatMap((def) => {
      const run = latest[def.id];
      if (!run || run.results.winners.length === 0) return [];
      return [{
        id: def.id,
        title: def.name,
        subtitle: def.subtitle,
        emoji: def.emoji,
        tone: def.tone,
        blurb: def.blurb || undefined,
        winners: run.results.winners.map((w) => ({
          community: w.community,
          communityId: w.communityId,
          mascot: w.mascot,
          stat: w.stat,
          detail: w.detail,
        })),
      }];
    });
    return awards.length ? awards : null;
  } catch {
    return null;
  }
}
