import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from '../ui/Icon';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { OB, ON_GOLD } from './tokens';

export interface OnboardingOption {
  value: string;
  label: string;
  /** Icon name, drawn left of the label. */
  icon?: string;
}

type Props = { options: OnboardingOption[] } & (
  | { mode: 'single'; value?: string; onChange: (v: string) => void }
  | { mode: 'multi'; value: string[]; onChange: (v: string[]) => void }
);

/**
 * Stadium option rows with the selection indicator on the right.
 *
 * Selected rows fill with `goldButton`, so their label and indicator flip to
 * ON_GOLD — a gold-on-gold indicator would be invisible.
 *
 * Renders rows only. The caller owns scrolling and the Continue button, and
 * every question screen has one — selecting never advances on its own, so the
 * user always sees their choice register before moving on.
 */
export function OptionList(props: Props) {
  const { options, mode } = props;
  const theme = useTheme();
  const haptics = useHaptics();

  const isSelected = useCallback(
    (v: string) => (mode === 'single' ? props.value === v : props.value.includes(v)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, props.value],
  );

  const toggle = useCallback(
    (v: string) => {
      haptics.selection();
      if (props.mode === 'single') {
        props.onChange(v);
        return;
      }
      const next = props.value.includes(v)
        ? props.value.filter((x) => x !== v)
        : [...props.value, v];
      props.onChange(next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.mode, props.value, props.onChange, haptics],
  );

  return (
    <View style={ol.list}>
      {options.map((opt) => {
        const sel = isSelected(opt.value);
        return (
          <TouchableOpacity
            key={opt.value}
            activeOpacity={0.85}
            onPress={() => toggle(opt.value)}
            accessibilityRole={mode === 'single' ? 'radio' : 'checkbox'}
            accessibilityState={{ selected: sel, checked: sel }}
            accessibilityLabel={opt.label}
            style={[
              ol.row,
              {
                backgroundColor: sel ? theme.goldButton : theme.surface,
                borderColor: sel ? theme.gold : theme.border,
              },
            ]}
          >
            {opt.icon ? (
              <Icon
                name={opt.icon as any}
                size={22}
                color={sel ? ON_GOLD : theme.textMuted}
                style={ol.icon}
              />
            ) : null}

            <Text
              numberOfLines={2}
              style={[
                ol.label,
                { color: sel ? ON_GOLD : theme.textMuted, fontFamily: theme.uiFontFamily },
              ]}
            >
              {opt.label}
            </Text>

            <View
              style={[
                ol.indicator,
                {
                  borderColor: sel ? ON_GOLD : theme.textMuted,
                  backgroundColor: sel ? ON_GOLD : 'transparent',
                },
              ]}
            >
              {sel && (
                <Icon
                  name={mode === 'multi' ? 'check' : 'circle'}
                  size={mode === 'multi' ? 16 : 10}
                  color={theme.goldButton}
                />
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const ol = StyleSheet.create({
  list: { gap: OB.optionGap },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: OB.pill,
    borderWidth: 1,
    paddingLeft: 24,
    paddingRight: 20,
    paddingVertical: 18,
    minHeight: 62,
  },
  icon: { marginRight: 12 },
  label: { flex: 1, fontSize: 15, lineHeight: 20 },
  indicator: {
    width: OB.indicator,
    height: OB.indicator,
    borderRadius: OB.indicator / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
});
