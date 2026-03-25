import { ImageSourcePropType } from 'react-native';

export interface Theme {
  id: string;
  name: string;
  preview: string;
  // Colors
  background: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textMuted: string;
  accent: string;
  gold: string;
  goldButton: string;
  border: string;
  navBackground: string;
  // Typography
  quoteFontFamily: string;
  uiFontFamily: string;
  // Background image (null = solid color)
  backgroundImage: ImageSourcePropType | null;
  // Dark/light mode
  isDark: boolean;
}

export const THEMES: Theme[] = [
  // ── Default ───────────────────────────────────────────────────────────────
  {
    id: 'minimal',
    name: 'Minimal',
    preview: 'Warm Dark Gold',
    background: '#0D0D0D',
    surface: '#1C1A18',
    surfaceElevated: '#252220',
    text: '#E8E0D0',
    textMuted: '#6B6560',
    accent: '#B8975A',
    gold: '#B8975A',
    goldButton: '#C4A35A',
    border: '#2A2520',
    navBackground: '#1C1A18',
    quoteFontFamily: 'PlayfairDisplay_700Bold',
    uiFontFamily: 'Inter_400Regular',
    backgroundImage: null,
    isDark: true,
  },
  // ── Pink / pretty skies ──────────────────────────────────────────────────
  {
    id: 'rose-sky',
    name: 'Rose Sky',
    preview: 'Deep Rose Dark',
    background: '#140810',
    surface: '#1e1020',
    surfaceElevated: '#2a1530',
    text: '#fce4ec',
    textMuted: '#d080a8',
    accent: '#f06292',
    gold: '#e8a0c0',
    goldButton: '#f0b0d0',
    border: '#38163a',
    navBackground: '#190d1e',
    quoteFontFamily: 'PlayfairDisplay_400Regular_Italic',
    uiFontFamily: 'Inter_400Regular',
    backgroundImage: require('../assets/themes/sakura-bg.jpg'),
    isDark: true,
  },
  {
    id: 'dusk',
    name: 'Dusk',
    preview: 'Twilight Purple-Pink',
    background: '#0e0818',
    surface: '#180e28',
    surfaceElevated: '#221438',
    text: '#f0d8ff',
    textMuted: '#a870d0',
    accent: '#c050f0',
    gold: '#c090e0',
    goldButton: '#d0a0f0',
    border: '#2c1a42',
    navBackground: '#130b20',
    quoteFontFamily: 'PlayfairDisplay_400Regular_Italic',
    uiFontFamily: 'Inter_400Regular',
    backgroundImage: require('../assets/themes/lavender-bg.jpg'),
    isDark: true,
  },
  // ── Beach ────────────────────────────────────────────────────────────────
  {
    id: 'shore',
    name: 'Shore',
    preview: 'Rocky Coast at Dusk',
    background: '#0c1520',
    surface: '#141e2c',
    surfaceElevated: '#1c2a38',
    text: '#e8f4f8',
    textMuted: '#80a8c0',
    accent: '#40b8d8',
    gold: '#B8975A',
    goldButton: '#C4A35A',
    border: '#1a2a38',
    navBackground: '#0e1828',
    quoteFontFamily: 'PlayfairDisplay_400Regular',
    uiFontFamily: 'Inter_400Regular',
    backgroundImage: require('../assets/themes/shore-bg.jpg'),
    isDark: true,
  },
  // ── High energy ───────────────────────────────────────────────────────────
  {
    id: 'ember',
    name: 'Ember',
    preview: 'Fiery Orange',
    background: '#120400',
    surface: '#1e0800',
    surfaceElevated: '#2c1000',
    text: '#ffe8d0',
    textMuted: '#ff9060',
    accent: '#ff5500',
    gold: '#ff9040',
    goldButton: '#ffaa50',
    border: '#361200',
    navBackground: '#180600',
    quoteFontFamily: 'PlayfairDisplay_700Bold',
    uiFontFamily: 'Inter_600SemiBold',
    backgroundImage: require('../assets/themes/sunset-bg.jpg'),
    isDark: true,
  },
];

export const DEFAULT_THEME_ID = 'minimal';

export function getTheme(id: string): Theme {
  return THEMES.find(t => t.id === id) ?? THEMES[0];
}
