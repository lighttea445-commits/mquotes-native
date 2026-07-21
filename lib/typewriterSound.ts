import { Audio } from 'expo-av';

let sound: Audio.Sound | null = null;
let loading = false;

async function load() {
  if (sound || loading) return;
  loading = true;
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: false, staysActiveInBackground: false });
    const { sound: s } = await Audio.Sound.createAsync(
      require('../assets/sounds/typewriter-click.wav'),
      { volume: 0.35 },
    );
    sound = s;
  } catch {
    loading = false;
  }
}

export async function playClick() {
  try {
    if (!sound) await load();
    await sound?.replayAsync();
  } catch {}
}
