import express, { type Express, type Request, type Response } from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type Database from 'better-sqlite3';
import { Shortener } from './shortener.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Builds the Express application. We pass the database in so that tests
 * can hand it a throwaway in-memory DB while production uses a real file.
 * Separating "build the app" from "start the server" is a common pattern
 * that makes HTTP tests fast and isolated.
 */
export function createApp(db: Database.Database): Express {
  const app = express();
  const shortener = new Shortener(db);

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve the static frontend (index.html, etc.) from the `public` folder.
  // The path is resolved relative to this file so it works both when run
  // from source (src/) and when compiled (dist/).
  app.use(express.static(join(__dirname, '..', 'public')));

  // --- Health check -------------------------------------------------------
  // A dedicated endpoint for monitoring tools and container orchestrators
  // to confirm the service is alive. We'll use this later for monitoring.
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // --- Create a short URL -------------------------------------------------
  app.post('/api/shorten', (req: Request, res: Response) => {
    const { url } = req.body ?? {};

    if (typeof url !== 'string' || url.length === 0) {
      return res.status(400).json({ error: 'A "url" field is required.' });
    }

    try {
      const record = shortener.shorten(url);
      const shortUrl = `${req.protocol}://${req.get('host')}/${record.short_code}`;
      return res.status(201).json({
        shortCode: record.short_code,
        shortUrl,
        longUrl: record.long_url,
      });
    } catch (err) {
      if (String(err).includes('INVALID_URL')) {
        return res
          .status(400)
          .json({ error: 'Please provide a valid http(s) URL.' });
      }
      return res.status(500).json({ error: 'Something went wrong.' });
    }
  });

  // --- List recent URLs ---------------------------------------------------
  app.get('/api/urls', (_req: Request, res: Response) => {
    res.json(shortener.listRecent());
  });

  // --- Redirect -----------------------------------------------------------
  // This is the actual "short link" behavior. Kept last so it doesn't
  // accidentally capture /api or /health routes.
  app.get('/:code', (req: Request, res: Response) => {
    const record = shortener.resolve(req.params.code);
    if (!record) {
      return res.status(404).json({ error: 'Short URL not found.' });
    }
    shortener.recordClick(record.short_code);
    return res.redirect(record.long_url);
  });

  return app;
}
