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
import { Icon } from '../ui/Icon';
import { useTheme } from '../../hooks/useTheme';
import { useRevenueCat } from '../../hooks/useRevenueCat';
import { useMixStore } from '../../store/useMixStore';
import { useFavoritesStore } from '../../store/useFavoritesStore';
import { useUserQuotesStore } from '../../store/useUserQuotesStore';
import { CATEGORIES, SPECIAL_CATEGORIES } from '../../constants/categories';
import { useModal } from '../../contexts/ModalContext';
import { FONTS } from '../../constants/fonts';

const FREE_MIX_LIMIT = 2;

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 48) / 2;
const GOLD_ICON_BG = 'rgba(184,151,90,0.12)';

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
  locked,
  onToggle,
  theme,
}: {
  item: CategoryItem;
  selected: boolean;
  locked: boolean;
  onToggle: (id: string) => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: selected ? theme.gold + '18' : theme.surface,
          borderColor: selected ? theme.gold : theme.border,
          width: ITEM_SIZE,
          height: ITEM_SIZE * 0.65,
          opacity: locked ? 0.55 : 1,
        },
      ]}
      onPress={() => onToggle(item.id)}
      activeOpacity={0.7}
    >
      {selected && (
        <View style={[styles.checkBadge, { backgroundColor: theme.gold }]}>
          <Icon name="check" size={11} color="#1A1208" />
        </View>
      )}
      {locked && !selected && (
        <View style={[styles.checkBadge, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }]}>
          <Icon name="lock" size={10} color={theme.textMuted} />
        </View>
      )}
      <View style={[styles.iconBg, { backgroundColor: GOLD_ICON_BG }]}>
        <Icon name={item.icon as any} size={20} color={theme.gold} />
      </View>
      <Text style={[styles.categoryName, { color: selected ? theme.text : theme.textMuted, fontFamily: theme.uiFontFamily }]}>
        {item.name}
      </Text>
      {item.count !== undefined && (
        <Text style={[styles.countText, { color: theme.textMuted }]}>{item.count} saved</Text>
      )}
    </TouchableOpacity>
  );
}

export default function CreateMixScreen({ onClose }: { onClose?: () => void }) {
  const theme = useTheme();
  const router = useRouter();
  const modal = useModal();
  const { isPro } = useRevenueCat();
  const { selectedCategories, setCategories } = useMixStore();
  const favorites = useFavoritesStore((s) => s.favorites);
  const userQuotes = useUserQuotesStore((s) => s.userQuotes);

  const [localSelected, setLocalSelected] = useState<string[]>(selectedCategories);

  const close = onClose ?? (() => router.back());

  const allItems: CategoryItem[] = [
    ...SPECIAL_CATEGORIES.map(c => ({
      ...c,
      count: c.id === '_favorites' ? favorites.length : userQuotes.length,
    })),
    ...CATEGORIES,
  ];

  const openPaywall = () => modal ? modal.openSheet('trial') : router.push('/subscriptions');

  const toggle = (id: string) => {
    if (!localSelected.includes(id) && !isPro && localSelected.length >= FREE_MIX_LIMIT) {
      openPaywall();
      return;
    }
    setLocalSelected(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id],
    );
  };

  const handleSave = () => {
    setCategories(localSelected);
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={close} style={[styles.closeBtn, { backgroundColor: theme.surface }]}>
            <Icon name="close" size={20} color={theme.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
            Create Mix
          </Text>
          <View style={styles.headerRight}>
            {localSelected.length > 0 ? (
              <TouchableOpacity onPress={() => setLocalSelected([])}>
                <Text style={[styles.clearBtn, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>Clear</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 52 }} />
            )}
          </View>
        </View>

        <Text style={[styles.subtitle, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
          Select categories to blend in your feed
        </Text>

        {/* Category grid */}
        <FlatList
          data={allItems}
          keyExtractor={item => item.id}
          numColumns={2}
          renderItem={({ item }) => {
            const selected = localSelected.includes(item.id);
            const locked = !isPro && !selected && localSelected.length >= FREE_MIX_LIMIT;
            return (
              <CategoryCard
                item={item}
                selected={selected}
                locked={locked}
                onToggle={toggle}
                theme={theme}
              />
            );
          }}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
        />

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: theme.border, backgroundColor: theme.background }]}>
          {!isPro ? (
            <View style={styles.slotRow}>
              <Text style={[styles.selectedCount, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                {localSelected.length}/{FREE_MIX_LIMIT} slots used
              </Text>
              <TouchableOpacity onPress={openPaywall} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.upgradeLink, { color: '#B8975A', fontFamily: FONTS.ui.medium }]}>
                  Unlock unlimited →
                </Text>
              </TouchableOpacity>
            </View>
          ) : localSelected.length > 0 && (
            <Text style={[styles.selectedCount, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              {localSelected.length} categor{localSelected.length === 1 ? 'y' : 'ies'} selected
            </Text>
          )}
          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: localSelected.length > 0 ? theme.goldButton : theme.surface },
            ]}
            onPress={handleSave}
          >
            <Text style={[styles.saveBtnText, { color: localSelected.length > 0 ? '#1A1208' : theme.textMuted, fontFamily: theme.uiFontFamily }]}>
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
    justifyContent: 'space-between',
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
  title: { fontSize: 20, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 52, justifyContent: 'flex-end' },
  clearBtn: { fontSize: 14 },
  subtitle: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    fontSize: 13,
  },
  grid: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  row: {
    gap: 12,
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryName: { fontSize: 14, fontWeight: '600' },
  countText: { fontSize: 11, marginTop: 2, fontFamily: FONTS.ui.regular },
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
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  upgradeLink: {
    fontSize: 13,
  },
  selectedCount: { fontSize: 13, textAlign: 'center' },
  saveBtn: {
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnText: { fontSize: 16, fontWeight: '600', letterSpacing: 0.3, fontFamily: FONTS.ui.bold },
});
