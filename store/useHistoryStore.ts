import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandMMKVStorage } from '../lib/storage';

export interface HistoryQuote {
  id: string;
  text: string;
  author: string;
  category: string;
  viewedAt: string; // ISO timestamp
}

const MAX_HISTORY = 100;

interface HistoryState {
  history: HistoryQuote[];

  // Actions
  addToHistory: (quote: Omit<HistoryQuote, 'viewedAt'>) => void;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      history: [],

      addToHistory: (quote) =>
        set((state) => {
          const filtered = state.history.filter(h => h.id !== quote.id);
          const updated = [
            { ...quote, viewedAt: new Date().toISOString() },
            ...filtered,
          ];
          return { history: updated.slice(0, MAX_HISTORY) };
        }),

      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'history-store',
      storage: createJSONStorage(() => zustandMMKVStorage),
    },
  ),
);
