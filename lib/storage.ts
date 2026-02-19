import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV({ id: 'mquotes-storage' });

// Typed storage helpers
export const Storage = {
  getString: (key: string): string | undefined => storage.getString(key),
  setString: (key: string, value: string): void => storage.set(key, value),

  getObject: <T>(key: string): T | null => {
    const raw = storage.getString(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  setObject: <T>(key: string, value: T): void => {
    storage.set(key, JSON.stringify(value));
  },

  getBoolean: (key: string): boolean => storage.getBoolean(key) ?? false,
  setBoolean: (key: string, value: boolean): void => storage.set(key, value),

  getNumber: (key: string): number | undefined => storage.getNumber(key),
  setNumber: (key: string, value: number): void => storage.set(key, value),

  remove: (key: string): void => storage.delete(key),
  clear: (): void => storage.clearAll(),
};

// Zustand MMKV persistence adapter
export const zustandMMKVStorage = {
  getItem: (key: string): string | null => storage.getString(key) ?? null,
  setItem: (key: string, value: string): void => storage.set(key, value),
  removeItem: (key: string): void => storage.delete(key),
};
