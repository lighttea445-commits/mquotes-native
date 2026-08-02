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
import CategoriesScreen from '../components/screens/CategoriesScreen';
import ThemesScreen from '../components/screens/ThemesScreen';
import CreateMixScreen from '../components/screens/CreateMixScreen';
import ProfileScreen from '../components/screens/ProfileScreen';
import MyQuotesScreen from '../components/screens/MyQuotesScreen';
import HistoryScreen from '../components/screens/HistoryScreen';
import NotificationsScreen from '../components/screens/NotificationsScreen';
import WidgetsScreen from '../components/screens/WidgetsScreen';
import FavoritesScreen from '../components/screens/FavoritesScreen';
import TrialScreen from '../components/subscriptions/TrialScreen';
import SettingsScreen from '../components/screens/SettingsScreen';
import ShareScreen from '../components/screens/ShareScreen';

function HomeScreenInner() {
  const theme = useTheme();
  const { activeSheet, previousSheet, paywallVisible, goBack, closeSheet, closePaywall } = useModal()!;
  // True when switching between sheets (not a fresh open/close) — used to skip animations
  const isSwitching = previousSheet !== null;
  const { streakCount, weekData, showStreakBanner, dismissStreakBanner } = useStreak();

  // ── Old-format widget tap fallback (Expo Router v6 / index route params) ──
  //
  // New widget renders use "quotable://widget-open?..." which routes to
  // app/widget-open.tsx and never lands here.
  //
  // Old widget renders (before the widget-open update) used
  // "quotable://?src=widget&..." which expo-router maps to the root route
  // ("/") with query params. This effect catches those params as a fallback.
  //
  // The Linking handler in RootLayout covers repeated-tap edge cases.
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

      {/* Settings sheet */}
      <BottomSheet visible={activeSheet === 'settings'} onClose={closeSheet} backgroundColor={theme.background}
        instantClose={previousSheet === 'settings'} instantOpen={isSwitching}>
        <SettingsScreen onClose={closeSheet} onBack={goBack} />
      </BottomSheet>

      {/* Share sheet */}
      <BottomSheet visible={activeSheet === 'share'} onClose={closeSheet} backgroundColor={theme.background}
        instantClose={previousSheet === 'share'} instantOpen={isSwitching}>
        <ShareScreen onClose={closeSheet} />
      </BottomSheet>

      {/* Paywall step 1 — "How your free trial works". Its CTA raises the
          RevenueCat paywall (step 2). Every gated action in the app opens
          this sheet. */}
      <BottomSheet visible={activeSheet === 'trial'} onClose={closeSheet} backgroundColor={theme.background}
        instantClose={previousSheet === 'trial'} instantOpen={isSwitching}>
        <TrialScreen onClose={closeSheet} />
      </BottomSheet>

      {/* Paywall — rendered last so it appears above all sheets.
          Mounted only when visible so the native RevenueCatUI.Paywall view
          isn't constructed on every home-screen render. (Note: QuoteCard also
          calls useRevenueCat() for isPro gating, so the SDK still configures
          at launch — this only avoids the native paywall view.) */}
      {paywallVisible && <PaywallSheet visible onClose={closePaywall} />}
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
