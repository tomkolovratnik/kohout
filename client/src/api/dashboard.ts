import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { RecentActivity, Ticket } from '@kohout/shared';

export function useRecentActivity() {
  return useQuery({
    queryKey: ['dashboard-recent'],
    queryFn: () => apiFetch<RecentActivity[]>('/dashboard/recent'),
  });
}

export function usePinnedTickets() {
  return useQuery({
    queryKey: ['dashboard-pinned'],
    queryFn: () => apiFetch<Ticket[]>('/dashboard/pinned'),
  });
}
