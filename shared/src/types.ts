// ─── Integration Providers ───────────────────────────────────────────

export type ProviderType = 'jira' | 'azure-devops';

export interface IntegrationProviderConfig {
  id: number;
  name: string;
  type: ProviderType;
  base_url: string;
  pat_token: string;
  username?: string;
  extra_config?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

// ─── Tickets ─────────────────────────────────────────────────────────

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'unknown';
export type TicketPriority = 'critical' | 'high' | 'medium' | 'low' | 'none';

export interface Ticket {
  id: number;
  provider_id: number;
  provider_type: ProviderType;
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
  created_at: string;
  updated_at: string;
  synced_at: string;
  is_pinned: boolean;
  folder_id: number | null;
}

export interface TicketComment {
  id: number;
  ticket_id: number;
  external_id: string;
  author: string;
  body: string;
  created_at: string;
  updated_at: string;
}

// ─── Folders ─────────────────────────────────────────────────────────

export interface Folder {
  id: number;
  name: string;
  parent_id: number | null;
  sort_order: number;
  color: string | null;
  icon: string | null;
  created_at: string;
  updated_at: string;
}

export interface FolderTreeNode extends Folder {
  children: FolderTreeNode[];
  ticket_count: number;
  total_ticket_count: number;
}

// ─── Categories ──────────────────────────────────────────────────────

export interface Category {
  id: number;
  name: string;
  color: string;
  icon: string | null;
  sort_order: number;
  created_at: string;
}

// ─── Notes ───────────────────────────────────────────────────────────

export interface TicketNote {
  id: number;
  ticket_id: number;
  content: string;
  created_at: string;
  updated_at: string;
}

// ─── Local Tags ──────────────────────────────────────────────────────

export interface LocalTag {
  id: number;
  name: string;
  color: string;
  created_at: string;
}

// ─── Kanban ──────────────────────────────────────────────────────────

export interface KanbanBoard {
  id: number;
  name: string;
  description: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export type SwimlaneGroupBy = 'category' | 'assignee' | 'priority' | 'source' | 'tag' | null;

export interface KanbanColumn {
  id: number;
  board_id: number;
  name: string;
  sort_order: number;
  color: string | null;
  wip_limit: number | null;
}

export interface KanbanSwimlane {
  id: number;
  board_id: number;
  name: string;
  sort_order: number;
  color: string | null;
  group_by: SwimlaneGroupBy;
  group_value: string | null;
}

export interface KanbanTicketPosition {
  id: number;
  board_id: number;
  ticket_id: number;
  column_id: number;
  swimlane_id: number | null;
  sort_order: number;
}

// ─── Search ──────────────────────────────────────────────────────────

export interface SearchResult {
  ticket_id: number;
  external_id: string;
  title: string;
  snippet: string;
  rank: number;
}

// ─── Dashboard ───────────────────────────────────────────────────────

export interface DashboardStats {
  total_tickets: number;
  by_status: Record<TicketStatus, number>;
  by_source: Record<ProviderType, number>;
  by_priority: Record<TicketPriority, number>;
  by_category: { category: Category; count: number }[];
}

export interface RecentActivity {
  ticket_id: number;
  ticket_title: string;
  external_id: string;
  action: 'imported' | 'updated' | 'commented' | 'noted';
  timestamp: string;
  status: TicketStatus;
  priority: TicketPriority;
  provider_type: ProviderType;
  assignee: string | null;
  external_tags: string[];
  local_tags: { id: number; name: string; color: string }[];
  categories: { id: number; name: string; color: string }[];
}

// ─── App Settings ────────────────────────────────────────────────────

export interface AppSetting {
  key: string;
  value: string;
}

// ─── Fetch My Tickets ───────────────────────────────────────────────

export interface FetchMyTicketsRequest {
  provider_id: number;
  assigned: boolean;
  watched: boolean;
  participant: boolean;
  include_closed: boolean;
  custom_query?: string;
  folder_id?: number;
  tag_ids?: number[];
  category_ids?: number[];
}

export interface FetchMyTicketsResult {
  imported: number;
  updated: number;
  failed: number;
  total: number;
}

// ─── API Response wrappers ───────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ApiError {
  error: string;
  details?: string;
}
