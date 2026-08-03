import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SheetHeader } from '../ui/SheetHeader';
import { Toggle } from '../ui/Toggle';
import { GUTTER, SPACE, RADIUS } from '../ui/tokens';
import { useTheme } from '../../hooks/useTheme';
import { useAppStore } from '../../store/useAppStore';
import {
  requestPermissions,
  getPermissionStatus,
  rescheduleAll,
} from '../../lib/notifications';

interface Props {
  onClose?: () => void;
  onBack?: () => void;
}

export default function StreakScreen({ onClose, onBack }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const { preferences, setPreferences } = useAppStore();

  const close = onClose ?? (() => router.back());
  const back = onBack ?? close;

  const trackingEnabled = preferences.streakTrackingEnabled ?? true;
  const remindersEnabled = preferences.streakEnabled ?? true;

  /**
   * The streak reminder is one of the repeating notification slots, so a change
   * here has to go through the same reschedule the notifications screen uses —
   * flipping the preference alone would leave the old notification scheduled.
   */
  const applyReminders = (next: boolean) => {
    setPreferences({ streakEnabled: next });
    const p = { ...preferences, streakEnabled: next };
    const anyEnabled = (p.quotesEnabled ?? true) || (p.qodEnabled ?? true) || next;
    if (!anyEnabled) return;

    requestPermissions()
      .then(granted => {
        if (!granted) return;
        return getPermissionStatus().then(status => {
          if (status !== 'granted') return;
          return rescheduleAll({
            enabled: true,
            days: p.notificationDays ?? [],
            quotesEnabled: p.quotesEnabled ?? true,
            showAuthor: p.notificationShowAuthor ?? false,
            quoteCount: p.notificationCount ?? 5,
            startHHMM: p.notificationStartTime ?? '09:00',
            endHHMM: p.notificationEndTime ?? '22:00',
            qodEnabled: p.qodEnabled ?? true,
            qodTime: p.qodTime ?? '08:00',
            quoteSource: p.notifQuoteSource,
            qodSource: p.notifQodSource,
            streakEnabled: next,
            streakTime: p.streakTime ?? '21:00',
          }).then(() => {
            setPreferences({ lastNotifScheduledAt: new Date().toISOString() });
          });
        });
      })
      .catch(console.warn);
  };

  const handleTracking = (next: boolean) => {
    setPreferences({ streakTrackingEnabled: next });
    // A reminder to keep a streak you're no longer counting is noise.
    if (!next && remindersEnabled) applyReminders(false);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <SheetHeader title="Streak" leading="back" onLeadingPress={back} />

        <View style={styles.body}>
          <Text style={[styles.blurb, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
            Coming back each day is what makes it stick. Your streak counts the days you
            showed up.
          </Text>

          <View style={[styles.row, { backgroundColor: theme.surface }]}>
            <Text style={[styles.label, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
              Track streak
            </Text>
            <Toggle
              value={trackingEnabled}
              onValueChange={handleTracking}
              accessibilityLabel="Track streak"
            />
          </View>

          <View style={[styles.row, { backgroundColor: theme.surface }]}>
            <Text
              style={[
                styles.label,
                { color: trackingEnabled ? theme.text : theme.textMuted, fontFamily: theme.uiFontFamily },
              ]}
            >
              Streak reminders
            </Text>
            <Toggle
              value={trackingEnabled && remindersEnabled}
              onValueChange={applyReminders}
              disabled={!trackingEnabled}
              accessibilityLabel="Streak reminders"
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  body: {
    paddingHorizontal: GUTTER,
    gap: SPACE.md,
  },
  blurb: {
    fontSize: 17,
    lineHeight: 25,
    marginBottom: SPACE.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 60,
    borderRadius: RADIUS.card,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.md,
    gap: SPACE.md,
  },
  label: {
    flex: 1,
    fontSize: 16,
  },
});
