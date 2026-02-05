import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validation.js';
import { getDb } from '../db/connection.js';
import { JiraClient } from '../integrations/jira/client.js';
import { AzureDevOpsClient } from '../integrations/azure-devops/client.js';
import { AppError } from '../middleware/error-handler.js';

const router = Router();

// List providers
router.get('/providers', (_req, res) => {
  const db = getDb();
  const providers = db.prepare('SELECT * FROM integration_providers ORDER BY id').all() as any[];
  // Mask PAT tokens
  const masked = providers.map(p => ({
    ...p,
    extra_config: JSON.parse(p.extra_config || '{}'),
    pat_token: p.pat_token ? '••••••••' : '',
  }));
  res.json(masked);
});

// Get single provider
router.get('/providers/:id', (req, res, next) => {
  try {
    const db = getDb();
    const provider = db.prepare('SELECT * FROM integration_providers WHERE id = ?').get(Number(req.params.id)) as any;
    if (!provider) throw new AppError(404, 'Provider not found');
    res.json({
      ...provider,
      extra_config: JSON.parse(provider.extra_config || '{}'),
      pat_token: provider.pat_token ? '••••••••' : '',
    });
  } catch (err) {
    next(err);
  }
});

// Create provider
const providerSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['jira', 'azure-devops']),
  base_url: z.string().url(),
  pat_token: z.string().min(1),
  username: z.string().optional(),
  extra_config: z.record(z.string()).optional(),
});

router.post('/providers', validate(providerSchema), (req, res, next) => {
  try {
    const db = getDb();
    const data = (req as any).validated;
    const result = db.prepare(`
      INSERT INTO integration_providers (name, type, base_url, pat_token, username, extra_config)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(data.name, data.type, data.base_url, data.pat_token, data.username || null, JSON.stringify(data.extra_config || {}));

    const provider = db.prepare('SELECT * FROM integration_providers WHERE id = ?').get(Number(result.lastInsertRowid)) as any;
    res.status(201).json({
      ...provider,
      extra_config: JSON.parse(provider.extra_config || '{}'),
      pat_token: '••••••••',
    });
  } catch (err) {
    next(err);
  }
});

// Update provider
router.put('/providers/:id', validate(providerSchema), (req, res, next) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const data = (req as any).validated;

    const existing = db.prepare('SELECT * FROM integration_providers WHERE id = ?').get(id) as any;
    if (!existing) throw new AppError(404, 'Provider not found');

    db.prepare(`
      UPDATE integration_providers SET name = ?, type = ?, base_url = ?, pat_token = ?, username = ?, extra_config = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(data.name, data.type, data.base_url, data.pat_token, data.username || null, JSON.stringify(data.extra_config || {}), id);

    const provider = db.prepare('SELECT * FROM integration_providers WHERE id = ?').get(id) as any;
    res.json({
      ...provider,
      extra_config: JSON.parse(provider.extra_config || '{}'),
      pat_token: '••••••••',
    });
  } catch (err) {
    next(err);
  }
});

// Delete provider
router.delete('/providers/:id', (req, res, next) => {
  try {
    const db = getDb();
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM integration_providers WHERE id = ?').get(id);
    if (!existing) throw new AppError(404, 'Provider not found');
    db.prepare('DELETE FROM integration_providers WHERE id = ?').run(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// Test connection
router.post('/providers/:id/test', async (req, res, next) => {
  try {
    const db = getDb();
    const provider = db.prepare('SELECT * FROM integration_providers WHERE id = ?').get(Number(req.params.id)) as any;
    if (!provider) throw new AppError(404, 'Provider not found');

    const extraConfig = JSON.parse(provider.extra_config || '{}');
    let success = false;

    if (provider.type === 'jira') {
      const client = new JiraClient({
        base_url: provider.base_url,
        pat_token: provider.pat_token,
        username: provider.username,
        extra_config: extraConfig,
      });
      success = await client.testConnection();
    } else if (provider.type === 'azure-devops') {
      const client = new AzureDevOpsClient({
        base_url: provider.base_url,
        pat_token: provider.pat_token,
        extra_config: extraConfig,
      });
      success = await client.testConnection();
    }

    res.json({ success });
  } catch (err: any) {
    const cause = err.cause;
    const detail = cause?.message || cause || err.message;
    res.json({ success: false, error: String(detail) });
  }
});

// App settings
router.get('/', (_req, res) => {
  const db = getDb();
  const settings = db.prepare('SELECT * FROM app_settings').all();
  res.json(settings);
});

router.put('/:key', (req, res, next) => {
  try {
    const db = getDb();
    const { key } = req.params;
    const { value } = req.body;
    db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)').run(key, value);
    res.json({ key, value });
  } catch (err) {
    next(err);
  }
});

export default router;
