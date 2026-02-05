import type { ExternalTicket, ExternalComment } from '../types.js';
import type { TicketStatus, TicketPriority } from '@kohout/shared';

function mapStatus(jiraStatus: string): TicketStatus {
  const s = jiraStatus.toLowerCase();
  if (['done', 'closed'].some(x => s.includes(x))) return 'closed';
  if (['resolved', 'fixed', 'verified', 'complete', 'deployed'].some(x => s.includes(x))) return 'resolved';
  if (['in progress', 'in review', 'in development', 'in test', 'testing', 'review',
       'code review', 'developing', 'active', 'committed', 'ready for test',
       'ready for review', 'waiting', 'on hold', 'blocked', 'pending',
       'awaiting', 'selected', 'implementing'].some(x => s.includes(x))) return 'in_progress';
  if (['open', 'to do', 'new', 'backlog', 'created', 'reopened', 'todo',
       'draft', 'not started', 'ready', 'planned', 'proposed', 'assigned'].some(x => s.includes(x))) return 'open';
  return 'unknown';
}

function mapPriority(jiraPriority: string | null): TicketPriority {
  if (!jiraPriority) return 'none';
  const p = jiraPriority.toLowerCase();
  if (p.includes('critical') || p.includes('blocker') || p.includes('highest')) return 'critical';
  if (p.includes('high') || p.includes('major')) return 'high';
  if (p.includes('medium') || p.includes('normal')) return 'medium';
  if (p.includes('low') || p.includes('minor') || p.includes('trivial')) return 'low';
  return 'none';
}

function adfToMarkdown(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node;

  if (node.type === 'text') {
    let text = node.text || '';
    if (node.marks) {
      for (const mark of node.marks) {
        if (mark.type === 'strong') text = `**${text}**`;
        if (mark.type === 'em') text = `*${text}*`;
        if (mark.type === 'code') text = `\`${text}\``;
        if (mark.type === 'link') text = `[${text}](${mark.attrs?.href || ''})`;
      }
    }
    return text;
  }

  const children = (node.content || []).map(adfToMarkdown).join('');

  switch (node.type) {
    case 'doc': return children;
    case 'paragraph': return children + '\n\n';
    case 'heading': return '#'.repeat(node.attrs?.level || 1) + ' ' + children + '\n\n';
    case 'bulletList': return children + '\n';
    case 'orderedList': return children + '\n';
    case 'listItem': return '- ' + children.trim() + '\n';
    case 'codeBlock': return '```\n' + children + '\n```\n\n';
    case 'blockquote': return '> ' + children.trim().split('\n').join('\n> ') + '\n\n';
    case 'hardBreak': return '\n';
    case 'rule': return '---\n\n';
    case 'mention': return `@${node.attrs?.text || 'unknown'}`;
    default: return children;
  }
}

export function mapJiraIssue(issue: any, baseUrl: string): ExternalTicket {
  const fields = issue.fields;

  return {
    external_id: issue.key,
    external_url: `${baseUrl.replace(/\/$/, '')}/browse/${issue.key}`,
    title: fields.summary || '',
    description: fields.description ? adfToMarkdown(fields.description).trim() : '',
    status: mapStatus(fields.status?.name || ''),
    priority: mapPriority(fields.priority?.name || null),
    assignee: fields.assignee?.displayName || null,
    creator: fields.creator?.displayName || null,
    participants: [
      ...(fields.assignee ? [fields.assignee.displayName] : []),
      ...(fields.creator ? [fields.creator.displayName] : []),
    ].filter((v, i, a) => a.indexOf(v) === i),
    external_tags: (fields.labels || []) as string[],
    comments: [],
  };
}

export function mapJiraComment(comment: any): ExternalComment {
  return {
    external_id: comment.id,
    author: comment.author?.displayName || 'Unknown',
    body: comment.body ? adfToMarkdown(comment.body).trim() : '',
    created_at: comment.created,
    updated_at: comment.updated || comment.created,
  };
}
