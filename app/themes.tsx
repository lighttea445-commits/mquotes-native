import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useAppStore } from '../store/useAppStore';
import { THEMES } from '../constants/themes';

const { width } = Dimensions.get('window');
const SIDE_PADDING = 16;
const GAP = 8;
const CARD_WIDTH = (width - SIDE_PADDING * 2 - GAP * 2) / 3;
const CARD_HEIGHT = CARD_WIDTH * 1.5; // 2:3 portrait ratio

export default function ThemesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { preferences, setTheme } = useAppStore();

  const handleSelect = (themeId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTheme(themeId);
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Drag handle */}
      <View style={styles.dragHandle}>
        <View style={[styles.dragPill, { backgroundColor: theme.border }]} />
      </View>

      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {/* Header — close only */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <MaterialCommunityIcons name="close" size={20} color={theme.textMuted} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
        </View>

        {/* Screen title */}
        <Text style={[styles.title, { color: theme.text }]}>Customize</Text>

        {/* Subtitle */}
        <Text style={[styles.forYouLabel, { color: theme.textMuted }]}>For you</Text>

        {/* 3-column portrait grid */}
        <FlatList
          data={THEMES}
          keyExtractor={item => item.id}
          numColumns={3}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: t }) => {
            const isSelected = preferences.theme === t.id;
            const aaColor = t.isDark ? '#E8E0D0' : '#1A1208';
            return (
              <TouchableOpacity
                style={[
                  styles.card,
                  {
                    width: CARD_WIDTH,
                    height: CARD_HEIGHT,
                    borderColor: isSelected ? theme.gold : 'transparent',
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
                onPress={() => handleSelect(t.id)}
                activeOpacity={0.8}
              >
                {t.backgroundImage ? (
                  <ImageBackground
                    source={t.backgroundImage}
                    style={styles.cardBg}
                    resizeMode="cover"
                    borderRadius={14}
                  >
                    <View style={styles.aaContainer}>
                      <Text style={[styles.aaText, { color: aaColor }]}>Aa</Text>
                    </View>
                  </ImageBackground>
                ) : (
                  <View style={[styles.cardBg, { backgroundColor: t.background }]}>
                    <View style={styles.aaContainer}>
                      <Text style={[styles.aaText, { color: aaColor }]}>Aa</Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  dragHandle: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  dragPill: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  closeBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: 'PlayfairDisplay_700Bold',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  forYouLabel: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 12,
    paddingHorizontal: SIDE_PADDING,
  },
  grid: {
    paddingHorizontal: SIDE_PADDING,
    paddingBottom: 40,
  },
  row: {
    gap: GAP,
    marginBottom: GAP,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardBg: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aaContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  aaText: {
    fontSize: 20,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
});
