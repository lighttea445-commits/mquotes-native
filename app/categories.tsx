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
const GOLD_ICON_BG = 'rgba(184,151,90,0.12)';

// ─── Special 2×2 tile ────────────────────────────────────────────────────────

function SpecialTile({
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
          borderColor: isActive ? theme.gold : theme.border,
          borderWidth: isActive ? 1.5 : 1,
          width: TILE_SIZE,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.tileContent}>
        <Text style={[styles.tileLabel, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>
          {label}
        </Text>
        {subtitle !== undefined && (
          <Text style={[styles.tileSubtitle, { color: theme.textMuted }]}>{subtitle}</Text>
        )}
      </View>
      <MaterialCommunityIcons
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
        styles.pillRow,
        {
          backgroundColor: theme.surface,
          borderColor: isActive ? theme.gold : theme.border,
          borderWidth: isActive ? 1.5 : 1,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconSquare, { backgroundColor: GOLD_ICON_BG }]}>
        <MaterialCommunityIcons name={icon as any} size={18} color={theme.gold} />
      </View>
      <Text style={[styles.pillLabel, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>
        {name}
      </Text>
      <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
    </TouchableOpacity>
  );
}

// ─── Section title ────────────────────────────────────────────────────────────

function SectionTitle({ label, theme }: { label: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <Text style={[styles.sectionTitle, { color: theme.text }]}>{label}</Text>
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
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={[styles.myTopicsPill, { borderColor: theme.border }]}
            onPress={() => router.push('/mix/create')}
            activeOpacity={0.7}
          >
            <Text style={[styles.myTopicsText, { color: theme.textMuted }]}>See my topics</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Page title */}
          <Text style={[styles.pageTitle, { color: theme.text }]}>Browse topics</Text>

          {/* Special 2×2 tiles */}
          <View style={styles.tilesRow}>
            <SpecialTile
              label="General"
              subtitle="All quotes"
              icon="cards-outline"
              onPress={() => selectCategory(null)}
              isActive={activeCategory === null}
              theme={theme}
            />
            <SpecialTile
              label="My own quotes"
              subtitle={`${userQuotes.length} quotes`}
              icon="pencil-outline"
              onPress={() => router.push('/mix/create')}
              theme={theme}
            />
          </View>
          <View style={[styles.tilesRow, { marginTop: 12 }]}>
            <SpecialTile
              label="My favorites"
              subtitle={`${favorites.length} saved`}
              icon="heart-outline"
              onPress={() => router.push('/favorites')}
              isActive={activeCategory === '_favorites'}
              theme={theme}
            />
            <SpecialTile
              label="History"
              subtitle={`${history.length} viewed`}
              icon="clock-outline"
              onPress={() => router.push('/history')}
              theme={theme}
            />
          </View>

          {/* Based on mood pill row */}
          <TouchableOpacity
            style={[
              styles.pillRow,
              { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, marginTop: 16 },
            ]}
            onPress={() => router.push('/mood')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconSquare, { backgroundColor: GOLD_ICON_BG }]}>
              <MaterialCommunityIcons name="emoticon-happy-outline" size={18} color={theme.gold} />
            </View>
            <Text style={[styles.pillLabel, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>
              Based on mood
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
          </TouchableOpacity>

          {/* By type section */}
          <View style={{ height: 28 }} />
          <SectionTitle label="By type" theme={theme} />
          <View style={styles.pillList}>
            {byTypeCategories.map(cat => (
              <CategoryPillRow
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

          {/* Explore section */}
          <View style={{ height: 28 }} />
          <SectionTitle label="Explore" theme={theme} />
          <View style={styles.pillList}>
            {forYouCategories.map(cat => (
              <CategoryPillRow
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
  myTopicsPill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  myTopicsText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  pageTitle: {
    fontSize: 32,
    fontFamily: 'PlayfairDisplay_700Bold',
    marginTop: 16,
    marginBottom: 20,
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
    fontSize: 12,
  },
  tileIcon: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
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
    fontFamily: 'PlayfairDisplay_700Bold',
    marginBottom: 12,
  },
  pillList: {
    gap: 8,
  },
});
