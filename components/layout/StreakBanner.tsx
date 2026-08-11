import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  cancelAnimation,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StreakCard } from '../ui/StreakCard';

interface Props {
  visible: boolean;
  streakCount: number;
  weekData: boolean[];
  onDismiss: () => void;
}

const OVERSHOOT = 200;
/** How long the card rests on screen once it has settled, in ms. */
const HOLD_MS = 2400;
/** Roughly how long the entry spring takes, used to line opacity up with translateY. */
const SETTLE_MS = 500;
const SPRING = { damping: 18, stiffness: 260, mass: 0.85 };
const OUT = { duration: 380, easing: Easing.in(Easing.cubic) };
/** Past either of these the swipe counts as "get rid of it". */
const DISMISS_DISTANCE = -36;
const DISMISS_VELOCITY = -550;

export function StreakBanner({ visible, streakCount, weekData, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-OVERSHOOT);
  const opacity = useSharedValue(0);
  const startY = useSharedValue(0);

  // Drop in, rest, then leave on its own. Also the snap-back path when a swipe
  // doesn't travel far enough, which is why it re-fades opacity rather than
  // assuming the card is already at full strength.
  const settleAndHold = () => {
    'worklet';
    translateY.value = withSequence(
      withSpring(0, SPRING),
      withDelay(
        HOLD_MS,
        withTiming(-OVERSHOOT, OUT, (finished) => {
          if (finished) runOnJS(onDismiss)();
        }),
      ),
    );
    opacity.value = withSequence(
      withTiming(1, { duration: 180 }),
      withDelay(SETTLE_MS + HOLD_MS - 180, withTiming(0, { duration: 340 })),
    );
  };

  useEffect(() => {
    if (!visible) return;
    translateY.value = -OVERSHOOT;
    opacity.value = 0;
    settleAndHold();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Swipe up to send it away early. Downward drag rubber-bands instead of
  // pulling the card down over the quote, since there's nothing under it to
  // reveal.
  const pan = Gesture.Pan()
    .activeOffsetY([-6, 6])
    .onStart(() => {
      cancelAnimation(translateY);
      cancelAnimation(opacity);
      startY.value = translateY.value;
      opacity.value = 1;
    })
    .onUpdate((e) => {
      const next = startY.value + e.translationY;
      translateY.value = next > 0 ? next * 0.2 : next;
    })
    .onEnd((e) => {
      if (e.translationY < DISMISS_DISTANCE || e.velocityY < DISMISS_VELOCITY) {
        // Finish the trip the finger started, at the speed it implied rather
        // than the leisurely auto-dismiss timing.
        const remaining = translateY.value + OVERSHOOT;
        const duration = Math.max(90, Math.min(200, remaining / 1.6));
        translateY.value = withTiming(
          -OVERSHOOT,
          { duration, easing: Easing.in(Easing.cubic) },
          (finished) => {
            if (finished) runOnJS(onDismiss)();
          },
        );
        opacity.value = withTiming(0, { duration });
        return;
      }
      settleAndHold();
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[styles.wrapper, { top: insets.top + 10 }, animStyle]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <StreakCard streakCount={streakCount} weekData={weekData} />
      </Animated.View>
    </GestureDetector>
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
