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
 *   • Appearance rides along in the same payload. Apple's Edit Widget panel is
 *     deliberately empty: it cannot see entitlements and its choices could never
 *     be mirrored back into the app, so the app owns every setting.
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

  await WidgetBridge.updateIOSQueue({
    quotes,
    rotateMinutes,
    isPro: await readIsPro(),
    textSize: config.textSize,
    showAuthor: config.showAuthor,
    showBorder: config.showBorder,
  });

  setIOSWidgetConfig({
    cachedQuote: { text: quotes[0].text, author: quotes[0].author, quoteId: quotes[0].id },
    lastRefreshed: new Date().toISOString(),
  });

  return true;
}

/**
 * Imported lazily so react-native-purchases stays out of the root layout's
 * startup import graph — refreshIOSWidget runs from app/_layout.tsx on every
 * foreground. An unavailable entitlement state reads as free, so the widget
 * renders default appearance rather than nothing.
 */
async function readIsPro(): Promise<boolean> {
  try {
    return (await import('../hooks/useRevenueCat')).getIsPro();
  } catch {
    return false;
  }
}

/**
 * Rewrites the settings the widget renders from, reusing the queue already on
 * disk — no network call.
 *
 * Falls back to a full refresh when no queue has been written yet, since there
 * would be nothing for the new settings to apply to.
 */
async function rewriteQueue(isPro: boolean): Promise<void> {
  const config = getIOSWidgetConfig();

  let quotes: WidgetQuote[] = [];
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const raw = await AsyncStorage.getItem(IOS_WIDGET_QUEUE_KEY);
    const parsed = raw ? (JSON.parse(raw) as WidgetQuote[]) : [];
    if (Array.isArray(parsed)) quotes = parsed;
  } catch {
    // Fall through to a full refresh below.
  }

  if (quotes.length === 0) {
    await refreshIOSWidget({ force: true });
    return;
  }

  await WidgetBridge.updateIOSQueue({
    quotes,
    rotateMinutes: REFRESH_FREQUENCY_MINUTES[config.updateInterval] ?? 60,
    isPro,
    textSize: config.textSize,
    showAuthor: config.showAuthor,
    showBorder: config.showBorder,
  });
}

/**
 * Called when entitlement state flips (see hooks/useRevenueCat). At launch the
 * top-up usually runs before RevenueCat has resolved, writing isPro:false; this
 * corrects it without refetching 48 quotes.
 */
export async function setIOSWidgetPro(isPro: boolean): Promise<void> {
  if (Platform.OS !== 'ios') return;
  await rewriteQueue(isPro);
}

/**
 * Pushes an appearance or interval change from the Widgets screen. The quotes
 * themselves are unchanged, so the queue on disk is reused rather than refetched
 * — only a category change needs refreshIOSWidget.
 */
export async function pushIOSWidgetAppearance(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  await rewriteQueue(await readIsPro());
}
