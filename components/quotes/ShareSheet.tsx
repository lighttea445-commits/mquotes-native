import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Share,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ExpoSharing from 'expo-sharing';
import { useTheme } from '../../hooks/useTheme';

// Lazy-require so the app doesn't crash when the native module isn't linked yet.
// After `npx expo run:android` / `npx expo run:ios` this will resolve correctly.
let captureRef: ((ref: React.RefObject<any>, opts: object) => Promise<string>) | null = null;
try { captureRef = require('react-native-view-shot').captureRef; } catch {}
import { ShareCard } from './ShareCard';

interface Props {
  visible: boolean;
  quote: string;
  author: string;
  onClose: () => void;
}

const DRAG_CLOSE_THRESHOLD = 120;

export function ShareSheet({ visible, quote, author, onClose }: Props) {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const cardRef = useRef<View>(null);

  const cardPreviewWidth = Math.min(W - 80, 280);

  const SHEET_HEIGHT = H * 0.82;
  const translateY = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  const open = useCallback(() => {
    translateY.value = withSpring(0, { damping: 28, stiffness: 320, mass: 0.9 });
    backdropOpacity.value = withTiming(1, { duration: 250 });
  }, []);

  const close = useCallback(() => {
    translateY.value = withTiming(SHEET_HEIGHT, { duration: 260 });
    backdropOpacity.value = withTiming(0, { duration: 220 });
  }, [SHEET_HEIGHT]);

  React.useEffect(() => {
    if (visible) open();
    else close();
  }, [visible]);

  const startY = useSharedValue(0);
  const dragGesture = Gesture.Pan()
    .onStart(() => { startY.value = translateY.value; })
    .onUpdate((e) => {
      if (e.translationY > 0) translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY > DRAG_CLOSE_THRESHOLD) {
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, { damping: 26, stiffness: 300 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const handleShare = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (captureRef) {
      try {
        const uri = await captureRef(cardRef, { format: 'png', quality: 1.0, result: 'tmpfile' });
        const canShare = await ExpoSharing.isAvailableAsync();
        if (canShare) {
          await ExpoSharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share Quote' });
          return;
        }
      } catch {}
    }
    // Native module not linked — fall back to text
    await Share.share({ message: `"${quote}"\n\n— ${author}` });
  }, [quote, author]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
      {/* Backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      {/* Sheet */}
      <GestureDetector gesture={dragGesture}>
        <Animated.View
          style={[
            styles.sheet,
            {
              height: SHEET_HEIGHT,
              backgroundColor: theme.surface,
              borderColor: theme.border,
              paddingBottom: insets.bottom + 16,
            },
            sheetStyle,
          ]}
        >
          {/* Drag handle */}
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: theme.border }]} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
              Share Quote
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: theme.surfaceElevated }]}
            >
              <MaterialCommunityIcons name="close" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Card preview — this view is what gets captured */}
          <View style={styles.previewArea}>
            <View
              style={[
                styles.previewShadow,
                {
                  shadowColor: '#000',
                  width: cardPreviewWidth,
                  height: Math.round(cardPreviewWidth * 1.25),
                },
              ]}
            >
              <View
                ref={cardRef}
                collapsable={false}
                style={{ borderRadius: 16, overflow: 'hidden' }}
              >
                <ShareCard
                  quote={quote}
                  author={author}
                  theme={theme}
                  size={cardPreviewWidth}
                />
              </View>
            </View>
          </View>

          {/* Share button */}
          <View style={styles.actionsArea}>
            <TouchableOpacity
              onPress={handleShare}
              style={[styles.primaryBtn, { backgroundColor: theme.gold }]}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="export-variant" size={20} color="#000" />
              <Text style={[styles.primaryBtnText, { fontFamily: theme.uiFontFamily }]}>
                Share
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  previewShadow: {
    borderRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 18,
  },
  actionsArea: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});
