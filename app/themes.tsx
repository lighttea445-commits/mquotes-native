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
const CARD_SIZE = (width - 48) / 3;

export default function ThemesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { preferences, setTheme } = useAppStore();

  const currentTheme = THEMES.find(t => t.id === preferences.theme) ?? THEMES[0];

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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <MaterialCommunityIcons name="close" size={20} color={theme.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
            Themes
          </Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Currently using banner */}
        <View style={styles.bannerWrapper}>
          <TouchableOpacity
            style={[styles.bannerCard, { borderColor: theme.text, borderWidth: 1.5 }]}
            onPress={() => handleSelect(currentTheme.id)}
            activeOpacity={0.85}
          >
            {currentTheme.backgroundImage ? (
              <ImageBackground
                source={currentTheme.backgroundImage}
                style={styles.bannerBg}
                resizeMode="cover"
                borderRadius={16}
              >
                <View style={[styles.bannerOverlay, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
                  <Text style={[styles.bannerLabel, { color: 'rgba(255,255,255,0.6)' }]}>Currently using</Text>
                  <Text style={[styles.bannerName, { color: '#fff' }]}>{currentTheme.name}</Text>
                </View>
              </ImageBackground>
            ) : (
              <View style={[styles.bannerBg, { backgroundColor: currentTheme.background, borderRadius: 16 }]}>
                <Text style={[styles.bannerLabel, { color: currentTheme.textMuted }]}>Currently using</Text>
                <Text style={[styles.bannerName, { color: currentTheme.text }]}>{currentTheme.name}</Text>
              </View>
            )}
            <View style={[styles.activeBadge, { backgroundColor: theme.text }]}>
              <MaterialCommunityIcons name="check" size={12} color={theme.background} />
            </View>
          </TouchableOpacity>
        </View>

        {/* 3-column grid */}
        <FlatList
          data={THEMES}
          keyExtractor={item => item.id}
          numColumns={3}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: t }) => {
            const isSelected = preferences.theme === t.id;
            return (
              <TouchableOpacity
                style={[
                  styles.card,
                  {
                    borderColor: isSelected ? theme.text : theme.border,
                    borderWidth: isSelected ? 1.5 : 1,
                    width: CARD_SIZE,
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
                    borderRadius={10}
                  >
                    <View style={[styles.cardOverlay, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
                      <Text style={[styles.themeName, { color: '#fff' }]} numberOfLines={1}>{t.name}</Text>
                    </View>
                  </ImageBackground>
                ) : (
                  <View style={[styles.cardBg, { backgroundColor: t.background, borderRadius: 10 }]}>
                    <Text style={[styles.themeName, { color: t.text }]} numberOfLines={1}>{t.name}</Text>
                  </View>
                )}
                {isSelected && (
                  <View style={[styles.selectedBadge, { backgroundColor: theme.text }]}>
                    <MaterialCommunityIcons name="check" size={10} color={theme.background} />
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  bannerWrapper: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  bannerCard: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerBg: {
    height: 88,
    justifyContent: 'flex-end',
    padding: 14,
  },
  bannerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 14,
    borderRadius: 16,
  },
  bannerLabel: {
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  bannerName: {
    fontSize: 18,
    fontWeight: '700',
  },
  activeBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grid: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  row: {
    gap: 8,
    marginBottom: 8,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  cardBg: {
    height: 80,
    justifyContent: 'flex-end',
    padding: 8,
  },
  cardOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 8,
    borderRadius: 10,
  },
  themeName: {
    fontSize: 11,
    fontWeight: '600',
  },
  selectedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
