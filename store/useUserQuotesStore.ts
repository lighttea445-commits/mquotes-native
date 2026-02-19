import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandMMKVStorage } from '../lib/storage';

export interface UserQuote {
  id: string;
  text: string;
  author: string;
  createdAt: string; // ISO timestamp
}

interface UserQuotesState {
  userQuotes: UserQuote[];

  // Actions
  addQuote: (text: string, author?: string) => void;
  removeQuote: (id: string) => void;
  editQuote: (id: string, text: string, author: string) => void;
}

export const useUserQuotesStore = create<UserQuotesState>()(
  persist(
    (set) => ({
      userQuotes: [],

      addQuote: (text, author = 'Me') =>
        set((state) => ({
          userQuotes: [
            {
              id: `user-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              text,
              author,
              createdAt: new Date().toISOString(),
            },
            ...state.userQuotes,
          ],
        })),

      removeQuote: (id) =>
        set((state) => ({
          userQuotes: state.userQuotes.filter(q => q.id !== id),
        })),

      editQuote: (id, text, author) =>
        set((state) => ({
          userQuotes: state.userQuotes.map(q =>
            q.id === id ? { ...q, text, author } : q,
          ),
        })),
    }),
    {
      name: 'user-quotes-store',
      storage: createJSONStorage(() => zustandMMKVStorage),
    },
  ),
);
