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
  const rows = db.prepare(`
    SELECT id, title, external_id, status, priority, provider_type, assignee, external_tags, synced_at, updated_at
    FROM tickets
    ORDER BY synced_at DESC
    LIMIT 20
  `).all() as any[];

  // Batch-load local tags and categories for all recent tickets
  const ticketIds = rows.map(r => r.id);
  const tagRows = ticketIds.length > 0
    ? db.prepare(`
        SELECT tlt.ticket_id, lt.id, lt.name, lt.color
        FROM ticket_local_tags tlt
        JOIN local_tags lt ON lt.id = tlt.tag_id
        WHERE tlt.ticket_id IN (${ticketIds.map(() => '?').join(',')})
      `).all(...ticketIds) as any[]
    : [];
  const catRows = ticketIds.length > 0
    ? db.prepare(`
        SELECT tc.ticket_id, c.id, c.name, c.color
        FROM ticket_categories tc
        JOIN categories c ON c.id = tc.category_id
        WHERE tc.ticket_id IN (${ticketIds.map(() => '?').join(',')})
      `).all(...ticketIds) as any[]
    : [];

  const tagsByTicket = new Map<number, { id: number; name: string; color: string }[]>();
  for (const t of tagRows) {
    if (!tagsByTicket.has(t.ticket_id)) tagsByTicket.set(t.ticket_id, []);
    tagsByTicket.get(t.ticket_id)!.push({ id: t.id, name: t.name, color: t.color });
  }
  const catsByTicket = new Map<number, { id: number; name: string; color: string }[]>();
  for (const c of catRows) {
    if (!catsByTicket.has(c.ticket_id)) catsByTicket.set(c.ticket_id, []);
    catsByTicket.get(c.ticket_id)!.push({ id: c.id, name: c.name, color: c.color });
  }

  const recent = rows.map(r => {
    const action = r.updated_at > r.synced_at ? 'updated' : 'imported';
    let externalTags: string[] = [];
    try { externalTags = JSON.parse(r.external_tags || '[]'); } catch {}
    return {
      ticket_id: r.id,
      ticket_title: r.title,
      external_id: r.external_id,
      action,
      timestamp: r.synced_at,
      status: r.status,
      priority: r.priority,
      provider_type: r.provider_type,
      assignee: r.assignee,
      external_tags: externalTags,
      local_tags: tagsByTicket.get(r.id) || [],
      categories: catsByTicket.get(r.id) || [],
    };
  });

  res.json(recent);
});

router.get('/pinned', (_req, res) => {
  res.json(getPinnedTickets());
});

export default router;
