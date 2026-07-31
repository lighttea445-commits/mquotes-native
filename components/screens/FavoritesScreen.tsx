import React, { useState } from 'react';
import { FONTS } from '../../constants/fonts';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFavoritesStore, FavoriteQuote } from '../../store/useFavoritesStore';
import { useTheme } from '../../hooks/useTheme';
import { ConfirmSheet } from '../ui/ConfirmSheet';

function FavoriteItem({
  quote,
  onRemove,
  theme,
}: {
  quote: FavoriteQuote;
  onRemove: (id: string) => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.quoteText, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
        "{quote.text}"
      </Text>
      <Text style={[styles.authorText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
        {quote.author}
      </Text>
      <TouchableOpacity
        onPress={() => onRemove(quote.id)}
        style={styles.removeBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialCommunityIcons name="heart" size={18} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );
}

export default function FavoritesScreen({ onClose, onBack }: { onClose?: () => void; onBack?: () => void }) {
  const theme = useTheme();
  const router = useRouter();
  const close = onClose ?? (() => router.back());
  const back = onBack ?? close;
  const { favorites, removeFavorite, clearFavorites } = useFavoritesStore();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearAll = () => setShowClearConfirm(true);

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={back} style={[styles.backBtn, { backgroundColor: theme.surface }]}>
            <MaterialCommunityIcons name="chevron-left" size={22} color={theme.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
            Favorites
          </Text>
          {favorites.length > 0 ? (
            <TouchableOpacity onPress={handleClearAll}>
              <Text style={[styles.clearText, { color: theme.textMuted }]}>Clear all</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 60 }} />
          )}
        </View>

        {favorites.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="heart-outline" size={48} color={theme.textMuted} style={{ marginBottom: 16 }} />
            <Text style={[styles.emptyText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              No favorites yet
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              Tap the heart on any quote to save it here
            </Text>
          </View>
        ) : (
          <FlatList
            data={favorites}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <FavoriteItem quote={item} onRemove={removeFavorite} theme={theme} />
            )}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>

      <ConfirmSheet
        visible={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        title="Clear All Favorites"
        message="Are you sure you want to remove all favorites?"
        confirmLabel="Clear All"
        destructive
        cancelLabel="Cancel"
        onConfirm={clearFavorites}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  clearText: {
    fontSize: 13,
    width: 60,
    textAlign: 'right', fontFamily: FONTS.ui.regular
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginBottom: 12,
    position: 'relative',
  },
  quoteText: {
    fontSize: 17,
    lineHeight: 26,
    marginBottom: 12,
    paddingRight: 32,
  },
  authorText: {
    fontSize: 13,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  removeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
