/**
 * Widget task handler — registered at module load time.
 *
 * Handles WIDGET_ADDED / WIDGET_UPDATE / WIDGET_RESIZED / WIDGET_DELETED.
 * This file MUST be imported from index.ts so that AppRegistry.registerHeadlessTask
 * runs before Android wakes the app for a background widget refresh.
 */

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { QuoteWidget } from './QuoteWidget';
import { FALLBACK_WIDGET_QUOTE, resolveWidgetQuote } from '../lib/widgetQuotes';
import { createConfig, nextConfigName, type WidgetConfig } from '../store/useWidgetStore';

// Same key used by the Zustand persist middleware in useWidgetStore
const WIDGET_STORE_KEY = 'widget-store-v2';

// ── Helpers ───────────────────────────────────────────────────────────────────

interface RawStore {
  configs: WidgetConfig[];
  bindings: Record<string, string>;
}

async function loadStore(): Promise<RawStore> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_STORE_KEY);
    if (!raw) return { configs: [], bindings: {} };
    const parsed = JSON.parse(raw) as { state?: Partial<RawStore> };
    return { configs: parsed.state?.configs ?? [], bindings: parsed.state?.bindings ?? {} };
  } catch {
    return { configs: [], bindings: {} };
  }
}

async function saveStore(store: RawStore): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_STORE_KEY);
    const parsed = raw ? (JSON.parse(raw) as { state?: object; version?: number }) : {};
    await AsyncStorage.setItem(
      WIDGET_STORE_KEY,
      JSON.stringify({ ...parsed, state: { ...parsed.state, ...store } }),
    );
  } catch {
    // Non-critical — widget still renders, tap deep link falls back gracefully.
  }
}

/**
 * Resolves (and if necessary creates) the config a placed widget is bound to.
 *
 * A widget can reach the task handler before the Widgets screen has ever run
 * its own reconcile pass — e.g. the very first WIDGET_ADDED after pinning. In
 * that case bind to the first config not already claimed by another widget,
 * creating one if the library is empty, exactly mirroring
 * useWidgetStore.claimConfigFor so a headless wake and the UI agree.
 */
async function resolveConfig(widgetId: number): Promise<{ store: RawStore; config: WidgetConfig }> {
  const store = await loadStore();
  const idStr = widgetId.toString();

  const boundId = store.bindings[idStr];
  const bound = boundId ? store.configs.find((c) => c.id === boundId) : undefined;
  if (bound) return { store, config: bound };

  const used = new Set(Object.values(store.bindings));
  let target = store.configs.find((c) => !used.has(c.id));
  if (!target) {
    target = createConfig(nextConfigName(store.configs));
    store.configs = [...store.configs, target];
  }
  store.bindings = { ...store.bindings, [idStr]: target.id };
  await saveStore(store);

  return { store, config: target };
}

async function persistCachedQuote(
  store: RawStore,
  configId: string,
  quote: { id?: string; text: string; author: string },
): Promise<void> {
  // Re-read rather than reuse `store` — a concurrent write (a settings change
  // from the app, or another widget's refresh) may have landed since we loaded.
  const fresh = await loadStore();
  const withoutStale = fresh.configs.length ? fresh : store;
  const configs = withoutStale.configs.map((c) =>
    c.id === configId
      ? {
          ...c,
          cachedQuote: { text: quote.text, author: quote.author, quoteId: quote.id },
          lastRefreshed: new Date().toISOString(),
        }
      : c,
  );
  await saveStore({ ...withoutStale, configs });
}

// ── Task handler ──────────────────────────────────────────────────────────────

async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetAction, widgetInfo, renderWidget } = props;

  if (widgetAction === 'WIDGET_DELETED') {
    // Free the binding so the config becomes claimable (or Pending) again
    // rather than staying attached to a widget id that no longer exists.
    const store = await loadStore();
    if (store.bindings[widgetInfo.widgetId.toString()]) {
      const bindings = { ...store.bindings };
      delete bindings[widgetInfo.widgetId.toString()];
      await saveStore({ ...store, bindings });
    }
    return;
  }

  if (
    widgetAction === 'WIDGET_ADDED' ||
    widgetAction === 'WIDGET_UPDATE' ||
    widgetAction === 'WIDGET_RESIZED'
  ) {
    const { store, config } = await resolveConfig(widgetInfo.widgetId);

    // On WIDGET_ADDED/RESIZED use the cached quote (if any) to avoid a network
    // call. On WIDGET_UPDATE fetch a fresh quote.
    let quote: { id?: string; text: string; author: string } | null = config.cachedQuote
      ? { id: config.cachedQuote.quoteId, text: config.cachedQuote.text, author: config.cachedQuote.author }
      : null;

    if (!quote || widgetAction === 'WIDGET_UPDATE') {
      const fetched = await resolveWidgetQuote(config.customize ? config.quoteType : 'general');
      if (fetched) {
        quote = fetched;
        // Persist so the app reads the correct quote on widget tap.
        await persistCachedQuote(store, config.id, quote);
      }
    }

    // Absolute fallback — never show a blank widget.
    if (!quote) {
      quote = FALLBACK_WIDGET_QUOTE;
    }

    renderWidget(React.createElement(QuoteWidget, {
      quote,
      config: { showBorder: config.showBorder, showButtons: config.showButtons },
      widgetInfo,
    }));

    // Persist what is now rendered on screen so widget-open.tsx reads the
    // correct quote regardless of background-refresh race conditions.
    await AsyncStorage.setItem(
      `widget-shown-${widgetInfo.widgetId}`,
      JSON.stringify({ text: quote.text, author: quote.author, id: quote.id ?? '' }),
    );
  }
}

registerWidgetTaskHandler(widgetTaskHandler);
