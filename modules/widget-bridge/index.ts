/**
 * WidgetBridge — thin wrappers around react-native-android-widget APIs.
 *
 * The old custom Kotlin native module is replaced by the library's built-in
 * bridge. This module keeps the same call-site API so widget-consuming code
 * (widgets.tsx, widgetRefreshTask.ts) requires minimal changes.
 */

import { Platform, NativeModules } from 'react-native';
import { getWidgetInfo, requestWidgetUpdateById } from 'react-native-android-widget';
import type { WidgetInfo } from 'react-native-android-widget';
import type { WidgetConfig } from '../../store/useWidgetStore';
import type { QuoteData } from '../../widget/QuoteWidget';
import type { WidgetQuote } from '../../lib/widgetQuotes';

export const WIDGET_NAME = 'BasicWidget';

/**
 * Prefix for the per-config quote queue mirrored into AsyncStorage, so a
 * widget tap (quotable://widget-open?src=ios&i=<index>&cfg=<id>) can resolve
 * the displayed quote without a native read. See app/widget-open.tsx.
 */
export const IOS_WIDGET_QUEUE_KEY_PREFIX = 'ios-widget-queue-';

/** How many quotes to pre-write per config. iOS rotates without waking JS. */
export const IOS_WIDGET_QUEUE_SIZE = 48;

export interface ActiveWidget {
  widgetId: number;
  type: 'basic';
}

/** One config's queue push. iOS keeps a separate queue per config so each can follow its own topic. */
export interface IOSQueuePayload {
  configId: string;
  quotes: WidgetQuote[];
  /** Minutes between rotations. Floored at 15 by the widget extension. */
  rotateMinutes: number;
  /** Gates every appearance setting below, all of which are Pro-only. */
  isPro: boolean;
  showBorder: boolean;
  showButtons: boolean;
}

/** The metadata list backing the AppIntent's config picker in Apple's Edit Widget panel. */
export interface IOSConfigListPayload {
  configs: {
    id: string;
    name: string;
    showBorder: boolean;
    showButtons: boolean;
    rotateMinutes: number;
  }[];
  isPro: boolean;
}

export interface RenderPayload {
  widgetId: number;
  quote: QuoteData;
  config: Pick<WidgetConfig, 'showBorder' | 'showButtons'>;
}

class WidgetBridgeClass {
  get isAvailable(): boolean {
    return Platform.OS === 'android' || Platform.OS === 'ios';
  }

  /**
   * True only when the native pin module is actually linked. Android alone
   * isn't enough — without WidgetPin there is no way to raise the system
   * dialog, and callers must fall back to manual long-press instructions.
   */
  get canPinWidget(): boolean {
    return Platform.OS === 'android' && typeof NativeModules.WidgetPin?.requestPin === 'function';
  }

  /**
   * On Android 8+, invokes the system's native widget-pin dialog via
   * AppWidgetManager.requestPinAppWidget().
   *
   * Returns true only if the dialog was actually raised. False means the
   * caller should show manual instructions instead — the module isn't linked,
   * or the launcher rejected/doesn't support pinning (Android < 8, or a
   * launcher without pin support).
   */
  async requestPinWidget(): Promise<boolean> {
    if (!this.canPinWidget) return false;
    try {
      await NativeModules.WidgetPin.requestPin();
      return true;
    } catch {
      // Launcher rejected or doesn't support pinning.
      return false;
    }
  }

  /** Returns all currently placed BasicWidget instances. */
  async getActiveWidgets(): Promise<ActiveWidget[]> {
    if (Platform.OS !== 'android') return [];
    try {
      const infos: WidgetInfo[] = await getWidgetInfo(WIDGET_NAME);
      console.log(
        `[WidgetBridge] getWidgetInfo("${WIDGET_NAME}") →`,
        infos.length,
        'widget(s):',
        infos.map((i) => `id=${i.widgetId} ${i.width}×${i.height}dp`).join(', ') || '(none)',
      );
      return infos.map((i) => ({ widgetId: i.widgetId, type: 'basic' as const }));
    } catch (err) {
      console.error('[WidgetBridge] getActiveWidgets error:', err);
      return [];
    }
  }

  /**
   * Android only. Re-render a specific widget instance with new quote/config.
   * iOS has no equivalent single-widget target — see updateIOSQueue.
   * Dynamic imports avoid pulling React into the headless task bundle at module-load time.
   */
  async updateWidget(payload: RenderPayload): Promise<void> {
    if (Platform.OS !== 'android') return;
    try {
      const React = (await import('react')).default;
      const { QuoteWidget } = await import('../../widget/QuoteWidget');
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;

      await requestWidgetUpdateById({
        widgetName: WIDGET_NAME,
        widgetId: payload.widgetId,
        renderWidget: (info) =>
          React.createElement(QuoteWidget, {
            quote: payload.quote,
            config: payload.config,
            widgetInfo: info,
          }),
      });

      // Track what is now displayed so widget-open.tsx reads the right quote.
      await AsyncStorage.setItem(
        `widget-shown-${payload.widgetId}`,
        JSON.stringify({ text: payload.quote.text, author: payload.quote.author, id: payload.quote.id ?? '' }),
      );
    } catch (err) {
      console.warn('[WidgetBridge] updateWidget error:', err);
    }
  }

  /**
   * iOS only. Writes a queue of quotes into the App Group and reloads the
   * widget timeline.
   *
   * iOS cannot wake JS in the background to fetch a quote, so the widget
   * extension rotates through this pre-written batch on its own. The queue is
   * mirrored into AsyncStorage so a widget tap can resolve which quote was on
   * screen from the index in its URL.
   *
   * The App Group write comes FIRST and the mirror only follows on success.
   * The tap URL carries an index into whatever the extension is rendering, so
   * a mirror that runs ahead of the App Group resolves that index against the
   * wrong array and opens the wrong quote. One version behind is recoverable;
   * one version ahead is silently wrong.
   *
   * Returns false when nothing reached the App Group — the caller must not
   * treat the config as refreshed in that case. Not linked (Expo Go) is
   * reported separately from a native throw.
   */
  async updateIOSQueue(payload: IOSQueuePayload): Promise<boolean> {
    if (Platform.OS !== 'ios') return false;
    if (payload.quotes.length === 0) return false;

    const native = NativeModules.WidgetBridge;
    if (typeof native?.updateWidgetQueue !== 'function') {
      console.warn('[WidgetBridge] updateIOSQueue: native module not linked');
      return false;
    }

    try {
      await native.updateWidgetQueue(
        JSON.stringify({
          configId: payload.configId,
          quotes: payload.quotes.map((q) => ({ text: q.text, author: q.author, id: q.id ?? '' })),
          rotateMinutes: payload.rotateMinutes,
          isPro: payload.isPro,
          showBorder: payload.showBorder,
          showButtons: payload.showButtons,
        }),
      );
    } catch (err) {
      console.warn('[WidgetBridge] updateIOSQueue error:', err);
      return false;
    }

    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.setItem(
        `${IOS_WIDGET_QUEUE_KEY_PREFIX}${payload.configId}`,
        JSON.stringify(payload.quotes),
      );
    } catch {
      // Non-critical — the widget still renders the new queue; tap resolution
      // falls back to the previous mirror until the next successful write.
    }

    return true;
  }

  /**
   * iOS only. Writes the config metadata list (id/name/appearance) that backs
   * the AppIntent's dynamic option list in Apple's Edit Widget panel — every
   * config a user has created, so any placed widget can be pointed at any of
   * them without the app knowing which widget picked which.
   */
  async updateIOSConfigList(payload: IOSConfigListPayload): Promise<void> {
    if (Platform.OS !== 'ios') return;
    try {
      await NativeModules.WidgetBridge?.updateConfigList(JSON.stringify(payload));
    } catch (err) {
      console.warn('[WidgetBridge] updateIOSConfigList error:', err);
    }
  }

  /**
   * iOS only. Milliseconds-since-epoch the extension last rendered this config,
   * or null if it never has. The extension stamps this on every timeline
   * request — the only signal the app gets for whether a config is bound to a
   * placed widget, since iOS never reports widget-to-config selections back.
   */
  async getIOSConfigSeenAt(configId: string): Promise<number | null> {
    if (Platform.OS !== 'ios') return null;
    try {
      const ms = await NativeModules.WidgetBridge?.getConfigSeenAt(configId);
      return typeof ms === 'number' && ms > 0 ? ms : null;
    } catch {
      return null;
    }
  }

  /**
   * iOS only. Native-module exceptions swallowed during startup by the patched
   * RCTTurboModule.mm, as "Module.method | Name: reason" strings. Empty on a
   * healthy launch. See patches/react-native+0.81.5.patch.
   */
  async getSwallowedExceptions(): Promise<string[]> {
    if (Platform.OS !== 'ios') return [];
    try {
      return (await NativeModules.WidgetBridge?.getSwallowedExceptions()) ?? [];
    } catch {
      // Older build without the native method — nothing to report.
      return [];
    }
  }

  /** Clears the list read by getSwallowedExceptions(). */
  async clearSwallowedExceptions(): Promise<void> {
    if (Platform.OS !== 'ios') return;
    try {
      await NativeModules.WidgetBridge?.clearSwallowedExceptions();
    } catch {
      // Nothing to clear.
    }
  }

  /** Re-render all placed instances (e.g. after settings change). */
  async reloadTimelines(): Promise<void> {
    if (Platform.OS === 'ios') {
      try {
        await NativeModules.WidgetBridge?.reloadAllTimelines();
      } catch {
        // Silently skip if native module is unavailable.
      }
      return;
    }
    if (Platform.OS !== 'android') return;
    try {
      const React = (await import('react')).default;
      const { QuoteWidget } = await import('../../widget/QuoteWidget');
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const { requestWidgetUpdate } = await import('react-native-android-widget');
      const { createConfig } = await import('../../store/useWidgetStore');

      const raw = await AsyncStorage.getItem('widget-store-v2');
      const parsed = raw
        ? (JSON.parse(raw) as { state: { configs: WidgetConfig[]; bindings: Record<string, string> } })
        : null;
      const configs = parsed?.state.configs ?? [];
      const bindings = parsed?.state.bindings ?? {};

      // Track which quote each widget instance rendered so we can persist
      // widget-shown-{widgetId} for accurate widget-tap deep-link resolution.
      const rendered: Array<{ widgetId: number; quote: QuoteData }> = [];

      await requestWidgetUpdate({
        widgetName: WIDGET_NAME,
        renderWidget: (info) => {
          const configId = bindings[info.widgetId.toString()];
          const config = configs.find((c) => c.id === configId) ?? createConfig('');
          const cached = config.cachedQuote;
          const quote: QuoteData = cached
            ? { id: cached.quoteId, text: cached.text, author: cached.author }
            : { id: '', text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' };
          rendered.push({ widgetId: info.widgetId, quote });
          return React.createElement(QuoteWidget, { quote, config, widgetInfo: info });
        },
      });

      // Write widget-shown for every rendered instance.
      await Promise.all(
        rendered.map(({ widgetId, quote }) =>
          AsyncStorage.setItem(
            `widget-shown-${widgetId}`,
            JSON.stringify({ text: quote.text, author: quote.author, id: quote.id ?? '' }),
          ),
        ),
      );
    } catch (err) {
      console.warn('[WidgetBridge] reloadTimelines error:', err);
    }
  }
}

export const WidgetBridge = new WidgetBridgeClass();
