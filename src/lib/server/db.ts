// SQLite persistence for the Awards Console (POC).
// better-sqlite3 because the VPS runs Node 20 (node:sqlite needs >= 22.5).
// The DB file lives OUTSIDE the deploy dir via COMEBACK_DB_PATH so rsync
// deploys never touch it. Server-only — never import from client code.

import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export type DB = Database.Database;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS award_defs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  emoji TEXT NOT NULL DEFAULT '🏆',
  tone TEXT NOT NULL DEFAULT 'gold',
  evaluator TEXT NOT NULL,
  metric_id TEXT,
  scope TEXT NOT NULL DEFAULT '{"type":"all"}',
  tiers INTEGER NOT NULL DEFAULT 1,
  window TEXT NOT NULL DEFAULT 'campaign',
  tie_breakers TEXT NOT NULL DEFAULT '[]',
  eligibility TEXT NOT NULL DEFAULT '{}',
  prizes TEXT NOT NULL DEFAULT '[]',
  blurb TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS award_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  award_id TEXT NOT NULL REFERENCES award_defs(id),
  ran_at TEXT NOT NULL,
  window_label TEXT NOT NULL,
  data_source TEXT NOT NULL,
  results TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'final'
);
CREATE TABLE IF NOT EXISTS prizes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  type TEXT NOT NULL,
  value_usd REAL NOT NULL DEFAULT 0,
  qty_total INTEGER NOT NULL DEFAULT 0,
  qty_issued INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS prize_issuances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL REFERENCES award_runs(id),
  award_id TEXT NOT NULL,
  tier INTEGER NOT NULL,
  community_id TEXT NOT NULL,
  prize_id INTEGER REFERENCES prizes(id),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS trophy_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  community_id TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'console',
  unlocked_at TEXT NOT NULL,
  reported_at TEXT NOT NULL,
  UNIQUE(community_id, achievement_id, source)
);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '{}'
);
`;

export function migrate(db: DB): void {
  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA);
}

let singleton: DB | null = null;

export function getDb(): DB {
  if (singleton) return singleton;
  const path = process.env.COMEBACK_DB_PATH || resolve("data/comeback.db");
  mkdirSync(dirname(path), { recursive: true });
  singleton = new Database(path);
  migrate(singleton);
  return singleton;
}

/** Fresh in-memory DB for tests. */
export function openMemoryDb(): DB {
  const db = new Database(":memory:");
  migrate(db);
  return db;
}
