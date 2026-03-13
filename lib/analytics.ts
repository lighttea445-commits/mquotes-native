/**
 * Analytics abstraction layer.
 * In development: events are logged to console.
 * In production: replace the TODO section with your provider (PostHog, Amplitude, Segment, etc).
 */

export type AnalyticsEvent =
  | 'quote_viewed'
  | 'quote_favorited'
  | 'quote_unfavorited'
  | 'quote_shared'
  | 'category_selected'
  | 'category_cleared'
  | 'theme_changed'
  | 'mix_created'
  | 'streak_started'
  | 'streak_continued'
  | 'streak_broken'
  | 'paywall_shown'
  | 'subscription_purchased'
  | 'subscription_restored'
  | 'api_error'
  | 'onboarding_completed';

export type EventProperties = Record<string, string | number | boolean | undefined>;

function track(event: AnalyticsEvent, properties?: EventProperties): void {
  if (__DEV__) {
    console.log('[Analytics]', event, properties ?? '');
  }
  // TODO: plug in your analytics provider:
  // PostHog:  posthog.capture(event, properties)
  // Amplitude: Amplitude.logEvent(event, properties)
  // Segment:   analytics.track(event, properties)
}

export const analytics = { track };
