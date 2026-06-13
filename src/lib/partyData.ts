// Party (team) management for the NJ pastor console — POC.
//
// A pastor builds their "party" of staff: search the live membership Directory
// to pull an existing member's record, or add a brand-new person (which also
// queues a Directory addition for the office). Each member gets a unique sprite,
// a supervisor (who they work under), a ministry, and an access level — stored
// in the "Party Roster" tab of the okamotomiak-owned Action Queue spreadsheet
// so the roster persists and is shareable. Access levels are stored but not yet
// enforced (future: per-screen / per-tool gating).

import { createServerFn } from "@tanstack/react-start";
import { ACTION_QUEUE_SHEET_ID } from "@/lib/njActions";
import { NJ_PROFILE } from "@/lib/njData";

const DIRECTORY_SHEET_ID = "1p_gyuEnNackRBNFfTFUs4C-TpuDtFkdkvmZlAXvtR3I";

export interface DirectoryPerson {
  name: string;
  lastName: string;
  firstName: string;
  gender: string;
  lineage: string;
  age: string;
  activity: string;
  giving: string;
}

export interface PartyMember {
  id: string;
  name: string;
  role: string;
  supervisor: string;
  ministry: string;
  spriteFamily: string;
  spritePose: string;
  accessLevel: string;
  inDirectory: boolean;
  notes: string;
  addedAt: string;
}

/** The pastors are the standing top-of-org supervisors a member can report to. */
export const PARTY_SUPERVISORS_SEED = NJ_PROFILE.pastors.map((p) => `${p.name} (${p.role})`);

const cell = (row: string[], i: number) => (row[i] ?? "").toString().trim();

/** Search the live membership Directory by name fragment (max 12 matches). */
export const searchDirectory = createServerFn({ method: "POST" })
  .inputValidator((data: { query: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean; people: DirectoryPerson[]; message?: string }> => {
    try {
      const q = data.query.trim().toLowerCase();
      if (q.length < 2) return { ok: true, people: [] };
      const { getValues } = await import("@/lib/server/sheets");
      // B=Full Name, C=Last, D=First, E=Gender, F=Lineage, H=Age, J=Activity, K=Giving
      const rows = await getValues(DIRECTORY_SHEET_ID, "Directory!B4:K900");
      const people: DirectoryPerson[] = [];
      for (const r of rows) {
        const name = cell(r, 0);
        if (name && name.toLowerCase().includes(q)) {
          people.push({
            name,
            lastName: cell(r, 1),
            firstName: cell(r, 2),
            gender: cell(r, 3),
            lineage: cell(r, 4),
            age: cell(r, 6),
            activity: cell(r, 8),
            giving: cell(r, 9),
          });
          if (people.length >= 12) break;
        }
      }
      return { ok: true, people };
    } catch (err) {
      return { ok: false, people: [], message: err instanceof Error ? err.message : String(err) };
    }
  });

/** Read the current party roster. POST (not GET) so the browser never serves a
 *  stale cached roster after a member is added/removed — the roster mutates. */
export const fetchParty = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: boolean; members: PartyMember[]; message?: string }> => {
    try {
      const { getValues } = await import("@/lib/server/sheets");
      const rows = await getValues(ACTION_QUEUE_SHEET_ID, "Party Roster!A2:L500");
      const members: PartyMember[] = rows
        .map((r) => ({
          addedAt: cell(r, 0),
          id: cell(r, 1),
          name: cell(r, 2),
          role: cell(r, 3),
          supervisor: cell(r, 4),
          ministry: cell(r, 5),
          spriteFamily: cell(r, 6),
          spritePose: cell(r, 7),
          accessLevel: cell(r, 8),
          inDirectory: /^(yes|true)$/i.test(cell(r, 9)),
          notes: cell(r, 10),
          status: cell(r, 11),
        }))
        .filter((m) => m.id && m.name && !/^removed$/i.test(m.status))
        .map(({ status: _status, ...m }) => m);
      return { ok: true, members };
    } catch (err) {
      return { ok: false, members: [], message: err instanceof Error ? err.message : String(err) };
    }
  },
);

/** Add a staff member to the party (and queue a Directory add if they're new). */
export const addPartyMember = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      name: string;
      role: string;
      supervisor: string;
      ministry: string;
      spriteFamily: string;
      spritePose: string;
      accessLevel: string;
      inDirectory: boolean;
      notes?: string;
    }) => data,
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message: string; id?: string }> => {
    try {
      const name = data.name.trim();
      if (!name) return { ok: false, message: "Member name is required." };
      const { appendValues } = await import("@/lib/server/sheets");
      const stamp = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
      const id = `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      await appendValues(ACTION_QUEUE_SHEET_ID, "Party Roster!A1:L", [
        [
          stamp,
          id,
          name,
          data.role,
          data.supervisor,
          data.ministry,
          data.spriteFamily,
          data.spritePose,
          data.accessLevel,
          data.inDirectory ? "Yes" : "No",
          data.notes || "",
          "Active",
        ],
      ]);
      // New person → also queue a membership Directory addition for the office.
      if (!data.inDirectory) {
        await appendValues(ACTION_QUEUE_SHEET_ID, "Data Fix Requests!A1:F", [
          [stamp, "add-to-directory", name, "Staff / party member", `Added as ${data.role || "staff"} via party builder`, "PENDING"],
        ]);
      }
      return {
        ok: true,
        id,
        message: data.inDirectory
          ? `${name} added to your party.`
          : `${name} added to your party and queued for the membership directory.`,
      };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }
  });

/** Remove a member from the party (marks their row Removed; non-destructive). */
export const removePartyMember = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    try {
      const { getValues, updateValues } = await import("@/lib/server/sheets");
      const ids = await getValues(ACTION_QUEUE_SHEET_ID, "Party Roster!B2:B500");
      const idx = ids.findIndex((r) => (r[0] || "").trim() === data.id);
      if (idx === -1) return { ok: false, message: "Member not found." };
      const row = idx + 2; // B2 is row 2
      await updateValues(ACTION_QUEUE_SHEET_ID, `Party Roster!L${row}`, [["Removed"]]);
      return { ok: true, message: "Member removed from the party." };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }
  });

/** Edit an existing party member's editable fields (title, supervisor, etc.). */
export const updatePartyMember = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string;
      name?: string;
      role?: string;
      supervisor?: string;
      ministry?: string;
      spriteFamily?: string;
      spritePose?: string;
      accessLevel?: string;
    }) => data,
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    try {
      const { getValues, updateValues } = await import("@/lib/server/sheets");
      const rows = await getValues(ACTION_QUEUE_SHEET_ID, "Party Roster!A2:L500");
      const idx = rows.findIndex((r) => (r[1] || "").trim() === data.id);
      if (idx === -1) return { ok: false, message: "Member not found." };
      const row = idx + 2; // A2 is sheet row 2
      const cur = rows[idx];
      // Columns C..I = name, role, supervisor, ministry, spriteFamily, spritePose, access
      const next = [
        data.name ?? cur[2] ?? "",
        data.role ?? cur[3] ?? "",
        data.supervisor ?? cur[4] ?? "",
        data.ministry ?? cur[5] ?? "",
        data.spriteFamily ?? cur[6] ?? "",
        data.spritePose ?? cur[7] ?? "",
        data.accessLevel ?? cur[8] ?? "",
      ];
      await updateValues(ACTION_QUEUE_SHEET_ID, `Party Roster!C${row}:I${row}`, [next]);
      return { ok: true, message: `${next[0]} updated.` };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }
  });
