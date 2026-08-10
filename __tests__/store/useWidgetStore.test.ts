/**
 * Unit tests for store/useWidgetStore.ts
 *
 * The store moved from one config per placed widget id (widgetConfigs) to a
 * named library of configs plus a separate widgetId->configId binding map, so
 * a config can exist before anything uses it ("Pending" in the UI) and one
 * config can back several placed widgets.
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  jest.resetModules();
});

// ── createConfig / nextConfigName ───────────────────────────────────────────

describe('createConfig', () => {
  it('returns sensible defaults, customize off', () => {
    const { createConfig } = require('../../store/useWidgetStore');
    const cfg = createConfig('My widget');

    expect(cfg.name).toBe('My widget');
    expect(cfg.customize).toBe(false);
    expect(cfg.showBorder).toBe(false);
    expect(cfg.updateInterval).toBe('hourly');
    expect(cfg.quoteType).toBe('general');
    expect(cfg.cachedQuote).toBeNull();
    expect(cfg.lastRefreshed).toBeNull();
    expect(cfg.id).toBeTruthy();
  });

  it('gives distinct ids to successive configs', () => {
    const { createConfig } = require('../../store/useWidgetStore');
    const a = createConfig('A');
    const b = createConfig('B');
    expect(a.id).not.toBe(b.id);
  });
});

describe('nextConfigName', () => {
  it('numbers from 1 when the library is empty', () => {
    const { nextConfigName } = require('../../store/useWidgetStore');
    expect(nextConfigName([])).toBe('Widget configuration #1');
  });

  it('continues past the highest existing number', () => {
    const { nextConfigName, createConfig } = require('../../store/useWidgetStore');
    const configs = [
      { ...createConfig('Widget configuration #1') },
      { ...createConfig('Widget configuration #3') },
    ];
    expect(nextConfigName(configs)).toBe('Widget configuration #4');
  });

  it('does not reuse a number freed by deleting a middle entry', () => {
    const { nextConfigName, createConfig } = require('../../store/useWidgetStore');
    // #2 was deleted; #1 and #3 remain — next should be #4, not #2.
    const configs = [createConfig('Widget configuration #1'), createConfig('Widget configuration #3')];
    expect(nextConfigName(configs)).toBe('Widget configuration #4');
  });
});

// ── addConfig / updateConfig / removeConfig ─────────────────────────────────

describe('addConfig', () => {
  it('appends a new config and returns it', () => {
    const { useWidgetStore } = require('../../store/useWidgetStore');
    const created = useWidgetStore.getState().addConfig('Morning');

    expect(useWidgetStore.getState().configs).toHaveLength(1);
    expect(useWidgetStore.getState().configs[0].id).toBe(created.id);
    expect(created.name).toBe('Morning');
  });

  it('auto-names when no name is given', () => {
    const { useWidgetStore } = require('../../store/useWidgetStore');
    const created = useWidgetStore.getState().addConfig();
    expect(created.name).toBe('Widget configuration #1');
  });
});

describe('updateConfig', () => {
  it('merges partial updates without losing other fields', () => {
    const { useWidgetStore } = require('../../store/useWidgetStore');
    const { id } = useWidgetStore.getState().addConfig('A');

    useWidgetStore.getState().updateConfig(id, { quoteType: 'wisdom', customize: true });
    useWidgetStore.getState().updateConfig(id, { showBorder: true });

    const cfg = useWidgetStore.getState().getConfig(id);
    expect(cfg.quoteType).toBe('wisdom');
    expect(cfg.customize).toBe(true);
    expect(cfg.showBorder).toBe(true);
  });

  it('is a no-op for an unknown id', () => {
    const { useWidgetStore } = require('../../store/useWidgetStore');
    useWidgetStore.getState().addConfig('A');
    expect(() => useWidgetStore.getState().updateConfig('missing', { showBorder: true })).not.toThrow();
    expect(useWidgetStore.getState().configs).toHaveLength(1);
  });
});

describe('removeConfig', () => {
  it('removes the config and any binding pointing at it', () => {
    const { useWidgetStore } = require('../../store/useWidgetStore');
    const { id } = useWidgetStore.getState().addConfig('A');
    useWidgetStore.getState().bindWidget('101', id);

    useWidgetStore.getState().removeConfig(id);

    expect(useWidgetStore.getState().getConfig(id)).toBeUndefined();
    expect(useWidgetStore.getState().bindings['101']).toBeUndefined();
  });

  it('leaves other configs and their bindings untouched', () => {
    const { useWidgetStore } = require('../../store/useWidgetStore');
    const a = useWidgetStore.getState().addConfig('A');
    const b = useWidgetStore.getState().addConfig('B');
    useWidgetStore.getState().bindWidget('1', a.id);
    useWidgetStore.getState().bindWidget('2', b.id);

    useWidgetStore.getState().removeConfig(a.id);

    expect(useWidgetStore.getState().getConfig(b.id)).toBeDefined();
    expect(useWidgetStore.getState().bindings['2']).toBe(b.id);
  });
});

describe('clearAll', () => {
  it('drops every config and binding', () => {
    const { useWidgetStore } = require('../../store/useWidgetStore');
    const { id } = useWidgetStore.getState().addConfig('A');
    useWidgetStore.getState().bindWidget('1', id);

    useWidgetStore.getState().clearAll();

    expect(useWidgetStore.getState().configs).toHaveLength(0);
    expect(useWidgetStore.getState().bindings).toEqual({});
  });
});

// ── bindings ─────────────────────────────────────────────────────────────────

describe('bindWidget / unbindWidget / configForWidget', () => {
  it('binds a widget id to a config and resolves it back', () => {
    const { useWidgetStore } = require('../../store/useWidgetStore');
    const { id } = useWidgetStore.getState().addConfig('A');
    useWidgetStore.getState().bindWidget('55', id);

    expect(useWidgetStore.getState().configForWidget('55')?.id).toBe(id);
  });

  it('unbinding clears the resolution', () => {
    const { useWidgetStore } = require('../../store/useWidgetStore');
    const { id } = useWidgetStore.getState().addConfig('A');
    useWidgetStore.getState().bindWidget('55', id);
    useWidgetStore.getState().unbindWidget('55');

    expect(useWidgetStore.getState().configForWidget('55')).toBeUndefined();
  });

  it('multiple widgets can bind to the same config', () => {
    const { useWidgetStore } = require('../../store/useWidgetStore');
    const { id } = useWidgetStore.getState().addConfig('A');
    useWidgetStore.getState().bindWidget('1', id);
    useWidgetStore.getState().bindWidget('2', id);

    expect(useWidgetStore.getState().configForWidget('1')?.id).toBe(id);
    expect(useWidgetStore.getState().configForWidget('2')?.id).toBe(id);
  });
});

describe('isPending', () => {
  it('is true for a config nothing is bound to', () => {
    const { useWidgetStore } = require('../../store/useWidgetStore');
    const { id } = useWidgetStore.getState().addConfig('A');
    expect(useWidgetStore.getState().isPending(id)).toBe(true);
  });

  it('is false once something binds to it', () => {
    const { useWidgetStore } = require('../../store/useWidgetStore');
    const { id } = useWidgetStore.getState().addConfig('A');
    useWidgetStore.getState().bindWidget('1', id);
    expect(useWidgetStore.getState().isPending(id)).toBe(false);
  });
});

describe('claimConfigFor', () => {
  it('claims the first Pending config for a newly placed widget', () => {
    const { useWidgetStore } = require('../../store/useWidgetStore');
    const a = useWidgetStore.getState().addConfig('A');
    const b = useWidgetStore.getState().addConfig('B');
    useWidgetStore.getState().bindWidget('1', a.id); // A already taken

    const claimed = useWidgetStore.getState().claimConfigFor('2');

    expect(claimed?.id).toBe(b.id);
    expect(useWidgetStore.getState().bindings['2']).toBe(b.id);
  });

  it('creates a config when none are Pending rather than doubling up', () => {
    const { useWidgetStore } = require('../../store/useWidgetStore');
    const a = useWidgetStore.getState().addConfig('A');
    useWidgetStore.getState().bindWidget('1', a.id);

    const claimed = useWidgetStore.getState().claimConfigFor('2');

    expect(claimed?.id).not.toBe(a.id);
    expect(useWidgetStore.getState().configs).toHaveLength(2);
    expect(useWidgetStore.getState().bindings['2']).toBe(claimed?.id);
  });

  it('returns the already-bound config on a repeat call rather than reclaiming', () => {
    const { useWidgetStore } = require('../../store/useWidgetStore');
    const a = useWidgetStore.getState().addConfig('A');
    useWidgetStore.getState().addConfig('B');
    useWidgetStore.getState().bindWidget('1', a.id);

    const claimed = useWidgetStore.getState().claimConfigFor('1');
    expect(claimed?.id).toBe(a.id);
  });

  it('seeds a config when the library is empty', () => {
    const { useWidgetStore } = require('../../store/useWidgetStore');

    const claimed = useWidgetStore.getState().claimConfigFor('1');

    expect(claimed).toBeDefined();
    expect(useWidgetStore.getState().configs).toHaveLength(1);
    expect(useWidgetStore.getState().bindings['1']).toBe(claimed?.id);
  });
});

// ── isRefreshDue ────────────────────────────────────────────────────────────
//
// Gates both Android refresh paths. Android's own clocks (updatePeriodMillis
// at 30 min, and the background task's minimumInterval) are faster than the
// slower settings, so without this a "daily" widget rotates every half hour.

describe('isRefreshDue', () => {
  const MIN = 60_000;

  it('is due when the config has never been refreshed', () => {
    const { isRefreshDue } = require('../../store/useWidgetStore');
    expect(isRefreshDue(null, 'daily')).toBe(true);
  });

  it('is due when the timestamp is unparseable', () => {
    const { isRefreshDue } = require('../../store/useWidgetStore');
    expect(isRefreshDue('not a date', 'hourly')).toBe(true);
  });

  it('holds a daily config across an Android 30-minute WIDGET_UPDATE', () => {
    const { isRefreshDue } = require('../../store/useWidgetStore');
    const now = Date.parse('2026-08-10T12:00:00.000Z');
    const written = new Date(now - 30 * MIN).toISOString();
    expect(isRefreshDue(written, 'daily', now)).toBe(false);
  });

  it('releases each frequency exactly at its own interval', () => {
    const { isRefreshDue, REFRESH_FREQUENCY_MINUTES } = require('../../store/useWidgetStore');
    const now = Date.parse('2026-08-10T12:00:00.000Z');

    for (const [freq, minutes] of Object.entries(REFRESH_FREQUENCY_MINUTES)) {
      const justShort = new Date(now - ((minutes as number) - 1) * MIN).toISOString();
      const exactly = new Date(now - (minutes as number) * MIN).toISOString();
      expect(isRefreshDue(justShort, freq, now)).toBe(false);
      expect(isRefreshDue(exactly, freq, now)).toBe(true);
    }
  });
});

// ── migration from widget-store-v2 (v1 shape) ───────────────────────────────

describe('migrateWidgetStore', () => {
  it('folds each old widgetConfigs entry into a named, bound config', () => {
    const { migrateWidgetStore } = require('../../store/useWidgetStore');

    const result = migrateWidgetStore(
      {
        widgetConfigs: {
          '42': {
            type: 'basic',
            name: 'Morning',
            quoteType: 'wisdom',
            showBorder: true,
            updateInterval: 'daily',
            cachedQuote: { text: 'Hi', author: 'Me' },
            lastRefreshed: '2024-01-01T00:00:00.000Z',
          },
        },
      },
      1,
    );

    expect(result.configs).toHaveLength(1);
    const cfg = result.configs[0];
    expect(cfg.name).toBe('Morning');
    expect(cfg.customize).toBe(true); // previously configured, so treated as customized
    expect(cfg.quoteType).toBe('wisdom');
    expect(cfg.showBorder).toBe(true);
    expect(cfg.updateInterval).toBe('daily');
    expect(cfg.cachedQuote).toEqual({ text: 'Hi', author: 'Me' });
    expect(result.bindings['42']).toBe(cfg.id);
  });

  it('turns the shared iOS entry into an unbound config, not a binding', () => {
    const { migrateWidgetStore } = require('../../store/useWidgetStore');

    const result = migrateWidgetStore(
      {
        widgetConfigs: {
          ios: {
            type: 'basic',
            name: '',
            quoteType: 'general',
            showBorder: false,
            updateInterval: 'hourly',
            cachedQuote: null,
            lastRefreshed: null,
          },
        },
      },
      1,
    );

    expect(result.configs).toHaveLength(1);
    expect(result.bindings['ios']).toBeUndefined();
    expect(Object.keys(result.bindings)).toHaveLength(0);
  });

  it('falls back to a numbered name when the old entry has none', () => {
    const { migrateWidgetStore } = require('../../store/useWidgetStore');

    const result = migrateWidgetStore(
      { widgetConfigs: { '1': { name: '' }, '2': { name: '   ' } } },
      1,
    );

    expect(result.configs.map((c: { name: string }) => c.name)).toEqual([
      'Widget configuration #1',
      'Widget configuration #2',
    ]);
  });

  it('is a no-op when already at the current version', () => {
    const { migrateWidgetStore } = require('../../store/useWidgetStore');
    const current = { configs: [{ id: 'x' }], bindings: { a: 'x' } };
    expect(migrateWidgetStore(current, 2)).toBe(current);
  });

  it('handles a missing/empty persisted state without throwing', () => {
    const { migrateWidgetStore } = require('../../store/useWidgetStore');
    expect(migrateWidgetStore(undefined, 0)).toEqual({ configs: [], bindings: {} });
    expect(migrateWidgetStore(null, 0)).toEqual({ configs: [], bindings: {} });
    expect(migrateWidgetStore({}, 0)).toEqual({ configs: [], bindings: {} });
  });
});

// ── constant maps ─────────────────────────────────────────────────────────────

describe('constant maps', () => {
  it('REFRESH_FREQUENCY_MINUTES covers every WidgetRefreshFrequency', () => {
    const { REFRESH_FREQUENCY_MINUTES } = require('../../store/useWidgetStore');
    expect(REFRESH_FREQUENCY_MINUTES['hourly']).toBe(60);
    expect(REFRESH_FREQUENCY_MINUTES['twice-daily']).toBe(720);
    expect(REFRESH_FREQUENCY_MINUTES['daily']).toBe(1440);
  });

  it('all WidgetQuoteType keys have labels', () => {
    const { QUOTE_TYPE_LABELS } = require('../../store/useWidgetStore');
    const expectedKeys = ['general', 'favorites', 'wisdom', 'motivational', 'inspirational', 'love', 'life', 'happiness'];
    expectedKeys.forEach((key) => {
      expect(QUOTE_TYPE_LABELS[key]).toBeTruthy();
    });
  });
});
