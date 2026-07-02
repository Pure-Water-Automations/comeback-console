// NJ console progression engine — XP, ranks, achievements, easter eggs.
// Client-side only: state persists in localStorage so the pastor's progress
// survives reloads but never leaves the browser. Two achievement families:
//  - "pastor feats"   — earned by USING the console (check-ins, quests, eggs)
//  - "community feats"— derived from the community's real data snapshot
// Award flow: call award(event[, amount]) after a successful action; it
// returns what to celebrate (xp gained, level-ups, fresh unlocks).

import { useSyncExternalStore } from "react";
import { syncTrophies } from "@/lib/trophySync";
import {
  ATTENDANCE_2026,
  BLESSING_2026,
  GUEST_FUNNEL,
  MEMBERSHIP,
  NJ_PROFILE,
  WEEKLY_SUNDAY_2026,
  ytdFinance,
} from "@/lib/njData";

// ---------------------------------------------------------------------------
// XP events
// ---------------------------------------------------------------------------

export type XpEvent =
  | "checkin" // per person checked in (Sunday)
  | "event_checkin" // per person marked at an event
  | "quest_posted"
  | "quest_completed"
  | "guest_added"
  | "sunday_added"
  | "event_created"
  | "tab_visited" // first visit to a tab per session
  | "daily_visit" // first console open of the day
  | "easter_egg"
  | "photo_uploaded" // photo roll: picture added
  | "face_tagged" // photo roll: per face tagged + confirmed
  | "outreach_sent" // one-click outreach queued
  | "smart_roster_used" // recurring-event roster generated
  | "data_fix" // identity/data cleanup queued
  // --- micro: practice (repeatable, skill-gated) ---
  | "memory_round_started"
  | "memory_correct"
  | "memory_streak_3"
  | "memory_round_cleared"
  | "memory_perfect_round"
  | "memory_daily_practice"
  // --- micro: discovery/learning (fire-once via awardOnce) ---
  | "feature_first_use"
  | "modal_opened"
  | "cli_command"
  | "wizard_asked"
  | "synth_played"
  | "tour_step"
  | "tour_completed"
  | "rules_read"
  | "help_opened";

export const XP_VALUES: Record<XpEvent, number> = {
  checkin: 10,
  event_checkin: 8,
  quest_posted: 30,
  quest_completed: 50,
  guest_added: 25,
  sunday_added: 15,
  event_created: 20,
  tab_visited: 5,
  daily_visit: 20,
  easter_egg: 40,
  photo_uploaded: 15,
  face_tagged: 12,
  outreach_sent: 30,
  smart_roster_used: 15,
  data_fix: 20,
  // micro: practice
  memory_round_started: 2,
  memory_correct: 3,
  memory_streak_3: 10,
  memory_round_cleared: 15,
  memory_perfect_round: 25,
  memory_daily_practice: 10,
  // micro: discovery/learning
  feature_first_use: 3,
  modal_opened: 1,
  cli_command: 2,
  wizard_asked: 2,
  synth_played: 1,
  tour_step: 2,
  tour_completed: 20,
  rules_read: 5,
  help_opened: 1,
};

// ---------------------------------------------------------------------------
// Ranks — total XP thresholds. Names stay in the campaign's voice.
// ---------------------------------------------------------------------------

export interface Rank {
  level: number;
  xp: number;
  title: string;
}

export const RANKS: Rank[] = [
  { level: 1, xp: 0, title: "Field Novice" },
  { level: 2, xp: 50, title: "Roll Caller" },
  { level: 3, xp: 150, title: "Record Keeper" },
  { level: 4, xp: 300, title: "Flock Tender" },
  { level: 5, xp: 500, title: "Gate Greeter" },
  { level: 6, xp: 800, title: "Quest Captain" },
  { level: 7, xp: 1200, title: "Data Shepherd" },
  { level: 8, xp: 1800, title: "Momentum Maker" },
  { level: 9, xp: 2600, title: "Comeback Commander" },
  { level: 10, xp: 3600, title: "Legend of the League" },
];

export function rankForXp(xp: number) {
  let rank = RANKS[0];
  for (const r of RANKS) if (xp >= r.xp) rank = r;
  const next = RANKS.find((r) => r.level === rank.level + 1) || null;
  const progress = next ? (xp - rank.xp) / (next.xp - rank.xp) : 1;
  return { ...rank, next, progress: Math.min(1, Math.max(0, progress)) };
}

// ---------------------------------------------------------------------------
// Persistent state
// ---------------------------------------------------------------------------

export interface ProgressState {
  xp: number;
  counts: Partial<Record<XpEvent, number>>;
  /** achievement id → unlock ISO date */
  unlocked: Record<string, string>;
  lastVisitDay: string; // YYYY-MM-DD
  visitStreak: number;
  tabsVisited: string[];
  /** keys of fire-once discovery/learning rewards already paid out */
  seen: string[];
}

const STORAGE_KEY = "nj-console-progress-v1";

const EMPTY: ProgressState = {
  xp: 0,
  counts: {},
  unlocked: {},
  lastVisitDay: "",
  visitStreak: 0,
  tabsVisited: [],
  seen: [],
};

let state: ProgressState = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load(): ProgressState {
  if (loaded) return state;
  loaded = true;
  if (typeof window === "undefined") return state;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) state = { ...EMPTY, ...(JSON.parse(raw) as ProgressState) };
  } catch {
    /* fresh start */
  }
  return state;
}

function save(next: ProgressState) {
  state = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* private mode etc. */
    }
  }
  listeners.forEach((fn) => fn());
}

export function useProgression(): ProgressState {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => load(),
    () => EMPTY,
  );
}

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

export type Rarity = "common" | "rare" | "epic" | "legendary";

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  family: "pastor" | "community";
  rarity: Rarity;
  /** Secret achievements show as "???" until unlocked */
  secret?: boolean;
  /** Sprite family hint for the gallery card */
  sprite: "adventurer" | "mentor" | "npc" | "smart_guy" | "spirit" | "wizard";
  check: (s: ProgressState) => boolean;
}

const count = (s: ProgressState, e: XpEvent) => s.counts[e] || 0;

export const ACHIEVEMENTS: AchievementDef[] = [
  // --- pastor feats (usage) ---
  { id: "first-checkin", name: "First Sheep Counted", description: "Check in your first person.", family: "pastor", rarity: "common", sprite: "adventurer", check: (s) => count(s, "checkin") + count(s, "event_checkin") >= 1 },
  { id: "shepherd-25", name: "Shepherd of 25", description: "Check in 25 people total.", family: "pastor", rarity: "common", sprite: "adventurer", check: (s) => count(s, "checkin") + count(s, "event_checkin") >= 25 },
  { id: "shepherd-100", name: "Centurion Shepherd", description: "Check in 100 people total.", family: "pastor", rarity: "rare", sprite: "adventurer", check: (s) => count(s, "checkin") + count(s, "event_checkin") >= 100 },
  { id: "shepherd-500", name: "Keeper of the Five Hundred", description: "Check in 500 people total.", family: "pastor", rarity: "legendary", sprite: "mentor", check: (s) => count(s, "checkin") + count(s, "event_checkin") >= 500 },
  { id: "first-quest", name: "Quest Giver", description: "Post your first LES quest.", family: "pastor", rarity: "common", sprite: "wizard", check: (s) => count(s, "quest_posted") >= 1 },
  { id: "quest-finisher", name: "Finisher", description: "Mark a quest complete.", family: "pastor", rarity: "common", sprite: "wizard", check: (s) => count(s, "quest_completed") >= 1 },
  { id: "quest-machine", name: "Field Order Machine", description: "Post 10 quests.", family: "pastor", rarity: "epic", sprite: "wizard", check: (s) => count(s, "quest_posted") >= 10 },
  { id: "greeter", name: "Gate Greeter", description: "Capture your first guest.", family: "pastor", rarity: "common", sprite: "npc", check: (s) => count(s, "guest_added") >= 1 },
  { id: "greeter-10", name: "Open Door Policy", description: "Capture 10 guests.", family: "pastor", rarity: "rare", sprite: "npc", check: (s) => count(s, "guest_added") >= 10 },
  { id: "event-host", name: "Event Host", description: "Create an event from the console.", family: "pastor", rarity: "common", sprite: "smart_guy", check: (s) => count(s, "event_created") >= 1 },
  { id: "tourist", name: "Command Tour", description: "Visit all six console tabs.", family: "pastor", rarity: "common", sprite: "npc", check: (s) => s.tabsVisited.length >= 6 },
  { id: "streak-3", name: "Three-Day Habit", description: "Open the console three days in a row.", family: "pastor", rarity: "rare", sprite: "spirit", check: (s) => s.visitStreak >= 3 },
  { id: "streak-7", name: "Sevenfold Faithful", description: "Open the console seven days in a row.", family: "pastor", rarity: "epic", sprite: "spirit", check: (s) => s.visitStreak >= 7 },
  { id: "photo-pioneer", name: "Say Cheese", description: "Run your first photo roll call.", family: "pastor", rarity: "common", sprite: "smart_guy", check: (s) => count(s, "photo_uploaded") >= 1 },
  { id: "face-namer", name: "Knows the Flock by Face", description: "Tag and confirm 25 faces.", family: "pastor", rarity: "epic", sprite: "mentor", check: (s) => count(s, "face_tagged") >= 25 },
  { id: "fisher", name: "Fisher of People", description: "Send your first one-click outreach.", family: "pastor", rarity: "common", sprite: "npc", check: (s) => count(s, "outreach_sent") >= 1 },
  { id: "fisher-10", name: "Net Full to Breaking", description: "Send 10 outreach invitations.", family: "pastor", rarity: "epic", sprite: "spirit", check: (s) => count(s, "outreach_sent") >= 10 },
  { id: "list-whisperer", name: "List Whisperer", description: "Build a smart roster for a recurring event.", family: "pastor", rarity: "rare", sprite: "wizard", check: (s) => count(s, "smart_roster_used") >= 1 },
  { id: "record-straightener", name: "Record Straightener", description: "Queue your first data fix.", family: "pastor", rarity: "common", sprite: "smart_guy", check: (s) => count(s, "data_fix") >= 1 },
  { id: "census-keeper", name: "Keeper of the Census", description: "Queue 10 data fixes — the Book is accurate because of you.", family: "pastor", rarity: "epic", sprite: "mentor", check: (s) => count(s, "data_fix") >= 10 },
  // --- learning & practice (micro-XP payoffs) ---
  { id: "explorer", name: "Curious Hands", description: "Try five different tools in the console.", family: "pastor", rarity: "common", sprite: "npc", check: (s) => count(s, "feature_first_use") >= 5 },
  { id: "scholar", name: "Read the Sacred Scrolls", description: "Finish the guided tour and read the rules.", family: "pastor", rarity: "rare", sprite: "wizard", check: (s) => count(s, "tour_completed") >= 1 && count(s, "rules_read") >= 1 },
  { id: "memory-adept", name: "Knows Them by Heart", description: "Name 50 faces in the Memory Trainer.", family: "pastor", rarity: "rare", sprite: "mentor", check: (s) => count(s, "memory_correct") >= 50 },
  { id: "memory-perfect", name: "Flawless Recall", description: "Clear a Memory Trainer round with no misses.", family: "pastor", rarity: "epic", secret: true, sprite: "spirit", check: (s) => count(s, "memory_perfect_round") >= 1 },
  // --- easter eggs (secret pastor feats; unlocked via unlockEgg) ---
  { id: "egg-konami", name: "The Old Code", description: "↑↑↓↓←→←→BA — some scrolls never expire.", family: "pastor", rarity: "legendary", secret: true, sprite: "wizard", check: (s) => !!s.unlocked["egg-konami"] },
  { id: "egg-mascot", name: "Poke the Adventurer", description: "Click the mascot seven times. They noticed.", family: "pastor", rarity: "rare", secret: true, sprite: "adventurer", check: (s) => !!s.unlocked["egg-mascot"] },
  { id: "egg-night-owl", name: "Night Watch", description: "Tend the flock after midnight.", family: "pastor", rarity: "rare", secret: true, sprite: "spirit", check: (s) => !!s.unlocked["egg-night-owl"] },
  { id: "egg-early-bird", name: "Dawn Patrol", description: "On duty before 6 AM.", family: "pastor", rarity: "rare", secret: true, sprite: "mentor", check: (s) => !!s.unlocked["egg-early-bird"] },
  // --- community feats (from the real data snapshot) ---
  { id: "com-over-capacity", name: "Full House", description: `A Sunday above building capacity (${NJ_PROFILE.capacity}).`, family: "community", rarity: "epic", sprite: "mentor", check: () => WEEKLY_SUNDAY_2026.some((w) => w.count > NJ_PROFILE.capacity) },
  { id: "com-300-club", name: "The 300 Club", description: "A Sunday with 300+ in worship.", family: "community", rarity: "rare", sprite: "adventurer", check: () => WEEKLY_SUNDAY_2026.some((w) => w.count >= 300) },
  { id: "com-goal-crusher", name: "Goal Crusher", description: "Blessing pipeline above 150% of annual goal.", family: "community", rarity: "epic", sprite: "spirit", check: () => BLESSING_2026.some((m) => m.pctAnnualGoal >= 150) },
  { id: "com-treasury", name: "Surplus Steward", description: "Positive net income for the year so far.", family: "community", rarity: "rare", sprite: "smart_guy", check: () => ytdFinance().net > 0 },
  { id: "com-harvest", name: "Thousand-Guest Harvest", description: "Over 1,000 guests have walked through the doors.", family: "community", rarity: "epic", sprite: "npc", check: () => GUEST_FUNNEL[0].count >= 1000 },
  { id: "com-core-90", name: "Core Strength", description: "90+ core members carrying the community.", family: "community", rarity: "rare", sprite: "mentor", check: () => MEMBERSHIP.activityLevels.core >= 90 },
  { id: "com-online-army", name: "Two-Front Worship", description: "Online attendance above 80 in a month.", family: "community", rarity: "common", sprite: "smart_guy", check: () => ATTENDANCE_2026.some((m) => m.sundayOnline >= 80) },
];

// ---------------------------------------------------------------------------
// Award API
// ---------------------------------------------------------------------------

export interface AwardOutcome {
  xpGained: number;
  xp: number;
  leveledUp: boolean;
  rank: ReturnType<typeof rankForXp>;
  newAchievements: AchievementDef[];
}

function evaluate(prev: ProgressState, next: ProgressState): AchievementDef[] {
  const fresh: AchievementDef[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!next.unlocked[a.id] && a.check(next)) {
      next.unlocked[a.id] = new Date().toISOString();
      if (!prev.unlocked[a.id]) fresh.push(a);
    }
  }
  // Single choke point all unlock paths pass through — report new trophies to
  // the server so regional trophy-count awards can see them (fire-and-forget).
  if (fresh.length) syncTrophies(fresh.map((a) => a.id));
  return fresh;
}

/** Record an XP event (amount = multiplier, e.g. people checked in) */
export function award(event: XpEvent, amount = 1): AwardOutcome {
  const prev = load();
  const before = rankForXp(prev.xp);
  const xpGained = XP_VALUES[event] * Math.max(1, amount);
  const next: ProgressState = {
    ...prev,
    xp: prev.xp + xpGained,
    counts: { ...prev.counts, [event]: (prev.counts[event] || 0) + Math.max(1, amount) },
    unlocked: { ...prev.unlocked },
    tabsVisited: [...prev.tabsVisited],
  };
  const newAchievements = evaluate(prev, next);
  const rank = rankForXp(next.xp);
  save(next);
  return { xpGained, xp: next.xp, leveledUp: rank.level > before.level, rank, newAchievements };
}

/**
 * Fire-once XP for discovery/learning. Deduped by `key` via state.seen, so the
 * same surface only ever pays out once. Returns null (silent) if already seen.
 */
export function awardOnce(event: XpEvent, key: string): AwardOutcome | null {
  const prev = load();
  if (prev.seen.includes(key)) return null;
  const before = rankForXp(prev.xp);
  const xpGained = XP_VALUES[event];
  const next: ProgressState = {
    ...prev,
    xp: prev.xp + xpGained,
    counts: { ...prev.counts, [event]: (prev.counts[event] || 0) + 1 },
    unlocked: { ...prev.unlocked },
    tabsVisited: [...prev.tabsVisited],
    seen: [...prev.seen, key],
  };
  const newAchievements = evaluate(prev, next);
  const rank = rankForXp(next.xp);
  save(next);
  return { xpGained, xp: next.xp, leveledUp: rank.level > before.level, rank, newAchievements };
}

/** First visit of the day → streak + daily XP. Call once on console mount. */
export function recordDailyVisit(): AwardOutcome | null {
  const prev = load();
  const today = new Date().toISOString().slice(0, 10);
  if (prev.lastVisitDay === today) {
    // still evaluate (community feats unlock on first ever load)
    const next = { ...prev, unlocked: { ...prev.unlocked } };
    const fresh = evaluate(prev, next);
    if (fresh.length) save(next);
    return fresh.length
      ? { xpGained: 0, xp: next.xp, leveledUp: false, rank: rankForXp(next.xp), newAchievements: fresh }
      : null;
  }
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const streak = prev.lastVisitDay === yesterday ? prev.visitStreak + 1 : 1;
  const before = rankForXp(prev.xp);
  const next: ProgressState = {
    ...prev,
    xp: prev.xp + XP_VALUES.daily_visit,
    counts: { ...prev.counts, daily_visit: (prev.counts.daily_visit || 0) + 1 },
    unlocked: { ...prev.unlocked },
    lastVisitDay: today,
    visitStreak: streak,
    tabsVisited: [...prev.tabsVisited],
  };
  const newAchievements = evaluate(prev, next);
  const rank = rankForXp(next.xp);
  save(next);
  return { xpGained: XP_VALUES.daily_visit, xp: next.xp, leveledUp: rank.level > before.level, rank, newAchievements };
}

/** First visit to a tab (per browser, lifetime) */
export function recordTabVisit(tab: string): AwardOutcome | null {
  const prev = load();
  if (prev.tabsVisited.includes(tab)) return null;
  const out = (() => {
    const before = rankForXp(prev.xp);
    const next: ProgressState = {
      ...prev,
      xp: prev.xp + XP_VALUES.tab_visited,
      counts: { ...prev.counts, tab_visited: (prev.counts.tab_visited || 0) + 1 },
      unlocked: { ...prev.unlocked },
      tabsVisited: [...prev.tabsVisited, tab],
    };
    const newAchievements = evaluate(prev, next);
    const rank = rankForXp(next.xp);
    save(next);
    return { xpGained: XP_VALUES.tab_visited, xp: next.xp, leveledUp: rank.level > before.level, rank, newAchievements };
  })();
  return out;
}

/** Unlock a secret easter-egg achievement by id (no-op if already unlocked) */
export function unlockEgg(id: "egg-konami" | "egg-mascot" | "egg-night-owl" | "egg-early-bird"): AwardOutcome | null {
  const prev = load();
  if (prev.unlocked[id]) return null;
  const before = rankForXp(prev.xp);
  const next: ProgressState = {
    ...prev,
    xp: prev.xp + XP_VALUES.easter_egg,
    counts: { ...prev.counts, easter_egg: (prev.counts.easter_egg || 0) + 1 },
    unlocked: { ...prev.unlocked, [id]: new Date().toISOString() },
    tabsVisited: [...prev.tabsVisited],
  };
  const newAchievements = evaluate(prev, next);
  const def = ACHIEVEMENTS.find((a) => a.id === id);
  if (def && !newAchievements.some((a) => a.id === id)) newAchievements.unshift(def);
  const rank = rankForXp(next.xp);
  save(next);
  return { xpGained: XP_VALUES.easter_egg, xp: next.xp, leveledUp: rank.level > before.level, rank, newAchievements };
}

export const RARITY_ORDER: Rarity[] = ["common", "rare", "epic", "legendary"];

/** All unlocked achievement ids (for mount-time trophy catch-up sync) */
export function unlockedAchievementIds(): string[] {
  return Object.keys(load().unlocked);
}
