import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTheme } from '../hooks/useTheme';
import { useReflectStore, MOODS, MoodLabel } from '../store/useReflectStore';

type Step = 'mood' | 'write';

export default function ReflectScreen({ onClose }: { onClose?: () => void }) {
  const theme = useTheme();
  const router = useRouter();
  const close = onClose ?? (() => router.back());
  const dailyQuote = useReflectStore(s => s.dailyQuote);
  const getTodaysReflection = useReflectStore(s => s.getTodaysReflection);
  const saveReflection = useReflectStore(s => s.saveReflection);

  const existing = getTodaysReflection();

  const [step, setStep] = useState<Step>(existing ? 'write' : 'mood');
  const [selectedMood, setSelectedMood] = useState<MoodLabel | null>(
    existing ? existing.mood as MoodLabel : null,
  );
  const [text, setText] = useState(existing?.reflectionText ?? '');

  useEffect(() => {
    const e = getTodaysReflection();
    if (e) {
      setSelectedMood(e.mood as MoodLabel);
      setText(e.reflectionText);
      setStep('write');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMoodSelect = (mood: MoodLabel) => {
    Haptics.selectionAsync();
    setSelectedMood(mood);
    setStep('write');
  };

  const handleBack = () => {
    setStep('mood');
  };

  const canSave = !!selectedMood && text.trim().length > 0;
  const isUpdate = !!existing;

  const handleSave = () => {
    if (!canSave) return;
    saveReflection(selectedMood!, text.trim());
    close();
  };

  // ── Step 1: Mood picker ──────────────────────────────────────────────────
  if (step === 'mood') {
    return (
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={close}
            style={[styles.closeBtn, { backgroundColor: theme.surface }]}
          >
            <MaterialCommunityIcons name="close" size={20} color={theme.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
            Daily Reflect
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.moodStep}>
          <Text style={[styles.moodQuestion, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
            How are you feeling?
          </Text>
          <Text style={[styles.moodSubtext, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
            Select your mood to begin today's reflection
          </Text>

          <View style={styles.moodList}>
            {MOODS.map(m => (
              <TouchableOpacity
                key={m.label}
                onPress={() => handleMoodSelect(m.label)}
                style={[
                  styles.moodRow,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name={m.icon as any} size={24} color={theme.gold} />
                <Text style={[styles.moodRowLabel, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
                  {m.label}
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  }

  // ── Step 2: Reflection writer ────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={[styles.closeBtn, { backgroundColor: theme.surface }]}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={theme.textMuted} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <MaterialCommunityIcons
            name={(MOODS.find(m => m.label === selectedMood)?.icon ?? 'emoticon-neutral-outline') as any}
            size={22}
            color={theme.gold}
          />
          <Text style={[styles.headerTitle, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
            {selectedMood}
          </Text>
        </View>
        <TouchableOpacity
          onPress={close}
          style={[styles.closeBtn, { backgroundColor: theme.surface }]}
        >
          <MaterialCommunityIcons name="close" size={20} color={theme.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.writeContent}
        keyboardShouldPersistTaps="handled"
      >
        {dailyQuote && (
          <View style={[styles.quoteBlock, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.quoteText, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
              "{dailyQuote.quoteText}"
            </Text>
            <Text style={[styles.quoteAuthor, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              — {dailyQuote.quoteAuthor}
            </Text>
          </View>
        )}

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              color: theme.text,
              fontFamily: theme.uiFontFamily,
            },
          ]}
          multiline
          textAlignVertical="top"
          placeholder="What does this quote mean to you today?"
          placeholderTextColor={theme.textMuted}
          value={text}
          onChangeText={setText}
          autoFocus
        />

        <TouchableOpacity
          onPress={handleSave}
          disabled={!canSave}
          style={[styles.saveBtn, { opacity: canSave ? 1 : 0.4 }]}
          activeOpacity={0.85}
        >
          <Text style={[styles.saveBtnText, { fontFamily: theme.uiFontFamily }]}>
            {isUpdate ? 'Update Reflection' : 'Save Reflection'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  // Step 1 — mood picker
  moodStep: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  moodQuestion: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 6,
  },
  moodSubtext: {
    fontSize: 14,
    marginBottom: 28,
    lineHeight: 20,
  },
  moodList: {
    gap: 10,
  },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  moodRowLabel: {
    flex: 1,
    fontSize: 16,
  },

  // Step 2 — write
  writeContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 14,
  },
  quoteBlock: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    gap: 10,
  },
  quoteText: {
    fontSize: 18,
    lineHeight: 28,
  },
  quoteAuthor: {
    fontSize: 13,
    letterSpacing: 0.3,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 140,
  },
  saveBtn: {
    backgroundColor: '#B8975A',
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    color: '#1A1208',
    fontSize: 16,
    fontWeight: '600',
  },
});
