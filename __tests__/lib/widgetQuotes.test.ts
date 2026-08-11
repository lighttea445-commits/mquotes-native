/**
 * Unit tests for lib/widgetQuotes.ts
 *
 * One resolver turns a config's source into actual quotes for every widget
 * path on both platforms, so a source that resolves wrong here is wrong on the
 * Android headless refresh, the background task, and the iOS queue at once.
 *
 * The collection cases carry the most weight: a collection is finite, is the
 * only source the user can delete out from under a config, and must never
 * leave a widget blank when it is empty or gone.
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

const mockFetchByCategory = jest.fn(async (_tag: string, _limit?: number) => [
  { _id: 'cat1', content: 'Category quote', author: 'Cat' },
]);
const mockFetchRandom = jest.fn(async (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    _id: `r${i}`,
    content: `Random ${i}`,
    author: `Author ${i}`,
  })),
);
const mockFetchForNotifications = jest.fn(async (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    _id: `n${i}`,
    content: `General ${i}`,
    author: `Author ${i}`,
  })),
);

jest.mock('../../lib/quotesApi', () => ({
  fetchQuotesByCategory: (...args: unknown[]) => (mockFetchByCategory as any)(...args),
  fetchMultipleRandomQuotes: (...args: unknown[]) => (mockFetchRandom as any)(...args),
  fetchQuotesForNotifications: (...args: unknown[]) => (mockFetchForNotifications as any)(...args),
}));

beforeEach(() => {
  jest.resetModules();
  mockFetchByCategory.mockClear();
  mockFetchRandom.mockClear();
  mockFetchForNotifications.mockClear();
});

function seedCollection(id: string, quotes: { id: string; text: string; author: string }[]) {
  const { useCollectionsStore } = require('../../store/useCollectionsStore');
  useCollectionsStore.setState({
    collections: [
      {
        id,
        name: 'Evening',
        createdAt: '2026-01-01T00:00:00.000Z',
        quotes: quotes.map(q => ({ ...q, addedAt: '2026-01-01T00:00:00.000Z' })),
      },
    ],
  });
}

// ── collection sources ───────────────────────────────────────────────────────

describe('resolveWidgetQuotes — collections', () => {
  it('draws from the named collection without touching the network', async () => {
    seedCollection('c1', [
      { id: 'q1', text: 'Saved one', author: 'A' },
      { id: 'q2', text: 'Saved two', author: 'B' },
    ]);
    const { resolveWidgetQuotes } = require('../../lib/widgetQuotes');

    const quotes = await resolveWidgetQuotes('collection:c1', 2);

    expect(quotes.map((q: { text: string }) => q.text).sort()).toEqual(['Saved one', 'Saved two']);
    expect(mockFetchForNotifications).not.toHaveBeenCalled();
    expect(mockFetchRandom).not.toHaveBeenCalled();
  });

  it('returns fewer than asked rather than padding — the iOS queue length follows the collection', async () => {
    seedCollection('c1', [{ id: 'q1', text: 'Only one', author: 'A' }]);
    const { resolveWidgetQuotes } = require('../../lib/widgetQuotes');

    const quotes = await resolveWidgetQuotes('collection:c1', 48);

    expect(quotes).toHaveLength(1);
  });

  it('falls back to general when the collection is empty', async () => {
    seedCollection('c1', []);
    const { resolveWidgetQuotes } = require('../../lib/widgetQuotes');

    const quotes = await resolveWidgetQuotes('collection:c1', 3);

    expect(quotes).toHaveLength(3);
    expect(quotes[0].text).toBe('General 0');
  });

  it('falls back to general when the collection was deleted', async () => {
    seedCollection('other', [{ id: 'q1', text: 'Not this one', author: 'A' }]);
    const { resolveWidgetQuotes } = require('../../lib/widgetQuotes');

    const quotes = await resolveWidgetQuotes('collection:gone', 2);

    expect(quotes).toHaveLength(2);
    expect(quotes[0].text).toBe('General 0');
  });

  it('resolveWidgetQuote returns a single quote from the collection', async () => {
    seedCollection('c1', [{ id: 'q1', text: 'Saved one', author: 'A' }]);
    const { resolveWidgetQuote } = require('../../lib/widgetQuotes');

    const quote = await resolveWidgetQuote('collection:c1');

    expect(quote).toEqual({ id: 'q1', text: 'Saved one', author: 'A' });
  });
});

// ── the sources a collection sits alongside ──────────────────────────────────

describe('resolveWidgetQuotes — other sources still resolve', () => {
  it('general goes to the notifications endpoint for a batch', async () => {
    const { resolveWidgetQuotes } = require('../../lib/widgetQuotes');
    const quotes = await resolveWidgetQuotes('general', 5);
    expect(quotes).toHaveLength(5);
    expect(mockFetchForNotifications).toHaveBeenCalledWith(5);
  });

  it('a category tag goes to the category endpoint', async () => {
    const { resolveWidgetQuotes } = require('../../lib/widgetQuotes');
    const quotes = await resolveWidgetQuotes('wisdom', 1);
    expect(mockFetchByCategory).toHaveBeenCalledWith('wisdom', 25);
    expect(quotes[0].text).toBe('Category quote');
  });

  it('favorites falls back to general when nothing is saved', async () => {
    const { resolveWidgetQuotes } = require('../../lib/widgetQuotes');
    const quotes = await resolveWidgetQuotes('favorites', 2);
    expect(quotes[0].text).toBe('General 0');
  });
});
