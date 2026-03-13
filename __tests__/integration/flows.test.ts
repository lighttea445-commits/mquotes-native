/**
 * Integration tests for critical app flows.
 * These tests exercise multiple stores and the API layer together,
 * simulating the sequences of actions that happen in the real app.
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

// Silence __DEV__ console.error from quotesApi error paths in tests
global.__DEV__ = false;

const makeRawQuote = (id: string, content: string, tagName: string, authorName = 'Test Author') => ({
  id,
  content,
  tags: [{ id: `t-${id}`, name: tagName }],
  author: {
    id: `a-${id}`,
    name: authorName,
    slug: authorName.toLowerCase().replace(/ /g, '-'),
    description: '',
    bio: '',
  },
});

global.fetch = jest.fn() as jest.Mock;

beforeEach(() => {
  jest.resetModules();
  (global.fetch as jest.Mock).mockReset();
  (global.fetch as jest.Mock).mockImplementation(() =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          quotes: [
            makeRawQuote('q1', 'Achieve your goals.', 'Motivational'),
            makeRawQuote('q2', 'Find inner peace.', 'Wisdom', 'Lao Tzu'),
            makeRawQuote('q3', 'Love conquers all.', 'Love'),
          ],
        }),
    } as Response),
  );
});

// ─── Flow 1: Fetch → Convert → History ────────────────────────────────────────

describe('fetch → convert → history flow', () => {
  it('fetched quotes can be converted and stored in history', async () => {
    const { fetchMultipleRandomQuotes, convertApiQuote } = require('../../lib/quotesApi');
    const { useHistoryStore } = require('../../store/useHistoryStore');

    const quotes = await fetchMultipleRandomQuotes(3);
    expect(quotes.length).toBeGreaterThan(0);

    for (const q of quotes) {
      const converted = convertApiQuote(q);
      useHistoryStore.getState().addToHistory({
        id: converted.id,
        text: converted.text,
        author: converted.author,
        category: converted.category,
      });
    }

    const { history, totalQuotesRead } = useHistoryStore.getState();
    expect(history.length).toBe(quotes.length);
    expect(totalQuotesRead).toBe(quotes.length);
    expect(history[0]).toHaveProperty('viewedAt');
  });

  it('history deduplicates repeated views of the same quote', async () => {
    const { useHistoryStore } = require('../../store/useHistoryStore');

    const quote = { id: 'dup-1', text: 'Same quote', author: 'Author', category: 'wisdom' };
    useHistoryStore.getState().addToHistory(quote);
    useHistoryStore.getState().addToHistory(quote); // view again

    const { history, totalQuotesRead } = useHistoryStore.getState();
    // history deduplicates by id (filtered + prepended)
    expect(history.length).toBe(1);
    // totalQuotesRead always increments (tracks total reads, not uniques)
    expect(totalQuotesRead).toBe(2);
  });
});

// ─── Flow 2: Fetch → Convert → Favorite → forYou recomputation ───────────────

describe('fetch → favorite → forYou flow', () => {
  it('5 favorited quotes with wisdom tag promotes wisdom in forYouCategoryIds', async () => {
    const { fetchMultipleRandomQuotes, convertApiQuote } = require('../../lib/quotesApi');
    const { useFavoritesStore } = require('../../store/useFavoritesStore');

    // Mock returns 3 quotes — add enough to cross the tier
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            quotes: [
              makeRawQuote('w1', 'Wisdom 1', 'Wisdom'),
              makeRawQuote('w2', 'Wisdom 2', 'Wisdom'),
              makeRawQuote('w3', 'Wisdom 3', 'Wisdom'),
              makeRawQuote('w4', 'Wisdom 4', 'Wisdom'),
              makeRawQuote('w5', 'Wisdom 5', 'Wisdom'),
            ],
          }),
      } as Response),
    );

    const quotes = await fetchMultipleRandomQuotes(5);
    expect(quotes.length).toBe(5);

    const initialTier = useFavoritesStore.getState().forYouTier;

    for (const q of quotes) {
      const c = convertApiQuote(q);
      useFavoritesStore.getState().addFavorite({
        id: c.id,
        text: c.text,
        author: c.author,
        category: c.category,
        tags: q.tags,
      });
    }

    const { forYouTier, forYouCategoryIds } = useFavoritesStore.getState();
    expect(forYouTier).toBe(initialTier + 1);
    // wisdom should rank first after 5 wisdom favorites
    expect(forYouCategoryIds[0]).toBe('wisdom');
  });

  it('favorite + unfavorite leaves favorites empty', async () => {
    const { useFavoritesStore } = require('../../store/useFavoritesStore');

    const quote = { id: 'fav-1', text: 'Quote', author: 'Author', category: 'wisdom' };
    useFavoritesStore.getState().addFavorite(quote);
    expect(useFavoritesStore.getState().favorites).toHaveLength(1);

    useFavoritesStore.getState().removeFavorite('fav-1');
    expect(useFavoritesStore.getState().favorites).toHaveLength(0);
  });
});

// ─── Flow 3: Favorites + History both grow together ───────────────────────────

describe('multi-store: favorites + history grow independently', () => {
  it('favoriting a quote updates favorites store without affecting history', () => {
    const { useFavoritesStore } = require('../../store/useFavoritesStore');
    const { useHistoryStore } = require('../../store/useHistoryStore');

    const q = { id: 'q99', text: 'A great thought.', author: 'Plato', category: 'wisdom' };

    useHistoryStore.getState().addToHistory(q);
    useFavoritesStore.getState().addFavorite(q);

    expect(useHistoryStore.getState().history).toHaveLength(1);
    expect(useFavoritesStore.getState().favorites).toHaveLength(1);

    // Removing from favorites does not remove from history
    useFavoritesStore.getState().removeFavorite('q99');
    expect(useHistoryStore.getState().history).toHaveLength(1);
    expect(useFavoritesStore.getState().favorites).toHaveLength(0);
  });

  it('clearFavorites does not affect history', () => {
    const { useFavoritesStore } = require('../../store/useFavoritesStore');
    const { useHistoryStore } = require('../../store/useHistoryStore');

    const q = { id: 'q-clear', text: 'Ephemeral', author: 'Nobody', category: 'love' };
    useHistoryStore.getState().addToHistory(q);
    useFavoritesStore.getState().addFavorite(q);

    useFavoritesStore.getState().clearFavorites();

    expect(useFavoritesStore.getState().favorites).toHaveLength(0);
    expect(useHistoryStore.getState().totalQuotesRead).toBe(1);
  });
});

// ─── Flow 4: Streak + Onboarding ─────────────────────────────────────────────

describe('onboarding → streak flow', () => {
  it('completing onboarding enables streak tracking', () => {
    const { useAppStore } = require('../../store/useAppStore');

    expect(useAppStore.getState().onboardingComplete).toBe(false);
    expect(useAppStore.getState().streak.count).toBe(0);

    useAppStore.getState().completeOnboarding();
    useAppStore.getState().updateStreak();

    expect(useAppStore.getState().onboardingComplete).toBe(true);
    expect(useAppStore.getState().streak.count).toBe(1);
  });

  it('streak banner shown on first visit and on continuation', () => {
    const { useAppStore } = require('../../store/useAppStore');

    // First ever visit — banner is shown to celebrate streak start
    useAppStore.getState().updateStreak();
    expect(useAppStore.getState().streak.count).toBe(1);
    expect(useAppStore.getState().showStreakBanner).toBe(true);

    // Dismiss banner
    useAppStore.getState().dismissStreakBanner();
    expect(useAppStore.getState().showStreakBanner).toBe(false);

    // Simulate yesterday to test continuation
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    useAppStore.setState({
      streak: {
        count: 1,
        lastVisitDate: yesterday.toISOString().slice(0, 10),
        weekData: [false, false, false, false, false, false, false],
      },
      showStreakBanner: false,
    });

    // Second day — continuation, banner shown again
    useAppStore.getState().updateStreak();
    expect(useAppStore.getState().streak.count).toBe(2);
    expect(useAppStore.getState().showStreakBanner).toBe(true);
  });

  it('banner NOT shown when streak breaks', () => {
    const { useAppStore } = require('../../store/useAppStore');

    // Simulate 3 days ago — streak broken
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    useAppStore.setState({
      streak: {
        count: 5,
        lastVisitDate: threeDaysAgo.toISOString().slice(0, 10),
        weekData: [false, false, false, false, false, false, false],
      },
    });

    useAppStore.getState().updateStreak();
    expect(useAppStore.getState().streak.count).toBe(1); // reset
    expect(useAppStore.getState().showStreakBanner).toBe(false); // no celebration
  });
});

// ─── Flow 5: Category fetch returns correct tag ───────────────────────────────

describe('category API tag routing', () => {
  it('fetchQuotesByCategory passes the correct tag to the API', async () => {
    const { fetchQuotesByCategory } = require('../../lib/quotesApi');

    await fetchQuotesByCategory('wisdom');
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toMatch(/tags=Wisdom/i);
  });

  it('fetchQuotesByCategory for love passes Love tag', async () => {
    const { fetchQuotesByCategory } = require('../../lib/quotesApi');

    await fetchQuotesByCategory('love');
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toMatch(/tags=Love/i);
  });
});
