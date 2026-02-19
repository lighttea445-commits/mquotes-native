import React from 'react';
import { View, ImageBackground, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface ThemeBackgroundProps {
  children: React.ReactNode;
  style?: object;
}

export function ThemeBackground({ children, style }: ThemeBackgroundProps) {
  const theme = useTheme();

  if (theme.backgroundImage) {
    return (
      <ImageBackground
        source={theme.backgroundImage}
        style={[styles.container, style]}
        resizeMode="cover"
      >
        {/* Dark overlay for readability */}
        <View style={[styles.overlay, { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.15)' }]} />
        {children}
      </ImageBackground>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
