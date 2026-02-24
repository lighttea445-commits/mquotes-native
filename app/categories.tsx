import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useMixStore } from '../store/useMixStore';
import { useFavoritesStore } from '../store/useFavoritesStore';
import { useUserQuotesStore } from '../store/useUserQuotesStore';
import { useHistoryStore } from '../store/useHistoryStore';
import { CATEGORIES } from '../constants/categories';

const { width } = Dimensions.get('window');
const TILE_SIZE = (width - 48) / 2;

// ─── Category row (list style) ────────────────────────────────────────────────

function CategoryRow({
  id,
  name,
  icon,
  onPress,
  isActive,
  theme,
}: {
  id: string;
  name: string;
  icon: string;
  onPress: () => void;
  isActive: boolean;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.categoryRow,
        {
          backgroundColor: theme.surface,
          borderColor: isActive ? theme.text : theme.border,
          borderWidth: isActive ? 1.5 : 1,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconSquare, { backgroundColor: theme.background, borderColor: theme.border }]}>
        <MaterialCommunityIcons name={icon as any} size={20} color={theme.textMuted} />
      </View>
      <Text style={[styles.rowLabel, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
        {name}
      </Text>
      <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textMuted} />
    </TouchableOpacity>
  );
}

// ─── Most Popular 2×2 grid tile ───────────────────────────────────────────────

function PopularTile({
  label,
  subtitle,
  icon,
  onPress,
  isActive,
  theme,
}: {
  label: string;
  subtitle?: string;
  icon: string;
  onPress: () => void;
  isActive?: boolean;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.tile,
        {
          backgroundColor: theme.surface,
          borderColor: isActive ? theme.text : theme.border,
          borderWidth: isActive ? 1.5 : 1,
          width: TILE_SIZE,
          height: TILE_SIZE * 0.7,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.tileContent}>
        <Text style={[styles.tileLabel, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
          {label}
        </Text>
        {subtitle !== undefined && (
          <Text style={[styles.tileSubtitle, { color: theme.textMuted }]}>{subtitle}</Text>
        )}
      </View>
      <MaterialCommunityIcons
        name={icon as any}
        size={20}
        color={theme.textMuted}
        style={styles.tileIcon}
      />
    </TouchableOpacity>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  label,
  sparkle,
  theme,
}: {
  label: string;
  sparkle?: boolean;
  theme: ReturnType<typeof useTheme>;
}) {
  if (sparkle) {
    return (
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionHeaderText, { color: theme.text }]}>✦  {label}</Text>
        <View style={[styles.sectionLine, { backgroundColor: theme.border }]} />
      </View>
    );
  }
  return (
    <Text style={[styles.sectionHeaderBold, { color: theme.text }]}>{label}</Text>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function CategoriesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeCategory, setActiveCategory } = useMixStore();
  const favorites = useFavoritesStore((s) => s.favorites);
  const userQuotes = useUserQuotesStore((s) => s.userQuotes);
  const history = useHistoryStore((s) => s.history);

  const forYouCategories = CATEGORIES.filter(c => c.section === 'forYou');
  const byTypeCategories = CATEGORIES.filter(c => c.section === 'byType');

  const selectCategory = (id: string | null) => {
    setActiveCategory(id);
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
            Categories
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Create my own mix button */}
          <TouchableOpacity
            style={[styles.createMixBtn, { backgroundColor: theme.text }]}
            onPress={() => router.push('/mix/create')}
            activeOpacity={0.8}
          >
            <Text style={[styles.createMixText, { color: theme.background, fontFamily: theme.uiFontFamily }]}>
              ✦  Create my own mix
            </Text>
          </TouchableOpacity>

          {/* Most Popular section */}
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Most Popular</Text>
          <View style={styles.tilesRow}>
            <PopularTile
              label="General"
              subtitle="All quotes"
              icon="cards"
              onPress={() => selectCategory(null)}
              isActive={activeCategory === null}
              theme={theme}
            />
            <PopularTile
              label="My Quotes"
              subtitle={`${userQuotes.length} quotes`}
              icon="pencil"
              onPress={() => router.push('/mix/create')}
              theme={theme}
            />
          </View>
          <View style={[styles.tilesRow, { marginTop: 12 }]}>
            <PopularTile
              label="My Favorites"
              subtitle={`${favorites.length} quotes`}
              icon="heart"
              onPress={() => router.push('/favorites')}
              isActive={activeCategory === '_favorites'}
              theme={theme}
            />
            <PopularTile
              label="History"
              subtitle={`${history.length} viewed`}
              icon="clock-outline"
              onPress={() => router.push('/history')}
              theme={theme}
            />
          </View>

          {/* Based on mood row */}
          <TouchableOpacity
            style={[styles.moodRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => router.push('/mood')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconSquare, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={{ fontSize: 18 }}>😊</Text>
            </View>
            <Text style={[styles.rowLabel, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
              Based on mood
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textMuted} />
          </TouchableOpacity>

          {/* For You section */}
          <View style={styles.sectionGap} />
          <SectionHeader label="For you" sparkle theme={theme} />
          <View style={styles.rowList}>
            {forYouCategories.map(cat => (
              <CategoryRow
                key={cat.id}
                id={cat.id}
                name={cat.name}
                icon={cat.icon}
                onPress={() => selectCategory(cat.id)}
                isActive={activeCategory === cat.id}
                theme={theme}
              />
            ))}
          </View>

          {/* By Type section */}
          <View style={styles.sectionGap} />
          <SectionHeader label="By type" theme={theme} />
          <View style={styles.rowList}>
            {byTypeCategories.map(cat => (
              <CategoryRow
                key={cat.id}
                id={cat.id}
                name={cat.name}
                icon={cat.icon}
                onPress={() => selectCategory(cat.id)}
                isActive={activeCategory === cat.id}
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  createMixBtn: {
    borderRadius: 28,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  createMixText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  sectionLabel: {
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginLeft: 2,
  },
  tilesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tile: {
    borderRadius: 16,
    padding: 14,
    position: 'relative',
    justifyContent: 'space-between',
  },
  tileContent: {
    flex: 1,
  },
  tileLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  tileSubtitle: {
    fontSize: 12,
  },
  tileIcon: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 12,
    marginTop: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  sectionLine: {
    flex: 1,
    height: 1,
  },
  sectionHeaderBold: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  sectionGap: {
    height: 24,
  },
  rowList: {
    gap: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  iconSquare: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
});
