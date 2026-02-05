import type { ExternalTicket, ExternalComment } from '../types.js';
import type { TicketStatus, TicketPriority } from '@kohout/shared';

function mapStatus(adoState: string): TicketStatus {
  const s = adoState.toLowerCase();
  if (['done', 'closed', 'removed'].some(x => s.includes(x))) return 'closed';
  if (['resolved', 'verified', 'complete', 'deployed'].some(x => s.includes(x))) return 'resolved';
  if (['active', 'in progress', 'committed', 'in review', 'testing',
       'ready for test', 'blocked', 'on hold', 'implementing', 'developing'].some(x => s.includes(x))) return 'in_progress';
  if (['new', 'to do', 'proposed', 'open', 'draft', 'planned', 'assigned'].some(x => s.includes(x))) return 'open';
  return 'unknown';
}

function mapPriority(adoPriority: number | null): TicketPriority {
  if (!adoPriority) return 'none';
  if (adoPriority === 1) return 'critical';
  if (adoPriority === 2) return 'high';
  if (adoPriority === 3) return 'medium';
  if (adoPriority === 4) return 'low';
  return 'none';
}

function htmlToMarkdown(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<h([1-6])[^>]*>/gi, (_, level) => '#'.repeat(parseInt(level)) + ' ')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function getDisplayName(identity: any): string | null {
  if (!identity) return null;
  return identity.displayName || identity.uniqueName || null;
}

export function mapAzureWorkItem(workItem: any, organization: string, project: string): ExternalTicket {
  const fields = workItem.fields || {};
  const id = workItem.id;

  const participants: string[] = [];
  const assignee = getDisplayName(fields['System.AssignedTo']);
  const creator = getDisplayName(fields['System.CreatedBy']);
  if (assignee) participants.push(assignee);
  if (creator && !participants.includes(creator)) participants.push(creator);

  return {
    external_id: String(id),
    external_url: `https://dev.azure.com/${organization}/${project}/_workitems/edit/${id}`,
    title: fields['System.Title'] || '',
    description: htmlToMarkdown(fields['System.Description'] || ''),
    status: mapStatus(fields['System.State'] || ''),
    priority: mapPriority(fields['Microsoft.VSTS.Common.Priority'] || null),
    assignee,
    creator,
    participants,
    external_tags: (fields['System.Tags'] || '').split(';').map((t: string) => t.trim()).filter(Boolean),
    comments: [],
  };
}

export function mapAzureComment(comment: any): ExternalComment {
  return {
    external_id: String(comment.id),
    author: getDisplayName(comment.createdBy) || 'Unknown',
    body: htmlToMarkdown(comment.text || ''),
    created_at: comment.createdDate,
    updated_at: comment.modifiedDate || comment.createdDate,
  };
}
