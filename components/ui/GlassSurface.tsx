import React from 'react';
import { View, StyleProp, ViewStyle, ViewProps } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';

let cached: boolean | null = null;

/**
 * True only on iOS 26 and above.
 *
 * Resolved on first call rather than at module load, and guarded. The answer
 * cannot change while the app is running, so it is cached after the first
 * lookup.
 *
 * The laziness is deliberate. `isLiquidGlassAvailable()` reaches for a native
 * module, and this module is pulled in by `IconButton`, which sits near the
 * root of the import graph. Resolving at load time throws wherever the native
 * module is absent (Jest, and any build where the module failed to link),
 * taking the whole graph down before a single component renders.
 */
export function liquidGlassAvailable(): boolean {
  if (cached === null) {
    try {
      cached = isLiquidGlassAvailable();
    } catch {
      cached = false;
    }
  }
  return cached;
}

interface GlassSurfaceProps extends ViewProps {
  /**
   * Background used wherever real glass is unavailable: Android, and iOS below
   * 26. Pass the token the surface would otherwise have used, normally
   * `theme.surface`, so those platforms render exactly as they did before.
   */
  fallbackColor: string;
  /** Tints the glass. Keep this close to transparent; glass carries its own tone. */
  tintColor?: string;
  /**
   * Lets the glass respond to touch with the system's own highlight and
   * refraction. On for controls, off for static chrome.
   */
  isInteractive?: boolean;
  glassEffectStyle?: 'clear' | 'regular';
  /**
   * The app themes its own light and dark, so the glass is told which one it
   * sits in rather than reading the system appearance.
   */
  isDark?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * A surface that becomes real UIKit liquid glass on iOS 26 and stays a plain
 * filled `View` everywhere else.
 *
 * Every glass decision in the app funnels through here, so there is one place
 * that knows the availability rule and one place to change if the effect is
 * ever wanted somewhere new.
 *
 * Glass refracts whatever sits behind it. Over a flat `theme.background` there
 * is nothing to refract and the effect is close to invisible, so this is worth
 * placing only where content actually passes underneath.
 */
export function GlassSurface({
  fallbackColor,
  tintColor,
  isInteractive = true,
  glassEffectStyle = 'regular',
  isDark = true,
  style,
  children,
  ...rest
}: GlassSurfaceProps) {
  if (!liquidGlassAvailable()) {
    return (
      <View style={[style, { backgroundColor: fallbackColor }]} {...rest}>
        {children}
      </View>
    );
  }

  return (
    <GlassView
      style={style}
      glassEffectStyle={glassEffectStyle}
      isInteractive={isInteractive}
      tintColor={tintColor}
      colorScheme={isDark ? 'dark' : 'light'}
      {...rest}
    >
      {children}
    </GlassView>
  );
}
