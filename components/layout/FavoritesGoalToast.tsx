import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../ui/Icon';
import { useTheme } from '../../hooks/useTheme';
import { useAppStore } from '../../store/useAppStore';
import { FAVORITES_GOAL, useFavoritesStore } from '../../store/useFavoritesStore';

/** How long the toast stays up before fading out, in ms. */
const HOLD_MS = 4200;
/** Clears the floating corner buttons: their 52pt height plus the 10pt inset. */
const BOTTOM_OFFSET = 74;

/**
 * Plays once, the moment the favourites goal is met: the goal pill disappears,
 * this takes its place and says what the counter was for.
 *
 * Never interactive. It sits over the quote while the user is still tapping
 * hearts, so swallowing a touch would cost a favourite.
 */
export function FavoritesGoalToast() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const count = useFavoritesStore((s) => s.favorites.length);
  const celebrated = useAppStore((s) => s.favoritesGoalCelebrated);
  const markCelebrated = useAppStore((s) => s.markFavoritesGoalCelebrated);

  const [visible, setVisible] = useState(false);
  // Seeded with the count at mount, so only a crossing that happens while the
  // user is watching fires the toast.
  const prevCount = useRef(count);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    const crossed = prevCount.current < FAVORITES_GOAL && count >= FAVORITES_GOAL;
    prevCount.current = count;
    if (celebrated || count < FAVORITES_GOAL) return;
    // Crossed while the user was watching, so celebrate. Already past the goal
    // at mount (or on an install from before this existed) — latch it silently
    // rather than congratulating someone for work they finished long ago.
    if (crossed) setVisible(true);
    markCelebrated();
  }, [count, celebrated, markCelebrated]);

  useEffect(() => {
    if (!visible) return;
    opacity.value = 0;
    translateY.value = 20;
    opacity.value = withSequence(
      withTiming(1, { duration: 260 }),
      withDelay(HOLD_MS, withTiming(0, { duration: 380 }, (finished) => {
        if (finished) runOnJS(setVisible)(false);
      })),
    );
    translateY.value = withSpring(0, { damping: 20, stiffness: 240, mass: 0.85 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.wrapper, { bottom: insets.bottom + BOTTOM_OFFSET }, animStyle]}
      pointerEvents="none"
      accessibilityLiveRegion="polite"
    >
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Icon name="heart-outline" size={26} color={theme.text} />
        <Text style={[styles.label, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
          Your feed is set up. Favorite more quotes to customize it further!
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 998,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 12,
  },
  label: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
