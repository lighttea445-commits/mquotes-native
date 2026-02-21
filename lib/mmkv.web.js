// Web stub for react-native-mmkv
// MMKV is native-only; on web we use localStorage directly (see storage.ts)
class MMKV {
  constructor() {}
  getString(key) { return localStorage.getItem(key) ?? undefined; }
  set(key, value) { localStorage.setItem(key, String(value)); }
  getBoolean(key) {
    const v = localStorage.getItem(key);
    return v === null ? undefined : v === 'true';
  }
  getNumber(key) {
    const v = localStorage.getItem(key);
    return v === null ? undefined : Number(v);
  }
  delete(key) { localStorage.removeItem(key); }
  clearAll() { localStorage.clear(); }
}

module.exports = { MMKV };
