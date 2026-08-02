import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { SPACE } from './tokens';

/**
 * The small uppercase label that sits above a grouped list
 * (PREMIUM, MAKE IT YOURS, ACCOUNT, …).
 */
export function SectionLabel({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <Text style={[styles.label, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
      {children.toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    letterSpacing: 1.2,
    fontWeight: '600',
    marginBottom: SPACE.sm,
  },
});
