import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validation.js';
import { getDb } from '../db/connection.js';
import { AppError } from '../middleware/error-handler.js';

const router = Router();

// ─── Boards ──────────────────────────────────────────────────────────

router.get('/boards', (_req, res) => {
  const db = getDb();
  const boards = db.prepare('SELECT * FROM kanban_boards ORDER BY id').all();
  res.json(boards);
});

router.get('/boards/:id', (req, res, next) => {
  try {
    const db = getDb();
    const board = db.prepare('SELECT * FROM kanban_boards WHERE id = ?').get(Number(req.params.id)) as any;
    if (!board) throw new AppError(404, 'Board not found');

    const columns = db.prepare('SELECT * FROM kanban_columns WHERE board_id = ? ORDER BY sort_order').all(board.id);
    const swimlanes = db.prepare('SELECT * FROM kanban_swimlanes WHERE board_id = ? ORDER BY sort_order').all(board.id);
    const positions = db.prepare(`
      SELECT ktp.*, t.title, t.status, t.priority, t.external_id, t.provider_type, t.assignee
      FROM kanban_ticket_positions ktp
      JOIN tickets t ON t.id = ktp.ticket_id
      WHERE ktp.board_id = ?
    `).all(board.id);

    res.json({ ...board, columns, swimlanes, positions });
  } catch (err) {
    next(err);
  }
});

const boardSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
});

router.post('/boards', validate(boardSchema), (req, res, next) => {
  try {
    const db = getDb();
    const data = (req as any).validated;
    const result = db.prepare('INSERT INTO kanban_boards (name, description, color) VALUES (?, ?, ?)').run(data.name, data.description || null, data.color || null);
    const board = db.prepare('SELECT * FROM kanban_boards WHERE id = ?').get(Number(result.lastInsertRowid));
    res.status(201).json(board);
  } catch (err) {
    next(err);
  }
});

router.put('/boards/:id', validate(boardSchema), (req, res, next) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const data = (req as any).validated;
    db.prepare("UPDATE kanban_boards SET name = ?, description = ?, color = ?, updated_at = datetime('now') WHERE id = ?").run(data.name, data.description || null, data.color || null, id);
    const board = db.prepare('SELECT * FROM kanban_boards WHERE id = ?').get(id);
    res.json(board);
  } catch (err) {
    next(err);
  }
});

router.delete('/boards/:id', (req, res, next) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM kanban_boards WHERE id = ?').run(Number(req.params.id));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ─── Columns ─────────────────────────────────────────────────────────

const columnSchema = z.object({
  name: z.string().min(1),
  sort_order: z.number().default(0),
  color: z.string().nullable().optional(),
  wip_limit: z.number().nullable().optional(),
});

router.post('/boards/:boardId/columns', validate(columnSchema), (req, res, next) => {
  try {
    const db = getDb();
    const boardId = Number(req.params.boardId);
    const data = (req as any).validated;
    const result = db.prepare('INSERT INTO kanban_columns (board_id, name, sort_order, color, wip_limit) VALUES (?, ?, ?, ?, ?)').run(
      boardId, data.name, data.sort_order, data.color || null, data.wip_limit ?? null
    );
    const column = db.prepare('SELECT * FROM kanban_columns WHERE id = ?').get(Number(result.lastInsertRowid));
    res.status(201).json(column);
  } catch (err) {
    next(err);
  }
});

router.put('/columns/:id', validate(columnSchema), (req, res, next) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const data = (req as any).validated;
    db.prepare('UPDATE kanban_columns SET name = ?, sort_order = ?, color = ?, wip_limit = ? WHERE id = ?').run(
      data.name, data.sort_order, data.color || null, data.wip_limit ?? null, id
    );
    const column = db.prepare('SELECT * FROM kanban_columns WHERE id = ?').get(id);
    res.json(column);
  } catch (err) {
    next(err);
  }
});

router.delete('/columns/:id', (req, res, next) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM kanban_columns WHERE id = ?').run(Number(req.params.id));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ─── Swimlanes ───────────────────────────────────────────────────────

const swimlaneSchema = z.object({
  name: z.string().min(1),
  sort_order: z.number().default(0),
  color: z.string().nullable().optional(),
  group_by: z.enum(['category', 'assignee', 'priority', 'source', 'tag']).nullable().optional(),
  group_value: z.string().nullable().optional(),
});

router.post('/boards/:boardId/swimlanes', validate(swimlaneSchema), (req, res, next) => {
  try {
    const db = getDb();
    const boardId = Number(req.params.boardId);
    const data = (req as any).validated;
    const result = db.prepare('INSERT INTO kanban_swimlanes (board_id, name, sort_order, color, group_by, group_value) VALUES (?, ?, ?, ?, ?, ?)').run(
      boardId, data.name, data.sort_order, data.color || null, data.group_by || null, data.group_value || null
    );
    const swimlane = db.prepare('SELECT * FROM kanban_swimlanes WHERE id = ?').get(Number(result.lastInsertRowid));
    res.status(201).json(swimlane);
  } catch (err) {
    next(err);
  }
});

router.put('/swimlanes/:id', validate(swimlaneSchema), (req, res, next) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const data = (req as any).validated;
    db.prepare('UPDATE kanban_swimlanes SET name = ?, sort_order = ?, color = ?, group_by = ?, group_value = ? WHERE id = ?').run(
      data.name, data.sort_order, data.color || null, data.group_by || null, data.group_value || null, id
    );
    const swimlane = db.prepare('SELECT * FROM kanban_swimlanes WHERE id = ?').get(id);
    res.json(swimlane);
  } catch (err) {
    next(err);
  }
});

router.delete('/swimlanes/:id', (req, res, next) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM kanban_swimlanes WHERE id = ?').run(Number(req.params.id));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ─── Auto-generate swimlanes ────────────────────────────────────────

router.post('/boards/:boardId/swimlanes/auto-generate', (req, res, next) => {
  try {
    const db = getDb();
    const boardId = Number(req.params.boardId);
    const { group_by } = req.body;

    if (!['category', 'assignee', 'priority', 'source', 'tag'].includes(group_by)) {
      throw new AppError(400, 'Invalid group_by value');
    }

    // Delete existing swimlanes for this board
    db.prepare('DELETE FROM kanban_swimlanes WHERE board_id = ?').run(boardId);
    // Reset swimlane assignments
    db.prepare('UPDATE kanban_ticket_positions SET swimlane_id = NULL WHERE board_id = ?').run(boardId);

    let values: { name: string; value: string }[] = [];

    if (group_by === 'category') {
      const cats = db.prepare(`
        SELECT DISTINCT c.id, c.name FROM categories c
        JOIN ticket_categories tc ON tc.category_id = c.id
        JOIN kanban_ticket_positions ktp ON ktp.ticket_id = tc.ticket_id AND ktp.board_id = ?
      `).all(boardId) as any[];
      values = cats.map(c => ({ name: c.name, value: String(c.id) }));
    } else if (group_by === 'assignee') {
      const assignees = db.prepare(`
        SELECT DISTINCT t.assignee FROM tickets t
        JOIN kanban_ticket_positions ktp ON ktp.ticket_id = t.id AND ktp.board_id = ?
        WHERE t.assignee IS NOT NULL
      `).all(boardId) as any[];
      values = assignees.map(a => ({ name: a.assignee, value: a.assignee }));
    } else if (group_by === 'priority') {
      const priorities = db.prepare(`
        SELECT DISTINCT t.priority FROM tickets t
        JOIN kanban_ticket_positions ktp ON ktp.ticket_id = t.id AND ktp.board_id = ?
      `).all(boardId) as any[];
      values = priorities.map(p => ({ name: p.priority, value: p.priority }));
    } else if (group_by === 'source') {
      const sources = db.prepare(`
        SELECT DISTINCT t.provider_type FROM tickets t
        JOIN kanban_ticket_positions ktp ON ktp.ticket_id = t.id AND ktp.board_id = ?
      `).all(boardId) as any[];
      values = sources.map(s => ({ name: s.provider_type, value: s.provider_type }));
    } else if (group_by === 'tag') {
      const tags = db.prepare(`
        SELECT DISTINCT lt.id, lt.name FROM local_tags lt
        JOIN ticket_local_tags tlt ON tlt.tag_id = lt.id
        JOIN kanban_ticket_positions ktp ON ktp.ticket_id = tlt.ticket_id AND ktp.board_id = ?
      `).all(boardId) as any[];
      values = tags.map(t => ({ name: t.name, value: String(t.id) }));
    }

    // Add "Uncategorized" swimlane
    values.unshift({ name: 'Nezařazené', value: '' });

    const insertSwimlane = db.prepare('INSERT INTO kanban_swimlanes (board_id, name, sort_order, group_by, group_value) VALUES (?, ?, ?, ?, ?)');
    values.forEach((v, i) => {
      insertSwimlane.run(boardId, v.name, i, group_by, v.value || null);
    });

    const swimlanes = db.prepare('SELECT * FROM kanban_swimlanes WHERE board_id = ? ORDER BY sort_order').all(boardId);
    res.json(swimlanes);
  } catch (err) {
    next(err);
  }
});

// ─── Ticket positions ────────────────────────────────────────────────

// Add ticket to board
router.post('/boards/:boardId/tickets', (req, res, next) => {
  try {
    const db = getDb();
    const boardId = Number(req.params.boardId);
    const { ticket_id, column_id, swimlane_id } = req.body;

    // Get max sort order in column
    const maxSort = (db.prepare(`
      SELECT COALESCE(MAX(sort_order), -1) as max_sort
      FROM kanban_ticket_positions
      WHERE board_id = ? AND column_id = ? AND (swimlane_id = ? OR (swimlane_id IS NULL AND ? IS NULL))
    `).get(boardId, column_id, swimlane_id || null, swimlane_id || null) as any).max_sort;

    const result = db.prepare(`
      INSERT OR REPLACE INTO kanban_ticket_positions (board_id, ticket_id, column_id, swimlane_id, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `).run(boardId, ticket_id, column_id, swimlane_id || null, maxSort + 1);

    const position = db.prepare('SELECT * FROM kanban_ticket_positions WHERE id = ?').get(Number(result.lastInsertRowid));
    res.status(201).json(position);
  } catch (err) {
    next(err);
  }
});

// Move ticket on board
router.put('/tickets/:positionId/move', (req, res, next) => {
  try {
    const db = getDb();
    const positionId = Number(req.params.positionId);
    const { column_id, swimlane_id, sort_order } = req.body;

    db.prepare('UPDATE kanban_ticket_positions SET column_id = ?, swimlane_id = ?, sort_order = ? WHERE id = ?').run(
      column_id, swimlane_id || null, sort_order ?? 0, positionId
    );

    const position = db.prepare('SELECT * FROM kanban_ticket_positions WHERE id = ?').get(positionId);
    res.json(position);
  } catch (err) {
    next(err);
  }
});

// Remove ticket from board
router.delete('/tickets/:positionId', (req, res, next) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM kanban_ticket_positions WHERE id = ?').run(Number(req.params.positionId));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
