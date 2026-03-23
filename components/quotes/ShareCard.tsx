import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { Theme } from '../../constants/themes';

interface Props {
  quote: string;
  author: string;
  theme: Theme;
  size: number;
}

export const ShareCard = forwardRef<View, Props>(({ quote, author, theme, size }, ref) => {
  const W = size;
  const H = Math.round(size * 1.25); // 4:5 portrait

  const quoteFontSize = Math.max(16, Math.min(28, W * 0.072));
  const quoteLineHeight = quoteFontSize * 1.6;
  const authorFontSize = Math.round(W * 0.042);
  const padding = Math.round(W * 0.1);

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
          justifyContent: 'center',
          alignItems: 'center',
          gap: padding * 0.55,
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
          {'\u201C'}{quote}{'\u201D'}
        </Text>

        <Text
          style={{
            color: theme.text,
            fontFamily: theme.uiFontFamily,
            fontSize: authorFontSize,
            letterSpacing: 2.5,
            textTransform: 'uppercase',
            textAlign: 'center',
            opacity: 0.9,
          }}
        >
          {author || 'Unknown'}
        </Text>
      </View>
    </View>
  );
});
