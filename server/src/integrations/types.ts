import type { TicketStatus, TicketPriority, ProviderType } from '@kohout/shared';

export interface ExternalTicket {
  external_id: string;
  external_url: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignee: string | null;
  creator: string | null;
  participants: string[];
  external_tags: string[];
  comments: ExternalComment[];
}

export interface ExternalComment {
  external_id: string;
  author: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface IntegrationProvider {
  type: ProviderType;
  fetchTicket(ticketId: string): Promise<ExternalTicket>;
  testConnection(): Promise<boolean>;
}

export interface ProviderConfig {
  base_url: string;
  pat_token: string;
  username?: string;
  extra_config?: Record<string, string>;
}
