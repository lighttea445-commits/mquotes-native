import React from 'react';
import { View, Text, Image } from 'react-native';

interface Props {
  streakCount: number;
  showWatermark?: boolean;
  size: number;
  uiFontFamily?: string;
  quoteFontFamily?: string;
}

export function StreakShareCard({ streakCount, showWatermark = true, size, uiFontFamily, quoteFontFamily }: Props) {
  const W = size;
  const H = Math.round(size * 1.35);

  const flameFontSize = Math.round(W * 0.36);
  const countFontSize = Math.round(W * 0.15);
  const titleFontSize = Math.round(W * 0.13);
  const subtitleFontSize = Math.round(W * 0.055);
  const padding = Math.round(W * 0.1);
  const brandFontSize = Math.round(W * 0.043);
  const brandBoxHeight = Math.round(W * 0.11);

  return (
    <View style={{ width: W, height: H, overflow: 'hidden', backgroundColor: '#1A2842' }}>
      {/* Content */}
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: padding,
          paddingTop: padding,
        }}
      >
        {/* Flame emoji + streak number */}
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: flameFontSize, lineHeight: flameFontSize * 1.05 }}>🔥</Text>
          <Text
            style={{
              fontSize: countFontSize,
              fontWeight: '800',
              color: '#ffffff',
              fontFamily: quoteFontFamily,
              marginTop: 4,
            }}
          >
            {streakCount}
          </Text>
        </View>

        {/* "day streak" */}
        <Text
          style={{
            fontSize: titleFontSize,
            fontWeight: '800',
            color: '#ffffff',
            fontFamily: quoteFontFamily,
            marginTop: 10,
          }}
        >
          day streak
        </Text>

        {/* Subtitle */}
        <Text
          style={{
            fontSize: subtitleFontSize,
            color: 'rgba(255,255,255,0.78)',
            fontFamily: uiFontFamily,
            textAlign: 'center',
            marginTop: 14,
            lineHeight: subtitleFontSize * 1.6,
            paddingHorizontal: 8,
          }}
        >
          {"I've made a habit of reading\nmotivating quotes every day!"}
        </Text>
      </View>

      {/* Branding badge */}
      {showWatermark && (
        <View style={{ paddingBottom: Math.round(padding * 0.9), alignItems: 'center' }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: Math.round(W * 0.025),
              backgroundColor: 'rgba(255,255,255,0.11)',
              borderRadius: 20,
              paddingHorizontal: Math.round(W * 0.06),
              height: brandBoxHeight,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.18)',
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
                color: 'rgba(255,255,255,0.88)',
                fontFamily: uiFontFamily,
                fontSize: brandFontSize,
                fontWeight: '600',
                letterSpacing: 1.4,
                textTransform: 'uppercase',
              }}
            >
              Quotable
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
