import { useCallback } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useHaptics } from './useHaptics';

/**
 * UIKit compresses a control towards its centre on touch down and springs it
 * back on release. Fast, slightly underdamped, and short enough that a quick
 * tap still reads as a full press.
 */
const PRESS_SPRING = { damping: 18, stiffness: 400, mass: 0.5 } as const;

interface PressScaleOptions {
  /**
   * How far to compress. Small circular controls take the default; wide pills
   * want something shallower, since the same ratio moves their edges much
   * further and reads as a wobble.
   */
  scale?: number;
  /** Selection tick on touch down. Respects the user's haptics preference. */
  haptic?: boolean;
}

/**
 * The shared press response for custom controls.
 *
 * Runs on the UI thread through Reanimated rather than through
 * `TouchableOpacity`'s opacity fade, so it stays responsive while the JS
 * thread is busy, which is where the stock fade gives itself away as
 * non-native.
 */
export function usePressScale({ scale = 0.92, haptic = true }: PressScaleOptions = {}) {
  const haptics = useHaptics();
  const value = useSharedValue(1);

  const onPressIn = useCallback(() => {
    value.value = withSpring(scale, PRESS_SPRING);
    if (haptic) haptics.selection();
  }, [scale, haptic, haptics]);

  const onPressOut = useCallback(() => {
    value.value = withSpring(1, PRESS_SPRING);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: value.value }],
  }));

  return { onPressIn, onPressOut, animatedStyle };
}
