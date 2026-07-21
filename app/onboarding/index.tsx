import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
  Dimensions,
  ImageBackground,
  KeyboardAvoidingView,
  Linking,

} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import RevenueCatUI from 'react-native-purchases-ui';
import { useAppStore } from '../../store/useAppStore';
import { useRevenueCat } from '../../hooks/useRevenueCat';
import { useTheme } from '../../hooks/useTheme';
import { StreakCard } from '../../components/ui/StreakCard';
import { WidgetBridge } from '../../modules/widget-bridge';
import { CATEGORIES } from '../../constants/categories';
import * as Haptics from 'expo-haptics';
import { ConfirmSheet } from '../../components/ui/ConfirmSheet';
import { BottomSheet } from '../../components/layout/BottomSheet';
import { PaywallSheet } from '../../components/subscriptions/PaywallSheet';
import FeaturesScreen from '../../components/subscriptions/FeaturesScreen';
import TrialScreen from '../../components/subscriptions/TrialScreen';
import SpecialOfferScreen from '../../components/subscriptions/SpecialOfferScreen';
import NotificationsScreen from '../notifications';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Constants ──────────────────────────────────────────────────────────────

const TOTAL_STEPS = 17;
const PROGRESS_START_STEP = 6;
const PROGRESS_END_STEP = 16;
// ─── Helpers ────────────────────────────────────────────────────────────────

// ─── TypewriterText ──────────────────────────────────────────────────────────

function TypewriterText({
  text,
  style,
  charDelay = 35,
  startDelay = 150,
}: {
  text: string;
  style?: any;
  charDelay?: number;
  startDelay?: number;
}) {
  const [count, setCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setCount(0);
    const timer = setTimeout(() => {
      let i = 0;
      intervalRef.current = setInterval(() => {
        i += 1;
        setCount(i);
        if (i >= text.length && intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }, charDelay);
    }, startDelay);
    return () => {
      clearTimeout(timer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text]);

  return <Text style={style}>{text.slice(0, count)}</Text>;
}

// ─── TypewriterColorText ─────────────────────────────────────────────────────

function TypewriterColorText({
  segments,
  style,
  charDelay = 35,
  startDelay = 150,
}: {
  segments: { text: string; color: string }[];
  style?: any;
  charDelay?: number;
  startDelay?: number;
}) {
  // Flatten to a single string — identical dep pattern to TypewriterText
  const fullText = segments.map(s => s.text).join('');
  const [count, setCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setCount(0);
    const timer = setTimeout(() => {
      let i = 0;
      intervalRef.current = setInterval(() => {
        i += 1;
        setCount(i);
        if (i >= fullText.length && intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }, charDelay);
    }, startDelay);
    return () => {
      clearTimeout(timer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fullText]);

  // Slice the visible portion then re-partition into colored runs
  const visible = fullText.slice(0, count);
  const parts: React.ReactElement[] = [];
  let pos = 0;
  for (const seg of segments) {
    if (pos >= visible.length) break;
    const chunk = visible.slice(pos, pos + seg.text.length);
    if (chunk.length > 0) {
      parts.push(<Text key={pos} style={{ color: seg.color }}>{chunk}</Text>);
    }
    pos += seg.text.length;
  }

  return <Text style={style}>{parts}</Text>;
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface OnboardingData {
  name: string;
  phoneUsage: string;
  goals: string[];
  age: string;
  gender: string;
  joyCategories: string[];
}

interface ScreenProps {
  data: OnboardingData;
  updateData: (u: Partial<OnboardingData>) => void;
  next: () => void;
  back: () => void;
  progress?: number;
}

// ─── Shared: OnboardingHeader ────────────────────────────────────────────────

function OnboardingHeader({
  progress,
  onBack,
  onSkip,
  title,
}: {
  progress?: number;
  onBack?: () => void;
  onSkip?: () => void;
  title?: string;
}) {
  const theme = useTheme();
  return (
    <View style={hdr.wrap}>
      {progress !== undefined && (
        <View style={[hdr.track, { backgroundColor: theme.surface }]}>
          <View
            style={[
              hdr.fill,
              { width: `${Math.min(progress, 100)}%`, backgroundColor: theme.gold },
            ]}
          />
        </View>
      )}
      <View style={hdr.row}>
        {onBack ? (
          <TouchableOpacity style={hdr.back} onPress={onBack}>
            <MaterialCommunityIcons name="chevron-left" size={20} color={theme.textMuted} />
            <Text style={[hdr.backText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              Back
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
        {title ? (
          <Text style={[hdr.title, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
            {title}
          </Text>
        ) : (
          <View />
        )}
        {onSkip ? (
          <TouchableOpacity onPress={onSkip}>
            <Text style={[hdr.skip, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              Skip
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>
    </View>
  );
}

const hdr = StyleSheet.create({
  wrap: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  track: {
    height: 3,
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  fill: { height: 3, borderRadius: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, width: 60 },
  backText: { fontSize: 14 },
  title: { fontSize: 13, fontWeight: '500' },
  skip: { fontSize: 14, textAlign: 'right', width: 60 },
});

// ─── Shared: ContinueButton ─────────────────────────────────────────────────

function ContinueButton({
  onPress,
  label = 'Continue',
  disabled = false,
  variant = 'gold',
}: {
  onPress: () => void;
  label?: string;
  disabled?: boolean;
  variant?: 'muted' | 'brandDark' | 'gold';
}) {
  const theme = useTheme();
  const bg =
    variant === 'brandDark'
      ? '#26313b'
      : variant === 'gold'
      ? theme.gold
      : 'rgba(138,128,120,0.30)';
  const color =
    variant === 'brandDark' ? '#fbf6ea' : variant === 'gold' ? '#1A1208' : '#E8E0D0';
  return (
    <View style={ctaS.wrap}>
      <TouchableOpacity
        style={[ctaS.btn, { backgroundColor: bg, opacity: disabled ? 0.3 : 1 }]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Text style={[ctaS.label, { color, fontFamily: theme.uiFontFamily }]}>{label}</Text>
      </TouchableOpacity>
    </View>
  );
}

const ctaS = StyleSheet.create({
  wrap: { paddingHorizontal: 24, paddingBottom: 32, paddingTop: 16 },
  btn: { borderRadius: 99, paddingVertical: 18, alignItems: 'center' },
  label: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

// ─── Shared: SkipModal ───────────────────────────────────────────────────────

function SkipModal({ onGoBack, onSkip }: { onGoBack: () => void; onSkip: () => void }) {
  const theme = useTheme();
  return (
    <View style={[skpS.overlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onGoBack} />
      <View style={[skpS.card, { backgroundColor: theme.surfaceElevated ?? theme.surface, borderColor: theme.border }]}>
        <Text style={[skpS.title, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
          Are you sure you want to do this?
        </Text>
        <Text style={[skpS.body, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
          This is a main feature of the app.
        </Text>
        <TouchableOpacity
          style={[skpS.primary, { backgroundColor: theme.gold }]}
          onPress={onGoBack}
          activeOpacity={0.8}
        >
          <Text style={[skpS.primaryLabel, { fontFamily: theme.uiFontFamily }]}>Go Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[skpS.secondary, { backgroundColor: theme.surface }]}
          onPress={onSkip}
          activeOpacity={0.8}
        >
          <Text style={[skpS.secondaryLabel, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
            Skip Anyway
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const skpS = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    marginHorizontal: 32,
    width: SW - 64,
    borderRadius: 24,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
  },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  body: { fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  primary: {
    width: '100%',
    borderRadius: 99,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryLabel: { fontSize: 14, fontWeight: '600', color: '#1A1208' },
  secondary: {
    width: '100%',
    borderRadius: 99,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryLabel: { fontSize: 14, fontWeight: '500' },
});

// ─── Screen: SplashScreen ───────────────────────────────────────────────────

function SplashScreen_({ next, progress }: { next: () => void; progress?: number }) {
  const theme = useTheme();
  const cardW = Math.min(SW - 24, 400);
  const cardH = Math.min(cardW * 1.45, SH * 0.72);
  return (
    <View style={[ss.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={ss.safe} edges={['top', 'bottom']}>
        <OnboardingHeader progress={progress} />
        <View style={ss.center}>
          <View style={[ss.cardWrap, { width: cardW, height: cardH }]}>
            <ImageBackground
              source={require('../../assets/clouds.jpg')}
              style={ss.img}
              imageStyle={{ borderRadius: 24 }}
              resizeMode="cover"
            >
              <View style={[ss.overlay, { borderRadius: 24 }]} />
              <View style={ss.inner}>
                <View style={ss.top}>
                  <TypewriterText
                    text="Quotable"
                    style={ss.brand}
                    charDelay={70}
                    startDelay={400}
                  />
                  <TypewriterText
                    text="Daily Affirmations & Motivation"
                    style={ss.tagline}
                    charDelay={22}
                    startDelay={1100}
                  />
                </View>
                <TouchableOpacity style={ss.beginBtn} onPress={next} activeOpacity={0.85}>
                  <Text style={ss.beginText}>Begin My Journey</Text>
                </TouchableOpacity>
              </View>
            </ImageBackground>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const ss = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, width: '100%' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  cardWrap: { borderRadius: 24, overflow: 'hidden' },
  img: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26,26,26,0.55)',
  },
  inner: {
    flex: 1,
    padding: 32,
    justifyContent: 'space-between',
  },
  top: { paddingTop: 24 },
  brand: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 38,
    color: '#f0ece4',
    lineHeight: 46,
  },
  tagline: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: 'rgba(240,236,228,0.7)',
    marginTop: 12,
  },
  beginBtn: {
    borderRadius: 99,
    paddingVertical: 18,
    alignItems: 'center',
    backgroundColor: 'rgba(240,236,228,0.85)',
  },
  beginText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#1a1208',
    fontWeight: '600',
  },
});

// ─── Screen: TapScreen ───────────────────────────────────────────────────────

function TapScreen_({ text, next }: { text: string; next: () => void; back?: () => void; progress?: number }) {
  const theme = useTheme();
  return (
    <TouchableOpacity style={{ flex: 1 }} onPress={next} activeOpacity={1}>
      <View style={[tps.root, { backgroundColor: theme.background }]}>
        <SafeAreaView style={tps.safe} edges={['top', 'bottom']}>
          <View style={tps.center}>
            <TypewriterText
              text={text}
              style={[tps.title, { color: theme.text, fontFamily: 'Allkin_400Regular' }]}
              charDelay={55}
              startDelay={200}
            />
          </View>
        </SafeAreaView>
      </View>
    </TouchableOpacity>
  );
}

const tps = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  title: {
    fontWeight: '700',
    fontSize: 36,
    lineHeight: 44,
    textAlign: 'center',
  },
});

// ─── Screen: HookScreen ───────────────────────────────────────────────────────

// Flat word list with highlight flag for word-by-word reveal
const hookWords: { text: string; highlight: boolean }[] = [
  { text: 'Ever', highlight: false },
  { text: 'feel', highlight: false },
  { text: 'you', highlight: false },
  { text: 'unlock', highlight: false },
  { text: 'your', highlight: false },
  { text: 'phone', highlight: false },
  { text: '100', highlight: true },
  { text: 'times', highlight: true },
  { text: 'a', highlight: true },
  { text: 'day...', highlight: true },
  { text: 'but', highlight: false },
  { text: 'never', highlight: true },
  { text: 'have', highlight: true },
  { text: 'the', highlight: true },
  { text: 'energy', highlight: true },
  { text: 'you', highlight: false },
  { text: 'need', highlight: false },
  { text: 'to', highlight: false },
  { text: 'be', highlight: false },
  { text: 'productive.', highlight: true },
];

function HookScreen_({ next, back, progress }: { next: () => void; back?: () => void; progress?: number }) {
  const theme = useTheme();
  const hookSegments = hookWords.map((word, i) => ({
    text: (i === 0 ? '' : ' ') + word.text,
    color: word.highlight ? theme.gold : theme.text,
  }));

  return (
    <View style={[hks.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={hks.safe} edges={['top', 'bottom']}>
        <OnboardingHeader progress={progress} onBack={back} />
        <TouchableOpacity
          style={hks.body}
          onPress={next}
          activeOpacity={1}
        >
          <View style={hks.content}>
            <TypewriterColorText
              segments={hookSegments}
              style={[hks.para, { fontFamily: 'Allkin_400Regular' }]}
              charDelay={18}
              startDelay={100}
            />
            <View style={hks.subWrap}>
              <TypewriterText
                text="You're not alone. Your phone is full of distractions and it's easy to lose sight of what you really want."
                style={[hks.sub, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}
                charDelay={14}
                startDelay={2200}
              />
              <TypewriterText
                text="What if every time you went on your phone you felt motivated and ready for your day."
                style={[hks.sub, { color: theme.textMuted, fontFamily: theme.uiFontFamily, marginTop: 12 }]}
                charDelay={14}
                startDelay={3950}
              />
            </View>
          </View>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const hks = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 32, paddingBottom: 48 },
  content: { flex: 1, justifyContent: 'center' },
  para: { fontSize: 26, fontWeight: '700', lineHeight: 36 },
  subWrap: { marginTop: 28 },
  sub: { fontSize: 13, lineHeight: 20 },
});

// ─── Screen: NameInputScreen ─────────────────────────────────────────────────

function NameInputScreen_({ data, updateData, next }: ScreenProps) {
  const theme = useTheme();
  const [name, setName] = useState(data.name);

  const handleContinue = () => {
    updateData({ name });
    next();
  };

  const handleSkip = () => {
    updateData({ name: '' });
    next();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[ns.root, { backgroundColor: theme.background }]}>
        <SafeAreaView style={ns.safe} edges={['top', 'bottom']}>
          <View style={ns.content}>
            <TypewriterText
              text="But first"
              style={[ns.eyebrow, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}
              charDelay={55}
              startDelay={100}
            />
            <TypewriterText
              text="What's your name?"
              style={[ns.title, { color: theme.text, fontFamily: theme.quoteFontFamily }]}
              charDelay={40}
              startDelay={750}
            />
            <TextInput
              style={[
                ns.input,
                { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border, fontFamily: theme.uiFontFamily },
              ]}
              placeholder="Enter your name"
              placeholderTextColor={theme.textMuted}
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
          </View>
          <ContinueButton onPress={handleContinue} disabled={!name.trim()} />
          <TouchableOpacity onPress={handleSkip} style={ns.skip}>
            <Text style={[ns.skipText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>Skip</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </KeyboardAvoidingView>
  );
}

const ns = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 80 },
  eyebrow: { fontSize: 13, letterSpacing: 0.5, marginBottom: 8 },
  title: { fontSize: 30, fontWeight: '700', lineHeight: 38 },
  input: {
    marginTop: 28,
    borderRadius: 99,
    paddingHorizontal: 24,
    paddingVertical: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  skip: { alignItems: 'center', paddingBottom: 24 },
  skipText: { fontSize: 14 },
});

// ─── Screen: PersonalizedHookScreen ──────────────────────────────────────────

const phsWords: { text: string; gold: boolean }[] = [
  { text: 'Imagine', gold: false },
  { text: 'if', gold: false },
  { text: '5', gold: true },
  { text: 'minutes', gold: true },
  { text: 'made', gold: false },
  { text: 'you', gold: false },
  { text: 'ready', gold: false },
  { text: 'to', gold: false },
  { text: 'take', gold: false },
  { text: 'on', gold: false },
  { text: 'your', gold: false },
  { text: 'day.', gold: false },
];

function PersonalizedHookScreen_({ next, back, progress }: { next: () => void; back?: () => void; progress?: number }) {
  const theme = useTheme();
  const [footerVisible, setFooterVisible] = useState(false);
  const phsSegments = phsWords.map((word, i) => ({
    text: (i === 0 ? '' : ' ') + word.text,
    color: word.gold ? theme.gold : theme.text,
  }));

  useEffect(() => {
    setFooterVisible(false);
    // phsWords: 56 chars × 30ms + 150ms start ≈ 1830ms; footer after +800ms
    const t = setTimeout(() => setFooterVisible(true), 2700);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={[phs.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={phs.safe} edges={['top', 'bottom']}>
        <OnboardingHeader progress={progress} onBack={back} />
        <TouchableOpacity
          style={phs.body}
          onPress={next}
          activeOpacity={1}
        >
          <View style={phs.content}>
            <TypewriterColorText
              segments={phsSegments}
              style={[phs.main, { fontFamily: 'Allkin_400Regular' }]}
              charDelay={30}
              startDelay={150}
            />
          </View>
          <View style={[phs.footer, { opacity: footerVisible ? 1 : 0 }]}>
            <Text style={[phs.hint, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              Tap to continue
            </Text>
            <MaterialCommunityIcons name="arrow-right" size={16} color={theme.textMuted} />
          </View>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const phs = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 32, paddingBottom: 48, justifyContent: 'space-between' },
  content: { flex: 1, justifyContent: 'center' },
  main: { fontSize: 26, fontWeight: '700', lineHeight: 36 },
  sub: { fontSize: 13, marginTop: 24, lineHeight: 20 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  hint: { fontSize: 13 },
});

// ─── Screen: PhoneUsageScreen ─────────────────────────────────────────────────

const phoneOptions = ['1-2 hours', '2-3 hours', '3-4 hours', '4-5 hours', '5-6 hours', '6+ hours'];

function PhoneUsageScreen_({ data, updateData, next, back, progress }: ScreenProps) {
  const theme = useTheme();
  const [selected, setSelected] = useState(data.phoneUsage);

  return (
    <View style={[fs.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={fs.safe} edges={['top', 'bottom']}>
        <OnboardingHeader progress={progress} onBack={back} />
        <ScrollView style={fs.scroll} contentContainerStyle={fs.scrollContent} showsVerticalScrollIndicator={false}>
          <TypewriterText
            text="How much time do you spend on your phone every day?"
            style={[fs.title, { color: theme.text, fontFamily: theme.quoteFontFamily }]}
            charDelay={22}
          />
          <View style={fs.list}>
            {phoneOptions.map((opt) => {
              const sel = selected === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[
                    fs.option,
                    {
                      backgroundColor: sel ? theme.goldButton : theme.surface,
                      borderColor: sel ? theme.gold : 'transparent',
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() => setSelected(opt)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      fs.optLabel,
                      { color: sel ? theme.text : theme.textMuted, fontFamily: theme.uiFontFamily },
                    ]}
                  >
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
        <ContinueButton
          onPress={() => { updateData({ phoneUsage: selected }); next(); }}
          disabled={!selected}
        />
      </SafeAreaView>
    </View>
  );
}

const fs = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 8 },
  title: { fontSize: 26, fontWeight: '700', lineHeight: 34, marginBottom: 24 },
  list: { gap: 12 },
  option: { borderRadius: 16, paddingHorizontal: 24, paddingVertical: 18 },
  optLabel: { fontSize: 15 },
});

// ─── Screen: GoalsScreen ──────────────────────────────────────────────────────

const GOALS_TITLE_WORDS: { text: string; gold: boolean }[] = [
  { text: 'What', gold: false },
  { text: 'do', gold: false },
  { text: 'you', gold: false },
  { text: 'want', gold: false },
  { text: 'to', gold: false },
  { text: 'achieve', gold: true },
  { text: 'with', gold: false },
  { text: 'Quotable?', gold: false },
];

const goalsList = [
  { label: 'Start my day ready', icon: 'weather-sunny' },
  { label: 'Build a daily motivation habit', icon: 'book-open-variant' },
  { label: 'Deepen my relationship with myself', icon: 'heart' },
  { label: 'Find peace in chaos', icon: 'peace' },
  { label: 'Memorize quotes that matter', icon: 'creation' },
  { label: 'Share my motivation with others', icon: 'account-group' },
];

function GoalsScreen_({ data, updateData, next, back, progress }: ScreenProps) {
  const theme = useTheme();
  const [selected, setSelected] = useState<string[]>(data.goals);
  const goalsSegments = GOALS_TITLE_WORDS.map((word, i) => ({
    text: (i === 0 ? '' : ' ') + word.text,
    color: word.gold ? theme.gold : theme.text,
  }));

  const toggle = (label: string) =>
    setSelected((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label],
    );

  return (
    <View style={[gs.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={gs.safe} edges={['top', 'bottom']}>
        <OnboardingHeader progress={progress} onBack={back} />
        <ScrollView style={gs.scroll} contentContainerStyle={gs.scrollContent} showsVerticalScrollIndicator={false}>
          <TypewriterColorText
            segments={goalsSegments}
            style={[gs.title, { color: theme.text, fontFamily: theme.quoteFontFamily }]}
            charDelay={40}
            startDelay={200}
          />
          <View style={gs.list}>
            {goalsList.map((goal) => {
              const sel = selected.includes(goal.label);
              return (
                <TouchableOpacity
                  key={goal.label}
                  style={[
                    gs.item,
                    {
                      backgroundColor: theme.surface,
                      borderColor: sel ? theme.gold : 'transparent',
                      borderWidth: sel ? 2 : 1,
                    },
                  ]}
                  onPress={() => toggle(goal.label)}
                  activeOpacity={0.75}
                >
                  <View style={[gs.iconWrap, { backgroundColor: sel ? theme.gold + '22' : 'transparent' }]}>
                    <MaterialCommunityIcons
                      name={goal.icon as any}
                      size={20}
                      color={sel ? theme.gold : theme.textMuted}
                    />
                  </View>
                  <Text
                    style={[
                      gs.itemLabel,
                      { color: sel ? theme.text : theme.textMuted, fontFamily: theme.uiFontFamily, fontWeight: sel ? '600' : '400' },
                    ]}
                  >
                    {goal.label}
                  </Text>
                  <View
                    style={[
                      gs.check,
                      {
                        borderColor: sel ? theme.gold : theme.textMuted + '60',
                        backgroundColor: sel ? theme.gold : 'transparent',
                      },
                    ]}
                  >
                    {sel && (
                      <MaterialCommunityIcons name="check" size={12} color={theme.background} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
        <ContinueButton
          onPress={() => { updateData({ goals: selected }); next(); }}
          disabled={selected.length === 0}
        />
      </SafeAreaView>
    </View>
  );
}

const gs = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 8 },
  title: { fontSize: 26, fontWeight: '700', lineHeight: 34, marginBottom: 24 },
  list: { gap: 12 },
  item: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemLabel: { fontSize: 14, flex: 1 },
  check: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ─── Screen: ValidationScreen ─────────────────────────────────────────────────

const validationCards = [
  {
    icon: 'creation',
    title: 'Start my day feeling motivated',
    desc: 'Wake up with purpose and positive energy every morning.',
    featured: false,
    tilt: '-0.2deg',
    offsetX: 0,
  },
  {
    icon: 'target',
    title: 'Build a daily motivation habit',
    desc: 'Turn small daily wins into lasting change.',
    featured: false,
    tilt: '0.2deg',
    offsetX: 2,
  },
  {
    icon: 'heart',
    title: 'Believe in yourself',
    desc: 'Strengthen your self-worth and confidence from within.',
    featured: true,
    tilt: '-0.15deg',
    offsetX: -1,
  },
];

function ValidationScreen_({ next, back, progress }: ScreenProps) {
  const theme = useTheme();
  return (
    <View style={[vs.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={vs.safe} edges={['top', 'bottom']}>
        <OnboardingHeader progress={progress} onBack={back} />
        <View style={vs.content}>
          <TypewriterText
            text="You're in the right place."
            style={[vs.title, { color: theme.text, fontFamily: theme.quoteFontFamily }]}
          />
          <View style={vs.cards}>
            {validationCards.map((card) => (
              <View
                key={card.title}
                style={{
                  transform: [{ rotate: card.tilt }, { translateX: card.offsetX }],
                }}
              >
                <View
                  style={[
                    vs.card,
                    {
                      backgroundColor: card.featured ? theme.goldButton : theme.surface,
                      borderWidth: card.featured ? 2 : 1,
                      borderColor: card.featured ? theme.gold : 'transparent',
                    },
                  ]}
                >
                  <View
                    style={[
                      vs.iconWrap,
                      { backgroundColor: theme.background, borderWidth: 1.5, borderColor: theme.gold + '55' },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={card.icon as any}
                      size={24}
                      color={theme.gold}
                    />
                  </View>
                  <View style={vs.cardText}>
                    <Text style={[vs.cardTitle, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
                      {card.title}
                    </Text>
                    <Text style={[vs.cardDesc, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                      {card.desc}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
        <ContinueButton onPress={next} />
      </SafeAreaView>
    </View>
  );
}

const vs = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 8 },
  title: { fontSize: 30, fontWeight: '700', lineHeight: 38, marginBottom: 24 },
  cards: { gap: 20 },
  card: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    minHeight: 110,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  cardDesc: { fontSize: 13, lineHeight: 20 },
});

// ─── Screen: AgeScreen ────────────────────────────────────────────────────────

const ageOptions = ['18-24', '25-34', '35-44', '45-54', '55+'];

function AgeScreen_({ data, updateData, next, back, progress }: ScreenProps) {
  const theme = useTheme();
  const [selected, setSelected] = useState(data.age);
  return (
    <View style={[as.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={as.safe} edges={['top', 'bottom']}>
        <OnboardingHeader progress={progress} onBack={back} />
        <View style={as.content}>
          <TypewriterText
            text="How old are you?"
            style={[as.title, { color: theme.text, fontFamily: theme.quoteFontFamily }]}
          />
          <View style={as.list}>
            {ageOptions.map((opt) => {
              const sel = selected === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[
                    as.option,
                    {
                      backgroundColor: sel ? theme.goldButton : theme.surface,
                      borderColor: sel ? theme.gold : 'transparent',
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() => setSelected(opt)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      as.optLabel,
                      { color: sel ? theme.text : theme.textMuted, fontFamily: theme.uiFontFamily },
                    ]}
                  >
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <ContinueButton
          onPress={() => { updateData({ age: selected }); next(); }}
          disabled={!selected}
        />
      </SafeAreaView>
    </View>
  );
}

const as = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 8 },
  title: { fontSize: 30, fontWeight: '700', lineHeight: 38, marginBottom: 28 },
  list: { gap: 12 },
  option: { borderRadius: 16, paddingHorizontal: 24, paddingVertical: 18 },
  optLabel: { fontSize: 15 },
});

// ─── Screen: GenderScreen ─────────────────────────────────────────────────────

const genderOptions = ['Male', 'Female', 'Other', 'Prefer not to say'];

function GenderScreen_({ data, updateData, next, back, progress }: ScreenProps) {
  const theme = useTheme();
  const [selected, setSelected] = useState(data.gender);
  return (
    <View style={[gend.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={gend.safe} edges={['top', 'bottom']}>
        <OnboardingHeader progress={progress} onBack={back} />
        <View style={gend.content}>
          <TypewriterText
            text="How do you identify?"
            style={[gend.title, { color: theme.text, fontFamily: theme.quoteFontFamily }]}
          />
          <View style={gend.list}>
            {genderOptions.map((opt) => {
              const sel = selected === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[
                    gend.option,
                    {
                      backgroundColor: sel ? theme.goldButton : theme.surface,
                      borderColor: sel ? theme.gold : 'transparent',
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() => setSelected(opt)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      gend.optLabel,
                      { color: sel ? theme.text : theme.textMuted, fontFamily: theme.uiFontFamily },
                    ]}
                  >
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <ContinueButton
          onPress={() => { updateData({ gender: selected }); next(); }}
          disabled={!selected}
        />
      </SafeAreaView>
    </View>
  );
}

const gend = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 8 },
  title: { fontSize: 30, fontWeight: '700', lineHeight: 38, marginBottom: 28 },
  list: { gap: 12 },
  option: { borderRadius: 16, paddingHorizontal: 24, paddingVertical: 18 },
  optLabel: { fontSize: 15 },
});

// ─── Screen: BenefitsScreen ───────────────────────────────────────────────────

const benefitsList = [
  {
    icon: 'fire',
    title: 'Stay calm in all of the chaos',
    desc: 'Mindful moments throughout the day help you stay grounded and manage anxiety.',
  },
  {
    icon: 'creation',
    title: 'Increase positivity',
    desc: 'Daily reminders shift your mindset toward gratitude and optimism.',
  },
  {
    icon: 'target',
    title: 'Achieve your goals',
    desc: 'Positive self-talk reinforces your capabilities and motivates action.',
  },
];

function BenefitsScreen_({ next, back, progress }: ScreenProps) {
  const theme = useTheme();
  return (
    <View style={[bs.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={bs.safe} edges={['top', 'bottom']}>
        <OnboardingHeader progress={progress} onBack={back} />
        <ScrollView style={bs.scroll} contentContainerStyle={bs.scrollContent} showsVerticalScrollIndicator={false}>
          <TypewriterText
            text="The benefits of daily motivation and affirmations"
            style={[bs.title, { color: theme.text, fontFamily: theme.quoteFontFamily }]}
            charDelay={22}
          />
          <View style={bs.list}>
            {benefitsList.map((b) => (
              <View
                key={b.title}
                style={[bs.card, { backgroundColor: theme.surface, borderColor: theme.gold + '33' }]}
              >
                <View style={[bs.iconWrap, { backgroundColor: theme.background, borderWidth: 1.5, borderColor: theme.gold + '55' }]}>
                  <MaterialCommunityIcons name={b.icon as any} size={20} color={theme.gold} />
                </View>
                <View style={bs.cardText}>
                  <Text style={[bs.cardTitle, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
                    {b.title}
                  </Text>
                  <Text style={[bs.cardDesc, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                    {b.desc}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
        <ContinueButton onPress={next} />
      </SafeAreaView>
    </View>
  );
}

const bs = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 8 },
  title: { fontSize: 26, fontWeight: '700', lineHeight: 34, marginBottom: 28 },
  list: { gap: 16 },
  card: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    borderWidth: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  cardDesc: { fontSize: 14, lineHeight: 20 },
});

// ─── Screen: NotificationsScreen ─────────────────────────────────────────────


function NotificationsScreen_({ next, back, progress }: ScreenProps) {
  return <NotificationsScreen onBack={back} onContinue={next} progress={progress} />;
}


// ─── Screen: StreakScreen ─────────────────────────────────────────────────────

const DEMO_STREAK_WEEK: boolean[] = [true, true, true, false, false, false, false];

function StreakScreen_({ next, back, progress }: ScreenProps) {
  const theme = useTheme();
  return (
    <View style={[stk.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={stk.safe} edges={['top', 'bottom']}>
        <OnboardingHeader progress={progress} onBack={back} />

        <View style={stk.content}>
          {/* Real StreakCard — centered */}
          <View style={stk.streakWrap}>
            <StreakCard streakCount={3} weekData={DEMO_STREAK_WEEK} />
          </View>

          <View style={stk.textWrap}>
            <TypewriterText
              text="Build your daily habit"
              style={[stk.title, { color: theme.text, fontFamily: theme.quoteFontFamily }]}
              charDelay={40}
            />
            <TypewriterText
              text="Consistency is key to lasting change"
              style={[stk.sub, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}
              charDelay={18}
              startDelay={1050}
            />
          </View>
        </View>

        <ContinueButton onPress={next} label="Next" variant="gold" />
      </SafeAreaView>
    </View>
  );
}

const stk = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  streakWrap: { marginBottom: 24 },
  textWrap: { alignItems: 'center' },
  title: { fontSize: 30, fontWeight: '700', textAlign: 'center', lineHeight: 38 },
  sub: { fontSize: 17, textAlign: 'center', marginTop: 8 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 16 },
  tip: { fontSize: 13, lineHeight: 18, flex: 1, fontFamily: 'Inter_400Regular' },
});

// ─── Screen: CategoriesScreen ("What brings you joy?") ───────────────────────
// Uses CATEGORIES directly so options match the Create Mix page exactly.

function CategoriesScreen_({ data, updateData, next, back, progress }: ScreenProps) {
  const theme = useTheme();
  const [selected, setSelected] = useState<string[]>(data.joyCategories);

  const toggle = (name: string) =>
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name],
    );

  return (
    <View style={[cats.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={cats.safe} edges={['top', 'bottom']}>
        <OnboardingHeader progress={progress} onBack={back} />
        <View style={cats.titleWrap}>
          <TypewriterText
            text="What brings you joy?"
            style={[cats.title, { color: theme.text, fontFamily: theme.quoteFontFamily }]}
          />
        </View>
        <ScrollView style={cats.scroll} contentContainerStyle={cats.pills} showsVerticalScrollIndicator={false}>
          {CATEGORIES.map((cat) => {
            const sel = selected.includes(cat.name);
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  cats.pill,
                  {
                    backgroundColor: theme.surface,
                    borderColor: sel ? theme.gold : 'transparent',
                    borderWidth: sel ? 2 : 1,
                  },
                ]}
                onPress={() => toggle(cat.name)}
                activeOpacity={0.75}
              >
                <MaterialCommunityIcons
                  name={cat.icon as any}
                  size={15}
                  color={sel ? theme.gold : theme.textMuted}
                />
                <Text
                  style={[
                    cats.pillLabel,
                    { color: sel ? theme.text : theme.textMuted, fontFamily: theme.uiFontFamily, fontWeight: sel ? '600' : '500' },
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <ContinueButton
          onPress={() => { updateData({ joyCategories: selected }); next(); }}
          disabled={selected.length === 0}
        />
      </SafeAreaView>
    </View>
  );
}

const cats = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  titleWrap: { paddingHorizontal: 24, paddingTop: 4, marginBottom: 4 },
  title: { fontSize: 30, fontWeight: '700', lineHeight: 38 },
  scroll: { flex: 1 },
  pills: {
    paddingHorizontal: 24,
    paddingTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 99,
  },
  pillLabel: { fontSize: 13 },
});

// ─── Screen: WidgetScreen ─────────────────────────────────────────────────────

function WidgetScreen_({ next, back, progress }: ScreenProps) {
  const theme = useTheme();
  const [installing, setInstalling] = useState(false);
  const [showWidgetInstructions, setShowWidgetInstructions] = useState(false);

  const handleInstallWidget = useCallback(async () => {
    if (!WidgetBridge.canPinWidget) {
      setShowWidgetInstructions(true);
      return;
    }
    setInstalling(true);
    try {
      await WidgetBridge.requestPinWidget();
    } catch {
      // no-op — native module will handle errors internally
    } finally {
      setInstalling(false);
      next();
    }
  }, [next]);

  return (
    <View style={[wid.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={wid.safe} edges={['top', 'bottom']}>
        <OnboardingHeader progress={progress} onBack={back} />

        <View style={wid.content}>
          <TypewriterText
            text="Add a widget to your home screen"
            style={[wid.title, { color: theme.text, fontFamily: theme.quoteFontFamily }]}
            charDelay={32}
          />
          <TypewriterText
            text="Be motivated through out the day with our home screen widget!"
            style={[wid.sub, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}
            charDelay={12}
            startDelay={1200}
          />

          {/* Phone mockup */}
          <View style={wid.mockupWrap}>
            <View style={wid.phoneFrame}>
              {/* Inner screen */}
              <View style={[wid.phoneInner, { backgroundColor: theme.surface }]} />
              {/* Dynamic Island */}
              <View style={[wid.dynamicIsland, { backgroundColor: theme.text }]} />
              {/* Widget card */}
              <View style={[wid.widgetCard, { backgroundColor: theme.background + 'a0', borderColor: theme.border }]}>
                <View style={[wid.widgetIcon, { backgroundColor: theme.goldButton }]} />
                <Text style={[wid.widgetText, { color: theme.text, fontFamily: theme.uiFontFamily }]}>{"Today's affirmation"}</Text>
              </View>
              {/* App grid */}
              <View style={wid.appGrid}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <View key={i} style={[wid.appIcon, { backgroundColor: theme.text + '1a' }]} />
                ))}
              </View>
              {/* Home indicator */}
              <View style={[wid.homeBar, { backgroundColor: theme.text + '40' }]} />
            </View>
          </View>
        </View>

        <ContinueButton onPress={handleInstallWidget} label={installing ? 'Installing…' : 'Continue'} variant="gold" disabled={installing} />

        <ConfirmSheet
          visible={showWidgetInstructions}
          onClose={() => setShowWidgetInstructions(false)}
          title="Add a Widget"
          message={'To add a Quotable widget:\n\n1. Long-press your home screen\n2. Tap the "+" button\n3. Search for Quotable\n4. Choose your widget size'}
          confirmLabel="Got it!"
          onConfirm={next}
        />
      </SafeAreaView>
    </View>
  );
}

const wid = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24, alignItems: 'center', paddingTop: 4 },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center', lineHeight: 34, marginBottom: 10, marginTop: 12 },
  sub: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 16, maxWidth: 280 },
  mockupWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  phoneFrame: {
    width: 200,
    height: 420,
    borderRadius: 40,
    borderWidth: 10,
    borderColor: 'rgba(240,236,228,0.9)',
  },
  phoneInner: {
    position: 'absolute',
    top: 10,
    bottom: 10,
    left: 10,
    right: 10,
    borderRadius: 28,
  },
  dynamicIsland: {
    position: 'absolute',
    top: 18,
    left: '50%' as any,
    width: 80,
    height: 24,
    marginLeft: -40,
    borderRadius: 12,
  },
  widgetCard: {
    position: 'absolute',
    top: 70,
    left: '50%' as any,
    width: 168,
    marginLeft: -84,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  widgetIcon: { width: 28, height: 28, borderRadius: 12, flexShrink: 0 },
  widgetText: { fontSize: 14, fontWeight: '500', flex: 1, lineHeight: 18 },
  appGrid: {
    position: 'absolute',
    bottom: 56,
    left: '50%' as any,
    marginLeft: -56,
    width: 112,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  appIcon: { width: 28, height: 28, borderRadius: 9 },
  homeBar: {
    position: 'absolute',
    bottom: 24,
    left: '50%' as any,
    width: 96,
    height: 6,
    marginLeft: -48,
    borderRadius: 3,
  },
});

// ─── Screen: CommitmentScreen ─────────────────────────────────────────────────

const COMMITMENT_DURATION = 2000;
const COMMITMENT_TICK = 30;
const RING_RADIUS = 70;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function CommitmentScreen_({ next, back, progress }: ScreenProps) {
  const theme = useTheme();
  const [holdProgress, setHoldProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef(0);

  const startHold = () => {
    if (completed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    progressRef.current = 0;
    setHoldProgress(0);
    intervalRef.current = setInterval(() => {
      progressRef.current += (COMMITMENT_TICK / COMMITMENT_DURATION) * 100;
      if (progressRef.current >= 100) {
        progressRef.current = 100;
        setHoldProgress(100);
        if (intervalRef.current) clearInterval(intervalRef.current);
        setCompleted(true);
      } else {
        setHoldProgress(progressRef.current);
      }
    }, COMMITMENT_TICK);
  };

  const stopHold = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!completed) {
      setHoldProgress(0);
      progressRef.current = 0;
    }
  };

  useEffect(() => {
    if (completed) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const t = setTimeout(next, 1200);
      return () => clearTimeout(t);
    }
  }, [completed]);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const dashOffset = CIRCUMFERENCE - (holdProgress / 100) * CIRCUMFERENCE;

  return (
    <View style={[com.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={com.safe} edges={['top', 'bottom']}>
        <OnboardingHeader progress={progress} onBack={back} />
        <View style={com.content}>
          <TypewriterText
            text="Commit to improving your life!"
            style={[com.title, { color: theme.text, fontFamily: theme.quoteFontFamily }]}
          />
          <View style={com.ringWrap}>
            <Pressable
              onPressIn={startHold}
              onPressOut={stopHold}
              style={com.pressable}
            >
              <Svg
                width={200}
                height={200}
                style={{ transform: [{ rotate: '-90deg' }] }}
              >
                <Circle
                  cx="100"
                  cy="100"
                  r={RING_RADIUS}
                  fill="none"
                  stroke={theme.surface}
                  strokeWidth="6"
                />
                <Circle
                  cx="100"
                  cy="100"
                  r={RING_RADIUS}
                  fill="none"
                  stroke={theme.gold}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                />
              </Svg>
              <View style={com.iconCenter}>
                <MaterialCommunityIcons
                  name="fingerprint"
                  size={65}
                  color={holdProgress > 0 || completed ? theme.gold : theme.textMuted}
                />
              </View>
            </Pressable>
          </View>
          <Text style={[com.hint, { color: completed ? theme.gold : theme.textMuted, fontFamily: theme.uiFontFamily }]}>
            {completed ? "You're committed!" : 'Hold to commit'}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const com = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 8, alignItems: 'center' },
  title: { fontSize: 30, fontWeight: '700', lineHeight: 38, alignSelf: 'flex-start', marginBottom: 0 },
  ringWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pressable: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
  iconCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 18, fontWeight: '600', marginBottom: 32 },
});

// ─── Screen: OnboardingPaywallScreen ─────────────────────────────────────────

function OnboardingPaywallScreen_({ onFinish }: { onFinish: () => void }) {
  const { refresh } = useRevenueCat();
  return (
    <View style={StyleSheet.absoluteFill}>
      <RevenueCatUI.Paywall
        onDismiss={onFinish}
        onPurchaseCompleted={async () => {
          await refresh();
          onFinish();
        }}
        onRestoreCompleted={async () => {
          await refresh();
          onFinish();
        }}
        style={{ flex: 1 }}
      />
    </View>
  );
}

// ─── Main Onboarding Orchestrator ─────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { setName, setPreferences, completeOnboarding } = useAppStore();

  const [step, setStep] = useState(0);
  const [premiumStep, setPremiumStep] = useState<'features' | 'trial' | 'special' | 'paywall' | null>(null);
  const [data, setData] = useState<OnboardingData>({
    name: '',
    phoneUsage: '',
    goals: [],
    age: '',
    gender: '',
    joyCategories: [],
  });

  const screenOpacity = useSharedValue(1);
  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const goNext = useCallback(() => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1)), []);
  const goBack = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);

  const transition = useCallback(
    (fn: () => void) => {
      screenOpacity.value = withTiming(0, { duration: 150, easing: Easing.out(Easing.cubic) }, () => {
        runOnJS(fn)();
        screenOpacity.value = withTiming(1, { duration: 200 });
      });
    },
    [],
  );

  const next = useCallback(() => transition(goNext), [transition, goNext]);
  const back = useCallback(() => transition(goBack), [transition, goBack]);

  const progressDenom = Math.max(1, PROGRESS_END_STEP - PROGRESS_START_STEP);
  const progress =
    step < PROGRESS_START_STEP || step > PROGRESS_END_STEP
      ? undefined
      : ((step - PROGRESS_START_STEP) / progressDenom) * 100;

  const handleFinish = useCallback(() => {
    router.replace('/');
  }, [router]);

  const handleComplete = useCallback(() => {
    setName(data.name);
    // Notification settings are managed entirely by NotificationsScreen's applySettings
    // (which saves to the store and calls rescheduleAll on every change), so we only
    // save non-notification prefs here.
    setPreferences({
      categories: [],
      goals: data.goals,
      phoneUsage: data.phoneUsage,
      age: data.age,
      gender: data.gender,
      joyCategories: data.joyCategories,
    });

    completeOnboarding();
    setPremiumStep('special');
  }, [data, setName, setPreferences, completeOnboarding]);

  const sp: ScreenProps = { data, updateData, next, back, progress };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
    <Animated.View style={[{ flex: 1 }, screenStyle]}>
      {step === 0 && <SplashScreen_ next={next} progress={progress} />}
      {step === 1 && <TapScreen_ text="Hey" next={next} back={back} progress={progress} />}
      {step === 2 && <HookScreen_ next={next} back={back} progress={progress} />}
      {step === 3 && <NameInputScreen_ {...sp} />}
      {step === 4 && (
        <TapScreen_
          text={`Okay ${data.name || 'friend'}, consider this…`}
          next={next}
          back={back}
          progress={progress}
        />
      )}
      {step === 5 && <PersonalizedHookScreen_ next={next} back={back} progress={progress} />}
      {step === 6 && <PhoneUsageScreen_ {...sp} />}
      {step === 7 && <GoalsScreen_ {...sp} />}
      {step === 8 && <ValidationScreen_ {...sp} />}
      {step === 9 && <AgeScreen_ {...sp} />}
      {step === 10 && <GenderScreen_ {...sp} />}
      {step === 11 && <BenefitsScreen_ {...sp} />}
      {step === 12 && <NotificationsScreen_ {...sp} />}
      {step === 13 && <StreakScreen_ {...sp} />}
      {step === 14 && <CategoriesScreen_ {...sp} />}
      {step === 15 && <WidgetScreen_ {...sp} />}
      {step === 16 && <CommitmentScreen_ {...sp} next={handleComplete} />}
    </Animated.View>

      {/* Premium flow — slides up as BottomSheets over the ReadyScreen */}
      <BottomSheet
        visible={premiumStep === 'special'}
        onClose={handleFinish}
        backgroundColor={theme.background}
      >
        <SpecialOfferScreen onContinue={() => setPremiumStep('features')} onClose={handleFinish} />
      </BottomSheet>

      <BottomSheet
        visible={premiumStep === 'features'}
        onClose={handleFinish}
        backgroundColor={theme.background}
      >
        <FeaturesScreen onContinue={() => setPremiumStep('trial')} onClose={handleFinish} />
      </BottomSheet>

      <BottomSheet
        visible={premiumStep === 'trial'}
        onClose={handleFinish}
        backgroundColor={theme.background}
      >
        <TrialScreen onContinue={() => setPremiumStep('paywall')} onClose={handleFinish} />
      </BottomSheet>

      <PaywallSheet
        visible={premiumStep === 'paywall'}
        onClose={handleFinish}
      />
    </View>
  );
}
