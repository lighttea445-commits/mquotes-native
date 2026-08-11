/**
 * Unit tests for lib/collectionRefs.ts
 *
 * A collection is the only quote source the user can delete while a widget
 * config or a reminder still points at it. The resolvers already fall back to
 * general quotes, so what is tested here is the second half: the stored
 * reference is dropped, so nothing keeps naming something that is gone.
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

const mockSyncWidgets = jest.fn().mockResolvedValue(undefined);
jest.mock('../../lib/widgetSync', () => ({ syncWidgets: mockSyncWidgets }));

const mockReschedule = jest.fn().mockResolvedValue(undefined);
jest.mock('../../lib/notifications', () => ({ rescheduleAll: mockReschedule }));

beforeEach(() => {
  jest.resetModules();
  mockSyncWidgets.mockClear();
  mockReschedule.mockClear();
});

describe('releaseCollectionReferences — widget configs', () => {
  it('re-points a config drawing from the deleted collection at general', async () => {
    const { useWidgetStore, collectionQuoteType } = require('../../store/useWidgetStore');
    const { releaseCollectionReferences } = require('../../lib/collectionRefs');

    const { id } = useWidgetStore.getState().addConfig('A');
    useWidgetStore.getState().updateConfig(id, {
      customize: true,
      quoteType: collectionQuoteType('c1'),
    });

    await releaseCollectionReferences('c1');

    expect(useWidgetStore.getState().getConfig(id).quoteType).toBe('general');
    // Refetch, not a re-render: which quotes show has changed.
    expect(mockSyncWidgets).toHaveBeenCalledWith(id, { refetchQuote: true });
  });

  it('leaves configs on a different collection alone', async () => {
    const { useWidgetStore, collectionQuoteType } = require('../../store/useWidgetStore');
    const { releaseCollectionReferences } = require('../../lib/collectionRefs');

    const keep = useWidgetStore.getState().addConfig('Keep');
    useWidgetStore.getState().updateConfig(keep.id, {
      customize: true,
      quoteType: collectionQuoteType('c2'),
    });

    await releaseCollectionReferences('c1');

    expect(useWidgetStore.getState().getConfig(keep.id).quoteType).toBe('collection:c2');
    expect(mockSyncWidgets).not.toHaveBeenCalled();
  });

  it('does not touch a config on a built-in topic', async () => {
    const { useWidgetStore } = require('../../store/useWidgetStore');
    const { releaseCollectionReferences } = require('../../lib/collectionRefs');

    const { id } = useWidgetStore.getState().addConfig('A');
    useWidgetStore.getState().updateConfig(id, { customize: true, quoteType: 'wisdom' });

    await releaseCollectionReferences('c1');

    expect(useWidgetStore.getState().getConfig(id).quoteType).toBe('wisdom');
  });
});

describe('releaseCollectionReferences — notification sources', () => {
  it('resets both reminders that drew from the deleted collection', async () => {
    const { useAppStore } = require('../../store/useAppStore');
    const { releaseCollectionReferences } = require('../../lib/collectionRefs');

    useAppStore.getState().setPreferences({
      notificationsEnabled: true,
      notifQuoteSource: 'collection:c1',
      notifQodSource: 'collection:c1',
    });

    await releaseCollectionReferences('c1');

    const prefs = useAppStore.getState().preferences;
    expect(prefs.notifQuoteSource).toBe('following');
    expect(prefs.notifQodSource).toBe('following');
    expect(mockReschedule).toHaveBeenCalledTimes(1);
  });

  it('resets only the reminder that pointed at it', async () => {
    const { useAppStore } = require('../../store/useAppStore');
    const { releaseCollectionReferences } = require('../../lib/collectionRefs');

    useAppStore.getState().setPreferences({
      notifQuoteSource: 'collection:c1',
      notifQodSource: '_favorites',
    });

    await releaseCollectionReferences('c1');

    const prefs = useAppStore.getState().preferences;
    expect(prefs.notifQuoteSource).toBe('following');
    expect(prefs.notifQodSource).toBe('_favorites');
  });

  it('skips the reschedule entirely when no reminder referenced it', async () => {
    const { useAppStore } = require('../../store/useAppStore');
    const { releaseCollectionReferences } = require('../../lib/collectionRefs');

    useAppStore.getState().setPreferences({
      notifQuoteSource: 'following',
      notifQodSource: '_favorites',
    });

    await releaseCollectionReferences('c1');

    expect(mockReschedule).not.toHaveBeenCalled();
  });

  it('carries the reset source into the reschedule rather than the deleted one', async () => {
    const { useAppStore } = require('../../store/useAppStore');
    const { releaseCollectionReferences } = require('../../lib/collectionRefs');

    useAppStore.getState().setPreferences({
      notificationsEnabled: true,
      notifQuoteSource: 'collection:c1',
      notifQodSource: 'wisdom',
    });

    await releaseCollectionReferences('c1');

    expect(mockReschedule).toHaveBeenCalledWith(
      expect.objectContaining({ quoteSource: 'following', qodSource: 'wisdom' }),
    );
  });
});
