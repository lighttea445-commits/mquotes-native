import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Icon, IconName } from './Icon';
import { Toggle } from './Toggle';
import { useTheme } from '../../hooks/useTheme';
import { SPACE, RADIUS } from './tokens';

type Trailing =
  | { kind: 'chevron' }
  | { kind: 'value'; value: string }
  /** Current value alongside a chevron, for a row that opens a picker. */
  | { kind: 'valueChevron'; value: string }
  | { kind: 'switch'; value: boolean; onValueChange: (v: boolean) => void }
  | { kind: 'none' };

interface ListRowProps {
  label: string;
  icon?: IconName;
  onPress?: () => void;
  trailing?: Trailing;
  /** First row in its group — rounds the top corners. */
  first?: boolean;
  /** Last row in its group — rounds the bottom corners and drops the divider. */
  last?: boolean;
  /** Renders the label in the destructive color. */
  destructive?: boolean;
}

/**
 * One row of a grouped list. Set `first`/`last` so a run of rows reads as a
 * single rounded block with hairline dividers between them — the Settings
 * pattern. A standalone row takes both flags.
 */
export function ListRow({
  label,
  icon,
  onPress,
  trailing = { kind: 'chevron' },
  first,
  last,
  destructive,
}: ListRowProps) {
  const theme = useTheme();
  const labelColor = destructive ? '#EF4444' : theme.text;

  const body = (
    <View
      style={[
        styles.row,
        {
          backgroundColor: theme.surface,
          borderTopLeftRadius: first ? RADIUS.row : 0,
          borderTopRightRadius: first ? RADIUS.row : 0,
          borderBottomLeftRadius: last ? RADIUS.row : 0,
          borderBottomRightRadius: last ? RADIUS.row : 0,
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: theme.border,
        },
      ]}
    >
      {icon ? (
        <Icon name={icon} size={22} color={destructive ? labelColor : theme.gold} />
      ) : null}

      <Text style={[styles.label, { color: labelColor, fontFamily: theme.uiFontFamily }]} numberOfLines={1}>
        {label}
      </Text>

      {trailing.kind === 'chevron' && (
        <Icon name="chevron-right" size={22} color={theme.textMuted} />
      )}
      {trailing.kind === 'value' && (
        <Text style={[styles.value, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
          {trailing.value}
        </Text>
      )}
      {trailing.kind === 'valueChevron' && (
        <View style={styles.valueChevron}>
          <Text style={[styles.value, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
            {trailing.value}
          </Text>
          <Icon name="chevron-right" size={22} color={theme.textMuted} />
        </View>
      )}
      {trailing.kind === 'switch' && (
        <Toggle
          value={trailing.value}
          onValueChange={trailing.onValueChange}
          accessibilityLabel={label}
        />
      )}
    </View>
  );

  if (!onPress) return body;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} accessibilityRole="button">
      {body}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.md,
    gap: SPACE.lg,
  },
  label: {
    flex: 1,
    fontSize: 16,
  },
  value: {
    fontSize: 15,
  },
  valueChevron: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
