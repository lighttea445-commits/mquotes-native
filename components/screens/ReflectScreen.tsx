import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { useReflectStore, MOODS, MoodLabel } from '../../store/useReflectStore';
import { useModal } from '../../contexts/ModalContext';

// ─── Rotating copy ────────────────────────────────────────────────────────────

const MOOD_TITLES = [
  'How are you?',
  "What's the weather inside?",
  'How does today feel?',
  "How's today landing?",
  'Where are you, right now?',
];

const SAVE_LABELS = [
  'Save reflection',
  'Keep this one',
  'Save for later',
];

const SAVED_TOASTS = ['Saved.', 'Kept.', 'Captured.', 'Noted.'];

const PROMPTS: Record<string, string[]> = {
  Great: [
    "What's giving you this lift today?",
    'What would you like to remember about this moment?',
    'How can you carry this forward?',
  ],
  Good: [
    "What's going right today?",
    'Where does this ring true for you?',
    'What part of your day does this touch?',
  ],
  Neutral: [
    'What does this quote mean to you today?',
    'Where are you sitting with this one?',
    'What would it look like to take this seriously?',
  ],
  Bad: [
    'What needs a little gentleness today?',
    'Is there something this quote is offering you?',
    "What's under the surface right now?",
  ],
  Terrible: [
    'What part of today needs kindness?',
    'If this quote were speaking to you, what would it say?',
    "Write what you'd tell a friend going through this.",
  ],
  _default: [
    'What does this quote mean to you today?',
    'How does this resonate where you are right now?',
    'What thought or memory does this bring up?',
  ],
};

function pickIndex(len: number): number { return Math.floor(Math.random() * len); }

// ─── Mood chip (no glow ring — just gradient dot + label) ─────────────────────

function MoodChip({
  mood,
  selected,
  onPress,
  theme,
}: {
  mood: typeof MOODS[number];
  selected: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const scale   = useSharedValue(selected ? 1.14 : 1);
  const opacity = useSharedValue(selected ? 1 : 0.55);

  useEffect(() => {
    scale.value   = withSpring(selected ? 1.14 : 1, { damping: 14, stiffness: 220 });
    opacity.value = withTiming(selected ? 1 : 0.55, { duration: 220 });
  }, [selected]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Pressable onPress={onPress} style={chipStyles.wrap} hitSlop={6}>
      <Animated.View style={dotStyle}>
        <LinearGradient
          colors={[mood.colorLight, mood.color]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={chipStyles.dot}
        >
          <MaterialCommunityIcons name={mood.icon as any} size={22} color="#F7F2E6" />
        </LinearGradient>
      </Animated.View>
      <Text
        numberOfLines={1}
        style={[
          chipStyles.label,
          {
            color: selected ? theme.text : theme.textMuted,
            fontFamily: theme.uiFontFamily,
            fontWeight: selected ? '600' : '500',
          },
        ]}
      >
        {mood.label}
      </Text>
    </Pressable>
  );
}

const chipStyles = StyleSheet.create({
  wrap: { alignItems: 'center', width: 54 },
  dot: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  label: { marginTop: 10, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase' },
});

// ─── Mood card (the centered entry point) ─────────────────────────────────────

function MoodCard({
  title,
  selectedMood,
  onPickMood,
  theme,
}: {
  title: string;
  selectedMood: MoodLabel | null;
  onPickMood: (m: MoodLabel) => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={[moodCardStyles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text
        style={[
          moodCardStyles.title,
          { color: theme.text, fontFamily: theme.quoteFontFamily },
        ]}
      >
        {title}
      </Text>
      <View style={moodCardStyles.strip}>
        {MOODS.map(m => (
          <MoodChip
            key={m.label}
            mood={m}
            selected={selectedMood === m.label}
            onPress={() => onPickMood(m.label)}
            theme={theme}
          />
        ))}
      </View>
    </View>
  );
}

const moodCardStyles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 22,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 18,
  },
  strip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ReflectScreen({ onClose }: { onClose?: () => void }) {
  const theme = useTheme();
  const router = useRouter();
  const modal = useModal();
  const close = onClose ?? (() => router.back());

  const dailyQuote = useReflectStore(s => s.dailyQuote);
  const getTodaysReflection = useReflectStore(s => s.getTodaysReflection);
  const saveReflection = useReflectStore(s => s.saveReflection);

  const existing = useMemo(() => getTodaysReflection(), []); // eslint-disable-line react-hooks/exhaustive-deps
  const isUpdate = !!existing;

  const [selectedMood, setSelectedMood] = useState<MoodLabel | null>(
    existing ? (existing.mood as MoodLabel) : null,
  );
  const [text, setText] = useState(existing?.reflectionText ?? '');
  const [moodTitleIdx] = useState(() => pickIndex(MOOD_TITLES.length));
  const [saveLabelIdx] = useState(() => pickIndex(SAVE_LABELS.length));
  const [toastIdx]     = useState(() => pickIndex(SAVED_TOASTS.length));
  const [promptIdx, setPromptIdx] = useState(0);
  const [saved, setSaved] = useState(false);

  // Revealed = true if editing or once a mood has been picked
  const [revealed, setRevealed] = useState(isUpdate);
  const reveal = useSharedValue(isUpdate ? 1 : 0);

  // Measure viewport to center the mood card pre-reveal
  const [viewportH, setViewportH] = useState(0);
  const MOOD_CARD_H = 160; // approx — used to compute the centering offset
  const centerY = Math.max(0, (viewportH - MOOD_CARD_H) / 2 - 24);

  const moodTitle = MOOD_TITLES[moodTitleIdx];
  const prompts = PROMPTS[selectedMood ?? '_default'] ?? PROMPTS._default;
  const currentPrompt = prompts[promptIdx % prompts.length];

  useEffect(() => { setPromptIdx(0); }, [selectedMood]);

  // Animated styles for the reveal
  const moodWrapStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - reveal.value) * centerY }],
  }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{ translateY: (1 - reveal.value) * 16 }],
  }));

  // Save-moment animations
  const glowOpacity  = useSharedValue(0);
  const glowStyle    = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));
  const savedScale   = useSharedValue(0.9);
  const savedOpacity = useSharedValue(0);
  const savedStyle   = useAnimatedStyle(() => ({
    opacity: savedOpacity.value,
    transform: [{ scale: savedScale.value }],
  }));

  const handleMood = (m: MoodLabel) => {
    Haptics.selectionAsync();
    setSelectedMood(m);
    if (!revealed) {
      setRevealed(true);
      reveal.value = withDelay(
        60,
        withSpring(1, { damping: 22, stiffness: 180, mass: 0.9 }),
      );
    }
  };

  const handleCyclePrompt = () => {
    Haptics.selectionAsync();
    setPromptIdx(i => i + 1);
  };

  const canSave = !!selectedMood && text.trim().length > 0 && !saved;

  const handleSave = () => {
    if (!canSave) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    saveReflection(selectedMood!, text.trim());
    setSaved(true);

    glowOpacity.value = withSequence(
      withTiming(1, { duration: 320 }),
      withTiming(0, { duration: 720 }),
    );
    savedOpacity.value = withTiming(1, { duration: 260 });
    savedScale.value   = withSpring(1, { damping: 14, stiffness: 220 });

    setTimeout(close, 1150);
  };

  const handleOpenReflections = () => {
    Haptics.selectionAsync();
    if (modal) modal.openSheet('journal');
    else router.push('/journal');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={close}
          style={[styles.iconBtn, { backgroundColor: theme.surface }]}
          hitSlop={8}
        >
          <MaterialCommunityIcons name="close" size={20} color={theme.textMuted} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
          {isUpdate ? 'TODAY' : 'REFLECT'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Viewport that holds the revealing layout — hidden until measured to avoid position flash */}
      <View
        style={{ flex: 1, opacity: viewportH > 0 ? 1 : 0 }}
        onLayout={e => setViewportH(e.nativeEvent.layout.height)}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={revealed}
        >
          {/* Mood card — translates from centered to top */}
          <Animated.View style={moodWrapStyle}>
            <MoodCard
              title={moodTitle}
              selectedMood={selectedMood}
              onPickMood={handleMood}
              theme={theme}
            />
          </Animated.View>

          {/* Everything else — fades in once a mood is picked */}
          <Animated.View
            style={[styles.revealedBlock, contentStyle]}
            pointerEvents={revealed ? 'auto' : 'none'}
          >
            {/* Quote */}
            {dailyQuote && (
              <View style={styles.quoteWrap}>
                <Animated.View
                  style={[styles.quoteGlow, { shadowColor: theme.gold }, glowStyle]}
                  pointerEvents="none"
                />
                <View style={[styles.quoteRule, { backgroundColor: theme.gold }]} />
                <View style={styles.quoteBody}>
                  <Text style={[styles.quoteText, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
                    {dailyQuote.quoteText}
                  </Text>
                  <Text style={[styles.quoteAuthor, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                    — {dailyQuote.quoteAuthor}
                  </Text>
                </View>
              </View>
            )}

            {/* Prompt */}
            <View style={styles.promptRow}>
              <Text style={[styles.promptText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                {currentPrompt}
              </Text>
              <TouchableOpacity
                onPress={handleCyclePrompt}
                style={[styles.promptRefresh, { backgroundColor: theme.gold + '1F' }]}
                hitSlop={8}
              >
                <MaterialCommunityIcons name="refresh" size={13} color={theme.gold} />
              </TouchableOpacity>
            </View>

            {/* Input */}
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  fontFamily: theme.uiFontFamily,
                  borderBottomColor: theme.border,
                },
              ]}
              multiline
              textAlignVertical="top"
              placeholder="Write freely…"
              placeholderTextColor={theme.textMuted + '99'}
              value={text}
              onChangeText={setText}
              editable={!saved}
            />

            {/* CTA / Saved state */}
            {!saved ? (
              <TouchableOpacity
                onPress={handleSave}
                disabled={!canSave}
                style={[styles.saveBtn, { backgroundColor: theme.gold, opacity: canSave ? 1 : 0.38 }]}
                activeOpacity={0.85}
              >
                <Text style={[styles.saveBtnText, { fontFamily: theme.uiFontFamily }]}>
                  {isUpdate ? 'Update reflection' : SAVE_LABELS[saveLabelIdx]}
                </Text>
              </TouchableOpacity>
            ) : (
              <Animated.View style={[styles.savedWrap, savedStyle]}>
                <MaterialCommunityIcons name="check-circle" size={22} color={theme.gold} />
                <Text style={[styles.savedText, { color: theme.gold, fontFamily: theme.uiFontFamily }]}>
                  {SAVED_TOASTS[toastIdx]}
                </Text>
              </Animated.View>
            )}

            {/* Secondary — view archive */}
            <TouchableOpacity
              onPress={handleOpenReflections}
              style={styles.secondary}
              hitSlop={10}
            >
              <Text style={[styles.secondaryText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                View your reflections
              </Text>
              <MaterialCommunityIcons name="arrow-right" size={13} color={theme.textMuted} />
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </View>
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
    paddingTop: 6,
    paddingBottom: 6,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 11, letterSpacing: 2.4 },

  content: { paddingHorizontal: 20, paddingBottom: 48 },

  revealedBlock: { marginTop: 28 },

  quoteWrap: {
    flexDirection: 'row',
    paddingVertical: 6,
    marginBottom: 24,
  },
  quoteGlow: {
    position: 'absolute',
    top: -10, left: -10, right: -10, bottom: -10,
    borderRadius: 22,
    shadowOpacity: 0.7,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 14,
  },
  quoteRule: {
    width: 3,
    borderRadius: 2,
    marginRight: 16,
  },
  quoteBody: { flex: 1 },
  quoteText: { fontSize: 19, lineHeight: 30 },
  quoteAuthor: {
    fontSize: 11,
    letterSpacing: 1.2,
    marginTop: 10,
    textTransform: 'uppercase',
  },

  promptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  promptText: {
    flex: 1,
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  promptRefresh: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },

  input: {
    minHeight: 140,
    fontSize: 16,
    lineHeight: 24,
    borderBottomWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 0,
  },

  saveBtn: {
    marginTop: 24,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { color: '#1A1208', fontSize: 15, fontWeight: '600', letterSpacing: 0.3 },

  savedWrap: {
    marginTop: 24,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  savedText: { fontSize: 16, fontWeight: '600', letterSpacing: 0.3 },

  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 18,
  },
  secondaryText: { fontSize: 12, letterSpacing: 0.4 },
});
