/**
 * Cross-platform storage layer.
 *
 * - `zustandMMKVStorage`  — async adapter for Zustand's `persist` middleware;
 *                           backed by AsyncStorage (uses localStorage on web via react-native-web).
 * - `Storage`             — sync typed helpers backed by an in-memory map.
 *                           Used for simple, non-critical values and tests.
 *                           NOTE: in-memory values are not persisted across restarts;
 *                           all durable app state goes through Zustand's persist layer.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── In-memory backing store for synchronous helpers ─────────────────────────

const _mem: Record<string, string> = {};

export const storage = {
  getString: (key: string): string | undefined => _mem[key],
  set: (key: string, value: string | boolean | number): void => {
    _mem[key] = String(value);
  },
  getBoolean: (key: string): boolean | undefined => {
    if (!(key in _mem)) return undefined;
    return _mem[key] === 'true';
  },
  getNumber: (key: string): number | undefined => {
    if (!(key in _mem)) return undefined;
    return Number(_mem[key]);
  },
  delete: (key: string): void => {
    delete _mem[key];
  },
  clearAll: (): void => {
    Object.keys(_mem).forEach((k) => delete _mem[k]);
  },
};

// ─── Typed sync helpers ───────────────────────────────────────────────────────

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

// ─── Zustand persistence adapter — async, uses AsyncStorage ──────────────────
// AsyncStorage is built into Expo Go and works on web via react-native-web
// (uses window.localStorage internally on web).

export const zustandMMKVStorage = {
  getItem: (key: string): Promise<string | null> => AsyncStorage.getItem(key),
  setItem: (key: string, value: string): Promise<void> =>
    AsyncStorage.setItem(key, value),
  removeItem: (key: string): Promise<void> => AsyncStorage.removeItem(key),
};
