import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../../constants/themes';
import { useTheme } from '../../hooks/useTheme';
import { OB } from './tokens';

const { width: SW } = Dimensions.get('window');
const GAP = 10;
const COLS = 3;
export const CARD_W = (SW - OB.gutter * 2 - GAP * (COLS - 1)) / COLS;
export const CARD_H = CARD_W * 1.5;

interface Props {
  themes: Theme[];
  selectedId: string;
  onSelect: (id: string) => void;
}

/**
 * 2:3 theme cards in a 3-column grid.
 *
 * Card geometry mirrors `ThemesScreen` so onboarding and the in-app picker
 * read as the same control. Extracted here because `ThemesScreen`'s grid is
 * welded to its header and Pro-gating.
 */
export function ThemeGrid({ themes, selectedId, onSelect }: Props) {
  const active = useTheme();

  return (
    <View style={tg.grid}>
      {themes.map((t) => {
        const selected = t.id === selectedId;
        const card = (
          <>
            <Text style={[tg.glyph, { color: t.text, fontFamily: t.quoteFontFamily }]}>Aa</Text>
            {selected && (
              <View style={[tg.check, { backgroundColor: active.gold }]}>
                <MaterialCommunityIcons name="check" size={14} color={t.background} />
              </View>
            )}
          </>
        );

        return (
          <TouchableOpacity
            key={t.id}
            activeOpacity={0.85}
            onPress={() => onSelect(t.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={t.name}
            style={[
              tg.card,
              {
                backgroundColor: t.background,
                borderColor: selected ? active.gold : active.border,
                borderWidth: selected ? 2 : 1,
              },
            ]}
          >
            {t.backgroundImage ? (
              <ImageBackground
                source={t.backgroundImage}
                style={tg.fill}
                imageStyle={tg.fillRadius}
                resizeMode="cover"
              >
                <View style={tg.scrim} />
                {card}
              </ImageBackground>
            ) : (
              <View style={tg.fill}>{card}</View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tg = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  card: { width: CARD_W, height: CARD_H, borderRadius: 16, overflow: 'hidden' },
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fillRadius: { borderRadius: 14 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.28)' },
  glyph: { fontSize: 26 },
  check: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
