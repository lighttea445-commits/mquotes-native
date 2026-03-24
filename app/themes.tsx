import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  useWindowDimensions,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useBaseTheme } from '../hooks/useTheme';
import { useRevenueCat } from '../hooks/useRevenueCat';
import { useAppStore } from '../store/useAppStore';
import { THEMES } from '../constants/themes';
import { useModal } from '../contexts/ModalContext';
import { analytics } from '../lib/analytics';

const SIDE_PADDING = 16;
const GAP = 8;

export default function ThemesScreen({ onClose }: { onClose?: () => void }) {
  const { width } = useWindowDimensions();
  const CARD_WIDTH = (width - SIDE_PADDING * 2 - GAP * 2) / 3;
  const CARD_HEIGHT = CARD_WIDTH * 1.5; // 2:3 portrait ratio
  const theme = useBaseTheme();
  const router = useRouter();
  const modal = useModal();
  const { isPro } = useRevenueCat();
  const { preferences, setTheme } = useAppStore();

  const close = onClose ?? (() => router.back());

  const handleSelect = (themeId: string) => {
    if (!isPro) {
      modal ? modal.openSheet('features') : router.push('/subscriptions');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    analytics.track('theme_changed', { themeId });
    setTheme(themeId);
    close();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Drag handle hidden when used inline (BottomSheet has its own) */}
      {!onClose && (
        <View style={styles.dragHandle}>
          <View style={[styles.dragPill, { backgroundColor: theme.border }]} />
        </View>
      )}

      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {/* Header — close only */}
        <View style={styles.header}>
          <TouchableOpacity onPress={close} style={[styles.closeBtn, { backgroundColor: theme.surface }]}>
            <MaterialCommunityIcons name="close" size={20} color={theme.textMuted} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
        </View>

        {/* Screen title */}
        <Text style={[styles.title, { color: theme.text }]}>Customize</Text>

        {/* Pro lock banner */}
        {!isPro && (
          <View style={[styles.proBanner, { backgroundColor: 'rgba(184,151,90,0.10)', borderColor: 'rgba(184,151,90,0.25)' }]}>
            <MaterialCommunityIcons name="crown" size={14} color="#B8975A" />
            <Text style={[styles.proBannerText, { color: '#B8975A', fontFamily: 'Inter_500Medium' }]}>
              Unlock all themes with Quotable Premium
            </Text>
          </View>
        )}

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
                style={[styles.cardWrapper, { width: CARD_WIDTH }]}
                onPress={() => handleSelect(t.id)}
                activeOpacity={0.8}
              >
                {t.backgroundImage ? (
                  <ImageBackground
                    source={t.backgroundImage}
                    style={[
                      styles.card,
                      {
                        width: CARD_WIDTH,
                        height: CARD_HEIGHT,
                        borderColor: isSelected ? theme.gold : theme.border,
                        borderWidth: 2,
                      },
                    ]}
                    imageStyle={{ borderRadius: 14 }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.card,
                      {
                        width: CARD_WIDTH,
                        height: CARD_HEIGHT,
                        borderColor: isSelected ? theme.gold : theme.border,
                        borderWidth: 2,
                      },
                    ]}
                  >
                    <View style={[styles.cardBg, { backgroundColor: t.background }]}>
                      <View style={styles.aaContainer}>
                        <Text style={[styles.aaText, { color: aaColor }]}>Aa</Text>
                      </View>
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
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontFamily: 'PlayfairDisplay_700Bold',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  forYouLabel: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 12,
    paddingHorizontal: SIDE_PADDING,
  },
  proBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: SIDE_PADDING,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  proBannerText: {
    fontSize: 13,
  },
  grid: {
    paddingHorizontal: SIDE_PADDING,
    paddingBottom: 40,
  },
  row: {
    gap: GAP,
    marginBottom: GAP,
  },
  cardWrapper: {
    alignItems: 'center',
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
  cardLabel: {
    fontSize: 11,
    marginTop: 5,
    textAlign: 'center',
    width: '100%',
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
