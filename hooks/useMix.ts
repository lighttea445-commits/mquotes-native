import { useMixStore } from '../store/useMixStore';
import { useFavoritesStore } from '../store/useFavoritesStore';
import { useUserQuotesStore } from '../store/useUserQuotesStore';
import {
  fetchQuotesByCategory,
  fetchMultipleRandomQuotes,
  ApiQuote,
} from '../lib/quotesApi';

export function useMix() {
  const { selectedCategories, mixActive, setCategories, clearMix } = useMixStore();
  const favorites = useFavoritesStore((s) => s.favorites);
  const userQuotes = useUserQuotesStore((s) => s.userQuotes);

  /**
   * Load quotes for the active mix. Filters out special categories
   * (_favorites, _myquotes) and handles them locally, while real
   * categories are fetched from the API with keyword filtering.
   */
  const loadQuotesForMix = async (): Promise<ApiQuote[]> => {
    if (selectedCategories.length === 0) {
      return fetchMultipleRandomQuotes(20);
    }

    const realCats = selectedCategories.filter(c => !c.startsWith('_'));
    const includesFavorites = selectedCategories.includes('_favorites');
    const includesMyQuotes = selectedCategories.includes('_myquotes');

    // Build local quote pools for special categories
    const localQuotes: ApiQuote[] = [];

    if (includesFavorites) {
      favorites.forEach(f => {
        localQuotes.push({
          _id: f.id,
          content: f.text,
          author: f.author,
          tags: [],
          authorSlug: '',
          length: f.text.length,
        });
      });
    }

    if (includesMyQuotes) {
      userQuotes.forEach(q => {
        localQuotes.push({
          _id: q.id,
          content: q.text,
          author: q.author,
          tags: [],
          authorSlug: '',
          length: q.text.length,
        });
      });
    }

    // Fetch from API for real categories in parallel
    let apiResults: ApiQuote[][] = [];
    if (realCats.length > 0) {
      apiResults = await Promise.all(realCats.map(cat => fetchQuotesByCategory(cat)));
    }

    // Round-robin interleave API results
    const merged: ApiQuote[] = [];
    const maxLen = apiResults.length > 0 ? Math.max(...apiResults.map(r => r.length)) : 0;
    for (let i = 0; i < maxLen; i++) {
      for (const arr of apiResults) {
        if (arr[i]) merged.push(arr[i]);
      }
    }

    // Combine with local quotes
    const all = [...merged, ...localQuotes];

    if (all.length === 0) return fetchMultipleRandomQuotes(20);

    // Shuffle
    return all.sort(() => Math.random() - 0.5);
  };

  return {
    selectedCategories,
    mixActive,
    setCategories,
    clearMix,
    loadQuotesForMix,
  };
}
