import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../hooks/useTheme';
import { OnboardingHeader } from '../OnboardingHeader';
import { ContinueButton } from '../ContinueButton';
import { OB } from '../tokens';

interface Props {
  /** Resolves true when the OS grants permission. */
  onAllow: () => Promise<boolean>;
  next: () => void;
  back?: () => void;
  progress?: number;
}

/**
 * Permission comes after config, so the user is confirming a schedule they
 * already built rather than answering a cold OS prompt.
 *
 * Both outcomes advance — a denial is a valid answer, not a dead end.
 */
export function NotificationPermissionScreen({ onAllow, next, back, progress }: Props) {
  const theme = useTheme();
  const [asking, setAsking] = useState(false);

  const handleAllow = async () => {
    setAsking(true);
    try {
      await onAllow();
    } finally {
      setAsking(false);
      next();
    }
  };

  return (
    <View style={[np.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={np.safe} edges={['top', 'bottom']}>
        <OnboardingHeader progress={progress} onBack={back} />

        <View style={np.heads}>
          <Text style={[np.headline, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
            Don't miss your daily quotes!
          </Text>
          <Text style={[np.subhead, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
            Allow notifications, it'll have a big impact in your life
          </Text>
        </View>

        <View style={np.art}>
          <MaterialCommunityIcons name="bell-outline" size={112} color={theme.gold} />
          <MaterialCommunityIcons
            name="weather-night"
            size={30}
            color={theme.textMuted}
            style={np.moon}
          />
        </View>

        <View style={np.footer}>
          <ContinueButton
            onPress={handleAllow}
            label={asking ? 'Asking…' : 'Allow'}
            disabled={asking}
          />
          <ContinueButton onPress={next} label="I'm not ready yet" variant="ghost" />
        </View>
      </SafeAreaView>
    </View>
  );
}

const np = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  heads: { paddingHorizontal: OB.gutter, paddingTop: 20, paddingBottom: 24 },
  headline: { fontSize: 28, lineHeight: 36, textAlign: 'center' },
  subhead: { fontSize: 15, lineHeight: 21, textAlign: 'center', marginTop: 10 },
  art: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  moon: { position: 'absolute', top: '32%', left: '28%' },
  footer: { paddingBottom: 12 },
});
