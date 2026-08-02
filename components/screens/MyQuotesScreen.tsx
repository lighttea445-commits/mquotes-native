import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SheetHeader } from '../ui/SheetHeader';
import { SearchField } from '../ui/SearchField';
import { QuoteListCard } from '../ui/QuoteListCard';
import { ConfirmSheet } from '../ui/ConfirmSheet';
import { GUTTER, SPACE, RADIUS, ON_GOLD } from '../ui/tokens';
import { useTheme } from '../../hooks/useTheme';
import { useAppStore } from '../../store/useAppStore';
import { useUserQuotesStore, UserQuote } from '../../store/useUserQuotesStore';
import { useShareStore } from '../../store/useShareStore';
import { useModal } from '../../contexts/ModalContext';
import { FONTS } from '../../constants/fonts';

type Mode = 'list' | 'form';
const MAX_CHARS = 300;

export default function MyQuotesScreen({ onClose, onBack }: { onClose?: () => void; onBack?: () => void }) {
  const theme = useTheme();
  const router = useRouter();
  const modal = useModal();
  const hapticsEnabled = useAppStore((s) => s.preferences.hapticsEnabled);
  const { userQuotes, addQuote, editQuote, removeQuote } = useUserQuotesStore();
  const setShareQuote = useShareStore((s) => s.setQuote);

  const [mode, setMode] = useState<Mode>('list');
  const [editing, setEditing] = useState<UserQuote | null>(null);
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const close = onClose ?? (() => router.back());
  const back = onBack ?? close;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? userQuotes.filter(u => u.text.toLowerCase().includes(q)) : userQuotes;
  }, [userQuotes, query]);

  const openForm = (quote: UserQuote | null) => {
    setEditing(quote);
    setDraft(quote?.text ?? '');
    setMode('form');
    // The sheet is still animating in on a cold open; focusing immediately
    // raises the keyboard before the input has a position on screen.
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSave = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (hapticsEnabled) Haptics.selectionAsync();
    if (editing) editQuote(editing.id, trimmed, 'Me');
    else addQuote(trimmed, 'Me');
    setMode('list');
  };

  const handleShare = (quote: UserQuote) => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShareQuote(quote.id, quote.text, quote.author);
    modal ? modal.openSheet('share') : router.push('/share');
  };

  const canSave = draft.trim().length > 0;

  // ── Add / edit ────────────────────────────────────────────────────────────
  if (mode === 'form') {
    return (
      <KeyboardAvoidingView
        style={[styles.root, { backgroundColor: theme.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <SheetHeader
            title={editing ? 'Edit quote' : 'Add new'}
            leading="back"
            onLeadingPress={() => setMode('list')}
          />

          <View style={styles.body}>
            <Text style={[styles.blurb, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
              Add your own quote. It will only be visible to you.
            </Text>

            <TextInput
              ref={inputRef}
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.surface, fontFamily: theme.uiFontFamily },
              ]}
              value={draft}
              onChangeText={setDraft}
              placeholder="Quote"
              placeholderTextColor={theme.textMuted}
              multiline
              maxLength={MAX_CHARS}
              textAlignVertical="top"
              autoCapitalize="sentences"
            />
            <Text style={[styles.counter, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              {draft.length}/{MAX_CHARS}
            </Text>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleSave}
              disabled={!canSave}
              style={[
                styles.primaryBtn,
                { backgroundColor: canSave ? theme.goldButton : theme.surface },
              ]}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <Text style={[styles.primaryText, { color: canSave ? ON_GOLD : theme.textMuted }]}>
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    );
  }

  // ── List ──────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <SheetHeader
          title="My quotes"
          leading="back"
          onLeadingPress={back}
          actionLabel="Add"
          onActionPress={() => openForm(null)}
        />

        {userQuotes.length > 0 && (
          <View style={styles.search}>
            <SearchField
              value={query}
              onChangeText={setQuery}
              accessibilityLabel="Search your quotes"
            />
          </View>
        )}

        {userQuotes.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
              Your voice, your wisdom
            </Text>
            <Text style={[styles.emptyBody, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              Write quotes you have crafted or collected. Enable them in Mix to see them in your feed.
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
                date={item.createdAt}
                actions={[
                  {
                    icon: 'pencil-outline',
                    accessibilityLabel: 'Edit this quote',
                    onPress: () => openForm(item),
                  },
                  {
                    icon: 'trash-can-outline',
                    accessibilityLabel: 'Delete this quote',
                    onPress: () => setDeleteId(item.id),
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

        <View style={styles.footer}>
          <TouchableOpacity
            onPress={() => openForm(null)}
            style={[styles.primaryBtn, { backgroundColor: theme.goldButton }]}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Text style={[styles.primaryText, { color: ON_GOLD }]}>Add</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ConfirmSheet
        visible={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Delete quote"
        message="This removes the quote from your own collection for good."
        confirmLabel="Delete"
        destructive
        cancelLabel="Cancel"
        onConfirm={() => { if (deleteId) removeQuote(deleteId); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },

  // ── List ──────────────────────────────────────────────────────────────────
  search: {
    paddingHorizontal: GUTTER,
    paddingBottom: SPACE.lg,
  },
  // Without flex the list sizes to its content, and one or two quotes would let
  // the pinned Add button float up under the last card.
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

  // ── Form ──────────────────────────────────────────────────────────────────
  body: {
    flex: 1,
    paddingHorizontal: GUTTER,
    gap: SPACE.xl,
  },
  blurb: {
    fontSize: 17,
    lineHeight: 25,
  },
  // A quote runs to 300 characters, so this is a card rather than the single
  // line pill used for a collection name.
  input: {
    minHeight: 160,
    borderRadius: RADIUS.card,
    padding: SPACE.lg,
    fontSize: 17,
    lineHeight: 25,
  },
  counter: {
    fontSize: 13,
    textAlign: 'right',
    marginTop: -SPACE.lg,
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
