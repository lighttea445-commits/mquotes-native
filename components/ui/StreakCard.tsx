import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from './Icon';
import { useTheme } from '../../hooks/useTheme';
import { StreakFlame } from './StreakFlame';
import { FONTS } from '../../constants/fonts';

interface StreakCardProps {
  streakCount: number;
  weekData: boolean[]; // 7 elements: Mon=0 … Sun=6
  onShare?: () => void;
  /** Overflow action — opens streak settings. Only rendered with a title. */
  onMenu?: () => void;
  /**
   * Adds a titled header row with an explicit share button. Without it the
   * whole card is the share target, which is right for the onboarding preview
   * but gives no affordance on a real screen.
   */
  title?: string;
}

const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export function StreakCard({ streakCount, weekData, onShare, onMenu, title }: StreakCardProps) {
  const theme = useTheme();

  const jsDayOfWeek = new Date().getDay();
  const todayIndex = jsDayOfWeek === 0 ? 6 : jsDayOfWeek - 1;

  const Container: React.ComponentType<any> = title ? View : TouchableOpacity;
  const containerProps = title
    ? {}
    : { onPress: onShare, activeOpacity: onShare ? 0.75 : 1, disabled: !onShare };

  return (
    <Container
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
      {...containerProps}
    >
      {title ? (
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <View style={styles.headerActions}>
            {onShare ? (
              <TouchableOpacity
                onPress={onShare}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Share your streak"
              >
                <Icon name="export-variant" size={22} color={theme.gold} />
              </TouchableOpacity>
            ) : null}
            {onMenu ? (
              <TouchableOpacity
                onPress={onMenu}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Streak settings"
              >
                <Icon name="dots-vertical" size={22} color={theme.gold} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Sun + tracker row */}
      <View style={styles.row}>
        <View style={styles.sunWrapper}>
          <StreakFlame day={streakCount} size={72} color={theme.gold} />
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
                      fontFamily: isToday ? FONTS.ui.bold : FONTS.ui.regular,
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
                    <Icon name="check-bold" size={13} color="#1A1208" />
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </Container>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: FONTS.display.bold,
    lineHeight: 26,
    includeFontPadding: false,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
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
