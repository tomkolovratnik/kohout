import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { Ticket, TicketComment, PaginatedResponse, Category, TicketNote, LocalTag } from '@kohout/shared';

type TicketWithComments = Ticket & { comments: TicketComment[] };

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

export function useTickets(params: TicketListParams = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') searchParams.set(k, String(v));
  });
  const qs = searchParams.toString();
  return useQuery({
    queryKey: ['tickets', params],
    queryFn: () => apiFetch<PaginatedResponse<Ticket>>(`/tickets${qs ? `?${qs}` : ''}`),
  });
}

export function useTicket(id: number | null) {
  return useQuery({
    queryKey: ['ticket', id],
    queryFn: () => apiFetch<TicketWithComments>(`/tickets/${id}`),
    enabled: id !== null,
  });
}

export function useImportTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { provider_id: number; external_id: string }) =>
      apiFetch<Ticket>('/tickets/import', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  });
}

export function useRefreshTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<TicketWithComments>(`/tickets/${id}/refresh`, { method: 'POST' }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['ticket', id] });
      qc.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

// Categories for a ticket
export function useTicketCategories(ticketId: number | null) {
  return useQuery({
    queryKey: ['ticket-categories', ticketId],
    queryFn: () => apiFetch<Category[]>(`/categories/tickets/${ticketId}`),
    enabled: ticketId !== null,
  });
}

export function useAssignCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, categoryId }: { ticketId: number; categoryId: number }) =>
      apiFetch(`/categories/tickets/${ticketId}`, { method: 'POST', body: JSON.stringify({ category_id: categoryId }) }),
    onSuccess: (_, { ticketId }) => qc.invalidateQueries({ queryKey: ['ticket-categories', ticketId] }),
  });
}

export function useRemoveCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, categoryId }: { ticketId: number; categoryId: number }) =>
      apiFetch(`/categories/tickets/${ticketId}/${categoryId}`, { method: 'DELETE' }),
    onSuccess: (_, { ticketId }) => qc.invalidateQueries({ queryKey: ['ticket-categories', ticketId] }),
  });
}

// Notes
export function useTicketNotes(ticketId: number | null) {
  return useQuery({
    queryKey: ['ticket-notes', ticketId],
    queryFn: () => apiFetch<TicketNote[]>(`/tickets/${ticketId}/notes`),
    enabled: ticketId !== null,
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, content }: { ticketId: number; content: string }) =>
      apiFetch<TicketNote>(`/tickets/${ticketId}/notes`, { method: 'POST', body: JSON.stringify({ content }) }),
    onSuccess: (_, { ticketId }) => qc.invalidateQueries({ queryKey: ['ticket-notes', ticketId] }),
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, content, ticketId }: { noteId: number; content: string; ticketId: number }) =>
      apiFetch<TicketNote>(`/notes/${noteId}`, { method: 'PUT', body: JSON.stringify({ content }) }),
    onSuccess: (_, { ticketId }) => qc.invalidateQueries({ queryKey: ['ticket-notes', ticketId] }),
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, ticketId }: { noteId: number; ticketId: number }) =>
      apiFetch(`/notes/${noteId}`, { method: 'DELETE' }),
    onSuccess: (_, { ticketId }) => qc.invalidateQueries({ queryKey: ['ticket-notes', ticketId] }),
  });
}

// Tags for a ticket
export function useTicketTags(ticketId: number | null) {
  return useQuery({
    queryKey: ['ticket-tags', ticketId],
    queryFn: () => apiFetch<LocalTag[]>(`/tags/tickets/${ticketId}`),
    enabled: ticketId !== null,
  });
}

export function useAssignTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, tagId }: { ticketId: number; tagId: number }) =>
      apiFetch(`/tags/tickets/${ticketId}`, { method: 'POST', body: JSON.stringify({ tag_id: tagId }) }),
    onSuccess: (_, { ticketId }) => qc.invalidateQueries({ queryKey: ['ticket-tags', ticketId] }),
  });
}

export function useRemoveTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, tagId }: { ticketId: number; tagId: number }) =>
      apiFetch(`/tags/tickets/${ticketId}/${tagId}`, { method: 'DELETE' }),
    onSuccess: (_, { ticketId }) => qc.invalidateQueries({ queryKey: ['ticket-tags', ticketId] }),
  });
}

export function useDeleteTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/tickets/${id}`, { method: 'DELETE' }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      qc.invalidateQueries({ queryKey: ['dashboard-recent'] });
      qc.invalidateQueries({ queryKey: ['dashboard-pinned'] });
      qc.invalidateQueries({ queryKey: ['kanban'] });
      qc.removeQueries({ queryKey: ['ticket', id] });
    },
  });
}

export function useTogglePin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, is_pinned }: { ticketId: number; is_pinned: boolean }) =>
      apiFetch(`/tickets/${ticketId}/pin`, { method: 'PATCH', body: JSON.stringify({ is_pinned }) }),
    onSuccess: (_, { ticketId }) => {
      qc.invalidateQueries({ queryKey: ['ticket', ticketId] });
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: ['dashboard-pinned'] });
    },
  });
}
