import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useMixStore } from '../../store/useMixStore';
import { useFavoritesStore } from '../../store/useFavoritesStore';
import { useUserQuotesStore } from '../../store/useUserQuotesStore';
import { CATEGORIES, SPECIAL_CATEGORIES } from '../../constants/categories';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 48) / 2;

type CategoryItem = {
  id: string;
  name: string;
  icon: string;
  color: string;
  count?: number;
};

function CategoryCard({
  item,
  selected,
  onToggle,
  theme,
}: {
  item: CategoryItem;
  selected: boolean;
  onToggle: (id: string) => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: selected ? item.color + '22' : theme.surface,
          borderColor: selected ? item.color : theme.border,
          width: ITEM_SIZE,
          height: ITEM_SIZE * 0.7,
        },
      ]}
      onPress={() => onToggle(item.id)}
      activeOpacity={0.7}
    >
      {selected && (
        <View style={[styles.checkBadge, { backgroundColor: item.color }]}>
          <Text style={styles.checkMark}>✓</Text>
        </View>
      )}
      <Text style={styles.categoryIcon}>{item.icon}</Text>
      <Text style={[styles.categoryName, { color: selected ? item.color : theme.text, fontFamily: theme.uiFontFamily }]}>
        {item.name}
      </Text>
      {item.count !== undefined && (
        <Text style={[styles.countText, { color: theme.textMuted }]}>{item.count} quotes</Text>
      )}
    </TouchableOpacity>
  );
}

export default function CreateMixScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { selectedCategories, setCategories } = useMixStore();
  const favorites = useFavoritesStore((s) => s.favorites);
  const userQuotes = useUserQuotesStore((s) => s.userQuotes);

  const [localSelected, setLocalSelected] = useState<string[]>(selectedCategories);

  const allItems: CategoryItem[] = [
    ...SPECIAL_CATEGORIES.map(c => ({
      ...c,
      count: c.id === '_favorites' ? favorites.length : userQuotes.length,
    })),
    ...CATEGORIES,
  ];

  const toggle = (id: string) => {
    setLocalSelected(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id],
    );
  };

  const handleSave = () => {
    setCategories(localSelected);
    router.back();
  };

  const handleClear = () => {
    setLocalSelected([]);
  };

  const renderItem = ({ item }: { item: CategoryItem }) => (
    <CategoryCard
      item={item}
      selected={localSelected.includes(item.id)}
      onToggle={toggle}
      theme={theme}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.backBtn, { color: theme.textMuted }]}>✕</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
            Create Mix
          </Text>
          {localSelected.length > 0 && (
            <TouchableOpacity onPress={handleClear}>
              <Text style={[styles.clearBtn, { color: theme.textMuted }]}>Clear</Text>
            </TouchableOpacity>
          )}
          {localSelected.length === 0 && <View style={styles.placeholder} />}
        </View>

        <Text style={[styles.subtitle, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
          Select categories to blend in your feed
        </Text>

        {/* Category grid */}
        <FlatList
          data={allItems}
          keyExtractor={item => item.id}
          numColumns={2}
          renderItem={renderItem}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
        />

        {/* Selected count + save button */}
        <View style={[styles.footer, { borderTopColor: theme.border, backgroundColor: theme.navBackground }]}>
          {localSelected.length > 0 && (
            <Text style={[styles.selectedCount, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              {localSelected.length} categor{localSelected.length === 1 ? 'y' : 'ies'} selected
            </Text>
          )}
          <TouchableOpacity
            style={[
              styles.saveBtn,
              {
                backgroundColor: localSelected.length > 0 ? theme.text : theme.surface,
              },
            ]}
            onPress={handleSave}
          >
            <Text style={[styles.saveBtnText, { color: localSelected.length > 0 ? theme.background : theme.textMuted }]}>
              {localSelected.length > 0 ? 'Save Mix' : 'Save (No filter)'}
            </Text>
          </TouchableOpacity>
        </View>
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
    paddingBottom: 4,
  },
  backBtn: { fontSize: 20, padding: 4 },
  title: { fontSize: 22, fontWeight: '700' },
  clearBtn: { fontSize: 14 },
  placeholder: { width: 40 },
  subtitle: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    fontSize: 13,
  },
  grid: {
    padding: 16,
    paddingBottom: 120,
  },
  row: {
    gap: 12,
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMark: { color: '#fff', fontSize: 12, fontWeight: '700' },
  categoryIcon: { fontSize: 28, marginBottom: 6 },
  categoryName: { fontSize: 14, fontWeight: '600' },
  countText: { fontSize: 11, marginTop: 2 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
    gap: 8,
  },
  selectedCount: { fontSize: 13, textAlign: 'center' },
  saveBtn: {
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnText: { fontSize: 16, fontWeight: '600', letterSpacing: 0.3 },
});
