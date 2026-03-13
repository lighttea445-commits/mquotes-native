import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeBackground } from '../components/layout/ThemeBackground';
import { QuoteCard } from '../components/quotes/QuoteCard';
import { BottomSheet } from '../components/layout/BottomSheet';
import { StreakBanner } from '../components/layout/StreakBanner';
import { PaywallSheet } from '../components/subscriptions/PaywallSheet';
import { useStreak } from '../hooks/useStreak';
import { useTheme } from '../hooks/useTheme';
import { ModalProvider, useModal } from '../contexts/ModalContext';
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

function HomeScreenInner() {
  const theme = useTheme();
  const { activeSheet, previousSheet, paywallVisible, goBack, closeSheet, closePaywall } = useModal()!;
  // True when switching between sheets (not a fresh open/close) — used to skip animations
  const isSwitching = previousSheet !== null;
  const { streakCount, weekData, showStreakBanner, dismissStreakBanner } = useStreak();

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
