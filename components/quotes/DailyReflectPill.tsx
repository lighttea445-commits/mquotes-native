import React, { useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { useRevenueCat } from '../../hooks/useRevenueCat';
import { useReflectStore, getMoodMeta } from '../../store/useReflectStore';
import { useModal } from '../../contexts/ModalContext';

export function DailyReflectPill() {
  const insets = useSafeAreaInsets();
  const BTN_BOTTOM = insets.bottom + 10;
  const theme = useTheme();
  const { isPro } = useRevenueCat();
  const modal = useModal();
  const refreshDailyQuote = useReflectStore(s => s.refreshDailyQuote);
  // Subscribe to reflections so the pill updates immediately after save
  const reflections = useReflectStore(s => s.reflections);
  const todayKey = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  })();
  const todaysReflection = reflections.find(r => r.dateKey === todayKey);
  const done = !!todaysReflection;
  const todayMeta = done ? getMoodMeta(todaysReflection!.mood) : null;

  useEffect(() => {
    refreshDailyQuote();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePress = () => {
    Haptics.selectionAsync();
    if (isPro) {
      modal?.openSheet('reflect');
    } else {
      modal?.openSheet('features');
    }
  };

  return (
    <View style={[styles.container, { bottom: BTN_BOTTOM }]} pointerEvents="box-none">
      <TouchableOpacity
        onPress={handlePress}
        style={[
          styles.pill,
          {
            backgroundColor: theme.surface,
            opacity: 1,
            borderWidth: done ? 0 : 1,
            borderColor: done ? 'transparent' : theme.gold + '73',
          },
        ]}
        activeOpacity={0.8}
        accessibilityLabel={done ? 'Reflected today' : "Today's Reflect - tap to write"}
      >
        <MaterialCommunityIcons
          name={done ? (todayMeta!.icon as any) : 'pencil-outline'}
          size={18}
          color={done ? todayMeta!.color : theme.gold}
        />
        <Text
          style={[
            styles.label,
            {
              color: theme.textMuted,
              fontFamily: theme.uiFontFamily,
            },
          ]}
        >
          {done ? 'Reflected' : 'Reflect'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    // bottom applied inline — matches floating button safe-area offset
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    height: 52,
    borderRadius: 26,
  },
  label: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
