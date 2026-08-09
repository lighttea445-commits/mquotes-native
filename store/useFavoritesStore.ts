import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandMMKVStorage } from '../lib/storage';
import { CATEGORIES } from '../constants/categories';

/**
 * Favorites needed before the feed counts as personalised. Drives the goal pill
 * on the quote screen, its explainer sheet, and the completion toast.
 */
export const FAVORITES_GOAL = 5;

export interface FavoriteQuote {
  id: string;
  text: string;
  author: string;
  category: string;
  tags?: string[];   // all Quotable API tags (lowercase) for For You inference
  savedAt: string; // ISO timestamp
}

interface FavoritesState {
  favorites: FavoriteQuote[];
  forYouCategoryIds: string[];  // persisted — stable across remounts
  forYouTier: number;           // last tier at which forYouCategoryIds was computed

  // Actions
  addFavorite: (quote: Omit<FavoriteQuote, 'savedAt'>) => void;
  removeFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (quote: Omit<FavoriteQuote, 'savedAt'>) => boolean; // returns new state
  clearFavorites: () => void;
}

/** Score all categories by frequency across all favorited quotes' tags. */
function computeForYouCategories(favorites: FavoriteQuote[]): string[] {
  const tagScores: Record<string, number> = {};
  for (const fav of favorites) {
    const sources = fav.tags && fav.tags.length > 0 ? fav.tags : [fav.category];
    for (const tag of sources) {
      const key = tag.toLowerCase();
      tagScores[key] = (tagScores[key] ?? 0) + 1;
    }
  }

  const scored = CATEGORIES.map(cat => ({
    id: cat.id,
    score: tagScores[cat.apiTag.toLowerCase()] ?? 0,
  }));

  const withScore = scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(s => s.id);

  const withoutScore = scored
    .filter(s => s.score === 0)
    .map(s => s.id);

  // Fisher-Yates shuffle the unscored pool once per recompute
  for (let i = withoutScore.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [withoutScore[i], withoutScore[j]] = [withoutScore[j], withoutScore[i]];
  }

  return [...withScore, ...withoutScore].slice(0, 5);
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      forYouCategoryIds: computeForYouCategories([]),
      forYouTier: 0,

      addFavorite: (quote) => {
        const { favorites, forYouTier } = get();
        if (favorites.some(f => f.id === quote.id)) return;
        const newFavorites = [{ ...quote, savedAt: new Date().toISOString() }, ...favorites];
        const newTier = Math.floor(newFavorites.length / 5);
        const updates: Partial<FavoritesState> = { favorites: newFavorites };
        if (newTier !== forYouTier) {
          updates.forYouCategoryIds = computeForYouCategories(newFavorites);
          updates.forYouTier = newTier;
        }
        set(updates);
      },

      removeFavorite: (id) => {
        const { favorites, forYouTier } = get();
        const newFavorites = favorites.filter(f => f.id !== id);
        const newTier = Math.floor(newFavorites.length / 5);
        const updates: Partial<FavoritesState> = { favorites: newFavorites };
        if (newTier !== forYouTier) {
          updates.forYouCategoryIds = computeForYouCategories(newFavorites);
          updates.forYouTier = newTier;
        }
        set(updates);
      },

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

      clearFavorites: () =>
        set({
          favorites: [],
          forYouCategoryIds: computeForYouCategories([]),
          forYouTier: 0,
        }),
    }),
    {
      name: 'favorites-store',
      storage: createJSONStorage(() => zustandMMKVStorage),
    },
  ),
);
