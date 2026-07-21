import { Audio } from 'expo-av';

const FILES: Record<string, any> = {
  a: require('../assets/sounds/nk-cream/a.wav'),
  b: require('../assets/sounds/nk-cream/b.wav'),
  c: require('../assets/sounds/nk-cream/c.wav'),
  d: require('../assets/sounds/nk-cream/d.wav'),
  e: require('../assets/sounds/nk-cream/e.wav'),
  f: require('../assets/sounds/nk-cream/f.wav'),
  g: require('../assets/sounds/nk-cream/g.wav'),
  h: require('../assets/sounds/nk-cream/h.wav'),
  i: require('../assets/sounds/nk-cream/i.wav'),
  j: require('../assets/sounds/nk-cream/j.wav'),
  k: require('../assets/sounds/nk-cream/k.wav'),
  l: require('../assets/sounds/nk-cream/l.wav'),
  m: require('../assets/sounds/nk-cream/m.wav'),
  n: require('../assets/sounds/nk-cream/n.wav'),
  o: require('../assets/sounds/nk-cream/o.wav'),
  p: require('../assets/sounds/nk-cream/p.wav'),
  q: require('../assets/sounds/nk-cream/q.wav'),
  r: require('../assets/sounds/nk-cream/r.wav'),
  s: require('../assets/sounds/nk-cream/s.wav'),
  t: require('../assets/sounds/nk-cream/t.wav'),
  u: require('../assets/sounds/nk-cream/u.wav'),
  v: require('../assets/sounds/nk-cream/v.wav'),
  w: require('../assets/sounds/nk-cream/w.wav'),
  x: require('../assets/sounds/nk-cream/x.wav'),
  y: require('../assets/sounds/nk-cream/y.wav'),
  z: require('../assets/sounds/nk-cream/z.wav'),
  ' ': require('../assets/sounds/nk-cream/space.wav'),
  '\n': require('../assets/sounds/nk-cream/enter.wav'),
};

const FALLBACK_KEY = 'a';

const cache: Record<string, Audio.Sound | null> = {};
const pending: Record<string, boolean> = {};
let audioModeSet = false;

async function ensureAudioMode() {
  if (audioModeSet) return;
  await Audio.setAudioModeAsync({ playsInSilentModeIOS: false, staysActiveInBackground: false });
  audioModeSet = true;
}

async function loadSound(key: string) {
  if (key in cache || pending[key]) return;
  pending[key] = true;
  try {
    await ensureAudioMode();
    const { sound } = await Audio.Sound.createAsync(FILES[key], { volume: 0.2 });
    cache[key] = sound;
  } catch {
    cache[key] = null;
  }
}

export async function playClick(char: string) {
  const key = FILES[char.toLowerCase()] ? char.toLowerCase() : FALLBACK_KEY;
  try {
    if (!(key in cache)) await loadSound(key);
    await cache[key]?.replayAsync();
  } catch {}
}
