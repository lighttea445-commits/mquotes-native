import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getTheme, Theme, DEFAULT_THEME_ID } from '../constants/themes';

const LIGHT_THEME: Theme = {
  id: '_light',
  name: 'Light',
  preview: 'Clean Light',
  background: '#F8F7F4',
  surface: '#EEECEA',
  surfaceElevated: '#E6E4E0',
  text: '#1A1816',
  textMuted: '#8A8580',
  accent: '#B8975A',
  gold: '#B8975A',
  goldButton: '#C4A35A',
  border: '#DEDAD6',
  navBackground: '#EEECEA',
  quoteFontFamily: 'PlayfairDisplay_700Bold',
  uiFontFamily: 'Inter_400Regular',
  backgroundImage: null,
  isDark: false,
};

/**
 * Light mode only replaces the default theme with a white palette.
 * Any explicitly selected theme is returned as-is regardless of light mode.
 */
export function useTheme(): Theme {
  const themeId = useAppStore((state) => state.preferences.theme);
  const lightMode = useAppStore((state) => state.preferences.lightMode);
  return useMemo(() => {
    if (lightMode && themeId === DEFAULT_THEME_ID) return LIGHT_THEME;
    return getTheme(themeId);
  }, [themeId, lightMode]);
}

/** Raw theme, never affected by light mode. Used in the themes picker. */
export function useBaseTheme(): Theme {
  const themeId = useAppStore((state) => state.preferences.theme);
  return useMemo(() => getTheme(themeId), [themeId]);
}
