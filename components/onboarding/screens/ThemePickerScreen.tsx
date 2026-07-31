import React, { useMemo } from 'react';
import { View } from 'react-native';
import { THEMES, ONBOARDING_THEME_IDS } from '../../../constants/themes';
import { OnboardingLayout } from '../OnboardingLayout';
import { ContinueButton } from '../ContinueButton';
import { ThemeGrid } from '../ThemeGrid';

interface Props {
  selectedId: string;
  onSelect: (id: string) => void;
  next: () => void;
  back?: () => void;
  progress?: number;
}

/**
 * The six free onboarding themes. Selection applies immediately, so every
 * screen after this one renders in the user's choice.
 */
export function ThemePickerScreen({ selectedId, onSelect, next, back, progress }: Props) {
  const themes = useMemo(
    () =>
      ONBOARDING_THEME_IDS.map((id) => THEMES.find((t) => t.id === id)).filter(
        (t): t is (typeof THEMES)[number] => Boolean(t),
      ),
    [],
  );

  return (
    <OnboardingLayout
      headline="Which theme would you like to start with?"
      subhead="Choose from a larger selection of themes or create your own later"
      progress={progress}
      onBack={back}
      footer={<ContinueButton onPress={next} />}
    >
      <View>
        <ThemeGrid themes={themes} selectedId={selectedId} onSelect={onSelect} />
      </View>
    </OnboardingLayout>
  );
}
