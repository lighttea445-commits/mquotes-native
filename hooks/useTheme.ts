import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getTheme, Theme } from '../constants/themes';

export function useTheme(): Theme {
  const themeId = useAppStore((state) => state.preferences.theme);
  return useMemo(() => getTheme(themeId), [themeId]);
}

/**
 * Currently identical to `useTheme`. Kept as its own hook because the share
 * surfaces must render the selected theme regardless of any app-level
 * appearance override — light mode was removed, and if it returns this is the
 * call site that stays on the raw theme.
 */
export function useBaseTheme(): Theme {
  return useTheme();
}
