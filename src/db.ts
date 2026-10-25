import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Sets up the SQLite database and creates the `urls` table if it
 * doesn't already exist.
 *
 * We keep the DB path configurable via an environment variable so that
 * tests can use an in-memory database and production can use a real file.
 */
export function createDb(dbPath: string): Database.Database {
  // When using a real file (not the in-memory ":memory:" database),
  // make sure the folder it lives in exists.
  if (dbPath !== ':memory:') {
    mkdirSync(dirname(dbPath), { recursive: true });
  }

  const db = new Database(dbPath);

  // WAL mode improves concurrent read/write performance. A small,
  // real-world tuning detail that's nice to be able to talk about.
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS urls (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      short_code  TEXT    NOT NULL UNIQUE,
      long_url    TEXT    NOT NULL,
      clicks      INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  return db;
}

export type UrlRecord = {
  id: number;
  short_code: string;
  long_url: string;
  clicks: number;
  created_at: string;
};
