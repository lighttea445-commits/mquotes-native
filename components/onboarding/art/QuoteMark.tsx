import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface Props {
  /** Width in px. Height follows the glyph's own aspect. */
  width?: number;
  color: string;
}

/**
 * Left double quotation mark, U+201C, as vector outlines.
 *
 * These are the real Playfair Display 700 curves, lifted from the TTF's glyf
 * table and normalised into a 100-unit box — not an approximation. A serif
 * quote drawn freehand never quite lands: the ball terminals and the taper
 * into the tail are where the eye catches an imitation.
 *
 * Being paths rather than <Text>, it renders identically whether or not the
 * font has finished loading, and stays crisp at any size.
 */
const ASPECT = 1.366; // width / height
const PATH =
  'M 24.41 86.61 Q 18.11 86.61, 13.39 84.12 Q 8.66 81.63, 5.77 77.43 Q 3.15 73.23, 1.57 67.45 ' +
  'Q 0.00 61.68, 0.00 55.38 Q 0.00 42.52, 6.69 31.23 Q 13.39 19.95, 27.56 13.39 L 29.92 18.11 ' +
  'Q 22.57 21.52, 16.93 27.95 Q 11.29 34.38, 10.24 41.47 Q 8.66 46.98, 9.97 52.23 ' +
  'Q 15.75 45.93, 25.46 45.93 Q 34.38 45.93, 40.16 51.31 Q 45.93 56.69, 45.93 66.14 ' +
  'Q 45.93 75.33, 39.90 80.97 Q 33.86 86.61, 24.41 86.61 Z ' +
  'M 78.48 86.61 Q 72.18 86.61, 67.45 84.12 Q 62.73 81.63, 59.84 77.43 Q 57.22 73.23, 55.64 67.45 ' +
  'Q 54.07 61.68, 54.07 55.38 Q 54.07 42.52, 60.76 31.23 Q 67.45 19.95, 81.63 13.39 L 83.99 18.11 ' +
  'Q 76.64 21.52, 71.00 27.95 Q 65.35 34.38, 64.30 41.47 Q 62.73 46.98, 64.04 52.23 ' +
  'Q 69.82 45.93, 79.53 45.93 Q 88.45 45.93, 94.23 51.31 Q 100.00 56.69, 100.00 66.14 ' +
  'Q 100.00 75.33, 93.96 80.97 Q 87.93 86.61, 78.48 86.61 Z';

export function QuoteMark({ width = 64, color }: Props) {
  return (
    <Svg width={width} height={width / ASPECT} viewBox="0 0 100 73.2">
      {/* The glyph sits centred in a 100-unit square; crop to its own height. */}
      <Path d={PATH} fill={color} transform="translate(0, -13.4)" />
    </Svg>
  );
}
