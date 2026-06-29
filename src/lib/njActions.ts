// NJ console roster read (POC).
//
// The migrated write/queue actions — Sunday & event attendance check-in, LES
// quests, guest capture, outreach, and data fixes — now live in Ministry OS and
// were removed from this console. The one server function that remains is the
// read-only roster search the retained Memory Training mini-game uses to tag
// faces: a name-fragment lookup over the live Sunday Service roster. No writes.

import { createServerFn } from "@tanstack/react-start";

const ATTENDANCE_SHEET_ID = "1PR9YNHFi7BT_F09UkjSM2slpFN1ZWWQk-Y9FVZLK2bg";
const SUNDAY_PEOPLE_START_ROW = 4;

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
      return { ok: false, people: [], message: err instanceof Error ? err.message : String(err) };
    }
  });
