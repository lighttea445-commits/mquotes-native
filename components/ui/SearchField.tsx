import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
import { useTheme } from '../../hooks/useTheme';
import { SPACE, RADIUS } from './tokens';

interface SearchFieldProps {
  value: string;
  onChangeText: (v: string) => void;
  /** Defaults to "Search". */
  placeholder?: string;
  accessibilityLabel: string;
}

/**
 * The pill search field at the top of a saved-quote list. Sits on
 * `theme.surface` like every other input in the app, with the glyph inside the
 * pill rather than beside it.
 */
export function SearchField({
  value,
  onChangeText,
  placeholder = 'Search',
  accessibilityLabel,
}: SearchFieldProps) {
  const theme = useTheme();

  return (
    <View style={[styles.field, { backgroundColor: theme.surface }]}>
      <Icon name="magnify" size={22} color={theme.textMuted} />
      <TextInput
        style={[styles.input, { color: theme.text, fontFamily: theme.uiFontFamily }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel={accessibilityLabel}
      />
      {value.length > 0 && (
        <IconButton
          icon="close"
          onPress={() => onChangeText('')}
          filled={false}
          size={24}
          iconSize={18}
          color={theme.textMuted}
          accessibilityLabel="Clear search"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    height: 52,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.lg,
  },
  input: {
    flex: 1,
    fontSize: 16,
    // Android inflates the input box with font padding, which pushes the text
    // off-centre against the glyph beside it.
    includeFontPadding: false,
    paddingVertical: 0,
  },
});
