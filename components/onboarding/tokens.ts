/**
 * Shared geometry + non-theme colors for the onboarding flow.
 *
 * Every color that can come from the active theme does — these are only the
 * values with no theme equivalent (label color on top of a gold fill, which is
 * constant across all 18 themes because every `goldButton` is a light tone).
 */

/** Label/icon color drawn on top of a gold fill. Matches ContinueButton. */
export const ON_GOLD = '#1A1208';

export const OB = {
  /** Horizontal gutter used by every onboarding screen. */
  gutter: 24,
  /** Stadium radius for option rows and CTAs. */
  pill: 99,
  /** Vertical gap between option rows. */
  optionGap: 14,
  /** Selection indicator (radio / checkbox) diameter. */
  indicator: 26,
} as const;
