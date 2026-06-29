# Operation COMEBACK Console — Remove the migrated action features

> **For the AI session working in this repo (`comeback-console`).** This is a
> self-contained removal brief — you don't need any other context. Read it fully,
> then execute the removal, keeping the dashboards/scoreboard/gamification intact.

## 0. Why this is happening

The **pastor ACTIONS** that used to live in this gamified console — attendance
taking, photo check-in, guest capture, the LES/quests tracker, the outreach radar,
and the data-cleanup queue — have been **rebuilt in Ministry OS**
(`event-planner-webapp`, the per-organization system of record). Going forward:

- **Ministry OS owns the actions** (recording who attended, capturing guests,
  moving people through the Blessing journey, LES goals, outreach follow-up,
  merging duplicate contacts). It is multi-tenant; Operation COMEBACK is one
  campaign over many orgs, so the per-org actions belong there.
- **This console becomes the campaign cockpit only** — the regional scoreboard,
  T2 league standings, the gamification (XP / ranks / trophies / achievements /
  easter eggs), the awards ceremony, and the campaign-framed **dashboards**.
- **Future direction (do NOT build now):** this console will eventually *read*
  aggregated metrics from Ministry OS via a read API, replacing the local
  snapshots + live Google-Sheet reads. For now, the dashboards keep their existing
  data sources untouched.

So: **remove the action/write surfaces; keep the dashboard + campaign + game layer.**
When in doubt — if a feature *records or mutates ministry data* (writes a sheet,
appends to the Action Queue, pushes a contact), it's migrated → remove it. If it
*displays, scores, or gamifies*, keep it.

## 1. The NJ console tabs (`src/components/game/nj/NJConsole.tsx`, the tab array ~lines 75-82)

| Tab | Decision |
|---|---|
| `overview` (OverviewPanel) | **KEEP** — read-only campaign snapshot |
| `finance` (FinancePanel) | **KEEP** — dashboard |
| `attendance` (AttendancePanel) | **STRIP TO DISPLAY** — remove the action sub-tabs (Roll Call, Events, Photo Check-In, guest capture); keep **Trends** (read-only charts) and **Train** (the MemoryTraining mini-game). If a display-only Attendance tab feels thin, fold Trends into `overview` and move **Train** under `trophies`/its own tab — your call. |
| `people` (PeoplePanel) | **KEEP the demographics/funnel display; REMOVE the guest-capture action** + the Ministry OS push |
| `blessing` (BlessingPanel) | **KEEP** — it's a read-only campaign dashboard (snapshot). The editable Blessing *journey* now lives in Ministry OS; this panel stays as a summary. |
| `quests` (QuestsPanel) | **REMOVE the tab** — LES/quests now live in Ministry OS |
| `outreach` (OutreachPanel + DataPatrolSection) | **REMOVE the tab** — outreach radar + data cleanup now live in Ministry OS |
| `trophies` (TrophyRoom) | **KEEP** — gamification |

Update the tab array to drop `quests` and `outreach` (and slim `attendance` per
above). Remove their imports/branches in `NJConsole.tsx`.

## 2. Files to DELETE

These are pure action surfaces / their migrated logic:

- `src/components/game/nj/RollCallSection.tsx` — Sunday roll-call (→ MOS attendance)
- `src/components/game/nj/EventLogSection.tsx` — event check-in + smart roster (→ MOS)
- `src/components/game/nj/PhotoRollCall.tsx` — photo check-in (→ MOS photo mode)
- `src/components/game/nj/QuestsPanel.tsx` — LES/quests (→ MOS `/les`)
- `src/components/game/nj/OutreachPanel.tsx` — outreach radar (→ MOS `/outreach-radar`)
- `src/components/game/nj/DataPatrolSection.tsx` — data cleanup (→ MOS contact merge)
- `src/lib/njInsights.ts` — `fetchOutreachRadar` / `fetchSmartRoster` / `fetchDataCleanup` (all migrated)
- `src/lib/faceApi.ts` + `src/lib/faceApi.test.ts` — face recognition (→ MOS, on-device)
- `src/lib/faceCluster.ts` + `src/lib/faceCluster.test.ts` — face matching (→ MOS)
- `src/lib/partyData.ts` + `src/components/game/nj/party/` — the batch "party" selection used only by check-in
- `src/lib/server/ministryOS.ts` — the one-way guest push bridge (guest capture now happens *in* Ministry OS, so this is obsolete)

## 3. Files to EDIT (remove the action bits, keep the rest)

- **`src/lib/njActions.ts`** — remove every WRITE/queue function:
  `checkInSunday`, `addSundayColumn`, `checkInEvent`, `addEvent`, `postQuest`,
  `completeQuest`, `addGuest`, `queueOutreach`, `queueDataFix`, and the read
  helpers used only by the removed UIs (`listSundays`, `searchRoster`,
  `listEvents`, `searchEventRoster`, `fetchLiveQuests`). If nothing meaningful
  remains, delete the file. **Do not** keep any path that writes a Google Sheet or
  appends to the Action Queue sheet.
- **`src/lib/server/sheets.ts`** — remove the write helpers (direct attendance
  writes + Action Queue appends). Keep a read helper *only* if a retained
  dashboard still reads a live sheet; otherwise delete the file. (Most dashboards
  read the local snapshots in `njData.ts` / `comebackData.ts`, not live sheets —
  verify before keeping anything.)
- **`src/components/game/nj/AttendancePanel.tsx`** — remove the Roll Call / Events
  / Photo Check-In sub-tabs and the guest-capture entry points; keep **Trends**
  (display) and **Train** (MemoryTraining).
- **`src/components/game/nj/PeoplePanel.tsx`** — remove the guest-capture form/action
  and any Ministry OS push; keep the activity/demographics/funnel display.
- **`src/components/game/nj/NJConsole.tsx`** — drop the `quests` + `outreach` tab
  entries, their imports, and their render branches; slim `attendance`/`people`
  imports to what remains.
- **The Action Queue sheet dependency** — once the write functions are gone, the
  console no longer touches the Action Queue sheet (`13cvqK1hM2-…`) or the live
  attendance/LES sheets. Remove related sheet IDs/config that are now unused.

## 4. Files to KEEP (do not touch)

- Routes: `src/routes/scoreboard.tsx`, `awards.tsx`, `dashboard.tsx`, `index.tsx`,
  `__root.tsx`, and `nj.tsx` (only its console tabs change, via `NJConsole.tsx`).
- Logic: `src/lib/comebackData.ts`, `regionalScoreboard.ts`, `weeklyAwards.ts`,
  `progression.ts` (XP/ranks/achievements), `njData.ts` (the dashboard snapshot),
  `leaders.ts`.
- Panels/components: `OverviewPanel.tsx`, `FinancePanel.tsx`, `BlessingPanel.tsx`,
  `TrophyRoom.tsx`, `ProgressHud.tsx`, `HelpFairy.tsx`, `MemoryTraining.tsx`.
- All gamification (XP events, ranks, trophies, achievements, easter eggs, the
  memory mini-game) and the regional scoreboard / awards ceremony.

## 5. Gotchas

- **Gamification XP events tied to removed actions:** `progression.ts` defines XP
  events like `checkin`, `event_checkin`, `quest_posted`, `quest_completed`,
  `guest_added`, `outreach_sent`, `data_fix`, `smart_roster_used`,
  `photo_uploaded`, `face_tagged`. Once the actions that `award(...)` them are
  gone, those events become unreachable. **Leave the event definitions in place**
  (harmless, and avoids churning the achievements/rank math) — just don't delete
  the enum; only the *callers* go away. Don't spend effort pruning them.
- **MemoryTraining ("Train")** is a mini-game (gamification), NOT a migrated
  action — keep it. It currently lives inside the Attendance panel; if you remove
  the Attendance tab entirely, relocate Train rather than deleting it.
- **Don't break the dashboards.** OverviewPanel / FinancePanel / BlessingPanel /
  PeoplePanel read the local snapshots (`njData.ts`, `comebackData.ts`) — those
  stay. Only the *action* pathways are being cut.
- **Don't add a Read API yet.** The future "read live from Ministry OS" direction
  is out of scope for this removal pass.

## 6. Verify before you finish

- Build the app (`npm run build`) and run it (`npm run dev -- --port 5175`) — it
  must compile with **no dangling imports** from the deleted files.
- Click through every remaining tab: `overview`, `finance`, `attendance` (display
  only), `people` (display only), `blessing`, `trophies` — plus the
  `scoreboard`, `awards`, and `dashboard` routes. All must render.
- Confirm the console no longer performs ANY write: grep the codebase for the
  removed function names and for any remaining `sheets`/Action-Queue write calls —
  there should be none.
- Confirm the gamification still works (XP/trophies render; the memory mini-game
  plays).

## 7. One-line summary for the commit / PR

> Remove the migrated action surfaces (attendance taking, photo check-in, guest
> capture, LES/quests, outreach radar, data cleanup) now owned by Ministry OS;
> keep the campaign dashboards, regional scoreboard, awards, and gamification.
