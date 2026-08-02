import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Icon, IconName } from './Icon';
import { useTheme } from '../../hooks/useTheme';
import { ICON_BTN, HIT } from './tokens';

interface IconButtonProps {
  icon: IconName;
  onPress: () => void;
  /** Button diameter. Defaults to 36 (the size used across sheet headers). */
  size?: number;
  /** Glyph size. Defaults to just under half the button diameter. */
  iconSize?: number;
  /** Glyph color. Defaults to `theme.textMuted`. */
  color?: string;
  /** Set false for a bare glyph with no circular surface behind it. */
  filled?: boolean;
  accessibilityLabel: string;
  style?: ViewStyle;
}

/**
 * The circular icon button repeated across every sheet header and action row.
 * Replaces the ~15 hand-rolled copies of the same 36×36 / borderRadius-18 /
 * `theme.surface` block.
 */
export function IconButton({
  icon,
  onPress,
  size = ICON_BTN.sm,
  iconSize,
  color,
  filled = true,
  accessibilityLabel,
  style,
}: IconButtonProps) {
  const theme = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={HIT}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: filled ? theme.surface : 'transparent',
        },
        style,
      ]}
    >
      <Icon
        name={icon}
        size={iconSize ?? Math.round(size * 0.55)}
        color={color ?? theme.textMuted}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
