import '../global.css';
import React, { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { rescheduleAll, requestPermissions } from '../lib/notifications';
import { Stack, useRouter, useRootNavigationState } from 'expo-router';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_400Regular_Italic,
} from '@expo-google-fonts/playfair-display';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { Allkin_400Regular } from '@expo-google-fonts/allkin';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../hooks/useTheme';
import { registerWidgetRefreshTask } from '../tasks/widgetRefreshTask';
import { useDeepLinkStore } from '../store/useDeepLinkStore';
import type { WidgetInstanceConfig } from '../store/useWidgetStore';

// Required for scheduled notifications to appear in the foreground and for the
// OS to know what to do when a notification fires (alert + sound, no badge).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function RootLayoutInner() {
  const theme = useTheme();
  const router = useRouter();
  const onboardingComplete = useAppStore((s) => s.onboardingComplete);
  const navReady = !!useRootNavigationState()?.key;

  // Redirect to onboarding on first launch. We gate on both:
  // 1. navReady — the Expo Router navigator has committed its initial state,
  //    so router.replace() won't silently no-op (fixes Google Play cold-start).
  // 2. Zustand hydration — AsyncStorage has loaded so we don't misread the
  //    default onboardingComplete:false as "needs onboarding" for returning users.
  useEffect(() => {
    if (!navReady) return;
    const doRedirect = () => {
      if (!useAppStore.getState().onboardingComplete) {
        router.replace('/onboarding');
      }
    };
    if (useAppStore.persist.hasHydrated()) {
      doRedirect();
    } else {
      return useAppStore.persist.onFinishHydration(doRedirect);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navReady]);
  // Widget deep links are handled via useLocalSearchParams in index.tsx
  // (Expo Router v6 primary path) and via Linking in RootLayout (fallback).

  // ── Notification deep-link handler ─────────────────────────────────────
  //
  // useLastNotificationResponse handles both cold-start (app killed) and
  // live (foreground/background) notification taps in a single hook.
  // It returns a new response reference each time the user taps a notification.
  // We dedup via a ref so each response is processed at most once.

  const lastNotifResponse = Notifications.useLastNotificationResponse();
  const handledNotifIds = useRef(new Set<string>());

  useEffect(() => {
    if (!lastNotifResponse) return;
    const id = lastNotifResponse.notification.request.identifier;
    if (handledNotifIds.current.has(id)) return;
    handledNotifIds.current.add(id);

    const data = lastNotifResponse.notification.request.content.data as {
      category?: string;
      quoteId?: string;
      quoteText?: string;
      quoteAuthor?: string;
    } | null;

    if (data?.category === 'reflect') {
      useDeepLinkStore.getState().setPendingRoute('reflect');
    } else if (data?.quoteId) {
      const { title, body } = lastNotifResponse.notification.request.content;
      useDeepLinkStore.getState().setPendingQuote({
        id: data.quoteId,
        text: data.quoteText || title || '',
        author: data.quoteAuthor || body || '',
      });
    }
  }, [lastNotifResponse]);

  // ── Refresh notification quotes on launch ───────────────────────────────
  // Guard: skip if a reschedule already happened within the last 18 hours.
  // Without this guard, every app open cancels all pending notifications and
  // re-schedules them, which can silently drop same-day notifications that
  // haven't fired yet (e.g. a 3 PM notification cancelled at 2:59 PM gets
  // pushed to tomorrow). Settings-screen changes bypass this guard entirely.
  //
  // We wait for Zustand hydration before reading preferences — AsyncStorage
  // is async, so reading the store synchronously on mount would see defaults
  // (notificationsEnabled: false) and exit early for every returning user.
  useEffect(() => {
    function doLaunchReschedule() {
      const prefs = useAppStore.getState().preferences;
      if (!prefs.notificationsEnabled) return;
      const ageMs = prefs.lastNotifScheduledAt
        ? Date.now() - new Date(prefs.lastNotifScheduledAt).getTime()
        : Infinity;
      if (ageMs < 6 * 3_600_000) return; // reschedule every ~6h to top up DATE-triggered quotes
      requestPermissions().then(granted => {
        if (!granted) return;
        return rescheduleAll({
          enabled: true,
          days: prefs.notificationDays ?? [],
          quotesEnabled: prefs.quotesEnabled ?? true,
          showAuthor: prefs.notificationShowAuthor ?? false,
          quoteCount: prefs.notificationCount ?? 5,
          startHHMM: prefs.notificationStartTime ?? '09:00',
          endHHMM: prefs.notificationEndTime ?? '22:00',
          qodEnabled: prefs.qodEnabled ?? true,
          qodTime: prefs.qodTime ?? '08:00',
          reflectEnabled: prefs.reflectEnabled ?? true,
          reflectTime: prefs.reflectTime ?? '20:00',
          streakEnabled: prefs.streakEnabled ?? true,
          streakTime: prefs.streakTime ?? '21:00',
        }).then(() => {
          useAppStore.getState().setPreferences({ lastNotifScheduledAt: new Date().toISOString() });
        });
      }).catch(console.warn);
    }

    if (useAppStore.persist.hasHydrated()) {
      doLaunchReschedule();
    } else {
      return useAppStore.persist.onFinishHydration(doLaunchReschedule);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Schedule background quote rotation for all placed widgets.
    registerWidgetRefreshTask('hourly');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        {!onboardingComplete ? (
          <Stack.Screen name="onboarding/index" options={{ animation: 'fade' }} />
        ) : (
          <Stack.Screen name="index" options={{ animation: 'fade' }} />
        )}
        <Stack.Screen name="categories" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
        <Stack.Screen name="profile" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
        <Stack.Screen name="mix/create" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
        <Stack.Screen name="history" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="mood" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
        <Stack.Screen name="themes" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
        <Stack.Screen name="favorites" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="widgets" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="notifications" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="subscriptions" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="reflect" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
        <Stack.Screen name="journal" options={{ animation: 'slide_from_right' }} />
        {/* Trampoline for widget tap deep links — invisible, navigates straight to index */}
        <Stack.Screen name="widget-open" options={{ animation: 'none', headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_400Regular_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Allkin_400Regular,
  });

  // ── Widget tap deep-link handler (Linking fallback) ───────────────────────
  //
  // Placed in RootLayout (the outermost component) so it mounts immediately —
  // before fonts load and before RootLayoutInner exists. This ensures:
  //   • Cold start: getInitialURL() is called while the OS still holds the
  //     launch intent, before Expo Router's navigation layer has a chance to
  //     "consume" it internally.
  //   • Warm start: the addEventListener subscription is live as soon as
  //     possible so no widget-tap URL events are missed.
  //
  // The primary path for cold/warm starts is useLocalSearchParams in index.tsx
  // (Expo Router v6 injects URL params into the screen automatically). This
  // Linking handler is the fallback for cases where the same URL fires twice
  // (same widget tapped twice — params don't change so the router effect
  // won't re-run) and for any timing edge cases.
  useEffect(() => {
    async function handleWidgetUrl(rawUrl: string) {
      // Handle both old format (quotable://?src=widget&...) and
      // new format (quotable://widget-open?...) — the route-based handler
      // (widget-open.tsx) is primary; this is the fallback for repeated taps
      // and timing edge cases.
      const isOldFormat = rawUrl.includes('src=widget');
      const isNewFormat = rawUrl.includes('widget-open');
      if (!isOldFormat && !isNewFormat) return;
      try {
        const queryString = rawUrl.includes('?') ? rawUrl.split('?')[1] : '';
        const params: Record<string, string> = {};
        for (const part of queryString.split('&')) {
          const eq = part.indexOf('=');
          if (eq === -1) continue;
          params[part.slice(0, eq)] = decodeURIComponent(part.slice(eq + 1));
        }

        const text = params['text'];
        const author = params['author'] ?? '';
        const id = params['id'] ?? '';

        if (text) {
          // Quote content embedded in URI — no AsyncStorage read needed.
          useDeepLinkStore.getState().setPendingQuote({ id, text, author });
          return;
        }

        // Fallback: widget rendered before the text-embedding update.
        // Read cachedQuote from AsyncStorage (bypasses Zustand hydration race).
        const widgetId = params['widgetId'];
        if (!widgetId) return;
        const raw = await AsyncStorage.getItem('widget-store-v2');
        if (!raw) return;
        const parsed = JSON.parse(raw) as {
          state?: { widgetConfigs?: Record<string, WidgetInstanceConfig> };
        };
        const cached = parsed?.state?.widgetConfigs?.[widgetId]?.cachedQuote;
        if (cached) {
          useDeepLinkStore.getState().setPendingQuote({
            id:     cached.quoteId ?? '',
            text:   cached.text,
            author: cached.author,
          });
        }
      } catch {
        // Malformed URL or parse error — ignore
      }
    }

    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) handleWidgetUrl(initialUrl);
    });

    const subscription = Linking.addEventListener('url', ({ url: eventUrl }) => {
      handleWidgetUrl(eventUrl);
    });

    return () => subscription.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0D0D0D', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#B8975A" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <RootLayoutInner />
    </GestureHandlerRootView>
  );
}
