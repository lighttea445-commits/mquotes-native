import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { FONTS } from '../../constants/fonts';

interface StreakFlameProps {
  /** The streak count shown inside the flame. */
  day: number;
  /** Height of the flame. Width follows the artwork's aspect ratio. */
  size?: number;
  color?: string;
}

/**
 * Flame holding the streak count.
 *
 * The path is the supplied artwork verbatim, on its own 104x128 viewBox, so
 * the drawing is never re-proportioned. `size` sets the height and the width
 * follows the aspect ratio rather than forcing the flame into a square box.
 *
 * The numeral is a real `Text` layered over the drawing rather than SVG's own
 * text element, because react-native-svg does not reliably resolve custom font
 * families on Android.
 */
const VB_W = 104;
const VB_H = 128;
const ASPECT = VB_W / VB_H;
const STROKE = 6;

const FLAME =
  'M60 16C64 24 70 31 76 38C84 47 91 55 93 65C96 78 92 92 82 102C74 110 64 114 52 114' +
  'C40 114 30 110 22 102C12 92 8 78 11 65C13 55 18 47 23 40C26 36 30 38 32 44' +
  'C34 50 37 53 41 55C46 47 52 33 57 21C58 18 59 13 60 16Z';

/**
 * Vertical centre of the flame's belly as a fraction of the artwork's height.
 * The count sits here rather than in the middle of the box, which would put it
 * up in the taper.
 */
const BELLY = 0.64;

export function StreakFlame({ day, size = 64, color = '#B8975A' }: StreakFlameProps) {
  const width = Math.round(size * ASPECT);

  // The thick stroke leaves a narrow interior, so long streaks step down hard.
  const digits = String(day).length;
  const fontScale = digits >= 3 ? 0.15 : digits === 2 ? 0.2 : 0.26;
  const fontSize = Math.round(size * fontScale);

  return (
    <View style={{ width, height: size }}>
      <Svg width={width} height={size} viewBox={`0 0 ${VB_W} ${VB_H}`}>
        <Path
          d={FLAME}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Svg>

      {/* Centring inside a box padded from the top lands the count in the belly */}
      <View
        style={[styles.numberLayer, { paddingTop: size * (BELLY - 0.5) * 2 }]}
        pointerEvents="none"
      >
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
    justifyContent: 'center',
  },
});
