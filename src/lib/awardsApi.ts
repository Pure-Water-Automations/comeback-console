// Public (unauthenticated) Awards Console server fns. Client-safe module —
// the handler body (and its dynamic server imports) is stripped from the
// client bundle by TanStack Start's server-fn compilation.

import { createServerFn } from "@tanstack/react-start";
import { COMMUNITIES } from "@/lib/comebackData";

const VALID_COMMUNITY_IDS = new Set(COMMUNITIES.map((c) => c.id));

/** Fire-and-forget trophy sync from the console client. Idempotent. */
export const reportTrophies = createServerFn({ method: "POST" })
  .inputValidator((data: { communityId: string; achievementIds: string[] }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean; recorded: number }> => {
    try {
      if (!VALID_COMMUNITY_IDS.has(data.communityId)) return { ok: false, recorded: 0 };
      const ids = (data.achievementIds ?? []).filter((s) => typeof s === "string").slice(0, 200);
      if (!ids.length) return { ok: true, recorded: 0 };
      const [{ getDb }, { makeAwardsRepo }] = await Promise.all([
        import("@/lib/server/db"),
        import("@/lib/server/awardsRepo"),
      ]);
      const recorded = makeAwardsRepo(getDb()).recordTrophies(data.communityId, ids, "console");
      return { ok: true, recorded };
    } catch {
      return { ok: false, recorded: 0 };
    }
  });
