import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../hooks/useTheme';
import { WidgetBridge } from '../../../modules/widget-bridge';
import { ConfirmSheet } from '../../ui/ConfirmSheet';
import { OnboardingHeader } from '../OnboardingHeader';
import { ContinueButton } from '../ContinueButton';
import { OB } from '../tokens';

interface Props {
  /** Finishes onboarding — this is the last screen. */
  next: () => void;
  back?: () => void;
  progress?: number;
}

export function WidgetInstallScreen({ next, back, progress }: Props) {
  const theme = useTheme();
  const [installing, setInstalling] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const handleInstall = useCallback(async () => {
    setInstalling(true);
    let pinned = false;
    try {
      pinned = await WidgetBridge.requestPinWidget();
    } catch {
      // Treated as "not pinned" below.
    } finally {
      setInstalling(false);
    }

    // The system dialog never appeared (module not linked, or the launcher
    // doesn't support pinning) — show manual steps rather than silently
    // advancing past a step that did nothing.
    if (pinned) next();
    else setShowInstructions(true);
  }, [next]);

  return (
    <View style={[wg.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={wg.safe} edges={['top', 'bottom']}>
        <OnboardingHeader progress={progress} onBack={back} />

        <View style={wg.heads}>
          <Text style={[wg.headline, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
            Add a widget to your Home Screen
          </Text>
          <Text style={[wg.subhead, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
            On your phone's Home Screen, touch and hold an empty area and then select the Quotable
            widget from the list
          </Text>
        </View>

        <View style={wg.art}>
          <View style={[wg.phone, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <View style={[wg.widget, { backgroundColor: theme.surfaceElevated }]}>
              <Text style={[wg.widgetText, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
                Everything is fine.
              </Text>
            </View>
            <View style={wg.appGrid}>
              {Array.from({ length: 8 }).map((_, i) => (
                <View key={i} style={[wg.appIcon, { backgroundColor: theme.text + '1a' }]} />
              ))}
            </View>
          </View>
        </View>

        <View style={wg.footer}>
          <ContinueButton
            onPress={handleInstall}
            label={installing ? 'Installing…' : 'Install widget'}
            disabled={installing}
          />
          <ContinueButton onPress={next} label="Remind me later" variant="ghost" />
        </View>

        <ConfirmSheet
          visible={showInstructions}
          onClose={() => setShowInstructions(false)}
          title="Add a Widget"
          message={
            'To add a Quotable widget:\n\n1. Long-press your Home Screen\n2. Tap the "+" button\n3. Search for Quotable'
          }
          confirmLabel="Got it!"
          onConfirm={next}
        />
      </SafeAreaView>
    </View>
  );
}

const wg = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  heads: { paddingHorizontal: OB.gutter, paddingTop: 20, paddingBottom: 24 },
  headline: { fontSize: 28, lineHeight: 36, textAlign: 'center' },
  subhead: { fontSize: 15, lineHeight: 21, textAlign: 'center', marginTop: 10 },
  art: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingBottom: 12 },
  phone: {
    width: 200,
    height: 320,
    borderRadius: 32,
    borderWidth: 2,
    padding: 16,
    alignItems: 'center',
  },
  widget: {
    width: '100%',
    height: 96,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  widgetText: { fontSize: 18 },
  appGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 20,
    justifyContent: 'center',
  },
  appIcon: { width: 34, height: 34, borderRadius: 10 },
});
