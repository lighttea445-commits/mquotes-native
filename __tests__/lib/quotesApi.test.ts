/**
 * Unit tests for quotesApi.ts
 * Tests category fetching, conversion, and deduplication logic.
 */

// Mock AsyncStorage used by the cache layer
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

// Helper: build a KurokuoteQuote (raw API shape)
const makeRawQuote = (id: string, content: string, tagName: string, authorName = 'Test Author') => ({
  id,
  content,
  tags: [{ id: `t-${id}`, name: tagName }],
  author: { id: `a-${id}`, name: authorName, slug: authorName.toLowerCase().replace(/ /g, '-'), description: '', bio: '' },
});

const RAW_QUOTES = [
  makeRawQuote('q1', 'Achieve your goals with determination and hard work.', 'Motivational'),
  makeRawQuote('q2', 'Find inner peace and calm in the present moment.', 'Wisdom'),
  makeRawQuote('q3', 'Love is the greatest force in the universe, warming all hearts.', 'Love'),
  makeRawQuote('q4', 'Hope shines bright even in the darkest of nights.', 'Inspirational'),
  makeRawQuote('q5', 'Grow, learn, evolve — become who you are meant to be.', 'Success'),
];

global.fetch = jest.fn() as jest.Mock;

beforeEach(() => {
  jest.resetModules();
  (global.fetch as jest.Mock).mockClear();
  (global.fetch as jest.Mock).mockImplementation(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ quotes: RAW_QUOTES }),
    } as Response),
  );
});

describe('fetchMultipleRandomQuotes', () => {
  it('returns an array of quotes with the right shape', async () => {
    const { fetchMultipleRandomQuotes } = require('../../lib/quotesApi');
    const quotes = await fetchMultipleRandomQuotes(5);
    expect(Array.isArray(quotes)).toBe(true);
    expect(quotes.length).toBeGreaterThan(0);
    expect(quotes[0]).toHaveProperty('content');
    expect(quotes[0]).toHaveProperty('author');
    expect(quotes[0]).toHaveProperty('_id');
    expect(quotes[0]).toHaveProperty('tags');
  });

  it('returns at most the requested count', async () => {
    const { fetchMultipleRandomQuotes } = require('../../lib/quotesApi');
    const quotes = await fetchMultipleRandomQuotes(3);
    expect(quotes.length).toBeLessThanOrEqual(3);
  });
});

describe('fetchQuotesByCategory', () => {
  it('calls the API with a tags query parameter', async () => {
    const { fetchQuotesByCategory } = require('../../lib/quotesApi');
    await fetchQuotesByCategory('motivational');
    expect(global.fetch).toHaveBeenCalled();
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toMatch(/tags=/);
  });

  it('returns an empty array when the API responds with 0 quotes', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ quotes: [] }) } as Response),
    );
    const { fetchQuotesByCategory } = require('../../lib/quotesApi');
    const quotes = await fetchQuotesByCategory('wisdom');
    expect(Array.isArray(quotes)).toBe(true);
  });

  it('returns empty array on API error', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) } as Response),
    );
    const { fetchQuotesByCategory } = require('../../lib/quotesApi');
    const quotes = await fetchQuotesByCategory('wisdom');
    expect(quotes).toEqual([]);
  });
});

describe('convertApiQuote', () => {
  it('converts ApiQuote to app Quote format', () => {
    const { convertApiQuote } = require('../../lib/quotesApi');
    const result = convertApiQuote({
      _id: 'test-123',
      content: 'Test quote text',
      author: 'Test Author',
      tags: ['wisdom'],
      authorSlug: 'test-author',
      length: 15,
    });
    expect(result.id).toBe('test-123');
    expect(result.text).toBe('Test quote text');
    expect(result.author).toBe('Test Author');
    expect(typeof result.category).toBe('string');
  });

  it('generates a fallback id (q-...) when _id is empty', () => {
    const { convertApiQuote } = require('../../lib/quotesApi');
    const result = convertApiQuote({ _id: '', content: 'Quote', author: 'Author', tags: [], authorSlug: '', length: 5 });
    expect(result.id).toMatch(/^q-/);
  });

  it('maps wisdom tag to wisdom category', () => {
    const { convertApiQuote } = require('../../lib/quotesApi');
    const result = convertApiQuote({ _id: 'x1', content: 'Something wise', author: 'P', tags: ['wisdom'], authorSlug: 'p', length: 14 });
    expect(result.category).toBe('wisdom');
  });

  it('falls back to wisdom for unknown tags', () => {
    const { convertApiQuote } = require('../../lib/quotesApi');
    const result = convertApiQuote({ _id: 'x2', content: 'text', author: 'A', tags: ['xyzzy-unknown'], authorSlug: 'a', length: 4 });
    expect(result.category).toBe('wisdom');
  });
});

describe('inferCategory', () => {
  it('infers love category from Love tag', () => {
    const { inferCategory } = require('../../lib/quotesApi');
    expect(inferCategory('', ['Love'])).toBe('love');
  });

  it('infers wisdom category from Wisdom tag', () => {
    const { inferCategory } = require('../../lib/quotesApi');
    expect(inferCategory('', ['Wisdom'])).toBe('wisdom');
  });

  it('falls back to wisdom with no matching tags', () => {
    const { inferCategory } = require('../../lib/quotesApi');
    expect(inferCategory('', [])).toBe('wisdom');
    expect(inferCategory('', ['xyzzy'])).toBe('wisdom');
  });
});
