import { useTopicsStore } from '../store/useTopicsStore';
import { useFavoritesStore } from '../store/useFavoritesStore';
import { useCollectionsStore } from '../store/useCollectionsStore';
import { useUserQuotesStore } from '../store/useUserQuotesStore';
import { TOPIC_FAVORITES, TOPIC_GENERAL, TOPIC_MYQUOTES } from '../constants/categories';
import {
  fetchQuotesByCategory,
  fetchQuotesForNotifications,
  ApiQuote,
} from './quotesApi';

/** Draw from whatever the user currently follows. The default. */
export const SOURCE_FOLLOWING = 'following';

/** A single collection, e.g. `collection:abc123`. */
export const COLLECTION_PREFIX = 'collection:';

export interface NotifQuote {
  content: string;
  author: string;
  id: string;
}

/**
 * Page size for category-backed reminders. iOS holds up to 64 pending
 * notifications, so the default 25 meant a topic-backed schedule started
 * repeating itself less than halfway through.
 */
const CATEGORY_PAGE = 50;

/**
 * Last resort when the device is offline at reschedule time and every source
 * comes back empty. More than one, because the scheduler cycles this list
 * across every slot it fills: a single entry meant a full offline schedule of
 * identical notifications.
 */
const OFFLINE_FALLBACK: NotifQuote[] = [
  { content: 'The only way to do great work is to love what you do.', author: 'Steve Jobs', id: 'fallback-1' },
  { content: 'What we think, we become.', author: 'Buddha', id: 'fallback-2' },
  { content: 'It always seems impossible until it is done.', author: 'Nelson Mandela', id: 'fallback-3' },
  { content: 'The best way out is always through.', author: 'Robert Frost', id: 'fallback-4' },
  { content: 'Whether you think you can or you think you cannot, you are right.', author: 'Henry Ford', id: 'fallback-5' },
  { content: 'Well done is better than well said.', author: 'Benjamin Franklin', id: 'fallback-6' },
  { content: 'The journey of a thousand miles begins with one step.', author: 'Lao Tzu', id: 'fallback-7' },
  { content: 'He who has a why to live can bear almost any how.', author: 'Friedrich Nietzsche', id: 'fallback-8' },
  { content: 'Everything you want is on the other side of fear.', author: 'George Addair', id: 'fallback-9' },
  { content: 'Quality is not an act, it is a habit.', author: 'Aristotle', id: 'fallback-10' },
];

const toNotif = (q: ApiQuote): NotifQuote => ({
  content: q.content,
  author: q.author,
  id: q._id,
});

function favoriteQuotes(): NotifQuote[] {
  return useFavoritesStore.getState().favorites.map(f => ({
    content: f.text,
    author: f.author,
    id: f.id,
  }));
}

function ownQuotes(): NotifQuote[] {
  return useUserQuotesStore.getState().userQuotes.map(q => ({
    content: q.text,
    author: q.author,
    id: q.id,
  }));
}

function collectionQuotes(collectionId: string): NotifQuote[] {
  const c = useCollectionsStore.getState().collections.find(x => x.id === collectionId);
  return (c?.quotes ?? []).map(q => ({ content: q.text, author: q.author, id: q.id }));
}

/** Round-robin so no single topic dominates the front of the schedule. */
function interleave(pools: NotifQuote[][]): NotifQuote[] {
  const out: NotifQuote[] = [];
  const longest = pools.length > 0 ? Math.max(...pools.map(p => p.length)) : 0;
  for (let i = 0; i < longest; i++) {
    for (const pool of pools) if (pool[i]) out.push(pool[i]);
  }
  return out;
}

async function followedQuotes(count: number): Promise<NotifQuote[]> {
  const followed = useTopicsStore.getState().followed;
  const realTopics = followed.filter(t => !t.startsWith('_'));

  const pools: NotifQuote[][] = [];
  if (realTopics.length > 0) {
    const fetched = await Promise.all(realTopics.map(t => fetchQuotesByCategory(t, CATEGORY_PAGE)));
    pools.push(...fetched.map(list => list.map(toNotif)));
  }
  if (followed.includes(TOPIC_GENERAL) || realTopics.length === 0) {
    pools.push((await fetchQuotesForNotifications(count)).map(toNotif));
  }

  const out = interleave(pools);
  if (followed.includes(TOPIC_FAVORITES)) out.push(...favoriteQuotes());
  if (followed.includes(TOPIC_MYQUOTES)) out.push(...ownQuotes());
  return out;
}

/**
 * Quotes for scheduled notifications, drawn from whichever source the user
 * picked in Reminders.
 *
 * Local sources (favorites, a collection, your own quotes) are finite and can
 * be empty or shorter than `count`. The caller cycles through whatever comes
 * back, and an empty result falls back to the general pool so a reminder never
 * silently stops firing because a collection was emptied.
 */
export async function resolveNotificationQuotes(
  source: string,
  count: number,
): Promise<NotifQuote[]> {
  let quotes: NotifQuote[] = [];

  try {
    if (source.startsWith(COLLECTION_PREFIX)) {
      quotes = collectionQuotes(source.slice(COLLECTION_PREFIX.length));
    } else if (source === TOPIC_FAVORITES) {
      quotes = favoriteQuotes();
    } else if (source === TOPIC_MYQUOTES) {
      quotes = ownQuotes();
    } else if (source === SOURCE_FOLLOWING) {
      quotes = await followedQuotes(count);
    } else if (source === TOPIC_GENERAL) {
      quotes = (await fetchQuotesForNotifications(count)).map(toNotif);
    } else {
      quotes = (await fetchQuotesByCategory(source, CATEGORY_PAGE)).map(toNotif);
    }
  } catch {
    quotes = [];
  }

  if (quotes.length > 0) return quotes;

  // Source came back empty — an emptied collection, no favorites yet, or a
  // failed request. Fall back rather than schedule nothing.
  try {
    const general = (await fetchQuotesForNotifications(count)).map(toNotif);
    if (general.length > 0) return general;
  } catch {
    // Offline or the API is down — fall through.
  }
  return OFFLINE_FALLBACK;
}
