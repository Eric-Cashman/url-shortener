import type Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import type { UrlRecord } from './db.js';

/**
 * The Shortener holds all the business logic for creating and resolving
 * short URLs. It talks to the database but knows nothing about HTTP,
 * which keeps it easy to test and reuse.
 */
export class Shortener {
  constructor(private db: Database.Database) {}

  /**
   * Validates a URL string. We only allow http/https to avoid turning
   * the service into an open redirect for things like javascript: URLs.
   */
  static isValidUrl(input: string): boolean {
    try {
      const url = new URL(input);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Creates a short code for a long URL and stores it.
   * Retries a few times in the unlikely event of a code collision.
   */
  shorten(longUrl: string): UrlRecord {
    if (!Shortener.isValidUrl(longUrl)) {
      throw new Error('INVALID_URL');
    }

    const insert = this.db.prepare(
      'INSERT INTO urls (short_code, long_url) VALUES (?, ?)'
    );

    for (let attempt = 0; attempt < 5; attempt++) {
      const shortCode = nanoid(7);
      try {
        const result = insert.run(shortCode, longUrl);
        return this.getById(Number(result.lastInsertRowid))!;
      } catch (err) {
        // UNIQUE constraint failed -> code collision, try again.
        if (String(err).includes('UNIQUE')) continue;
        throw err;
      }
    }

    throw new Error('CODE_GENERATION_FAILED');
  }

  /** Looks up a URL record by its short code. */
  resolve(shortCode: string): UrlRecord | undefined {
    const row = this.db
      .prepare('SELECT * FROM urls WHERE short_code = ?')
      .get(shortCode) as UrlRecord | undefined;
    return row;
  }

  /** Increments the click counter for a short code. */
  recordClick(shortCode: string): void {
    this.db
      .prepare('UPDATE urls SET clicks = clicks + 1 WHERE short_code = ?')
      .run(shortCode);
  }

  /** Fetches a record by its numeric id (used internally). */
  getById(id: number): UrlRecord | undefined {
    return this.db
      .prepare('SELECT * FROM urls WHERE id = ?')
      .get(id) as UrlRecord | undefined;
  }

  /** Returns recent URLs, newest first. Handy for a stats view. */
  listRecent(limit = 10): UrlRecord[] {
    return this.db
      .prepare('SELECT * FROM urls ORDER BY id DESC LIMIT ?')
      .all(limit) as UrlRecord[];
  }
}
