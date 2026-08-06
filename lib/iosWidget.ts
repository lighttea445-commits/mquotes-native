/**
 * iOS widget data pump.
 *
 * iOS gives the app no widget ids and cannot wake JS in the background, so the
 * Android model (one config per placed widget, refreshed by a headless task)
 * does not carry over directly. Instead:
 *
 *   • Every config in the library gets its own quote queue in the App Group,
 *     keyed by config id (mq_queue_<id> / mq_rotate_<id>).
 *   • Which config a *placed* widget uses is chosen in Apple's Edit Widget
 *     panel via an AppIntent (see QuotesWidget.swift) — iOS never tells the
 *     app which widget picked which config, so the app can't drive that part.
 *   • The AppIntent's option list comes from mq_configs, a small metadata
 *     array (id, name, appearance) synced on every config change.
 *   • "Pending" is inferred from mq_seen_<id> stamps the extension writes on
 *     each timeline request — the one channel that flows iOS-to-app.
 */

import { Platform } from 'react-native';
import {
  useWidgetStore,
  REFRESH_FREQUENCY_MINUTES,
  type WidgetConfig,
} from '../store/useWidgetStore';
import { resolveWidgetQuotes, type WidgetQuote } from './widgetQuotes';
import { WidgetBridge, IOS_WIDGET_QUEUE_SIZE, IOS_WIDGET_QUEUE_KEY_PREFIX } from '../modules/widget-bridge';

/** How recently a config must have been rendered to count as bound, not Pending. */
const SEEN_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

function staleAfterMinutes(rotateMinutes: number): number {
  return Math.min(rotateMinutes * IOS_WIDGET_QUEUE_SIZE, 24 * 60);
}

function isStale(config: WidgetConfig, rotateMinutes: number): boolean {
  if (!config.lastRefreshed) return true;
  const written = Date.parse(config.lastRefreshed);
  if (Number.isNaN(written)) return true;
  return Date.now() - written >= staleAfterMinutes(rotateMinutes) * 60_000;
}

/**
 * Imported lazily so react-native-purchases stays out of the root layout's
 * startup import graph. An unavailable entitlement state reads as free.
 */
async function readIsPro(): Promise<boolean> {
  try {
    return (await import('../hooks/useRevenueCat')).getIsPro();
  } catch {
    return false;
  }
}

/** Pushes the id/name/appearance list every config-editing action needs synced. */
async function syncConfigMetadata(isPro: boolean): Promise<void> {
  const configs = useWidgetStore.getState().configs;
  await WidgetBridge.updateIOSConfigList({
    configs: configs.map((c) => ({
      id: c.id,
      name: c.name,
      showBorder: c.showBorder,
      showButtons: c.showButtons,
      rotateMinutes: REFRESH_FREQUENCY_MINUTES[c.updateInterval] ?? 60,
    })),
    isPro,
  });
}

let inFlight = new Map<string, Promise<boolean>>();

/**
 * Fills one config's quote queue and hands it to the native bridge, along with
 * the current metadata list (cheap — it's small — and keeps the AppIntent's
 * option list in sync with any rename that happened alongside).
 *
 * No-op on non-iOS. Skipped when the existing queue is still fresh unless
 * `force` is set. Returns true when a queue was actually written.
 */
export function refreshIOSWidget(configId: string, options: { force?: boolean } = {}): Promise<boolean> {
  if (Platform.OS !== 'ios') return Promise.resolve(false);

  const existing = inFlight.get(configId);
  if (existing) return existing;

  const run = runRefresh(configId, options).finally(() => { inFlight.delete(configId); });
  inFlight.set(configId, run);
  return run;
}

async function runRefresh(configId: string, { force = false }: { force?: boolean }): Promise<boolean> {
  const config = useWidgetStore.getState().getConfig(configId);
  if (!config) return false;

  const rotateMinutes = REFRESH_FREQUENCY_MINUTES[config.updateInterval] ?? 60;
  if (!force && !isStale(config, rotateMinutes)) return false;

  const quoteType = config.customize ? config.quoteType : 'general';
  const quotes = await resolveWidgetQuotes(quoteType, IOS_WIDGET_QUEUE_SIZE);

  // Network failed and nothing was returned — leave the existing queue in place.
  if (quotes.length === 0) return false;

  const isPro = await readIsPro();
  await syncConfigMetadata(isPro);
  await WidgetBridge.updateIOSQueue({
    configId,
    quotes,
    rotateMinutes,
    isPro,
    showBorder: config.showBorder,
    showButtons: config.showButtons,
  });

  useWidgetStore.getState().updateConfig(configId, {
    cachedQuote: { text: quotes[0].text, author: quotes[0].author, quoteId: quotes[0].id },
    lastRefreshed: new Date().toISOString(),
  });

  return true;
}

/**
 * Refreshes every config's queue. Called at foreground top-up (app/_layout.tsx)
 * since the app doesn't know which configs are actually bound to a placed
 * widget on iOS — cheaper to keep them all warm than to guess.
 */
export async function refreshAllIOSWidgets(options: { force?: boolean } = {}): Promise<void> {
  if (Platform.OS !== 'ios') return;
  const configs = useWidgetStore.getState().configs;
  await Promise.all(configs.map((c) => refreshIOSWidget(c.id, options)));
}

/**
 * Pushes an appearance or interval change for one config, reusing its queue
 * already on disk — no network call. Falls back to a full refresh if no queue
 * exists yet for that config.
 */
export async function pushIOSWidgetAppearance(configId: string): Promise<void> {
  if (Platform.OS !== 'ios') return;

  const config = useWidgetStore.getState().getConfig(configId);
  if (!config) return;

  let quotes: WidgetQuote[] = [];
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const raw = await AsyncStorage.getItem(`${IOS_WIDGET_QUEUE_KEY_PREFIX}${configId}`);
    const parsed = raw ? (JSON.parse(raw) as WidgetQuote[]) : [];
    if (Array.isArray(parsed)) quotes = parsed;
  } catch {
    // Fall through to a full refresh below.
  }

  if (quotes.length === 0) {
    await refreshIOSWidget(configId, { force: true });
    return;
  }

  const isPro = await readIsPro();
  await syncConfigMetadata(isPro);
  await WidgetBridge.updateIOSQueue({
    configId,
    quotes,
    rotateMinutes: REFRESH_FREQUENCY_MINUTES[config.updateInterval] ?? 60,
    isPro,
    showBorder: config.showBorder,
    showButtons: config.showButtons,
  });
}

/**
 * Called when entitlement state flips (see hooks/useRevenueCat). Re-syncs the
 * Pro flag for every config's queue without refetching quotes.
 */
export async function setIOSWidgetPro(isPro: boolean): Promise<void> {
  if (Platform.OS !== 'ios') return;
  const configs = useWidgetStore.getState().configs;
  await syncConfigMetadata(isPro);
  await Promise.all(configs.map((c) => pushIOSWidgetAppearance(c.id)));
}

/**
 * True when the extension has not reported rendering this config recently.
 * The extension stamps mq_seen_<configId> on every timeline request; the app
 * has no other way to know which of its configs a placed widget picked.
 */
export async function isIOSConfigPending(configId: string): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    const stampMs = await WidgetBridge.getIOSConfigSeenAt(configId);
    return stampMs === null || Date.now() - stampMs > SEEN_WINDOW_MS;
  } catch {
    return true;
  }
}
