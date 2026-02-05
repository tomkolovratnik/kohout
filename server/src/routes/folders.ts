import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validation.js';
import { getDb } from '../db/connection.js';
import { AppError } from '../middleware/error-handler.js';
import { getDescendantFolderIds } from '../services/ticket-service.js';
import type { Folder, FolderTreeNode } from '@kohout/shared';

const router = Router();

// Helper: check if targetId is an ancestor of folderId (cycle detection)
function isAncestor(folderId: number, targetId: number): boolean {
  const db = getDb();
  let currentId: number | null = targetId;
  while (currentId !== null) {
    if (currentId === folderId) return true;
    const row = db.prepare('SELECT parent_id FROM folders WHERE id = ?').get(currentId) as { parent_id: number | null } | undefined;
    currentId = row?.parent_id ?? null;
  }
  return false;
}

// GET /api/folders/tree — full tree with ticket counts
router.get('/tree', (_req, res) => {
  const db = getDb();
  const folders = db.prepare('SELECT * FROM folders ORDER BY sort_order, name').all() as Folder[];

  // Count tickets per folder
  const ticketCounts = db.prepare('SELECT folder_id, COUNT(*) as count FROM tickets WHERE folder_id IS NOT NULL GROUP BY folder_id').all() as { folder_id: number; count: number }[];
  const countMap = new Map(ticketCounts.map(r => [r.folder_id, r.count]));

  // Unfiled count
  const unfiledRow = db.prepare('SELECT COUNT(*) as count FROM tickets WHERE folder_id IS NULL').get() as { count: number };

  // Build tree
  const nodeMap = new Map<number, FolderTreeNode>();
  for (const f of folders) {
    nodeMap.set(f.id, { ...f, children: [], ticket_count: countMap.get(f.id) || 0, total_ticket_count: 0 });
  }

  const roots: FolderTreeNode[] = [];
  for (const node of nodeMap.values()) {
    if (node.parent_id && nodeMap.has(node.parent_id)) {
      nodeMap.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Calculate total_ticket_count (own + all descendants)
  function calcTotal(node: FolderTreeNode): number {
    let total = node.ticket_count;
    for (const child of node.children) {
      total += calcTotal(child);
    }
    node.total_ticket_count = total;
    return total;
  }
  roots.forEach(calcTotal);

  res.json({ tree: roots, unfiled_count: unfiledRow.count });
});

// POST /api/folders — create folder
const createSchema = z.object({
  name: z.string().min(1),
  parent_id: z.number().nullable().optional(),
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  sort_order: z.number().default(0),
});

router.post('/', validate(createSchema), (req, res, next) => {
  try {
    const db = getDb();
    const data = (req as any).validated;

    if (data.parent_id) {
      const parent = db.prepare('SELECT id FROM folders WHERE id = ?').get(data.parent_id);
      if (!parent) throw new AppError(400, 'Parent folder not found');
    }

    const result = db.prepare('INSERT INTO folders (name, parent_id, sort_order, color, icon) VALUES (?, ?, ?, ?, ?)').run(
      data.name, data.parent_id || null, data.sort_order, data.color || null, data.icon || null
    );
    const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(Number(result.lastInsertRowid));
    res.status(201).json(folder);
  } catch (err) {
    next(err);
  }
});

// PUT /api/folders/:id — update folder
const updateSchema = z.object({
  name: z.string().min(1),
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  sort_order: z.number().optional(),
});

router.put('/:id', validate(updateSchema), (req, res, next) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const data = (req as any).validated;
    const existing = db.prepare('SELECT * FROM folders WHERE id = ?').get(id);
    if (!existing) throw new AppError(404, 'Folder not found');

    db.prepare('UPDATE folders SET name = ?, color = ?, icon = ?, sort_order = COALESCE(?, sort_order), updated_at = datetime(\'now\') WHERE id = ?').run(
      data.name, data.color ?? null, data.icon ?? null, data.sort_order ?? null, id
    );
    const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(id);
    res.json(folder);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/folders/:id — delete folder (CASCADE children, SET NULL tickets)
router.delete('/:id', (req, res, next) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT id FROM folders WHERE id = ?').get(id);
    if (!existing) throw new AppError(404, 'Folder not found');

    // SET NULL on tickets for this folder and all descendants (CASCADE handles child folders)
    const descendantIds = getDescendantFolderIds(id);
    const allIds = [id, ...descendantIds];
    const placeholders = allIds.map(() => '?').join(',');
    db.prepare(`UPDATE tickets SET folder_id = NULL WHERE folder_id IN (${placeholders})`).run(...allIds);

    db.prepare('DELETE FROM folders WHERE id = ?').run(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// PATCH /api/folders/:id/move — move folder (change parent_id + sort_order)
const moveSchema = z.object({
  parent_id: z.number().nullable(),
  sort_order: z.number().default(0),
});

router.patch('/:id/move', validate(moveSchema), (req, res, next) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const data = (req as any).validated;

    const existing = db.prepare('SELECT id FROM folders WHERE id = ?').get(id);
    if (!existing) throw new AppError(404, 'Folder not found');

    // Validate target parent exists
    if (data.parent_id !== null) {
      const parent = db.prepare('SELECT id FROM folders WHERE id = ?').get(data.parent_id);
      if (!parent) throw new AppError(400, 'Target parent folder not found');

      // Cycle detection: parent_id cannot be the folder itself or any descendant
      if (data.parent_id === id) throw new AppError(400, 'Cannot move folder into itself');
      if (isAncestor(id, data.parent_id)) throw new AppError(400, 'Cannot move folder into its own descendant');
    }

    db.prepare('UPDATE folders SET parent_id = ?, sort_order = ?, updated_at = datetime(\'now\') WHERE id = ?').run(
      data.parent_id, data.sort_order, id
    );
    const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(id);
    res.json(folder);
  } catch (err) {
    next(err);
  }
});

export default router;
