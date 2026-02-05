import { create } from 'zustand';

interface UiState {
  sidebarOpen: boolean;
  selectedTicketId: number | null;
  selectedBoardId: number | null;
  toggleSidebar: () => void;
  selectTicket: (id: number | null) => void;
  selectBoard: (id: number | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  selectedTicketId: null,
  selectedBoardId: null,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  selectTicket: (id) => set({ selectedTicketId: id }),
  selectBoard: (id) => set({ selectedBoardId: id }),
}));
