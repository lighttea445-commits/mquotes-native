/**
 * Unit tests for quotesApi.ts
 * Tests keyword scoring, category filtering, and mix loading logic
 */

// Mock fetch globally
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve([
        {
          _id: 'q1',
          content: 'Achieve your goals with determination and hard work.',
          author: 'Test Author',
          tags: [],
          authorSlug: 'test-author',
          length: 50,
        },
        {
          _id: 'q2',
          content: 'Find inner peace and calm in the present moment.',
          author: 'Zen Master',
          tags: [],
          authorSlug: 'zen-master',
          length: 48,
        },
        {
          _id: 'q3',
          content: 'Love is the greatest force in the universe, warming all hearts.',
          author: 'Poet',
          tags: [],
          authorSlug: 'poet',
          length: 60,
        },
        {
          _id: 'q4',
          content: 'Hope shines bright even in the darkest of nights, believe in tomorrow.',
          author: 'Optimist',
          tags: [],
          authorSlug: 'optimist',
          length: 68,
        },
        {
          _id: 'q5',
          content: 'Grow, learn, evolve — become who you are meant to be.',
          author: 'Coach',
          tags: [],
          authorSlug: 'coach',
          length: 52,
        },
      ]),
  } as Response),
) as jest.Mock;

// Reset module cache between tests so cachedQuotes doesn't bleed
beforeEach(() => {
  jest.resetModules();
  (global.fetch as jest.Mock).mockClear();
});

describe('fetchMultipleRandomQuotes', () => {
  it('returns an array of quotes', async () => {
    const { fetchMultipleRandomQuotes } = await import('../../lib/quotesApi');
    const quotes = await fetchMultipleRandomQuotes(5);
    expect(Array.isArray(quotes)).toBe(true);
    expect(quotes.length).toBeGreaterThan(0);
    expect(quotes[0]).toHaveProperty('content');
    expect(quotes[0]).toHaveProperty('author');
  });
});

describe('fetchQuotesByCategory', () => {
  it('returns quotes relevant to the "motivation" category', async () => {
    const { fetchQuotesByCategory } = await import('../../lib/quotesApi');
    const quotes = await fetchQuotesByCategory('motivation');
    // At least q1 should be returned (contains "achieve", "determination")
    const texts = quotes.map(q => q.content.toLowerCase());
    const hasMotivationQuote = texts.some(t => t.includes('achieve') || t.includes('determination'));
    expect(hasMotivationQuote).toBe(true);
  });

  it('returns quotes relevant to the "love" category', async () => {
    const { fetchQuotesByCategory } = await import('../../lib/quotesApi');
    const quotes = await fetchQuotesByCategory('love');
    const texts = quotes.map(q => q.content.toLowerCase());
    const hasLoveQuote = texts.some(t => t.includes('love'));
    expect(hasLoveQuote).toBe(true);
  });

  it('returns quotes relevant to the "hope" category', async () => {
    const { fetchQuotesByCategory } = await import('../../lib/quotesApi');
    const quotes = await fetchQuotesByCategory('hope');
    const texts = quotes.map(q => q.content.toLowerCase());
    const hasHopeQuote = texts.some(t => t.includes('hope') || t.includes('believe') || t.includes('bright'));
    expect(hasHopeQuote).toBe(true);
  });

  it('returns empty array for unknown category', async () => {
    const { fetchQuotesByCategory } = await import('../../lib/quotesApi');
    const quotes = await fetchQuotesByCategory('nonexistent-category-xyz');
    expect(quotes).toEqual([]);
  });
});

describe('fetchQuotesByMood', () => {
  it('returns quotes for the "anxious" mood (calming keywords)', async () => {
    const { fetchQuotesByMood } = await import('../../lib/quotesApi');
    const quotes = await fetchQuotesByMood('anxious');
    const texts = quotes.map(q => q.content.toLowerCase());
    const hasCalmQuote = texts.some(t => t.includes('peace') || t.includes('calm'));
    expect(hasCalmQuote).toBe(true);
  });
});

describe('convertApiQuote', () => {
  it('converts API format to app Quote format', async () => {
    const { convertApiQuote } = await import('../../lib/quotesApi');
    const apiQuote = {
      _id: 'test-123',
      content: 'Test quote text',
      author: 'Test Author',
      tags: [],
      authorSlug: 'test-author',
      length: 15,
    };
    const result = convertApiQuote(apiQuote);
    expect(result.id).toBe('test-123');
    expect(result.text).toBe('Test quote text');
    expect(result.author).toBe('Test Author');
    expect(result.category).toBe('inspiration');
  });

  it('generates a fallback ID if _id is empty', async () => {
    const { convertApiQuote } = await import('../../lib/quotesApi');
    const result = convertApiQuote({
      _id: '',
      content: 'Quote',
      author: 'Author',
      tags: [],
      authorSlug: '',
      length: 5,
    });
    expect(result.id).toMatch(/^zen-/);
  });
});
