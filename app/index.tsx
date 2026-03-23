import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeBackground } from '../components/layout/ThemeBackground';
import { QuoteCard } from '../components/quotes/QuoteCard';
import { BottomSheet } from '../components/layout/BottomSheet';
import { StreakBanner } from '../components/layout/StreakBanner';
import { PaywallSheet } from '../components/subscriptions/PaywallSheet';
import { useStreak } from '../hooks/useStreak';
import { useTheme } from '../hooks/useTheme';
import { ModalProvider, useModal } from '../contexts/ModalContext';
import { useDeepLinkStore } from '../store/useDeepLinkStore';
import type { WidgetInstanceConfig } from '../store/useWidgetStore';
import CategoriesScreen from './categories';
import ThemesScreen from './themes';
import CreateMixScreen from './mix/create';
import ProfileScreen from './profile';
import MyQuotesScreen from './my-quotes';
import ReflectScreen from './reflect';
import HistoryScreen from './history';
import NotificationsScreen from './notifications';
import WidgetsScreen from './widgets';
import FavoritesScreen from './favorites';
import JournalScreen from './journal';
import FeaturesScreen from '../components/subscriptions/FeaturesScreen';
import TrialScreen from '../components/subscriptions/TrialScreen';

function HomeScreenInner() {
  const theme = useTheme();
  const { activeSheet, previousSheet, paywallVisible, goBack, closeSheet, closePaywall } = useModal()!;
  // True when switching between sheets (not a fresh open/close) — used to skip animations
  const isSwitching = previousSheet !== null;
  const { streakCount, weekData, showStreakBanner, dismissStreakBanner } = useStreak();

  // ── Widget tap deep-link handler (Expo Router v6 primary path) ───────────
  //
  // In expo-router v6, when the app opens via a deep link URL, the router
  // automatically parses the URL and injects its params into the screen via
  // useLocalSearchParams — no manual Linking calls needed. This is the most
  // reliable mechanism for cold starts (including when the app relaunches
  // after being killed) because the router processes the URL as part of its
  // own navigation initialization, before our Linking handlers in _layout.tsx
  // have had a chance to run.
  //
  // The Linking handler in RootLayout covers the remaining cases:
  //   • Warm start — same URL tapped twice (params don't change, router skips).
  //   • Any edge cases where the router doesn't surface the params.
  const widgetParams = useLocalSearchParams<{
    src?: string;
    widgetId?: string;
    text?: string;
    author?: string;
    id?: string;
  }>();
  // Track which param set we've already processed to avoid re-processing on
  // re-renders while the same URL params are still in the route state.
  const handledWidgetParamKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (widgetParams.src !== 'widget') return;

    // Stable key representing this specific tap's data — used to debounce
    // re-processing when the component re-renders with unchanged params.
    const paramKey = `${widgetParams.widgetId ?? ''}:${widgetParams.text ?? ''}:${widgetParams.id ?? ''}`;
    if (handledWidgetParamKeyRef.current === paramKey) return;
    handledWidgetParamKeyRef.current = paramKey;

    const text = widgetParams.text ? String(widgetParams.text) : null;
    const author = String(widgetParams.author ?? '');
    const id = String(widgetParams.id ?? '');

    if (text) {
      useDeepLinkStore.getState().setPendingQuote({ id, text, author });
      return;
    }

    // Fallback: look up the cached quote by widgetId from AsyncStorage.
    const widgetId = widgetParams.widgetId;
    if (!widgetId) return;
    AsyncStorage.getItem('widget-store-v2').then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as {
          state?: { widgetConfigs?: Record<string, WidgetInstanceConfig> };
        };
        const cached = parsed?.state?.widgetConfigs?.[String(widgetId)]?.cachedQuote;
        if (cached) {
          useDeepLinkStore.getState().setPendingQuote({
            id:     cached.quoteId ?? '',
            text:   cached.text,
            author: cached.author,
          });
        }
      } catch {}
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgetParams.src, widgetParams.widgetId, widgetParams.text, widgetParams.id]);

  // Open a BottomSheet when the app is launched from a notification deep link
  // (e.g. reflect reminder notification sets pendingRoute='reflect').
  const pendingRoute = useDeepLinkStore((s) => s.pendingRoute);
  const { openSheet } = useModal()!;
  useEffect(() => {
    if (!pendingRoute) return;
    useDeepLinkStore.getState().clearPendingRoute();
    openSheet(pendingRoute);
  }, [pendingRoute, openSheet]);

  return (
    <ThemeBackground style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <QuoteCard />
      </SafeAreaView>

      <StreakBanner
        visible={showStreakBanner}
        streakCount={streakCount}
        weekData={weekData}
        onDismiss={dismissStreakBanner}
      />

      {/* Categories sheet */}
      <BottomSheet visible={activeSheet === 'categories'} onClose={closeSheet} backgroundColor={theme.background}
        instantClose={previousSheet === 'categories'} instantOpen={isSwitching}>
        <CategoriesScreen onClose={closeSheet} />
      </BottomSheet>

      {/* Themes sheet */}
      <BottomSheet visible={activeSheet === 'themes'} onClose={closeSheet} backgroundColor={theme.background}
        instantClose={previousSheet === 'themes'} instantOpen={isSwitching}>
        <ThemesScreen onClose={closeSheet} />
      </BottomSheet>

      {/* Mix builder sheet */}
      <BottomSheet visible={activeSheet === 'mix'} onClose={closeSheet} backgroundColor={theme.background}
        instantClose={previousSheet === 'mix'} instantOpen={isSwitching}>
        <CreateMixScreen onClose={closeSheet} />
      </BottomSheet>

      {/* Profile sheet */}
      <BottomSheet visible={activeSheet === 'profile'} onClose={closeSheet} backgroundColor={theme.background}
        instantClose={previousSheet === 'profile'} instantOpen={isSwitching}>
        <ProfileScreen onClose={closeSheet} />
      </BottomSheet>

      {/* My Quotes sheet */}
      <BottomSheet visible={activeSheet === 'myquotes'} onClose={closeSheet} backgroundColor={theme.background}
        instantClose={previousSheet === 'myquotes'} instantOpen={isSwitching}>
        <MyQuotesScreen onClose={closeSheet} onBack={goBack} />
      </BottomSheet>

      {/* Reflect sheet */}
      <BottomSheet visible={activeSheet === 'reflect'} onClose={closeSheet} backgroundColor={theme.background}
        instantClose={previousSheet === 'reflect'} instantOpen={isSwitching}>
        <ReflectScreen onClose={closeSheet} />
      </BottomSheet>

      {/* History sheet */}
      <BottomSheet visible={activeSheet === 'history'} onClose={closeSheet} backgroundColor={theme.background}
        instantClose={previousSheet === 'history'} instantOpen={isSwitching}>
        <HistoryScreen onClose={closeSheet} onBack={goBack} />
      </BottomSheet>

      {/* Notifications sheet */}
      <BottomSheet visible={activeSheet === 'notifications'} onClose={closeSheet} backgroundColor={theme.background}
        instantClose={previousSheet === 'notifications'} instantOpen={isSwitching}>
        <NotificationsScreen onClose={closeSheet} onBack={goBack} />
      </BottomSheet>

      {/* Widgets sheet */}
      <BottomSheet visible={activeSheet === 'widgets'} onClose={closeSheet} backgroundColor={theme.background}
        instantClose={previousSheet === 'widgets'} instantOpen={isSwitching}>
        <WidgetsScreen onClose={closeSheet} onBack={goBack} />
      </BottomSheet>

      {/* Favorites sheet */}
      <BottomSheet visible={activeSheet === 'favorites'} onClose={closeSheet} backgroundColor={theme.background}
        instantClose={previousSheet === 'favorites'} instantOpen={isSwitching}>
        <FavoritesScreen onClose={closeSheet} onBack={goBack} />
      </BottomSheet>

      {/* Journal sheet */}
      <BottomSheet visible={activeSheet === 'journal'} onClose={closeSheet} backgroundColor={theme.background}
        instantClose={previousSheet === 'journal'} instantOpen={isSwitching}>
        <JournalScreen onClose={closeSheet} onBack={goBack} />
      </BottomSheet>

      {/* Features (What you'll get) sheet */}
      <BottomSheet visible={activeSheet === 'features'} onClose={closeSheet} backgroundColor={theme.background}
        instantClose={previousSheet === 'features'} instantOpen={isSwitching}>
        <FeaturesScreen onClose={closeSheet} />
      </BottomSheet>

      {/* Trial info (How your free trial works) sheet */}
      <BottomSheet visible={activeSheet === 'trial'} onClose={closeSheet} backgroundColor={theme.background}
        instantClose={previousSheet === 'trial'} instantOpen={isSwitching}>
        <TrialScreen onClose={closeSheet} />
      </BottomSheet>

      {/* Paywall — rendered last so it appears above all sheets */}
      <PaywallSheet visible={paywallVisible} onClose={closePaywall} />
    </ThemeBackground>
  );
}

export default function HomeScreen() {
  return (
    <ModalProvider>
      <HomeScreenInner />
    </ModalProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
});
