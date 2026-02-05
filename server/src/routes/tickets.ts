import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validation.js';
import { importTicket, getTicketById, getTicketComments, listTickets, deleteTicket, togglePin } from '../services/ticket-service.js';
import { getDb } from '../db/connection.js';
import { AppError } from '../middleware/error-handler.js';

const router = Router();

// List tickets with filtering/sorting/pagination
router.get('/', async (req, res, next) => {
  try {
    const result = listTickets({
      page: Number(req.query.page) || 1,
      per_page: Number(req.query.per_page) || 50,
      status: req.query.status as string,
      priority: req.query.priority as string,
      provider_type: req.query.provider_type as string,
      assignee: req.query.assignee as string,
      category_id: req.query.category_id ? Number(req.query.category_id) : undefined,
      tag_id: req.query.tag_id ? Number(req.query.tag_id) : undefined,
      folder_id: req.query.folder_id as string,
      sort_by: req.query.sort_by as string,
      sort_order: req.query.sort_order as 'asc' | 'desc',
      q: req.query.q as string,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Get single ticket
router.get('/:id', async (req, res, next) => {
  try {
    const ticket = getTicketById(Number(req.params.id));
    if (!ticket) throw new AppError(404, 'Ticket not found');
    const comments = getTicketComments(ticket.id);
    res.json({ ...ticket, comments });
  } catch (err) {
    next(err);
  }
});

// Import ticket from external source
const importSchema = z.object({
  provider_id: z.number(),
  external_id: z.string().min(1),
});

router.post('/import', validate(importSchema), async (req, res, next) => {
  try {
    const { provider_id, external_id } = (req as any).validated;
    const ticket = await importTicket(provider_id, external_id);
    res.status(201).json(ticket);
  } catch (err) {
    next(err);
  }
});

// Refresh single ticket
router.post('/:id/refresh', async (req, res, next) => {
  try {
    const ticket = getTicketById(Number(req.params.id));
    if (!ticket) throw new AppError(404, 'Ticket not found');
    const refreshed = await importTicket(ticket.provider_id, ticket.external_id);
    const comments = getTicketComments(refreshed.id);
    res.json({ ...refreshed, comments });
  } catch (err) {
    next(err);
  }
});

// Delete ticket
router.delete('/:id', async (req, res, next) => {
  try {
    const ticket = getTicketById(Number(req.params.id));
    if (!ticket) throw new AppError(404, 'Ticket not found');
    deleteTicket(ticket.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// Toggle pin
const pinSchema = z.object({
  is_pinned: z.boolean(),
});

router.patch('/:id/pin', validate(pinSchema), async (req, res, next) => {
  try {
    const ticket = getTicketById(Number(req.params.id));
    if (!ticket) throw new AppError(404, 'Ticket not found');
    const { is_pinned } = (req as any).validated;
    togglePin(ticket.id, is_pinned);
    res.json({ id: ticket.id, is_pinned });
  } catch (err) {
    next(err);
  }
});

// Assign ticket to folder
const folderSchema = z.object({
  folder_id: z.number().nullable(),
});

router.patch('/:id/folder', validate(folderSchema), async (req, res, next) => {
  try {
    const ticket = getTicketById(Number(req.params.id));
    if (!ticket) throw new AppError(404, 'Ticket not found');
    const { folder_id } = (req as any).validated;

    if (folder_id !== null) {
      const db = getDb();
      const folder = db.prepare('SELECT id FROM folders WHERE id = ?').get(folder_id);
      if (!folder) throw new AppError(400, 'Folder not found');
    }

    const db = getDb();
    db.prepare('UPDATE tickets SET folder_id = ? WHERE id = ?').run(folder_id, ticket.id);
    res.json({ id: ticket.id, folder_id });
  } catch (err) {
    next(err);
  }
});

export default router;
