import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { OB } from './tokens';

interface Props {
  /** 0–100. Omit to hide the progress bar. */
  progress?: number;
  onBack?: () => void;
  onSkip?: () => void;
  title?: string;
}

/**
 * Progress bar + back + skip. Fixed-width side slots keep the title optically
 * centered whether or not back/skip are present.
 */
export function OnboardingHeader({ progress, onBack, onSkip, title }: Props) {
  const theme = useTheme();

  return (
    <View style={hdr.wrap}>
      {progress !== undefined && (
        <View style={[hdr.track, { backgroundColor: theme.surface }]}>
          <View
            style={[
              hdr.fill,
              { width: `${Math.max(0, Math.min(progress, 100))}%`, backgroundColor: theme.gold },
            ]}
          />
        </View>
      )}

      <View style={hdr.row}>
        {onBack ? (
          <TouchableOpacity style={hdr.side} onPress={onBack} hitSlop={12}>
            <MaterialCommunityIcons name="chevron-left" size={20} color={theme.textMuted} />
            <Text style={[hdr.backText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              Back
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={hdr.side} />
        )}

        {title ? (
          <Text style={[hdr.title, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
            {title}
          </Text>
        ) : (
          <View />
        )}

        {onSkip ? (
          <TouchableOpacity style={hdr.side} onPress={onSkip} hitSlop={12}>
            <Text style={[hdr.skip, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              Skip
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={hdr.side} />
        )}
      </View>
    </View>
  );
}

const hdr = StyleSheet.create({
  wrap: { paddingHorizontal: OB.gutter, paddingTop: 16, paddingBottom: 8 },
  track: { height: 3, borderRadius: 2, marginBottom: 16, overflow: 'hidden' },
  fill: { height: 3, borderRadius: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
  },
  side: { flexDirection: 'row', alignItems: 'center', gap: 2, width: 60 },
  backText: { fontSize: 14 },
  title: { fontSize: 13, fontWeight: '500' },
  skip: { fontSize: 14, textAlign: 'right', width: 60 },
});
