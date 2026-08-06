import { useMemo } from 'react';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../store/useAppStore';

/**
 * The single haptics entry point. Nothing outside this file may call
 * `expo-haptics` directly, for two reasons:
 *
 * 1. The user's `hapticsEnabled` preference has to gate every buzz. Direct
 *    calls skipped it and fired with the toggle off.
 * 2. Intensity is clamped here. Everything the app plays should sit at the
 *    threshold of perception: a whisper of confirmation, never a thump. Call
 *    sites still ask for the feedback they mean semantically, and this module
 *    decides how hard it lands.
 *
 * So `impact()` always plays Soft, and `notification()` collapses Apple's
 * multi-thump success/warning/error patterns into that same single Soft tap.
 */
export function useHaptics() {
  const hapticsEnabled = useAppStore((s) => s.preferences.hapticsEnabled);

  // Memoised so callers can safely list `haptics` in a dependency array
  // without invalidating their own useCallback on every render.
  return useMemo(
    () => ({
      /** Confirmation of an action the user took: favourite, share, apply. */
      impact: () => {
        if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
      },
      /** Something completed or failed on its own: a load, a save. */
      notification: () => {
        if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
      },
      /** Touch down on a control, or a value changing under the finger. */
      selection: () => {
        if (hapticsEnabled) Haptics.selectionAsync();
      },
    }),
    [hapticsEnabled],
  );
}
