import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandMMKVStorage } from '../lib/storage';

// ── Types ────────────────────────────────────────────────────────────────────

export type WidgetType = 'basic';
export type WidgetRefreshFrequency = 'hourly' | 'twice-daily' | 'daily';

/** One of the user's own collections, e.g. `collection:abc123`. */
export type WidgetCollectionType = `${typeof COLLECTION_QUOTE_PREFIX}${string}`;

export type WidgetBuiltInQuoteType =
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

export type WidgetQuoteType = WidgetBuiltInQuoteType | WidgetCollectionType;

/**
 * Marks a quote source as one of the user's collections rather than a built-in
 * topic. Deliberately the same vocabulary the notification sources use
 * (lib/notificationQuotes.ts), so "collection:<id>" means the same thing on
 * both surfaces and neither has to translate.
 */
export const COLLECTION_QUOTE_PREFIX = 'collection:';

export function isCollectionQuoteType(quoteType: string): quoteType is WidgetCollectionType {
  return quoteType.startsWith(COLLECTION_QUOTE_PREFIX);
}

/** The collection id inside a `collection:<id>` source, or null for a built-in topic. */
export function collectionIdFromQuoteType(quoteType: string): string | null {
  return isCollectionQuoteType(quoteType) ? quoteType.slice(COLLECTION_QUOTE_PREFIX.length) : null;
}

export function collectionQuoteType(collectionId: string): WidgetCollectionType {
  return `${COLLECTION_QUOTE_PREFIX}${collectionId}`;
}

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

export const QUOTE_TYPE_LABELS: Record<WidgetBuiltInQuoteType, string> = {
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

/**
 * Display name for a config's source.
 *
 * A collection can be deleted while a config still points at it. The resolvers
 * fall back to general quotes in that case, so the label says General too
 * rather than naming something that no longer exists.
 */
export function quoteTypeLabel(
  quoteType: WidgetQuoteType,
  collections: { id: string; name: string }[],
): string {
  const collectionId = collectionIdFromQuoteType(quoteType);
  if (collectionId !== null) {
    return collections.find((c) => c.id === collectionId)?.name ?? QUOTE_TYPE_LABELS.general;
  }
  return QUOTE_TYPE_LABELS[quoteType as WidgetBuiltInQuoteType] ?? QUOTE_TYPE_LABELS.general;
}

// ── Config ────────────────────────────────────────────────────────────────────

/**
 * A named, reusable widget configuration.
 *
 * Configs are a *library*, not a property of a placed widget: one can exist
 * before any widget uses it (the "Pending" state in the UI) and one config can
 * back several placed widgets. `bindings` is what ties a placed widget to one.
 */
export interface WidgetConfig {
  id: string;
  name: string;
  /**
   * False means "mirror the app": the widget follows the topic you follow in
   * the app and every other setting here is ignored. The UI hides the rows
   * below the toggle in that state.
   */
  customize: boolean;
  quoteType: WidgetQuoteType;
  showBorder: boolean;
  updateInterval: WidgetRefreshFrequency;
  cachedQuote: { text: string; author: string; quoteId?: string } | null;
  lastRefreshed: string | null;
  /**
   * iOS only. How many quotes the last delivered queue held, which is how long
   * the widget takes to walk it. The refresh window is derived from this, so a
   * queue is rewritten once it has been walked rather than on a fixed clock.
   * Null on a config persisted before this field existed, and on Android.
   */
  queueLength: number | null;
}

/** Ids only need to be unique within one device's store, not globally. */
function makeConfigId(): string {
  return `cfg_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/**
 * Names follow "Widget configuration #N". N is one past the highest number
 * already in use rather than the list length, so deleting #2 of three doesn't
 * produce a second #3.
 */
export function nextConfigName(configs: WidgetConfig[]): string {
  const highest = configs.reduce((max, c) => {
    const match = /#(\d+)\s*$/.exec(c.name);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);
  return `Widget configuration #${highest + 1}`;
}

export function createConfig(name: string): WidgetConfig {
  return {
    id: makeConfigId(),
    name,
    customize: false,
    quoteType: 'general',
    showBorder: false,
    updateInterval: 'hourly',
    cachedQuote: null,
    lastRefreshed: null,
    queueLength: null,
  };
}

/**
 * Whether a config is due for a fresh quote.
 *
 * Android refreshes on two independent clocks, neither of which is the user's
 * setting: the OS fires WIDGET_UPDATE on the provider's updatePeriodMillis
 * (30 min), and the background task runs on its own minimumInterval. Both must
 * gate on this, or the widget changes on whichever timer is faster and a
 * config set to "Once a day" rotates every half hour.
 *
 * iOS doesn't use this. There the interval is pushed to the extension as
 * mq_rotate_<id> and WidgetKit walks the queue on its own.
 */
export function isRefreshDue(
  lastRefreshed: string | null,
  updateInterval: WidgetRefreshFrequency,
  now: number = Date.now(),
): boolean {
  if (!lastRefreshed) return true;
  const written = Date.parse(lastRefreshed);
  if (Number.isNaN(written)) return true;
  const intervalMs = (REFRESH_FREQUENCY_MINUTES[updateInterval] ?? 60) * 60_000;
  return now - written >= intervalMs;
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface WidgetStore {
  configs: WidgetConfig[];
  /** Placed widget id (Android) to config id. iOS binds through its AppIntent. */
  bindings: Record<string, string>;

  addConfig: (name?: string) => WidgetConfig;
  updateConfig: (configId: string, updates: Partial<WidgetConfig>) => void;
  removeConfig: (configId: string) => void;
  /** Drops every config and binding, e.g. on account deletion. */
  clearAll: () => void;

  bindWidget: (widgetId: string, configId: string) => void;
  unbindWidget: (widgetId: string) => void;
  /**
   * Binds a newly placed widget to the first unused config, creating one when
   * every config is already spoken for. Android only — iOS binds through its
   * AppIntent, which picks an unused config the same way but can't create one
   * from the extension.
   */
  claimConfigFor: (widgetId: string) => WidgetConfig | undefined;

  getConfig: (configId: string) => WidgetConfig | undefined;
  configForWidget: (widgetId: string) => WidgetConfig | undefined;
  /** True when no placed widget uses this config — shown as "Pending". */
  isPending: (configId: string) => boolean;
}

export const useWidgetStore = create<WidgetStore>()(
  persist(
    (set, get) => ({
      configs: [],
      bindings: {},

      addConfig: (name) => {
        const fresh = createConfig(name ?? nextConfigName(get().configs));
        set((s) => ({ configs: [...s.configs, fresh] }));
        return fresh;
      },

      updateConfig: (configId, updates) =>
        set((s) => ({
          configs: s.configs.map((c) => (c.id === configId ? { ...c, ...updates } : c)),
        })),

      removeConfig: (configId) =>
        set((s) => {
          // Drop the bindings too, or a placed widget keeps pointing at a config
          // that no longer exists and renders nothing.
          const bindings = { ...s.bindings };
          for (const [widgetId, boundTo] of Object.entries(bindings)) {
            if (boundTo === configId) delete bindings[widgetId];
          }
          return { configs: s.configs.filter((c) => c.id !== configId), bindings };
        }),

      clearAll: () => set({ configs: [], bindings: {} }),

      bindWidget: (widgetId, configId) =>
        set((s) => ({ bindings: { ...s.bindings, [widgetId]: configId } })),

      unbindWidget: (widgetId) =>
        set((s) => {
          const bindings = { ...s.bindings };
          delete bindings[widgetId];
          return { bindings };
        }),

      claimConfigFor: (widgetId) => {
        const { configs, bindings } = get();
        const existing = bindings[widgetId];
        if (existing) {
          const found = configs.find((c) => c.id === existing);
          if (found) return found;
        }

        const used = new Set(Object.values(bindings));
        const free = configs.find((c) => !used.has(c.id));

        // Nothing free means a new config, not a second widget on an existing
        // one. Two widgets sharing a config share its cachedQuote, so they
        // render the same quote side by side until one of them is re-pointed.
        // This is also what the headless path does (widgetTaskHandler's
        // resolveConfig), and the two must agree: whichever runs first for a
        // newly placed widget decides the binding.
        const target = free ?? createConfig(nextConfigName(configs));
        if (!free) set((s) => ({ configs: [...s.configs, target] }));

        set((s) => ({ bindings: { ...s.bindings, [widgetId]: target.id } }));
        return target;
      },

      getConfig: (configId) => get().configs.find((c) => c.id === configId),

      configForWidget: (widgetId) => {
        const { configs, bindings } = get();
        const configId = bindings[widgetId];
        return configId ? configs.find((c) => c.id === configId) : undefined;
      },

      isPending: (configId) => !Object.values(get().bindings).includes(configId),
    }),
    {
      // The key keeps its historical name. Several modules read this key
      // directly from AsyncStorage (the headless task, the bridge, the deep
      // link handlers), and renaming it would strand every existing user's
      // widgets rather than migrating them.
      name: 'widget-store-v2',
      storage: createJSONStorage(() => zustandMMKVStorage),
      version: 2,
      migrate: (persisted, fromVersion) => migrateWidgetStore(persisted, fromVersion),
    },
  ),
);

/**
 * v1 kept one config per placed widget id, plus a single shared 'ios' entry.
 * Each becomes a named config bound to the widget it came from; the iOS entry
 * becomes an unbound config, since iOS now binds through its own AppIntent
 * picker rather than a single shared slot.
 *
 * Exported (rather than inlined in the persist config above) so the migration
 * itself — not just the empty-state fallback — is directly testable.
 */
export function migrateWidgetStore(persisted: unknown, fromVersion: number): WidgetStore {
  const state = (persisted ?? {}) as Partial<WidgetStore> & {
    widgetConfigs?: Record<string, Record<string, unknown>>;
  };

  if (fromVersion >= 2) return state as WidgetStore;

  const configs: WidgetConfig[] = [];
  const bindings: Record<string, string> = {};
  let n = 0;

  for (const [widgetId, old] of Object.entries(state.widgetConfigs ?? {})) {
    n += 1;
    const migrated: WidgetConfig = {
      ...createConfig(
        typeof old.name === 'string' && old.name.trim()
          ? (old.name as string)
          : `Widget configuration #${n}`,
      ),
      // Anything previously configured was, by definition, customized.
      customize: true,
      quoteType: (old.quoteType as WidgetQuoteType) ?? 'general',
      showBorder: Boolean(old.showBorder),
      updateInterval: (old.updateInterval as WidgetRefreshFrequency) ?? 'hourly',
      cachedQuote: (old.cachedQuote as WidgetConfig['cachedQuote']) ?? null,
      lastRefreshed: (old.lastRefreshed as string | null) ?? null,
    };
    configs.push(migrated);
    if (widgetId !== 'ios') bindings[widgetId] = migrated.id;
  }

  return { ...state, configs, bindings } as WidgetStore;
}
