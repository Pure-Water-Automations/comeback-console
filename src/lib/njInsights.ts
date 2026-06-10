// NJ console insight + outreach server functions (POC).
//
// fetchOutreachRadar reads the live Attendance Stats tab (per-person status,
// activity level, and last-3-months attendance count) and surfaces the
// "low-hanging fruit" lists the 2026-06-10 Northeast meeting asked for —
// notably "convert active guests into registered members, starting with
// people attended 3+ times" (the campaign's Active threshold is 3+
// attendances in the rolling 91 days).
//
// queueOutreach appends one-click outreach actions (membership invite,
// coffee invite, comeback nudge) to the okamotomiak-owned Action Queue
// spreadsheet — review-only POC: nothing is emailed automatically.
//
// fetchSmartRoster builds recurring-event rosters from Event Attendance
// history: given a keyword ("youth", "bon-odori"), it finds matching event
// columns and ranks everyone who attended them by frequency, so a recurring
// event check-in starts from ~20 likely names instead of 1,100.

import { createServerFn } from "@tanstack/react-start";
import { ACTION_QUEUE_SHEET_ID } from "@/lib/njActions";

const ATTENDANCE_SHEET_ID = "1PR9YNHFi7BT_F09UkjSM2slpFN1ZWWQk-Y9FVZLK2bg";
const EVENT_FIRST_DATE_COL = 9; // column I
const EVENT_PEOPLE_START_ROW = 5;

export interface RadarPerson {
  name: string;
  status: string; // Guest | Member
  activity: string; // Core | Active | Inactive | Archive
  lastThreeMonths: number;
  lastAttended: string;
  lastEvent: string;
}

export interface OutreachRadar {
  ok: boolean;
  message?: string;
  /** Guests with 3+ attendances in 91 days — membership conversion targets */
  conversionGuests: RadarPerson[];
  /** People at exactly 2 attendances — one visit away from Active */
  oneAway: RadarPerson[];
  /** Active members at exactly 3 — one missed month from slipping */
  slipping: RadarPerson[];
  totals: { conversionGuests: number; oneAway: number; slipping: number };
}

function colLetter(n: number): string {
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export const fetchOutreachRadar = createServerFn({ method: "GET" }).handler(
  async (): Promise<OutreachRadar> => {
    const empty = { conversionGuests: [], oneAway: [], slipping: [], totals: { conversionGuests: 0, oneAway: 0, slipping: 0 } };
    try {
      const { getValues } = await import("@/lib/server/sheets");
      // B=Full Name, E=Status, F=Activity, V=Last 3 Months, W=Last Attended, X=Last Event
      const rows = await getValues(ATTENDANCE_SHEET_ID, "Attendance Stats!B3:X1650");
      const people: RadarPerson[] = [];
      for (const r of rows) {
        const name = (r[0] || "").trim();
        if (!name) continue;
        people.push({
          name,
          status: (r[3] || "").trim(),
          activity: (r[4] || "").trim(),
          lastThreeMonths: Number(r[20] || 0) || 0,
          lastAttended: (r[21] || "").trim(),
          lastEvent: (r[22] || "").trim(),
        });
      }
      const byRecent = (a: RadarPerson, b: RadarPerson) => b.lastThreeMonths - a.lastThreeMonths;
      const conversionGuests = people
        .filter((p) => p.status.toLowerCase() === "guest" && p.lastThreeMonths >= 3)
        .sort(byRecent);
      const oneAway = people
        .filter((p) => p.lastThreeMonths === 2 && p.activity.toLowerCase() !== "core")
        .sort((a, b) => a.name.localeCompare(b.name));
      const slipping = people
        .filter((p) => p.activity.toLowerCase() === "active" && p.lastThreeMonths === 3)
        .sort((a, b) => a.name.localeCompare(b.name));
      return {
        ok: true,
        conversionGuests: conversionGuests.slice(0, 40),
        oneAway: oneAway.slice(0, 40),
        slipping: slipping.slice(0, 40),
        totals: {
          conversionGuests: conversionGuests.length,
          oneAway: oneAway.length,
          slipping: slipping.length,
        },
      };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err), ...empty };
    }
  },
);

export type OutreachAction = "membership-invite" | "coffee-invite" | "comeback-nudge";

/** One-click outreach: queues the action for the office (review-only POC) */
export const queueOutreach = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { person: string; action: OutreachAction; reason: string }) => data,
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    try {
      const { appendValues } = await import("@/lib/server/sheets");
      const stamp = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
      await appendValues(ACTION_QUEUE_SHEET_ID, "Outreach Requests!A1:E", [
        [stamp, data.person, data.action, data.reason, "PENDING"],
      ]);
      const labels: Record<OutreachAction, string> = {
        "membership-invite": "Membership invite queued",
        "coffee-invite": "Coffee invite queued",
        "comeback-nudge": "Comeback nudge queued",
      };
      return { ok: true, message: `${labels[data.action]} for ${data.person}.` };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }
  });

export interface SmartRosterPerson {
  /** 1-based sheet row in the Event Attendance tab (usable with checkInEvent) */
  row: number;
  name: string;
  type: string;
  timesAttended: number;
}

export interface SmartRoster {
  ok: boolean;
  message?: string;
  matchedEvents: { name: string; date: string }[];
  roster: SmartRosterPerson[];
}

/** Recurring-event roster: rank past attendees of events matching a keyword */
export const fetchSmartRoster = createServerFn({ method: "POST" })
  .inputValidator((data: { keyword: string }) => data)
  .handler(async ({ data }): Promise<SmartRoster> => {
    try {
      const { getValues } = await import("@/lib/server/sheets");
      const kw = data.keyword.trim().toLowerCase();
      if (kw.length < 3) return { ok: false, message: "Keyword needs 3+ characters.", matchedEvents: [], roster: [] };
      const [dates = [], names = []] = await getValues(ATTENDANCE_SHEET_ID, "Event Attendance!I2:CZ3");
      const matches: { idx: number; name: string; date: string }[] = [];
      names.forEach((n, i) => {
        if ((n || "").toLowerCase().includes(kw)) {
          matches.push({ idx: i, name: (n || "").trim(), date: (dates[i] || "").trim() });
        }
      });
      if (!matches.length) return { ok: true, matchedEvents: [], roster: [] };
      const people = await getValues(ATTENDANCE_SHEET_ID, "Event Attendance!B5:H1650");
      const counts = new Map<number, number>();
      // Read each matched event column once and tally TRUE marks per person row
      for (const m of matches.slice(0, 12)) {
        const col = colLetter(EVENT_FIRST_DATE_COL + m.idx);
        const marks = await getValues(ATTENDANCE_SHEET_ID, `Event Attendance!${col}5:${col}1650`);
        marks.forEach((cell, i) => {
          if ((cell[0] || "").toUpperCase() === "TRUE") counts.set(i, (counts.get(i) || 0) + 1);
        });
      }
      const roster: SmartRosterPerson[] = [...counts.entries()]
        .map(([i, timesAttended]) => ({
          row: EVENT_PEOPLE_START_ROW + i,
          name: ((people[i] || [])[0] || "").trim(),
          type: ((people[i] || [])[6] || "").trim(),
          timesAttended,
        }))
        .filter((p) => p.name)
        .sort((a, b) => b.timesAttended - a.timesAttended)
        .slice(0, 30);
      return { ok: true, matchedEvents: matches.map(({ name, date }) => ({ name, date })), roster };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err), matchedEvents: [], roster: [] };
    }
  });
