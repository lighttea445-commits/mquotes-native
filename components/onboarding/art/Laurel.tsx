import React from 'react';
import Svg, { G, Path } from 'react-native-svg';
import { Leaf, STROKE } from './primitives';

interface Props {
  size?: number;
  color: string;
  /** 'left' opens to the right; 'right' is the mirror. */
  side?: 'left' | 'right';
}

const VB_W = 46;
const VB_H = 64;

/**
 * Leaves placed along the stem, from base to tip.
 *
 * Hand-placed rather than sampled off the bezier — a wreath reads better when
 * the leaves fan slightly irregularly, and evenly-spaced normals look
 * mechanical at this size.
 */
const LEAVES: { x: number; y: number; rotate: number; length: number }[] = [
  // Outer edge, sweeping up
  { x: 30, y: 55, rotate: -128, length: 15 },
  { x: 24, y: 45, rotate: -138, length: 16 },
  { x: 19, y: 34, rotate: -148, length: 15 },
  { x: 16, y: 23, rotate: -160, length: 13 },
  { x: 15, y: 13, rotate: -172, length: 11 },
  // Inner edge, shorter
  { x: 31, y: 54, rotate: -62, length: 12 },
  { x: 25, y: 44, rotate: -50, length: 13 },
  { x: 20, y: 33, rotate: -38, length: 12 },
  { x: 17, y: 22, rotate: -26, length: 10 },
];

/** Laurel branch flanking the social-proof stat on the splash screen. */
export function Laurel({ size = 56, color, side = 'left' }: Props) {
  const w = size * (VB_W / VB_H);

  return (
    <Svg width={w} height={size} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      <G
        transform={side === 'right' ? `translate(${VB_W}, 0) scale(-1, 1)` : undefined}
      >
        {/* Stem */}
        <Path
          d="M 36 62 C 22 52, 14 36, 15 8"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
        />
        {LEAVES.map((l, i) => (
          <Leaf key={i} {...l} color={color} />
        ))}
      </G>
    </Svg>
  );
}
