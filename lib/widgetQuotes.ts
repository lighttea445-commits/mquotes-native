/**
 * Shared quote resolution for widgets.
 *
 * One place that turns a WidgetQuoteType into actual quotes, used by:
 *   • widget/widgetTaskHandler.ts   (Android headless refresh, one quote)
 *   • components/screens/WidgetsScreen.tsx (manual update, one quote)
 *   • modules/widget-bridge         (iOS queue, many quotes)
 *
 * Must stay free of React and component imports — the Android headless task
 * loads this before any UI exists.
 */

import type { WidgetQuoteType } from '../store/useWidgetStore';
import {
  fetchMultipleRandomQuotes,
  fetchQuotesByCategory,
  fetchQuotesForNotifications,
} from './quotesApi';
import { useFavoritesStore } from '../store/useFavoritesStore';
import { useUserQuotesStore } from '../store/useUserQuotesStore';

export interface WidgetQuote {
  id?: string;
  text: string;
  author: string;
}

/** Absolute fallback — never render a blank widget. */
export const FALLBACK_WIDGET_QUOTE: WidgetQuote = {
  id: '',
  text: 'The only way to do great work is to love what you do.',
  author: 'Steve Jobs',
};

/**
 * Waits for a persisted Zustand store to hydrate. The Android headless task
 * gets a fresh JS engine, so favorites/my-quotes are empty until this resolves.
 */
export function waitForHydration(store: {
  persist?: { hasHydrated: () => boolean; onFinishHydration: (cb: () => void) => () => void };
}): Promise<void> {
  return new Promise((resolve) => {
    if (!store.persist || store.persist.hasHydrated()) { resolve(); return; }
    const unsub = store.persist.onFinishHydration(() => { unsub(); resolve(); });
  });
}

function sample<T>(items: T[], count: number): T[] {
  if (items.length <= count) return [...items];
  const pool = [...items];
  const picked: T[] = [];
  while (picked.length < count && pool.length > 0) {
    picked.push(...pool.splice(Math.floor(Math.random() * pool.length), 1));
  }
  return picked;
}

/**
 * General quotes. `count > 1` goes straight to the API rather than through
 * fetchMultipleRandomQuotes, which drains the shared card-stack cache — a
 * 48-quote widget queue would empty the user's browsing stack.
 */
async function fetchGeneral(count: number): Promise<WidgetQuote[]> {
  const fresh = count > 1
    ? await fetchQuotesForNotifications(count)
    : await fetchMultipleRandomQuotes(1);
  return fresh.slice(0, count).map((q) => ({ id: q._id, text: q.content, author: q.author }));
}

/**
 * Resolves up to `count` quotes for a widget's configured source.
 *
 * May return fewer than requested (a category can hold less, favorites can be
 * short) — callers must handle a short list rather than assume `count`. Returns
 * an empty array only when the network failed and there is nothing stored.
 */
export async function resolveWidgetQuotes(
  quoteType: WidgetQuoteType,
  count = 1,
): Promise<WidgetQuote[]> {
  const wanted = Math.max(1, count);

  try {
    if (quoteType === 'favorites') {
      await waitForHydration(useFavoritesStore);
      const favs = useFavoritesStore.getState().favorites;
      if (favs.length > 0) {
        return sample(favs, wanted).map((f) => ({ id: f.id, text: f.text, author: f.author }));
      }
      // No favorites saved yet — fall back to general.
      return fetchGeneral(wanted);
    }

    if (quoteType === 'my-quotes') {
      await waitForHydration(useUserQuotesStore);
      const mine = useUserQuotesStore.getState().userQuotes;
      if (mine.length > 0) {
        return sample(mine, wanted).map((q) => ({ id: q.id, text: q.text, author: q.author }));
      }
      // No user quotes yet — fall back to general.
      return fetchGeneral(wanted);
    }

    if (quoteType === 'general') {
      return fetchGeneral(wanted);
    }

    // Category tag (wisdom, motivational, etc.)
    const byCategory = await fetchQuotesByCategory(quoteType);
    return sample(byCategory, wanted).map((q) => ({ id: q._id, text: q.content, author: q.author }));
  } catch {
    return [];
  }
}

/** Single-quote convenience wrapper. */
export async function resolveWidgetQuote(quoteType: WidgetQuoteType): Promise<WidgetQuote | null> {
  const [quote] = await resolveWidgetQuotes(quoteType, 1);
  return quote ?? null;
}
