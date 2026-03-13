/**
 * Unit tests for lib/storage.ts
 * Tests AsyncStorage-backed typed storage helpers.
 */

// Mock @react-native-async-storage/async-storage with an in-memory store
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

describe('Storage helpers', () => {
  it('stores and retrieves a string', () => {
    const { Storage } = require('../../lib/storage');
    Storage.setString('test-key', 'hello');
    expect(Storage.getString('test-key')).toBe('hello');
  });

  it('stores and retrieves an object', () => {
    const { Storage } = require('../../lib/storage');
    const obj = { name: 'Alice', count: 3 };
    Storage.setObject('my-object', obj);
    const result = Storage.getObject<typeof obj>('my-object');
    expect(result).toEqual(obj);
  });

  it('returns null for missing object key', () => {
    const { Storage } = require('../../lib/storage');
    const result = Storage.getObject('nonexistent');
    expect(result).toBeNull();
  });

  it('stores and retrieves a boolean', () => {
    const { Storage } = require('../../lib/storage');
    Storage.setBoolean('flag', true);
    expect(Storage.getBoolean('flag')).toBe(true);
  });

  it('removes a key', () => {
    const { Storage } = require('../../lib/storage');
    Storage.setString('temp', 'value');
    Storage.remove('temp');
    expect(Storage.getString('temp')).toBeUndefined();
  });

  it('returns false for missing boolean key', () => {
    const { Storage } = require('../../lib/storage');
    expect(Storage.getBoolean('missing-bool-key')).toBe(false);
  });

  it('returns null for malformed JSON in getObject', () => {
    const { Storage, storage } = require('../../lib/storage');
    storage.set('bad-json', 'not-valid-json');
    const result = Storage.getObject('bad-json');
    expect(result).toBeNull();
  });
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
