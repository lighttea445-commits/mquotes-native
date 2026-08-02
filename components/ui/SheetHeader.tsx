import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { IconButton } from './IconButton';
import { GUTTER, SPACE, HIT } from './tokens';
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
 */
export function SheetHeader({
  title,
  leading = 'close',
  onLeadingPress,
  actionLabel,
  onActionPress,
  right,
}: SheetHeaderProps) {
  const theme = useTheme();

  return (
    <View style={styles.header}>
      {leading !== 'none' && onLeadingPress ? (
        <IconButton
          icon={leading === 'back' ? 'arrow-left' : 'close'}
          onPress={onLeadingPress}
          filled={false}
          iconSize={26}
          color={theme.text}
          accessibilityLabel={leading === 'back' ? 'Go back' : 'Close'}
          style={styles.leading}
        />
      ) : null}

      {title ? (
        <Text
          style={[styles.title, { color: theme.text }]}
          numberOfLines={1}
        >
          {title}
        </Text>
      ) : null}

      <View style={styles.spacer} />

      {right}

      {actionLabel && onActionPress ? (
        <TouchableOpacity onPress={onActionPress} hitSlop={HIT} accessibilityRole="button">
          <Text style={[styles.action, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
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
});
