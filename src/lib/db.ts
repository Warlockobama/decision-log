// DB access is server-only by convention: this module is imported only from
// route handlers (Node runtime) and the seed script — never from client
// components. `serverExternalPackages` in next.config keeps better-sqlite3 out
// of any client bundle.
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type {
  NewPredictionInput,
  Prediction,
  PredictionStatus,
  ResolveInput,
} from "./types";

// Single shared connection. In dev, Next reloads modules, so we cache the
// connection on globalThis to avoid opening a new handle on every request.
const DB_PATH =
  process.env.DECISION_LOG_DB ??
  path.join(process.cwd(), "data", "decision_log.db");

function createDb(): Database.Database {
  mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      claim TEXT NOT NULL,
      probability REAL NOT NULL CHECK (probability >= 0 AND probability <= 1),
      category TEXT,
      base_rate TEXT,
      reasoning TEXT,
      what_would_change_my_mind TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolves_at TEXT,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
      outcome INTEGER CHECK (outcome IN (0,1)),
      resolved_at TEXT,
      resolution_notes TEXT
    );
  `);
  migrate(db);
  return db;
}

// Additive, idempotent migrations. CREATE TABLE IF NOT EXISTS won't add columns
// to an already-seeded DB, so add them guarded by a table_info check.
function migrate(db: Database.Database) {
  const cols = (db.prepare("PRAGMA table_info(predictions)").all() as {
    name: string;
  }[]).map((c) => c.name);
  if (!cols.includes("base_rate_pct")) {
    db.exec(
      "ALTER TABLE predictions ADD COLUMN base_rate_pct REAL " +
        "CHECK (base_rate_pct IS NULL OR (base_rate_pct >= 0 AND base_rate_pct <= 1))",
    );
  }
  // Key/value app settings (e.g. the user's interest topics).
  db.exec(
    "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
  );
  // Completed calibration-practice rounds (separate from the real prediction log).
  db.exec(`
    CREATE TABLE IF NOT EXISTS calibration_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      count INTEGER NOT NULL,
      brier REAL,
      ece REAL,
      bias REAL,
      items TEXT NOT NULL
    );
  `);
}

const globalForDb = globalThis as unknown as { __decisionLogDb?: Database.Database };
const db = globalForDb.__decisionLogDb ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.__decisionLogDb = db;

export function listPredictions(status?: PredictionStatus): Prediction[] {
  const sql = status
    ? `SELECT * FROM predictions WHERE status = ? ORDER BY
         CASE WHEN status='open' THEN COALESCE(resolves_at, '9999') END ASC,
         created_at DESC`
    : `SELECT * FROM predictions ORDER BY status ASC, created_at DESC`;
  const stmt = db.prepare(sql);
  return (status ? stmt.all(status) : stmt.all()) as Prediction[];
}

export function getPrediction(id: number): Prediction | undefined {
  return db.prepare(`SELECT * FROM predictions WHERE id = ?`).get(id) as
    | Prediction
    | undefined;
}

export function createPrediction(input: NewPredictionInput): Prediction {
  const info = db
    .prepare(
      `INSERT INTO predictions
         (claim, probability, category, base_rate, base_rate_pct, reasoning,
          what_would_change_my_mind, resolves_at)
       VALUES (@claim, @probability, @category, @base_rate, @base_rate_pct,
               @reasoning, @what_would_change_my_mind, @resolves_at)`,
    )
    .run({
      claim: input.claim,
      probability: input.probability,
      category: input.category ?? null,
      base_rate: input.base_rate ?? null,
      base_rate_pct: input.base_rate_pct ?? null,
      reasoning: input.reasoning ?? null,
      what_would_change_my_mind: input.what_would_change_my_mind ?? null,
      resolves_at: input.resolves_at ?? null,
    });
  return getPrediction(Number(info.lastInsertRowid))!;
}

export function resolvePrediction(
  id: number,
  input: ResolveInput,
): Prediction | undefined {
  const existing = getPrediction(id);
  if (!existing) return undefined;
  db.prepare(
    `UPDATE predictions
       SET status='resolved', outcome=@outcome,
           resolved_at=datetime('now'), resolution_notes=@notes
     WHERE id=@id`,
  ).run({
    id,
    outcome: input.outcome,
    notes: input.resolution_notes ?? null,
  });
  return getPrediction(id);
}

export function deletePrediction(id: number): boolean {
  return db.prepare(`DELETE FROM predictions WHERE id = ?`).run(id).changes > 0;
}

export function getSetting(key: string): string | undefined {
  const row = db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key) as
    | { value: string }
    | undefined;
  return row?.value;
}

export function setSetting(key: string, value: string): void {
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(key, value);
}

/**
 * The user's interest topics. If never set explicitly, seed them from the
 * categories they've already used (inferred interests) — `seeded` flags that.
 */
export function getTopics(): { topics: string[]; seeded: boolean } {
  const raw = getSetting("topics");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return { topics: parsed, seeded: false };
    } catch {
      // fall through to seeding
    }
  }
  const cats = db
    .prepare(
      `SELECT DISTINCT category FROM predictions
         WHERE category IS NOT NULL AND category != '' ORDER BY category`,
    )
    .all() as { category: string }[];
  return { topics: cats.map((c) => c.category), seeded: true };
}

export function setTopics(topics: string[]): void {
  setSetting("topics", JSON.stringify(topics));
}

export interface CalibrationSessionRow {
  id: number;
  created_at: string;
  count: number;
  brier: number | null;
  ece: number | null;
  bias: number | null;
}

export function createCalibrationSession(s: {
  count: number;
  brier: number | null;
  ece: number | null;
  bias: number | null;
  items: string;
}): CalibrationSessionRow {
  const info = db
    .prepare(
      `INSERT INTO calibration_sessions (count, brier, ece, bias, items)
       VALUES (@count, @brier, @ece, @bias, @items)`,
    )
    .run(s);
  return db
    .prepare(
      `SELECT id, created_at, count, brier, ece, bias
         FROM calibration_sessions WHERE id = ?`,
    )
    .get(Number(info.lastInsertRowid)) as CalibrationSessionRow;
}

export function listCalibrationSessions(limit = 20): CalibrationSessionRow[] {
  return db
    .prepare(
      `SELECT id, created_at, count, brier, ece, bias
         FROM calibration_sessions
        ORDER BY created_at DESC, id DESC LIMIT ?`,
    )
    .all(limit) as CalibrationSessionRow[];
}

export { db };
