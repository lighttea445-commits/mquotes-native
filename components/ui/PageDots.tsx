import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface PageDotsProps {
  count: number;
  activeIndex: number;
}

/** Pagination indicator for the widget carousel. Hidden when there's one page. */
export function PageDots({ count, activeIndex }: PageDotsProps) {
  const theme = useTheme();

  if (count < 2) return null;

  return (
    <View style={styles.row} accessibilityRole="tablist">
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: i === activeIndex ? theme.text : theme.textMuted,
              opacity: i === activeIndex ? 1 : 0.4,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
