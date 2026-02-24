import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface GoldButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function GoldButton({ label, onPress, disabled, loading, style }: GoldButtonProps) {
  const theme = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: disabled ? theme.gold + '66' : theme.goldButton },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color="#1A1208" size="small" />
      ) : (
        <Text style={[styles.label, { fontFamily: theme.uiFontFamily }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  label: {
    color: '#1A1208',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
