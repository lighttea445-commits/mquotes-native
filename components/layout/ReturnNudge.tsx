import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAppStore } from '../../store/useAppStore';
import { Bell } from '../art/Bell';
import { WidgetPhone } from '../art/WidgetPhone';
import { GUTTER, RADIUS, ON_GOLD } from '../ui/tokens';

interface Props {
  onOpenNotifications: () => void;
  onOpenWidgets: () => void;
}

const COPY = {
  notifications: {
    headline: "Don't miss your daily quotes!",
    subhead: 'Turn on notifications to keep your streak going and get quotes right when you need them.',
    cta: 'Turn On Notifications',
  },
  widget: {
    headline: 'Add Quotable to your Home Screen',
    subhead: 'See a new quote every time you glance at your phone, no need to open the app.',
    cta: 'Add Widget',
  },
} as const;

/**
 * Surfaces after a 24h+ absence when the user is missing notifications or a
 * widget (never both at once — see hooks/useReturnNudge). Reuses the same
 * artwork as the onboarding and Profile screens for the matching setup step.
 */
export function ReturnNudge({ onOpenNotifications, onOpenWidgets }: Props) {
  const theme = useTheme();
  const type = useAppStore((s) => s.returnNudgeType);
  const setReturnNudgeType = useAppStore((s) => s.setReturnNudgeType);
  const visible = type !== null;

  const [rendered, setRendered] = useState(false);
  const [displayType, setDisplayType] = useState(type);
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setDisplayType(type);
      setRendered(true);
    } else if (rendered) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.92, duration: 200, useNativeDriver: true }),
      ]).start(() => setRendered(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rendered]);

  if (!rendered || !displayType) return null;

  const dismiss = () => setReturnNudgeType(null);
  const copy = COPY[displayType];

  const handlePrimary = () => {
    dismiss();
    if (displayType === 'notifications') onOpenNotifications();
    else onOpenWidgets();
  };

  return (
    <Modal transparent visible animationType="none" onRequestClose={dismiss} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
      </Animated.View>

      <View style={styles.center} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: theme.surface, transform: [{ scale }], opacity },
          ]}
        >
          <View style={styles.art}>
            {displayType === 'notifications' ? (
              <Bell size={140} color={theme.gold} />
            ) : (
              <WidgetPhone size={140} color={theme.gold} />
            )}
          </View>

          <Text style={[styles.headline, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
            {copy.headline}
          </Text>
          <Text style={[styles.subhead, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
            {copy.subhead}
          </Text>

          <Pressable style={[styles.primaryBtn, { backgroundColor: theme.goldButton }]} onPress={handlePrimary}>
            <Text style={[styles.primaryLabel, { color: ON_GOLD, fontFamily: theme.uiFontFamily }]}>
              {copy.cta}
            </Text>
          </Pressable>
          <Pressable style={styles.ghostBtn} onPress={dismiss}>
            <Text style={[styles.ghostLabel, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              Not now
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(0,0,0,0.5)' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: GUTTER + 8 },
  card: {
    width: '100%',
    borderRadius: RADIUS.tile,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 20,
  },
  art: { marginBottom: 12 },
  headline: { fontSize: 22, lineHeight: 28, textAlign: 'center' },
  subhead: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 10, marginBottom: 22 },
  primaryBtn: { width: '100%', borderRadius: RADIUS.pill, paddingVertical: 16, alignItems: 'center' },
  primaryLabel: { fontSize: 16, fontWeight: '600' },
  ghostBtn: { paddingTop: 14, paddingBottom: 2, alignItems: 'center' },
  ghostLabel: { fontSize: 14, fontWeight: '600' },
});
