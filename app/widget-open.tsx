/**
 * Widget-open trampoline screen.
 *
 * When the user taps a home-screen widget, the OPEN_URI click action fires:
 *   quotable://widget-open?widgetId=<id>                (Android)
 *   quotable://widget-open?src=ios&cfg=<id>&i=<index>   (iOS)
 *   quotable://widget-open?src=ios&setup=1              (iOS, no config resolved)
 *
 * iOS has no widget ids, so the tap URL instead carries which config the
 * placed widget was bound to (chosen in Apple's Edit Widget panel) plus the
 * index into that config's own queue. Each config keeps a separate queue,
 * mirrored to AsyncStorage under IOS_WIDGET_QUEUE_KEY_PREFIX + configId by
 * WidgetBridge.updateIOSQueue() — so the app can show exactly the quote the
 * widget's timeline had on screen.
 *
 * The URI is intentionally short (ids only) to avoid Android 12+
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
import type { WidgetConfig } from '../store/useWidgetStore';
import { IOS_WIDGET_QUEUE_KEY_PREFIX } from '../modules/widget-bridge';
import type { WidgetQuote } from '../lib/widgetQuotes';

export default function WidgetOpenScreen() {
  const router = useRouter();
  const { widgetId, src, i, cfg, setup } = useLocalSearchParams<{
    widgetId?: string;
    src?: string;
    i?: string;
    cfg?: string;
    setup?: string;
  }>();

  useEffect(() => {
    async function handleAndNavigate() {
      const wid = String(widgetId ?? '');

      if (src === 'ios' && setup === '1') {
        // The widget resolved no config, so there is no quote to carry back.
        // Make sure one exists and reaches the App Group, then put the user on
        // the Widgets screen: the extension needs mq_configs before it can
        // render anything, and picking a config is a manual Edit Widget step
        // the app can neither perform nor observe.
        try {
          const { useWidgetStore } = await import('../store/useWidgetStore');
          const { ensureIOSConfigMetadata, refreshAllIOSWidgets } = await import('../lib/iosWidget');
          // Cold start: creating before rehydration would seed a config that
          // the persisted state then overwrites.
          if (!useWidgetStore.persist.hasHydrated()) {
            await new Promise<void>((resolve) => {
              let unsub: (() => void) | undefined;
              let timer: ReturnType<typeof setTimeout> | undefined;
              const settle = () => {
                unsub?.();
                if (timer) clearTimeout(timer);
                resolve();
              };
              unsub = useWidgetStore.persist.onFinishHydration(settle);
              timer = setTimeout(settle, 2000);
              // Hydration can land between the check above and the subscribe,
              // and then the listener never fires. This screen is invisible
              // and navigates away at the end, so a missed resolve strands the
              // user on a black screen.
              if (useWidgetStore.persist.hasHydrated()) settle();
            });
          }
          if (useWidgetStore.getState().configs.length === 0) {
            useWidgetStore.getState().addConfig();
          }
          // Only the metadata write is awaited: it's a native UserDefaults
          // write and it's the part the extension needs to resolve a config at
          // all. Filling the queues fetches quotes, and this screen is
          // invisible and navigates away at the end, so awaiting the network
          // here would hold the user on a black screen for its duration.
          await ensureIOSConfigMetadata();
          refreshAllIOSWidgets().catch(() => {});
        } catch {
          // Non-critical — still open the screen so the user isn't stranded.
        }
        useDeepLinkStore.getState().setPendingSheet('widgets');
      } else if (src === 'ios' && cfg) {
        try {
          const raw = await AsyncStorage.getItem(`${IOS_WIDGET_QUEUE_KEY_PREFIX}${cfg}`);
          const queue = raw ? (JSON.parse(raw) as WidgetQuote[]) : [];
          if (Array.isArray(queue) && queue.length > 0) {
            const parsed = Number.parseInt(String(i ?? '0'), 10);
            const index = Number.isNaN(parsed) ? 0 : Math.min(Math.max(parsed, 0), queue.length - 1);
            const quote = queue[index];
            if (quote?.text) {
              useDeepLinkStore.getState().setPendingQuote({
                id:     quote.id ?? '',
                text:   quote.text,
                author: quote.author ?? '',
              });
            }
          }
        } catch {
          // Non-critical — navigate to main screen regardless.
        }
      } else if (wid) {
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
                state?: { configs?: WidgetConfig[]; bindings?: Record<string, string> };
              };
              const configId = store?.state?.bindings?.[wid];
              const cached = store?.state?.configs?.find((c) => c.id === configId)?.cachedQuote;
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
