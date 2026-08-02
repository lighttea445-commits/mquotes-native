import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Icon, IconName } from '../ui/Icon';
import { SheetHeader } from '../ui/SheetHeader';
import { GUTTER, SPACE, RADIUS, ON_GOLD } from '../ui/tokens';
import { useTheme } from '../../hooks/useTheme';
import { useStreak } from '../../hooks/useStreak';
import { useAppStore } from '../../store/useAppStore';
import { StreakCard } from '../ui/StreakCard';
import { StreakShareSheet } from '../streak/StreakShareSheet';
import { useRevenueCat } from '../../hooks/useRevenueCat';
import { useModal } from '../../contexts/ModalContext';
import { FONTS } from '../../constants/fonts';
import { Crystals } from '../art/Crystals';
import { Cards } from '../art/Cards';
import { PhoneStack } from '../art/PhoneStack';
import { Bell } from '../art/Bell';
import { WidgetPhone } from '../art/WidgetPhone';

const GAP = 12;

type ArtComponent = React.ComponentType<{ size?: number; color: string }>;

export default function ProfileScreen({ onClose }: { onClose?: () => void }) {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { streakCount, weekData } = useStreak();
  const trackingEnabled = useAppStore(s => s.preferences.streakTrackingEnabled ?? true);
  const { isPro } = useRevenueCat();
  const modal = useModal();
  const close = onClose ?? (() => router.back());
  const [showStreakShare, setShowStreakShare] = useState(false);

  const TILE_W = (width - GUTTER * 2 - GAP) / 2;

  const go = (sheet: Parameters<NonNullable<typeof modal>['openSheet']>[0], route: string) =>
    modal ? modal.openSheet(sheet) : router.push(route as never);

  const openUpsell = () => go('trial', '/subscriptions');

  const handleHistory = () => {
    if (isPro) go('history', '/history');
    else openUpsell();
  };

  /** Tiles mirror what the app can actually customise — no dead entries. */
  const tiles: { label: string; art: ArtComponent; onPress: () => void; wide?: boolean }[] = [
    { label: 'Topics you follow', art: Cards,       onPress: () => go('topics', '/topics') },
    { label: 'Themes',            art: PhoneStack,  onPress: () => go('themes', '/themes') },
    // Android only. iOS widgets are configured entirely in Apple's Edit Widget
    // panel, so the in-app screen has nothing left to own.
    ...(Platform.OS === 'ios'
      ? []
      : [{ label: 'Widgets', art: WidgetPhone, onPress: () => go('widgets', '/widgets') }]),
    { label: 'Reminders',         art: Bell,        onPress: () => go('notifications', '/notifications'), wide: true },
  ];

  const content: { label: string; icon: IconName; onPress: () => void }[] = [
    { label: 'Favorites',   icon: 'heart-outline',    onPress: () => go('favorites', '/favorites') },
    { label: 'Collections', icon: 'bookmark-outline', onPress: () => go('collections', '/collections') },
    { label: 'My quotes',  icon: 'feather',         onPress: () => go('myquotes', '/my-quotes') },
    { label: 'History',    icon: 'history',         onPress: handleHistory },
  ];

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {!onClose && (
        <View style={styles.dragHandle}>
          <View style={[styles.dragPill, { backgroundColor: theme.border }]} />
        </View>
      )}

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <SheetHeader
          title="Profile"
          leading="close"
          onLeadingPress={close}
          actionLabel="Settings"
          onActionPress={() => go('settings', '/settings')}
        />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Upsell banner — the one light surface on the screen */}
          {!isPro && (
            <TouchableOpacity
              style={[styles.banner, { backgroundColor: theme.goldButton }]}
              onPress={openUpsell}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel="Unlock all. Access every topic, theme and your full history."
            >
              <View style={styles.bannerText}>
                <Text style={[styles.bannerTitle, { color: ON_GOLD }]}>Unlock all</Text>
                <Text style={[styles.bannerSubtitle, { color: ON_GOLD }]}>
                  Access every topic, every theme, and your full quote history.
                </Text>
              </View>
              <View style={styles.bannerArt} pointerEvents="none">
                <Crystals size={150} color={ON_GOLD} />
              </View>
            </TouchableOpacity>
          )}

          {trackingEnabled && (
            <StreakCard
              title="Your streak"
              streakCount={streakCount}
              weekData={weekData}
              onShare={() => setShowStreakShare(true)}
              onMenu={() => go('streak', '/streak')}
            />
          )}

          <Text style={[styles.sectionTitle, { color: theme.text }]}>Customize the app</Text>

          <View style={styles.grid}>
            {tiles.map(({ label, art: Art, onPress, wide }) => (
              <TouchableOpacity
                key={label}
                style={[
                  styles.tile,
                  {
                    backgroundColor: theme.surface,
                    // A wide tile spans both columns; fixing its height to one
                    // column's width keeps it a 2:1 band rather than a very
                    // tall square.
                    width: wide ? TILE_W * 2 + GAP : TILE_W,
                    aspectRatio: wide ? undefined : 1,
                    height: wide ? TILE_W : undefined,
                  },
                ]}
                onPress={onPress}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <View style={styles.tileArt} pointerEvents="none">
                  <Art size={TILE_W * 0.66} color={theme.text} />
                </View>
                <Text
                  style={[styles.tileLabel, { color: theme.text, fontFamily: theme.uiFontFamily }]}
                  numberOfLines={2}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>My content</Text>

          <View style={styles.grid}>
            {content.map(({ label, icon, onPress }) => (
              <TouchableOpacity
                key={label}
                style={[styles.contentRow, { width: TILE_W, backgroundColor: theme.surface }]}
                onPress={onPress}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Text
                  style={[styles.contentLabel, { color: theme.text, fontFamily: theme.uiFontFamily }]}
                  numberOfLines={2}
                >
                  {label}
                </Text>
                <Icon name={icon} size={24} color={theme.text} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>

      <StreakShareSheet
        visible={showStreakShare}
        streakCount={streakCount}
        onClose={() => setShowStreakShare(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
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
  scroll: {
    paddingHorizontal: GUTTER,
    paddingBottom: 40,
    gap: SPACE.lg,
  },

  // ── Upsell banner ────────────────────────────────────────────────────────
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.tile,
    paddingVertical: SPACE.xl,
    paddingLeft: SPACE.xl,
    paddingRight: SPACE.lg,
    overflow: 'hidden',
  },
  bannerText: {
    flex: 1,
    gap: SPACE.xs,
    zIndex: 1,
  },
  bannerTitle: {
    fontSize: 22,
    fontFamily: FONTS.display.bold,
    lineHeight: 28,
    includeFontPadding: false,
  },
  bannerSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.75,
  },
  // Deliberately overflows the banner's right edge so the cluster is cropped,
  // the way the reference art bleeds off the card.
  bannerArt: {
    position: 'absolute',
    right: -22,
    top: -12,
  },

  // ── Sections ─────────────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 24,
    fontFamily: FONTS.display.bold,
    lineHeight: 30,
    includeFontPadding: false,
    marginTop: SPACE.sm,
    marginBottom: -SPACE.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },

  // ── Customize tiles ──────────────────────────────────────────────────────
  tile: {
    borderRadius: RADIUS.tile,
    padding: SPACE.lg,
    justifyContent: 'flex-end',
  },
  tileArt: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    bottom: 34,
  },
  tileLabel: {
    fontSize: 15,
  },

  // ── My content rows ──────────────────────────────────────────────────────
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 64,
    borderRadius: RADIUS.card,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.md,
    gap: SPACE.sm,
  },
  contentLabel: {
    flex: 1,
    fontSize: 15,
  },
});
