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
import type { WidgetInstanceConfig } from '../store/useWidgetStore';

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
      const fetched = await resolveWidgetQuote(config.quoteType);
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
      quote = FALLBACK_WIDGET_QUOTE;
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
