/**
 * Unit tests for store/useWidgetStore.ts
 *
 * Bugs exercised:
 * B6 — setWidgetConfig merges into defaultInstanceConfig('basic') when no prior
 *      config exists, so partial updates don't lose fields.
 * B7 — getOrCreateConfig is idempotent: a second call returns the same object
 *      without creating a second store entry.
 * B8 — loadActiveWidgets infinite-loop risk: removing a stale config changes
 *      widgetConfigs, which recreates the loadActiveWidgets callback, triggering
 *      the effect again. This test documents the store's clean removeWidgetConfig
 *      behaviour (the component-level loop is a separate concern).
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  jest.resetModules();
});

// ── defaultInstanceConfig ─────────────────────────────────────────────────────

describe('defaultInstanceConfig', () => {
  it('returns sensible defaults for a basic widget', () => {
    const { defaultInstanceConfig } = require('../../store/useWidgetStore');
    const cfg = defaultInstanceConfig('basic');

    expect(cfg.type).toBe('basic');
    expect(cfg.showBorder).toBe(false);
    expect(cfg.updateInterval).toBe('hourly');
    expect(cfg.quoteType).toBe('general');
    expect(cfg.textSize).toBe('medium');
    expect(cfg.cachedQuote).toBeNull();
    expect(cfg.lastRefreshed).toBeNull();
  });
});

// ── setWidgetConfig ───────────────────────────────────────────────────────────

describe('setWidgetConfig', () => {
  it('creates a new config entry from defaults when the widget is new', () => {
    const { useWidgetStore } = require('../../store/useWidgetStore');
    useWidgetStore.getState().setWidgetConfig('42', { showBorder: true });

    const cfg = useWidgetStore.getState().widgetConfigs['42'];
    expect(cfg).toBeDefined();
    expect(cfg.showBorder).toBe(true);
    // Default fields are preserved
    expect(cfg.type).toBe('basic');
    expect(cfg.updateInterval).toBe('hourly');
    expect(cfg.quoteType).toBe('general');
  });

  it('merges partial updates into an existing config without losing other fields', () => {
    const { useWidgetStore } = require('../../store/useWidgetStore');
    useWidgetStore.getState().setWidgetConfig('10', { quoteType: 'wisdom', textSize: 'large' });
    useWidgetStore.getState().setWidgetConfig('10', { showBorder: true }); // second update

    const cfg = useWidgetStore.getState().widgetConfigs['10'];
    expect(cfg.quoteType).toBe('wisdom');   // first update preserved
    expect(cfg.textSize).toBe('large');     // first update preserved
    expect(cfg.showBorder).toBe(true);  // second update applied
  });

  it('updates the cachedQuote without overwriting other fields', () => {
    const { useWidgetStore } = require('../../store/useWidgetStore');
    useWidgetStore.getState().setWidgetConfig('7', { updateInterval: 'daily' });
    useWidgetStore.getState().setWidgetConfig('7', {
      cachedQuote: { text: 'Live boldly.', author: 'Unknown' },
    });

    const cfg = useWidgetStore.getState().widgetConfigs['7'];
    expect(cfg.updateInterval).toBe('daily');
    expect(cfg.cachedQuote?.text).toBe('Live boldly.');
  });

  it('handles multiple distinct widget IDs independently', () => {
    const { useWidgetStore } = require('../../store/useWidgetStore');
    useWidgetStore.getState().setWidgetConfig('1', { textSize: 'small' });
    useWidgetStore.getState().setWidgetConfig('2', { textSize: 'large' });

    expect(useWidgetStore.getState().widgetConfigs['1'].textSize).toBe('small');
    expect(useWidgetStore.getState().widgetConfigs['2'].textSize).toBe('large');
  });
});

// ── removeWidgetConfig ────────────────────────────────────────────────────────

describe('removeWidgetConfig', () => {
  it('removes an existing widget config', () => {
    const { useWidgetStore } = require('../../store/useWidgetStore');
    useWidgetStore.getState().setWidgetConfig('99', { showBorder: false });
    expect(useWidgetStore.getState().widgetConfigs['99']).toBeDefined();

    useWidgetStore.getState().removeWidgetConfig('99');
    expect(useWidgetStore.getState().widgetConfigs['99']).toBeUndefined();
  });

  it('is a no-op when the widget ID does not exist', () => {
    const { useWidgetStore } = require('../../store/useWidgetStore');
    // Should not throw
    expect(() => useWidgetStore.getState().removeWidgetConfig('non-existent')).not.toThrow();
  });

  it('does not affect other widget configs when one is removed', () => {
    const { useWidgetStore } = require('../../store/useWidgetStore');
    useWidgetStore.getState().setWidgetConfig('A', { textSize: 'small' });
    useWidgetStore.getState().setWidgetConfig('B', { textSize: 'large' });

    useWidgetStore.getState().removeWidgetConfig('A');

    expect(useWidgetStore.getState().widgetConfigs['A']).toBeUndefined();
    expect(useWidgetStore.getState().widgetConfigs['B'].textSize).toBe('large');
  });

  it('[B8] after removal, a subsequent setWidgetConfig re-creates from defaults', () => {
    const { useWidgetStore } = require('../../store/useWidgetStore');
    useWidgetStore.getState().setWidgetConfig('55', { textSize: 'large', quoteType: 'love' });
    useWidgetStore.getState().removeWidgetConfig('55');

    // Re-create with a partial update — should default-fill missing fields
    useWidgetStore.getState().setWidgetConfig('55', { showBorder: true });
    const cfg = useWidgetStore.getState().widgetConfigs['55'];

    expect(cfg.showBorder).toBe(true);
    expect(cfg.textSize).toBe('medium');    // back to default, not 'large'
    expect(cfg.quoteType).toBe('general');  // back to default, not 'love'
  });
});

// ── getOrCreateConfig ─────────────────────────────────────────────────────────

describe('getOrCreateConfig', () => {
  it('[B7] returns an existing config without creating a duplicate', () => {
    const { useWidgetStore } = require('../../store/useWidgetStore');
    useWidgetStore.getState().setWidgetConfig('30', { textSize: 'large' });

    const cfg = useWidgetStore.getState().getOrCreateConfig('30', 'basic');
    expect(cfg.textSize).toBe('large'); // existing value preserved

    // Calling again returns the same data
    const cfg2 = useWidgetStore.getState().getOrCreateConfig('30', 'basic');
    expect(cfg2.textSize).toBe('large');
    expect(Object.keys(useWidgetStore.getState().widgetConfigs)).toHaveLength(1);
  });

  it('creates a default config when the widget does not exist yet', () => {
    const { useWidgetStore, defaultInstanceConfig } = require('../../store/useWidgetStore');
    const cfg = useWidgetStore.getState().getOrCreateConfig('brand-new', 'basic');

    expect(cfg).toEqual(defaultInstanceConfig('basic'));
    expect(useWidgetStore.getState().widgetConfigs['brand-new']).toBeDefined();
  });

  it('stores the created config so the next call returns the same object', () => {
    const { useWidgetStore } = require('../../store/useWidgetStore');
    useWidgetStore.getState().getOrCreateConfig('fresh', 'basic');
    useWidgetStore.getState().getOrCreateConfig('fresh', 'basic'); // second call

    // Only one entry should exist
    expect(Object.keys(useWidgetStore.getState().widgetConfigs)).toHaveLength(1);
  });
});

// ── constant maps ─────────────────────────────────────────────────────────────

describe('constant maps', () => {
  it('REFRESH_FREQUENCY_MINUTES[off] is 0', () => {
    const { REFRESH_FREQUENCY_MINUTES } = require('../../store/useWidgetStore');
    expect(REFRESH_FREQUENCY_MINUTES['off']).toBe(0);
  });

  it('REFRESH_FREQUENCY_MINUTES[hourly] is 60', () => {
    const { REFRESH_FREQUENCY_MINUTES } = require('../../store/useWidgetStore');
    expect(REFRESH_FREQUENCY_MINUTES['hourly']).toBe(60);
  });

  it('TEXT_SIZE_MULTIPLIERS[small] < 1', () => {
    const { TEXT_SIZE_MULTIPLIERS } = require('../../store/useWidgetStore');
    expect(TEXT_SIZE_MULTIPLIERS['small']).toBeLessThan(1);
  });

  it('TEXT_SIZE_MULTIPLIERS[medium] is exactly 1.0', () => {
    const { TEXT_SIZE_MULTIPLIERS } = require('../../store/useWidgetStore');
    expect(TEXT_SIZE_MULTIPLIERS['medium']).toBe(1.0);
  });

  it('TEXT_SIZE_MULTIPLIERS[large] > 1', () => {
    const { TEXT_SIZE_MULTIPLIERS } = require('../../store/useWidgetStore');
    expect(TEXT_SIZE_MULTIPLIERS['large']).toBeGreaterThan(1);
  });

  it('all WidgetQuoteType keys have labels', () => {
    const { QUOTE_TYPE_LABELS } = require('../../store/useWidgetStore');
    const expectedKeys = ['general', 'favorites', 'wisdom', 'motivational', 'inspirational', 'love', 'life', 'happiness'];
    expectedKeys.forEach((key) => {
      expect(QUOTE_TYPE_LABELS[key]).toBeTruthy();
    });
  });
});
