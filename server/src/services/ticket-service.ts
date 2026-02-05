import { getDb } from '../db/connection.js';
import { JiraClient } from '../integrations/jira/client.js';
import { mapJiraIssue, mapJiraComment } from '../integrations/jira/mapper.js';
import { AzureDevOpsClient } from '../integrations/azure-devops/client.js';
import { mapAzureWorkItem, mapAzureComment } from '../integrations/azure-devops/mapper.js';
import type { ExternalTicket } from '../integrations/types.js';
import type { Ticket, TicketComment } from '@kohout/shared';
import { buildFtsQuery } from './fts-utils.js';

export function getDescendantFolderIds(folderId: number): number[] {
  const db = getDb();
  const result: number[] = [];
  const children = db.prepare('SELECT id FROM folders WHERE parent_id = ?').all(folderId) as { id: number }[];
  for (const child of children) {
    result.push(child.id);
    result.push(...getDescendantFolderIds(child.id));
  }
  return result;
}

function parseJsonField(val: string | null): any {
  if (!val) return [];
  try { return JSON.parse(val); } catch { return []; }
}

function rowToTicket(row: any): Ticket {
  return {
    ...row,
    participants: parseJsonField(row.participants),
    external_tags: parseJsonField(row.external_tags),
    is_pinned: Boolean(row.is_pinned),
    folder_id: row.folder_id ?? null,
  };
}

export async function importTicket(providerId: number, externalId: string): Promise<Ticket> {
  const db = getDb();

  const provider = db.prepare('SELECT * FROM integration_providers WHERE id = ?').get(providerId) as any;
  if (!provider) throw new Error('Provider not found');

  const extraConfig = JSON.parse(provider.extra_config || '{}');
  let external: ExternalTicket;

  if (provider.type === 'jira') {
    const client = new JiraClient({
      base_url: provider.base_url,
      pat_token: provider.pat_token,
      username: provider.username,
      extra_config: extraConfig,
    });
    const issue = await client.getIssue(externalId);
    external = mapJiraIssue(issue, provider.base_url);
    const rawComments = await client.getIssueComments(externalId);
    external.comments = rawComments.map(mapJiraComment);
  } else if (provider.type === 'azure-devops') {
    const client = new AzureDevOpsClient({
      base_url: provider.base_url,
      pat_token: provider.pat_token,
      extra_config: extraConfig,
    });
    const workItem = await client.getWorkItem(externalId);
    external = mapAzureWorkItem(workItem, extraConfig.organization, extraConfig.project);
    const rawComments = await client.getWorkItemComments(externalId);
    external.comments = rawComments.map(mapAzureComment);
  } else {
    throw new Error(`Unknown provider type: ${provider.type}`);
  }

  // Upsert ticket
  const existing = db.prepare('SELECT id FROM tickets WHERE provider_id = ? AND external_id = ?').get(providerId, external.external_id) as any;

  let ticketId: number;
  const now = new Date().toISOString();

  if (existing) {
    db.prepare(`
      UPDATE tickets SET
        title = ?, description = ?, status = ?, priority = ?,
        assignee = ?, creator = ?, participants = ?, external_tags = ?,
        external_url = ?, synced_at = ?, updated_at = ?
      WHERE id = ?
    `).run(
      external.title, external.description, external.status, external.priority,
      external.assignee, external.creator,
      JSON.stringify(external.participants), JSON.stringify(external.external_tags),
      external.external_url, now, now, existing.id
    );
    ticketId = existing.id;
  } else {
    const result = db.prepare(`
      INSERT INTO tickets (provider_id, provider_type, external_id, external_url, title, description, status, priority, assignee, creator, participants, external_tags, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      providerId, provider.type, external.external_id, external.external_url,
      external.title, external.description, external.status, external.priority,
      external.assignee, external.creator,
      JSON.stringify(external.participants), JSON.stringify(external.external_tags),
      now
    );
    ticketId = Number(result.lastInsertRowid);
  }

  // Sync comments
  db.prepare('DELETE FROM ticket_comments WHERE ticket_id = ?').run(ticketId);
  const insertComment = db.prepare(`
    INSERT INTO ticket_comments (ticket_id, external_id, author, body, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const comment of external.comments) {
    insertComment.run(ticketId, comment.external_id, comment.author, comment.body, comment.created_at, comment.updated_at);
  }

  // Update FTS index
  updateFtsIndex(ticketId);

  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId) as any;
  return rowToTicket(ticket);
}

export function updateFtsIndex(ticketId: number): void {
  const db = getDb();
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId) as any;
  if (!ticket) return;

  const notes = db.prepare('SELECT content FROM ticket_notes WHERE ticket_id = ?').all(ticketId) as any[];
  const notesText = notes.map(n => n.content).join(' ');

  const comments = db.prepare('SELECT body FROM ticket_comments WHERE ticket_id = ?').all(ticketId) as any[];
  const commentsText = comments.map(c => c.body).join(' ');

  const localTags = db.prepare(`
    SELECT lt.name FROM local_tags lt
    JOIN ticket_local_tags tlt ON tlt.tag_id = lt.id
    WHERE tlt.ticket_id = ?
  `).all(ticketId) as any[];
  const tagsText = [
    ...parseJsonField(ticket.external_tags),
    ...localTags.map((t: any) => t.name),
  ].join(' ');

  // Delete old entry and insert new one
  db.prepare('DELETE FROM tickets_fts WHERE rowid = ?').run(ticketId);
  db.prepare('INSERT INTO tickets_fts (rowid, external_id, title, description, notes, comments, tags) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    ticketId, ticket.external_id, ticket.title, ticket.description, notesText, commentsText, tagsText
  );
}

export function rebuildAllFtsIndexes(): { rebuilt: number } {
  const db = getDb();
  db.prepare('DELETE FROM tickets_fts').run();

  const tickets = db.prepare('SELECT id FROM tickets').all() as any[];
  for (const t of tickets) {
    updateFtsIndex(t.id);
  }
  return { rebuilt: tickets.length };
}

export function checkAndRebuildFts(): void {
  const db = getDb();
  const ticketCount = (db.prepare('SELECT COUNT(*) as count FROM tickets').get() as any).count;
  if (ticketCount === 0) return;

  const ftsCount = (db.prepare('SELECT COUNT(*) as count FROM tickets_fts').get() as any).count;
  if (ftsCount > 0) return;

  console.log(`FTS index is empty but ${ticketCount} tickets exist. Rebuilding...`);
  const result = rebuildAllFtsIndexes();
  console.log(`FTS index rebuilt: ${result.rebuilt} tickets indexed.`);
}

export function getTicketById(id: number): Ticket | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id) as any;
  if (!row) return null;
  return rowToTicket(row);
}

export function getTicketComments(ticketId: number): TicketComment[] {
  const db = getDb();
  return db.prepare('SELECT * FROM ticket_comments WHERE ticket_id = ? ORDER BY created_at ASC').all(ticketId) as TicketComment[];
}

export interface TicketListParams {
  page?: number;
  per_page?: number;
  status?: string;
  priority?: string;
  provider_type?: string;
  assignee?: string;
  category_id?: number;
  tag_id?: number;
  folder_id?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  q?: string;
}

export function listTickets(params: TicketListParams) {
  const db = getDb();
  const page = params.page || 1;
  const perPage = params.per_page || 50;
  const offset = (page - 1) * perPage;

  const conditions: string[] = [];
  const values: any[] = [];

  // FTS full-text search
  const ftsQuery = params.q ? buildFtsQuery(params.q) : null;
  let ftsJoin = '';
  let useFtsRank = false;

  if (ftsQuery) {
    try {
      // Test the query first
      db.prepare('SELECT COUNT(*) FROM tickets_fts WHERE tickets_fts MATCH ?').get(ftsQuery);
      ftsJoin = 'JOIN tickets_fts fts ON fts.rowid = t.id';
      conditions.push('tickets_fts MATCH ?');
      values.push(ftsQuery);
      useFtsRank = true;
    } catch {
      // Fallback to LIKE search
      const likeTerm = `%${params.q!.trim()}%`;
      conditions.push('(t.title LIKE ? OR t.description LIKE ? OR t.external_id LIKE ?)');
      values.push(likeTerm, likeTerm, likeTerm);
    }
  }

  if (params.status) { conditions.push('t.status = ?'); values.push(params.status); }
  if (params.priority) { conditions.push('t.priority = ?'); values.push(params.priority); }
  if (params.provider_type) { conditions.push('t.provider_type = ?'); values.push(params.provider_type); }
  if (params.assignee) { conditions.push('t.assignee = ?'); values.push(params.assignee); }
  if (params.category_id) {
    conditions.push('EXISTS (SELECT 1 FROM ticket_categories tc WHERE tc.ticket_id = t.id AND tc.category_id = ?)');
    values.push(params.category_id);
  }
  if (params.tag_id) {
    conditions.push('EXISTS (SELECT 1 FROM ticket_local_tags tlt WHERE tlt.ticket_id = t.id AND tlt.tag_id = ?)');
    values.push(params.tag_id);
  }
  if (params.folder_id) {
    if (params.folder_id === 'unfiled') {
      conditions.push('t.folder_id IS NULL');
    } else {
      const folderId = Number(params.folder_id);
      // Include tickets in this folder and all descendant folders
      const descendantIds = getDescendantFolderIds(folderId);
      const allIds = [folderId, ...descendantIds];
      const placeholders = allIds.map(() => '?').join(',');
      conditions.push(`t.folder_id IN (${placeholders})`);
      values.push(...allIds);
    }
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const sortBy = params.sort_by || 'updated_at';
  const sortOrder = params.sort_order || 'desc';
  const allowedSorts = ['title', 'status', 'priority', 'created_at', 'updated_at', 'synced_at', 'external_id'];
  const safeSort = allowedSorts.includes(sortBy) ? sortBy : 'updated_at';
  const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

  const orderClause = useFtsRank ? 'ORDER BY fts.rank' : `ORDER BY t.${safeSort} ${safeSortOrder}`;

  const total = (db.prepare(`SELECT COUNT(*) as count FROM tickets t ${ftsJoin} ${where}`).get(...values) as any).count;
  const data = db.prepare(`SELECT t.* FROM tickets t ${ftsJoin} ${where} ${orderClause} LIMIT ? OFFSET ?`)
    .all(...values, perPage, offset)
    .map(rowToTicket);

  return {
    data,
    total,
    page,
    per_page: perPage,
    total_pages: Math.ceil(total / perPage),
  };
}

export function deleteTicket(ticketId: number): void {
  const db = getDb();
  // Delete FTS entry first (content-less table, no CASCADE)
  db.prepare('DELETE FROM tickets_fts WHERE rowid = ?').run(ticketId);
  // Delete ticket (CASCADE handles comments, notes, categories, tags, kanban positions)
  db.prepare('DELETE FROM tickets WHERE id = ?').run(ticketId);
}

export function togglePin(ticketId: number, pinned: boolean): void {
  const db = getDb();
  db.prepare('UPDATE tickets SET is_pinned = ? WHERE id = ?').run(pinned ? 1 : 0, ticketId);
}

export function getPinnedTickets(): Ticket[] {
  const db = getDb();
  return db.prepare('SELECT * FROM tickets WHERE is_pinned = 1 ORDER BY updated_at DESC').all().map(rowToTicket);
}
