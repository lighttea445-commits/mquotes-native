/**
 * Unit tests for confirmSeenIOSConfigs (lib/iosWidget.ts).
 *
 * iOS never tells the app that a widget was placed, or which config a placed
 * widget picked. The mq_seen_<id> stamp the extension writes on every timeline
 * request is the only evidence there is, so this is the whole of "a widget was
 * added" detection on that platform — and it cannot distinguish a widget added
 * through the prompt from one added straight off the Home Screen.
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

const mockGetSeenAt = jest.fn();

jest.mock('../../modules/widget-bridge', () => ({
  WidgetBridge: {
    getIOSConfigSeenAt: (...args: unknown[]) => mockGetSeenAt(...args),
    updateIOSConfigList: jest.fn().mockResolvedValue(undefined),
    updateIOSQueue: jest.fn().mockResolvedValue(true),
  },
  IOS_WIDGET_QUEUE_SIZE: 48,
  IOS_WIDGET_QUEUE_KEY_PREFIX: 'ios-widget-queue-',
}));

/** Loads the module with Platform.OS forced, since the whole file no-ops elsewhere. */
function load(os: 'ios' | 'android') {
  jest.resetModules();
  jest.doMock('react-native', () => ({ Platform: { OS: os } }));
  return {
    ...require('../../lib/iosWidget'),
    useWidgetStore: require('../../store/useWidgetStore').useWidgetStore,
  };
}

beforeEach(() => {
  mockGetSeenAt.mockReset();
});

describe('confirmSeenIOSConfigs', () => {
  it('promotes a config the extension has rendered', async () => {
    const { confirmSeenIOSConfigs, useWidgetStore } = load('ios');
    const seed = useWidgetStore.getState().addConfig(undefined, { provisional: true });
    mockGetSeenAt.mockResolvedValue(Date.now());

    await expect(confirmSeenIOSConfigs()).resolves.toBe(true);
    expect(useWidgetStore.getState().getConfig(seed.id).provisional).toBe(false);
  });

  it('leaves a config no widget has rendered provisional', async () => {
    const { confirmSeenIOSConfigs, useWidgetStore } = load('ios');
    const seed = useWidgetStore.getState().addConfig(undefined, { provisional: true });
    mockGetSeenAt.mockResolvedValue(null);

    await expect(confirmSeenIOSConfigs()).resolves.toBe(false);
    expect(useWidgetStore.getState().getConfig(seed.id).provisional).toBe(true);
  });

  it('ignores a stamp older than the seen window, which is not a live widget', async () => {
    const { confirmSeenIOSConfigs, useWidgetStore } = load('ios');
    const seed = useWidgetStore.getState().addConfig(undefined, { provisional: true });
    mockGetSeenAt.mockResolvedValue(Date.now() - 4 * 24 * 60 * 60 * 1000);

    await expect(confirmSeenIOSConfigs()).resolves.toBe(false);
    expect(useWidgetStore.getState().getConfig(seed.id).provisional).toBe(true);
  });

  it('reports nothing promoted when every config is already confirmed', async () => {
    const { confirmSeenIOSConfigs, useWidgetStore } = load('ios');
    useWidgetStore.getState().addConfig('A');
    mockGetSeenAt.mockResolvedValue(Date.now());

    await expect(confirmSeenIOSConfigs()).resolves.toBe(false);
    // Not worth a native round trip when there is nothing that could change.
    expect(mockGetSeenAt).not.toHaveBeenCalled();
  });

  it('promotes only the configs that were actually seen', async () => {
    const { confirmSeenIOSConfigs, useWidgetStore } = load('ios');
    const a = useWidgetStore.getState().addConfig('A', { provisional: true });
    const b = useWidgetStore.getState().addConfig('B', { provisional: true });
    mockGetSeenAt.mockImplementation((id: string) =>
      Promise.resolve(id === b.id ? Date.now() : null),
    );

    await expect(confirmSeenIOSConfigs()).resolves.toBe(true);
    expect(useWidgetStore.getState().getConfig(a.id).provisional).toBe(true);
    expect(useWidgetStore.getState().getConfig(b.id).provisional).toBe(false);
  });

  it('no-ops on Android, which detects placement by enumerating widgets instead', async () => {
    const { confirmSeenIOSConfigs, useWidgetStore } = load('android');
    const seed = useWidgetStore.getState().addConfig(undefined, { provisional: true });

    await expect(confirmSeenIOSConfigs()).resolves.toBe(false);
    expect(useWidgetStore.getState().getConfig(seed.id).provisional).toBe(true);
    expect(mockGetSeenAt).not.toHaveBeenCalled();
  });
});
