import { Router } from 'express';
import { getDb } from '../db/connection.js';
import { getPinnedTickets } from '../services/ticket-service.js';

const router = Router();

router.get('/stats', (_req, res) => {
  const db = getDb();

  const total = (db.prepare('SELECT COUNT(*) as count FROM tickets').get() as any).count;

  const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM tickets GROUP BY status').all() as any[];
  const bySource = db.prepare('SELECT provider_type, COUNT(*) as count FROM tickets GROUP BY provider_type').all() as any[];
  const byPriority = db.prepare('SELECT priority, COUNT(*) as count FROM tickets GROUP BY priority').all() as any[];

  const byCategory = db.prepare(`
    SELECT c.id, c.name, c.color, c.icon, c.sort_order, COUNT(tc.ticket_id) as count
    FROM categories c
    LEFT JOIN ticket_categories tc ON tc.category_id = c.id
    GROUP BY c.id
    ORDER BY count DESC
  `).all() as any[];

  res.json({
    total_tickets: total,
    by_status: Object.fromEntries(byStatus.map(r => [r.status, r.count])),
    by_source: Object.fromEntries(bySource.map(r => [r.provider_type, r.count])),
    by_priority: Object.fromEntries(byPriority.map(r => [r.priority, r.count])),
    by_category: byCategory.map(r => ({
      category: { id: r.id, name: r.name, color: r.color, icon: r.icon, sort_order: r.sort_order },
      count: r.count,
    })),
  });
});

router.get('/recent', (_req, res) => {
  const db = getDb();
  const recent = db.prepare(`
    SELECT id as ticket_id, title as ticket_title, external_id, 'imported' as action, synced_at as timestamp
    FROM tickets
    ORDER BY synced_at DESC
    LIMIT 20
  `).all();
  res.json(recent);
});

router.get('/pinned', (_req, res) => {
  res.json(getPinnedTickets());
});

export default router;
