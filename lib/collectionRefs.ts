/**
 * Cleanup for the two places a collection is referenced from outside its own
 * store: widget configs (`collection:<id>` as a quoteType) and the two
 * notification sources.
 *
 * Both resolvers already fall back to general quotes when the collection is
 * gone, so nothing breaks without this. What it prevents is a config or a
 * reminder that reads as pointing at something the user deleted: the row still
 * says a name, or says "Topics you follow" while the stored value says
 * otherwise. Resetting the reference makes the screen tell the truth.
 */

import {
  useWidgetStore,
  collectionIdFromQuoteType,
  type WidgetConfig,
} from '../store/useWidgetStore';
import { useAppStore } from '../store/useAppStore';
import { COLLECTION_PREFIX, SOURCE_FOLLOWING } from './notificationQuotes';
import { syncWidgets } from './widgetSync';

/** Widget configs drawing from this collection, reset to General. Returns the ids re-pointed. */
function resetWidgetConfigs(collectionId: string): string[] {
  const { configs, updateConfig } = useWidgetStore.getState();
  const affected = configs.filter(
    (c: WidgetConfig) => collectionIdFromQuoteType(c.quoteType) === collectionId,
  );
  for (const config of affected) updateConfig(config.id, { quoteType: 'general' });
  return affected.map((c) => c.id);
}

/** Reminder sources drawing from this collection, reset to the default. */
function resetNotificationSources(collectionId: string): boolean {
  const source = COLLECTION_PREFIX + collectionId;
  const prefs = useAppStore.getState().preferences;
  const updates: { notifQuoteSource?: string; notifQuoteSource2?: string; notifQodSource?: string } = {};

  if (prefs.notifQuoteSource === source) updates.notifQuoteSource = SOURCE_FOLLOWING;
  if (prefs.notifQuoteSource2 === source) updates.notifQuoteSource2 = SOURCE_FOLLOWING;
  if (prefs.notifQodSource === source) updates.notifQodSource = SOURCE_FOLLOWING;
  if (Object.keys(updates).length === 0) return false;

  useAppStore.getState().setPreferences(updates);
  return true;
}

/**
 * Drops every reference to a deleted collection and pushes the results out.
 *
 * Call AFTER the collection is removed from its store, so a widget that
 * refreshes mid-flight can't resolve it again. Never throws: a failed sync or
 * reschedule leaves the widget on its previous quote, which is recoverable on
 * the next foreground.
 */
export async function releaseCollectionReferences(collectionId: string): Promise<void> {
  const configIds = resetWidgetConfigs(collectionId);
  const rescheduleNeeded = resetNotificationSources(collectionId);

  await Promise.all(
    configIds.map((id) => syncWidgets(id, { refetchQuote: true }).catch(() => {})),
  );

  if (!rescheduleNeeded) return;

  // Required lazily for the same reason lib/notifications.ts defers its own
  // imports: this drags in the stores and the RevenueCat SDK, and the
  // Collections screen has no other need for either.
  try {
    const { rescheduleAll } = require('./notifications') as typeof import('./notifications');
    const p = useAppStore.getState().preferences;
    await rescheduleAll({
      enabled: p.notificationsEnabled,
      days: p.notificationDays,
      quotesEnabled: p.quotesEnabled,
      quoteCount: p.notificationCount,
      startHHMM: p.notificationStartTime,
      endHHMM: p.notificationEndTime,
      showAuthor: p.notificationShowAuthor,
      quoteSource: p.notifQuoteSource,
      quotes2Enabled: p.quotes2Enabled,
      quoteCount2: p.notificationCount2,
      startHHMM2: p.notificationStartTime2,
      endHHMM2: p.notificationEndTime2,
      showAuthor2: p.notificationShowAuthor2,
      quoteSource2: p.notifQuoteSource2,
      qodEnabled: p.qodEnabled,
      qodTime: p.qodTime,
      qodSource: p.notifQodSource,
      streakEnabled: p.streakEnabled,
      streakTime: p.streakTime,
    });
    useAppStore.getState().setPreferences({ lastNotifScheduledAt: new Date().toISOString() });
  } catch {
    // Leaves the schedule on the old source until the next reschedule, which
    // falls back to general quotes rather than firing nothing.
  }
}
