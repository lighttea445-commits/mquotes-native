import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { FONTS } from '../../constants/fonts';

interface StreakFlameProps {
  /** The streak count shown inside the flame. */
  day: number;
  size?: number;
  color?: string;
}

/**
 * Flame holding the streak count.
 *
 * A single outline — no inner flame — stroked rather than filled, so it sits
 * with the rest of the line art instead of introducing the only solid shape
 * on the screen.
 *
 * Drawn on a fixed 100-unit viewBox scaled by `size`, so geometry is written
 * once and every stroke scales with it. The numeral is a real `Text` layered
 * over the drawing rather than SVG's own text element, because
 * react-native-svg does not reliably resolve custom font families on Android.
 */
const VB = 100;
const STROKE = 2.5;

/** Tip at top, leaning slightly, bellying out low — reads as fire, not a drop. */
const FLAME = `M 50 6
  C 58 24, 77 35, 77 55
  C 77 75, 65 90, 50 90
  C 35 90, 23 75, 23 55
  C 23 41, 34 34, 40 26
  C 44 20, 47 13, 50 6
  Z`;

export function StreakFlame({ day, size = 64, color = '#B8975A' }: StreakFlameProps) {
  // Long streaks have to stay inside the flame's belly rather than spilling out.
  const digits = String(day).length;
  const fontScale = digits >= 3 ? 0.16 : digits === 2 ? 0.21 : 0.26;
  const fontSize = Math.round(size * fontScale);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`}>
        <Path
          d={FLAME}
          stroke={color}
          strokeWidth={STROKE}
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
        />
      </Svg>

      {/* Sits low, where the flame is widest */}
      <View style={[styles.numberLayer, { paddingBottom: size * 0.2 }]} pointerEvents="none">
        <Text
          style={{
            color,
            fontFamily: FONTS.display.bold,
            fontSize,
            lineHeight: Math.round(fontSize * 1.1),
            includeFontPadding: false,
            textAlign: 'center',
          }}
        >
          {day}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  numberLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
});
