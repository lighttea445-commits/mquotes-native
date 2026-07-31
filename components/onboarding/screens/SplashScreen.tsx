import React from 'react';
import { View, Text, StyleSheet, ImageBackground, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../hooks/useTheme';
import { ContinueButton } from '../ContinueButton';
import { OB } from '../tokens';

const { width: SW, height: SH } = Dimensions.get('window');

/**
 * Social proof shown above the CTA.
 *
 * `installs` is null on purpose — the reference flow claims "+20 million lives
 * changed", and shipping an invented install count or review is a Play Store
 * policy risk. Set these to real, verifiable values to show the block.
 */
const SOCIAL_PROOF: { installs: string | null; rating: number; testimonial: string | null } = {
  installs: null,
  rating: 5,
  testimonial: null,
};

interface Props {
  next: () => void;
}

/** Step 1. No header — the reference shows no progress or back on the splash. */
export function SplashScreen({ next }: Props) {
  const theme = useTheme();
  const cardW = Math.min(SW - 24, 400);
  const cardH = Math.min(cardW * 1.45, SH * 0.56);

  return (
    <View style={[sp.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={sp.safe} edges={['top', 'bottom']}>
        <View style={sp.center}>
          <View style={[sp.cardWrap, { width: cardW, height: cardH }]}>
            <ImageBackground
              source={require('../../../assets/clouds.jpg')}
              style={sp.img}
              imageStyle={sp.imgRadius}
              resizeMode="cover"
            >
              <View style={sp.overlay} />
              <View style={sp.inner}>
                <Text style={[sp.brand, { fontFamily: theme.quoteFontFamily }]}>Quotable</Text>
                <Text style={[sp.tagline, { fontFamily: theme.uiFontFamily }]}>
                  Transform your mindset with powerful quotes
                </Text>
              </View>
            </ImageBackground>
          </View>

          <View style={sp.proof}>
            {SOCIAL_PROOF.installs ? (
              <Text style={[sp.installs, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
                {SOCIAL_PROOF.installs}
              </Text>
            ) : null}

            <View style={sp.stars}>
              {Array.from({ length: SOCIAL_PROOF.rating }).map((_, i) => (
                <MaterialCommunityIcons key={i} name="star" size={18} color={theme.gold} />
              ))}
            </View>

            {SOCIAL_PROOF.testimonial ? (
              <Text
                style={[sp.testimonial, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}
              >
                {`"${SOCIAL_PROOF.testimonial}"`}
              </Text>
            ) : null}
          </View>
        </View>

        <ContinueButton onPress={next} label="Get started" />
      </SafeAreaView>
    </View>
  );
}

const sp = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, width: '100%' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: OB.gutter },
  cardWrap: { borderRadius: 24, overflow: 'hidden' },
  img: { flex: 1 },
  imgRadius: { borderRadius: 24 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(26,26,26,0.55)', borderRadius: 24 },
  inner: { flex: 1, padding: 32, justifyContent: 'flex-end' },
  brand: { fontSize: 38, color: '#f0ece4', lineHeight: 46 },
  tagline: { fontSize: 15, color: 'rgba(240,236,228,0.75)', marginTop: 12, lineHeight: 22 },
  proof: { alignItems: 'center', marginTop: 28, gap: 10 },
  installs: { fontSize: 26 },
  stars: { flexDirection: 'row', gap: 4 },
  testimonial: { fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 300 },
});
