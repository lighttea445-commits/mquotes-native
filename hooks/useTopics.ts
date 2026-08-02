import { useTopicsStore } from '../store/useTopicsStore';
import { useFavoritesStore } from '../store/useFavoritesStore';
import { useUserQuotesStore } from '../store/useUserQuotesStore';
import { TOPIC_GENERAL, TOPIC_FAVORITES, TOPIC_MYQUOTES } from '../constants/categories';
import {
  fetchQuotesByCategory,
  fetchMultipleRandomQuotes,
  ApiQuote,
} from '../lib/quotesApi';

export function useTopics() {
  const followed = useTopicsStore((s) => s.followed);
  const favorites = useFavoritesStore((s) => s.favorites);
  const userQuotes = useUserQuotesStore((s) => s.userQuotes);

  /**
   * Build the feed from everything the user follows.
   *
   * API-backed topics are fetched in parallel and interleaved round-robin so
   * no single topic dominates the front of the buffer; local pools (favorites,
   * own quotes) are appended, then the whole thing is shuffled.
   *
   * Following nothing falls back to the general pool rather than an empty
   * screen — unfollowing your last topic should not brick the app.
   */
  const loadQuotesForTopics = async (): Promise<ApiQuote[]> => {
    if (followed.length === 0) return fetchMultipleRandomQuotes(20);

    const realTopics = followed.filter(t => !t.startsWith('_'));
    const wantsGeneral = followed.includes(TOPIC_GENERAL);

    const pools: ApiQuote[][] = [];

    if (realTopics.length > 0) {
      pools.push(...(await Promise.all(realTopics.map(t => fetchQuotesByCategory(t)))));
    }

    if (wantsGeneral || realTopics.length === 0) {
      pools.push(await fetchMultipleRandomQuotes(20));
    }

    // Round-robin interleave so each topic contributes near the top
    const merged: ApiQuote[] = [];
    const longest = pools.length > 0 ? Math.max(...pools.map(p => p.length)) : 0;
    for (let i = 0; i < longest; i++) {
      for (const pool of pools) {
        if (pool[i]) merged.push(pool[i]);
      }
    }

    const local: ApiQuote[] = [];

    if (followed.includes(TOPIC_FAVORITES)) {
      favorites.forEach(f => {
        local.push({
          _id: f.id,
          content: f.text,
          author: f.author,
          tags: [],
          authorSlug: '',
          length: f.text.length,
        });
      });
    }

    if (followed.includes(TOPIC_MYQUOTES)) {
      userQuotes.forEach(q => {
        local.push({
          _id: q.id,
          content: q.text,
          author: q.author,
          tags: [],
          authorSlug: '',
          length: q.text.length,
        });
      });
    }

    const all = [...merged, ...local];
    if (all.length === 0) return [];

    return all.sort(() => Math.random() - 0.5);
  };

  return { followed, loadQuotesForTopics };
}
