import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../hooks/useTheme';
import { OnboardingHeader } from '../OnboardingHeader';
import { ContinueButton } from '../ContinueButton';
import { OB } from '../tokens';

interface Props {
  value: string;
  onChange: (v: string) => void;
  next: () => void;
  back?: () => void;
  skip?: () => void;
  progress?: number;
}

export function NameScreen({ value, onChange, next, back, skip, progress }: Props) {
  const theme = useTheme();
  const [local, setLocal] = useState(value);

  const submit = () => {
    onChange(local.trim());
    next();
  };

  return (
    <View style={[nm.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={nm.safe} edges={['top', 'bottom']}>
        <OnboardingHeader progress={progress} onBack={back} onSkip={skip} />

        <KeyboardAvoidingView
          style={nm.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={nm.heads}>
            <Text style={[nm.headline, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
              What do you want to be called?
            </Text>
            <Text style={[nm.subhead, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              Your name will appear in your quotes
            </Text>
          </View>

          <View style={nm.body}>
            <TextInput
              value={local}
              onChangeText={setLocal}
              placeholder="Your name"
              placeholderTextColor={theme.textMuted}
              autoFocus
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              maxLength={50}
              onSubmitEditing={submit}
              style={[
                nm.input,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  color: theme.text,
                  fontFamily: theme.uiFontFamily,
                },
              ]}
            />
          </View>

          <ContinueButton onPress={submit} />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const nm = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  heads: { paddingHorizontal: OB.gutter, paddingTop: 20, paddingBottom: 24 },
  headline: { fontSize: 28, lineHeight: 36, textAlign: 'center' },
  subhead: { fontSize: 15, lineHeight: 21, textAlign: 'center', marginTop: 10 },
  body: { flex: 1, paddingHorizontal: OB.gutter },
  input: {
    borderRadius: OB.pill,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 18,
    fontSize: 16,
  },
});
