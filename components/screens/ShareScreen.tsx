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
import { useHaptics } from '../../hooks/useHaptics';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { liquidGlassAvailable } from '../ui/GlassSurface';
import * as ExpoSharing from 'expo-sharing';
import { useBaseTheme } from '../../hooks/useTheme';
import { useRevenueCat } from '../../hooks/useRevenueCat';
import { useShareStore } from '../../store/useShareStore';
import { useCollectionsStore } from '../../store/useCollectionsStore';
import { useModal } from '../../contexts/ModalContext';
import { ShareCard } from '../quotes/ShareCard';
import { AddToCollectionSheet } from '../collections/AddToCollectionSheet';
import { GUTTER, RADIUS, ON_GOLD, ICON_BTN } from '../ui/tokens';
import { FONTS } from '../../constants/fonts';
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
  const glass = liquidGlassAvailable();
  const router = useRouter();
  const modal = useModal();
  const { isPro } = useRevenueCat();
  const quoteId = useShareStore((s) => s.quoteId);
  const quote = useShareStore((s) => s.quote);
  const author = useShareStore((s) => s.author);
  const watermarkRemoved = useShareStore((s) => s.watermarkRemoved);
  const setWatermarkRemoved = useShareStore((s) => s.setWatermarkRemoved);
  const collections = useCollectionsStore((s) => s.collections);
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [showCollections, setShowCollections] = useState(false);
  const cardRef = useRef<View>(null);
  const haptics = useHaptics();

  const savedToAny = collections.some(c => c.quotes.some(q => q.id === quoteId));

  const close = onClose ?? (() => router.back());
  const cardPreviewWidth = Math.min(W - 80, 280);

  const handleCopyText = useCallback(async () => {
    haptics.impact();
    await Clipboard?.setStringAsync(quote);
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 1500);
    analytics.track('quote_copied', { author });
  }, [quote, author, haptics]);

  const handleShare = useCallback(async () => {
    if (isBusy) return;
    haptics.impact();
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
  }, [isBusy, quote, author, haptics]);

  const handleToggleWatermark = useCallback(() => {
    haptics.impact();
    if (!isPro) {
      close();
      setTimeout(() => {
        modal ? modal.openSheet('trial') : undefined;
      }, 320);
      return;
    }
    setWatermarkRemoved(!watermarkRemoved);
  }, [isPro, watermarkRemoved, setWatermarkRemoved, close, modal, haptics]);

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      {/* Header — close only, matching the streak share sheet */}
      <View style={styles.header}>
        <IconButton
          icon="close"
          onPress={close}
          filled={glass}
          size={glass ? ICON_BTN.md : ICON_BTN.sm}
          iconSize={glass ? 22 : 26}
          color={theme.text}
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
        <TouchableOpacity
          onPress={() => { haptics.impact(); setShowCollections(true); }}
          style={styles.actionItem}
          accessibilityRole="button"
          accessibilityLabel="Add to collection"
        >
          <View style={[styles.actionCircle, { backgroundColor: theme.surface, borderColor: savedToAny ? theme.gold : theme.border }]}>
            <Icon
              name={savedToAny ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={savedToAny ? theme.gold : theme.text}
            />
          </View>
          <Text style={[styles.actionLabel, { color: savedToAny ? theme.gold : theme.text, fontFamily: theme.uiFontFamily }]}>
            {'Add to\ncollection'}
          </Text>
        </TouchableOpacity>

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
          style={[styles.primaryBtn, { backgroundColor: theme.goldButton }]}
          activeOpacity={0.8}
        >
          <Icon name="export-variant" size={20} color={ON_GOLD} />
          <Text style={[styles.primaryBtnText, { color: ON_GOLD }]}>
            Share
          </Text>
        </TouchableOpacity>
      </View>

      <AddToCollectionSheet
        visible={showCollections}
        quote={{ id: quoteId, text: quote, author }}
        onClose={() => setShowCollections(false)}
      />
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
    paddingHorizontal: GUTTER,
    paddingBottom: 8,
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
  // Same row as the streak sheet, with a tighter gap because three circles at
  // 28 overflow a narrow screen.
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
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
