import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../hooks/useTheme';
import { OnboardingHeader } from '../OnboardingHeader';
import { ContinueButton } from '../ContinueButton';
import { OB } from '../tokens';

interface Props {
  next: () => void;
  back?: () => void;
  progress?: number;
}

/** Pre-frames the paywall so the offer on the next screen isn't a surprise. */
export function TrialPromiseScreen({ next, back, progress }: Props) {
  const theme = useTheme();

  return (
    <View style={[tp.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={tp.safe} edges={['top', 'bottom']}>
        <OnboardingHeader progress={progress} onBack={back} />

        <View style={tp.heads}>
          <Text style={[tp.headline, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
            We'll send you a reminder 1 day before your trial ends
          </Text>
          <Text style={[tp.subhead, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
            No surprises, no pressure
          </Text>
        </View>

        <View style={tp.art}>
          <View style={[tp.phone, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <Text style={[tp.clock, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
              11:11
            </Text>
          </View>
          <MaterialCommunityIcons
            name="bell-ring-outline"
            size={64}
            color={theme.gold}
            style={tp.bell}
          />
        </View>

        <ContinueButton onPress={next} label="Try it for free" />
      </SafeAreaView>
    </View>
  );
}

const tp = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  heads: { paddingHorizontal: OB.gutter, paddingTop: 20, paddingBottom: 24 },
  headline: { fontSize: 28, lineHeight: 36, textAlign: 'center' },
  subhead: { fontSize: 15, lineHeight: 21, textAlign: 'center', marginTop: 10 },
  art: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  phone: {
    width: 150,
    height: 250,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    paddingTop: 40,
  },
  clock: { fontSize: 40 },
  bell: { position: 'absolute', left: '18%', top: '38%' },
});
