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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

const BENEFITS = [
  { icon: 'history', label: 'Unlimited Quote History', desc: 'Every quote you read, saved forever' },
  { icon: 'book-open-outline', label: 'Journal & Reflections', desc: 'Daily mood tracking and personal notes' },
  { icon: 'playlist-music', label: 'Unlimited Mixes', desc: 'Combine any topics into a custom feed' },
  { icon: 'palette-outline', label: 'All Themes Unlocked', desc: 'Every color theme and visual style' },
  { icon: 'shape-outline', label: 'All Topics Unlocked', desc: 'Access every quote category' },
  { icon: 'pencil-outline', label: 'Write Your Own Quotes', desc: 'Add personal quotes to your collection' },
  // Android only. On iOS the widget's appearance is configured in Apple's Edit
  // Widget panel, which cannot be gated per-entitlement, so those settings are
  // free there — advertising them as Pro would be inaccurate.
  ...(Platform.OS === 'ios'
    ? []
    : [{ icon: 'view-grid-outline', label: 'Widget Editor', desc: 'Customize widget category, refresh rate & text size' }]),
];

interface PremiumModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PremiumModal({ visible, onClose }: PremiumModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [rendered, setRendered] = useState(false);
  const translateY = useRef(new Animated.Value(600)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setRendered(true);
    } else if (rendered) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 600, duration: 320, useNativeDriver: true }),
      ]).start(() => setRendered(false));
    }
  }, [visible]);

  useEffect(() => {
    if (rendered) {
      translateY.setValue(600);
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

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: theme.background, paddingBottom: insets.bottom + 16, transform: [{ translateY }] },
        ]}
      >
        {/* Drag pill */}
        <View style={[styles.pill, { backgroundColor: theme.border }]} />

        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.crownWrap, { backgroundColor: `${theme.gold}1F` }]}>
            <MaterialCommunityIcons name="crown" size={36} color={theme.gold} />
          </View>
          <Text style={[styles.congrats, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
            Congrats!
          </Text>
          <Text style={[styles.subtitle, { color: theme.gold, fontFamily: theme.uiFontFamily }]}>
            You're a Premium member
          </Text>
        </View>

        {/* Benefits */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.benefitsList}
          showsVerticalScrollIndicator={false}
        >
          {BENEFITS.map((b) => (
            <View key={b.icon} style={[styles.benefitRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={[styles.benefitIcon, { backgroundColor: `${theme.gold}1A` }]}>
                <MaterialCommunityIcons name={b.icon as any} size={20} color={theme.gold} />
              </View>
              <View style={styles.benefitText}>
                <Text style={[styles.benefitLabel, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
                  {b.label}
                </Text>
                <Text style={[styles.benefitDesc, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                  {b.desc}
                </Text>
              </View>
              <MaterialCommunityIcons name="check-circle" size={18} color={theme.gold} />
            </View>
          ))}
        </ScrollView>

        {/* Close button */}
        <Pressable
          style={[styles.closeBtn, { backgroundColor: theme.text }]}
          onPress={onClose}
        >
          <Text style={[styles.closeBtnText, { color: theme.background, fontFamily: theme.uiFontFamily }]}>
            Okay
          </Text>
        </Pressable>
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
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 24,
  },
  pill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
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
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  scroll: {
    flexGrow: 0,
  },
  benefitsList: {
    gap: 10,
    paddingBottom: 4,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    flex: 1,
    gap: 2,
  },
  benefitLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  benefitDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  closeBtn: {
    marginTop: 16,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
