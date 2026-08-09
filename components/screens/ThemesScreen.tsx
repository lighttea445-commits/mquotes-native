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
import { useHaptics } from '../../hooks/useHaptics';
import { Icon } from '../ui/Icon';
import { SheetHeader } from '../ui/SheetHeader';
import { GUTTER, SPACE, RADIUS, ON_GOLD } from '../ui/tokens';
import { useTheme } from '../../hooks/useTheme';
import { useRevenueCat } from '../../hooks/useRevenueCat';
import { useAppStore } from '../../store/useAppStore';
import { THEMES, DEFAULT_THEME_ID } from '../../constants/themes';
import { useModal } from '../../contexts/ModalContext';
import { analytics } from '../../lib/analytics';
import { FONTS } from '../../constants/fonts';
import { Crystals } from '../art/Crystals';

const GAP = 10;
const BADGE = 22;

export default function ThemesScreen({ onClose }: { onClose?: () => void }) {
  const { width } = useWindowDimensions();
  const CARD_WIDTH = (width - GUTTER * 2 - GAP * 2) / 3;
  const CARD_HEIGHT = CARD_WIDTH * 1.5; // 2:3 portrait ratio
  const theme = useTheme();
  const router = useRouter();
  const modal = useModal();
  const { isPro } = useRevenueCat();
  const preferences = useAppStore((s) => s.preferences);
  const setTheme = useAppStore((s) => s.setTheme);
  const haptics = useHaptics();

  const close = onClose ?? (() => router.back());

  /** Gated for free users — the default theme never is. */
  const isLocked = (themeId: string) => !isPro && themeId !== DEFAULT_THEME_ID;

  const openUpsell = () =>
    modal ? modal.openSheet('trial') : router.push('/subscriptions');

  const handleSelect = (themeId: string) => {
    // Onboarding lets free users pick from six themes, so without this a free
    // user who chose one there would have no way back to the default.
    if (isLocked(themeId)) {
      openUpsell();
      return;
    }
    haptics.impact();
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

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <SheetHeader
          title="Themes"
          leading="close"
          onLeadingPress={close}
        />

        <FlatList
          data={THEMES}
          keyExtractor={item => item.id}
          numColumns={3}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            !isPro ? (
              // Upsell banner — the one light surface on the screen
              <TouchableOpacity
                style={[styles.banner, { backgroundColor: theme.goldButton }]}
                onPress={openUpsell}
                activeOpacity={0.9}
                accessibilityRole="button"
                accessibilityLabel="Unlock everything. Access all categories, quotes, and themes to unlock discipline and motivation."
              >
                <View style={styles.bannerText}>
                  <Text style={[styles.bannerTitle, { color: ON_GOLD }]}>Unlock everything</Text>
                  <Text style={[styles.bannerSubtitle, { color: ON_GOLD }]}>
                    Access all categories, quotes, and themes to unlock discipline and motivation!
                  </Text>
                </View>
                <View style={styles.bannerArt} pointerEvents="none">
                  <Crystals size={130} color={ON_GOLD} />
                </View>
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item: t }) => {
            const isSelected = preferences.theme === t.id;
            const locked = isLocked(t.id);
            const aaColor = t.isDark ? '#E8E0D0' : '#1A1208';
            const cardStyle = {
              width: CARD_WIDTH,
              height: CARD_HEIGHT,
              borderColor: isSelected ? theme.gold : theme.border,
              borderWidth: isSelected ? 2 : 1,
            };
            return (
              <TouchableOpacity
                style={[styles.cardWrapper, { width: CARD_WIDTH }]}
                onPress={() => handleSelect(t.id)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={
                  `${t.name} theme` +
                  (isSelected ? ', selected' : locked ? ', locked, requires Premium' : '')
                }
              >
                {isSelected && (
                  <View style={[styles.badge, { backgroundColor: theme.gold }]}>
                    <Icon name="check" size={13} color={ON_GOLD} />
                  </View>
                )}

                {t.backgroundImage ? (
                  <ImageBackground
                    source={t.backgroundImage}
                    style={[styles.card, cardStyle]}
                    imageStyle={{ borderRadius: RADIUS.card - 2 }}
                    resizeMode="cover"
                  >
                    <View style={styles.aaOverlay}>
                      {/* The preview belongs to the card's own theme, so the
                          off-white comes from that theme, not the active one. */}
                      <Text style={[styles.aaTextImage, { color: t.text, fontFamily: t.quoteFontFamily }]}>
                        Aa
                      </Text>
                    </View>
                  </ImageBackground>
                ) : (
                  <View style={[styles.card, cardStyle]}>
                    <View style={[styles.cardBg, { backgroundColor: t.background }]}>
                      <Text style={[styles.aaText, { color: aaColor, fontFamily: t.quoteFontFamily }]}>
                        Aa
                      </Text>
                    </View>
                  </View>
                )}

                <Text
                  style={[styles.cardLabel, { color: isSelected ? theme.text : theme.textMuted, fontFamily: theme.uiFontFamily }]}
                  numberOfLines={1}
                >
                  {t.name}
                </Text>
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
  grid: {
    paddingHorizontal: GUTTER,
    paddingBottom: 40,
  },
  row: {
    gap: GAP,
    marginBottom: SPACE.lg,
  },

  // ── Upsell banner ────────────────────────────────────────────────────────
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.tile,
    paddingVertical: 10.5,
    paddingLeft: SPACE.xl,
    paddingRight: SPACE.lg,
    overflow: 'hidden',
    marginBottom: SPACE.lg,
  },
  bannerText: {
    flex: 1,
    gap: SPACE.xs,
    zIndex: 1,
  },
  bannerTitle: {
    fontSize: 19,
    fontFamily: FONTS.display.bold,
    lineHeight: 25,
    includeFontPadding: false,
  },
  bannerSubtitle: {
    fontSize: 10,
    lineHeight: 15,
    maxWidth: '57%',
    opacity: 0.75,
  },
  bannerArt: {
    position: 'absolute',
    right: -6,
    top: -17,
  },
  cardWrapper: {
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 1,
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: RADIUS.card,
    overflow: 'hidden',
  },
  cardBg: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 12,
    marginTop: SPACE.sm,
    textAlign: 'center',
    width: '100%',
  },
  aaText: {
    fontSize: 20,
  },
  aaOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  aaTextImage: {
    fontSize: 22,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
