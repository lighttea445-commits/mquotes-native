import React from 'react';
import { FONTS } from '../../../constants/fonts';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../hooks/useTheme';
import { Icon } from '../../ui/Icon';
import { ContinueButton } from '../ContinueButton';
import { ReviewCarousel, type Review } from '../ReviewCarousel';
import { OB } from '../tokens';

// ─── Content ────────────────────────────────────────────────────────────────

const MOTTO_PRIMARY = 'Evolve your mindset';
const MOTTO_SECONDARY = 'Unlock discipline';

/**
 * The wordmark is the brand logo, so it takes the display face — Peachi —
 * rather than the active theme's token, which would let a theme change restyle
 * the brand name.
 */
const WORDMARK_FONT = FONTS.display.bold;

/**
 * Cross-fades every 4s. One entry renders static; empty hides the block.
 *
 * ⚠ PLACEHOLDER — swap for real reviews before release. Invented ones breach
 * Play Store policy.
 */
const REVIEWS: Review[] = [
  { text: "I don't know where I'd be without this app." },
  { text: 'This app has genuinely changed my life.' },
  { text: 'This app completely changed how I think.' },
];

// ────────────────────────────────────────────────────────────────────────────

interface Props {
  next: () => void;
  /**
   * DEV ONLY — temporary. Renders the screenshot-mode control in the top right,
   * which jumps straight to the theme picker and then into a chrome-free app.
   * Delete this prop and the button below once the store shots are captured.
   */
  onScreenshotMode?: () => void;
}

/** Step 1. No header — the reference shows no progress or back on the splash. */
export function SplashScreen({ next, onScreenshotMode }: Props) {
  const theme = useTheme();

  return (
    <View style={[sp.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={sp.safe} edges={['top', 'bottom']}>
        {/* DEV ONLY — screenshot mode. Delete with the prop above. */}
        {onScreenshotMode ? (
          <TouchableOpacity
            onPress={onScreenshotMode}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={[sp.devBtn, { backgroundColor: theme.surface }]}
            accessibilityLabel="Screenshot mode"
          >
            <Icon name="tune-variant" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        ) : null}

        <View style={sp.artWrap}>
          {/* Swap for your logo if you'd rather lead with the mark:
              <Image source={require('../../../assets/icon.png')}
                     style={{ width: 170, height: 170 }} resizeMode="contain" /> */}
          <View style={sp.markBox}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[sp.wordmark, { color: theme.text }]}
            >
              Quotable
            </Text>
          </View>
        </View>

        <View style={sp.mottoWrap}>
          <Text style={[sp.mottoPrimary, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
            {MOTTO_PRIMARY}
          </Text>
          <Text
            style={[sp.mottoSecondary, { color: theme.text, fontFamily: theme.quoteFontFamily }]}
          >
            {MOTTO_SECONDARY}
          </Text>
        </View>

        <View style={sp.reviews}>
          <ReviewCarousel reviews={REVIEWS} />
        </View>

        {/* Absorbs the slack, so the block above settles above centre. */}
        <View style={sp.tailSpacer} />

        <ContinueButton onPress={next} label="Get started" />
      </SafeAreaView>
    </View>
  );
}

const sp = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  // Tail spacer is lighter than the gap above, settling the block a little
  // below the optical centre. Proportional, so it holds on any height.
  artWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  tailSpacer: { flex: 0.82 },
  // Fixed box so the sparkle viewBox and the wordmark stay in register.
  markBox: { width: 300, height: 120, alignItems: 'center', justifyContent: 'center' },
  wordmark: {
    fontFamily: WORDMARK_FONT,
    fontSize: 52,
    lineHeight: 66,
    textAlign: 'center',
  },
  mottoWrap: { alignItems: 'center', paddingHorizontal: OB.gutter, paddingTop: 34 },
  mottoPrimary: { fontSize: 30, lineHeight: 38, textAlign: 'center' },
  mottoSecondary: { fontSize: 30, lineHeight: 38, textAlign: 'center' },
  reviews: { paddingTop: 30, paddingHorizontal: OB.gutter },
  // DEV ONLY — screenshot mode control. Delete with the button.
  devBtn: {
    position: 'absolute',
    top: 8,
    right: OB.gutter,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.5,
    zIndex: 10,
  },
});
