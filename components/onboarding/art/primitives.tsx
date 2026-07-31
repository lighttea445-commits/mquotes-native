import React from 'react';
import { G, Path } from 'react-native-svg';

/**
 * Shared line-art primitives.
 *
 * Everything in `art/` follows the SunIcon idiom: single-weight strokes, no
 * fills, colour supplied by the caller from a theme token. Stroke widths are
 * expressed in the drawing's own viewBox units so they scale with `size`.
 */

/** Default stroke weight, matching SunIcon. */
export const STROKE = 1.5;

interface SparkleProps {
  x: number;
  y: number;
  /** Radius of the long axis, in viewBox units. */
  r?: number;
  color: string;
  opacity?: number;
}

/**
 * Four-point star with concave edges — the twinkle used throughout the
 * reference art. Filled rather than stroked; at this size an outline reads as
 * mush.
 */
export function Sparkle({ x, y, r = 6, color, opacity = 1 }: SparkleProps) {
  const w = r * 0.17; // waist — how far the curve pulls toward the centre
  return (
    <Path
      d={`M ${x} ${y - r}
          Q ${x + w} ${y - w}, ${x + r} ${y}
          Q ${x + w} ${y + w}, ${x} ${y + r}
          Q ${x - w} ${y + w}, ${x - r} ${y}
          Q ${x - w} ${y - w}, ${x} ${y - r} Z`}
      fill={color}
      opacity={opacity}
    />
  );
}

interface LeafProps {
  x: number;
  y: number;
  rotate: number;
  /** Length along the leaf's long axis, in viewBox units. */
  length?: number;
  color: string;
  strokeWidth?: number;
}

/** Single pointed leaf, drawn from its stem end. */
export function Leaf({ x, y, rotate, length = 14, color, strokeWidth = STROKE }: LeafProps) {
  const l = length;
  const w = l * 0.42;
  return (
    <G transform={`translate(${x}, ${y}) rotate(${rotate})`}>
      <Path
        d={`M 0 0 C ${l * 0.35} ${-w}, ${l * 0.85} ${-w * 0.75}, ${l} 0
            C ${l * 0.85} ${w * 0.75}, ${l * 0.35} ${w}, 0 0 Z`}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        fill="none"
      />
    </G>
  );
}
