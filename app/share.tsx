import React, { useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ExpoSharing from 'expo-sharing';
import { useBaseTheme } from '../hooks/useTheme';
import { useRevenueCat } from '../hooks/useRevenueCat';
import { useShareStore } from '../store/useShareStore';
import { useModal } from '../contexts/ModalContext';
import { ShareCard } from '../components/quotes/ShareCard';
import { errorReporting } from '../lib/errorReporting';
import { analytics } from '../lib/analytics';

const captureRef: ((ref: React.RefObject<any>, opts: object) => Promise<string>) | null = (() => {
  try { return require('react-native-view-shot').captureRef; } catch { return null; }
})();

const Clipboard: { setStringAsync: (t: string) => Promise<void> } | null = (() => {
  try { return require('expo-clipboard'); } catch { return null; }
})();

const MediaLibrary: {
  requestPermissionsAsync: () => Promise<{ status: string }>;
  saveToLibraryAsync: (uri: string) => Promise<void>;
} | null = (() => {
  try { return require('expo-media-library'); } catch { return null; }
})();

export default function ShareScreen({ onClose }: { onClose?: () => void }) {
  const { width } = useWindowDimensions();
  const theme = useBaseTheme();
  const router = useRouter();
  const modal = useModal();
  const { isPro } = useRevenueCat();
  const { quote, author, watermarkRemoved, setWatermarkRemoved } = useShareStore();
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const cardRef = useRef<View>(null);

  const close = onClose ?? (() => router.back());
  const CARD_SIZE = Math.round(width * 0.72);

  const handleCopyText = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard?.setStringAsync(quote);
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 1500);
    analytics.track('quote_copied', { author });
  }, [quote, author]);

  const handleSaveImage = useCallback(async () => {
    if (isBusy) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsBusy(true);
    try {
      if (!captureRef) throw new Error('captureRef unavailable — needs dev build');
      const uri = await captureRef(cardRef, { format: 'png', quality: 1.0, result: 'tmpfile' });
      if (MediaLibrary) {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
          await MediaLibrary.saveToLibraryAsync(uri);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return;
        }
      }
      const canShare = await ExpoSharing.isAvailableAsync();
      if (canShare) await ExpoSharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Save Quote Image' });
    } catch (e) {
      errorReporting.captureException(e as Error, { context: 'ShareScreen:handleSaveImage' });
      Alert.alert('Could not save image', 'Please try again.');
    } finally {
      setIsBusy(false);
    }
  }, [isBusy]);

  const handleShare = useCallback(async () => {
    if (isBusy) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    analytics.track('quote_shared', { author });
    setIsBusy(true);
    try {
      if (captureRef) {
        const uri = await captureRef(cardRef, { format: 'png', quality: 1.0, result: 'tmpfile' });
        const canShare = await ExpoSharing.isAvailableAsync();
        if (canShare) {
          await ExpoSharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share Quote' });
          return;
        }
      }
      await Share.share({ message: `"${quote}"\n\n— ${author}` });
    } catch (e) {
      errorReporting.captureException(e as Error, { context: 'ShareScreen:handleShare' });
      await Share.share({ message: `"${quote}"\n\n— ${author}` });
    } finally {
      setIsBusy(false);
    }
  }, [isBusy, quote, author]);

  const handleToggleWatermark = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!isPro) {
      close();
      setTimeout(() => {
        modal ? modal.openSheet('features') : undefined;
      }, 320);
      return;
    }
    setWatermarkRemoved(!watermarkRemoved);
  }, [isPro, watermarkRemoved, setWatermarkRemoved, close, modal]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={close} style={[styles.closeBtn, { backgroundColor: theme.surface }]}>
            <MaterialCommunityIcons name="close" size={20} color={theme.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>Share</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Card preview */}
        <View style={styles.cardWrapper}>
          <View ref={cardRef} collapsable={false}>
            <ShareCard
              quote={quote}
              author={author}
              theme={theme}
              size={CARD_SIZE}
              showWatermark={!(isPro && watermarkRemoved)}
            />
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity onPress={handleSaveImage} style={styles.actionItem}>
            <View style={[styles.actionCircle, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <MaterialCommunityIcons name="tray-arrow-down" size={24} color={theme.text} />
            </View>
            <Text style={[styles.actionLabel, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
              {'Save\nimage'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleCopyText} style={styles.actionItem}>
            <View style={[styles.actionCircle, { backgroundColor: theme.surface, borderColor: copiedFeedback ? theme.gold : theme.border }]}>
              <MaterialCommunityIcons
                name={copiedFeedback ? 'check' : 'content-copy'}
                size={24}
                color={copiedFeedback ? theme.gold : theme.text}
              />
            </View>
            <Text style={[styles.actionLabel, { color: copiedFeedback ? theme.gold : theme.text, fontFamily: theme.uiFontFamily }]}>
              {copiedFeedback ? 'Copied!' : 'Copy\ntext'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleToggleWatermark} style={styles.actionItem}>
            <View style={[styles.actionCircle, { backgroundColor: theme.surface, borderColor: (isPro && watermarkRemoved) ? theme.gold : theme.border }]}>
              <MaterialCommunityIcons
                name={(isPro && watermarkRemoved) ? 'image-off-outline' : 'image-minus-outline'}
                size={24}
                color={(isPro && watermarkRemoved) ? theme.gold : theme.text}
              />
            </View>
            <Text style={[styles.actionLabel, { color: (isPro && watermarkRemoved) ? theme.gold : theme.text, fontFamily: theme.uiFontFamily }]}>
              {(isPro && watermarkRemoved) ? 'Show\nwatermark' : 'Hide\nwatermark'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Share button */}
        <TouchableOpacity
          onPress={handleShare}
          style={[styles.shareBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <MaterialCommunityIcons name="export-variant" size={20} color={theme.text} />
          <Text style={[styles.shareBtnText, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
            Share
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 24,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  cardWrapper: {
    alignItems: 'center',
    marginBottom: 36,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    marginBottom: 36,
  },
  actionItem: {
    alignItems: 'center',
    gap: 10,
    minWidth: 72,
  },
  actionCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  shareBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
