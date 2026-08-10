import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { ON_GOLD } from './tokens';

interface ConfirmSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  /** Red confirm button for destructive actions */
  destructive?: boolean;
  /** Omit to show only the confirm button (info mode) */
  cancelLabel?: string;
}

export function ConfirmSheet({
  visible,
  onClose,
  title,
  message,
  confirmLabel,
  onConfirm,
  destructive,
  cancelLabel,
}: ConfirmSheetProps) {
  const theme = useTheme();
  const [rendered, setRendered] = useState(false);
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
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

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {/* Backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Centered card */}
      <View style={styles.center} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: theme.surface,
              transform: [{ scale }],
              opacity,
            },
          ]}
        >
          <Text style={[styles.title, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
            {title}
          </Text>
          <Text style={[styles.message, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
            {message}
          </Text>

          <View style={styles.buttons}>
            {cancelLabel !== undefined && (
              <Pressable
                style={[styles.btn, { backgroundColor: theme.background, borderColor: theme.border, borderWidth: 1 }]}
                onPress={onClose}
              >
                <Text style={[styles.btnText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                  {cancelLabel}
                </Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.btn, { backgroundColor: destructive ? '#C0392B' : theme.goldButton }]}
              onPress={handleConfirm}
            >
              <Text
                style={[
                  styles.btnText,
                  { color: destructive ? theme.text : ON_GOLD, fontFamily: theme.uiFontFamily },
                ]}
              >
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
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
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 24,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
