import { create } from 'zustand';

type TicketViewMode = 'cards' | 'compact';

interface UiState {
  selectedTicketId: number | null;
  selectedBoardId: number | null;
  ticketViewMode: TicketViewMode;
  selectTicket: (id: number | null) => void;
  selectBoard: (id: number | null) => void;
  setTicketViewMode: (mode: TicketViewMode) => void;
}

const storedViewMode = localStorage.getItem('kohout-ticket-view-mode') as TicketViewMode | null;

export const useUiStore = create<UiState>((set) => ({
  selectedTicketId: null,
  selectedBoardId: null,
  ticketViewMode: storedViewMode === 'compact' ? 'compact' : 'cards',
  selectTicket: (id) => set({ selectedTicketId: id }),
  selectBoard: (id) => set({ selectedBoardId: id }),
  setTicketViewMode: (mode) => {
    localStorage.setItem('kohout-ticket-view-mode', mode);
    set({ ticketViewMode: mode });
  },
}));
