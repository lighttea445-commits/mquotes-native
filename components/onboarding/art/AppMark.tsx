import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Sparkle, STROKE } from './primitives';

interface Props {
  size?: number;
  color: string;
  /** Your mark, centred inside the square. */
  children?: React.ReactNode;
}

const VB = 120;
/** Squareness of the superellipse. 4 is soft, 5 matches an iOS app icon, 8 is nearly a square. */
const EXPONENT = 5;

/**
 * Traces a superellipse — |x/a|^n + |y/a|^n = 1 — as a dense polyline.
 *
 * A rounded rect is an arc butted onto a straight edge, and the curvature jump
 * at that join is exactly what makes it read as a box with clipped corners. A
 * superellipse has continuous curvature the whole way round, which is why app
 * icons use one. At 120 segments the segmentation is well below a pixel at any
 * size this renders at.
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
 * The app square — a drawn icon frame with sparkles, for the splash.
 *
 * Two concentric superellipses rather than one: the hairline inset reads as
 * deliberate draughtsmanship and gives the mark depth that a single outline
 * doesn't have.
 */
export function AppMark({ size = 150, color, children }: Props) {
  const outer = useMemo(() => superellipsePath(VB / 2, VB / 2, 48, EXPONENT), []);
  const inner = useMemo(() => superellipsePath(VB / 2, VB / 2, 42, EXPONENT), []);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`} style={StyleSheet.absoluteFill}>
        <Path d={outer} stroke={color} strokeWidth={STROKE * 1.6} fill="none" strokeLinejoin="round" />
        <Path d={inner} stroke={color} strokeWidth={STROKE * 0.7} fill="none" opacity={0.4} />
        <Sparkle x={11} y={26} r={7.5} color={color} />
        <Sparkle x={110} y={49} r={5} color={color} opacity={0.85} />
        <Sparkle x={99} y={104} r={3.5} color={color} opacity={0.6} />
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
    // Keeps the mark inside the inner hairline on all four sides.
    padding: '25%',
  },
});
