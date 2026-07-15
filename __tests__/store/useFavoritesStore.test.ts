/**
 * Unit tests for useFavoritesStore
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  jest.resetModules();
});

const makeQuote = (id: string, tags: string[] = []) => ({
  id,
  text: `Quote ${id}`,
  author: 'Author',
  category: 'wisdom',
  tags,
});

describe('useFavoritesStore', () => {
  it('starts with empty favorites', () => {
    const { useFavoritesStore } = require('../../store/useFavoritesStore');
    expect(useFavoritesStore.getState().favorites).toEqual([]);
  });

  it('adds a favorite', () => {
    const { useFavoritesStore } = require('../../store/useFavoritesStore');
    useFavoritesStore.getState().addFavorite(makeQuote('q1'));
    const { favorites } = useFavoritesStore.getState();
    expect(favorites).toHaveLength(1);
    expect(favorites[0].id).toBe('q1');
    expect(favorites[0].savedAt).toBeTruthy();
  });

  it('does not add duplicate favorites', () => {
    const { useFavoritesStore } = require('../../store/useFavoritesStore');
    useFavoritesStore.getState().addFavorite(makeQuote('q1'));
    useFavoritesStore.getState().addFavorite(makeQuote('q1'));
    expect(useFavoritesStore.getState().favorites).toHaveLength(1);
  });

  it('removes a favorite by id', () => {
    const { useFavoritesStore } = require('../../store/useFavoritesStore');
    useFavoritesStore.getState().addFavorite(makeQuote('q1'));
    useFavoritesStore.getState().addFavorite(makeQuote('q2'));
    useFavoritesStore.getState().removeFavorite('q1');
    const { favorites } = useFavoritesStore.getState();
    expect(favorites).toHaveLength(1);
    expect(favorites[0].id).toBe('q2');
  });

  it('isFavorite returns true for added quotes', () => {
    const { useFavoritesStore } = require('../../store/useFavoritesStore');
    useFavoritesStore.getState().addFavorite(makeQuote('q1'));
    expect(useFavoritesStore.getState().isFavorite('q1')).toBe(true);
    expect(useFavoritesStore.getState().isFavorite('q2')).toBe(false);
  });

  it('toggleFavorite adds and returns true', () => {
    const { useFavoritesStore } = require('../../store/useFavoritesStore');
    const result = useFavoritesStore.getState().toggleFavorite(makeQuote('q1'));
    expect(result).toBe(true);
    expect(useFavoritesStore.getState().isFavorite('q1')).toBe(true);
  });

  it('toggleFavorite removes and returns false', () => {
    const { useFavoritesStore } = require('../../store/useFavoritesStore');
    useFavoritesStore.getState().addFavorite(makeQuote('q1'));
    const result = useFavoritesStore.getState().toggleFavorite(makeQuote('q1'));
    expect(result).toBe(false);
    expect(useFavoritesStore.getState().isFavorite('q1')).toBe(false);
  });

  it('clearFavorites removes all', () => {
    const { useFavoritesStore } = require('../../store/useFavoritesStore');
    useFavoritesStore.getState().addFavorite(makeQuote('q1'));
    useFavoritesStore.getState().addFavorite(makeQuote('q2'));
    useFavoritesStore.getState().clearFavorites();
    expect(useFavoritesStore.getState().favorites).toHaveLength(0);
  });

  it('recomputes forYouCategoryIds when crossing a tier (every 5 favorites)', () => {
    const { useFavoritesStore } = require('../../store/useFavoritesStore');
    const initialIds = [...useFavoritesStore.getState().forYouCategoryIds];
    // Add 5 favorites with 'wisdom' tag to influence For You
    for (let i = 1; i <= 5; i++) {
      useFavoritesStore.getState().addFavorite(makeQuote(`q${i}`, ['wisdom']));
    }
    const updatedIds = useFavoritesStore.getState().forYouCategoryIds;
    // wisdom should be first after 5 favorites with that tag
    expect(updatedIds[0]).toBe('wisdom');
    // And the list should differ from the initial random order
    expect(JSON.stringify(updatedIds)).not.toBe(JSON.stringify(initialIds));
  });

  it('forYouTier increments when crossing 5-favorite threshold', () => {
    const { useFavoritesStore } = require('../../store/useFavoritesStore');
    expect(useFavoritesStore.getState().forYouTier).toBe(0);
    for (let i = 1; i <= 5; i++) {
      useFavoritesStore.getState().addFavorite(makeQuote(`q${i}`));
    }
    expect(useFavoritesStore.getState().forYouTier).toBe(1);
  });
});
