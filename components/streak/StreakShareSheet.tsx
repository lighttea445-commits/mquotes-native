import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Share,
  Modal,
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
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { liquidGlassAvailable } from '../ui/GlassSurface';
import { useHaptics } from '../../hooks/useHaptics';
import * as ExpoSharing from 'expo-sharing';
import { useBaseTheme } from '../../hooks/useTheme';
import { useRevenueCat } from '../../hooks/useRevenueCat';
import { useModal } from '../../contexts/ModalContext';
import { StreakShareCard } from './StreakShareCard';
import { ON_GOLD, GUTTER, RADIUS, ICON_BTN } from '../ui/tokens';
import { FONTS } from '../../constants/fonts';

let captureRef: ((ref: React.RefObject<any>, opts: object) => Promise<string>) | null = null;
try { captureRef = require('react-native-view-shot').captureRef; } catch {}

interface Props {
  visible: boolean;
  streakCount: number;
  onClose: () => void;
}

const DRAG_CLOSE_THRESHOLD = 120;

export function StreakShareSheet({ visible, streakCount, onClose }: Props) {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const theme = useBaseTheme();
  const glass = liquidGlassAvailable();
  const { isPro } = useRevenueCat();
  const modal = useModal();
  const [watermarkRemoved, setWatermarkRemoved] = React.useState(false);
  const cardRef = useRef<View>(null);
  const haptics = useHaptics();

  const cardPreviewWidth = Math.min(W - 80, 280);

  // Full height, matching every other sheet in the app.
  const SHEET_HEIGHT = H;
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

  const dragGesture = Gesture.Pan()
    .onStart(() => {})
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
    haptics.impact();
    if (captureRef) {
      try {
        const uri = await captureRef(cardRef, { format: 'png', quality: 1.0, result: 'tmpfile' });
        const canShare = await ExpoSharing.isAvailableAsync();
        if (canShare) {
          await ExpoSharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share Streak' });
          return;
        }
      } catch {}
    }
    await Share.share({
      message: `${streakCount} day streak! I've made a habit of getting motivated each day! — Quotable`,
    });
  }, [streakCount, haptics]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
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
                backgroundColor: theme.background,
                borderColor: theme.border,
                paddingBottom: insets.bottom + 16,
              },
              sheetStyle,
            ]}
          >
            {/* Header — close only, as in the reference */}
            <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
              <IconButton
                icon="close"
                onPress={onClose}
                filled={glass}
                size={glass ? ICON_BTN.md : ICON_BTN.sm}
                iconSize={glass ? 22 : 26}
                color={theme.gold}
                accessibilityLabel="Close"
              />
            </View>

            {/* Card preview */}
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
                <View ref={cardRef} collapsable={false} style={{ borderRadius: 16, overflow: 'hidden' }}>
                  <StreakShareCard
                    streakCount={streakCount}
                    showWatermark={!(isPro && watermarkRemoved)}
                    size={cardPreviewWidth}
                    theme={theme}
                  />
                </View>
              </View>
            </View>

            {/* Watermark toggle */}
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={() => {
                  if (!isPro) {
                    onClose();
                    setTimeout(() => { modal?.openSheet('trial'); }, 320);
                    return;
                  }
                  setWatermarkRemoved(v => !v);
                }}
                style={styles.actionItem}
              >
                <View style={[styles.actionCircle, { backgroundColor: theme.surface, borderColor: (isPro && watermarkRemoved) ? theme.gold : theme.border }]}>
                  <Icon
                    name={(isPro && watermarkRemoved) ? 'image-off-outline' : 'image-minus-outline'}
                    size={22}
                    color={(isPro && watermarkRemoved) ? theme.gold : theme.text}
                  />
                </View>
                <Text style={[styles.actionLabel, { color: (isPro && watermarkRemoved) ? theme.gold : theme.text, fontFamily: theme.uiFontFamily }]}>
                  {(isPro && watermarkRemoved) ? 'Show\nwatermark' : 'Hide\nwatermark'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Share button */}
            <View style={styles.actionsArea}>
              <TouchableOpacity
                onPress={handleShare}
                style={[styles.primaryBtn, { backgroundColor: theme.goldButton }]}
                activeOpacity={0.8}
              >
                <Icon name="export-variant" size={20} color={ON_GOLD} />
                <Text style={[styles.primaryBtnText, { color: ON_GOLD }]}>
                  Share
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GUTTER,
    paddingBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
    paddingTop: 20,
    paddingBottom: 8,
  },
  actionItem: {
    alignItems: 'center',
    gap: 8,
    minWidth: 72,
  },
  actionCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
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
    height: 56,
    borderRadius: RADIUS.pill,
  },
  primaryBtnText: {
    fontSize: 17,
    fontFamily: FONTS.display.bold,
    lineHeight: 24,
    includeFontPadding: false,
  },
});
