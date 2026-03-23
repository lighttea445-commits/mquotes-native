import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useModal } from '../../contexts/ModalContext';

const FEATURES = [
  {
    icon: 'palette-outline' as const,
    title: 'All 12 themes',
    subtitle: 'From soft minimal to deep dark, find your perfect reading mood',
  },
  {
    icon: 'history' as const,
    title: 'Full quote history',
    subtitle: "Every quote you've ever read, always within reach",
  },
  {
    icon: 'pencil-outline' as const,
    title: 'Reflections journal',
    subtitle: 'Turn quotes into insights with daily written reflections',
  },
  {
    icon: 'format-quote-open' as const,
    title: 'My own quotes',
    subtitle: "Add your own words alongside the world's greatest thinkers",
  },
  {
    icon: 'tune-variant' as const,
    title: 'Unlimited Mix',
    subtitle: 'Blend wisdom, motivation, love and more with no category limits',
  },
  {
    icon: 'compass-outline' as const,
    title: 'Explore all categories',
    subtitle: 'Unlock the full library: philosophy, science, freedom & more',
  },
  {
    icon: 'view-grid-outline' as const,
    title: 'Widget editor',
    subtitle: 'Customize your home screen widget — category, refresh rate & text size',
  },
];

interface Props {
  onClose?: () => void;
  onContinue?: () => void;
}

export default function FeaturesScreen({ onClose, onContinue }: Props) {
  const theme = useTheme();
  const modal = useModal();

  const handleContinue = () => {
    if (onContinue) {
      onContinue();
    } else {
      modal?.openSheet('trial');
    }
  };

  const goldIconBg = `rgba(184,151,90,0.12)`;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {/* X Close */}
        <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.surface }]} hitSlop={12}>
          <MaterialCommunityIcons name="close" size={20} color={theme.textMuted} />
        </Pressable>

        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Badge */}
          <View style={[styles.badge, { backgroundColor: goldIconBg, borderColor: `${theme.gold}40` }]}>
            <MaterialCommunityIcons name="crown" size={14} color={theme.gold} />
            <Text style={[styles.badgeText, { color: theme.gold, fontFamily: theme.uiFontFamily }]}>
              Quotable Premium
            </Text>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
            What you'll get
          </Text>
          <Text style={[styles.subtitle, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
            Unlock everything with a 3-day free trial
          </Text>

          {/* Features list */}
          <View style={styles.featureList}>
            {FEATURES.map((f, i) => (
              <View
                key={i}
                style={[styles.featureItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <View style={[styles.featureIconBg, { backgroundColor: goldIconBg }]}>
                  <MaterialCommunityIcons name={f.icon} size={20} color={theme.gold} />
                </View>
                <View style={styles.featureText}>
                  <Text style={[styles.featureTitle, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
                    {f.title}
                  </Text>
                  <Text style={[styles.featureSubtitle, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                    {f.subtitle}
                  </Text>
                </View>
                <MaterialCommunityIcons name="check-circle" size={18} color={theme.gold} />
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Bottom CTA */}
        <View style={styles.bottom}>
          <Pressable
            onPress={handleContinue}
            style={[styles.ctaButton, { backgroundColor: theme.gold }]}
          >
            <Text style={[styles.ctaText, { fontFamily: theme.uiFontFamily }]}>Continue</Text>
          </Pressable>

          <Pressable onPress={onClose} style={styles.skipBtn}>
            <Text style={[styles.skipText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              Maybe later
            </Text>
          </Pressable>
        </View>
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
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    left: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 64,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    marginBottom: 20,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  featureList: {
    gap: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 14,
  },
  featureIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    gap: 2,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  featureSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  bottom: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 4,
  },
  ctaButton: {
    height: 54,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#0D0D0D',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 14,
  },
});
