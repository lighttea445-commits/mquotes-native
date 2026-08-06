/**
 * Pushes a config change from the Widgets screen out to whatever it actually
 * renders on. One entry point for both platforms, since the screen itself no
 * longer forks — see components/screens/WidgetsScreen.tsx.
 */

import { Platform } from 'react-native';
import { WidgetBridge } from '../modules/widget-bridge';
import { resolveWidgetQuote, type WidgetQuote } from './widgetQuotes';
import { pushIOSWidgetAppearance, refreshIOSWidget } from './iosWidget';
import { useWidgetStore } from '../store/useWidgetStore';

/**
 * Re-renders every placed Android widget bound to this config, or pushes the
 * appearance-only iOS update for it. Pass `refetchQuote: true` when the change
 * can affect *which* quotes show (a category/topic change) rather than only
 * how the existing quote is drawn.
 */
export async function syncWidgets(configId: string, options: { refetchQuote?: boolean } = {}): Promise<void> {
  if (Platform.OS === 'ios') {
    if (options.refetchQuote) {
      await refreshIOSWidget(configId, { force: true });
    } else {
      await pushIOSWidgetAppearance(configId);
    }
    return;
  }

  if (Platform.OS !== 'android') return;

  const store = useWidgetStore.getState();
  const config = store.getConfig(configId);
  if (!config) return;

  const widgetIds = Object.entries(store.bindings)
    .filter(([, boundTo]) => boundTo === configId)
    .map(([widgetId]) => Number(widgetId));

  if (widgetIds.length === 0) return;

  let freshQuote: WidgetQuote | null = null;

  await Promise.all(
    widgetIds.map(async (widgetId) => {
      let quote: WidgetQuote | null = config.cachedQuote
        ? { id: config.cachedQuote.quoteId, text: config.cachedQuote.text, author: config.cachedQuote.author }
        : null;

      if (!quote || options.refetchQuote) {
        const fetched = await resolveWidgetQuote(config.customize ? config.quoteType : 'general');
        if (fetched) { quote = fetched; freshQuote = fetched; }
      }
      if (!quote) return;

      await WidgetBridge.updateWidget({
        widgetId,
        quote,
        config: { showBorder: config.showBorder, showButtons: config.showButtons },
      });
    }),
  );

  if (freshQuote) {
    const q: { id?: string; text: string; author: string } = freshQuote;
    store.updateConfig(configId, {
      cachedQuote: { text: q.text, author: q.author, quoteId: q.id },
      lastRefreshed: new Date().toISOString(),
    });
  }
}
