// Fire-and-forget trophy reporting to the server (trophy_events table).
// The server upsert is idempotent, so over-reporting is harmless and the
// client NEVER blocks or errors on this path.

import { reportTrophies } from "@/lib/awardsApi";

// The NJ pastor console is the only local console in the POC.
const COMMUNITY_ID = "new-jersey";

export function syncTrophies(achievementIds: string[]): void {
  if (typeof window === "undefined" || achievementIds.length === 0) return;
  void reportTrophies({ data: { communityId: COMMUNITY_ID, achievementIds } }).catch(() => undefined);
}
