import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../hooks/useTheme';
import { ContinueButton } from '../ContinueButton';
import { AppMark } from '../art/AppMark';
import { ReviewCarousel, type Review } from '../ReviewCarousel';
import { OB } from '../tokens';

// ─── Content ────────────────────────────────────────────────────────────────

const MOTTO_PRIMARY = 'Evolve your mindset';
const MOTTO_SECONDARY = 'Unlock discipline';

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
          <AppMark size={150} color={theme.text}>
            {/* Swap this for your logo:
                <Image source={require('../../../assets/icon.png')}
                       style={{ width: '100%', height: '100%' }} resizeMode="contain" /> */}
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[sp.wordmark, { color: theme.text, fontFamily: theme.quoteFontFamily }]}
            >
              Quotable
            </Text>
          </AppMark>
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
  wordmark: { fontSize: 20, textAlign: 'center' },
  mottoWrap: { alignItems: 'center', paddingHorizontal: OB.gutter, paddingTop: 34 },
  mottoPrimary: { fontSize: 30, lineHeight: 38, textAlign: 'center' },
  mottoSecondary: { fontSize: 30, lineHeight: 38, textAlign: 'center' },
  reviews: { flex: 1, justifyContent: 'center', paddingHorizontal: OB.gutter },
});
