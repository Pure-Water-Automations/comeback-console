# Plan — Micro-XP "Using & Learning" Layer

**Goal:** Reward exploration, practice, and learning with small dopamine-hit XP so the NJ
console feels addictive from the first session. Today XP only fires on productive write-actions;
just *using features*, *practicing in the Memory Trainer*, and *learning the system* earn nothing.

**Design rules**
- **Fire-once events** (discovery/learning): pay out exactly once, ever. New `seen: string[]` set
  in `ProgressState`, guarded by a new `awardOnce(event, key)` helper.
- **Repeatable practice events** (Memory Trainer): use existing `award()` — skill-based and
  self-limiting, so slot-machine feedback is desirable here.
- Keep values tiny (1–5) so they never rival real-work XP (10–50). Net discovery budget ≈ 60–80 XP,
  enough to clear rank 1→2 by exploring.
- All state is client-side localStorage (existing pattern). Migration is automatic via `{...EMPTY, ...parsed}`.

---

## Step 1 — Engine: new events + fire-once primitive
File: `src/lib/progression.ts`

1. Extend `XpEvent` union with micro keys:
   - Practice (repeatable): `memory_round_started`, `memory_correct`, `memory_streak_3`,
     `memory_round_cleared`, `memory_perfect_round`, `memory_daily_practice`
   - Discovery (fire-once): `feature_first_use`, `modal_opened`, `cli_command`, `wizard_asked`,
     `synth_played`, `tour_step`, `tour_completed`, `rules_read`, `help_opened`
2. Add to `XP_VALUES`:
   ```
   memory_round_started: 2, memory_correct: 3, memory_streak_3: 10,
   memory_round_cleared: 15, memory_perfect_round: 25, memory_daily_practice: 10,
   feature_first_use: 3, modal_opened: 1, cli_command: 2, wizard_asked: 2,
   synth_played: 1, tour_step: 2, tour_completed: 20, rules_read: 5, help_opened: 1,
   ```
3. Add `seen: string[]` to `ProgressState` and `EMPTY` (`seen: []`). Thread `seen: [...prev.seen]`
   through the spread in `award()`, `recordDailyVisit()`, `recordTabVisit()`, `unlockEgg()`
   (so they don't drop the field). Because of `{...EMPTY, ...parsed}` in `load()`, existing saved
   states get `seen: []` for free.
4. Add helper:
   ```ts
   /** Fire-once XP: keyed dedupe via state.seen. No-op (returns null) if key already seen. */
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
   ```
   `key` is per-instance (e.g. `"feature:quest_post"`, `"modal:finance:Mar"`) so distinct features
   each pay once but the same feature never re-pays.

## Step 2 — Engine: payoff achievements
File: `src/lib/progression.ts` → `ACHIEVEMENTS[]` (pastor family)

Give the micro-XP a trophy ceiling so it ladders into the existing TrophyRoom:
- `explorer` (common, `npc`) — "Curious Hands": used 5 distinct features
  → `check: (s) => count(s, "feature_first_use") >= 5`
- `scholar` (rare, `wizard`) — "Read the Sacred Scrolls": finished the tour AND read the rules
  → `check: (s) => count(s, "tour_completed") >= 1 && count(s, "rules_read") >= 1`
- `memory-adept` (rare, `mentor`) — "Knows Them by Heart": 50 correct Memory Trainer answers
  → `check: (s) => count(s, "memory_correct") >= 50`
- `memory-perfect` (epic, `spirit`, secret) — "Flawless Recall": a perfect round
  → `check: (s) => count(s, "memory_perfect_round") >= 1`

## Step 3 — Wire the Memory Trainer (the headline feature)
File: `src/components/game/nj/MemoryTraining.tsx` (already imports `award` + `celebrate`)

Find the round/answer handlers and emit:
- On round start → `celebrate(award("memory_round_started"))`; first round of the day also
  `celebrate(awardOnce("memory_daily_practice", "memory:daily:" + todayISO))`.
- On a correct answer → `celebrate(award("memory_correct"))`; track an in-component
  `streak` counter and every 3rd → `celebrate(award("memory_streak_3"))`.
- On round finish → `celebrate(award("memory_round_cleared"))`; if `misses === 0` also
  `celebrate(award("memory_perfect_round"))`.
- Reset the streak counter on a wrong answer.

> Verify the actual round/answer state machine in this file before wiring — emit at the existing
> "correct"/"complete" branches, don't invent new ones.

## Step 4 — Wire discovery (fire-once) across surfaces

| Surface | File | Trigger | Call |
|---|---|---|---|
| Any tool's first real use | each panel's primary action handler | first successful post/run | `awardOnce("feature_first_use", "feature:<id>")` alongside the existing `award(...)` |
| Detail/drill-down cards | OverviewPanel / finance / people / blessing | modal open | `awardOnce("modal_opened", "modal:<name>")` |
| Hidden CLI | `CosmicRules.tsx` (command handler ~L860) | any command run | `awardOnce("cli_command", "cli")` |
| Hidden synth | `CosmicRules.tsx` (0–9 keys) | first note | `awardOnce("synth_played", "synth")` |
| Rules read to end | `CosmicRules.tsx` (`progress >= 0.99`, ~L1005) | reach bottom | `awardOnce("rules_read", "rules")` |
| Help Wizard | `wizardResponder` call site | first question | `awardOnce("wizard_asked", "wizard")` |
| HelpFairy tour | `HelpFairy.tsx` step advance (~L367) | each step | `awardOnce("tour_step", "tour:" + step.id)` |
| HelpFairy tour done | `HelpFairy.tsx` final step | completion | `awardOnce("tour_completed", "tour:done")` |
| HelpFairy opened | `HelpFairy.tsx` open handler | open | `awardOnce("help_opened", "help")` |

`feature_first_use` ids to assign: `quest_post`, `quest_complete`, `guest_add`, `roll_call`,
`event_create`, `smart_roster`, `outreach`, `data_fix`, `photo_roll`, `memory_trainer`.

> These `awardOnce` calls are **additive** — they sit next to the existing `award()` calls, never
> replace them. `celebrate(...)` already no-ops on `null`, so re-triggers are silent.

## Step 5 — Verify
- `npm run build` clean (TS union exhaustiveness will flag any missing `XP_VALUES` entry — good).
- Manual via preview: fresh localStorage (clear `nj-console-progress-v1`), then:
  - Open console → poke each tab, open a modal, run a CLI command, scroll rules, do a tour →
    confirm small XP bursts fire **once** and not again on repeat.
  - Run a Memory Trainer round → confirm per-correct + streak + clear bursts fire **every** round.
  - Confirm `explorer` / `scholar` / `memory-adept` trophies unlock in TrophyRoom.
- Confirm a returning user (existing localStorage) loads without error and `seen` is `[]`.

## Out of scope (future)
- Server-side persistence (still localStorage-only, per app constraints).
- Anti-farm rate limiting on repeatable Memory events (skill-gated, low risk).
- Screenshot / print-screen detection easter egg (separate idea).
