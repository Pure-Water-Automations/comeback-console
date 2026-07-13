// Live FAQ for the Rulebook page + wizard — parsed from the FAQ sheet, with
// the static defaults as fallback (source-badged), mirroring scoreboardApi.

import { createServerFn } from "@tanstack/react-start";
import type { LiveFaqResult } from "@/lib/server/liveFaq";

export const getFaqLive = createServerFn({ method: "GET" }).handler(
  async (): Promise<LiveFaqResult> => {
    const { loadLiveFaq } = await import("@/lib/server/liveFaq");
    return await loadLiveFaq();
  },
);
