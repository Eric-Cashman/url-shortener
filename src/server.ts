import { createApp } from './app.js';
import { createDb } from './db.js';

/**
 * Entry point. Reads configuration from environment variables (with sane
 * defaults), wires up the database and app, then starts listening.
 *
 * Reading config from the environment is a core "twelve-factor app"
 * practice and is exactly how the app will be configured once it's
 * running in a container in the cloud.
 */
const PORT = Number(process.env.PORT ?? 3000);
const DB_PATH = process.env.DB_PATH ?? 'data/urls.db';

const db = createDb(DB_PATH);
const app = createApp(db);

app.listen(PORT, () => {
  console.log(`URL shortener listening on http://localhost:${PORT}`);
});
