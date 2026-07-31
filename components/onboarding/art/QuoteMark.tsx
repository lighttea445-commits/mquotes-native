import React from 'react';
import Svg, { G, Path } from 'react-native-svg';
import { Sparkle } from './primitives';

/**
 * Left double quotation mark, U+201C, as vector outlines.
 *
 * These are real curves lifted from each font's `glyf` table and normalised to
 * a 100-unit box — not approximations. A serif quote drawn freehand never
 * quite lands: the ball terminals and the taper into the tail are where the
 * eye catches an imitation.
 *
 * As paths rather than <Text> they render identically whether or not the font
 * has finished loading, and stay crisp at any size.
 *
 * `path` spans x 0–100; `top`/`bottom` are the glyph's own vertical extent
 * within that box, so it can be cropped to its true height.
 */
interface Glyph {
  path: string;
  aspect: number;
  top: number;
}

const GLYPHS: Record<string, Glyph> = {
  /** DM Serif Display Italic — highest contrast, calligraphic slant. */
  dmSerifItalic: {
    aspect: 1.333,
    top: 12.5,
    path:
      'M 20.33 87.50 Q 11.26 87.50, 5.63 81.46 Q -0.00 75.41, -0.00 65.25 Q -0.00 47.39, 11.95 34.20 ' +
      'Q 23.90 21.02, 40.66 12.50 L 43.41 17.17 Q 36.54 21.57, 30.63 28.43 Q 24.73 35.30, 21.43 43.27 ' +
      'L 29.12 49.04 Q 33.79 52.06, 36.81 57.14 Q 39.84 62.23, 39.84 66.90 Q 39.84 75.69, 34.48 81.59 ' +
      'Q 29.12 87.50, 20.33 87.50 Z ' +
      'M 76.92 87.50 Q 67.86 87.50, 62.23 81.46 Q 56.59 75.41, 56.59 65.25 Q 56.59 47.39, 68.54 34.20 ' +
      'Q 80.49 21.02, 97.25 12.50 L 100.00 17.17 Q 93.13 21.57, 87.23 28.43 Q 81.32 35.30, 78.02 43.27 ' +
      'L 85.71 49.04 Q 90.38 52.06, 93.41 57.14 Q 96.43 62.23, 96.43 66.90 Q 96.43 75.69, 91.07 81.59 ' +
      'Q 85.71 87.50, 76.92 87.50 Z',
  },

  /** EB Garamond Bold — old-style, the most ornate of the three. */
  garamond: {
    aspect: 1.394,
    top: 14.14,
    path:
      'M 93.43 14.14 Q 100.00 14.14, 100.00 18.18 Q 100.00 19.95, 98.48 20.71 Q 96.97 21.46, 94.44 22.22 ' +
      'Q 87.88 23.74, 82.83 26.89 Q 77.78 30.05, 75.13 34.47 Q 72.47 38.89, 72.47 44.44 Q 72.47 48.99, 75.76 51.77 ' +
      'Q 79.04 54.55, 83.08 55.56 Q 87.63 56.82, 90.78 60.48 Q 93.94 64.14, 93.94 70.20 Q 93.94 76.77, 88.51 81.31 ' +
      'Q 83.08 85.86, 76.26 85.86 Q 64.90 85.86, 57.83 78.41 Q 50.76 70.96, 50.76 59.60 Q 50.76 49.49, 54.55 41.16 ' +
      'Q 58.33 32.83, 64.52 26.77 Q 70.71 20.71, 78.28 17.42 Q 85.86 14.14, 93.43 14.14 Z ' +
      'M 42.93 14.14 Q 49.24 14.14, 49.24 18.18 Q 49.24 19.95, 47.73 20.71 Q 46.21 21.46, 43.69 22.22 ' +
      'Q 37.12 23.74, 32.20 26.89 Q 27.27 30.05, 24.62 34.47 Q 21.97 38.89, 21.97 44.44 Q 21.97 48.99, 25.13 51.77 ' +
      'Q 28.28 54.55, 32.32 55.56 Q 36.87 56.82, 40.03 60.48 Q 43.18 64.14, 43.18 70.20 Q 43.18 76.77, 37.75 81.31 ' +
      'Q 32.32 85.86, 25.51 85.86 Q 14.14 85.86, 7.07 78.41 Q 0.00 70.96, 0.00 59.60 Q 0.00 49.49, 3.79 41.16 ' +
      'Q 7.58 32.83, 13.89 26.77 Q 20.20 20.71, 27.65 17.42 Q 35.10 14.14, 42.93 14.14 Z',
  },

  /** Playfair Display Bold — matches the app's heading face. */
  playfair: {
    aspect: 1.366,
    top: 13.39,
    path:
      'M 24.41 86.61 Q 18.11 86.61, 13.39 84.12 Q 8.66 81.63, 5.77 77.43 Q 3.15 73.23, 1.57 67.45 ' +
      'Q 0.00 61.68, 0.00 55.38 Q 0.00 42.52, 6.69 31.23 Q 13.39 19.95, 27.56 13.39 L 29.92 18.11 ' +
      'Q 22.57 21.52, 16.93 27.95 Q 11.29 34.38, 10.24 41.47 Q 8.66 46.98, 9.97 52.23 ' +
      'Q 15.75 45.93, 25.46 45.93 Q 34.38 45.93, 40.16 51.31 Q 45.93 56.69, 45.93 66.14 ' +
      'Q 45.93 75.33, 39.90 80.97 Q 33.86 86.61, 24.41 86.61 Z ' +
      'M 78.48 86.61 Q 72.18 86.61, 67.45 84.12 Q 62.73 81.63, 59.84 77.43 Q 57.22 73.23, 55.64 67.45 ' +
      'Q 54.07 61.68, 54.07 55.38 Q 54.07 42.52, 60.76 31.23 Q 67.45 19.95, 81.63 13.39 L 83.99 18.11 ' +
      'Q 76.64 21.52, 71.00 27.95 Q 65.35 34.38, 64.30 41.47 Q 62.73 46.98, 64.04 52.23 ' +
      'Q 69.82 45.93, 79.53 45.93 Q 88.45 45.93, 94.23 51.31 Q 100.00 56.69, 100.00 66.14 ' +
      'Q 100.00 75.33, 93.96 80.97 Q 87.93 86.61, 78.48 86.61 Z',
  },
};

/** Which face the mark uses. Swap for any key in GLYPHS. */
const FACE: keyof typeof GLYPHS = 'dmSerifItalic';

interface Props {
  /** Width of the glyph itself, in px. */
  width?: number;
  color: string;
}

/** The quote glyph alone, cropped to its own bounds. */
export function QuoteMark({ width = 64, color }: Props) {
  const g = GLYPHS[FACE];
  const h = 100 / g.aspect;
  return (
    <Svg width={width} height={width / g.aspect} viewBox={`0 0 100 ${h.toFixed(2)}`}>
      <Path d={g.path} fill={color} transform={`translate(0, ${-g.top})`} />
    </Svg>
  );
}

// ─── Hero ───────────────────────────────────────────────────────────────────

const VB_W = 200;
const VB_H = 150;
/** Glyph width within the viewBox, leaving room for the sparkles. */
const GLYPH_W = 140;

/**
 * Splash hero: the quote mark at size with sparkles around it.
 *
 * No frame — the glyph carries it alone, so the sparkles sit against the
 * negative space rather than a box edge.
 */
export function QuoteHero({ width = 260, color }: { width?: number; color: string }) {
  const g = GLYPHS[FACE];
  const scale = GLYPH_W / 100;
  const glyphH = (100 / g.aspect) * scale;
  const tx = (VB_W - GLYPH_W) / 2;
  const ty = (VB_H - glyphH) / 2 - g.top * scale;

  return (
    <Svg width={width} height={width * (VB_H / VB_W)} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      <G transform={`translate(${tx}, ${ty.toFixed(2)}) scale(${scale})`}>
        <Path d={g.path} fill={color} />
      </G>
      <Sparkle x={16} y={34} r={12} color={color} />
      <Sparkle x={184} y={74} r={6.5} color={color} opacity={0.9} />
      <Sparkle x={26} y={120} r={4.5} color={color} opacity={0.65} />
    </Svg>
  );
}
