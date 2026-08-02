/**
 * App-wide geometry tokens.
 *
 * Generalises `components/onboarding/tokens.ts` (which stays as-is so the
 * onboarding flow keeps its own tuned values). Colors always come from the
 * active theme — the only constant here is the label color drawn on a gold
 * fill, which is the same across all 18 themes because every `goldButton`
 * is a light tone.
 */

/** Label/icon color drawn on top of a gold fill. */
export const ON_GOLD = '#1A1208';

/** Horizontal gutter used by every full-screen sheet. */
export const GUTTER = 20;

export const SPACE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const RADIUS = {
  /** Rows inside a grouped list. */
  row: 14,
  /** Cards and tiles. */
  card: 18,
  /** Large illustrated tiles. */
  tile: 22,
  /** Stadium — pills and primary CTAs. */
  pill: 99,
} as const;

/** Circular icon-button diameters. */
export const ICON_BTN = {
  sm: 36,
  md: 44,
  lg: 52,
} as const;

/** Standard touch expansion for small controls. */
export const HIT = { top: 10, bottom: 10, left: 10, right: 10 } as const;
