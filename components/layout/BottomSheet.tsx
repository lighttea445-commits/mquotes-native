import React, { useEffect, useCallback, useState } from 'react';
import { Dimensions, StyleSheet, Pressable, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
// Gap at top so main card peeks through (~8% of screen)
const SHEET_TOP_GAP = Math.round(SCREEN_HEIGHT * 0.08);

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  backgroundColor: string;
}

export function BottomSheet({ visible, onClose, children, backgroundColor }: BottomSheetProps) {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  // `rendered` keeps the sheet in the tree during the close animation
  const [rendered, setRendered] = useState(false);

  const animateOpen = useCallback(() => {
    backdropOpacity.value = withTiming(1, { duration: 280 });
    translateY.value = withSpring(0, { damping: 28, stiffness: 230, mass: 0.85 });
  }, []);

  const animateClose = useCallback((done?: () => void) => {
    backdropOpacity.value = withTiming(0, { duration: 360 });
    translateY.value = withTiming(
      SCREEN_HEIGHT,
      { duration: 440, easing: Easing.out(Easing.cubic) },
      () => { if (done) runOnJS(done)(); }
    );
  }, []);

  useEffect(() => {
    if (visible) {
      setRendered(true);
    } else if (rendered) {
      animateClose(() => setRendered(false));
    }
  }, [visible]);

  // When rendered becomes true, kick off the open animation
  useEffect(() => {
    if (rendered) {
      translateY.value = SCREEN_HEIGHT;
      backdropOpacity.value = 0;
      setTimeout(animateOpen, 16);
    }
  }, [rendered]);

  const handleClose = useCallback(() => {
    animateClose(onClose);
  }, [animateClose, onClose]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Drag-to-dismiss gesture
  const dragGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY;
        backdropOpacity.value = Math.max(0, 1 - e.translationY / (SCREEN_HEIGHT * 0.4));
      }
    })
    .onEnd((e) => {
      if (e.translationY > SCREEN_HEIGHT * 0.18 || e.velocityY > 600) {
        runOnJS(handleClose)();
      } else {
        translateY.value = withSpring(0, { damping: 28, stiffness: 230 });
        backdropOpacity.value = withTiming(1, { duration: 200 });
      }
    });

  if (!rendered) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'box-none' : 'none'}>
      {/* Dim backdrop — tap to close */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} pointerEvents="box-none">
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      {/* Sheet panel */}
      <Animated.View
        style={[
          styles.sheet,
          { top: SHEET_TOP_GAP, backgroundColor },
          sheetStyle,
        ]}
      >
        {/* Drag handle zone */}
        <GestureDetector gesture={dragGesture}>
          <View style={styles.dragZone}>
            <View style={styles.dragPill} />
          </View>
        </GestureDetector>

        {/* Content */}
        <View style={styles.content}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 24,
  },
  dragZone: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 6,
  },
  dragPill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  content: {
    flex: 1,
  },
});
