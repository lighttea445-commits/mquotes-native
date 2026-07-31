import React from 'react';
import { Path } from 'react-native-svg';

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

