import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { usePressScale } from '../../hooks/usePressScale';
import { IconButton } from './IconButton';
import { IconName } from './Icon';
import { GlassSurface, liquidGlassAvailable } from './GlassSurface';
import { GUTTER, SPACE, HIT, RADIUS, ICON_BTN } from './tokens';
import { FONTS } from '../../constants/fonts';

interface SheetHeaderProps {
  title?: string;
  /**
   * `close` renders an X (top-level sheets), `back` renders an arrow (screens
   * pushed from another sheet), `none` renders nothing.
   */
  leading?: 'close' | 'back' | 'none';
  onLeadingPress?: () => void;
  /** Right-hand text action, e.g. "Settings", "Clear all", "Unlock all". */
  actionLabel?: string;
  /**
   * Glyph to use for the action instead of its text, where the platform draws
   * glass chrome. `actionLabel` is still required and becomes the
   * accessibility label, so screen readers announce the action either way.
   *
   * Only applies on iOS 26. Android and older iOS keep the text, which is the
   * convention on those platforms and reads better without a surface behind it.
   */
  actionIcon?: IconName;
  onActionPress?: () => void;
  /** Anything else to sit in the right slot (sort toggles, Follow chip, …). */
  right?: React.ReactNode;
}

/**
 * The header row shared by every full-height sheet: leading control, a
 * left-aligned display-font title, and an optional right-hand action.
 *
 * Sheets now run to the very top of the screen, so each screen supplies its
 * own top safe-area inset (`edges={['top','bottom']}`) and this header sits
 * directly beneath it.
 *
 * On iOS 26 the leading control and the text action are carried on liquid
 * glass, matching how the system draws sheet chrome. Everywhere else they stay
 * exactly as they were: a bare glyph and bare text. The glass needs a surface
 * to live on, and inventing one on Android would change that platform's look
 * for no gain.
 */
export function SheetHeader({
  title,
  leading = 'close',
  onLeadingPress,
  actionLabel,
  actionIcon,
  onActionPress,
  right,
}: SheetHeaderProps) {
  const theme = useTheme();
  const glass = liquidGlassAvailable();

  return (
    <View style={styles.header}>
      {leading !== 'none' && onLeadingPress ? (
        <IconButton
          icon={leading === 'back' ? 'arrow-left' : 'close'}
          onPress={onLeadingPress}
          filled={glass}
          size={glass ? ICON_BTN.md : ICON_BTN.sm}
          iconSize={glass ? 22 : 26}
          color={theme.text}
          accessibilityLabel={leading === 'back' ? 'Go back' : 'Close'}
          // The bare glyph needs pulling back into the gutter optically. A
          // glass circle already sits on the gutter correctly.
          style={glass ? undefined : styles.leading}
        />
      ) : null}

      {title ? (
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {title}
        </Text>
      ) : null}

      <View style={styles.spacer} />

      {right}

      {actionLabel && onActionPress ? (
        actionIcon && glass ? (
          <IconButton
            icon={actionIcon}
            onPress={onActionPress}
            size={ICON_BTN.md}
            iconSize={22}
            color={theme.text}
            accessibilityLabel={actionLabel}
          />
        ) : (
          <HeaderAction label={actionLabel} onPress={onActionPress} />
        )
      ) : null}
    </View>
  );
}

/**
 * The right-hand text action. A glass pill on iOS 26, bare text elsewhere.
 */
function HeaderAction({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  // A pill is much wider than it is tall, so the circular button's compression
  // would swing its edges far enough to read as a wobble. Go shallower.
  const { onPressIn, onPressOut, animatedStyle } = usePressScale({ scale: 0.96 });
  const glass = liquidGlassAvailable();

  const text = (
    <Text style={[styles.action, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
      {label}
    </Text>
  );

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      hitSlop={HIT}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Animated.View style={animatedStyle}>
        {glass ? (
          <GlassSurface
            style={styles.actionPill}
            fallbackColor={theme.surface}
            isDark={theme.isDark}
          >
            {text}
          </GlassSurface>
        ) : (
          text
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GUTTER,
    paddingTop: SPACE.md,
    paddingBottom: SPACE.md,
    gap: SPACE.md,
  },
  leading: {
    marginLeft: -6,
  },
  title: {
    fontSize: 28,
    // Weight is a family name, not a fontWeight — see constants/fonts.ts.
    fontFamily: FONTS.display.bold,
    // Peachi carries a lot of ascent/descent. Without an explicit line height
    // and Android's font padding switched off, the text box is taller than the
    // glyphs and `alignItems: 'center'` centres the box — leaving the leading
    // icon visibly off-centre against the title.
    lineHeight: 34,
    includeFontPadding: false,
    textAlignVertical: 'center',
    flexShrink: 1,
  },
  spacer: {
    flex: 1,
  },
  action: {
    fontSize: 16,
  },
  actionPill: {
    // Matches the glass circles at either end of the header, so a text action
    // and an icon action sit on the same visual line.
    height: ICON_BTN.md,
    paddingHorizontal: SPACE.lg,
    borderRadius: RADIUS.pill,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
});
