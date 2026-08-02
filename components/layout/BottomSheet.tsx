import React, { useEffect, useCallback, useState, useRef } from 'react';
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
// Sheets travel to the very top of the screen. Individual sheets can still
// opt out via the `topGap` prop.
const SHEET_TOP_GAP = 0;

// Breathing room between the status bar and a sheet's header row. Each screen
// already pads itself by the top safe-area inset, which stops exactly at the
// bottom of the status bar — without this the close button sits flush against
// the clock.
const SHEET_CONTENT_TOP = 14;

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  backgroundColor: string;
  /** Skip close animation — sheet vanishes instantly (used when switching to another sheet). */
  instantClose?: boolean;
  /** Skip open animation — sheet appears instantly at full height (used when replacing another sheet). */
  instantOpen?: boolean;
  /** Override the top gap (distance from top of screen). Defaults to SHEET_TOP_GAP (0 — full height). */
  topGap?: number;
}

export function BottomSheet({ visible, onClose, children, backgroundColor, instantClose, instantOpen, topGap }: BottomSheetProps) {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  // Keep-alive: children are lazy-mounted on first show and then stay in the native
  // tree permanently. This eliminates the "first-frame at SCREEN_HEIGHT" teleport
  // that occurs when a sheet remounts — translateY changes are pure value updates
  // on an already-present native view, so they take effect before the next frame.
  const [hasBeenShown, setHasBeenShown] = useState(false);

  // Refs so effects/gestures always see the latest prop values
  const instantCloseRef = useRef(instantClose);
  instantCloseRef.current = instantClose;
  const instantOpenRef = useRef(instantOpen);
  instantOpenRef.current = instantOpen;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Guards against double-animating when a gesture/backdrop already started the close
  // animation before the visible=false prop change arrives from the parent.
  const isAnimatingCloseRef = useRef(false);

  const animateOpen = useCallback(() => {
    backdropOpacity.value = withTiming(1, { duration: 280 });
    translateY.value = withSpring(0, { damping: 28, stiffness: 230, mass: 0.85 });
  }, []);

  const animateClose = useCallback((done?: () => void) => {
    backdropOpacity.value = withTiming(0, { duration: 360 });
    translateY.value = withTiming(
      SCREEN_HEIGHT,
      { duration: 440, easing: Easing.out(Easing.cubic) },
      () => { if (done) runOnJS(done)(); },
    );
  }, []);

  useEffect(() => {
    if (visible) {
      // Reset close guard on (re-)open
      isAnimatingCloseRef.current = false;
      if (!hasBeenShown) setHasBeenShown(true);

      if (instantOpenRef.current) {
        // Replacing another sheet — appear instantly.
        // Because the view is already in the native tree (keep-alive), this is a
        // direct value update with no mount race — zero teleport frames.
        translateY.value = 0;
        backdropOpacity.value = 1;
      } else {
        // Fresh open — slide up with spring
        translateY.value = SCREEN_HEIGHT;
        backdropOpacity.value = 0;
        setTimeout(animateOpen, 16);
      }
    } else if (hasBeenShown) {
      if (instantCloseRef.current) {
        // Replaced by another sheet — vanish instantly
        isAnimatingCloseRef.current = false;
        translateY.value = SCREEN_HEIGHT;
        backdropOpacity.value = 0;
      } else if (!isAnimatingCloseRef.current) {
        // Programmatic close (X button, etc.) — animate out.
        // If a gesture/backdrop already started the animation, skip to avoid
        // double-animating (the gesture handler calls onClose after its own animation).
        isAnimatingCloseRef.current = true;
        animateClose(() => { isAnimatingCloseRef.current = false; });
      }
    }
  }, [visible]);

  // Backdrop tap or drag-to-dismiss: animate first, then call onClose so the
  // parent's visible=false arrives only after the sheet has already left the screen.
  const handleClose = useCallback(() => {
    if (isAnimatingCloseRef.current) return;
    isAnimatingCloseRef.current = true;
    animateClose(() => {
      isAnimatingCloseRef.current = false;
      onCloseRef.current();
    });
  }, [animateClose]);

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

  // Not yet shown — don't add to the native tree at all
  if (!hasBeenShown) return null;

  return (
    // pointerEvents controls touch interception; the view stays in the native tree
    // even when !visible so there is no remount on next show.
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'box-none' : 'none'}>
      {/* Dim backdrop — tap to close */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} pointerEvents="box-none">
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      {/* Sheet panel */}
      <Animated.View
        style={[
          styles.sheet,
          { top: topGap ?? SHEET_TOP_GAP, backgroundColor },
          sheetStyle,
        ]}
      >
        {/* Content fills the sheet — at full height it starts at the very top edge */}
        <View style={styles.content}>
          {children}
        </View>

        {/* Drag-to-dismiss strip — an invisible band over the status-bar area,
            absolutely positioned so it does not push the content down. */}
        <GestureDetector gesture={dragGesture}>
          <View style={styles.dragZone} />
        </GestureDetector>
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
    // Full-height sheets sit flush against the status bar — a rounded top edge
    // would read as a rendering seam.
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 24,
  },
  // Kept inside the status-bar band so it never covers a screen's header
  // controls — screens pad themselves by the top safe-area inset, which is
  // at least this tall on every supported device.
  dragZone: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 20,
    zIndex: 2,
  },
  content: {
    flex: 1,
    paddingTop: SHEET_CONTENT_TOP,
  },
});
