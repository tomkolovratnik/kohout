import { create } from 'zustand';

interface FiltersState {
  q: string;
  status: string;
  priority: string;
  provider_type: string;
  assignee: string;
  category_id: string;
  tag_id: string;
  folder_id: string;
  sort_by: string;
  sort_order: 'asc' | 'desc';
  page: number;
  setFilter: (key: string, value: string) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
}

const initialFilters = {
  q: '',
  status: '',
  priority: '',
  provider_type: '',
  assignee: '',
  category_id: '',
  tag_id: '',
  folder_id: '',
  sort_by: 'updated_at',
  sort_order: 'desc' as const,
  page: 1,
};

export const useFiltersStore = create<FiltersState>((set) => ({
  ...initialFilters,
  setFilter: (key, value) => set({ [key]: value, page: 1 }),
  resetFilters: () => set(initialFilters),
  setPage: (page) => set({ page }),
}));
