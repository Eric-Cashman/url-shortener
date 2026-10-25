import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from './app.js';
import { createDb } from './db.js';

/**
 * Integration tests for the HTTP layer.
 *
 * supertest lets us make real HTTP requests against the Express app
 * without actually binding to a network port. Combined with an in-memory
 * database, each test is fully isolated and fast.
 */
describe('HTTP API', () => {
  let app: Express;

  beforeEach(() => {
    const db = createDb(':memory:');
    app = createApp(db);
  });

  describe('GET /health', () => {
    it('reports status ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('POST /api/shorten', () => {
    it('creates a short URL from a valid long URL', async () => {
      const res = await request(app)
        .post('/api/shorten')
        .send({ url: 'https://example.com/some/long/path' });

      expect(res.status).toBe(201);
      expect(res.body.shortCode).toHaveLength(7);
      expect(res.body.shortUrl).toContain(res.body.shortCode);
      expect(res.body.longUrl).toBe('https://example.com/some/long/path');
    });

    it('rejects a missing url field with 400', async () => {
      const res = await request(app).post('/api/shorten').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('rejects an invalid url with 400', async () => {
      const res = await request(app)
        .post('/api/shorten')
        .send({ url: 'javascript:alert(1)' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /:code', () => {
    it('redirects to the original URL', async () => {
      const created = await request(app)
        .post('/api/shorten')
        .send({ url: 'https://example.com/target' });

      const res = await request(app).get(`/${created.body.shortCode}`);
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('https://example.com/target');
    });

    it('returns 404 for an unknown short code', async () => {
      const res = await request(app).get('/doesnotexist');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/urls', () => {
    it('lists created URLs', async () => {
      await request(app).post('/api/shorten').send({ url: 'https://a.com' });
      await request(app).post('/api/shorten').send({ url: 'https://b.com' });

      const res = await request(app).get('/api/urls');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });
});
