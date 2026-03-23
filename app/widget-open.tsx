/**
 * Widget-open trampoline screen.
 *
 * When the user taps a home-screen widget, the OPEN_URI click action fires:
 *   quotable://widget-open?widgetId=<id>
 *
 * The URI is intentionally short (widgetId only) to avoid Android 12+
 * FLAG_IMMUTABLE PendingIntent limitations — embedding quote text caused the
 * URI to change on every re-render, but immutable PendingIntents can't be
 * updated, making taps fire stale URIs or become unresponsive.
 *
 * The displayed quote is stored in AsyncStorage under `widget-shown-{widgetId}`
 * immediately after every renderWidget / requestWidgetUpdateById call.
 *
 * This screen:
 *   1. Reads the quote from `widget-shown-{widgetId}` (falls back to cachedQuote).
 *   2. Stores it in useDeepLinkStore so QuoteCard shows it.
 *   3. Immediately navigates back to the main screen — the user never sees this.
 */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDeepLinkStore } from '../store/useDeepLinkStore';
import type { WidgetInstanceConfig } from '../store/useWidgetStore';

export default function WidgetOpenScreen() {
  const router = useRouter();
  const { widgetId } = useLocalSearchParams<{ widgetId?: string }>();

  useEffect(() => {
    async function handleAndNavigate() {
      const wid = String(widgetId ?? '');

      if (wid) {
        try {
          // Primary: read the quote that was last rendered onto the widget face.
          const shown = await AsyncStorage.getItem(`widget-shown-${wid}`);
          if (shown) {
            const parsed = JSON.parse(shown) as { text?: string; author?: string; id?: string };
            if (parsed.text) {
              useDeepLinkStore.getState().setPendingQuote({
                id:     parsed.id ?? '',
                text:   parsed.text,
                author: parsed.author ?? '',
              });
            }
          } else {
            // Fallback: widget rendered before the widget-shown key was introduced.
            const raw = await AsyncStorage.getItem('widget-store-v2');
            if (raw) {
              const store = JSON.parse(raw) as {
                state?: { widgetConfigs?: Record<string, WidgetInstanceConfig> };
              };
              const cached = store?.state?.widgetConfigs?.[wid]?.cachedQuote;
              if (cached) {
                useDeepLinkStore.getState().setPendingQuote({
                  id:     cached.quoteId ?? '',
                  text:   cached.text,
                  author: cached.author,
                });
              }
            }
          }
        } catch {
          // Non-critical — navigate to main screen regardless.
        }
      }

      // Return to the main screen. canGoBack() is true on warm start
      // (stack: [index → widget-open]). On cold start replace navigates directly.
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    }

    handleAndNavigate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Black background — this screen is never visible to the user.
  return <View style={{ flex: 1, backgroundColor: '#0D0D0D' }} />;
}
