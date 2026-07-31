import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

import { useAppStore } from '../../store/useAppStore';
import { useTheme } from '../../hooks/useTheme';
import { useRevenueCat } from '../../hooks/useRevenueCat';
import { requestPermissions, rescheduleAll } from '../../lib/notifications';
import { PaywallSheet } from '../../components/subscriptions/PaywallSheet';
import {
  ONBOARDING_STEPS,
  TOTAL_STEPS,
  STEP_INDEX,
  interpolate,
  type AnswerKey,
  type OnboardingStep,
} from '../../constants/onboardingSteps';

import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout';
import { StatementScreen } from '../../components/onboarding/StatementScreen';
import { OptionList } from '../../components/onboarding/OptionList';
import { ChipGrid } from '../../components/onboarding/ChipGrid';
import { ContinueButton } from '../../components/onboarding/ContinueButton';

import { SplashScreen } from '../../components/onboarding/screens/SplashScreen';
import { NameScreen } from '../../components/onboarding/screens/NameScreen';
import {
  NotificationConfigScreen,
  type NotificationConfig,
} from '../../components/onboarding/screens/NotificationConfigScreen';
import { NotificationPermissionScreen } from '../../components/onboarding/screens/NotificationPermissionScreen';
import { StreakGoalVisualScreen } from '../../components/onboarding/screens/StreakGoalVisualScreen';
import { ThemePickerScreen } from '../../components/onboarding/screens/ThemePickerScreen';
import { TrialPromiseScreen } from '../../components/onboarding/screens/TrialPromiseScreen';
import { WidgetInstallScreen } from '../../components/onboarding/screens/WidgetInstallScreen';

/** Every answer collected in the flow, keyed by the store field it lands in. */
type Answers = Partial<Record<AnswerKey, string | string[] | number | null>>;

const DEFAULT_NOTIF: NotificationConfig = {
  count: 10,
  startTime: '09:00',
  endTime: '22:00',
};

export default function OnboardingScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { setName, setPreferences, setTheme, completeOnboarding } = useAppStore();
  const { isInitialized, offerings } = useRevenueCat();

  const [step, setStep] = useState(0);
  const [name, setLocalName] = useState('');
  const [answers, setAnswers] = useState<Answers>({});
  const [notif, setNotif] = useState<NotificationConfig>(DEFAULT_NOTIF);
  const [themeId, setLocalThemeId] = useState(useAppStore.getState().preferences.theme);
  const [showPaywall, setShowPaywall] = useState(false);

  // Permission result is read at completion, after the user has moved on.
  const notifGranted = useRef(false);

  const screenOpacity = useSharedValue(1);
  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));

  const transition = useCallback(
    (fn: () => void) => {
      screenOpacity.value = withTiming(0, { duration: 150, easing: Easing.out(Easing.cubic) }, () => {
        runOnJS(fn)();
        screenOpacity.value = withTiming(1, { duration: 200 });
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const next = useCallback(
    () => transition(() => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1))),
    [transition],
  );
  const back = useCallback(
    () => transition(() => setStep((s) => Math.max(s - 1, 0))),
    [transition],
  );

  const setAnswer = useCallback((key: AnswerKey, value: string | string[] | number) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ── Completion ────────────────────────────────────────────────────────────

  const finish = useCallback(() => {
    router.replace('/');
  }, [router]);

  /**
   * Persists every answer, then schedules notifications if permission was
   * granted. Runs when the user leaves the last question screen — the paywall
   * and widget steps must not be able to lose their data by being dismissed.
   */
  const persist = useCallback(async () => {
    setName(name);

    const categories = (answers.categories as string[] | undefined) ?? [];

    setPreferences({
      // Topics drive the feed — write them to `categories`, not a side field.
      categories,
      age: answers.age as string | undefined,
      gender: answers.gender as string | undefined,
      mood: (answers.mood as string | undefined) ?? null,
      attributionSource: answers.attributionSource as string | undefined,
      zodiac: answers.zodiac as string | undefined,
      habitHelpers: answers.habitHelpers as string[] | undefined,
      moodReasons: answers.moodReasons as string[] | undefined,
      habitBarriers: answers.habitBarriers as string[] | undefined,
      dailyMinutesGoal: answers.dailyMinutesGoal as number | undefined,
      streakGoalDays: answers.streakGoalDays as number | undefined,
      beliefVision: answers.beliefVision as string | undefined,
      beliefThoughts: answers.beliefThoughts as string | undefined,
      beliefRewire: answers.beliefRewire as string | undefined,
      improveAreas: answers.improveAreas as string[] | undefined,
      // Notification prefs from the config screen.
      notificationsEnabled: notifGranted.current,
      notificationCount: notif.count,
      notificationStartTime: notif.startTime,
      notificationEndTime: notif.endTime,
    });

    completeOnboarding();

    if (!notifGranted.current) return;

    const prefs = useAppStore.getState().preferences;
    try {
      await rescheduleAll({
        enabled: true,
        days: prefs.notificationDays,
        quotesEnabled: prefs.quotesEnabled,
        quoteCount: notif.count,
        startHHMM: notif.startTime,
        endHHMM: notif.endTime,
        showAuthor: prefs.notificationShowAuthor,
        qodEnabled: prefs.qodEnabled,
        qodTime: prefs.qodTime,
        reflectEnabled: prefs.reflectEnabled,
        reflectTime: prefs.reflectTime,
        streakEnabled: prefs.streakEnabled,
        streakTime: prefs.streakTime,
      });
    } catch {
      // Scheduling is best-effort — never block finishing onboarding on it.
    }
  }, [name, answers, notif, setName, setPreferences, completeOnboarding]);

  /** Last question screen — commit everything before the offer sequence. */
  const persistedAt = STEP_INDEX['improve'];

  const advance = useCallback(() => {
    if (step === persistedAt) void persist();
    next();
  }, [step, persistedAt, persist, next]);

  const handleAllowNotifications = useCallback(async () => {
    const granted = await requestPermissions();
    notifGranted.current = granted;
    return granted;
  }, []);

  const handleThemeSelect = useCallback(
    (id: string) => {
      setLocalThemeId(id);
      // Applied immediately so every later screen renders in the user's choice.
      setTheme(id);
    },
    [setTheme],
  );

  /**
   * The paywall step has no UI of its own — it raises the RevenueCat sheet.
   *
   * `PaywallSheet` renders nothing until RevenueCat has initialized with
   * offerings (rendering earlier crashes natively), so this step would be a
   * blank dead end if RC never becomes ready. Wait for init, then either show
   * the sheet or move on — with a timeout so a hung SDK can't trap the user on
   * the second-to-last screen of onboarding.
   */
  const onPaywallStep = ONBOARDING_STEPS[step].id === 'paywall';
  useEffect(() => {
    if (!onPaywallStep) return;

    if (isInitialized) {
      if (offerings) setShowPaywall(true);
      else next();
      return;
    }

    const timer = setTimeout(next, 4000);
    return () => clearTimeout(timer);
  }, [onPaywallStep, isInitialized, offerings, next]);

  // ── Rendering ─────────────────────────────────────────────────────────────

  const current = ONBOARDING_STEPS[step];

  // Splash has no progress bar; everything after it fills across the flow.
  const progress = step === 0 ? undefined : (step / (TOTAL_STEPS - 1)) * 100;

  const skip = current.skippable ? advance : undefined;

  const configScreen = useMemo(() => {
    const s: OnboardingStep = current;
    if (s.kind === 'bespoke') return null;

    if (s.kind === 'statement') {
      return (
        <StatementScreen text={s.text!} onNext={advance} onBack={back} progress={progress} />
      );
    }

    const headline = interpolate(s.headline ?? '', name);
    const key = s.dataKey!;

    if (s.kind === 'single') {
      const raw = answers[key];
      const value = raw === undefined || raw === null ? undefined : String(raw);
      return (
        <OnboardingLayout
          headline={headline}
          subhead={s.subhead}
          progress={progress}
          onBack={back}
          onSkip={skip}
        >
          <OptionList
            mode="single"
            options={s.options ?? []}
            value={value}
            onChange={(v) => {
              setAnswer(key, s.numeric ? Number(v) : v);
              // Single-select auto-advances — matches the reference and halves
              // the taps across the ~15 single-choice screens.
              advance();
            }}
          />
        </OnboardingLayout>
      );
    }

    const selected = (answers[key] as string[] | undefined) ?? [];

    if (s.kind === 'chips') {
      return (
        <OnboardingLayout
          headline={headline}
          subhead={s.subhead}
          progress={progress}
          onBack={back}
          onSkip={skip}
          footer={<ContinueButton onPress={advance} disabled={selected.length === 0} />}
        >
          <ChipGrid
            chips={s.options ?? []}
            value={selected}
            onChange={(v) => setAnswer(key, v)}
          />
        </OnboardingLayout>
      );
    }

    // multi
    return (
      <OnboardingLayout
        headline={headline}
        subhead={s.subhead}
        progress={progress}
        onBack={back}
        onSkip={skip}
        footer={<ContinueButton onPress={advance} disabled={selected.length === 0} />}
      >
        <OptionList
          mode="multi"
          options={s.options ?? []}
          value={selected}
          onChange={(v) => setAnswer(key, v)}
        />
      </OnboardingLayout>
    );
  }, [current, answers, name, progress, advance, back, skip, setAnswer]);

  const bespoke = () => {
    switch (current.id) {
      case 'splash':
        return <SplashScreen next={advance} />;

      case 'name':
        return (
          <NameScreen
            value={name}
            onChange={setLocalName}
            next={advance}
            back={back}
            skip={skip}
            progress={progress}
          />
        );

      case 'notification-config':
        return (
          <NotificationConfigScreen
            value={notif}
            onChange={setNotif}
            next={advance}
            back={back}
            progress={progress}
          />
        );

      case 'notification-permission':
        return (
          <NotificationPermissionScreen
            onAllow={handleAllowNotifications}
            next={advance}
            back={back}
            progress={progress}
          />
        );

      case 'streak-visual':
        return (
          <StreakGoalVisualScreen
            goalDays={answers.streakGoalDays as number | undefined}
            next={advance}
            back={back}
            progress={progress}
          />
        );

      case 'theme':
        return (
          <ThemePickerScreen
            selectedId={themeId}
            onSelect={handleThemeSelect}
            next={advance}
            back={back}
            progress={progress}
          />
        );

      case 'trial-promise':
        return (
          <TrialPromiseScreen next={advance} back={back} progress={progress} />
        );

      case 'paywall':
        // Raised by the effect above and rendered as a sheet outside the
        // animated container. Nothing to draw underneath it.
        return null;

      case 'widget':
        // Last screen — no back button; returning would re-raise the paywall.
        return <WidgetInstallScreen next={finish} progress={progress} />;

      default:
        return null;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Animated.View style={[{ flex: 1 }, screenStyle]}>
        {current.kind === 'bespoke' ? bespoke() : configScreen}
      </Animated.View>

      <PaywallSheet
        visible={showPaywall}
        onClose={() => {
          setShowPaywall(false);
          next();
        }}
      />
    </View>
  );
}
