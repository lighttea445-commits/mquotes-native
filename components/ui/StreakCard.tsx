import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { SunIcon } from './SunIcon';

interface StreakCardProps {
  streakCount: number;
  weekData: boolean[]; // 7 elements: Mon=0 … Sun=6
}

const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export function StreakCard({ streakCount, weekData }: StreakCardProps) {
  const theme = useTheme();

  // Today's day index: 0=Sun in JS, shift to Mon=0
  const jsDayOfWeek = new Date().getDay(); // 0=Sun
  const todayIndex = jsDayOfWeek === 0 ? 6 : jsDayOfWeek - 1; // Mon=0..Sun=6

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {/* Left: Sun with streak count */}
      <View style={styles.sunWrapper}>
        <SunIcon day={streakCount} size={72} color={theme.gold} />
      </View>

      {/* Right: 7-day tracker */}
      <View style={styles.tracker}>
        {DAY_LABELS.map((label, i) => {
          const isToday = i === todayIndex;
          const completed = weekData[i] ?? false;
          return (
            <View key={label} style={styles.dayCol}>
              <Text
                style={[
                  styles.dayLabel,
                  {
                    color: isToday ? theme.text : theme.textMuted,
                    fontFamily: isToday ? 'Inter_600SemiBold' : 'Inter_400Regular',
                  },
                ]}
              >
                {label}
              </Text>
              <View
                style={[
                  styles.dayCircle,
                  {
                    backgroundColor: completed ? theme.gold : 'transparent',
                    borderColor: completed ? theme.gold : theme.border,
                  },
                ]}
              >
                {completed && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 16,
  },
  sunWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  tracker: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayCol: {
    alignItems: 'center',
    gap: 6,
  },
  dayLabel: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
  dayCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#1A1208',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
});
