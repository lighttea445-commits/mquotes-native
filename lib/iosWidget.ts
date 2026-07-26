/**
 * iOS widget data pump.
 *
 * iOS gives the app no widget ids and cannot wake JS in the background, so the
 * Android model (one config per placed widget, refreshed by a headless task)
 * does not carry over. Instead:
 *
 *   • All iOS widgets share one config, stored under IOS_WIDGET_CONFIG_ID.
 *   • The app pre-writes a batch of quotes into the App Group; the widget
 *     extension walks that queue on its own timeline (QuotesWidget.swift).
 *   • Appearance (theme / text size / author) is configured in Apple's Edit
 *     Widget panel, not here — this file only supplies data.
 */

import { Platform } from 'react-native';
import {
  useWidgetStore,
  defaultInstanceConfig,
  REFRESH_FREQUENCY_MINUTES,
  type WidgetInstanceConfig,
} from '../store/useWidgetStore';
import { resolveWidgetQuotes, type WidgetQuote } from './widgetQuotes';
import {
  WidgetBridge,
  IOS_WIDGET_CONFIG_ID,
  IOS_WIDGET_QUEUE_KEY,
  IOS_WIDGET_QUEUE_SIZE,
} from '../modules/widget-bridge';

/** The single shared config backing every iOS widget. */
export function getIOSWidgetConfig(): WidgetInstanceConfig {
  const store = useWidgetStore.getState();
  return store.widgetConfigs[IOS_WIDGET_CONFIG_ID] ?? defaultInstanceConfig('basic');
}

export function setIOSWidgetConfig(updates: Partial<WidgetInstanceConfig>): void {
  useWidgetStore.getState().setWidgetConfig(IOS_WIDGET_CONFIG_ID, updates);
}

/**
 * How long a written queue stays good for: however long it takes the widget to
 * rotate through it, capped at a day so quotes don't repeat for two days on the
 * 'daily' cadence.
 */
function staleAfterMinutes(rotateMinutes: number): number {
  return Math.min(rotateMinutes * IOS_WIDGET_QUEUE_SIZE, 24 * 60);
}

function isStale(config: WidgetInstanceConfig, rotateMinutes: number): boolean {
  if (!config.lastRefreshed) return true;
  const written = Date.parse(config.lastRefreshed);
  if (Number.isNaN(written)) return true;
  return Date.now() - written >= staleAfterMinutes(rotateMinutes) * 60_000;
}

/**
 * Guards against overlapping runs. Foreground top-up, a Pro-state flip and the
 * Widgets screen's "Refresh now" can all fire within the same moment; without
 * this they'd each pull 48 quotes and race to write the queue.
 */
let inFlight: Promise<boolean> | null = null;

/**
 * Fills the widget's quote queue from the configured source and hands it to the
 * native bridge.
 *
 * No-op on non-iOS. Skipped when the existing queue is still fresh unless
 * `force` is set (the Widgets screen's "Refresh now" and any settings change
 * pass force). Returns true when a queue was actually written.
 */
export function refreshIOSWidget(options: { force?: boolean } = {}): Promise<boolean> {
  if (Platform.OS !== 'ios') return Promise.resolve(false);
  if (inFlight) return inFlight;

  inFlight = run(options).finally(() => { inFlight = null; });
  return inFlight;
}

async function run({ force = false }: { force?: boolean }): Promise<boolean> {
  const config = getIOSWidgetConfig();
  const rotateMinutes = REFRESH_FREQUENCY_MINUTES[config.updateInterval] ?? 60;

  if (!force && !isStale(config, rotateMinutes)) return false;

  const quotes = await resolveWidgetQuotes(config.quoteType, IOS_WIDGET_QUEUE_SIZE);

  // Network failed and nothing was returned — leave the existing queue in place
  // rather than blanking the widget.
  if (quotes.length === 0) return false;

  // Imported lazily so react-native-purchases stays out of the root layout's
  // startup import graph — this runs from app/_layout.tsx on every foreground.
  let isPro = false;
  try {
    isPro = (await import('../hooks/useRevenueCat')).getIsPro();
  } catch {
    // Treat an unavailable entitlement state as free; the widget renders
    // default appearance rather than nothing.
  }

  await WidgetBridge.updateIOSQueue({ quotes, rotateMinutes, isPro });

  setIOSWidgetConfig({
    cachedQuote: { text: quotes[0].text, author: quotes[0].author, quoteId: quotes[0].id },
    lastRefreshed: new Date().toISOString(),
  });

  return true;
}

/**
 * Rewrites only the Pro flag the widget's render path gates appearance on,
 * reusing the queue already on disk — no network call.
 *
 * Called when entitlement state flips (see hooks/useRevenueCat). At launch the
 * top-up usually runs before RevenueCat has resolved, writing isPro:false; this
 * corrects it without refetching 48 quotes.
 */
export async function setIOSWidgetPro(isPro: boolean): Promise<void> {
  if (Platform.OS !== 'ios') return;

  const config = getIOSWidgetConfig();
  const rotateMinutes = REFRESH_FREQUENCY_MINUTES[config.updateInterval] ?? 60;

  let quotes: WidgetQuote[] = [];
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const raw = await AsyncStorage.getItem(IOS_WIDGET_QUEUE_KEY);
    const parsed = raw ? (JSON.parse(raw) as WidgetQuote[]) : [];
    if (Array.isArray(parsed)) quotes = parsed;
  } catch {
    // Fall through to a full refresh below.
  }

  // No queue written yet — nothing to re-flag, so do the real thing instead.
  if (quotes.length === 0) {
    await refreshIOSWidget();
    return;
  }

  await WidgetBridge.updateIOSQueue({ quotes, rotateMinutes, isPro });
}
