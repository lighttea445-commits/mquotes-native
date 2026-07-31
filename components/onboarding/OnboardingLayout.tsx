import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { OnboardingHeader } from './OnboardingHeader';
import { OB } from './tokens';

interface Props {
  headline: string;
  subhead?: string;
  progress?: number;
  onBack?: () => void;
  onSkip?: () => void;
  /** Body content — scrolls when it overflows. */
  children?: React.ReactNode;
  /** Pinned below the scroll area. Usually a ContinueButton. */
  footer?: React.ReactNode;
  /** Skip the ScrollView when the body manages its own scrolling or fills the screen. */
  scroll?: boolean;
}

/**
 * Standard question-screen scaffold: header → centered headline → subhead →
 * scrolling body → pinned footer.
 *
 * Headline uses the theme's quote font (serif) and the subhead its UI font
 * (sans), matching the reference flow's serif/sans pairing.
 */
export function OnboardingLayout({
  headline,
  subhead,
  progress,
  onBack,
  onSkip,
  children,
  footer,
  scroll = true,
}: Props) {
  const theme = useTheme();

  const body = <View style={lay.body}>{children}</View>;

  return (
    <View style={[lay.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={lay.safe} edges={['top', 'bottom']}>
        <OnboardingHeader progress={progress} onBack={onBack} onSkip={onSkip} />

        <View style={lay.heads}>
          <Text
            style={[lay.headline, { color: theme.text, fontFamily: theme.quoteFontFamily }]}
          >
            {headline}
          </Text>
          {subhead ? (
            <Text
              style={[lay.subhead, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}
            >
              {subhead}
            </Text>
          ) : null}
        </View>

        {scroll ? (
          <ScrollView
            style={lay.scroll}
            contentContainerStyle={lay.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {body}
          </ScrollView>
        ) : (
          body
        )}

        {footer}
      </SafeAreaView>
    </View>
  );
}

const lay = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  heads: { paddingHorizontal: OB.gutter, paddingTop: 20, paddingBottom: 24 },
  headline: { fontSize: 28, lineHeight: 36, textAlign: 'center' },
  subhead: { fontSize: 15, lineHeight: 21, textAlign: 'center', marginTop: 10 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 16 },
  body: { flex: 1, paddingHorizontal: OB.gutter },
});
