/**
 * Cross-platform storage layer.
 *
 * `zustandMMKVStorage` is the async adapter for Zustand's `persist` middleware;
 * backed by AsyncStorage (uses localStorage on web via react-native-web).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Zustand persistence adapter — async, uses AsyncStorage ──────────────────
// AsyncStorage is built into Expo Go and works on web via react-native-web
// (uses window.localStorage internally on web).

export const zustandMMKVStorage = {
  getItem: (key: string): Promise<string | null> => AsyncStorage.getItem(key),
  setItem: (key: string, value: string): Promise<void> =>
    AsyncStorage.setItem(key, value),
  removeItem: (key: string): Promise<void> => AsyncStorage.removeItem(key),
};
