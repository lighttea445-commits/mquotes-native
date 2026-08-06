import React from 'react';
import { Pressable, View, StyleSheet, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { Icon, IconName } from './Icon';
import { GlassSurface } from './GlassSurface';
import { useTheme } from '../../hooks/useTheme';
import { usePressScale } from '../../hooks/usePressScale';
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
  /**
   * Renders the filled surface as real liquid glass on iOS 26. Ignored when
   * `filled` is false, since glass needs a surface to live on. Turn off for
   * buttons sitting on a flat background, where glass has nothing to refract
   * and only costs a native view.
   */
  glass?: boolean;
  /** Selection tick on touch down. Respects the user's haptics preference. */
  haptic?: boolean;
  accessibilityLabel: string;
  style?: ViewStyle;
}

/**
 * The circular icon button repeated across every sheet header and action row.
 */
export function IconButton({
  icon,
  onPress,
  size = ICON_BTN.sm,
  iconSize,
  color,
  filled = true,
  glass = true,
  haptic = true,
  accessibilityLabel,
  style,
}: IconButtonProps) {
  const theme = useTheme();
  const { onPressIn, onPressOut, animatedStyle } = usePressScale({ haptic });

  const surface: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const glyph = (
    <Icon
      name={icon}
      size={iconSize ?? Math.round(size * 0.55)}
      color={color ?? theme.textMuted}
    />
  );

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      hitSlop={HIT}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={style}
    >
      <Animated.View style={animatedStyle}>
        {filled && glass ? (
          <GlassSurface
            style={[styles.base, surface]}
            fallbackColor={theme.surface}
            isDark={theme.isDark}
          >
            {glyph}
          </GlassSurface>
        ) : (
          <View style={[styles.base, surface, filled && { backgroundColor: theme.surface }]}>
            {glyph}
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
});
