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
 * Full-bleed centered statement — the pacing screens between question blocks.
 *
 * The reference has no header on these; back and the progress bar are kept so
 * a 30-screen flow stays navigable and legible.
 */
export function StatementScreen({ text, onNext, onBack, progress, label = 'Continue' }: Props) {
  const theme = useTheme();

  return (
    <View style={[st.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={st.safe} edges={['top', 'bottom']}>
        <OnboardingHeader progress={progress} onBack={onBack} />

        <View style={st.center}>
          <Text style={[st.text, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
            {text}
          </Text>
        </View>

        <ContinueButton onPress={onNext} label={label} />
      </SafeAreaView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: OB.gutter },
  text: { fontSize: 32, lineHeight: 42, textAlign: 'center' },
});
