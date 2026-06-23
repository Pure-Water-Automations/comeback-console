// NJ console write actions — TanStack server functions that edit the live NJ
// Google Sheets (POC/testing environment; writes are real but low-stakes).
//
// Write-permission map (verified live 2026-06-10): the Sunday Service and
// Event Attendance tracker tabs are UNPROTECTED — per-person check-ins write
// directly. The LES quest tabs and the Guest Tracker are owner-protected, so
// those actions append to the okamotomiak-owned "NJ Console Action Queue
// (POC)" spreadsheet for the office to apply — same review-queue pattern as
// the rest of the ecosystem.
//
// Live sheet shapes:
//  - Sunday Service: row 2 = Sunday dates from col I ("10-5", ...), row 3 =
//    per-date totals, people from row 4 (B=Name, C=Last, D=First, H=Type),
//    TRUE/FALSE per date cell.
//  - Event Attendance: row 2 = event dates from col I, row 3 = event names,
//    row 4 = totals, people from row 5.
//  - LES tracker tabs (read-only to us): months B3:B14; slots C/D/E, F/G/H,
//    I/J/K (title / target / completed).

import { createServerFn } from "@tanstack/react-start";

const ATTENDANCE_SHEET_ID = "1PR9YNHFi7BT_F09UkjSM2slpFN1ZWWQk-Y9FVZLK2bg";
const LES_SHEET_ID = "1x06-r8SSwJnOaW7oHl-5RHyYQLrkBm_Ch1CpwWH85rc";
export const ACTION_QUEUE_SHEET_ID = "13cvqK1hM2-jfb70Lizk8vZ4DLttjxH3_ZwpslvuwYrw";
export const ACTION_QUEUE_URL = `https://docs.google.com/spreadsheets/d/${ACTION_QUEUE_SHEET_ID}/edit`;

const SUNDAY_FIRST_DATE_COL = 9; // column I
const SUNDAY_PEOPLE_START_ROW = 4;
const EVENT_FIRST_DATE_COL = 9;
const EVENT_PEOPLE_START_ROW = 5;

export interface ActionResult {
  ok: boolean;
  message: string;
}

function fail(err: unknown): ActionResult {
  return { ok: false, message: err instanceof Error ? err.message : String(err) };
}

/** 1-based column index → A1 letter (1→A, 27→AA) */
function colLetter(n: number): string {
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function nowStamp(): string {
  return new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
}

// ---------------------------------------------------------------------------
// Roster + Sunday roll call (direct writes — tab is unprotected)
// ---------------------------------------------------------------------------

export interface RosterPerson {
  /** 1-based sheet row in the Sunday Service tab */
  row: number;
  name: string;
  type: string; // "Member" | "Guest" | ...
}

/** Search the live Sunday Service roster by name fragment (max 12 matches) */
export const searchRoster = createServerFn({ method: "POST" })
  .inputValidator((data: { query: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean; people: RosterPerson[]; message?: string }> => {
    try {
      const { getValues } = await import("@/lib/server/sheets");
      const q = data.query.trim().toLowerCase();
      if (q.length < 2) return { ok: true, people: [] };
      const rows = await getValues(ATTENDANCE_SHEET_ID, "Sunday Service!B4:H1650");
      const people: RosterPerson[] = [];
      for (let i = 0; i < rows.length && people.length < 12; i++) {
        const name = (rows[i][0] || "").trim();
        if (name && name.toLowerCase().includes(q)) {
          people.push({ row: SUNDAY_PEOPLE_START_ROW + i, name, type: (rows[i][6] || "").trim() });
        }
      }
      return { ok: true, people };
    } catch (err) {
      return { ok: false, people: [], message: fail(err).message };
    }
  });

export interface SundayColumn {
  /** A1 column letter in the Sunday Service tab */
  col: string;
  date: string; // "6-7"
  total: number;
}

/** The recorded Sunday columns (most recent last) */
export const listSundays = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ ok: boolean; sundays: SundayColumn[]; message?: string }> => {
    try {
      const { getValues } = await import("@/lib/server/sheets");
      const [dates = [], totals = []] = await getValues(ATTENDANCE_SHEET_ID, "Sunday Service!I2:CZ3");
      const sundays: SundayColumn[] = [];
      dates.forEach((d, i) => {
        const date = (d || "").trim();
        if (date) {
          sundays.push({
            col: colLetter(SUNDAY_FIRST_DATE_COL + i),
            date,
            total: Number(totals[i] || 0) || 0,
          });
        }
      });
      return { ok: true, sundays };
    } catch (err) {
      return { ok: false, sundays: [], message: fail(err).message };
    }
  },
);

/** Add a new Sunday date column after the last one (e.g. "6-14") */
export const addSundayColumn = createServerFn({ method: "POST" })
  .inputValidator((data: { date: string }) => data)
  .handler(async ({ data }): Promise<ActionResult & { col?: string }> => {
    try {
      const { getValues, updateValues } = await import("@/lib/server/sheets");
      const [dates = []] = await getValues(ATTENDANCE_SHEET_ID, "Sunday Service!I2:CZ2");
      const date = data.date.trim();
      if (!date) return { ok: false, message: "Date is required (e.g. 6-14)." };
      const existing = dates.findIndex((d) => (d || "").trim() === date);
      if (existing !== -1) {
        return { ok: true, message: "That Sunday already exists.", col: colLetter(SUNDAY_FIRST_DATE_COL + existing) };
      }
      const col = colLetter(SUNDAY_FIRST_DATE_COL + dates.length);
      await updateValues(ATTENDANCE_SHEET_ID, `Sunday Service!${col}2`, [[date]]);
      return { ok: true, message: `Sunday ${date} column created.`, col };
    } catch (err) {
      return fail(err);
    }
  });

/** Check people in for a Sunday — writes TRUE in each person's date cell */
export const checkInSunday = createServerFn({ method: "POST" })
  .inputValidator((data: { col: string; rows: number[] }) => data)
  .handler(async ({ data }): Promise<ActionResult> => {
    try {
      const { batchUpdateValues } = await import("@/lib/server/sheets");
      const rows = data.rows.filter((r) => r >= SUNDAY_PEOPLE_START_ROW);
      if (!rows.length) return { ok: false, message: "Pick at least one person." };
      await batchUpdateValues(
        ATTENDANCE_SHEET_ID,
        rows.map((r) => ({ range: `Sunday Service!${data.col}${r}`, values: [["TRUE"]] })),
      );
      return { ok: true, message: `Checked in ${rows.length} ${rows.length === 1 ? "person" : "people"}.` };
    } catch (err) {
      return fail(err);
    }
  });

// ---------------------------------------------------------------------------
// Event attendance (direct writes — tab is unprotected)
// ---------------------------------------------------------------------------

export interface EventColumn {
  col: string;
  date: string;
  name: string;
  total: number;
}

export const listEvents = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ ok: boolean; events: EventColumn[]; message?: string }> => {
    try {
      const { getValues } = await import("@/lib/server/sheets");
      const [dates = [], names = [], totals = []] = await getValues(
        ATTENDANCE_SHEET_ID,
        "Event Attendance!I2:CZ4",
      );
      const events: EventColumn[] = [];
      dates.forEach((d, i) => {
        const date = (d || "").trim();
        const name = (names[i] || "").trim();
        if (date || name) {
          events.push({
            col: colLetter(EVENT_FIRST_DATE_COL + i),
            date,
            name: name || "(unnamed event)",
            total: Number(totals[i] || 0) || 0,
          });
        }
      });
      return { ok: true, events };
    } catch (err) {
      return { ok: false, events: [], message: fail(err).message };
    }
  },
);

/** Create a new event column (date row 2, name row 3) */
export const addEvent = createServerFn({ method: "POST" })
  .inputValidator((data: { date: string; name: string }) => data)
  .handler(async ({ data }): Promise<ActionResult & { col?: string }> => {
    try {
      const { getValues, updateValues } = await import("@/lib/server/sheets");
      const date = data.date.trim();
      const name = data.name.trim();
      if (!date || !name) return { ok: false, message: "Event date and name are both required." };
      const [dates = [], names = []] = await getValues(ATTENDANCE_SHEET_ID, "Event Attendance!I2:CZ3");
      const width = Math.max(dates.length, names.length);
      const col = colLetter(EVENT_FIRST_DATE_COL + width);
      await updateValues(ATTENDANCE_SHEET_ID, `Event Attendance!${col}2:${col}3`, [[date], [name]]);
      return { ok: true, message: `Event "${name}" (${date}) created.`, col };
    } catch (err) {
      return fail(err);
    }
  });

/** Search the Event Attendance roster (separate row space from Sunday tab) */
export const searchEventRoster = createServerFn({ method: "POST" })
  .inputValidator((data: { query: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean; people: RosterPerson[]; message?: string }> => {
    try {
      const { getValues } = await import("@/lib/server/sheets");
      const q = data.query.trim().toLowerCase();
      if (q.length < 2) return { ok: true, people: [] };
      const rows = await getValues(ATTENDANCE_SHEET_ID, "Event Attendance!B5:H1650");
      const people: RosterPerson[] = [];
      for (let i = 0; i < rows.length && people.length < 12; i++) {
        const name = (rows[i][0] || "").trim();
        if (name && name.toLowerCase().includes(q)) {
          people.push({ row: EVENT_PEOPLE_START_ROW + i, name, type: (rows[i][6] || "").trim() });
        }
      }
      return { ok: true, people };
    } catch (err) {
      return { ok: false, people: [], message: fail(err).message };
    }
  });

/** Mark people as attended for an event column */
export const checkInEvent = createServerFn({ method: "POST" })
  .inputValidator((data: { col: string; rows: number[] }) => data)
  .handler(async ({ data }): Promise<ActionResult> => {
    try {
      const { batchUpdateValues } = await import("@/lib/server/sheets");
      const rows = data.rows.filter((r) => r >= EVENT_PEOPLE_START_ROW);
      if (!rows.length) return { ok: false, message: "Pick at least one person." };
      await batchUpdateValues(
        ATTENDANCE_SHEET_ID,
        rows.map((r) => ({ range: `Event Attendance!${data.col}${r}`, values: [["TRUE"]] })),
      );
      return { ok: true, message: `Marked ${rows.length} ${rows.length === 1 ? "attendee" : "attendees"}.` };
    } catch (err) {
      return fail(err);
    }
  });

// ---------------------------------------------------------------------------
// LES quests — live read works; writes are owner-protected, so quest actions
// land in the Action Queue spreadsheet for the office to apply.
// ---------------------------------------------------------------------------

export type QuestLane = "Leadership" | "Environment" | "Special Projects";
const SLOT_OFFSETS = [1, 4, 7]; // title offsets within a B..K row

export interface LiveQuest {
  lane: QuestLane;
  month: string;
  slot: number;
  title: string;
  targetDate: string;
  completedDate: string;
}

export const fetchLiveQuests = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ ok: boolean; quests: LiveQuest[]; message?: string }> => {
    try {
      const { getValues } = await import("@/lib/server/sheets");
      const quests: LiveQuest[] = [];
      for (const lane of ["Leadership", "Environment", "Special Projects"] as QuestLane[]) {
        const rows = await getValues(LES_SHEET_ID, `${lane}!B3:K14`);
        rows.forEach((row, i) => {
          const month = (row[0] || "").trim() || `${i + 1}/2026`;
          SLOT_OFFSETS.forEach((base, slot) => {
            const title = (row[base] || "").trim();
            if (!title || title === "1" || title.startsWith("#")) return;
            quests.push({
              lane,
              month,
              slot,
              title,
              targetDate: (row[base + 1] || "").trim(),
              completedDate: (row[base + 2] || "").trim(),
            });
          });
        });
      }
      return { ok: true, quests };
    } catch (err) {
      return { ok: false, quests: [], message: fail(err).message };
    }
  },
);

/** Queue a new LES quest for the office to post (LES tabs are HQ-protected) */
export const postQuest = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { lane: QuestLane; month: string; title: string; targetDate: string }) => data,
  )
  .handler(async ({ data }): Promise<ActionResult> => {
    try {
      const { appendValues } = await import("@/lib/server/sheets");
      const title = data.title.trim();
      if (!title) return { ok: false, message: "Quest title is required." };
      await appendValues(ACTION_QUEUE_SHEET_ID, "Quest Requests!A1:G", [
        [nowStamp(), "POST", data.lane, data.month, title, data.targetDate, ""],
      ]);
      return { ok: true, message: "Quest queued — the office applies it to the HQ tracker." };
    } catch (err) {
      return fail(err);
    }
  });

/** Queue a completion mark for an existing quest */
export const completeQuest = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { lane: QuestLane; month: string; title: string; completedDate: string }) => data,
  )
  .handler(async ({ data }): Promise<ActionResult> => {
    try {
      const { appendValues } = await import("@/lib/server/sheets");
      await appendValues(ACTION_QUEUE_SHEET_ID, "Quest Requests!A1:G", [
        [nowStamp(), "COMPLETE", data.lane, data.month, data.title, "", data.completedDate],
      ]);
      return { ok: true, message: "Completion queued — the office marks it on the HQ tracker." };
    } catch (err) {
      return fail(err);
    }
  });

/** Queue a new guest capture (Guest Tracker is HQ-protected) */
export const addGuest = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { firstName: string; lastName?: string; firstSunday: string; notes?: string }) => data,
  )
  .handler(async ({ data }): Promise<ActionResult> => {
    try {
      const { appendValues } = await import("@/lib/server/sheets");
      const first = data.firstName.trim();
      if (!first) return { ok: false, message: "Guest first name is required." };
      await appendValues(ACTION_QUEUE_SHEET_ID, "Guest Requests!A1:E", [
        [nowStamp(), first, (data.lastName || "").trim(), data.firstSunday, (data.notes || "").trim()],
      ]);
      // Best-effort: also push the guest to the Ministry OS CRM so they become a
      // real contact with a follow-up pipeline. No-ops if the integration env
      // (MINISTRY_OS_URL / MINISTRY_OS_KEY) is unset; never blocks the capture.
      const { pushGuestToMinistryOS } = await import("@/lib/server/ministryOS");
      await pushGuestToMinistryOS({
        firstName: first, lastName: data.lastName, firstSunday: data.firstSunday, notes: data.notes,
      });
      return { ok: true, message: `${first} queued for the guest tracker.` };
    } catch (err) {
      return fail(err);
    }
  });
