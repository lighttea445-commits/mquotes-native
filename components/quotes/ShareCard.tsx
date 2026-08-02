import React, { forwardRef } from 'react';
import { View, Text, Image, StyleSheet, ImageBackground } from 'react-native';
import { Theme } from '../../constants/themes';

interface Props {
  quote: string;
  author: string;
  theme: Theme;
  size: number;
  showWatermark?: boolean;
}

export const ShareCard = forwardRef<View, Props>(({ quote, author, theme, size, showWatermark = true }, ref) => {
  const W = size;
  const H = Math.round(size * 1.25); // 4:5 portrait

  const quoteFontSize = Math.max(16, Math.min(28, W * 0.072));
  const quoteLineHeight = quoteFontSize * 1.6;
  const padding = Math.round(W * 0.1);
  const brandFontSize = Math.round(W * 0.042);
  const brandBoxHeight = Math.round(W * 0.1);

  // Matches StreakShareCard: on an image theme the art sits under a scrim so
  // the mark keys off white; on a flat theme it uses the theme's own off-white.
  const accent = theme.backgroundImage ? '#E8E0D0' : theme.text;

  return (
    <View ref={ref} style={{ width: W, height: H, overflow: 'hidden', borderRadius: 0 }}>
      {/* Background */}
      {theme.backgroundImage ? (
        <ImageBackground
          source={theme.backgroundImage}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.background }]} />
      )}

      {/* Dark scrim */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.52)' }]} />

      {/* Card content — centered */}
      <View
        style={{
          flex: 1,
          paddingHorizontal: padding,
          // Keeps the quote clear of the watermark pill below it.
          paddingBottom: showWatermark ? padding * 2 + brandBoxHeight : padding,
          paddingTop: padding,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            color: theme.text,
            fontFamily: theme.quoteFontFamily,
            fontSize: quoteFontSize,
            lineHeight: quoteLineHeight,
            textAlign: 'center',
            letterSpacing: 0.3,
          }}
        >
          {quote}
        </Text>
      </View>

      {/* Watermark — a compact centred pill, matching StreakShareCard */}
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
});
