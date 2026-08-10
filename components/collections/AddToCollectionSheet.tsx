import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHaptics } from '../../hooks/useHaptics';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { liquidGlassAvailable } from '../ui/GlassSurface';
import { GUTTER, SPACE, RADIUS, ON_GOLD, ICON_BTN } from '../ui/tokens';
import { useBaseTheme } from '../../hooks/useTheme';
import { useCollectionsStore, CollectionQuote } from '../../store/useCollectionsStore';
import { FONTS } from '../../constants/fonts';

interface Props {
  visible: boolean;
  quote: Omit<CollectionQuote, 'addedAt'>;
  onClose: () => void;
}

/**
 * Picker raised from the share sheet. Lists every collection with a checkmark
 * for the ones already holding this quote, and allows creating a new one
 * inline so saving never requires leaving the share flow.
 */
export function AddToCollectionSheet({ visible, quote, onClose }: Props) {
  const theme = useBaseTheme();
  const glass = liquidGlassAvailable();
  const insets = useSafeAreaInsets();
  const collections = useCollectionsStore((s) => s.collections);
  const createCollection = useCollectionsStore((s) => s.createCollection);
  const addQuote = useCollectionsStore((s) => s.addQuote);
  const removeQuote = useCollectionsStore((s) => s.removeQuote);
  const haptics = useHaptics();

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  const close = () => {
    setCreating(false);
    setName('');
    onClose();
  };

  const toggle = (collectionId: string, already: boolean) => {
    haptics.selection();
    if (already) removeQuote(collectionId, quote.id);
    else addQuote(collectionId, quote);
  };

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    haptics.selection();
    const id = createCollection(trimmed);
    addQuote(id, quote);
    setCreating(false);
    setName('');
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={close}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: theme.background,
                paddingTop: insets.top + SPACE.md,
                paddingBottom: insets.bottom + SPACE.lg,
              },
            ]}
          >
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.text }]}>Add to collection</Text>
              <IconButton
                icon="close"
                onPress={close}
                filled={glass}
                size={glass ? ICON_BTN.md : ICON_BTN.sm}
                iconSize={22}
                color={theme.textMuted}
                accessibilityLabel="Close"
              />
            </View>

            {creating ? (
              <View style={styles.createBlock}>
                <TextInput
                  style={[
                    styles.input,
                    { color: theme.text, backgroundColor: theme.surface, fontFamily: theme.uiFontFamily },
                  ]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Collection name"
                  placeholderTextColor={theme.textMuted}
                  autoFocus
                  maxLength={60}
                  returnKeyType="done"
                  onSubmitEditing={handleCreate}
                />
                <TouchableOpacity
                  onPress={handleCreate}
                  disabled={!name.trim()}
                  style={[
                    styles.saveBtn,
                    { backgroundColor: name.trim() ? theme.goldButton : theme.surface },
                  ]}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.saveText,
                      { color: name.trim() ? ON_GOLD : theme.textMuted },
                    ]}
                  >
                    Save
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
                  {collections.length === 0 && (
                    <Text style={[styles.empty, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                      No collections yet. Create one to start saving quotes.
                    </Text>
                  )}

                  {collections.map(c => {
                    const already = c.quotes.some(q => q.id === quote.id);
                    return (
                      <TouchableOpacity
                        key={c.id}
                        style={[styles.row, { backgroundColor: theme.surface }]}
                        onPress={() => toggle(c.id, already)}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel={`${already ? 'Remove from' : 'Add to'} ${c.name}`}
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
                        <View
                          style={[
                            styles.check,
                            already
                              ? { backgroundColor: theme.gold, borderColor: theme.gold }
                              : { borderColor: theme.border },
                          ]}
                        >
                          {already && <Icon name="check" size={14} color={ON_GOLD} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <TouchableOpacity
                  onPress={() => setCreating(true)}
                  style={[styles.newBtn, { borderColor: theme.border }]}
                  accessibilityRole="button"
                >
                  <Icon name="plus" size={20} color={theme.gold} />
                  <Text style={[styles.newText, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
                    New collection
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  // Full height, matching every other sheet in the app. Sizing to content left
  // it squished against the bottom edge when there were only a few rows.
  sheet: {
    flex: 1,
    paddingHorizontal: GUTTER,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACE.md,
    gap: SPACE.md,
  },
  title: {
    fontSize: 22,
    fontFamily: FONTS.display.bold,
    lineHeight: 28,
    includeFontPadding: false,
  },
  list: {
    flex: 1,
    marginBottom: SPACE.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    minHeight: 64,
    borderRadius: RADIUS.card,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.md,
    marginBottom: SPACE.sm,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 16,
  },
  rowMeta: {
    fontSize: 13,
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingVertical: SPACE.xl,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.sm,
    height: 56,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  newText: {
    fontSize: 16,
  },
  createBlock: {
    flex: 1,
    gap: SPACE.md,
    paddingBottom: SPACE.md,
  },
  input: {
    height: 56,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.lg,
    fontSize: 16,
  },
  saveBtn: {
    marginTop: 'auto',
    height: 56,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontSize: 17,
    fontFamily: FONTS.display.bold,
    lineHeight: 24,
    includeFontPadding: false,
  },
});
