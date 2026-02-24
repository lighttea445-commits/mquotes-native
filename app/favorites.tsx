import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ThemeBackground } from '../components/layout/ThemeBackground';
import { useFavoritesStore, FavoriteQuote } from '../store/useFavoritesStore';
import { useTheme } from '../hooks/useTheme';

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
        — {quote.author}
      </Text>
      <TouchableOpacity
        onPress={() => onRemove(quote.id)}
        style={styles.removeBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={{ color: '#ef4444', fontSize: 18 }}>♥</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function FavoritesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { favorites, removeFavorite, clearFavorites } = useFavoritesStore();

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Favorites',
      'Are you sure you want to remove all favorites?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: clearFavorites },
      ],
    );
  };

  return (
    <ThemeBackground>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={[styles.backText, { color: theme.textMuted }]}>‹</Text>
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
            <Text style={{ fontSize: 48, marginBottom: 16 }}>♡</Text>
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
    </ThemeBackground>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 28,
    lineHeight: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  clearText: {
    fontSize: 13,
    width: 60,
    textAlign: 'right',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderRadius: 16,
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
