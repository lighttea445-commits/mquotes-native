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
import { fetchMultipleRandomQuotes, fetchQuotesByCategory } from '../lib/quotesApi';
import type { WidgetInstanceConfig, WidgetQuoteType } from '../store/useWidgetStore';
import { useFavoritesStore } from '../store/useFavoritesStore';
import { useUserQuotesStore } from '../store/useUserQuotesStore';

// Same key used by the Zustand persist middleware in useWidgetStore
const WIDGET_STORE_KEY = 'widget-store-v2';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function loadWidgetConfig(widgetId: number): Promise<WidgetInstanceConfig | null> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { widgetConfigs?: Record<string, WidgetInstanceConfig> } };
    return parsed?.state?.widgetConfigs?.[widgetId.toString()] ?? null;
  } catch {
    return null;
  }
}

/**
 * Write back the cached quote after fetching a new one.
 *
 * Takes the config we already loaded as a fallback — if AsyncStorage has been
 * cleared or partially-written between the load and write (rare, but happens
 * on fresh background JS engine wakes), we still preserve theme/showAuthor
 * instead of falling through to `defaultConfig()` which would silently reset
 * the widget's appearance.
 */
async function persistCachedQuote(
  widgetId: number,
  quote: { id?: string; text: string; author: string },
  fallback: WidgetInstanceConfig,
) {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_STORE_KEY);
    const parsed = raw
      ? (JSON.parse(raw) as { state: { widgetConfigs: Record<string, WidgetInstanceConfig> }; version?: number })
      : { state: { widgetConfigs: {} } };

    const existing = parsed.state.widgetConfigs[widgetId.toString()];
    parsed.state.widgetConfigs[widgetId.toString()] = {
      ...fallback,
      ...(existing ?? {}),
      cachedQuote: { text: quote.text, author: quote.author, quoteId: quote.id },
      lastRefreshed: new Date().toISOString(),
    };
    await AsyncStorage.setItem(WIDGET_STORE_KEY, JSON.stringify(parsed));
  } catch {
    // Non-critical — widget still renders, tap deep link falls back gracefully
  }
}

function defaultConfig(): WidgetInstanceConfig {
  return {
    type: 'basic',
    name: '',
    transparentBg: false,
    showAuthor: false,
    updateInterval: 'hourly',
    quoteType: 'general',
    textSize: 'large',
    widgetTheme: 'minimal',
    cachedQuote: null,
    lastRefreshed: null,
  };
}

function waitForHydration(store: {
  persist?: { hasHydrated: () => boolean; onFinishHydration: (cb: () => void) => () => void };
}): Promise<void> {
  return new Promise((resolve) => {
    if (!store.persist || store.persist.hasHydrated()) { resolve(); return; }
    const unsub = store.persist.onFinishHydration(() => { unsub(); resolve(); });
  });
}

async function fetchQuoteForType(
  quoteType: WidgetQuoteType,
): Promise<{ id?: string; text: string; author: string } | null> {
  try {
    if (quoteType === 'favorites') {
      await waitForHydration(useFavoritesStore);
      const favs = useFavoritesStore.getState().favorites;
      if (favs.length > 0) {
        const f = favs[Math.floor(Math.random() * favs.length)];
        return { id: f.id, text: f.text, author: f.author };
      }
      // No favorites saved yet — fall back to general
      const quotes = await fetchMultipleRandomQuotes(1);
      const q = quotes[0];
      return q ? { id: q._id, text: q.content, author: q.author } : null;
    }

    if (quoteType === 'my-quotes') {
      await waitForHydration(useUserQuotesStore);
      const myQuotes = useUserQuotesStore.getState().userQuotes;
      if (myQuotes.length > 0) {
        const q = myQuotes[Math.floor(Math.random() * myQuotes.length)];
        return { id: q.id, text: q.text, author: q.author };
      }
      // No user quotes yet — fall back to general
      const quotes = await fetchMultipleRandomQuotes(1);
      const q = quotes[0];
      return q ? { id: q._id, text: q.content, author: q.author } : null;
    }

    if (quoteType === 'general') {
      const quotes = await fetchMultipleRandomQuotes(1);
      const q = quotes[0];
      return q ? { id: q._id, text: q.content, author: q.author } : null;
    }

    // Category tag (wisdom, motivational, etc.)
    const quotes = await fetchQuotesByCategory(quoteType);
    if (!quotes.length) return null;
    const q = quotes[Math.floor(Math.random() * quotes.length)];
    return { id: q._id, text: q.content, author: q.author };
  } catch {
    return null;
  }
}

// ── Task handler ──────────────────────────────────────────────────────────────

async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetAction, widgetInfo, renderWidget } = props;

  if (widgetAction === 'WIDGET_DELETED') return;

  if (
    widgetAction === 'WIDGET_ADDED' ||
    widgetAction === 'WIDGET_UPDATE' ||
    widgetAction === 'WIDGET_RESIZED'
  ) {
    const loaded = await loadWidgetConfig(widgetInfo.widgetId);
    const config = loaded ?? defaultConfig();

    // On WIDGET_ADDED/RESIZED use the cached quote (if any) to avoid a network
    // call. On WIDGET_UPDATE fetch a fresh quote.
    let quote: { id?: string; text: string; author: string } | null = config.cachedQuote
      ? { id: config.cachedQuote.quoteId, text: config.cachedQuote.text, author: config.cachedQuote.author }
      : null;

    if (!quote || widgetAction === 'WIDGET_UPDATE') {
      const fetched = await fetchQuoteForType(config.quoteType);
      if (fetched) {
        quote = fetched;
        // Persist so the app reads the correct quote on widget tap.
        await persistCachedQuote(widgetInfo.widgetId, quote, config);
      }
    } else if (widgetAction === 'WIDGET_RESIZED' && loaded) {
      // Self-heal: re-commit the loaded config to disk on every resize so
      // that any concurrent/partial writer can't leave the config in a state
      // that later reads interpret as "missing". We only do this when we
      // actually loaded a non-null config — never write defaults back.
      await persistCachedQuote(widgetInfo.widgetId, quote, loaded);
    }

    // Absolute fallback — never show a blank widget.
    if (!quote) {
      quote = {
        id: '',
        text: 'The only way to do great work is to love what you do.',
        author: 'Steve Jobs',
      };
    }

    renderWidget(React.createElement(QuoteWidget, { quote, config: { ...config, widgetTheme: config.widgetTheme ?? 'minimal' }, widgetInfo }));

    // Persist what is now rendered on screen so widget-open.tsx reads the
    // correct quote regardless of background-refresh race conditions.
    await AsyncStorage.setItem(
      `widget-shown-${widgetInfo.widgetId}`,
      JSON.stringify({ text: quote.text, author: quote.author, id: quote.id ?? '' }),
    );
  }
}

registerWidgetTaskHandler(widgetTaskHandler);
