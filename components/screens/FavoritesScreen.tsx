import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useHaptics } from '../../hooks/useHaptics';
import { SheetHeader } from '../ui/SheetHeader';
import { IconButton } from '../ui/IconButton';
import { SearchField } from '../ui/SearchField';
import { QuoteListCard } from '../ui/QuoteListCard';
import { ConfirmSheet } from '../ui/ConfirmSheet';
import { AddToCollectionSheet } from '../collections/AddToCollectionSheet';
import { GUTTER, SPACE } from '../ui/tokens';
import { useTheme } from '../../hooks/useTheme';
import { useFavoritesStore, FavoriteQuote } from '../../store/useFavoritesStore';
import { useCollectionsStore } from '../../store/useCollectionsStore';
import { useShareStore } from '../../store/useShareStore';
import { useModal } from '../../contexts/ModalContext';

type Order = 'newest' | 'oldest';

export default function FavoritesScreen({ onClose, onBack }: { onClose?: () => void; onBack?: () => void }) {
  const theme = useTheme();
  const router = useRouter();
  const modal = useModal();
  const haptics = useHaptics();
  const favorites = useFavoritesStore((s) => s.favorites);
  const removeFavorite = useFavoritesStore((s) => s.removeFavorite);
  const clearFavorites = useFavoritesStore((s) => s.clearFavorites);
  const collections = useCollectionsStore((s) => s.collections);
  const setShareQuote = useShareStore((s) => s.setQuote);

  /** Ids held by at least one collection, so the bookmark glyph can fill. */
  const savedIds = useMemo(
    () => new Set(collections.flatMap(c => c.quotes.map(q => q.id))),
    [collections],
  );

  const [query, setQuery] = useState('');
  const [order, setOrder] = useState<Order>('newest');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [saving, setSaving] = useState<FavoriteQuote | null>(null);

  const close = onClose ?? (() => router.back());
  const back = onBack ?? close;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? favorites.filter(
          f => f.text.toLowerCase().includes(q) || f.author.toLowerCase().includes(q),
        )
      : favorites;
    // The store already holds newest first, so only the reverse needs sorting.
    return order === 'newest' ? matched : [...matched].reverse();
  }, [favorites, query, order]);

  const handleUnfavorite = (quote: FavoriteQuote) => {
    haptics.selection();
    removeFavorite(quote.id);
  };

  const handleShare = (quote: FavoriteQuote) => {
    haptics.impact();
    setShareQuote(quote.id, quote.text, quote.author);
    modal ? modal.openSheet('share') : router.push('/share');
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <SheetHeader
          title="Favorites"
          leading="back"
          onLeadingPress={back}
          right={
            favorites.length > 1 ? (
              <IconButton
                icon="sort-variant"
                onPress={() => setOrder(o => (o === 'newest' ? 'oldest' : 'newest'))}
                filled={false}
                iconSize={22}
                color={theme.text}
                accessibilityLabel={
                  order === 'newest' ? 'Sort by oldest saved first' : 'Sort by newest saved first'
                }
              />
            ) : undefined
          }
          actionLabel={favorites.length > 0 ? 'Clear all' : undefined}
          onActionPress={favorites.length > 0 ? () => setShowClearConfirm(true) : undefined}
        />

        {favorites.length > 0 && (
          <View style={styles.search}>
            <SearchField
              value={query}
              onChangeText={setQuery}
              accessibilityLabel="Search your favorites"
            />
          </View>
        )}

        {favorites.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
              No favorites yet
            </Text>
            <Text style={[styles.emptyBody, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              Tap the heart on any quote to keep it here.
            </Text>
          </View>
        ) : visible.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyBody, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              Nothing matches “{query.trim()}”.
            </Text>
          </View>
        ) : (
          <FlatList
            style={styles.list}
            data={visible}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <QuoteListCard
                text={item.text}
                date={item.savedAt}
                actions={[
                  {
                    icon: 'heart',
                    accessibilityLabel: 'Remove from favorites',
                    color: theme.favorite ?? theme.gold,
                    onPress: () => handleUnfavorite(item),
                  },
                  {
                    icon: savedIds.has(item.id) ? 'bookmark' : 'bookmark-outline',
                    accessibilityLabel: 'Add to collection',
                    color: savedIds.has(item.id) ? theme.gold : theme.textMuted,
                    onPress: () => setSaving(item),
                  },
                  {
                    icon: 'export-variant',
                    accessibilityLabel: 'Share',
                    onPress: () => handleShare(item),
                  },
                ]}
              />
            )}
          />
        )}
      </SafeAreaView>

      {saving && (
        <AddToCollectionSheet
          visible
          quote={{ id: saving.id, text: saving.text, author: saving.author }}
          onClose={() => setSaving(null)}
        />
      )}

      <ConfirmSheet
        visible={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        title="Clear all favorites"
        message="Every quote you have saved here is removed. Quotes kept in a collection stay there."
        confirmLabel="Clear all"
        destructive
        cancelLabel="Cancel"
        onConfirm={clearFavorites}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  search: {
    paddingHorizontal: GUTTER,
    paddingBottom: SPACE.lg,
  },
  // A ScrollView sizes to its content without this, so a short list would not
  // hold the bottom of the sheet.
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: GUTTER,
    paddingBottom: SPACE.xl,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACE.xxl,
    gap: SPACE.sm,
  },
  emptyTitle: {
    fontSize: 22,
    lineHeight: 30,
    includeFontPadding: false,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
  },
});
