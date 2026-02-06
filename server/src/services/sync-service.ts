import { getDb } from '../db/connection.js';
import { importTicket } from './ticket-service.js';
import { JiraClient } from '../integrations/jira/client.js';
import { AzureDevOpsClient } from '../integrations/azure-devops/client.js';
import type { FetchMyTicketsRequest, FetchMyTicketsResult } from '@kohout/shared';

let syncInterval: ReturnType<typeof setInterval> | null = null;

export async function refreshAllTickets(): Promise<{ success: number; failed: number }> {
  const db = getDb();
  const tickets = db.prepare('SELECT id, provider_id, external_id FROM tickets').all() as any[];

  let success = 0;
  let failed = 0;

  for (const ticket of tickets) {
    try {
      await importTicket(ticket.provider_id, ticket.external_id);
      success++;
    } catch (err) {
      console.error(`Failed to refresh ticket ${ticket.external_id}:`, (err as Error).message);
      failed++;
    }
  }

  return { success, failed };
}

export function startPeriodicSync(): void {
  stopPeriodicSync();

  const db = getDb();
  const setting = db.prepare("SELECT value FROM app_settings WHERE key = 'sync_interval_minutes'").get() as any;
  const intervalMinutes = parseInt(setting?.value || '30', 10);

  if (intervalMinutes <= 0) return;

  console.log(`Periodic sync started: every ${intervalMinutes} minutes`);

  syncInterval = setInterval(async () => {
    console.log('Running periodic sync...');
    try {
      const result = await refreshAllTickets();
      console.log(`Periodic sync complete: ${result.success} success, ${result.failed} failed`);
    } catch (err) {
      console.error('Periodic sync error:', (err as Error).message);
    }
  }, intervalMinutes * 60 * 1000);
}

export function stopPeriodicSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

export async function fetchMyTickets(options: FetchMyTicketsRequest): Promise<FetchMyTicketsResult> {
  const db = getDb();
  const provider = db.prepare('SELECT * FROM integration_providers WHERE id = ?').get(options.provider_id) as any;
  if (!provider) throw new Error('Provider not found');

  const extraConfig = JSON.parse(provider.extra_config || '{}');
  let externalIds: string[] = [];

  if (provider.type === 'jira') {
    const client = new JiraClient({
      base_url: provider.base_url,
      pat_token: provider.pat_token,
      username: provider.username,
      extra_config: extraConfig,
    });

    const statusFilter = options.include_closed ? '' : ' AND status NOT IN (Done, Closed, Resolved)';
    const keySet = new Set<string>();

    const runJqlSearch = async (jql: string) => {
      let pageToken: string | undefined;
      do {
        const result = await client.searchIssues(jql, pageToken);
        for (const issue of result.issues) {
          keySet.add(issue.key);
        }
        pageToken = result.nextPageToken;
      } while (pageToken);
    };

    // Standard conditions (assignee, watcher) — always safe
    const conditions: string[] = [];
    if (options.assigned) conditions.push('assignee = currentUser()');
    if (options.watched) conditions.push('watcher = currentUser()');

    if (conditions.length > 0) {
      await runJqlSearch(`(${conditions.join(' OR ')})${statusFilter}`);
    }

    // "Request participants" exists only in JSM projects — run separately and skip on failure
    if (options.participant) {
      try {
        await runJqlSearch(`"Request participants" = currentUser()${statusFilter}`);
      } catch (err) {
        console.warn('Participant query failed (field may not exist in this Jira instance):', (err as Error).message);
      }
    }

    externalIds = [...keySet];
  } else if (provider.type === 'azure-devops') {
    const conditions: string[] = [];
    if (options.assigned) conditions.push('[System.AssignedTo] = @Me');
    if (options.watched) conditions.push('[System.CreatedBy] = @Me');
    if (options.participant) conditions.push('[System.ChangedBy] = @Me');

    let wiql = `SELECT [System.Id] FROM WorkItems WHERE (${conditions.join(' OR ')})`;
    if (!options.include_closed) {
      wiql += " AND [System.State] NOT IN ('Closed','Done','Resolved','Removed')";
    }

    const client = new AzureDevOpsClient({
      base_url: provider.base_url,
      pat_token: provider.pat_token,
      extra_config: extraConfig,
    });

    const ids = await client.queryWorkItems(wiql);
    externalIds = ids.map(id => String(id));
  } else {
    throw new Error(`Unknown provider type: ${provider.type}`);
  }

  let imported = 0;
  let updated = 0;
  let failed = 0;

  for (const externalId of externalIds) {
    try {
      const existing = db.prepare('SELECT id FROM tickets WHERE provider_id = ? AND external_id = ?').get(options.provider_id, externalId);
      await importTicket(options.provider_id, externalId);
      if (existing) {
        updated++;
      } else {
        imported++;
      }
    } catch (err) {
      console.error(`Failed to import ticket ${externalId}:`, (err as Error).message);
      failed++;
    }
  }

  return { imported, updated, failed, total: externalIds.length };
}
