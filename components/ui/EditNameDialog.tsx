import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { RADIUS } from './tokens';

interface EditNameDialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** Seeds the field each time the dialog opens. */
  initialValue: string;
  placeholder?: string;
  onSubmit: (name: string) => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

/**
 * Centered text-entry dialog.
 *
 * Shares its shell with ConfirmSheet — same backdrop, spring-in card and
 * deferred unmount so the exit animation can play — but swaps the message line
 * for an input. Kept separate rather than folded into ConfirmSheet because the
 * two differ in focus handling, keyboard avoidance and submit semantics.
 */
export function EditNameDialog({
  visible,
  onClose,
  title,
  initialValue,
  placeholder,
  onSubmit,
  confirmLabel = 'Ok',
  cancelLabel = 'Cancel',
}: EditNameDialogProps) {
  const theme = useTheme();
  const [rendered, setRendered] = useState(false);
  const [value, setValue] = useState(initialValue);
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reseed on open so a cancelled edit doesn't persist into the next one.
      setValue(initialValue);
      setRendered(true);
    } else if (rendered) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.92, duration: 200, useNativeDriver: true }),
      ]).start(() => setRendered(false));
    }
  }, [visible]);

  useEffect(() => {
    if (rendered) {
      scale.setValue(0.92);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, damping: 20, stiffness: 260, useNativeDriver: true }),
      ]).start();
    }
  }, [rendered]);

  if (!rendered) return null;

  const trimmed = value.trim();

  const handleSubmit = () => {
    if (!trimmed) return;
    onSubmit(trimmed);
    onClose();
  };

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <KeyboardAvoidingView
        style={styles.center}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: theme.surface, transform: [{ scale }], opacity },
          ]}
        >
          <Text style={[styles.title, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
            {title}
          </Text>

          <TextInput
            style={[
              styles.input,
              {
                color: theme.text,
                backgroundColor: theme.background,
                borderColor: theme.border,
                fontFamily: theme.uiFontFamily,
              },
            ]}
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={theme.textMuted}
            autoFocus
            selectTextOnFocus
            maxLength={50}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          <View style={styles.buttons}>
            <Pressable
              style={[styles.btn, { backgroundColor: theme.background, borderColor: theme.border, borderWidth: 1 }]}
              onPress={onClose}
              accessibilityRole="button"
            >
              <Text style={[styles.btnText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                {cancelLabel}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.btn, { backgroundColor: theme.text, opacity: trimmed ? 1 : 0.4 }]}
              onPress={handleSubmit}
              disabled={!trimmed}
              accessibilityRole="button"
            >
              <Text style={[styles.btnText, { color: theme.background, fontFamily: theme.uiFontFamily }]}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(0,0,0,0.5)' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 20,
  },
  title: { fontSize: 18, textAlign: 'center', marginBottom: 18 },
  input: {
    fontSize: 16,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 18,
  },
  buttons: { flexDirection: 'row', gap: 10 },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
  },
  btnText: { fontSize: 15 },
});
