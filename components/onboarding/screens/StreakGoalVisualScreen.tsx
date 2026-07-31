import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../hooks/useTheme';
import { StreakCard } from '../../ui/StreakCard';
import { OnboardingHeader } from '../OnboardingHeader';
import { ContinueButton } from '../ContinueButton';
import { OB } from '../tokens';

interface Props {
  /** Goal chosen on the previous step — 3, 7 or 21. */
  goalDays?: number;
  next: () => void;
  back?: () => void;
  progress?: number;
}

/** Day 1 of the streak, reflecting the goal the user just picked. */
const DAY_ONE: boolean[] = [true, false, false, false, false, false, false];

export function StreakGoalVisualScreen({ goalDays, next, back, progress }: Props) {
  const theme = useTheme();

  return (
    <View style={[sg.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={sg.safe} edges={['top', 'bottom']}>
        <OnboardingHeader progress={progress} onBack={back} />

        <View style={sg.content}>
          <View style={sg.cardWrap}>
            <StreakCard streakCount={1} weekData={DAY_ONE} />
          </View>

          <Text style={[sg.headline, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
            Build a daily quote habit that sticks
          </Text>
          <Text style={[sg.subhead, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
            {goalDays
              ? `Build a streak, one day at a time — ${goalDays} to go`
              : 'Build a streak, one day at a time'}
          </Text>
        </View>

        <ContinueButton onPress={next} />
      </SafeAreaView>
    </View>
  );
}

const sg = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  content: { flex: 1, paddingHorizontal: OB.gutter, justifyContent: 'center' },
  cardWrap: { marginBottom: 32 },
  headline: { fontSize: 28, lineHeight: 36, textAlign: 'center' },
  subhead: { fontSize: 15, lineHeight: 21, textAlign: 'center', marginTop: 10 },
});
