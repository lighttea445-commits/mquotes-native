import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as StoreReview from 'expo-store-review';
import { useAppStore } from '../store/useAppStore';

const REVIEW_PROMPT_THRESHOLD_MS = 30 * 60 * 1000;
const SAMPLE_INTERVAL_MS = 30 * 1000;

/**
 * Tracks cumulative foreground time and triggers the native "rate this app"
 * prompt once the user has spent 30 active minutes in the app. Latches off
 * permanently after firing once — expo-store-review can't report whether the
 * user actually rated, so a single lifetime prompt is the closest we can get
 * to "never ask again after they've rated".
 */
export function useReviewPrompt() {
  const activeSince = useRef<number | null>(null);

  useEffect(() => {
    let removeAppStateListener: (() => void) | undefined;
    let interval: ReturnType<typeof setInterval> | undefined;

    function flush() {
      if (activeSince.current === null) return;
      const now = Date.now();
      const elapsed = now - activeSince.current;
      activeSince.current = now;
      if (elapsed <= 0) return;

      const { promptShown } = useAppStore.getState().reviewPrompt;
      if (promptShown) return;

      useAppStore.getState().addActiveUsageMs(elapsed);

      if (useAppStore.getState().reviewPrompt.activeMs >= REVIEW_PROMPT_THRESHOLD_MS) {
        useAppStore.getState().markReviewPromptShown();
        StoreReview.hasAction()
          .then((can) => {
            if (can) return StoreReview.requestReview();
          })
          .catch(() => {});
      }
    }

    function handleAppStateChange(next: AppStateStatus) {
      if (next === 'active') {
        activeSince.current = Date.now();
      } else {
        flush();
        activeSince.current = null;
      }
    }

    function start() {
      if (AppState.currentState === 'active') {
        activeSince.current = Date.now();
      }
      const sub = AppState.addEventListener('change', handleAppStateChange);
      removeAppStateListener = () => sub.remove();
      interval = setInterval(flush, SAMPLE_INTERVAL_MS);
    }

    let unsubHydration: (() => void) | undefined;
    if (useAppStore.persist.hasHydrated()) {
      start();
    } else {
      unsubHydration = useAppStore.persist.onFinishHydration(start);
    }

    return () => {
      flush();
      removeAppStateListener?.();
      unsubHydration?.();
      if (interval) clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
