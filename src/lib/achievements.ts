// Trophy vocabulary — the closed set of achievement ids the awards system will
// accept from a console client's trophy report. Kept as a frozen registry so
// the server endpoint (reportTrophies) can validate incoming ids and bound the
// trophy_events table at communities × achievements. The client that earned
// these (the NJ pilot console) has been removed; a future universal earner can
// report against the same vocabulary.

export const ACHIEVEMENT_IDS = [
  // pastor feats (console usage)
  "first-checkin",
  "shepherd-25",
  "shepherd-100",
  "shepherd-500",
  "first-quest",
  "quest-finisher",
  "quest-machine",
  "greeter",
  "greeter-10",
  "event-host",
  "tourist",
  "streak-3",
  "streak-7",
  "photo-pioneer",
  "face-namer",
  "fisher",
  "fisher-10",
  "list-whisperer",
  "record-straightener",
  "census-keeper",
  // learning & practice
  "explorer",
  "scholar",
  "memory-adept",
  "memory-perfect",
  // easter eggs
  "egg-konami",
  "egg-mascot",
  "egg-night-owl",
  "egg-early-bird",
  // community feats (from the real data snapshot)
  "com-over-capacity",
  "com-300-club",
  "com-goal-crusher",
  "com-treasury",
  "com-harvest",
  "com-core-90",
  "com-online-army",
] as const;

const ACHIEVEMENT_ID_SET = new Set<string>(ACHIEVEMENT_IDS);

/**
 * Server-trustable filter for trophy reporting: only ids from the real
 * achievement registry pass (a closed set, which also bounds the server's
 * trophy_events table at communities × achievements).
 */
export function sanitizeAchievementIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  return [
    ...new Set(ids.filter((x): x is string => typeof x === "string" && ACHIEVEMENT_ID_SET.has(x))),
  ];
}
