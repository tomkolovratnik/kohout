import 'dotenv/config';
import { createApp } from './app.js';
import { initDb, runMigrations, closeDb } from './db/connection.js';
import { startPeriodicSync, stopPeriodicSync } from './services/sync-service.js';
import { checkAndRebuildFts } from './services/ticket-service.js';

const PORT = parseInt(process.env.PORT || '3001', 10);

await initDb();
runMigrations();
checkAndRebuildFts();

const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startPeriodicSync();
});

function shutdown() {
  console.log('Shutting down...');
  stopPeriodicSync();
  server.close(() => {
    closeDb();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
