import React, { useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Icon } from '../ui/Icon';
import * as ExpoSharing from 'expo-sharing';
import { useBaseTheme } from '../../hooks/useTheme';
import { useRevenueCat } from '../../hooks/useRevenueCat';
import { useShareStore } from '../../store/useShareStore';
import { useModal } from '../../contexts/ModalContext';
import { ShareCard } from '../quotes/ShareCard';
import { errorReporting } from '../../lib/errorReporting';
import { analytics } from '../../lib/analytics';

const captureRef: ((ref: React.RefObject<any>, opts: object) => Promise<string>) | null = (() => {
  try { return require('react-native-view-shot').captureRef; } catch { return null; }
})();

const Clipboard: { setStringAsync: (t: string) => Promise<void> } | null = (() => {
  try { return require('expo-clipboard'); } catch { return null; }
})();

export default function ShareScreen({ onClose }: { onClose?: () => void }) {
  const { width: W } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const theme = useBaseTheme();
  const router = useRouter();
  const modal = useModal();
  const { isPro } = useRevenueCat();
  const { quote, author, watermarkRemoved, setWatermarkRemoved } = useShareStore();
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const cardRef = useRef<View>(null);

  const close = onClose ?? (() => router.back());
  const cardPreviewWidth = Math.min(W - 80, 280);

  const handleCopyText = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard?.setStringAsync(quote);
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 1500);
    analytics.track('quote_copied', { author });
  }, [quote, author]);

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
      errorReporting.captureError(e as Error, { context: 'ShareScreen:share' });
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
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={close}
          style={[styles.closeBtn, { backgroundColor: theme.surfaceElevated ?? theme.surface }]}
        >
          <Icon name="close" size={18} color={theme.textMuted} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
          Share Quote
        </Text>
        <View style={styles.closeBtn} />
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
      <View style={styles.actions}>
        <TouchableOpacity onPress={handleCopyText} style={styles.actionItem}>
          <View style={[styles.actionCircle, { backgroundColor: theme.surface, borderColor: copiedFeedback ? theme.gold : theme.border }]}>
            <Icon
              name={copiedFeedback ? 'check' : 'content-copy'}
              size={22}
              color={copiedFeedback ? theme.gold : theme.text}
            />
          </View>
          <Text style={[styles.actionLabel, { color: copiedFeedback ? theme.gold : theme.text, fontFamily: theme.uiFontFamily }]}>
            {copiedFeedback ? 'Copied!' : 'Copy\ntext'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleToggleWatermark} style={styles.actionItem}>
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
          style={[styles.primaryBtn, { backgroundColor: theme.gold }]}
          activeOpacity={0.8}
        >
          <Icon name="export-variant" size={20} color="#000" />
          <Text style={[styles.primaryBtnText, { fontFamily: theme.uiFontFamily }]}>
            Share
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
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
    textAlign: 'center',
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
