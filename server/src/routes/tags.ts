import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validation.js';
import { getDb } from '../db/connection.js';
import { updateFtsIndex } from '../services/ticket-service.js';
import { AppError } from '../middleware/error-handler.js';

const router = Router();

// List all tags
router.get('/', (_req, res) => {
  const db = getDb();
  const tags = db.prepare('SELECT * FROM local_tags ORDER BY name').all();
  res.json(tags);
});

// Create tag
const tagSchema = z.object({
  name: z.string().min(1),
  color: z.string().default('#8b5cf6'),
});

router.post('/', validate(tagSchema), (req, res, next) => {
  try {
    const db = getDb();
    const data = (req as any).validated;
    const result = db.prepare('INSERT INTO local_tags (name, color) VALUES (?, ?)').run(data.name, data.color);
    const tag = db.prepare('SELECT * FROM local_tags WHERE id = ?').get(Number(result.lastInsertRowid));
    res.status(201).json(tag);
  } catch (err) {
    next(err);
  }
});

// Update tag
router.put('/:id', validate(tagSchema), (req, res, next) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const data = (req as any).validated;
    const existing = db.prepare('SELECT * FROM local_tags WHERE id = ?').get(id);
    if (!existing) throw new AppError(404, 'Tag not found');
    db.prepare('UPDATE local_tags SET name = ?, color = ? WHERE id = ?').run(data.name, data.color, id);
    const tag = db.prepare('SELECT * FROM local_tags WHERE id = ?').get(id);
    res.json(tag);
  } catch (err) {
    next(err);
  }
});

// Delete tag
router.delete('/:id', (req, res, next) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    db.prepare('DELETE FROM local_tags WHERE id = ?').run(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// Assign tag to ticket
router.post('/tickets/:ticketId', (req, res, next) => {
  try {
    const db = getDb();
    const ticketId = Number(req.params.ticketId);
    const { tag_id } = req.body;
    db.prepare('INSERT OR IGNORE INTO ticket_local_tags (ticket_id, tag_id) VALUES (?, ?)').run(ticketId, tag_id);
    updateFtsIndex(ticketId);
    res.status(201).json({ ticket_id: ticketId, tag_id });
  } catch (err) {
    next(err);
  }
});

// Remove tag from ticket
router.delete('/tickets/:ticketId/:tagId', (req, res, next) => {
  try {
    const db = getDb();
    const ticketId = Number(req.params.ticketId);
    db.prepare('DELETE FROM ticket_local_tags WHERE ticket_id = ? AND tag_id = ?').run(ticketId, Number(req.params.tagId));
    updateFtsIndex(ticketId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// Get tags for ticket
router.get('/tickets/:ticketId', (req, res) => {
  const db = getDb();
  const tags = db.prepare(`
    SELECT lt.* FROM local_tags lt
    JOIN ticket_local_tags tlt ON tlt.tag_id = lt.id
    WHERE tlt.ticket_id = ?
    ORDER BY lt.name
  `).all(Number(req.params.ticketId));
  res.json(tags);
});

export default router;
