import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Sparkle } from './primitives';

interface Props {
  size?: number;
  color: string;
  /** Your mark, centred inside the square. */
  children?: React.ReactNode;
}

const VB = 120;

/** Half-width of the square. Leaves room for the sparkles outside it. */
const R = 42;
/**
 * Squareness of the superellipse. 4.5 matches the reference mark's proportions
 * — straight sides with generously rounded corners.
 */
const EXPONENT = 4.5;

/**
 * Traces a superellipse — |x/a|^n + |y/a|^n = 1 — as a dense polyline.
 *
 * A rounded rect is an arc butted onto a straight edge, and the curvature jump
 * at that join is what makes it read as a box with clipped corners. A
 * superellipse is continuous the whole way round, which is why app icons use
 * one. At 120 segments the segmentation is well under a pixel at any size this
 * renders at.
 */
function superellipsePath(cx: number, cy: number, r: number, n: number, steps = 120): string {
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const x = cx + r * Math.sign(c) * Math.abs(c) ** (2 / n);
    const y = cy + r * Math.sign(s) * Math.abs(s) ** (2 / n);
    pts.push(`${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return `M ${pts[0]} L ${pts.slice(1).join(' L ')} Z`;
}

/**
 * The app square — icon frame with a large sparkle off the top-left corner and
 * a small one off the right edge, matching the reference mark.
 *
 * Deliberately axis-aligned. The reference is drawn on a slight rotation; that
 * tilt is the main thing making it read as a sketch rather than a mark, so it
 * is not reproduced here.
 */
export function AppMark({ size = 150, color, children }: Props) {
  const square = useMemo(() => superellipsePath(VB / 2, VB / 2, R, EXPONENT), []);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`} style={StyleSheet.absoluteFill}>
        <Path d={square} stroke={color} strokeWidth={2.6} fill="none" strokeLinejoin="round" />
        {/* Off the top-left corner, and off the right edge below centre */}
        <Sparkle x={9} y={25} r={9} color={color} />
        <Sparkle x={112} y={62} r={5} color={color} opacity={0.9} />
      </Svg>

      <View style={mark.inner} pointerEvents="none">
        {children}
      </View>
    </View>
  );
}

const mark = StyleSheet.create({
  inner: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    // Keeps the mark clear of the drawn border on all four sides.
    padding: '27%',
  },
});
