import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validation.js';
import { getDb } from '../db/connection.js';
import { AppError } from '../middleware/error-handler.js';

const router = Router();

// List categories
router.get('/', (_req, res) => {
  const db = getDb();
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all();
  res.json(categories);
});

// Create category
const categorySchema = z.object({
  name: z.string().min(1),
  color: z.string().default('#6366f1'),
  icon: z.string().nullable().optional(),
  sort_order: z.number().default(0),
});

router.post('/', validate(categorySchema), (req, res, next) => {
  try {
    const db = getDb();
    const data = (req as any).validated;
    const result = db.prepare('INSERT INTO categories (name, color, icon, sort_order) VALUES (?, ?, ?, ?)').run(
      data.name, data.color, data.icon || null, data.sort_order
    );
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(Number(result.lastInsertRowid));
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
});

// Update category
router.put('/:id', validate(categorySchema), (req, res, next) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const data = (req as any).validated;
    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!existing) throw new AppError(404, 'Category not found');
    db.prepare('UPDATE categories SET name = ?, color = ?, icon = ?, sort_order = ? WHERE id = ?').run(
      data.name, data.color, data.icon || null, data.sort_order, id
    );
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    res.json(category);
  } catch (err) {
    next(err);
  }
});

// Delete category
router.delete('/:id', (req, res, next) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// Assign category to ticket
router.post('/tickets/:ticketId', (req, res, next) => {
  try {
    const db = getDb();
    const ticketId = Number(req.params.ticketId);
    const { category_id } = req.body;
    db.prepare('INSERT OR IGNORE INTO ticket_categories (ticket_id, category_id) VALUES (?, ?)').run(ticketId, category_id);
    res.status(201).json({ ticket_id: ticketId, category_id });
  } catch (err) {
    next(err);
  }
});

// Remove category from ticket
router.delete('/tickets/:ticketId/:categoryId', (req, res, next) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM ticket_categories WHERE ticket_id = ? AND category_id = ?').run(
      Number(req.params.ticketId), Number(req.params.categoryId)
    );
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// Get categories for ticket
router.get('/tickets/:ticketId', (req, res) => {
  const db = getDb();
  const categories = db.prepare(`
    SELECT c.* FROM categories c
    JOIN ticket_categories tc ON tc.category_id = c.id
    WHERE tc.ticket_id = ?
    ORDER BY c.sort_order, c.name
  `).all(Number(req.params.ticketId));
  res.json(categories);
});

export default router;
