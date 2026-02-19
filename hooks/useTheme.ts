import { useAppStore } from '../store/useAppStore';
import { getTheme, Theme } from '../constants/themes';

export function useTheme(): Theme {
  const themeId = useAppStore((state) => state.preferences.theme);
  return getTheme(themeId);
}
