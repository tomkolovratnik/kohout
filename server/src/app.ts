import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { errorHandler } from './middleware/error-handler.js';
import ticketsRouter from './routes/tickets.js';
import settingsRouter from './routes/settings.js';
import categoriesRouter from './routes/categories.js';
import notesRouter from './routes/notes.js';
import tagsRouter from './routes/tags.js';
import searchRouter from './routes/search.js';
import dashboardRouter from './routes/dashboard.js';
import kanbanRouter from './routes/kanban.js';
import syncRouter from './routes/sync.js';
import foldersRouter from './routes/folders.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api/tickets', ticketsRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api', notesRouter);
  app.use('/api/tags', tagsRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/kanban', kanbanRouter);
  app.use('/api/sync', syncRouter);
  app.use('/api/folders', foldersRouter);

  // Serve static client in production
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));

  // SPA fallback (Express 5 named wildcard syntax)
  app.get('/{*path}', (_req, res, next) => {
    if (_req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });

  app.use(errorHandler);

  return app;
}
