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
import { Icon } from '../ui/Icon';
import { useTheme } from '../../hooks/useTheme';
import { useRevenueCat } from '../../hooks/useRevenueCat';
import { useMixStore } from '../../store/useMixStore';
import { useFavoritesStore } from '../../store/useFavoritesStore';
import { useUserQuotesStore } from '../../store/useUserQuotesStore';
import { CATEGORIES, Category } from '../../constants/categories';
import { useModal } from '../../contexts/ModalContext';
import { analytics } from '../../lib/analytics';
import { FONTS } from '../../constants/fonts';

const GOLD_ICON_BG = 'rgba(184,151,90,0.12)';

// ─── Special 2×2 tile ────────────────────────────────────────────────────────

function SpecialTile({
  label,
  subtitle,
  icon,
  onPress,
  isActive,
  theme,
  tileSize,
}: {
  label: string;
  subtitle?: string;
  icon: string;
  onPress: () => void;
  isActive?: boolean;
  theme: ReturnType<typeof useTheme>;
  tileSize: number;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.tile,
        {
          backgroundColor: theme.surface,
          borderColor: isActive ? theme.gold : theme.border,
          borderWidth: isActive ? 1.5 : 1,
          width: tileSize,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.tileContent}>
        <Text style={[styles.tileLabel, { color: theme.text, fontFamily: FONTS.ui.medium }]}>
          {label}
        </Text>
        {subtitle !== undefined && (
          <Text style={[styles.tileSubtitle, { color: theme.textMuted }]}>{subtitle}</Text>
        )}
      </View>
      <Icon
        name={icon as any}
        size={20}
        color={theme.gold}
        style={styles.tileIcon}
      />
    </TouchableOpacity>
  );
}

// ─── Category pill row ────────────────────────────────────────────────────────

function CategoryPillRow({
  id,
  name,
  icon,
  onPress,
  isActive,
  locked,
  theme,
}: {
  id: string;
  name: string;
  icon: string;
  onPress: () => void;
  isActive: boolean;
  locked?: boolean;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.pillRow,
        {
          backgroundColor: theme.surface,
          borderColor: isActive ? theme.gold : 'transparent',
          borderWidth: isActive ? 1.5 : 0,
          opacity: locked ? 0.6 : 1,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconSquare, { backgroundColor: GOLD_ICON_BG }]}>
        <Icon name={icon as any} size={18} color={theme.gold} />
      </View>
      <Text style={[styles.pillLabel, { color: theme.text, fontFamily: FONTS.ui.medium }]}>
        {name}
      </Text>
      {locked
        ? <Icon name="lock-outline" size={16} color="#B8975A" />
        : <Icon name="chevron-right" size={18} color={theme.textMuted} />
      }
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

const EXPLORE = CATEGORIES;

export default function CategoriesScreen({ onClose }: { onClose?: () => void }) {
  const { width } = useWindowDimensions();
  const TILE_SIZE = (width - 48) / 2;
  const theme = useTheme();
  const router = useRouter();
  const modal = useModal();
  const { isPro } = useRevenueCat();
  const { activeCategory, setActiveCategory } = useMixStore();
  const favorites = useFavoritesStore((s) => s.favorites);
  const forYouCategoryIds = useFavoritesStore((s) => s.forYouCategoryIds);
  const userQuotes = useUserQuotesStore((s) => s.userQuotes);

  // Stable For You list — computed in the store and recomputed only at tier milestones
  const forYouCategories = useMemo(
    () => forYouCategoryIds.map(id => CATEGORIES.find(c => c.id === id)).filter(Boolean) as Category[],
    [forYouCategoryIds],
  );

  const close = onClose ?? (() => router.back());
  const openPaywall = () => modal ? modal.openSheet('features') : router.push('/subscriptions');

  const openMyQuotes = () => {
    if (!isPro) { openPaywall(); return; }
    modal ? modal.openSheet('myquotes') : router.push('/my-quotes');
  };

  const selectCategory = (id: string | null) => {
    setActiveCategory(id);
    analytics.track(id ? 'category_selected' : 'category_cleared', id ? { categoryId: id } : undefined);
    close();
  };

  // For You = free
  const selectForYouCategory = (id: string) => {
    selectCategory(id);
  };

  // Explore (All Categories) = Premium only
  const selectExploreCategory = (id: string) => {
    if (!isPro) { openPaywall(); return; }
    selectCategory(id);
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={close} style={[styles.closeBtn, { backgroundColor: theme.surface }]}>
            <Icon name="close" size={20} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Page title */}
          <Text style={[styles.pageTitle, { color: theme.text }]}>Explore</Text>

          {/* Special tiles — My own quotes + My favorites */}
          <View style={styles.tilesRow}>
            <SpecialTile
              label="My own quotes"
              subtitle={`${userQuotes.length} quotes`}
              icon={isPro ? 'pencil-outline' : 'lock-outline'}
              onPress={openMyQuotes}
              theme={theme}
              tileSize={TILE_SIZE}
            />
            <SpecialTile
              label="My favorites"
              subtitle={`${favorites.length} saved`}
              icon="heart-outline"
              onPress={() => modal ? modal.openSheet('favorites') : router.push('/favorites')}
              isActive={activeCategory === '_favorites'}
              theme={theme}
              tileSize={TILE_SIZE}
            />
          </View>

          {/* For You — free, personalised as favorites grow */}
          <View style={{ height: 28 }} />
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>For You</Text>
          </View>
          <View style={styles.pillList}>
            {forYouCategories.map(cat => (
              <CategoryPillRow
                key={cat.id}
                id={cat.id}
                name={cat.name}
                icon={cat.icon}
                onPress={() => selectForYouCategory(cat.id)}
                isActive={activeCategory === cat.id}
                theme={theme}
              />
            ))}
          </View>

          {/* Explore — Premium only */}
          <View style={{ height: 28 }} />
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>All Categories</Text>
            {!isPro && (
              <View style={[styles.proBadge, { backgroundColor: 'rgba(184,151,90,0.12)' }]}>
                <Icon name="crown" size={11} color="#B8975A" />
                <Text style={[styles.proBadgeText, { color: '#B8975A', fontFamily: FONTS.ui.bold }]}>Premium</Text>
              </View>
            )}
          </View>
          <View style={styles.pillList}>
            {EXPLORE.map(cat => (
              <CategoryPillRow
                key={cat.id}
                id={cat.id}
                name={cat.name}
                icon={cat.icon}
                onPress={() => selectExploreCategory(cat.id)}
                isActive={activeCategory === cat.id}
                locked={!isPro}
                theme={theme}
              />
            ))}
          </View>

          <View style={{ height: 40 }} />
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  pageTitle: {
    fontSize: 32,
    fontFamily: FONTS.display.bold,
    marginTop: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  tilesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tile: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    minHeight: 90,
    justifyContent: 'space-between',
  },
  tileContent: {
    flex: 1,
  },
  tileLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  tileSubtitle: {
    fontSize: 12, fontFamily: FONTS.ui.regular
  },
  tileIcon: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    height: 56,
    paddingHorizontal: 16,
    gap: 12,
  },
  iconSquare: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillLabel: {
    flex: 1,
    fontSize: 15,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: FONTS.display.bold,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  proBadgeText: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
  pillList: {
    gap: 8,
  },
});
