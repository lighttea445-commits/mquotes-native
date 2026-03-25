/**
 * Widget background-refresh task (Android only).
 *
 * Iterates all active widget instances. Each instance has its own config
 * (quoteType, updateInterval) stored in useWidgetStore via AsyncStorage.
 * Quotes are fetched per-instance and pushed individually via WidgetBridge.updateWidget().
 */

// Dynamically require so missing packages don't crash Expo Go.
let BackgroundFetch: any = null;
let TaskManager: any = null;

try {
  BackgroundFetch = require('expo-background-fetch');
  TaskManager = require('expo-task-manager');
} catch {
  // Running in Expo Go without these packages installed — silently skip.
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchMultipleRandomQuotes, fetchQuotesByCategory } from '../lib/quotesApi';
import {
  useWidgetStore,
  WidgetRefreshFrequency,
  REFRESH_FREQUENCY_MINUTES,
  defaultInstanceConfig,
  type WidgetInstanceConfig,
} from '../store/useWidgetStore';
import { useFavoritesStore } from '../store/useFavoritesStore';
import { useUserQuotesStore } from '../store/useUserQuotesStore';
import { WidgetBridge } from '../modules/widget-bridge';

export const WIDGET_TASK_NAME = 'com.eriksen.quotable.widget-refresh';

const WIDGET_STORE_KEY = 'widget-store-v2';

// ── Task definition ───────────────────────────────────────────────────────────
//
// IMPORTANT: TaskManager.defineTask must run at module-load time, not deferred
// inside a function called from a useEffect. When Android wakes the app in the
// background to execute this task the JS bundle is evaluated, so any handler
// that is only registered during component mount will never exist in time.

/** Wait for a Zustand persist store to finish hydrating from AsyncStorage. */
function waitForHydration(store: { persist: { hasHydrated: () => boolean; onFinishHydration: (cb: () => void) => () => void } }): Promise<void> {
  return new Promise((resolve) => {
    if (store.persist.hasHydrated()) { resolve(); return; }
    const unsub = store.persist.onFinishHydration(() => { unsub(); resolve(); });
  });
}

if (TaskManager) {
  TaskManager.defineTask(WIDGET_TASK_NAME, async () => {
    try {
      const activeWidgets = await WidgetBridge.getActiveWidgets();
      if (activeWidgets.length === 0) {
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }

      // Wait for all stores to hydrate from AsyncStorage before reading them.
      // On background wakes the JS bundle runs fresh and Zustand hasn't loaded
      // its persisted state yet — without this, widgetConfigs/favorites/userQuotes
      // appear empty and every widget falls back to general quotes.
      await Promise.all([
        waitForHydration(useWidgetStore),
        waitForHydration(useFavoritesStore),
        waitForHydration(useUserQuotesStore),
      ]);

      const widgetStore  = useWidgetStore.getState();
      const favorites    = useFavoritesStore.getState().favorites;
      const userQuotes   = useUserQuotesStore.getState().userQuotes;

      let hadNewData = false;

      for (const { widgetId } of activeWidgets) {
        const idStr = widgetId.toString();
        const config = widgetStore.widgetConfigs[idStr] ?? defaultInstanceConfig('basic');

        // Honour each widget's own refresh frequency. The background task runs
        // at the shortest interval (hourly), so daily/twice-daily widgets must
        // gate themselves via their lastRefreshed timestamp.
        if (config.lastRefreshed) {
          const ageMs = Date.now() - new Date(config.lastRefreshed).getTime();
          const intervalMs = REFRESH_FREQUENCY_MINUTES[config.updateInterval] * 60_000;
          if (ageMs < intervalMs) continue; // not due yet
        }

        let quote: { id?: string; text: string; author: string } | null = null;

        if (config.quoteType === 'favorites') {
          if (favorites.length > 0) {
            const f = favorites[Math.floor(Math.random() * favorites.length)];
            quote = { id: f.id, text: f.text, author: f.author };
          }
        } else if (config.quoteType === 'my-quotes') {
          if (userQuotes.length > 0) {
            const q = userQuotes[Math.floor(Math.random() * userQuotes.length)];
            quote = { id: q.id, text: q.text, author: q.author };
          }
        } else if (config.quoteType === 'general') {
          const quotes = await fetchMultipleRandomQuotes(1);
          if (quotes[0]) quote = { id: quotes[0]._id, text: quotes[0].content, author: quotes[0].author };
        } else {
          const quotes = await fetchQuotesByCategory(config.quoteType);
          if (quotes.length) {
            const q = quotes[Math.floor(Math.random() * quotes.length)];
            quote = { id: q._id, text: q.content, author: q.author };
          }
        }

        if (!quote) continue;

        // Re-render the widget first (also writes widget-shown-{widgetId}).
        await WidgetBridge.updateWidget({
          widgetId,
          quote,
          config: {
            showAuthor:    config.showAuthor,
            transparentBg: config.transparentBg,
            textSize:      config.textSize,
          },
        });

        // Persist cachedQuote/lastRefreshed AFTER the widget has re-rendered so
        // a tap between fetch and render still reads the previous (correct) quote.
        await persistCachedQuote(widgetId, config, quote);

        hadNewData = true;
      }

      return hadNewData
        ? BackgroundFetch.BackgroundFetchResult.NewData
        : BackgroundFetch.BackgroundFetchResult.NoData;
    } catch (err) {
      console.warn('[WidgetRefreshTask] error:', err);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function persistCachedQuote(
  widgetId: number,
  config: WidgetInstanceConfig,
  quote: { id?: string; text: string; author: string },
) {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_STORE_KEY);
    const parsed = raw
      ? (JSON.parse(raw) as { state: { widgetConfigs: Record<string, WidgetInstanceConfig> }; version?: number })
      : { state: { widgetConfigs: {} } };

    parsed.state.widgetConfigs[widgetId.toString()] = {
      ...config,
      cachedQuote: { text: quote.text, author: quote.author, quoteId: quote.id },
      lastRefreshed: new Date().toISOString(),
    };
    await AsyncStorage.setItem(WIDGET_STORE_KEY, JSON.stringify(parsed));

    // Also update the in-memory Zustand store so the UI stays consistent.
    useWidgetStore.getState().setWidgetConfig(widgetId.toString(), {
      cachedQuote:   { text: quote.text, author: quote.author, quoteId: quote.id },
      lastRefreshed: new Date().toISOString(),
    });
  } catch {
    // Non-critical — the widget still refreshes even if we can't persist.
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Call this once at app startup to register the background fetch schedule. */
export async function registerWidgetRefreshTask(
  frequency: WidgetRefreshFrequency = 'hourly',
): Promise<void> {
  if (!BackgroundFetch || !TaskManager) return;

  // Do NOT unregister + re-register on every launch. Doing so resets the
  // minimumInterval countdown, so the task never fires for users who open
  // the app more frequently than the interval (e.g. hourly users who open
  // every 45 min would never see a background widget refresh).
  const isRegistered = await TaskManager.isTaskRegisteredAsync(WIDGET_TASK_NAME);
  if (isRegistered) return;

  const intervalSeconds = REFRESH_FREQUENCY_MINUTES[frequency] * 60;

  await BackgroundFetch.registerTaskAsync(WIDGET_TASK_NAME, {
    minimumInterval: intervalSeconds,
    stopOnTerminate: false,
    startOnBoot:     true,
  });
}

export async function unregisterWidgetRefreshTask(): Promise<void> {
  if (!TaskManager) return;
  const isRegistered = await TaskManager.isTaskRegisteredAsync(WIDGET_TASK_NAME);
  if (isRegistered) {
    await BackgroundFetch.unregisterTaskAsync(WIDGET_TASK_NAME);
  }
}
