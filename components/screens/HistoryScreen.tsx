import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Icon } from '../ui/Icon';
import { SheetHeader } from '../ui/SheetHeader';
import { QuoteListCard } from '../ui/QuoteListCard';
import { ConfirmSheet } from '../ui/ConfirmSheet';
import { AddToCollectionSheet } from '../collections/AddToCollectionSheet';
import { GUTTER, SPACE, RADIUS, ON_GOLD } from '../ui/tokens';
import { useTheme } from '../../hooks/useTheme';
import { useAppStore } from '../../store/useAppStore';
import { useRevenueCat } from '../../hooks/useRevenueCat';
import { useHistoryStore, HistoryQuote } from '../../store/useHistoryStore';
import { useFavoritesStore } from '../../store/useFavoritesStore';
import { useCollectionsStore } from '../../store/useCollectionsStore';
import { useShareStore } from '../../store/useShareStore';
import { useModal } from '../../contexts/ModalContext';
import { FONTS } from '../../constants/fonts';

/** Rows revealed per tap of "See older quotes". The store caps history at 100. */
const PAGE = 20;

export default function HistoryScreen({ onClose, onBack }: { onClose?: () => void; onBack?: () => void }) {
  const theme = useTheme();
  const router = useRouter();
  const modal = useModal();
  const hapticsEnabled = useAppStore((s) => s.preferences.hapticsEnabled);
  const { isPro, isLoading } = useRevenueCat();
  const { history, clearHistory } = useHistoryStore();
  const { toggleFavorite, favorites } = useFavoritesStore();
  const collections = useCollectionsStore((s) => s.collections);
  const setShareQuote = useShareStore((s) => s.setQuote);

  const [shown, setShown] = useState(PAGE);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [saving, setSaving] = useState<HistoryQuote | null>(null);

  const close = onClose ?? (() => router.back());
  const back = onBack ?? close;

  const favoriteIds = useMemo(() => new Set(favorites.map(f => f.id)), [favorites]);
  const savedIds = useMemo(
    () => new Set(collections.flatMap(c => c.quotes.map(q => q.id))),
    [collections],
  );

  const page = history.slice(0, shown);
  const hasOlder = shown < history.length;

  const handleUnlock = () => {
    modal ? modal.openSheet('trial') : router.push('/subscriptions');
  };

  const handleShare = (quote: HistoryQuote) => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShareQuote(quote.id, quote.text, quote.author);
    modal ? modal.openSheet('share') : router.push('/share');
  };

  // ── Pro gate ──────────────────────────────────────────────────────────────
  // Skipped while entitlements load, so the gate never flashes for a subscriber.
  if (!isLoading && !isPro) {
    return (
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <SheetHeader title="History" leading="back" onLeadingPress={back} />

          <View style={styles.gate}>
            <View style={[styles.gateIcon, { backgroundColor: theme.surface }]}>
              <Icon name="crown" size={32} color={theme.gold} />
            </View>
            <Text style={[styles.gateTitle, { color: theme.text }]}>History is Pro</Text>
            <Text style={[styles.gateBody, { color: theme.textMuted, fontFamily: theme.bodyFontFamily }]}>
              Upgrade to browse every quote you have read.
            </Text>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleUnlock}
              style={[styles.primaryBtn, { backgroundColor: theme.goldButton }]}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <Text style={[styles.primaryText, { color: ON_GOLD }]}>Unlock Pro</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <SheetHeader
          title="History"
          leading="back"
          onLeadingPress={back}
          actionLabel={history.length > 0 ? 'Clear' : undefined}
          onActionPress={history.length > 0 ? () => setShowClearConfirm(true) : undefined}
        />

        {history.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
              Nothing here yet
            </Text>
            <Text style={[styles.emptyBody, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              Every quote you read lands here.
            </Text>
          </View>
        ) : (
          <FlatList
            style={styles.list}
            data={page}
            keyExtractor={item => item.id + item.viewedAt}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <QuoteListCard
                text={item.text}
                date={item.viewedAt}
                actions={[
                  {
                    icon: favoriteIds.has(item.id) ? 'heart' : 'heart-outline',
                    accessibilityLabel: favoriteIds.has(item.id)
                      ? 'Remove from favorites'
                      : 'Add to favorites',
                    color: favoriteIds.has(item.id) ? (theme.favorite ?? theme.gold) : theme.textMuted,
                    onPress: () => {
                      if (hapticsEnabled) Haptics.selectionAsync();
                      toggleFavorite({
                        id: item.id,
                        text: item.text,
                        author: item.author,
                        category: item.category,
                      });
                    },
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

        {hasOlder && (
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={() => setShown(n => n + PAGE)}
              style={[styles.primaryBtn, { backgroundColor: theme.goldButton }]}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <Text style={[styles.primaryText, { color: ON_GOLD }]}>See older quotes</Text>
            </TouchableOpacity>
          </View>
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
        title="Clear history"
        message="Your reading history is emptied. Favorites and collections are untouched."
        confirmLabel="Clear"
        destructive
        cancelLabel="Cancel"
        onConfirm={() => {
          clearHistory();
          setShown(PAGE);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  // Without flex the list sizes to its content, and a short history would let
  // the "See older quotes" button float up under the last card.
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

  // ── Pro gate ──────────────────────────────────────────────────────────────
  gate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACE.xxl,
    gap: SPACE.md,
  },
  gateIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACE.xs,
  },
  gateTitle: {
    fontSize: 24,
    fontFamily: FONTS.display.bold,
    lineHeight: 32,
    includeFontPadding: false,
    textAlign: 'center',
  },
  gateBody: {
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
  },

  footer: {
    paddingHorizontal: GUTTER,
    paddingTop: SPACE.md,
    paddingBottom: SPACE.sm,
  },
  primaryBtn: {
    height: 58,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontSize: 18,
    fontFamily: FONTS.display.bold,
    lineHeight: 25,
    includeFontPadding: false,
  },
});
