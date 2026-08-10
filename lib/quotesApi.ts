// Quotes API — Quotable (api.quotable.kurokeita.dev) direct calls

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCategoryApiTag, CATEGORIES } from '../constants/categories';

const QUOTABLE_BASE = 'https://api.quotable.kurokeita.dev/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface KurokuoteQuote {
  id: string;
  content: string;
  tags: { id: string; name: string }[];
  author: { id: string; name: string; slug: string; description: string; bio: string };
}

export interface ApiQuote {
  _id: string;
  content: string;
  author: string;
  tags: string[];
  authorSlug: string;
  length: number;
}

export interface Quote {
  id: string;
  text: string;
  author: string;
  category: string;
}

// ─── Response transformation ──────────────────────────────────────────────────

/**
 * Fix mojibake: UTF-8 characters that were decoded as Latin-1/Windows-1252.
 * e.g. "â€™" (bytes E2 80 99 misread) → "'" (U+2019)
 */
function fixMojibake(str: string): string {
  return str
    .replace(/â€™/g, '\u2019')   // '  right single quote / apostrophe
    .replace(/â€˜/g, '\u2018')   // '  left single quote
    .replace(/â€œ/g, '\u201C')   // "  left double quote
    .replace(/â€\u009D/g, '\u201D') // "  right double quote (control char variant)
    .replace(/â€"/g, '\u2014')   // —  em dash
    .replace(/â€"/g, '\u2013')   // –  en dash
    .replace(/â€¦/g, '\u2026')   // …  ellipsis
    .replace(/Ã©/g, '\u00E9')    // é
    .replace(/Ã¨/g, '\u00E8')    // è
    .replace(/Ã /g, '\u00E0')    // à
    .replace(/Ã¢/g, '\u00E2')    // â
    .replace(/Ã®/g, '\u00EE')    // î
    .replace(/Ã´/g, '\u00F4')    // ô
    .replace(/Ã»/g, '\u00FB')    // û
    .replace(/Ã§/g, '\u00E7')    // ç
    .replace(/Ã«/g, '\u00EB')    // ë
    .replace(/Ã¯/g, '\u00EF')    // ï
    .replace(/Ã¼/g, '\u00FC')    // ü
    .replace(/Ã¶/g, '\u00F6')    // ö
    .replace(/Ã¤/g, '\u00E4')    // ä
    .replace(/Ã/g, '\u00C0');    // À and similar leftovers
}

function toApiQuote(q: KurokuoteQuote): ApiQuote {
  const content = fixMojibake(q.content);
  return {
    _id: q.id,
    content,
    author: fixMojibake(q.author.name),
    authorSlug: q.author.slug,
    tags: q.tags.map(t => t.name.toLowerCase()),
    length: content.length,
  };
}

// ─── In-memory + AsyncStorage cache (random quotes only) ─────────────────────

let cachedQuotes: ApiQuote[] = [];
const seenIds = new Set<string>();

// Keep seenIds bounded so it doesn't grow indefinitely over a long session.
const MAX_SEEN_IDS = 2000;

const PERSIST_KEY = 'quotesApi:random:v2';
const PERSIST_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface PersistedCache {
  quotes: ApiQuote[];
  savedAt: number;
  seenIds?: string[]; // persisted for cross-session deduplication
}

let cacheLoaded = false;

async function loadPersistedCache(): Promise<void> {
  if (cacheLoaded) return;
  cacheLoaded = true;
  try {
    const raw = await AsyncStorage.getItem(PERSIST_KEY);
    if (!raw) return;
    const parsed: PersistedCache = JSON.parse(raw);
    if (Date.now() - parsed.savedAt > PERSIST_TTL_MS) return; // stale — skip
    // Restore seen IDs from previous session for cross-session deduplication
    if (parsed.seenIds) {
      parsed.seenIds.forEach(id => seenIds.add(id));
    }
    const fresh = parsed.quotes.filter(q => !seenIds.has(q._id));
    fresh.forEach(q => seenIds.add(q._id));
    cachedQuotes = [...cachedQuotes, ...fresh];
  } catch {}
}

function persistCache(): void {
  const entry: PersistedCache = {
    quotes: cachedQuotes,
    savedAt: Date.now(),
    seenIds: Array.from(seenIds).slice(-MAX_SEEN_IDS),
  };
  AsyncStorage.setItem(PERSIST_KEY, JSON.stringify(entry)).catch(() => {});
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ─── Core fetch ───────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 8000;

/**
 * Fetch random quotes, optionally filtered by a Quotable API tag name.
 * `limit` must be one of: 10, 25, 50, 100.
 */
async function fetchFromApi(limit: 10 | 25 | 50 | 100 = 50, tag?: string): Promise<ApiQuote[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const params = new URLSearchParams({ limit: String(limit) });
    if (tag) params.set('tags', tag);
    const res = await fetch(`${QUOTABLE_BASE}/quotes/random?${params}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`Quotable ${res.status}`);
    const data = await res.json() as { quotes: KurokuoteQuote[] };
    return (data.quotes ?? []).map(toApiQuote);
  } catch (err) {
    if (__DEV__) console.error('Quotable fetch error:', err);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

const MAX_CACHE_ITERATIONS = 5;

// Shared promise so concurrent callers don't all fire API requests simultaneously.
let _ensureCachePromise: Promise<void> | null = null;

async function _refillCache(minCount: number): Promise<void> {
  let iterations = 0;
  while (cachedQuotes.length < minCount && iterations < MAX_CACHE_ITERATIONS) {
    iterations++;
    const fresh = await fetchFromApi(50);
    if (fresh.length === 0) break;
    const deduped = fresh.filter(q => !seenIds.has(q._id));
    // Trim seenIds to prevent unbounded growth
    if (seenIds.size > MAX_SEEN_IDS) {
      const entries = Array.from(seenIds);
      entries.slice(0, entries.length - MAX_SEEN_IDS).forEach(id => seenIds.delete(id));
    }
    deduped.forEach(q => seenIds.add(q._id));
    cachedQuotes = [...cachedQuotes, ...deduped];
    persistCache();
  }
}

async function ensureCache(minCount = 10): Promise<void> {
  await loadPersistedCache();
  if (cachedQuotes.length >= minCount) return;
  if (!_ensureCachePromise) {
    _ensureCachePromise = _refillCache(minCount).finally(() => {
      _ensureCachePromise = null;
    });
  }
  return _ensureCachePromise;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchRandomQuote(): Promise<ApiQuote | null> {
  await ensureCache();
  return cachedQuotes.shift() ?? null;
}

/**
 * Fetch a batch of quotes for notification scheduling.
 * Goes directly to the API — never touches the shared card-stack cache so
 * scheduling notifications doesn't drain the user's browsing queue.
 */
export async function fetchQuotesForNotifications(count: number): Promise<ApiQuote[]> {
  const limit: 10 | 25 | 50 | 100 =
    count <= 10 ? 10 : count <= 25 ? 25 : count <= 50 ? 50 : 100;
  return shuffleArray(await fetchFromApi(limit));
}

/**
 * Fetch a single truly random quote for widget use.
 * Goes directly to the API every time — bypasses the main app cache so the
 * widget always gets a fresh quote without consuming from the card stack.
 */
export async function fetchWidgetRandomQuote(): Promise<ApiQuote | null> {
  const quotes = await fetchFromApi(25);
  if (quotes.length === 0) return null;
  return quotes[Math.floor(Math.random() * quotes.length)];
}

export async function fetchMultipleRandomQuotes(count = 20): Promise<ApiQuote[]> {
  await ensureCache(count + 10);
  return shuffleArray(cachedQuotes.splice(0, count));
}

/**
 * Fetch quotes for a category using Quotable's server-side tag filter.
 * `category` is the app's internal id (e.g. 'wisdom').
 *
 * `limit` exists for the iOS widget queue, which is 48 long: at the default of
 * 25 a category-backed widget rotated through half the quotes a general one
 * did. Card-stack callers keep the smaller page.
 */
export async function fetchQuotesByCategory(
  category: string,
  limit: 25 | 50 = 25,
): Promise<ApiQuote[]> {
  const tag = getCategoryApiTag(category);
  return shuffleArray(await fetchFromApi(limit, tag));
}

/** Topics delegate to category fetching. */
export async function fetchQuotesByTopic(topicId: string): Promise<ApiQuote[]> {
  return fetchQuotesByCategory(topicId);
}

// Mood → closest Quotable tag
const moodTagMap: Record<string, string> = {
  motivated:  'Motivational',
  anxious:    'Wisdom',
  sad:        'Inspirational',
  confident:  'Success',
  grateful:   'Life',
  lost:       'Wisdom',
  awesome:    'Happiness',
  good:       'Happiness',
  neutral:    'Philosophy',
  bad:        'Inspirational',
  terrible:   'Inspirational',
  other:      'Life',
};

export async function fetchQuotesByMood(moodId: string): Promise<ApiQuote[]> {
  const tag = moodTagMap[moodId] ?? 'Inspirational';
  return shuffleArray(await fetchFromApi(25, tag));
}

export async function fetchQuotesByAuthor(authorSlug: string): Promise<ApiQuote[]> {
  await ensureCache(50);
  const name = authorSlug.replace(/-/g, ' ').toLowerCase();
  return cachedQuotes.filter(q => q.author.toLowerCase().includes(name));
}

export async function fetchQuotesByTags(tags: string[]): Promise<ApiQuote[]> {
  if (tags.length === 0) return fetchMultipleRandomQuotes(15);
  return fetchQuotesByCategory(tags[0]);
}

/**
 * Fetch a single quote by its Quotable API id.
 * Used when a notification or widget tap passes a specific quoteId.
 * Returns null if the quote is not found or on network error.
 */
export async function fetchQuoteById(id: string): Promise<ApiQuote | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${QUOTABLE_BASE}/quotes/${id}`, { signal: controller.signal });
    if (!res.ok) return null;
    const data = await res.json() as KurokuoteQuote;
    return toApiQuote(data);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Conversion helpers ───────────────────────────────────────────────────────

/** Map a quote's Quotable tags back to an app category id. Falls back to 'wisdom'. */
export function inferCategory(_text: string, apiTags?: string[]): string {
  if (apiTags && apiTags.length > 0) {
    for (const tag of apiTags) {
      const match = CATEGORIES.find(c => c.apiTag.toLowerCase() === tag.toLowerCase());
      if (match) return match.id;
    }
  }
  return 'wisdom';
}

export function convertApiQuote(apiQuote: ApiQuote): Quote {
  return {
    id: apiQuote._id || `q-${Date.now()}`,
    text: apiQuote.content,
    author: apiQuote.author,
    category: inferCategory(apiQuote.content, apiQuote.tags),
  };
}
