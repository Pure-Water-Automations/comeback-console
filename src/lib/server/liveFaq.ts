// Live FAQ/rulebook content — server-only (reads Google Sheets via the OAuth
// credential). Import ONLY inside server fn handlers; TanStack's
// import-protection denies **/server/** modules from client-reachable code.
//
// Column map (0-indexed): 0 Topic · 1 Question · 2 Keywords (comma-separated)
// · 3 Answer · 4 Status (editorial only — status is actually derived from
// whether Answer is filled in, so a forgotten dropdown never hides content)
// · 5 Notes (editorial only, never shown to end users).

import { FAQ_ENTRIES, type FaqEntry } from "@/lib/faqData";

const FAQ_SHEET_ID = "1TFbXNf2WaKngKrD_RPrXx0IKmYqVVnjV7jp7r5j5zIk";
const FAQ_TAB = "FAQ";

const cell = (row: string[], i: number) => (row[i] ?? "").toString().trim();

function toEntry(row: string[], index: number): FaqEntry | null {
  const topic = cell(row, 0);
  const question = cell(row, 1);
  if (!topic || !question) return null;

  const keywords = cell(row, 2)
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);
  const answer = cell(row, 3);

  return {
    id: `sheet-${index}`,
    topic,
    question,
    keywords,
    answer,
    status: answer ? "published" : "needs_content",
    notes: cell(row, 5) || undefined,
  };
}

export interface LiveFaqResult {
  entries: FaqEntry[];
  source: "live" | "snapshot";
  message?: string;
}

/** Parse the FAQ sheet into FaqEntry[]; falls back to the static defaults on any failure. */
export async function loadLiveFaq(): Promise<LiveFaqResult> {
  try {
    const { getValues } = await import("@/lib/server/sheets");
    const rows = await getValues(FAQ_SHEET_ID, `${FAQ_TAB}!A2:F200`);
    const parsed = rows
      .map((r, i) => toEntry(r, i))
      .filter((e): e is FaqEntry => e !== null);
    if (parsed.length >= 3) {
      return { entries: parsed, source: "live" };
    }
    return {
      entries: FAQ_ENTRIES,
      source: "snapshot",
      message: "Live FAQ sheet returned no rows; showing the built-in defaults.",
    };
  } catch (err) {
    return {
      entries: FAQ_ENTRIES,
      source: "snapshot",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
