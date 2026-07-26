import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useUserQuotesStore, UserQuote } from '../../store/useUserQuotesStore';
import { ConfirmSheet } from '../ui/ConfirmSheet';

type Mode = 'list' | 'form';
const MAX_CHARS = 300;

export default function MyQuotesScreen({ onClose, onBack }: { onClose?: () => void; onBack?: () => void }) {
  const theme = useTheme();
  const router = useRouter();
  const { userQuotes, addQuote, editQuote, removeQuote } = useUserQuotesStore();

  const [mode, setMode] = useState<Mode>('list');
  const [editingQuote, setEditingQuote] = useState<UserQuote | null>(null);
  const [draftText, setDraftText] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const close = onClose ?? (() => router.back());
  const back = onBack ?? close;

  const openAdd = () => {
    setEditingQuote(null);
    setDraftText('');
    setMode('form');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const openEdit = (quote: UserQuote) => {
    setEditingQuote(quote);
    setDraftText(quote.text);
    setMode('form');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSave = () => {
    const trimmed = draftText.trim();
    if (!trimmed) return;
    if (editingQuote) {
      editQuote(editingQuote.id, trimmed, 'Me');
    } else {
      addQuote(trimmed, 'Me');
    }
    setMode('list');
  };

  const handleDelete = (id: string) => setDeleteId(id);

  const canSave = draftText.trim().length > 0 && draftText.trim().length <= MAX_CHARS;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Drag handle — hidden when used inline (BottomSheet has its own) */}
      {!onClose && (
        <View style={styles.dragHandle}>
          <View style={[styles.dragPill, { backgroundColor: theme.border }]} />
        </View>
      )}

      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {mode === 'list' ? (
          <>
            {/* ── List header ── */}
            <View style={styles.header}>
              <TouchableOpacity onPress={back} style={styles.iconBtn}>
                <MaterialCommunityIcons name="chevron-left" size={24} color={theme.textMuted} />
              </TouchableOpacity>
              <Text style={[styles.title, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
                My Quotes
              </Text>
              <TouchableOpacity onPress={openAdd} style={styles.iconBtn}>
                <MaterialCommunityIcons name="plus" size={24} color={theme.gold} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            >
              {userQuotes.length === 0 ? (
                /* ── Empty state ── */
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="feather" size={52} color={theme.textMuted} />
                  <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
                    Your voice, your wisdom
                  </Text>
                  <Text style={[styles.emptyBody, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                    Write quotes you've crafted or collected.
                    {'\n'}Enable them in Mix to see them in your feed.
                  </Text>
                  <TouchableOpacity
                    onPress={openAdd}
                    style={[styles.emptyAddBtn, { backgroundColor: theme.gold }]}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="plus" size={18} color="#1A1208" />
                    <Text style={[styles.emptyAddText, { color: '#1A1208', fontFamily: theme.uiFontFamily }]}>
                      Add your first quote
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {/* ── Quote list ── */}
                  {userQuotes.map((q) => (
                    <View
                      key={q.id}
                      style={[styles.quoteRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
                    >
                      <Text
                        style={[styles.quoteRowText, { color: theme.text, fontFamily: theme.quoteFontFamily }]}
                        numberOfLines={4}
                      >
                        {q.text}
                      </Text>
                      <View style={styles.rowActions}>
                        <TouchableOpacity
                          onPress={() => openEdit(q)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <MaterialCommunityIcons name="pencil-outline" size={19} color={theme.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDelete(q.id)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <MaterialCommunityIcons name="trash-can-outline" size={19} color={theme.textMuted} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}

                  {/* ── Add more ── */}
                  <TouchableOpacity
                    onPress={openAdd}
                    style={[styles.addMoreRow, { borderColor: theme.border }]}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name="plus" size={18} color={theme.textMuted} />
                    <Text style={[styles.addMoreText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                      Add another quote
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </>
        ) : (
          <>
            {/* ── Form header ── */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setMode('list')} style={styles.iconBtn}>
                <MaterialCommunityIcons name="arrow-left" size={20} color={theme.textMuted} />
              </TouchableOpacity>
              <Text style={[styles.title, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
                {editingQuote ? 'Edit Quote' : 'New Quote'}
              </Text>
              <View style={styles.iconBtn} />
            </View>

            <View style={styles.formContent}>
              <TextInput
                ref={inputRef}
                value={draftText}
                onChangeText={setDraftText}
                placeholder="Write your quote here…"
                placeholderTextColor={theme.textMuted}
                multiline
                maxLength={MAX_CHARS}
                style={[
                  styles.textInput,
                  {
                    color: theme.text,
                    fontFamily: theme.quoteFontFamily,
                    borderColor: draftText.length > 0 ? theme.gold + '40' : theme.border,
                    backgroundColor: theme.surface,
                  },
                ]}
                textAlignVertical="top"
                autoCorrect
                autoCapitalize="sentences"
              />
              <Text style={[styles.charCount, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                {draftText.length}/{MAX_CHARS}
              </Text>

              <TouchableOpacity
                onPress={handleSave}
                disabled={!canSave}
                style={[
                  styles.saveBtn,
                  { backgroundColor: canSave ? theme.goldButton : theme.surface },
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.saveBtnText,
                    { color: canSave ? '#1A1208' : theme.textMuted, fontFamily: theme.uiFontFamily },
                  ]}
                >
                  {editingQuote ? 'Save Changes' : 'Add Quote'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </SafeAreaView>

      <ConfirmSheet
        visible={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Delete Quote"
        message="Remove this quote from your collection?"
        confirmLabel="Delete"
        destructive
        cancelLabel="Cancel"
        onConfirm={() => { if (deleteId) removeQuote(deleteId); }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  dragHandle: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  dragPill: { width: 36, height: 4, borderRadius: 2 },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },

  // ── List ──
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 40,
  },

  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyBody: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
    marginTop: 16,
  },
  emptyAddText: {
    fontSize: 15,
    fontWeight: '600',
  },

  quoteRow: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  quoteRowText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 26,
  },
  rowActions: {
    gap: 16,
    paddingTop: 2,
  },

  addMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addMoreText: {
    fontSize: 14,
  },

  // ── Form ──
  formContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    fontSize: 20,
    lineHeight: 32,
    minHeight: 200,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
    marginRight: 4,
  },
  saveBtn: {
    marginTop: 20,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
