import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validation.js';
import { refreshAllTickets, fetchMyTickets } from '../services/sync-service.js';
import { rebuildAllFtsIndexes } from '../services/ticket-service.js';

const router = Router();

router.post('/refresh-all', async (_req, res, next) => {
  try {
    const result = await refreshAllTickets();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

const fetchMyTicketsSchema = z.object({
  provider_id: z.number(),
  assigned: z.boolean(),
  watched: z.boolean(),
  participant: z.boolean(),
  include_closed: z.boolean(),
  custom_query: z.string().optional(),
  folder_id: z.number().optional(),
  tag_ids: z.array(z.number()).optional(),
  category_ids: z.array(z.number()).optional(),
}).refine(data => data.custom_query?.trim() || data.assigned || data.watched || data.participant, {
  message: 'Zadejte vlastní dotaz nebo zaškrtněte alespoň jednu volbu (assigned/watched/participant)',
});

router.post('/fetch-my-tickets', validate(fetchMyTicketsSchema), async (req, res, next) => {
  try {
    const options = (req as any).validated;
    const result = await fetchMyTickets(options);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/rebuild-fts', (_req, res, next) => {
  try {
    const result = rebuildAllFtsIndexes();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
