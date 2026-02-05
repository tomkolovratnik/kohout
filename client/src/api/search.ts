import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { SearchResult } from '@kohout/shared';

export function useSearch(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: () => apiFetch<SearchResult[]>(`/search?q=${encodeURIComponent(query)}`),
    enabled: query.length >= 2,
  });
}
