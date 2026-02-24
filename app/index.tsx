import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ThemeBackground } from '../components/layout/ThemeBackground';
import { QuoteCard } from '../components/quotes/QuoteCard';
import { useStreak } from '../hooks/useStreak';

export default function HomeScreen() {
  const router = useRouter();
  useStreak(); // Track daily visit for streak

  return (
    <ThemeBackground>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <QuoteCard
          onOpenMix={() => router.push('/mix/create')}
          onOpenThemes={() => router.push('/themes')}
          onOpenCategories={() => router.push('/categories')}
        />
      </SafeAreaView>
    </ThemeBackground>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
});
