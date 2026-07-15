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
import type { WidgetInstanceConfig } from '../../store/useWidgetStore';
import type { QuoteData } from '../../widget/QuoteWidget';

export const WIDGET_NAME = 'BasicWidget';

export interface ActiveWidget {
  widgetId: number;
  type: 'basic';
}

export interface RenderPayload {
  widgetId: number;
  quote: QuoteData;
  config: Pick<WidgetInstanceConfig, 'showAuthor' | 'transparentBg' | 'textSize'>;
  /** iOS only — passed to WidgetBridgeModule so the native widget can match the app theme. */
  themeName?: string;
}

class WidgetBridgeClass {
  get isAvailable(): boolean {
    return Platform.OS === 'android';
  }

  /** True when running on Android — pin widget is always available via long-press. */
  get canPinWidget(): boolean {
    return Platform.OS === 'android';
  }

  /**
   * On Android 8+, invokes the system's native widget-pin dialog via
   * AppWidgetManager.requestPinAppWidget(). Falls back silently if the
   * launcher doesn't support it (e.g. Android < 8 or unsupported launcher).
   */
  async requestPinWidget(): Promise<void> {
    if (Platform.OS !== 'android') return;
    try {
      await NativeModules.WidgetPin?.requestPin();
    } catch {
      // Launcher rejected or doesn't support pinning — no-op.
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
   * Re-render a specific widget instance with new quote/config.
   * Dynamic imports avoid pulling React into the headless task bundle at module-load time.
   */
  async updateWidget(payload: RenderPayload): Promise<void> {
    // iOS: write data to the shared App Group UserDefaults via the native module,
    // then tell WidgetKit to reload its timeline.
    if (Platform.OS === 'ios') {
      try {
        await NativeModules.WidgetBridge?.updateWidget(
          JSON.stringify({
            quoteText:   payload.quote.text,
            authorText:  payload.quote.author,
            showAuthor:  payload.config.showAuthor,
            widgetType:  'basic',
            streakCount: 0,
            themeName:   payload.themeName ?? 'minimal',
            textSize:    payload.config.textSize,
          }),
        );
        await NativeModules.WidgetBridge?.reloadAllTimelines();
      } catch {
        // Native module not linked (e.g. Expo Go without dev client) — silently skip.
      }
      return;
    }

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
            config: { ...payload.config, widgetTheme: payload.themeName ?? 'minimal' },
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
      const { defaultInstanceConfig } = await import('../../store/useWidgetStore');

      const raw = await AsyncStorage.getItem('widget-store-v2');
      const configs = raw
        ? (JSON.parse(raw) as { state: { widgetConfigs: Record<string, WidgetInstanceConfig> } }).state.widgetConfigs
        : {};

      // Track which quote each widget instance rendered so we can persist
      // widget-shown-{widgetId} for accurate widget-tap deep-link resolution.
      const rendered: Array<{ widgetId: number; quote: QuoteData }> = [];

      await requestWidgetUpdate({
        widgetName: WIDGET_NAME,
        renderWidget: (info) => {
          const config = configs[info.widgetId.toString()] ?? defaultInstanceConfig('basic');
          const cached = config.cachedQuote;
          const quote: QuoteData = cached
            ? { id: cached.quoteId, text: cached.text, author: cached.author }
            : { id: '', text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' };
          rendered.push({ widgetId: info.widgetId, quote });
          return React.createElement(QuoteWidget, { quote, config: { ...config, widgetTheme: config.widgetTheme ?? 'minimal' }, widgetInfo: info });
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
