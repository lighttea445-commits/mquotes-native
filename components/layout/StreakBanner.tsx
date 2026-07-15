import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StreakCard } from '../ui/StreakCard';

interface Props {
  visible: boolean;
  streakCount: number;
  weekData: boolean[];
  onDismiss: () => void;
}

const OVERSHOOT = 200;

export function StreakBanner({ visible, streakCount, weekData, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-OVERSHOOT);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;

    translateY.value = -OVERSHOOT;
    opacity.value = 0;

    translateY.value = withSequence(
      withSpring(0, { damping: 18, stiffness: 260, mass: 0.85 }),
      withDelay(
        2400,
        withTiming(-OVERSHOOT, { duration: 380, easing: Easing.in(Easing.cubic) }, (finished) => {
          if (finished) runOnJS(onDismiss)();
        }),
      ),
    );

    opacity.value = withSequence(
      withTiming(1, { duration: 180 }),
      withTiming(1, { duration: 2700 }),
      withTiming(0, { duration: 340 }),
    );
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[styles.wrapper, { top: insets.top + 10 }, animStyle]}
      pointerEvents="none"
    >
      <StreakCard streakCount={streakCount} weekData={weekData} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 999,
    // Lift the card off the screen visually
    shadowColor: '#B8975A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 12,
  },
});
