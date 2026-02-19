import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandMMKVStorage } from '../lib/storage';

export interface FavoriteQuote {
  id: string;
  text: string;
  author: string;
  category: string;
  savedAt: string; // ISO timestamp
}

interface FavoritesState {
  favorites: FavoriteQuote[];

  // Actions
  addFavorite: (quote: Omit<FavoriteQuote, 'savedAt'>) => void;
  removeFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (quote: Omit<FavoriteQuote, 'savedAt'>) => boolean; // returns new state
  clearFavorites: () => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],

      addFavorite: (quote) => {
        const { favorites } = get();
        if (favorites.some(f => f.id === quote.id)) return;
        set({
          favorites: [
            { ...quote, savedAt: new Date().toISOString() },
            ...favorites,
          ],
        });
      },

      removeFavorite: (id) =>
        set((state) => ({
          favorites: state.favorites.filter(f => f.id !== id),
        })),

      isFavorite: (id) => get().favorites.some(f => f.id === id),

      toggleFavorite: (quote) => {
        const { isFavorite, addFavorite, removeFavorite } = get();
        if (isFavorite(quote.id)) {
          removeFavorite(quote.id);
          return false;
        } else {
          addFavorite(quote);
          return true;
        }
      },

      clearFavorites: () => set({ favorites: [] }),
    }),
    {
      name: 'favorites-store',
      storage: createJSONStorage(() => zustandMMKVStorage),
    },
  ),
);
