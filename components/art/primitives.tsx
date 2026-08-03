import React from 'react';
import { Path } from 'react-native-svg';

/**
 * Shared line-art primitives.
 *
 * Everything in `art/` follows the house line-art idiom: single-weight strokes,
 * no fills, colour supplied by the caller from a theme token.
 */

/** Legacy viewBox-unit weight. Prefer `strokeFor` — see below. */
export const STROKE = 1.5;

/**
 * Rendered weight of a primary line, in real pixels.
 *
 * Strokes must be derived from the rendered size, not fixed in viewBox units.
 * A drawing on a 200 viewBox shown at 112px renders a 2.4-unit stroke at
 * 1.35px, while the same value at 250px renders 3px — so identical artwork
 * came out hairline in the Profile tiles and heavy in onboarding. Deriving it
 * keeps every piece optically equal wherever it appears.
 */
export const LINE_PX = 2.4;

/** Secondary detail lines sit lighter than the primary outline. */
export const DETAIL_RATIO = 0.62;

/**
 * Converts a rendered pixel weight into viewBox units for a given draw size.
 *
 *   strokeFor(112, 200)        -> primary, renders at LINE_PX
 *   strokeFor(112, 200, true)  -> detail, renders lighter
 */
export function strokeFor(size: number, viewBox: number, detail = false): number {
  const px = detail ? LINE_PX * DETAIL_RATIO : LINE_PX;
  return (px * viewBox) / size;
}

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
