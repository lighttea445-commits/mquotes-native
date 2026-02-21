import { Platform } from 'react-native';

// Web-compatible storage layer
// Uses MMKV on native (iOS/Android), localStorage on web

let storage: {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string | boolean | number) => void;
  getBoolean: (key: string) => boolean | undefined;
  getNumber: (key: string) => number | undefined;
  delete: (key: string) => void;
  clearAll: () => void;
};

if (Platform.OS === 'web') {
  // localStorage-based fallback for web/browser preview
  storage = {
    getString: (key) => localStorage.getItem(key) ?? undefined,
    set: (key, value) => localStorage.setItem(key, String(value)),
    getBoolean: (key) => {
      const v = localStorage.getItem(key);
      return v === null ? undefined : v === 'true';
    },
    getNumber: (key) => {
      const v = localStorage.getItem(key);
      return v === null ? undefined : Number(v);
    },
    delete: (key) => localStorage.removeItem(key),
    clearAll: () => localStorage.clear(),
  };
} else {
  // MMKV for native — imported lazily to avoid web crash
  const { MMKV } = require('react-native-mmkv');
  const mmkv = new MMKV({ id: 'mquotes-storage' });
  storage = {
    getString: (key) => mmkv.getString(key),
    set: (key, value) => mmkv.set(key, value),
    getBoolean: (key) => mmkv.getBoolean(key),
    getNumber: (key) => mmkv.getNumber(key),
    delete: (key) => mmkv.delete(key),
    clearAll: () => mmkv.clearAll(),
  };
}

export { storage };

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

// Zustand persistence adapter
export const zustandMMKVStorage = {
  getItem: (key: string): string | null => storage.getString(key) ?? null,
  setItem: (key: string, value: string): void => storage.set(key, value),
  removeItem: (key: string): void => storage.delete(key),
};
