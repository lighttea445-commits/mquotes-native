import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandMMKVStorage } from '../lib/storage';

// ── Types ────────────────────────────────────────────────────────────────────

export type WidgetType = 'basic';
export type WidgetRefreshFrequency = 'hourly' | 'twice-daily' | 'daily';
export type WidgetTextSize = 'small' | 'medium' | 'large';
export type WidgetQuoteType =
  | 'general'
  | 'favorites'
  | 'my-quotes'
  // For You
  | 'wisdom'
  | 'inspirational'
  | 'love'
  | 'happiness'
  | 'life'
  | 'change'
  | 'friendship'
  // By Type
  | 'success'
  | 'motivational'
  | 'future'
  | 'philosophy'
  | 'character'
  | 'history'
  | 'science'
  | 'freedom';

export const TEXT_SIZE_LABELS: Record<WidgetTextSize, string> = {
  small:  'Small',
  medium: 'Medium',
  large:  'Large',
};

export const TEXT_SIZE_MULTIPLIERS: Record<WidgetTextSize, number> = {
  small:  0.75,
  medium: 1.0,
  large:  1.3,
};

export const REFRESH_FREQUENCY_LABELS: Record<WidgetRefreshFrequency, string> = {
  'hourly':      'Every hour',
  'twice-daily': 'Twice a day',
  'daily':       'Once a day',
};

export const REFRESH_FREQUENCY_MINUTES: Record<WidgetRefreshFrequency, number> = {
  'hourly':      60,
  'twice-daily': 720,
  'daily':       1440,
};

export const QUOTE_TYPE_LABELS: Record<WidgetQuoteType, string> = {
  // Special
  general:       'General',
  favorites:     'My Favorites',
  'my-quotes':   'My Own Quotes',
  // For You
  wisdom:        'Wisdom',
  inspirational: 'Inspiration',
  love:          'Love',
  happiness:     'Happiness',
  life:          'Life',
  change:        'Change',
  friendship:    'Friendship',
  // By Type
  success:       'Success',
  motivational:  'Motivation',
  future:        'Future',
  philosophy:    'Philosophy',
  character:     'Character',
  history:       'History',
  science:       'Science',
  freedom:       'Freedom',
};

// ── Per-instance config ───────────────────────────────────────────────────────

export interface WidgetInstanceConfig {
  type: WidgetType;
  name: string;
  transparentBg: boolean;
  showAuthor: boolean;
  updateInterval: WidgetRefreshFrequency;
  quoteType: WidgetQuoteType;
  textSize: WidgetTextSize;
  /** Theme id from constants/themes (e.g. 'minimal', 'rose-sky'). 'default' = original dark #080808. */
  themeId: string;
  cachedQuote: { text: string; author: string; quoteId?: string } | null;
  lastRefreshed: string | null;
}

export function defaultInstanceConfig(type: WidgetType): WidgetInstanceConfig {
  return {
    type,
    name: '',
    transparentBg: false,
    showAuthor: false,
    updateInterval: 'hourly',
    quoteType: 'general',
    textSize: 'large',
    themeId: 'default',
    cachedQuote: null,
    lastRefreshed: null,
  };
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface WidgetStore {
  /** Keyed by widgetId.toString() */
  widgetConfigs: Record<string, WidgetInstanceConfig>;

  setWidgetConfig: (widgetId: string, updates: Partial<WidgetInstanceConfig>) => void;
  removeWidgetConfig: (widgetId: string) => void;
  clearWidgetConfigs: () => void;
  /** Returns the config for a widget, creating a default if it doesn't exist yet. */
  getOrCreateConfig: (widgetId: string, type: WidgetType) => WidgetInstanceConfig;
}

export const useWidgetStore = create<WidgetStore>()(
  persist(
    (set, get) => ({
      widgetConfigs: {},

      setWidgetConfig: (widgetId, updates) =>
        set((s) => ({
          widgetConfigs: {
            ...s.widgetConfigs,
            [widgetId]: { ...(s.widgetConfigs[widgetId] ?? defaultInstanceConfig('basic')), ...updates },
          },
        })),

      removeWidgetConfig: (widgetId) =>
        set((s) => {
          const next = { ...s.widgetConfigs };
          delete next[widgetId];
          return { widgetConfigs: next };
        }),

      clearWidgetConfigs: () => set({ widgetConfigs: {} }),

      getOrCreateConfig: (widgetId, type) => {
        const existing = get().widgetConfigs[widgetId];
        if (existing) return existing;
        const fresh = defaultInstanceConfig(type);
        set((s) => ({
          widgetConfigs: { ...s.widgetConfigs, [widgetId]: fresh },
        }));
        return fresh;
      },
    }),
    {
      name: 'widget-store-v2',
      storage: createJSONStorage(() => zustandMMKVStorage),
    },
  ),
);
