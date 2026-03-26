import React, { useCallback, useRef, useState } from 'react';
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
import { useRevenueCat } from '../../hooks/useRevenueCat';
import { useShareStore } from '../../store/useShareStore';
import { useModal } from '../../contexts/ModalContext';

// Lazy-require so the app doesn't crash when the native module isn't linked yet.
let captureRef: ((ref: React.RefObject<any>, opts: object) => Promise<string>) | null = null;
try { captureRef = require('react-native-view-shot').captureRef; } catch {}

const Clipboard: { setStringAsync: (t: string) => Promise<void> } | null = (() => {
  try { return require('expo-clipboard'); } catch { return null; }
})();

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
  const { isPro } = useRevenueCat();
  const { watermarkRemoved, setWatermarkRemoved } = useShareStore();
  const modal = useModal();
  const cardRef = useRef<View>(null);
  const [copiedFeedback, setCopiedFeedback] = useState(false);

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

  const handleCopyText = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard?.setStringAsync(quote);
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 1500);
  }, [quote]);

  const handleToggleWatermark = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!isPro) {
      onClose();
      setTimeout(() => {
        modal?.openSheet('features');
      }, 320);
      return;
    }
    setWatermarkRemoved(!watermarkRemoved);
  }, [isPro, watermarkRemoved, setWatermarkRemoved, onClose, modal]);

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
                  showWatermark={!(isPro && watermarkRemoved)}
                />
              </View>
            </View>
          </View>

          {/* Extra action buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={handleCopyText} style={styles.actionItem}>
              <View style={[styles.actionCircle, { backgroundColor: theme.surfaceElevated, borderColor: copiedFeedback ? theme.gold : theme.border }]}>
                <MaterialCommunityIcons
                  name={copiedFeedback ? 'check' : 'content-copy'}
                  size={22}
                  color={copiedFeedback ? theme.gold : theme.text}
                />
              </View>
              <Text style={[styles.actionLabel, { color: copiedFeedback ? theme.gold : theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                {copiedFeedback ? 'Copied!' : 'Copy\ntext'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleToggleWatermark} style={styles.actionItem}>
              <View style={[styles.actionCircle, { backgroundColor: theme.surfaceElevated, borderColor: (isPro && watermarkRemoved) ? theme.gold : theme.border }]}>
                <MaterialCommunityIcons
                  name={(isPro && watermarkRemoved) ? 'image-off-outline' : 'image-minus-outline'}
                  size={22}
                  color={(isPro && watermarkRemoved) ? theme.gold : theme.text}
                />
              </View>
              <Text style={[styles.actionLabel, { color: (isPro && watermarkRemoved) ? theme.gold : theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                {(isPro && watermarkRemoved) ? 'Show\nwatermark' : 'Hide\nwatermark'}
              </Text>
            </TouchableOpacity>
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
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  actionItem: {
    alignItems: 'center',
    gap: 6,
    minWidth: 72,
  },
  actionCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  actionsArea: {
    paddingHorizontal: 20,
    paddingTop: 12,
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
