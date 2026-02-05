import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validation.js';
import { getDb } from '../db/connection.js';
import { updateFtsIndex } from '../services/ticket-service.js';
import { AppError } from '../middleware/error-handler.js';

const router = Router();

// Get notes for ticket
router.get('/tickets/:ticketId/notes', (req, res) => {
  const db = getDb();
  const notes = db.prepare('SELECT * FROM ticket_notes WHERE ticket_id = ? ORDER BY created_at DESC').all(Number(req.params.ticketId));
  res.json(notes);
});

// Create note
const noteSchema = z.object({
  content: z.string().min(1),
});

router.post('/tickets/:ticketId/notes', validate(noteSchema), (req, res, next) => {
  try {
    const db = getDb();
    const ticketId = Number(req.params.ticketId);
    const { content } = (req as any).validated;
    const result = db.prepare('INSERT INTO ticket_notes (ticket_id, content) VALUES (?, ?)').run(ticketId, content);
    const note = db.prepare('SELECT * FROM ticket_notes WHERE id = ?').get(Number(result.lastInsertRowid));
    updateFtsIndex(ticketId);
    res.status(201).json(note);
  } catch (err) {
    next(err);
  }
});

// Update note
router.put('/notes/:id', validate(noteSchema), (req, res, next) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const { content } = (req as any).validated;
    const existing = db.prepare('SELECT * FROM ticket_notes WHERE id = ?').get(id) as any;
    if (!existing) throw new AppError(404, 'Note not found');
    db.prepare("UPDATE ticket_notes SET content = ?, updated_at = datetime('now') WHERE id = ?").run(content, id);
    const note = db.prepare('SELECT * FROM ticket_notes WHERE id = ?').get(id);
    updateFtsIndex(existing.ticket_id);
    res.json(note);
  } catch (err) {
    next(err);
  }
});

// Delete note
router.delete('/notes/:id', (req, res, next) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM ticket_notes WHERE id = ?').get(id) as any;
    if (!existing) throw new AppError(404, 'Note not found');
    db.prepare('DELETE FROM ticket_notes WHERE id = ?').run(id);
    updateFtsIndex(existing.ticket_id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
