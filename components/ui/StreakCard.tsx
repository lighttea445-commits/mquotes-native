import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { SunIcon } from './SunIcon';

interface StreakCardProps {
  streakCount: number;
  weekData: boolean[]; // 7 elements: Mon=0 … Sun=6
  onShare?: () => void;
}

const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export function StreakCard({ streakCount, weekData, onShare }: StreakCardProps) {
  const theme = useTheme();

  const jsDayOfWeek = new Date().getDay();
  const todayIndex = jsDayOfWeek === 0 ? 6 : jsDayOfWeek - 1;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={onShare}
      activeOpacity={onShare ? 0.75 : 1}
      disabled={!onShare}
    >
      {/* Sun + tracker row */}
      <View style={styles.row}>
        <View style={styles.sunWrapper}>
          <SunIcon day={streakCount} size={72} color={theme.gold} />
        </View>

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
                    <MaterialCommunityIcons name="check-bold" size={13} color="#1A1208" />
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignSelf: 'stretch',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
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
});
