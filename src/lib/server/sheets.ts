// Server-only Google Sheets read client (shared by the live scoreboard + FAQ).
// Reuses the local Workspace OAuth credential (full `spreadsheets` scope) at
// ~/.google_workspace_mcp/credentials/<email>.json — the same client the
// google-workspace MCP uses — so the dev server can read the live workbooks
// with zero new dependencies. Never import this from client code.
//
// The write helpers (updateValues / batchUpdateValues / appendValues) were
// removed alongside the migrated attendance/quest/guest/outreach actions; the
// retained roster search and regional scoreboard read live sheets via getValues.

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const CRED_PATH = join(
  homedir(),
  ".google_workspace_mcp",
  "credentials",
  "okamotomiak@gmail.com.json",
);

interface StoredCredential {
  client_id: string;
  client_secret: string;
  refresh_token: string;
  token_uri: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) return cachedToken.token;
  const cred = JSON.parse(readFileSync(CRED_PATH, "utf8")) as StoredCredential;
  const res = await fetch(cred.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cred.client_id,
      client_secret: cred.client_secret,
      refresh_token: cred.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`token refresh failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cachedToken.token;
}

const BASE = "https://sheets.googleapis.com/v4/spreadsheets";

async function sheetsFetch(url: string, init?: RequestInit) {
  const token = await accessToken();
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`Sheets API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

export async function getValues(spreadsheetId: string, range: string): Promise<string[][]> {
  const json = await sheetsFetch(`${BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}`);
  return (json.values as string[][]) || [];
}

/** All tab (sheet) titles in the workbook. */
export async function listTabs(spreadsheetId: string): Promise<string[]> {
  const json = await sheetsFetch(`${BASE}/${spreadsheetId}?fields=sheets.properties.title`);
  return ((json.sheets as Array<{ properties?: { title?: string } }>) || [])
    .map((s) => s.properties?.title)
    .filter((t): t is string => !!t);
}

/**
 * Read several ranges in one call. Returns grids aligned to the input order
 * (the API preserves range order). All referenced tabs must exist, or the whole
 * request errors — pass only tab names you've confirmed via listTabs.
 */
export async function batchGetValues(
  spreadsheetId: string,
  ranges: string[],
): Promise<string[][][]> {
  if (!ranges.length) return [];
  const qs = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join("&");
  const json = await sheetsFetch(`${BASE}/${spreadsheetId}/values:batchGet?${qs}`);
  return ((json.valueRanges as Array<{ values?: string[][] }>) || []).map((vr) => vr.values || []);
}
