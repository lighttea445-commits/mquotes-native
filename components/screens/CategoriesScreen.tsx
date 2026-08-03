import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Icon, IconName } from '../ui/Icon';
import { SheetHeader } from '../ui/SheetHeader';
import { GUTTER, SPACE, RADIUS, ON_GOLD } from '../ui/tokens';
import { useTheme } from '../../hooks/useTheme';
import { useRevenueCat } from '../../hooks/useRevenueCat';
import { useTopicsStore } from '../../store/useTopicsStore';
import { useAppStore } from '../../store/useAppStore';
import {
  CATEGORIES,
  Category,
  TOPIC_GROUP_ORDER,
  TOPIC_GROUP_TITLES,
  isTopicFree,
} from '../../constants/categories';
import { useModal } from '../../contexts/ModalContext';
import { analytics } from '../../lib/analytics';
import { FONTS } from '../../constants/fonts';
import { Crystals } from '../art/Crystals';

const GAP = 12;

export default function CategoriesScreen({ onClose }: { onClose?: () => void }) {
  const { width } = useWindowDimensions();
  const TILE_W = (width - GUTTER * 2 - GAP) / 2;
  const theme = useTheme();
  const router = useRouter();
  const modal = useModal();
  const { isPro } = useRevenueCat();
  const followed = useTopicsStore((s) => s.followed);
  const toggleTopic = useTopicsStore((s) => s.toggleTopic);
  const hapticsEnabled = useAppStore((s) => s.preferences.hapticsEnabled);

  const groups = useMemo(
    () => TOPIC_GROUP_ORDER.map(group => ({
      group,
      title: TOPIC_GROUP_TITLES[group],
      items: CATEGORIES.filter(c => c.group === group),
    })).filter(g => g.items.length > 0),
    [],
  );

  const close = onClose ?? (() => router.back());
  const go = (sheet: Parameters<NonNullable<typeof modal>['openSheet']>[0], route: string) =>
    modal ? modal.openSheet(sheet) : router.push(route as never);
  const openPaywall = () => go('trial', '/subscriptions');

  const gatedOpen = (fn: () => void) => () => {
    if (!isPro) { openPaywall(); return; }
    fn();
  };

  const quickAccess: { label: string; icon: IconName; onPress: () => void }[] = [
    { label: 'Favorites', icon: 'heart-outline',  onPress: () => go('favorites', '/favorites') },
    { label: 'Collections', icon: 'bookmark-outline', onPress: () => go('collections', '/collections') },
    { label: 'My quotes', icon: 'feather',        onPress: gatedOpen(() => go('myquotes', '/my-quotes')) },
    { label: 'History',   icon: 'history',        onPress: gatedOpen(() => go('history', '/history')) },
  ];

  /** Tapping a tile follows or unfollows — the feed is the union of everything followed. */
  const renderTile = (cat: Category) => {
    const locked = !isPro && !isTopicFree(cat.id);
    const following = followed.includes(cat.id);
    return (
      <TouchableOpacity
        key={cat.id}
        style={[
          styles.tile,
          {
            width: TILE_W,
            backgroundColor: theme.surface,
            borderColor: following ? theme.gold : 'transparent',
            borderWidth: following ? 1.5 : 0,
          },
        ]}
        onPress={() => {
          if (locked) { openPaywall(); return; }
          if (hapticsEnabled) Haptics.selectionAsync();
          analytics.track(following ? 'topic_unfollowed' : 'topic_followed', { topicId: cat.id });
          toggleTopic(cat.id);
        }}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={
          `${cat.name}${following ? ', following' : ''}${locked ? ', locked, requires Premium' : ''}`
        }
      >
        {following && (
          <View style={[styles.badge, { backgroundColor: theme.gold }]}>
            <Icon name="check" size={13} color={ON_GOLD} />
          </View>
        )}
        <View style={styles.tileArt} pointerEvents="none">
          <Icon name={cat.icon} size={Math.round(TILE_W * 0.42)} color={theme.text} />
        </View>
        <View style={styles.tileFooter}>
          <Text
            style={[styles.tileLabel, { color: theme.text, fontFamily: theme.uiFontFamily }]}
            numberOfLines={2}
          >
            {cat.name}
          </Text>
          {locked && <Icon name="lock-outline" size={16} color={theme.textMuted} />}
        </View>
      </TouchableOpacity>
    );
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
          title="Explore topics"
          leading="close"
          onLeadingPress={close}
          actionLabel="Edit"
          onActionPress={() => go('topics', '/topics')}
        />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Upsell banner — the one light surface on the screen */}
          {!isPro && (
            <TouchableOpacity
              style={[styles.banner, { backgroundColor: theme.goldButton }]}
              onPress={openPaywall}
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

          {/* Quick access — glyph first, matching the reference */}
          <View style={styles.grid}>
            {quickAccess.map(({ label, icon, onPress }) => (
              <TouchableOpacity
                key={label}
                style={[styles.quickRow, { width: TILE_W, backgroundColor: theme.surface }]}
                onPress={onPress}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Icon name={icon} size={24} color={theme.text} />
                <Text
                  style={[styles.quickLabel, { color: theme.text, fontFamily: theme.uiFontFamily }]}
                  numberOfLines={2}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {groups.map(({ group, title, items }) => (
            <React.Fragment key={group}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
              <View style={styles.grid}>
                {items.map(renderTile)}
              </View>
            </React.Fragment>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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

  // ── Quick access rows ────────────────────────────────────────────────────
  quickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    borderRadius: RADIUS.card,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.md,
    gap: SPACE.md,
  },
  quickLabel: {
    flex: 1,
    fontSize: 15,
  },

  // ── Topic tiles ──────────────────────────────────────────────────────────
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tile: {
    aspectRatio: 1,
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
  tileFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
  },
  tileLabel: {
    flex: 1,
    fontSize: 15,
  },
});
