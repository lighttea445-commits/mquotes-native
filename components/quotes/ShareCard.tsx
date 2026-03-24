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
  const brandFontSize = Math.round(W * 0.044);
  const brandBoxHeight = Math.round(W * 0.11);

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
          paddingBottom: padding,
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

      {/* Quotable branding — bottom bar */}
      {showWatermark && (
        <View
          style={{
            position: 'absolute',
            bottom: padding * 0.75,
            left: padding,
            right: padding,
            height: brandBoxHeight,
            borderRadius: 10,
            backgroundColor: 'rgba(255,255,255,0.13)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.18)',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: Math.round(W * 0.025),
            paddingHorizontal: Math.round(W * 0.04),
          }}
        >
          <Image
            source={require('../../assets/icon.png')}
            style={{
              width: Math.round(brandBoxHeight * 0.54),
              height: Math.round(brandBoxHeight * 0.54),
              borderRadius: 4,
            }}
            resizeMode="cover"
          />
          <Text
            style={{
              color: 'rgba(255,255,255,0.9)',
              fontFamily: theme.uiFontFamily,
              fontSize: brandFontSize,
              fontWeight: '600',
              letterSpacing: 1.4,
              textTransform: 'uppercase',
            }}
          >
            Quotable
          </Text>
        </View>
      )}
    </View>
  );
});
