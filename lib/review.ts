import { AppState, Linking, Platform } from 'react-native';
import * as StoreReview from 'expo-store-review';
import { useAppStore } from '../store/useAppStore';
import { FAVORITES_GOAL, useFavoritesStore } from '../store/useFavoritesStore';

/**
 * The numeric App Store id, from App Store Connect (App Information, Apple ID).
 * It only exists once the app record does, so until it is filled in there is no
 * review page to open and `openStoreReviewPage` falls back to the system
 * prompt on iOS. Fill this in before submitting.
 */
const APP_STORE_ID = '';

const ANDROID_PACKAGE = 'com.kovoapps.quotable';

const IOS_REVIEW_URL = `https://apps.apple.com/app/id${APP_STORE_ID}?action=write-review`;
const PLAY_REVIEW_URL = `market://details?id=${ANDROID_PACKAGE}`;
const PLAY_WEB_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

/**
 * Where a "Rate this app" button goes.
 *
 * Deliberately not the system prompt. Apple asks that it is never raised in
 * response to a tap, and it silently does nothing once the yearly allowance is
 * spent or the user has turned in-app reviews off, which leaves a row that
 * looks tappable and answers with nothing. A link always visibly does
 * something.
 */
export async function openStoreReviewPage(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await Linking.openURL(PLAY_REVIEW_URL);
    } catch {
      // No Play Store app on the device: the web listing takes the review too.
      await Linking.openURL(PLAY_WEB_URL).catch(() => {});
    }
    return;
  }

  if (!APP_STORE_ID) {
    if (await StoreReview.hasAction()) await StoreReview.requestReview().catch(() => {});
    return;
  }

  await Linking.openURL(IOS_REVIEW_URL).catch(() => {});
}

/** iOS shows at most three of these a year, so there is nothing to gain by asking more often. */
const MAX_PROMPTS = 3;

/**
 * Days between attempts. Inside the yearly cap either way, and far enough apart
 * that a suppressed attempt is not the end of it: the old timer fired once, and
 * a silently blocked prompt spent the only ask the app ever made.
 */
const MIN_DAYS_BETWEEN_PROMPTS = 120;

/** Lets the moment that earned the prompt finish playing before the sheet lands. */
const PROMPT_DELAY_MS = 1500;

/**
 * Raises the system review prompt, but only off the back of something that just
 * went well and only for someone with enough of the app behind them to have an
 * opinion. Called from the home screen, so it can never land over onboarding or
 * an open sheet.
 */
export function askForReviewAfterGoodMoment(): void {
  const state = useAppStore.getState();
  if (!state.onboardingComplete) return;
  if (useFavoritesStore.getState().favorites.length < FAVORITES_GOAL) return;

  const review = state.reviewPrompt;
  // attempts is absent on state persisted by the version this replaced, where
  // promptShown was the whole record. That flag counts as one spent attempt.
  const used = (review.attempts ?? 0) + (review.promptShown ? 1 : 0);
  if (used >= MAX_PROMPTS) return;

  if (review.lastPromptAt) {
    const days = (Date.now() - new Date(review.lastPromptAt).getTime()) / 86_400_000;
    if (days < MIN_DAYS_BETWEEN_PROMPTS) return;
  }

  setTimeout(() => {
    if (AppState.currentState !== 'active') return;
    StoreReview.hasAction()
      .then(can => {
        if (!can) return;
        useAppStore.getState().noteReviewPromptShown();
        return StoreReview.requestReview();
      })
      .catch(() => {});
  }, PROMPT_DELAY_MS);
}
