import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../ui/Icon';
import { useTheme } from '../../hooks/useTheme';
import { FONTS } from '../../constants/fonts';
import { GUTTER, SPACE } from '../ui/tokens';
import { SheetHeader } from '../ui/SheetHeader';
import { SHEET_CONTENT_TOP } from '../layout/BottomSheet';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const BENEFITS = [
  { icon: 'palette-outline', label: 'All 18 Themes', desc: 'From soft minimal to deep dark, find your reading mood' },
  { icon: 'history', label: 'Full Quote History', desc: "Every quote you've ever read, always within reach" },
  { icon: 'pencil-outline', label: 'Write Your Own Quotes', desc: "Add your own words alongside the world's greatest thinkers" },
  { icon: 'compass-outline', label: 'Every Topic Unlocked', desc: 'Follow every category, from wisdom to freedom, with no limits' },
  { icon: 'bell-outline', label: 'Quote of the Day & Streak Reminder', desc: 'Daily reminders that keep your streak alive' },
  // Android only. On iOS the widget's appearance is configured in Apple's Edit
  // Widget panel, which cannot be gated per-entitlement, so those settings are
  // free there — advertising them as Pro would be inaccurate.
  ...(Platform.OS === 'ios'
    ? []
    : [{ icon: 'view-grid-outline', label: 'Widget Editor', desc: 'Customize your widget: category, refresh rate & text size' }]),
];

interface PremiumModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PremiumModal({ visible, onClose }: PremiumModalProps) {
  const theme = useTheme();
  const [rendered, setRendered] = useState(false);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setRendered(true);
    } else if (rendered) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 320, useNativeDriver: true }),
      ]).start(() => setRendered(false));
    }
  }, [visible]);

  useEffect(() => {
    if (rendered) {
      translateY.setValue(SCREEN_HEIGHT);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, damping: 28, stiffness: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [rendered]);

  if (!rendered) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {/* Backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Sheet — full height, flush with the top of the screen */}
      <Animated.View
        style={[styles.sheet, { backgroundColor: theme.background, transform: [{ translateY }] }]}
      >
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <SheetHeader leading="close" onLeadingPress={onClose} />

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={[styles.crownWrap, { backgroundColor: `${theme.gold}1F` }]}>
                <Icon name="crown" size={36} color={theme.gold} />
              </View>
              <Text style={[styles.congrats, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
                Congrats!
              </Text>
              <Text style={[styles.subtitle, { color: theme.gold, fontFamily: theme.uiFontFamily }]}>
                You're a Premium member
              </Text>
            </View>

            {/* Benefits — flush list with hairline dividers, no card chrome */}
            <View style={styles.benefitsList}>
              {BENEFITS.map((b, i) => (
                <View
                  key={b.icon}
                  style={[
                    styles.benefitRow,
                    i < BENEFITS.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                  ]}
                >
                  <Icon name={b.icon as any} size={22} color={theme.gold} />
                  <View style={styles.benefitText}>
                    <Text style={[styles.benefitLabel, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
                      {b.label}
                    </Text>
                    <Text style={[styles.benefitDesc, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                      {b.desc}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  safe: {
    flex: 1,
    paddingTop: SHEET_CONTENT_TOP,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: GUTTER,
    paddingBottom: SPACE.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACE.xl,
  },
  crownWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  congrats: {
    fontSize: 28,
    fontFamily: FONTS.display.bold,
    lineHeight: 34,
    includeFontPadding: false,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  benefitsList: {
    paddingTop: SPACE.xs,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACE.lg,
    gap: SPACE.md,
  },
  benefitText: {
    flex: 1,
    gap: 2,
  },
  benefitLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  benefitDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
});
