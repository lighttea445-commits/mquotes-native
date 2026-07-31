import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Sparkle, STROKE } from './primitives';

interface Props {
  size?: number;
  color: string;
  /** Your mark. Sized to ~58% of the frame and centred inside it. */
  children?: React.ReactNode;
}

const VB = 100;

/**
 * Hand-drawn rounded-square frame with sparkles at the top-left and
 * mid-right, matching the reference splash.
 *
 * The frame is deliberately imperfect — the corner radii differ slightly and
 * the edges bow, so it reads as drawn rather than as a CSS border. Drop the
 * logo in as `children`.
 */
export function LogoFrame({ size = 132, color, children }: Props) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`} style={StyleSheet.absoluteFill}>
        {/* Frame — each side bows a little, corners are uneven on purpose */}
        <Path
          d="M 30 12
             C 18 13, 12 20, 11 32
             L 11 68
             C 12 81, 19 88, 32 89
             L 69 89
             C 81 88, 88 80, 89 68
             L 89 31
             C 88 19, 80 12, 68 11
             Z"
          stroke={color}
          strokeWidth={STROKE * 1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Sparkle x={6} y={22} r={7} color={color} />
        <Sparkle x={96} y={46} r={4.5} color={color} opacity={0.85} />
      </Svg>

      <View style={frame.inner} pointerEvents="none">
        {children}
      </View>
    </View>
  );
}

const frame = StyleSheet.create({
  inner: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    // Keeps the mark clear of the drawn border on all four sides.
    padding: '21%',
  },
});
