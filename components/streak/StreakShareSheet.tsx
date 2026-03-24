import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ExpoSharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { StreakShareCard } from './StreakShareCard';

let captureRef: ((ref: React.RefObject<any>, opts: object) => Promise<string>) | null = null;
try { captureRef = require('react-native-view-shot').captureRef; } catch {}

interface Props {
  visible: boolean;
  streakCount: number;
  onClose: () => void;
}

const SOCIAL_BUTTONS = [
  { label: 'Instagram', bg: '#C13584', icon: 'logo-instagram' as const },
  { label: 'Facebook', bg: '#1877F2', icon: 'logo-facebook' as const },
  { label: 'WhatsApp', bg: '#25D366', icon: 'logo-whatsapp' as const },
];

export function StreakShareSheet({ visible, streakCount, onClose }: Props) {
  const { width: W } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const cardRef = useRef<View>(null);
  const [showWatermark, setShowWatermark] = useState(true);

  const cardSize = Math.min(W - 72, 300);

  const captureCard = useCallback(async (): Promise<string | null> => {
    if (!captureRef) return null;
    try {
      return await captureRef(cardRef, { format: 'png', quality: 1.0, result: 'tmpfile' });
    } catch {
      return null;
    }
  }, []);

  const handleSave = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const uri = await captureCard();
    if (uri) {
      const canShare = await ExpoSharing.isAvailableAsync();
      if (canShare) {
        await ExpoSharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Save Streak Image' });
        return;
      }
    }
    await Share.share({
      message: `${streakCount} day streak! I've made a habit of reading motivating quotes every day! — Quotable`,
    });
  }, [captureCard, streakCount]);

  const handleSocialShare = useCallback(async (platform: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const uri = await captureCard();
    if (uri) {
      const canShare = await ExpoSharing.isAvailableAsync();
      if (canShare) {
        await ExpoSharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: `Share to ${platform}` });
        return;
      }
    }
    await Share.share({
      message: `${streakCount} day streak! I've made a habit of reading motivating quotes every day! — Quotable`,
    });
  }, [captureCard, streakCount]);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View
        style={[
          styles.overlay,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 },
        ]}
      >
        {/* Top bar — X button */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <MaterialCommunityIcons name="close" size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Card preview */}
        <View style={styles.cardArea}>
          <View
            style={[
              styles.cardShadow,
              { width: cardSize, height: Math.round(cardSize * 1.35), borderRadius: 20 },
            ]}
          >
            <View ref={cardRef} collapsable={false} style={{ borderRadius: 20, overflow: 'hidden' }}>
              <StreakShareCard
                streakCount={streakCount}
                showWatermark={showWatermark}
                size={cardSize}
                uiFontFamily={theme.uiFontFamily}
                quoteFontFamily={theme.quoteFontFamily}
              />
            </View>
          </View>
        </View>

        {/* Action buttons row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleSave} activeOpacity={0.7}>
            <View style={styles.actionCircle}>
              <Ionicons name="download-outline" size={24} color="#fff" />
            </View>
            <Text style={[styles.actionLabel, { fontFamily: theme.uiFontFamily }]}>
              {'Save\nimage'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowWatermark((v) => !v);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.actionCircle}>
              <Ionicons
                name={showWatermark ? 'eye-off-outline' : 'eye-outline'}
                size={24}
                color="#fff"
              />
            </View>
            <Text style={[styles.actionLabel, { fontFamily: theme.uiFontFamily }]}>
              {showWatermark ? 'Hide\nwatermark' : 'Show\nwatermark'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Social sharing row */}
        <View style={styles.socialRow}>
          {SOCIAL_BUTTONS.map((btn) => (
            <TouchableOpacity
              key={btn.label}
              style={styles.socialBtn}
              onPress={() => handleSocialShare(btn.label)}
              activeOpacity={0.75}
            >
              <View style={[styles.socialCircle, { backgroundColor: btn.bg }]}>
                <Ionicons name={btn.icon} size={28} color="#fff" />
              </View>
              <Text style={[styles.socialLabel, { fontFamily: theme.uiFontFamily }]}>
                {btn.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(8,14,26,0.97)',
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 32,
    paddingHorizontal: 4,
    marginTop: 28,
    marginBottom: 28,
  },
  actionBtn: {
    alignItems: 'center',
    gap: 8,
  },
  actionCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  actionLabel: {
    color: '#ffffff',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  socialBtn: {
    alignItems: 'center',
    gap: 7,
  },
  socialCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialLabel: {
    color: '#ffffff',
    fontSize: 11,
    textAlign: 'center',
  },
});
