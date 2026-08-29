/**
 * SQLite connection + schema/seed bootstrap.
 *
 * A light, file-based SQL database (better-sqlite3, synchronous driver — no
 * server process to run). The file lives at `server/data/booking.db` by
 * default; override with the BOOKING_DB_PATH env var (":memory:" is handy
 * for tests).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_DB_PATH = path.join(__dirname, "..", "data", "booking.db");
const DB_PATH = process.env.BOOKING_DB_PATH || DEFAULT_DB_PATH;

if (DB_PATH !== ":memory:") {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS event_types (
    id              TEXT PRIMARY KEY,
    title           TEXT NOT NULL,
    description     TEXT,
    durationMinutes INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id          TEXT PRIMARY KEY,
    eventTypeId TEXT NOT NULL REFERENCES event_types(id) ON DELETE RESTRICT,
    startTime   TEXT NOT NULL,
    createdAt   TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_bookings_startTime ON bookings(startTime);
`);

const eventTypeCount = db
  .prepare("SELECT COUNT(*) AS count FROM event_types")
  .get() as { count: number };

if (eventTypeCount.count === 0) {
  const seed = db.prepare(
    `INSERT INTO event_types (id, title, description, durationMinutes)
     VALUES (@id, @title, @description, @durationMinutes)`
  );
  const seedAll = db.transaction((rows: Record<string, unknown>[]) => {
    for (const row of rows) seed.run(row);
  });
  seedAll([
    {
      id: "et-1",
      title: "Intro call",
      description: "Short introduction meeting",
      durationMinutes: 30,
    },
    {
      id: "et-2",
      title: "Deep dive",
      description: "Detailed technical discussion",
      durationMinutes: 60,
    },
  ]);
}
