import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { OB, ON_GOLD } from './tokens';

interface Props {
  onPress: () => void;
  label?: string;
  disabled?: boolean;
  variant?: 'gold' | 'muted' | 'ghost';
}

/**
 * Bottom CTA pill.
 *
 * `ghost` is the secondary action under a primary CTA ("I'm not ready yet",
 * "Remind me later") — text only, no fill.
 */
export function ContinueButton({ onPress, label = 'Continue', disabled = false, variant = 'gold' }: Props) {
  const theme = useTheme();

  if (variant === 'ghost') {
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled} style={cta.ghost} activeOpacity={0.7}>
        <Text style={[cta.ghostLabel, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  const bg = variant === 'gold' ? theme.gold : 'rgba(138,128,120,0.30)';
  const color = variant === 'gold' ? ON_GOLD : theme.text;

  return (
    <View style={cta.wrap}>
      <TouchableOpacity
        style={[cta.btn, { backgroundColor: bg, opacity: disabled ? 0.3 : 1 }]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.85}
      >
        <Text style={[cta.label, { color, fontFamily: theme.uiFontFamily }]}>{label}</Text>
      </TouchableOpacity>
    </View>
  );
}

const cta = StyleSheet.create({
  wrap: { paddingHorizontal: OB.gutter, paddingTop: 16, paddingBottom: 12 },
  btn: { borderRadius: OB.pill, paddingVertical: 18, alignItems: 'center' },
  label: { fontSize: 16, fontWeight: '600', letterSpacing: 0.2 },
  ghost: { paddingVertical: 14, alignItems: 'center' },
  ghostLabel: { fontSize: 15, fontWeight: '600' },
});
