import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useHaptics } from '../../hooks/useHaptics';
import { Icon } from '../ui/Icon';
import { SheetHeader } from '../ui/SheetHeader';
import { IconButton } from '../ui/IconButton';
import { ConfirmSheet } from '../ui/ConfirmSheet';
import { liquidGlassAvailable } from '../ui/GlassSurface';
import { GUTTER, SPACE, RADIUS, ON_GOLD, ICON_BTN } from '../ui/tokens';
import { useTheme } from '../../hooks/useTheme';
import { useCollectionsStore } from '../../store/useCollectionsStore';
import { useFavoritesStore } from '../../store/useFavoritesStore';
import { useShareStore } from '../../store/useShareStore';
import { useModal } from '../../contexts/ModalContext';
import { releaseCollectionReferences } from '../../lib/collectionRefs';
import { FONTS } from '../../constants/fonts';

type View_ = 'list' | 'new' | 'detail';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function CollectionsScreen({ onClose, onBack }: { onClose?: () => void; onBack?: () => void }) {
  const theme = useTheme();
  const router = useRouter();
  const modal = useModal();
  const haptics = useHaptics();
  const collections = useCollectionsStore((s) => s.collections);
  const createCollection = useCollectionsStore((s) => s.createCollection);
  const deleteCollection = useCollectionsStore((s) => s.deleteCollection);
  const removeQuote = useCollectionsStore((s) => s.removeQuote);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const isFavorite = useFavoritesStore((s) => s.isFavorite);
  const setShareQuote = useShareStore((s) => s.setQuote);

  const glass = liquidGlassAvailable();

  const [view, setView] = useState<View_>('list');
  const [name, setName] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const close = onClose ?? (() => router.back());
  const back = onBack ?? close;
  const active = collections.find(c => c.id === activeId) ?? null;

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    haptics.selection();
    const id = createCollection(trimmed);
    setName('');
    setActiveId(id);
    setView('detail');
  };

  const handleShare = (q: { id: string; text: string; author: string }) => {
    haptics.impact();
    setShareQuote(q.id, q.text, q.author);
    modal ? modal.openSheet('share') : router.push('/share');
  };

  // ── New collection ────────────────────────────────────────────────────────
  if (view === 'new') {
    return (
      <KeyboardAvoidingView
        style={[styles.root, { backgroundColor: theme.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <SheetHeader
            title="New collection"
            leading="back"
            onLeadingPress={() => { setName(''); setView('list'); }}
          />

          <View style={styles.body}>
            <Text style={[styles.blurb, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
              Enter a name for your new collection. You can rename it later.
            </Text>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.surface, fontFamily: theme.uiFontFamily }]}
              value={name}
              onChangeText={setName}
              placeholder="Collection name"
              placeholderTextColor={theme.textMuted}
              autoFocus
              maxLength={60}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleSave}
              disabled={!name.trim()}
              style={[styles.primaryBtn, { backgroundColor: name.trim() ? theme.goldButton : theme.surface }]}
              accessibilityRole="button"
            >
              <Text style={[styles.primaryText, { color: name.trim() ? ON_GOLD : theme.textMuted }]}>
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    );
  }

  // ── One collection ────────────────────────────────────────────────────────
  if (view === 'detail' && active) {
    return (
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <SheetHeader
            title={active.name}
            leading="back"
            onLeadingPress={() => { setActiveId(null); setView('list'); }}
            actionLabel="Delete"
            onActionPress={() => setConfirmDelete(true)}
          />

          <ScrollView
            style={styles.scrollFlex}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
          >
            {active.quotes.length === 0 ? (
              <Text style={[styles.empty, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                Nothing saved yet. Use “Add to collection” on the share screen to fill this up.
              </Text>
            ) : (
              active.quotes.map(q => {
                const favorited = isFavorite(q.id);
                return (
                  <View key={q.id} style={[styles.card, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.cardText, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
                      {q.text}
                    </Text>
                    <View style={styles.cardFooter}>
                      <Text style={[styles.cardDate, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                        {formatDate(q.addedAt)}
                      </Text>
                      <View style={styles.cardActions}>
                        <TouchableOpacity
                          onPress={() => toggleFavorite({ id: q.id, text: q.text, author: q.author, category: 'general' })}
                          hitSlop={10}
                          accessibilityLabel={favorited ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Icon
                            name={favorited ? 'heart' : 'heart-outline'}
                            size={22}
                            color={favorited ? (theme.favorite ?? theme.gold) : theme.textMuted}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => removeQuote(active.id, q.id)}
                          hitSlop={10}
                          accessibilityLabel="Remove from this collection"
                        >
                          <Icon name="bookmark" size={22} color={theme.gold} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleShare(q)}
                          hitSlop={10}
                          accessibilityLabel="Share"
                        >
                          <Icon name="export-variant" size={22} color={theme.textMuted} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </SafeAreaView>

        <ConfirmSheet
          visible={confirmDelete}
          title={`Delete “${active.name}”?`}
          message="The collection is removed. The quotes themselves stay in your favorites and history."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          destructive
          onConfirm={() => {
            const deletedId = active.id;
            deleteCollection(deletedId);
            // Any widget or reminder pointing here is re-pointed at General,
            // rather than left naming a collection that no longer exists.
            releaseCollectionReferences(deletedId).catch(() => {});
            setConfirmDelete(false);
            setActiveId(null);
            setView('list');
          }}
          onClose={() => setConfirmDelete(false)}
        />
      </View>
    );
  }

  // ── List ──────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <SheetHeader
          title="Collections"
          leading="back"
          onLeadingPress={back}
          right={
            <IconButton
              icon="plus"
              onPress={() => setView('new')}
              // Mirrors the leading control: liquid glass on iOS 26, a bare
              // glyph everywhere else.
              filled={glass}
              size={glass ? ICON_BTN.md : ICON_BTN.sm}
              iconSize={glass ? 22 : 26}
              color={theme.gold}
              accessibilityLabel="New collection"
            />
          }
        />

        <ScrollView
          style={styles.scrollFlex}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {collections.length === 0 ? (
            <Text style={[styles.empty, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              No collections yet. Group quotes however you like: by mood, by theme, by whatever you are working on.
            </Text>
          ) : (
            collections.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.row, { backgroundColor: theme.surface }]}
                onPress={() => { setActiveId(c.id); setView('detail'); }}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <View style={styles.rowText}>
                  <Text
                    style={[styles.rowTitle, { color: theme.text, fontFamily: theme.uiFontFamily }]}
                    numberOfLines={1}
                  >
                    {c.name}
                  </Text>
                  <Text style={[styles.rowMeta, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                    {c.quotes.length} {c.quotes.length === 1 ? 'quote' : 'quotes'}
                  </Text>
                </View>
                <Icon name="chevron-right" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            onPress={() => setView('new')}
            style={[styles.primaryBtn, { backgroundColor: theme.goldButton }]}
            accessibilityRole="button"
          >
            <Text style={[styles.primaryText, { color: ON_GOLD }]}>Add</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  // flex:1 so the screen fills the sheet and the footer button pins to the
  // bottom instead of sitting directly under the input.
  body: {
    flex: 1,
    paddingHorizontal: GUTTER,
    gap: SPACE.xl,
  },
  scrollFlex: {
    flex: 1,
  },
  blurb: {
    fontSize: 17,
    lineHeight: 25,
  },
  input: {
    height: 58,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.lg,
    fontSize: 16,
  },
  scroll: {
    paddingHorizontal: GUTTER,
    paddingBottom: SPACE.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    minHeight: 76,
    borderRadius: RADIUS.card,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.md,
    marginBottom: SPACE.md,
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    fontSize: 17,
  },
  rowMeta: {
    fontSize: 14,
  },
  card: {
    borderRadius: RADIUS.card,
    padding: SPACE.lg,
    marginBottom: SPACE.md,
    gap: SPACE.lg,
  },
  cardText: {
    fontSize: 17,
    lineHeight: 25,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACE.md,
  },
  cardDate: {
    flex: 1,
    fontSize: 13,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xl,
  },
  empty: {
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    paddingVertical: SPACE.xxl,
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
