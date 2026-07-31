import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { OnboardingHeader } from './OnboardingHeader';
import { ContinueButton } from './ContinueButton';
import { OB } from './tokens';

interface Props {
  text: string;
  onNext: () => void;
  onBack?: () => void;
  progress?: number;
  label?: string;
}

/**
 * Full-bleed statement — the pacing screens between question blocks.
 *
 * The text sits slightly above the optical centre: the spacer below it is
 * weighted heavier than the one above, which lifts the block by roughly 5% of
 * the available height and scales with the screen instead of a fixed offset.
 *
 * The reference has no header on these; back and the progress bar are kept so
 * a long flow stays navigable and legible.
 */
export function StatementScreen({ text, onNext, onBack, progress, label = 'Continue' }: Props) {
  const theme = useTheme();

  return (
    <View style={[st.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={st.safe} edges={['top', 'bottom']}>
        <OnboardingHeader progress={progress} onBack={onBack} />

        <View style={st.body}>
          <View style={st.spacerTop} />
          <Text style={[st.text, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
            {text}
          </Text>
          <View style={st.spacerBottom} />
        </View>

        <ContinueButton onPress={onNext} label={label} />
      </SafeAreaView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  body: { flex: 1, paddingHorizontal: OB.gutter },
  spacerTop: { flex: 1 },
  spacerBottom: { flex: 1.25 },
  text: { fontSize: 32, lineHeight: 42, textAlign: 'center' },
});
