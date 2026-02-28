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
  {
    id: 'tide',
    name: 'Tide',
    preview: 'Deep Ocean Teal',
    background: '#041820',
    surface: '#072530',
    surfaceElevated: '#0d303e',
    text: '#c8f0ee',
    textMuted: '#50a8b0',
    accent: '#00c8be',
    gold: '#70d8c8',
    goldButton: '#80e8d8',
    border: '#0a3040',
    navBackground: '#051d28',
    quoteFontFamily: 'PlayfairDisplay_400Regular',
    uiFontFamily: 'Inter_400Regular',
    backgroundImage: require('../assets/themes/deep-waves-bg.jpg'),
    isDark: true,
  },
  // ── Moon / night ─────────────────────────────────────────────────────────
  {
    id: 'moonrise',
    name: 'Moonrise',
    preview: 'Full Moon Over Mountains',
    background: '#05081a',
    surface: '#0b1028',
    surfaceElevated: '#131838',
    text: '#d8e0ff',
    textMuted: '#6070c0',
    accent: '#8090f8',
    gold: '#a0b0ff',
    goldButton: '#b0c0ff',
    border: '#181e3a',
    navBackground: '#080f20',
    quoteFontFamily: 'PlayfairDisplay_400Regular_Italic',
    uiFontFamily: 'Inter_400Regular',
    backgroundImage: require('../assets/themes/moonrise-bg.jpg'),
    isDark: true,
  },
  {
    id: 'starfield',
    name: 'Starfield',
    preview: 'Milky Way Night Sky',
    background: '#050508',
    surface: '#0c0c14',
    surfaceElevated: '#141420',
    text: '#e0e8ff',
    textMuted: '#4858a8',
    accent: '#5868ff',
    gold: '#8090e0',
    goldButton: '#90a0f0',
    border: '#181820',
    navBackground: '#08081a',
    quoteFontFamily: 'PlayfairDisplay_700Bold',
    uiFontFamily: 'Inter_400Regular',
    backgroundImage: require('../assets/themes/starfield-bg.jpg'),
    isDark: true,
  },
  // ── Warm neutrals ─────────────────────────────────────────────────────────
  {
    id: 'sand',
    name: 'Sand',
    preview: 'Desert at Sunset',
    background: '#1a1000',
    surface: '#261800',
    surfaceElevated: '#341e00',
    text: '#ffe8c0',
    textMuted: '#c08840',
    accent: '#e8901e',
    gold: '#B8975A',
    goldButton: '#C4A35A',
    border: '#3a2200',
    navBackground: '#1e1400',
    quoteFontFamily: 'PlayfairDisplay_700Bold',
    uiFontFamily: 'Inter_500Medium',
    backgroundImage: require('../assets/themes/sand-bg.jpg'),
    isDark: true,
  },
  // ── True darks ────────────────────────────────────────────────────────────
  {
    id: 'ink',
    name: 'Ink',
    preview: 'Warm Near-Black',
    background: '#0e0a06',
    surface: '#181208',
    surfaceElevated: '#22180e',
    text: '#f0e8d8',
    textMuted: '#6a5840',
    accent: '#c09060',
    gold: '#B8975A',
    goldButton: '#C4A35A',
    border: '#2a2010',
    navBackground: '#140e08',
    quoteFontFamily: 'PlayfairDisplay_700Bold',
    uiFontFamily: 'Inter_500Medium',
    backgroundImage: require('../assets/themes/coffee-bg.jpg'),
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
  // ── Calm focus ────────────────────────────────────────────────────────────
  {
    id: 'storm',
    name: 'Storm',
    preview: 'Dark Steel Blue',
    background: '#080d14',
    surface: '#101620',
    surfaceElevated: '#18202e',
    text: '#c8d8f0',
    textMuted: '#5070a0',
    accent: '#3880d0',
    gold: '#5898d8',
    goldButton: '#70a8e8',
    border: '#1a2535',
    navBackground: '#0c1318',
    quoteFontFamily: 'PlayfairDisplay_400Regular',
    uiFontFamily: 'Inter_400Regular',
    backgroundImage: require('../assets/themes/aurora-bg.jpg'),
    isDark: true,
  },
  {
    id: 'sage',
    name: 'Sage',
    preview: 'Dark Forest Green',
    background: '#080f0a',
    surface: '#101810',
    surfaceElevated: '#182018',
    text: '#d0e8d8',
    textMuted: '#4a8860',
    accent: '#28b858',
    gold: '#60c880',
    goldButton: '#70d890',
    border: '#1a2a1c',
    navBackground: '#0c1410',
    quoteFontFamily: 'PlayfairDisplay_400Regular',
    uiFontFamily: 'Inter_400Regular',
    backgroundImage: require('../assets/themes/forest-bg.jpg'),
    isDark: true,
  },
];

export const DEFAULT_THEME_ID = 'minimal';

export function getTheme(id: string): Theme {
  return THEMES.find(t => t.id === id) ?? THEMES[0];
}
