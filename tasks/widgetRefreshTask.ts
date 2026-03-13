/**
 * Widget background-refresh task (Android only).
 *
 * Iterates all active widget instances. Each instance has its own config
 * (quoteType, updateInterval, customQuoteId) stored in useWidgetStore.
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

import { fetchMultipleRandomQuotes, fetchQuotesByCategory } from '../lib/quotesApi';
import {
  useWidgetStore,
  WidgetRefreshFrequency,
  REFRESH_FREQUENCY_MINUTES,
  defaultInstanceConfig,
} from '../store/useWidgetStore';
import { useFavoritesStore } from '../store/useFavoritesStore';
import { useUserQuotesStore } from '../store/useUserQuotesStore';
import { WidgetBridge } from '../modules/widget-bridge';

export const WIDGET_TASK_NAME = 'com.eriksen.quotable.widget-refresh';

// ── Task definition ───────────────────────────────────────────────────────────
//
// IMPORTANT: TaskManager.defineTask must run at module-load time, not deferred
// inside a function called from a useEffect. When Android wakes the app in the
// background to execute this task the JS bundle is evaluated, so any handler
// that is only registered during component mount will never exist in time.

if (TaskManager) {
  TaskManager.defineTask(WIDGET_TASK_NAME, async () => {
    try {
      const activeWidgets = await WidgetBridge.getActiveWidgets();
      if (activeWidgets.length === 0) {
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }

      const widgetStore  = useWidgetStore.getState();
      const favorites    = useFavoritesStore.getState().favorites;
      const userQuotes   = useUserQuotesStore.getState().userQuotes;

      let hadNewData = false;

      for (const { widgetId, type } of activeWidgets) {
        const idStr = widgetId.toString();
        const config = widgetStore.widgetConfigs[idStr] ?? defaultInstanceConfig(type);

        // Skip auto-refresh for widgets set to "Never"
        if (config.updateInterval === 'off') continue;

        // Honour each widget's own refresh frequency. The background task runs
        // at the shortest interval (hourly), so daily/twice-daily widgets must
        // gate themselves via their lastRefreshed timestamp.
        if (config.lastRefreshed) {
          const ageMs = Date.now() - new Date(config.lastRefreshed).getTime();
          const intervalMs = REFRESH_FREQUENCY_MINUTES[config.updateInterval] * 60_000;
          if (ageMs < intervalMs) continue; // not due yet
        }

        let quoteText   = '';
        let quoteAuthor = '';

        if (type === 'custom') {
          const q = config.customQuoteId
            ? userQuotes.find((uq) => uq.id === config.customQuoteId)
            : null;
          if (q) {
            quoteText   = q.text;
            quoteAuthor = q.author;
          } else if (config.cachedQuote) {
            quoteText   = config.cachedQuote.text;
            quoteAuthor = config.cachedQuote.author;
          }
        } else if (config.quoteType === 'favorites') {
          if (favorites.length > 0) {
            const pick = favorites[Math.floor(Math.random() * favorites.length)];
            quoteText   = pick.text;
            quoteAuthor = pick.author;
          }
        } else if (config.quoteType === 'general') {
          const quotes = await fetchMultipleRandomQuotes(1);
          if (quotes.length > 0) {
            quoteText   = quotes[0].content;
            quoteAuthor = quotes[0].author;
          }
        } else {
          const quotes = await fetchQuotesByCategory(config.quoteType);
          if (quotes.length > 0) {
            quoteText   = quotes[0].content;
            quoteAuthor = quotes[0].author;
          }
        }

        if (!quoteText) continue;

        widgetStore.setWidgetConfig(idStr, {
          cachedQuote:   { text: quoteText, author: quoteAuthor },
          lastRefreshed: new Date().toISOString(),
        });

        await WidgetBridge.updateWidget({
          widgetId,
          widgetType:    type,
          quoteText,
          transparentBg: config.transparentBg,
          intervalMs:    REFRESH_FREQUENCY_MINUTES[config.updateInterval] * 60_000,
          quoteType:     config.quoteType,
          textSize:      config.textSize,
        });

        hadNewData = true;
      }

      await WidgetBridge.reloadTimelines();

      return hadNewData
        ? BackgroundFetch.BackgroundFetchResult.NewData
        : BackgroundFetch.BackgroundFetchResult.NoData;
    } catch (err) {
      console.warn('[WidgetRefreshTask] error:', err);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
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
