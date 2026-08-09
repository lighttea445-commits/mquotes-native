/**
 * Unit tests for lib/storage.ts
 * Tests the AsyncStorage-backed Zustand persistence adapter.
 */

jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string | null> = {};
  return {
    getItem: jest.fn(async (key: string) => store[key] ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete store[key];
    }),
    clear: jest.fn(async () => {
      Object.keys(store).forEach((k) => delete store[k]);
    }),
  };
});

beforeEach(() => {
  jest.resetModules();
});

describe('zustandMMKVStorage adapter', () => {
  it('implements getItem / setItem / removeItem', async () => {
    const { zustandMMKVStorage } = require('../../lib/storage');
    await zustandMMKVStorage.setItem('z-key', JSON.stringify({ a: 1 }));
    const val = await zustandMMKVStorage.getItem('z-key');
    expect(val).toBe(JSON.stringify({ a: 1 }));
    await zustandMMKVStorage.removeItem('z-key');
    expect(await zustandMMKVStorage.getItem('z-key')).toBeNull();
  });
});
