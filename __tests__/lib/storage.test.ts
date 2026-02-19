/**
 * Unit tests for lib/storage.ts
 * Tests MMKV-based typed storage helpers
 */

// Mock react-native-mmkv
jest.mock('react-native-mmkv', () => {
  const store: Record<string, string | boolean | number> = {};
  return {
    MMKV: jest.fn().mockImplementation(() => ({
      getString: (key: string) => (typeof store[key] === 'string' ? store[key] : undefined),
      set: (key: string, value: string | boolean | number) => { store[key] = value; },
      getBoolean: (key: string) => (typeof store[key] === 'boolean' ? store[key] : undefined),
      getNumber: (key: string) => (typeof store[key] === 'number' ? store[key] : undefined),
      delete: (key: string) => { delete store[key]; },
      clearAll: () => { Object.keys(store).forEach(k => delete store[k]); },
    })),
  };
});

beforeEach(() => {
  jest.resetModules();
});

describe('Storage helpers', () => {
  it('stores and retrieves a string', async () => {
    const { Storage } = await import('../../lib/storage');
    Storage.setString('test-key', 'hello');
    expect(Storage.getString('test-key')).toBe('hello');
  });

  it('stores and retrieves an object', async () => {
    const { Storage } = await import('../../lib/storage');
    const obj = { name: 'Alice', count: 3 };
    Storage.setObject('my-object', obj);
    const result = Storage.getObject<typeof obj>('my-object');
    expect(result).toEqual(obj);
  });

  it('returns null for missing object key', async () => {
    const { Storage } = await import('../../lib/storage');
    const result = Storage.getObject('nonexistent');
    expect(result).toBeNull();
  });

  it('stores and retrieves a boolean', async () => {
    const { Storage } = await import('../../lib/storage');
    Storage.setBoolean('flag', true);
    expect(Storage.getBoolean('flag')).toBe(true);
  });

  it('removes a key', async () => {
    const { Storage } = await import('../../lib/storage');
    Storage.setString('temp', 'value');
    Storage.remove('temp');
    expect(Storage.getString('temp')).toBeUndefined();
  });

  it('returns false for missing boolean key', async () => {
    const { Storage } = await import('../../lib/storage');
    expect(Storage.getBoolean('missing-bool-key')).toBe(false);
  });

  it('returns null for malformed JSON in getObject', async () => {
    const { Storage, storage } = await import('../../lib/storage');
    storage.set('bad-json', 'not-valid-json');
    const result = Storage.getObject('bad-json');
    expect(result).toBeNull();
  });
});

describe('zustandMMKVStorage adapter', () => {
  it('implements getItem / setItem / removeItem', async () => {
    const { zustandMMKVStorage } = await import('../../lib/storage');
    zustandMMKVStorage.setItem('z-key', JSON.stringify({ a: 1 }));
    const val = zustandMMKVStorage.getItem('z-key');
    expect(val).toBe(JSON.stringify({ a: 1 }));
    zustandMMKVStorage.removeItem('z-key');
    expect(zustandMMKVStorage.getItem('z-key')).toBeNull();
  });
});
