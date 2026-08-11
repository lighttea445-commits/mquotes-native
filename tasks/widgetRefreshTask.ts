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

import { Platform } from 'react-native';
import { resolveWidgetQuote } from '../lib/widgetQuotes';
import {
  useWidgetStore,
  WidgetRefreshFrequency,
  REFRESH_FREQUENCY_MINUTES,
  isRefreshDue,
} from '../store/useWidgetStore';
import { useFavoritesStore } from '../store/useFavoritesStore';
import { useUserQuotesStore } from '../store/useUserQuotesStore';
import { useCollectionsStore } from '../store/useCollectionsStore';
import { WidgetBridge } from '../modules/widget-bridge';

export const WIDGET_TASK_NAME = 'com.eriksen.quotable.widget-refresh';

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
        waitForHydration(useCollectionsStore),
      ]);

      const widgetStore = useWidgetStore.getState();

      let hadNewData = false;

      for (const { widgetId } of activeWidgets) {
        const config = widgetStore.claimConfigFor(widgetId.toString());
        if (!config) continue; // no config exists yet — nothing to refresh

        // Honour each widget's own refresh frequency. The background task runs
        // at the shortest interval (hourly), so daily/twice-daily widgets must
        // gate themselves via their lastRefreshed timestamp. Shared with the
        // headless WIDGET_UPDATE path so the two can't drift apart.
        if (!isRefreshDue(config.lastRefreshed, config.updateInterval)) continue;

        // "Mirror the app" (customize off) behaves like the free General feed.
        // Resolution goes through the shared helper so this path handles every
        // source (favorites, my quotes, a collection, a category) exactly the
        // way the headless WIDGET_UPDATE path does.
        const quoteType = config.customize ? config.quoteType : 'general';
        const quote = await resolveWidgetQuote(quoteType);

        if (!quote) continue;

        // Re-render the widget first (also writes widget-shown-{widgetId}).
        await WidgetBridge.updateWidget({
          widgetId,
          quote,
          config: { showBorder: config.showBorder },
        });

        // Persist cachedQuote/lastRefreshed AFTER the widget has re-rendered so
        // a tap between fetch and render still reads the previous (correct) quote.
        persistCachedQuote(config.id, quote);

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

/**
 * Unlike widgetTaskHandler.ts (which may get a cold JS engine and reads/writes
 * AsyncStorage directly), this task already waits for the store to hydrate
 * above, so writing through the Zustand action is enough — its persist
 * middleware flushes to the same AsyncStorage key.
 */
function persistCachedQuote(configId: string, quote: { id?: string; text: string; author: string }) {
  useWidgetStore.getState().updateConfig(configId, {
    cachedQuote: { text: quote.text, author: quote.author, quoteId: quote.id },
    lastRefreshed: new Date().toISOString(),
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Call this once at app startup to register the background fetch schedule. */
export async function registerWidgetRefreshTask(
  frequency: WidgetRefreshFrequency = 'hourly',
): Promise<void> {
  // iOS: rely on WidgetKit's own timeline refresh (see QuotesWidget.swift) plus the
  // foreground WidgetBridge.updateWidget()/reloadTimelines() calls instead — iOS's
  // BGTaskScheduler is heavily OS-throttled and needs its own Info.plist entries.
  if (Platform.OS !== 'android') return;
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
