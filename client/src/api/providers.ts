import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { IntegrationProviderConfig, FetchMyTicketsRequest, FetchMyTicketsResult } from '@kohout/shared';

export function useProviders() {
  return useQuery({
    queryKey: ['providers'],
    queryFn: () => apiFetch<IntegrationProviderConfig[]>('/settings/providers'),
  });
}

export function useCreateProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<IntegrationProviderConfig, 'id' | 'created_at' | 'updated_at'>) =>
      apiFetch<IntegrationProviderConfig>('/settings/providers', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['providers'] }),
  });
}

export function useUpdateProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: IntegrationProviderConfig) =>
      apiFetch<IntegrationProviderConfig>(`/settings/providers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['providers'] }),
  });
}

export function useDeleteProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/settings/providers/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['providers'] }),
  });
}

export function useTestConnection() {
  return useMutation({
    mutationFn: (id: number) => apiFetch<{ success: boolean; error?: string }>(`/settings/providers/${id}/test`, { method: 'POST' }),
  });
}

export function useFetchMyTickets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: FetchMyTicketsRequest) =>
      apiFetch<FetchMyTicketsResult>('/sync/fetch-my-tickets', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['folder-tree'] });
      qc.invalidateQueries({ queryKey: ['ticket-tags'] });
      qc.invalidateQueries({ queryKey: ['ticket-categories'] });
    },
  });
}
