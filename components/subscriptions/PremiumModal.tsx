import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../ui/Icon';
import { useTheme } from '../../hooks/useTheme';
import { BottomSheet } from '../layout/BottomSheet';
import { SheetHeader } from '../ui/SheetHeader';
import { FONTS } from '../../constants/fonts';
import { GUTTER, SPACE } from '../ui/tokens';

// Matches BottomSheet's own close-animation duration — the outer native Modal
// has to stay mounted until the internal slide-down finishes, or the sheet
// vanishes instantly instead of animating out.
const CLOSE_ANIM_MS = 460;

const BENEFITS = [
  { icon: 'palette-outline', label: 'All 18 Themes', desc: 'From soft minimal to deep dark, find your reading mood' },
  { icon: 'history', label: 'Full Quote History', desc: "Every quote you've ever read, always within reach" },
  { icon: 'pencil-outline', label: 'Write Your Own Quotes', desc: "Add your own words alongside the world's greatest thinkers" },
  { icon: 'compass-outline', label: 'All categories unlocked', desc: 'Follow every category, from wisdom to freedom, with no limits' },
  { icon: 'bell-outline', label: 'Quote of the Day & Streak Reminder', desc: 'Daily reminders that keep your streak alive' },
  { icon: 'view-grid-outline', label: 'Widget Editor', desc: 'Customize your widget: category, refresh rate, text size & border' },
];

interface PremiumModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PremiumModal({ visible, onClose }: PremiumModalProps) {
  const theme = useTheme();
  const [rendered, setRendered] = useState(visible);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      if (closeTimer.current) {
        clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
      setRendered(true);
    } else if (rendered) {
      closeTimer.current = setTimeout(() => setRendered(false), CLOSE_ANIM_MS);
    }
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!rendered) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {/* RN's Modal renders into its own native window on Android, so the
          app's root SafeAreaProvider doesn't reliably reach content inside
          it — insets can come back as 0, pulling the header flush to the
          status bar. A local provider re-measures for this window. */}
      <SafeAreaProvider>
        <BottomSheet visible={visible} onClose={onClose} backgroundColor={theme.background}>
          <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            <SheetHeader leading="close" onLeadingPress={onClose} />

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.crownWrap}>
                  <Icon name="crown" size={72} color={theme.gold} />
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
        </BottomSheet>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
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
    marginBottom: 4,
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
