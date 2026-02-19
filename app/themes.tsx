import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useTheme';
import { useAppStore } from '../store/useAppStore';
import { THEMES } from '../constants/themes';

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
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.backBtn, { color: theme.textMuted }]}>✕</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
            Themes
          </Text>
          <View style={{ width: 28 }} />
        </View>

        <FlatList
          data={THEMES}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: t }) => {
            const isSelected = preferences.theme === t.id;
            return (
              <TouchableOpacity
                style={[styles.card, { borderColor: isSelected ? theme.accent : theme.border }]}
                onPress={() => handleSelect(t.id)}
                activeOpacity={0.8}
              >
                {t.backgroundImage ? (
                  <ImageBackground
                    source={t.backgroundImage}
                    style={styles.cardBg}
                    resizeMode="cover"
                    borderRadius={12}
                  >
                    <View style={[styles.cardOverlay, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
                      <Text style={[styles.themeName, { color: '#fff' }]}>{t.name}</Text>
                      <Text style={[styles.themePreview, { color: 'rgba(255,255,255,0.7)' }]}>{t.preview}</Text>
                    </View>
                  </ImageBackground>
                ) : (
                  <View style={[styles.cardBg, { backgroundColor: t.background, borderRadius: 12 }]}>
                    <Text style={[styles.themeName, { color: t.text }]}>{t.name}</Text>
                    <Text style={[styles.themePreview, { color: t.textMuted }]}>{t.preview}</Text>
                  </View>
                )}
                {isSelected && (
                  <View style={[styles.selectedBadge, { backgroundColor: theme.accent }]}>
                    <Text style={styles.selectedCheck}>✓</Text>
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
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backBtn: { fontSize: 20, padding: 4 },
  title: { fontSize: 22, fontWeight: '700' },
  grid: { padding: 16, paddingBottom: 40 },
  row: { gap: 12, marginBottom: 12 },
  card: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  cardBg: {
    height: 120,
    justifyContent: 'flex-end',
    padding: 12,
  },
  cardOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 12,
    borderRadius: 12,
  },
  themeName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  themePreview: {
    fontSize: 11,
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCheck: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
