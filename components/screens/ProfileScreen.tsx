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

/** `bg` lets overlapping art occlude itself against the tile's own surface. */
type ArtComponent = React.ComponentType<{ size?: number; color: string; bg?: string }>;

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
    // Wide on iOS to balance the grid without a Widgets tile; Android has
    // four tiles already, so Reminders stays a single square there.
    { label: 'Reminders',         art: Bell,        onPress: () => go('notifications', '/notifications'), wide: Platform.OS === 'ios' },
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
                  <Art size={TILE_W * 0.66} color={theme.text} bg={theme.surface} />
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
                <Icon name={icon} size={28} color={theme.text} />
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
    // Not a token: the banner's height is set here rather than by the type,
    // so the card can be tuned without touching the text sizes. The content
    // itself is 59px, so 10.5 top and bottom lands the card at 80. Padding
    // rather than a fixed height, so the card grows instead of clipping if the
    // subtitle ever wraps to a third line on a narrow screen.
    paddingVertical: 10.5,
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
    fontSize: 19,
    fontFamily: FONTS.display.bold,
    lineHeight: 25,
    includeFontPadding: false,
  },
  // Capped at the point where the art begins, so the copy never runs beneath
  // the crystals. Font size alone cannot do this: the text block is flex:1, so
  // its lines reach the full width whatever size the type is.
  bannerSubtitle: {
    fontSize: 10,
    lineHeight: 15,
    maxWidth: '57%',
    opacity: 0.75,
  },
  // Still overflows the banner's right edge so the cluster is cropped, the way
  // the reference art bleeds off the card, but pulled left so more of the
  // drawing sits inside it. Keeps 35px clear of where the subtitle ends.
  bannerArt: {
    position: 'absolute',
    right: -6,
    top: -17,
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
    minHeight: 76,
    borderRadius: RADIUS.card,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.md,
    gap: SPACE.sm,
  },
  contentLabel: {
    flex: 1,
    fontSize: 17,
  },
});
