import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../hooks/useTheme';
import { ContinueButton } from '../ContinueButton';
import { LogoFrame } from '../art/LogoFrame';
import { Laurel } from '../art/Laurel';
import { ReviewCarousel, type Review } from '../ReviewCarousel';
import { OB } from '../tokens';

// ─── Content ────────────────────────────────────────────────────────────────
// The only things to edit on this screen. Both blocks hide themselves when
// empty, so the layout stays correct until you have real numbers to show.

/**
 * Headline stat above the tagline, e.g. '+20 million'.
 *
 * Left null deliberately — the reference claims "+20 million lives changed",
 * and an invented install count is a Play Store policy risk. Set it to a real,
 * verifiable figure and the laurels appear with it.
 */
const HEADLINE_STAT: string | null = null;
const STAT_LABEL = 'Lives changed';

const TAGLINE = 'Transform your mindset with powerful quotes';

/** Real reviews only. The carousel cross-fades between them every 4s. */
const REVIEWS: Review[] = [];

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
        {/* Mark */}
        <View style={sp.logoWrap}>
          <LogoFrame size={140} color={theme.text}>
            {/* Swap this Text for your logo, e.g.
                <Image source={require('../../../assets/icon.png')}
                       style={{ width: '100%', height: '100%' }}
                       resizeMode="contain" /> */}
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[sp.mark, { color: theme.text, fontFamily: theme.quoteFontFamily }]}
            >
              Quotable
            </Text>
          </LogoFrame>
        </View>

        {/* Stat between laurels */}
        <View style={sp.proof}>
          {HEADLINE_STAT ? (
            <View style={sp.laurelRow}>
              <Laurel size={62} color={theme.text} side="left" />
              <View style={sp.statText}>
                <Text style={[sp.stat, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
                  {HEADLINE_STAT}
                </Text>
                <Text style={[sp.statLabel, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
                  {STAT_LABEL}
                </Text>
              </View>
              <Laurel size={62} color={theme.text} side="right" />
            </View>
          ) : null}

          <Text style={[sp.tagline, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
            {TAGLINE}
          </Text>
        </View>

        {/* Rotating reviews */}
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
  logoWrap: { flex: 1.1, alignItems: 'center', justifyContent: 'flex-end' },
  mark: { fontSize: 22, textAlign: 'center' },
  proof: { alignItems: 'center', paddingHorizontal: OB.gutter, paddingTop: 40, gap: 22 },
  laurelRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  statText: { alignItems: 'center' },
  stat: { fontSize: 32, lineHeight: 40 },
  statLabel: { fontSize: 17, marginTop: 2 },
  tagline: { fontSize: 19, lineHeight: 27, textAlign: 'center', maxWidth: 320 },
  reviews: { flex: 1, justifyContent: 'center', paddingHorizontal: OB.gutter },
});
