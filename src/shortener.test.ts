import { describe, it, expect, beforeEach } from 'vitest';
import { createDb } from './db.js';
import { Shortener } from './shortener.js';

/**
 * Unit tests for the Shortener class.
 *
 * We use an in-memory SQLite database (":memory:") so every test starts
 * with a clean, fast, throwaway database. Nothing touches the real disk.
 */
describe('Shortener', () => {
  let shortener: Shortener;

  beforeEach(() => {
    const db = createDb(':memory:');
    shortener = new Shortener(db);
  });

  describe('isValidUrl', () => {
    it('accepts valid http and https URLs', () => {
      expect(Shortener.isValidUrl('http://example.com')).toBe(true);
      expect(Shortener.isValidUrl('https://example.com/path?q=1')).toBe(true);
    });

    it('rejects non-http protocols and garbage input', () => {
      expect(Shortener.isValidUrl('javascript:alert(1)')).toBe(false);
      expect(Shortener.isValidUrl('ftp://example.com')).toBe(false);
      expect(Shortener.isValidUrl('not a url')).toBe(false);
      expect(Shortener.isValidUrl('')).toBe(false);
    });
  });

  describe('shorten', () => {
    it('creates a record with a 7-character short code', () => {
      const record = shortener.shorten('https://example.com');
      expect(record.short_code).toHaveLength(7);
      expect(record.long_url).toBe('https://example.com');
      expect(record.clicks).toBe(0);
    });

    it('generates unique codes for different URLs', () => {
      const a = shortener.shorten('https://a.com');
      const b = shortener.shorten('https://b.com');
      expect(a.short_code).not.toBe(b.short_code);
    });

    it('throws INVALID_URL for a bad URL', () => {
      expect(() => shortener.shorten('nope')).toThrowError('INVALID_URL');
    });
  });

  describe('resolve', () => {
    it('finds a URL that was shortened', () => {
      const created = shortener.shorten('https://example.com');
      const found = shortener.resolve(created.short_code);
      expect(found?.long_url).toBe('https://example.com');
    });

    it('returns undefined for an unknown code', () => {
      expect(shortener.resolve('missing')).toBeUndefined();
    });
  });

  describe('recordClick', () => {
    it('increments the click counter', () => {
      const created = shortener.shorten('https://example.com');
      shortener.recordClick(created.short_code);
      shortener.recordClick(created.short_code);
      expect(shortener.resolve(created.short_code)?.clicks).toBe(2);
    });
  });

  describe('listRecent', () => {
    it('returns records newest first', () => {
      shortener.shorten('https://first.com');
      shortener.shorten('https://second.com');
      const recent = shortener.listRecent();
      expect(recent[0].long_url).toBe('https://second.com');
      expect(recent[1].long_url).toBe('https://first.com');
    });
  });
});
