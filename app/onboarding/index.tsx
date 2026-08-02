import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Linking } from 'react-native';
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
import {
  requestPermissions,
  getPermissionStatus,
  canAskForPermissions,
  rescheduleAll,
} from '../../lib/notifications';
import TrialScreen from '../../components/subscriptions/TrialScreen';
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

export default function OnboardingScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { setName, setPreferences, setTheme, completeOnboarding } = useAppStore();
  const { isInitialized, offerings } = useRevenueCat();

  const [step, setStep] = useState(0);
  const [name, setLocalName] = useState('');
  const [answers, setAnswers] = useState<Answers>({});
  const [themeId, setLocalThemeId] = useState(useAppStore.getState().preferences.theme);

  /**
   * Whether the OS has granted notification permission — drives whether the
   * "Don't miss your daily quotes!" fallback screen is shown at all.
   *
   * Held in a ref, not state. The config screen grants permission and calls
   * `next()` in the same tick, so a state value would still read `false` in
   * that closure and land on the very screen the grant should skip.
   */
  const notifGranted = useRef(false);

  const screenOpacity = useSharedValue(1);
  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));

  /**
   * Steps can be conditionally hidden. The permission screen is the only one
   * today: it exists to recover from a denial, so granting on the config
   * screen skips straight past it.
   */
  const isVisible = useCallback((index: number) => {
    const s = ONBOARDING_STEPS[index];
    if (!s) return false;
    if (s.id === 'notification-permission') return !notifGranted.current;
    return true;
  }, []);

  const seek = useCallback(
    (from: number, dir: 1 | -1) => {
      let i = from + dir;
      while (i > 0 && i < TOTAL_STEPS - 1 && !isVisible(i)) i += dir;
      return Math.max(0, Math.min(i, TOTAL_STEPS - 1));
    },
    [isVisible],
  );

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
    () => transition(() => setStep((s) => seek(s, 1))),
    [transition, seek],
  );
  const back = useCallback(
    () => transition(() => setStep((s) => seek(s, -1))),
    [transition, seek],
  );

  const setAnswer = useCallback((key: AnswerKey, value: string | string[] | number) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ── Completion ────────────────────────────────────────────────────────────

  /**
   * The single exit from onboarding. The chosen theme is applied here rather
   * than on selection, so picking one doesn't restyle the remaining onboarding
   * screens — it reveals when the user lands in the app.
   */
  const finish = useCallback(() => {
    setTheme(themeId);
    router.replace('/');
  }, [router, setTheme, themeId]);

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
      // Notification prefs are written and scheduled by the config screen, not
      // here — they're live in the store from the moment the user saves them.
    });

    completeOnboarding();
  }, [name, answers, setName, setPreferences, completeOnboarding]);

  /** Last question screen — commit everything before the offer sequence. */
  const persistedAt = STEP_INDEX['improve'];

  const advance = useCallback(() => {
    if (step === persistedAt) void persist();
    next();
  }, [step, persistedAt, persist, next]);

  /**
   * Schedules from whatever is currently in the store, so the reminders the
   * user gets always match what the in-app Reminders screen shows.
   */
  const scheduleFromStore = useCallback(async () => {
    const p = useAppStore.getState().preferences;
    try {
      await rescheduleAll({
        enabled: true,
        days: p.notificationDays,
        quotesEnabled: p.quotesEnabled,
        quoteCount: p.notificationCount,
        startHHMM: p.notificationStartTime,
        endHHMM: p.notificationEndTime,
        showAuthor: p.notificationShowAuthor,
        qodEnabled: p.qodEnabled,
        qodTime: p.qodTime,
        streakEnabled: p.streakEnabled,
        streakTime: p.streakTime,
      });
    } catch {
      // Scheduling is best-effort — never block onboarding on it.
    }
  }, []);

  /**
   * "Allow and Save" on the config screen: write the settings, raise the
   * native iOS/Android permission prompt, and schedule if it's granted.
   *
   * Settings are saved either way — a denial shouldn't discard the window the
   * user just configured, and it stays there for when they enable
   * notifications later from Settings.
   */
  const handleSaveNotifications = useCallback(
    async (cfg: NotificationConfig) => {
      setPreferences({
        notificationCount: cfg.count,
        notificationStartTime: cfg.startTime,
        notificationEndTime: cfg.endTime,
      });

      const granted = await requestPermissions();
      notifGranted.current = granted;
      setPreferences({ notificationsEnabled: granted });

      if (granted) await scheduleFromStore();
      return granted;
    },
    [setPreferences, scheduleFromStore],
  );

  /**
   * "Skip" on the config screen: keep the window the user set up, but raise no
   * prompt and enable nothing. Leaving notifGranted false means the flow shows
   * the "Don't miss your daily quotes!" screen next, which is the retry.
   */
  const handleSkipNotifications = useCallback(
    (cfg: NotificationConfig) => {
      setPreferences({
        notificationCount: cfg.count,
        notificationStartTime: cfg.startTime,
        notificationEndTime: cfg.endTime,
        notificationsEnabled: false,
      });
      notifGranted.current = false;
    },
    [setPreferences],
  );

  /**
   * Retry from the fallback screen. `requestPermissions` returns false without
   * prompting once the OS status is 'denied', so a second in-app prompt is
   * impossible — deep-link to system settings instead.
   */
  const handleRetryNotifications = useCallback(async () => {
    // Only hard denial rules out a dialog — a plain 'denied' status may still
    // be re-askable on Android.
    if (!(await canAskForPermissions())) {
      await Linking.openSettings();
      return false;
    }

    const granted = await requestPermissions();
    notifGranted.current = granted;
    setPreferences({ notificationsEnabled: granted });
    if (granted) await scheduleFromStore();
    return granted;
  }, [setPreferences, scheduleFromStore]);

  /** Picks up a grant made in system settings after returning to the app. */
  const handlePermissionRecheck = useCallback(async () => {
    const status = await getPermissionStatus();
    const granted = status === 'granted';
    if (!granted) return false;

    notifGranted.current = true;
    setPreferences({ notificationsEnabled: true });
    await scheduleFromStore();
    return true;
  }, [setPreferences, scheduleFromStore]);

  /**
   * Held locally until `finish`. The grid still previews each theme in its own
   * colours, so the choice is visible without changing the screen around it.
   */
  const handleThemeSelect = useCallback((id: string) => setLocalThemeId(id), []);

  /**
   * The paywall step renders TrialScreen inline, and its CTA buys through the
   * store's own billing sheet. TrialScreen needs offerings to have something
   * to sell, so skip the step outright if RevenueCat never becomes ready —
   * with a timeout so a hung SDK can't trap the user near the end of the flow.
   */
  const onPaywallStep = ONBOARDING_STEPS[step].id === 'paywall';
  useEffect(() => {
    if (!onPaywallStep) return;
    if (isInitialized) {
      if (!offerings) next();
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
          footer={<ContinueButton onPress={advance} disabled={value === undefined} />}
        >
          <OptionList
            mode="single"
            options={s.options ?? []}
            value={value}
            onChange={(v) => setAnswer(key, s.numeric ? Number(v) : v)}
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
            onSave={handleSaveNotifications}
            onSkip={handleSkipNotifications}
            next={advance}
            back={back}
            progress={progress}
          />
        );

      case 'notification-permission':
        return (
          <NotificationPermissionScreen
            onRetry={handleRetryNotifications}
            onRecheck={handlePermissionRecheck}
            next={advance}
            back={back}
            progress={progress}
          />
        );

      case 'streak-visual':
        return <StreakGoalVisualScreen next={advance} back={back} progress={progress} />;

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
        // Skipped by the effect above when offerings never arrive.
        return offerings ? <TrialScreen onContinue={next} onClose={next} /> : null;

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

    </View>
  );
}
