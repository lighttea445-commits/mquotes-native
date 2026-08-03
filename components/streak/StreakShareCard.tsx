import React from 'react';
import { View, Text, Image, StyleSheet, ImageBackground } from 'react-native';
import Svg from 'react-native-svg';
import { Theme } from '../../constants/themes';
import { Sparkle } from '../art/primitives';
import { FONTS } from '../../constants/fonts';

interface Props {
  streakCount: number;
  theme: Theme;
  showWatermark?: boolean;
  size: number;
}

/**
 * Sparkle field behind the count, in fractions of the card's width/height so
 * it scales with any preview size. Hand-placed to ring the numeral without
 * crowding it.
 */
const SPARKS: { x: number; y: number; r: number; o: number }[] = [
  // Nothing at x 0.50: the numeral sits dead centre, so a sparkle there lands
  // on the glyph rather than around it.
  { x: 0.28, y: 0.30, r: 0.022, o: 0.75 },
  { x: 0.72, y: 0.28, r: 0.026, o: 0.85 },
  { x: 0.16, y: 0.38, r: 0.018, o: 0.55 },
  { x: 0.86, y: 0.36, r: 0.020, o: 0.60 },
  { x: 0.63, y: 0.40, r: 0.016, o: 0.70 },
  { x: 0.35, y: 0.46, r: 0.024, o: 0.80 },
  { x: 0.80, y: 0.50, r: 0.015, o: 0.50 },
];

export function StreakShareCard({ streakCount, theme, showWatermark = true, size }: Props) {
  const W = size;
  const H = Math.round(size * 1.25);

  const countFontSize = Math.round(W * 0.34);
  const labelFontSize = Math.round(W * 0.13);
  const subtitleFontSize = Math.round(W * 0.055);
  const padding = Math.round(W * 0.1);
  const brandFontSize = Math.round(W * 0.042);
  const brandBoxHeight = Math.round(W * 0.1);

  // On an image theme the art sits under a scrim, so the sparkles and rules
  // key off white; on a flat theme they key off the theme's own off-white.
  const accent = theme.backgroundImage ? '#E8E0D0' : theme.text;

  return (
    <View style={{ width: W, height: H, overflow: 'hidden' }}>
      {theme.backgroundImage ? (
        <>
          <ImageBackground
            source={theme.backgroundImage}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.52)' }]} />
        </>
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.background }]} />
      )}

      {/* Sparkle field */}
      <Svg style={StyleSheet.absoluteFillObject} width={W} height={H}>
        {SPARKS.map((s, i) => (
          <Sparkle key={i} x={s.x * W} y={s.y * H} r={s.r * W} color={accent} opacity={s.o} />
        ))}
      </Svg>

      {/* Count + label, optically centred above the watermark */}
      <View
        style={{
          flex: 1,
          paddingHorizontal: padding,
          paddingTop: padding,
          paddingBottom: showWatermark ? padding * 2 + brandBoxHeight : padding,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontSize: countFontSize,
            color: accent,
            fontFamily: FONTS.display.bold,
            lineHeight: Math.round(countFontSize * 1.05),
            includeFontPadding: false,
          }}
        >
          {streakCount}
        </Text>

        <Text
          style={{
            fontSize: labelFontSize,
            color: accent,
            fontFamily: FONTS.display.bold,
            lineHeight: Math.round(labelFontSize * 1.2),
            includeFontPadding: false,
            marginTop: Math.round(W * 0.01),
          }}
        >
          day streak
        </Text>

        <Text
          style={{
            fontSize: subtitleFontSize,
            color: accent,
            opacity: 0.75,
            fontFamily: theme.uiFontFamily,
            textAlign: 'center',
            lineHeight: Math.round(subtitleFontSize * 1.5),
            marginTop: Math.round(W * 0.05),
          }}
        >
          showing up for myself
        </Text>
      </View>

      {/* Watermark — a compact centred pill, not a full-width bar */}
      {showWatermark && (
        <View
          style={{
            position: 'absolute',
            bottom: padding,
            alignSelf: 'center',
            height: brandBoxHeight,
            borderRadius: brandBoxHeight / 2,
            backgroundColor: 'rgba(0,0,0,0.28)',
            flexDirection: 'row',
            alignItems: 'center',
            gap: Math.round(W * 0.022),
            paddingLeft: Math.round(W * 0.022),
            paddingRight: Math.round(W * 0.045),
          }}
        >
          <Image
            source={require('../../assets/icon.png')}
            style={{
              width: Math.round(brandBoxHeight * 0.72),
              height: Math.round(brandBoxHeight * 0.72),
              borderRadius: Math.round(brandBoxHeight * 0.2),
            }}
            resizeMode="cover"
          />
          <Text
            style={{
              color: accent,
              fontFamily: theme.uiFontFamily,
              fontSize: brandFontSize,
              letterSpacing: 0.4,
            }}
          >
            Quotable
          </Text>
        </View>
      )}
    </View>
  );
}
