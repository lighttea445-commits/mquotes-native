// Quotes API — Quotable (api.quotable.kurokeita.dev) direct calls

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

function toApiQuote(q: KurokuoteQuote): ApiQuote {
  return {
    _id: q.id,
    content: q.content,
    author: q.author.name,
    authorSlug: q.author.slug,
    tags: q.tags.map(t => t.name.toLowerCase()),
    length: q.content.length,
  };
}

// ─── In-memory cache (random quotes only) ────────────────────────────────────

let cachedQuotes: ApiQuote[] = [];
const seenIds = new Set<string>();

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ─── Core fetch ───────────────────────────────────────────────────────────────

/**
 * Fetch random quotes, optionally filtered by a Quotable API tag name.
 * `limit` must be one of: 10, 25, 50, 100.
 */
async function fetchFromApi(limit: 10 | 25 | 50 | 100 = 50, tag?: string): Promise<ApiQuote[]> {
  try {
    const params = new URLSearchParams({ limit: String(limit) });
    if (tag) params.set('tags', tag);
    const res = await fetch(`${QUOTABLE_BASE}/quotes/random?${params}`);
    if (!res.ok) throw new Error(`Quotable ${res.status}`);
    const data = await res.json() as { quotes: KurokuoteQuote[] };
    return (data.quotes ?? []).map(toApiQuote);
  } catch (err) {
    console.error('Quotable fetch error:', err);
    return [];
  }
}

async function ensureCache(minCount = 10): Promise<void> {
  while (cachedQuotes.length < minCount) {
    const fresh = await fetchFromApi(50);
    if (fresh.length === 0) break;
    const deduped = fresh.filter(q => !seenIds.has(q._id));
    deduped.forEach(q => seenIds.add(q._id));
    cachedQuotes = [...cachedQuotes, ...deduped];
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchRandomQuote(): Promise<ApiQuote | null> {
  await ensureCache();
  return cachedQuotes.shift() ?? null;
}

export async function fetchMultipleRandomQuotes(count = 20): Promise<ApiQuote[]> {
  await ensureCache(count + 10);
  return shuffleArray(cachedQuotes.splice(0, count));
}

/**
 * Fetch quotes for a category using Quotable's server-side tag filter.
 * `category` is the app's internal id (e.g. 'wisdom').
 */
export async function fetchQuotesByCategory(category: string): Promise<ApiQuote[]> {
  const tag = getCategoryApiTag(category);
  return shuffleArray(await fetchFromApi(25, tag));
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
