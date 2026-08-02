import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from '../ui/Icon';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { OB, ON_GOLD } from './tokens';

export interface Chip {
  value: string;
  label: string;
}

interface Props {
  chips: Chip[];
  value: string[];
  onChange: (v: string[]) => void;
}

/**
 * Wrapping "+ Label" pills. The leading glyph flips from + to a check on
 * selection, so the affordance reads the same way before and after the tap.
 */
export function ChipGrid({ chips, value, onChange }: Props) {
  const theme = useTheme();
  const haptics = useHaptics();

  const toggle = useCallback(
    (v: string) => {
      haptics.selection();
      onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
    },
    [value, onChange, haptics],
  );

  return (
    <View style={cg.wrap}>
      {chips.map((chip) => {
        const sel = value.includes(chip.value);
        return (
          <TouchableOpacity
            key={chip.value}
            activeOpacity={0.85}
            onPress={() => toggle(chip.value)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: sel }}
            accessibilityLabel={chip.label}
            style={[
              cg.chip,
              {
                backgroundColor: sel ? theme.goldButton : theme.surface,
                borderColor: sel ? theme.gold : theme.border,
              },
            ]}
          >
            <Icon
              name={sel ? 'check' : 'plus'}
              size={16}
              color={sel ? ON_GOLD : theme.textMuted}
            />
            <Text
              style={[
                cg.label,
                {
                  color: sel ? ON_GOLD : theme.textMuted,
                  fontFamily: theme.uiFontFamily,
                  fontWeight: sel ? '600' : '400',
                },
              ]}
            >
              {chip.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const cg = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: OB.pill,
    borderWidth: 1,
  },
  label: { fontSize: 14 },
});
