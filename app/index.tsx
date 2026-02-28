import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeBackground } from '../components/layout/ThemeBackground';
import { QuoteCard } from '../components/quotes/QuoteCard';
import { BottomSheet } from '../components/layout/BottomSheet';
import { StreakBanner } from '../components/layout/StreakBanner';
import { useStreak } from '../hooks/useStreak';
import { useTheme } from '../hooks/useTheme';
import CategoriesScreen from './categories';
import ThemesScreen from './themes';
import CreateMixScreen from './mix/create';
import ProfileScreen from './profile';
import MyQuotesScreen from './my-quotes';

type ActiveSheet = 'categories' | 'themes' | 'mix' | 'profile' | 'myquotes' | null;

export default function HomeScreen() {
  const theme = useTheme();
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  const { streakCount, weekData, showStreakBanner, dismissStreakBanner } = useStreak();

  const close = () => setActiveSheet(null);

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ThemeBackground style={styles.safe}>
          <QuoteCard
            onOpenMix={() => setActiveSheet('mix')}
            onOpenThemes={() => setActiveSheet('themes')}
            onOpenCategories={() => setActiveSheet('categories')}
            onOpenProfile={() => setActiveSheet('profile')}
          />
        </ThemeBackground>
      </SafeAreaView>

      <StreakBanner
        visible={showStreakBanner}
        streakCount={streakCount}
        weekData={weekData}
        onDismiss={dismissStreakBanner}
      />

      {/* Categories sheet */}
      <BottomSheet
        visible={activeSheet === 'categories'}
        onClose={close}
        backgroundColor={theme.background}
      >
        <CategoriesScreen
          onClose={close}
          onOpenMix={() => setActiveSheet('mix')}
          onOpenMyQuotes={() => setActiveSheet('myquotes')}
        />
      </BottomSheet>

      {/* Themes sheet */}
      <BottomSheet
        visible={activeSheet === 'themes'}
        onClose={close}
        backgroundColor={theme.background}
      >
        <ThemesScreen onClose={close} />
      </BottomSheet>

      {/* Mix builder sheet */}
      <BottomSheet
        visible={activeSheet === 'mix'}
        onClose={close}
        backgroundColor={theme.background}
      >
        <CreateMixScreen onClose={close} />
      </BottomSheet>

      {/* Profile sheet */}
      <BottomSheet
        visible={activeSheet === 'profile'}
        onClose={close}
        backgroundColor={theme.background}
      >
        <ProfileScreen
          onClose={close}
          onOpenThemes={() => setActiveSheet('themes')}
        />
      </BottomSheet>

      {/* My Quotes sheet */}
      <BottomSheet
        visible={activeSheet === 'myquotes'}
        onClose={close}
        backgroundColor={theme.background}
      >
        <MyQuotesScreen onClose={close} />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
});
