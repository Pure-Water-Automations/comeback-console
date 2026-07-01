import { describe, expect, it } from "vitest";
import { migrate, openMemoryDb } from "./db";

describe("db", () => {
  it("creates all tables and is idempotent", () => {
    const db = openMemoryDb();
    migrate(db); // second run must not throw
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      .map((r: any) => r.name);
    for (const t of ["award_defs", "award_runs", "audit_log", "prizes", "prize_issuances", "trophy_events"]) {
      expect(tables).toContain(t);
    }
  });

  it("enforces trophy uniqueness per (community, achievement, source)", () => {
    const db = openMemoryDb();
    const ins = db.prepare(
      "INSERT OR IGNORE INTO trophy_events (community_id, achievement_id, source, unlocked_at, reported_at) VALUES (?,?,?,?,?)",
    );
    const a = ins.run("new-jersey", "first-checkin", "console", "2026-07-01T00:00:00Z", "2026-07-01T00:00:00Z");
    const b = ins.run("new-jersey", "first-checkin", "console", "2026-07-01T01:00:00Z", "2026-07-01T01:00:00Z");
    expect(a.changes).toBe(1);
    expect(b.changes).toBe(0);
  });
});
