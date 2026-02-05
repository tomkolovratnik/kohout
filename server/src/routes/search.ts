import { Router } from 'express';
import { getDb } from '../db/connection.js';
import { buildFtsQuery } from '../services/fts-utils.js';

const router = Router();

router.get('/', (req, res, next) => {
  try {
    const q = (req.query.q as string || '').trim();
    if (q.length < 2) {
      res.json([]);
      return;
    }

    const db = getDb();
    const ftsQuery = buildFtsQuery(q);

    if (ftsQuery) {
      try {
        const results = db.prepare(`
          SELECT
            fts.rowid as ticket_id,
            t.external_id,
            t.title,
            snippet(tickets_fts, 2, '<mark>', '</mark>', '...', 32) as snippet,
            rank
          FROM tickets_fts fts
          JOIN tickets t ON t.id = fts.rowid
          WHERE tickets_fts MATCH ?
          ORDER BY rank
          LIMIT 20
        `).all(ftsQuery);

        res.json(results);
        return;
      } catch {
        // FTS query failed, fall through to LIKE fallback
      }
    }

    // LIKE fallback
    const likeTerm = `%${q}%`;
    const results = db.prepare(`
      SELECT
        t.id as ticket_id,
        t.external_id,
        t.title,
        substr(t.description, 1, 100) as snippet,
        0 as rank
      FROM tickets t
      WHERE t.title LIKE ? OR t.description LIKE ? OR t.external_id LIKE ?
      LIMIT 20
    `).all(likeTerm, likeTerm, likeTerm);

    res.json(results);
  } catch (err) {
    next(err);
  }
});

export default router;
