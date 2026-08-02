import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Icon, IconName } from './Icon';
import { useTheme } from '../../hooks/useTheme';
import { SPACE, RADIUS, HIT } from './tokens';

/** "Sun, 2 August 2026" — the stamp used on every saved quote in the app. */
export function formatQuoteDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export interface QuoteCardAction {
  icon: IconName;
  accessibilityLabel: string;
  onPress: () => void;
  /** Defaults to `theme.textMuted`. Pass a theme colour for an active state. */
  color?: string;
}

interface QuoteListCardProps {
  text: string;
  /** ISO timestamp. Rendered bottom-left, beneath the quote. */
  date: string;
  actions: QuoteCardAction[];
}

/**
 * One saved quote in a list: the quote, a date stamp, and a row of actions on
 * the right. Shared by Favorites, History and My quotes so the three lists stay
 * identical — they differ only in which actions they pass.
 */
export function QuoteListCard({ text, date, actions }: QuoteListCardProps) {
  const theme = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      <Text style={[styles.text, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
        {text}
      </Text>

      <View style={styles.footer}>
        <Text style={[styles.date, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
          {formatQuoteDate(date)}
        </Text>

        <View style={styles.actions}>
          {actions.map(({ icon, accessibilityLabel, onPress, color }) => (
            <TouchableOpacity
              key={accessibilityLabel}
              onPress={onPress}
              hitSlop={HIT}
              accessibilityRole="button"
              accessibilityLabel={accessibilityLabel}
            >
              <Icon name={icon} size={22} color={color ?? theme.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.card,
    padding: SPACE.lg,
    marginBottom: SPACE.md,
    gap: SPACE.lg,
  },
  text: {
    fontSize: 17,
    lineHeight: 25,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACE.md,
  },
  date: {
    flex: 1,
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xl,
  },
});
