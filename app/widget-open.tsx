/**
 * Widget-open trampoline screen.
 *
 * When the user taps a home-screen widget, the OPEN_URI click action fires:
 *   quotable://widget-open?text=<encoded>&author=<encoded>&id=<quoteId>&widgetId=<id>
 *
 * Using an explicit route ("widget-open") instead of the root URL
 * ("quotable://?...") is more reliable across Android versions and expo-router
 * v6 — the router matches named paths deterministically, whereas the empty-
 * authority root URL can be mis-parsed in some environments.
 *
 * This screen:
 *   1. Reads the quote data from the URL params (injected by expo-router).
 *   2. Stores the quote in useDeepLinkStore so QuoteCard shows it.
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
  const { text, author, id, widgetId } = useLocalSearchParams<{
    text?: string;
    author?: string;
    id?: string;
    widgetId?: string;
  }>();

  useEffect(() => {
    async function handleAndNavigate() {
      const resolvedText = text ? String(text) : null;
      const resolvedAuthor = String(author ?? '');
      const resolvedId = String(id ?? '');

      if (resolvedText) {
        // Quote content is embedded in the URI — no network or AsyncStorage needed.
        useDeepLinkStore.getState().setPendingQuote({
          id:     resolvedId,
          text:   resolvedText,
          author: resolvedAuthor,
        });
      } else if (widgetId) {
        // Fallback: widget rendered before the text-embedding update.
        try {
          const raw = await AsyncStorage.getItem('widget-store-v2');
          if (raw) {
            const parsed = JSON.parse(raw) as {
              state?: { widgetConfigs?: Record<string, WidgetInstanceConfig> };
            };
            const cached = parsed?.state?.widgetConfigs?.[String(widgetId)]?.cachedQuote;
            if (cached) {
              useDeepLinkStore.getState().setPendingQuote({
                id:     cached.quoteId ?? '',
                text:   cached.text,
                author: cached.author,
              });
            }
          }
        } catch {}
      }

      // Return to the main screen. canGoBack() is true when the app was already
      // running (warm start) — the stack is [index → widget-open] and we go
      // back. On a cold start expo-router may have placed index below us
      // already; if not, replace navigates there directly.
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
