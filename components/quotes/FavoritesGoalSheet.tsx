import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../ui/Icon';
import { useTheme } from '../../hooks/useTheme';
import { FONTS } from '../../constants/fonts';
import { GUTTER, RADIUS } from '../ui/tokens';
import { FAVORITES_GOAL } from '../../store/useFavoritesStore';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/** How far the panel has to be dragged down before releasing dismisses it. */
const DISMISS_DISTANCE = 90;

/**
 * Explainer for the favourites goal pill: what the counter is for and what
 * finishing it does. Opened by tapping the pill, dismissed by the CTA, a
 * backdrop tap, or dragging the panel down.
 *
 * A partial-height panel rather than the app's full-height `BottomSheet` — the
 * quote behind it stays visible, which is the point.
 */
export function FavoritesGoalSheet({ visible, onClose }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height: SCREEN_HEIGHT } = useWindowDimensions();

  const [rendered, setRendered] = useState(false);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const close = () => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 220, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  // Drag down to dismiss. PanResponder rather than gesture-handler: this panel
  // lives inside a native Modal, which is its own window on Android and outside
  // the root GestureHandlerRootView.
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_e, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dy > DISMISS_DISTANCE || g.vy > 0.8) close();
        else Animated.spring(translateY, { toValue: 0, damping: 22, stiffness: 260, useNativeDriver: true }).start();
      },
    }),
  ).current;

  useEffect(() => {
    if (visible) setRendered(true);
    else if (rendered) setRendered(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (!rendered) return;
    translateY.setValue(SCREEN_HEIGHT);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, damping: 26, stiffness: 240, mass: 0.85, useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rendered]);

  if (!rendered) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={close} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close" />
      </Animated.View>

      <View style={styles.anchor} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.panel,
            {
              backgroundColor: theme.surface,
              paddingBottom: insets.bottom + 24,
              transform: [{ translateY }],
            },
          ]}
          {...pan.panHandlers}
        >
          <View style={[styles.grabber, { backgroundColor: theme.border }]} />

          <View style={styles.art}>
            <Icon name="heart" size={132} color={theme.favorite ?? theme.gold} />
          </View>

          <Text style={[styles.headline, { color: theme.text }]}>
            Get quotes that resonate with you
          </Text>
          <Text style={[styles.subhead, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
            Personalize your feed by adding at least {FAVORITES_GOAL} quotes to favorites
          </Text>

          <Pressable
            style={[styles.cta, { backgroundColor: theme.text }]}
            onPress={close}
            accessibilityRole="button"
          >
            <Text style={[styles.ctaLabel, { color: theme.background }]}>Got it!</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  anchor: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  panel: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: GUTTER + 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 24,
  },
  grabber: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  art: {
    marginTop: 34,
    marginBottom: 8,
  },
  headline: {
    fontFamily: FONTS.display.bold,
    fontSize: 27,
    lineHeight: 34,
    includeFontPadding: false,
    textAlign: 'center',
    marginTop: 26,
  },
  subhead: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 12,
  },
  cta: {
    width: '100%',
    borderRadius: RADIUS.pill,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 32,
  },
  ctaLabel: {
    fontFamily: FONTS.ui.bold,
    fontSize: 16,
  },
});
