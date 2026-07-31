import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../hooks/useTheme';
import { ContinueButton } from '../ContinueButton';
import Svg from 'react-native-svg';
import { Sparkle } from '../art/primitives';
import { ReviewCarousel, type Review } from '../ReviewCarousel';
import { OB } from '../tokens';

// ─── Content ────────────────────────────────────────────────────────────────

const MOTTO_PRIMARY = 'Evolve your mindset';
const MOTTO_SECONDARY = 'Unlock discipline';

/**
 * Wordmark face. All of these are loaded in app/_layout.tsx:
 *   EBGaramond_800ExtraBold           — old-style, hooked terminals (shipped)
 *   EBGaramond_700Bold                — same face, a shade lighter
 *   DMSerifDisplay_400Regular_Italic  — highest contrast, calligraphic
 *   PlayfairDisplay_400Regular_Italic — matches the app's heading face
 *   Cormorant_700Bold                 — lightest, most delicate
 */
const WORDMARK_FONT = 'EBGaramond_800ExtraBold';

/**
 * Cross-fades every 4s. One entry renders static; empty hides the block.
 *
 * ⚠ PLACEHOLDER — swap for real reviews before release. Invented ones breach
 * Play Store policy.
 */
const REVIEWS: Review[] = [
  { text: 'One line in the morning and the whole day lands differently.' },
  { text: 'The only app on my home screen I actually stop and read.' },
  { text: 'Beautiful, quiet, and never asks for my attention twice.' },
];

// ────────────────────────────────────────────────────────────────────────────

interface Props {
  next: () => void;
}

/** Step 1. No header — the reference shows no progress or back on the splash. */
export function SplashScreen({ next }: Props) {
  const theme = useTheme();

  return (
    <View style={[sp.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={sp.safe} edges={['top', 'bottom']}>
        <View style={sp.artWrap}>
          {/* Swap for your logo if you'd rather lead with the mark:
              <Image source={require('../../../assets/icon.png')}
                     style={{ width: 170, height: 170 }} resizeMode="contain" /> */}
          <View style={sp.markBox}>
            <Svg style={StyleSheet.absoluteFill} viewBox="0 0 300 120">
              <Sparkle x={26} y={30} r={13} color={theme.text} />
              <Sparkle x={278} y={64} r={7} color={theme.text} opacity={0.9} />
              <Sparkle x={44} y={98} r={5} color={theme.text} opacity={0.6} />
            </Svg>
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

        <ContinueButton onPress={next} label="Get started" />
      </SafeAreaView>
    </View>
  );
}

const sp = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  artWrap: { flex: 1.15, alignItems: 'center', justifyContent: 'flex-end' },
  // Fixed box so the sparkle viewBox and the wordmark stay in register.
  markBox: { width: 300, height: 120, alignItems: 'center', justifyContent: 'center' },
  wordmark: {
    // Hardcoded rather than theme.quoteFontFamily: a wordmark should read the
    // same everywhere, not change with the user's theme.
    fontFamily: WORDMARK_FONT,
    fontSize: 52,
    lineHeight: 66,
    textAlign: 'center',
  },
  mottoWrap: { alignItems: 'center', paddingHorizontal: OB.gutter, paddingTop: 34 },
  mottoPrimary: { fontSize: 30, lineHeight: 38, textAlign: 'center' },
  mottoSecondary: { fontSize: 30, lineHeight: 38, textAlign: 'center' },
  reviews: { flex: 1, justifyContent: 'center', paddingHorizontal: OB.gutter },
});
