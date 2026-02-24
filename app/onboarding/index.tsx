import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useAppStore } from '../../store/useAppStore';
import { MOODS } from '../../constants/moods';
import { CATEGORIES } from '../../constants/categories';
import { THEMES } from '../../constants/themes';

const { width } = Dimensions.get('window');

// ─────────────────────────────────────────────────
// Step data
// ─────────────────────────────────────────────────

type OnboardingStep = {
  id: string;
  title: string;
  subtitle?: string;
  type: 'welcome' | 'name' | 'single-choice' | 'multi-choice' | 'theme' | 'info' | 'ready';
  emoji?: string;
  options?: { id: string; label: string; emoji?: string }[];
};

const STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    type: 'welcome',
    emoji: '✦',
    title: 'Welcome to mquotes',
    subtitle: 'Your daily source of wisdom, motivation, and calm.',
  },
  {
    id: 'problem',
    type: 'info',
    emoji: '🤔',
    title: 'Life gets overwhelming',
    subtitle: 'Between deadlines, distractions, and daily stress — it\'s easy to lose sight of what matters.',
  },
  {
    id: 'solution',
    type: 'info',
    emoji: '💡',
    title: 'One quote. Every day.',
    subtitle: 'A single powerful quote can shift your mindset, spark an idea, or give you the strength to keep going.',
  },
  {
    id: 'name',
    type: 'name',
    emoji: '👋',
    title: 'What should we call you?',
    subtitle: 'This helps us personalize your experience',
  },
  {
    id: 'focus',
    type: 'single-choice',
    emoji: '🎯',
    title: 'What do you most want to work on?',
    options: [
      { id: 'motivation', label: 'Staying motivated', emoji: '🔥' },
      { id: 'mindfulness', label: 'Being more present', emoji: '🧘' },
      { id: 'growth', label: 'Personal growth', emoji: '🌱' },
      { id: 'happiness', label: 'Finding more joy', emoji: '☀️' },
    ],
  },
  {
    id: 'drives',
    type: 'single-choice',
    emoji: '⚡',
    title: 'What drives you most?',
    options: [
      { id: 'success', label: 'Achieving goals', emoji: '🏆' },
      { id: 'love', label: 'Relationships & love', emoji: '❤️' },
      { id: 'wisdom', label: 'Learning & wisdom', emoji: '📚' },
      { id: 'peace', label: 'Inner peace', emoji: '☁️' },
    ],
  },
  {
    id: 'barrier',
    type: 'single-choice',
    emoji: '🚧',
    title: 'What holds you back most?',
    options: [
      { id: 'courage', label: 'Fear and self-doubt', emoji: '😰' },
      { id: 'time', label: 'Lack of time', emoji: '⏰' },
      { id: 'change', label: 'Resistance to change', emoji: '🔄' },
      { id: 'solitude', label: 'Loneliness', emoji: '🌙' },
    ],
  },
  {
    id: 'morning',
    type: 'single-choice',
    emoji: '🌅',
    title: 'When do you read quotes most?',
    options: [
      { id: 'morning', label: 'Morning', emoji: '🌄' },
      { id: 'afternoon', label: 'Afternoon', emoji: '☀️' },
      { id: 'evening', label: 'Evening', emoji: '🌆' },
      { id: 'random', label: 'Whenever I need it', emoji: '🎲' },
    ],
  },
  {
    id: 'themes-intro',
    type: 'info',
    emoji: '🎨',
    title: 'Your space, your vibe',
    subtitle: 'mquotes has 15 beautiful themes — from Midnight to Sakura. Pick one on the next screen.',
  },
  {
    id: 'theme',
    type: 'theme',
    emoji: '◑',
    title: 'Pick your theme',
    subtitle: 'You can change this anytime',
  },
  {
    id: 'streak-intro',
    type: 'info',
    emoji: '🔥',
    title: 'Build your streak',
    subtitle: 'Open mquotes daily to keep your streak alive. Consistency builds wisdom.',
  },
  {
    id: 'mix-intro',
    type: 'info',
    emoji: '🎛️',
    title: 'Create your Mix',
    subtitle: 'Blend multiple quote categories into one personalized feed. You\'re in control.',
  },
  {
    id: 'categories',
    type: 'multi-choice',
    emoji: '📚',
    title: 'What topics interest you?',
    subtitle: 'Select all that apply',
    options: CATEGORIES.slice(0, 8).map(c => ({ id: c.id, label: c.name, emoji: c.icon })),
  },
  {
    id: 'overwhelmed',
    type: 'single-choice',
    emoji: '💭',
    title: 'When you\'re overwhelmed, you prefer:',
    options: [
      { id: 'wisdom', label: 'Inspiring words', emoji: '✨' },
      { id: 'mindfulness', label: 'Calming quotes', emoji: '🌿' },
      { id: 'courage', label: 'A push to act', emoji: '⚡' },
      { id: 'hope', label: 'Hopeful thoughts', emoji: '🌤️' },
    ],
  },
  {
    id: 'notifications',
    type: 'single-choice',
    emoji: '🔔',
    title: 'Daily quote reminders?',
    subtitle: 'We\'ll send one quote at your preferred time',
    options: [
      { id: 'yes_morning', label: '8:00 AM', emoji: '🌅' },
      { id: 'yes_noon', label: '12:00 PM', emoji: '☀️' },
      { id: 'yes_evening', label: '7:00 PM', emoji: '🌙' },
      { id: 'no', label: 'No thanks', emoji: '🔕' },
    ],
  },
  {
    id: 'ready',
    type: 'ready',
    emoji: '🚀',
    title: 'You\'re all set!',
    subtitle: 'Your personalized quote feed is ready. Swipe up to explore.',
  },
];

// ─────────────────────────────────────────────────
// Main Onboarding Component
// ─────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();
  const { setPreferences, setTheme, setName, completeOnboarding } = useAppStore();

  const [stepIndex, setStepIndex] = useState(0);
  const [nameValue, setNameValue] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('minimal');
  const [singleChoices, setSingleChoices] = useState<Record<string, string>>({});
  const [multiChoices, setMultiChoices] = useState<Record<string, string[]>>({});

  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  const animateTransition = (onDone: () => void) => {
    opacity.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.cubic) }, () => {
      runOnJS(onDone)();
      opacity.value = withTiming(1, { duration: 220 });
    });
  };

  const handleNext = useCallback(() => {
    // Save step data
    if (step.type === 'name') setName(nameValue);
    if (step.type === 'theme') setTheme(selectedTheme);
    if (step.id === 'notifications') {
      const choice = singleChoices['notifications'];
      if (choice && choice !== 'no') {
        const timeMap: Record<string, string> = {
          yes_morning: '08:00',
          yes_noon: '12:00',
          yes_evening: '19:00',
        };
        setPreferences({ notificationsEnabled: true, notificationTime: timeMap[choice] ?? '08:00' });
      }
    }

    if (isLast) {
      // Save categories from multi-choice
      const cats = multiChoices['categories'] ?? [];
      if (cats.length > 0) setPreferences({ categories: cats });
      completeOnboarding();
      // Navigate to main app
      router.replace('/');
      return;
    }

    animateTransition(() => setStepIndex(prev => prev + 1));
  }, [step, stepIndex, isLast, nameValue, selectedTheme, singleChoices, multiChoices]);

  const handlePrev = () => {
    if (stepIndex === 0) return;
    animateTransition(() => setStepIndex(prev => prev - 1));
  };

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const canProceed = () => {
    if (step.type === 'name') return nameValue.trim().length > 0;
    if (step.type === 'single-choice') return !!singleChoices[step.id];
    return true;
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${((stepIndex + 1) / STEPS.length) * 100}%` }]} />
        </View>

        {/* Back button */}
        {stepIndex > 0 && (
          <TouchableOpacity style={styles.backBtn} onPress={handlePrev}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
        )}

        <Animated.View style={[styles.content, animStyle]}>
          <Text style={styles.emoji}>{step.emoji}</Text>
          <Text style={styles.title}>{step.title}</Text>
          {step.subtitle && <Text style={styles.subtitle}>{step.subtitle}</Text>}

          {/* Name input */}
          {step.type === 'name' && (
            <TextInput
              style={styles.input}
              placeholder="Your name..."
              placeholderTextColor="#666"
              value={nameValue}
              onChangeText={setNameValue}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleNext}
            />
          )}

          {/* Single choice */}
          {step.type === 'single-choice' && step.options && (
            <View style={styles.optionsGrid}>
              {step.options.map(opt => {
                const selected = singleChoices[step.id] === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.optionBtn, selected && styles.optionBtnSelected]}
                    onPress={() => setSingleChoices(prev => ({ ...prev, [step.id]: opt.id }))}
                  >
                    {opt.emoji && <Text style={styles.optionEmoji}>{opt.emoji}</Text>}
                    <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Multi choice */}
          {step.type === 'multi-choice' && step.options && (
            <View style={styles.optionsGrid}>
              {step.options.map(opt => {
                const selected = (multiChoices[step.id] ?? []).includes(opt.id);
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.optionBtn, selected && styles.optionBtnSelected]}
                    onPress={() => {
                      setMultiChoices(prev => {
                        const current = prev[step.id] ?? [];
                        return {
                          ...prev,
                          [step.id]: selected
                            ? current.filter(id => id !== opt.id)
                            : [...current, opt.id],
                        };
                      });
                    }}
                  >
                    {opt.emoji && <Text style={styles.optionEmoji}>{opt.emoji}</Text>}
                    <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Theme picker */}
          {step.type === 'theme' && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.themePicker}
            >
              {THEMES.slice(0, 6).map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.themeChip,
                    { backgroundColor: t.background, borderColor: selectedTheme === t.id ? '#fff' : 'transparent' },
                  ]}
                  onPress={() => setSelectedTheme(t.id)}
                >
                  <Text style={[styles.themeChipText, { color: t.text }]}>{t.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </Animated.View>

        {/* CTA Button */}
        <TouchableOpacity
          style={[styles.ctaBtn, !canProceed() && styles.ctaBtnDisabled]}
          onPress={handleNext}
          disabled={!canProceed()}
        >
          <Text style={styles.ctaBtnText}>
            {isLast ? "Let's go →" : step.type === 'info' || step.type === 'welcome' ? 'Continue →' : 'Next →'}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  safe: { flex: 1 },
  progressBar: {
    height: 2,
    backgroundColor: '#1a1a1a',
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 1,
  },
  progressFill: {
    height: 2,
    backgroundColor: '#B8975A',
    borderRadius: 1,
  },
  backBtn: { padding: 20, paddingBottom: 0 },
  backText: { color: '#666', fontSize: 28 },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  emoji: { fontSize: 56, marginBottom: 20, textAlign: 'center' },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#E8E0D0',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'PlayfairDisplay_700Bold',
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B6560',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    fontFamily: 'Inter_400Regular',
  },
  input: {
    backgroundColor: '#1C1A18',
    borderRadius: 14,
    padding: 16,
    color: '#E8E0D0',
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#333',
    fontFamily: 'Inter_400Regular',
    marginTop: 8,
  },
  optionsGrid: {
    gap: 10,
    marginTop: 8,
  },
  optionBtn: {
    backgroundColor: '#1C1A18',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2520',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionBtnSelected: {
    backgroundColor: 'rgba(184,151,90,0.12)',
    borderColor: '#B8975A',
  },
  optionEmoji: { fontSize: 22 },
  optionLabel: {
    color: '#6B6560',
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  optionLabelSelected: { color: '#E8E0D0' },
  themePicker: {
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  themeChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 2,
    marginRight: 8,
  },
  themeChipText: { fontSize: 14, fontWeight: '600' },
  ctaBtn: {
    backgroundColor: '#C4A35A',
    borderRadius: 28,
    margin: 24,
    marginTop: 8,
    paddingVertical: 18,
    alignItems: 'center',
  },
  ctaBtnDisabled: { opacity: 0.35 },
  ctaBtnText: {
    color: '#1A1208',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.3,
  },
});
