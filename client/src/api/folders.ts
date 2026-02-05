import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { Folder, FolderTreeNode } from '@kohout/shared';

interface FolderTreeResponse {
  tree: FolderTreeNode[];
  unfiled_count: number;
}

export function useFolderTree() {
  return useQuery({
    queryKey: ['folder-tree'],
    queryFn: () => apiFetch<FolderTreeResponse>('/folders/tree'),
  });
}

export function useCreateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; parent_id?: number | null; color?: string; icon?: string; sort_order?: number }) =>
      apiFetch<Folder>('/folders', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['folder-tree'] }),
  });
}

export function useUpdateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; name: string; color?: string | null; icon?: string | null; sort_order?: number }) =>
      apiFetch<Folder>(`/folders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['folder-tree'] }),
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/folders/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['folder-tree'] });
      qc.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

export function useMoveFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, parent_id, sort_order }: { id: number; parent_id: number | null; sort_order?: number }) =>
      apiFetch<Folder>(`/folders/${id}/move`, { method: 'PATCH', body: JSON.stringify({ parent_id, sort_order: sort_order ?? 0 }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['folder-tree'] }),
  });
}

export function useAssignTicketFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, folder_id }: { ticketId: number; folder_id: number | null }) =>
      apiFetch(`/tickets/${ticketId}/folder`, { method: 'PATCH', body: JSON.stringify({ folder_id }) }),
    onSuccess: (_, { ticketId }) => {
      qc.invalidateQueries({ queryKey: ['folder-tree'] });
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: ['ticket', ticketId] });
    },
  });
}
