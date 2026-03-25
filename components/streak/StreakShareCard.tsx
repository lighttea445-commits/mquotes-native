import React from 'react';
import { View, Text, Image, StyleSheet, ImageBackground } from 'react-native';
import { Theme } from '../../constants/themes';

interface Props {
  streakCount: number;
  theme: Theme;
  showWatermark?: boolean;
  size: number;
}

export function StreakShareCard({ streakCount, theme, showWatermark = true, size }: Props) {
  const W = size;
  const H = Math.round(size * 1.25);

  const countFontSize = Math.round(W * 0.32);
  const labelFontSize = Math.round(W * 0.09);
  const subtitleFontSize = Math.round(W * 0.052);
  const padding = Math.round(W * 0.1);
  const brandFontSize = Math.round(W * 0.044);
  const brandBoxHeight = Math.round(W * 0.11);

  return (
    <View style={{ width: W, height: H, overflow: 'hidden' }}>
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

      {/* Content — centered */}
      <View
        style={{
          flex: 1,
          paddingHorizontal: padding,
          paddingBottom: showWatermark
            ? Math.round(padding * 0.75 + brandBoxHeight + padding * 0.4)
            : padding,
          paddingTop: padding,
          justifyContent: 'center',
          alignItems: 'center',
          gap: 0,
        }}
      >
        <Text
          style={{
            fontSize: countFontSize,
            color: '#B8975A',
            fontFamily: theme.quoteFontFamily,
            fontWeight: '800',
            lineHeight: countFontSize * 1.0,
            letterSpacing: -2,
          }}
        >
          {streakCount}
        </Text>
        <Text
          style={{
            fontSize: labelFontSize,
            color: 'rgba(255,255,255,0.9)',
            fontFamily: theme.quoteFontFamily,
            fontWeight: '600',
            letterSpacing: 3,
            textTransform: 'uppercase',
            marginTop: Math.round(W * 0.03),
          }}
        >
          day streak
        </Text>
        <View
          style={{
            width: Math.round(W * 0.12),
            height: 1,
            backgroundColor: 'rgba(255,255,255,0.3)',
            marginTop: Math.round(W * 0.06),
            marginBottom: Math.round(W * 0.06),
          }}
        />
        <Text
          style={{
            fontSize: subtitleFontSize,
            color: 'rgba(255,255,255,0.72)',
            fontFamily: theme.uiFontFamily,
            textAlign: 'center',
            lineHeight: subtitleFontSize * 1.65,
            letterSpacing: 0.3,
          }}
        >
          {"I've made a habit of getting\nmotivated each day!"}
        </Text>
      </View>

      {/* Branding bar */}
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
}
