import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { KanbanBoard, KanbanColumn, KanbanSwimlane, KanbanTicketPosition } from '@kohout/shared';

interface BoardDetail extends KanbanBoard {
  columns: KanbanColumn[];
  swimlanes: KanbanSwimlane[];
  positions: (KanbanTicketPosition & {
    title: string;
    status: string;
    priority: string;
    external_id: string;
    provider_type: string;
    assignee: string | null;
  })[];
}

export function useKanbanBoards() {
  return useQuery({
    queryKey: ['kanban-boards'],
    queryFn: () => apiFetch<KanbanBoard[]>('/kanban/boards'),
  });
}

export function useKanbanBoard(id: number | null) {
  return useQuery({
    queryKey: ['kanban-board', id],
    queryFn: () => apiFetch<BoardDetail>(`/kanban/boards/${id}`),
    enabled: id !== null,
  });
}

export function useCreateBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      apiFetch<KanbanBoard>('/kanban/boards', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kanban-boards'] }),
  });
}

export function useDeleteBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/kanban/boards/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kanban-boards'] }),
  });
}

export function useCreateColumn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, ...data }: { boardId: number; name: string; sort_order?: number; color?: string; wip_limit?: number }) =>
      apiFetch<KanbanColumn>(`/kanban/boards/${boardId}/columns`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (_, { boardId }) => qc.invalidateQueries({ queryKey: ['kanban-board', boardId] }),
  });
}

export function useUpdateColumn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, boardId, ...data }: { id: number; boardId: number; name: string; sort_order?: number; color?: string; wip_limit?: number }) =>
      apiFetch<KanbanColumn>(`/kanban/columns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: (_, { boardId }) => qc.invalidateQueries({ queryKey: ['kanban-board', boardId] }),
  });
}

export function useDeleteColumn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, boardId }: { id: number; boardId: number }) =>
      apiFetch(`/kanban/columns/${id}`, { method: 'DELETE' }),
    onSuccess: (_, { boardId }) => qc.invalidateQueries({ queryKey: ['kanban-board', boardId] }),
  });
}

export function useCreateSwimlane() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, ...data }: { boardId: number; name: string; sort_order?: number; color?: string; group_by?: string | null; group_value?: string | null }) =>
      apiFetch<KanbanSwimlane>(`/kanban/boards/${boardId}/swimlanes`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (_, { boardId }) => qc.invalidateQueries({ queryKey: ['kanban-board', boardId] }),
  });
}

export function useDeleteSwimlane() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, boardId }: { id: number; boardId: number }) =>
      apiFetch(`/kanban/swimlanes/${id}`, { method: 'DELETE' }),
    onSuccess: (_, { boardId }) => qc.invalidateQueries({ queryKey: ['kanban-board', boardId] }),
  });
}

export function useAutoGenerateSwimlanes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, group_by }: { boardId: number; group_by: string }) =>
      apiFetch<KanbanSwimlane[]>(`/kanban/boards/${boardId}/swimlanes/auto-generate`, { method: 'POST', body: JSON.stringify({ group_by }) }),
    onSuccess: (_, { boardId }) => qc.invalidateQueries({ queryKey: ['kanban-board', boardId] }),
  });
}

export function useAddTicketToBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, ...data }: { boardId: number; ticket_id: number; column_id: number; swimlane_id?: number }) =>
      apiFetch(`/kanban/boards/${boardId}/tickets`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (_, { boardId }) => qc.invalidateQueries({ queryKey: ['kanban-board', boardId] }),
  });
}

export function useMoveTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ positionId, boardId, ...data }: { positionId: number; boardId: number; column_id: number; swimlane_id?: number; sort_order?: number }) =>
      apiFetch(`/kanban/tickets/${positionId}/move`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: (_, { boardId }) => qc.invalidateQueries({ queryKey: ['kanban-board', boardId] }),
  });
}
