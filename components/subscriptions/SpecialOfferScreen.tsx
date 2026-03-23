import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

interface Props {
  onClose?: () => void;
  onContinue?: () => void;
}

export default function SpecialOfferScreen({ onClose, onContinue }: Props) {
  const theme = useTheme();
  const goldIconBg = `rgba(184,151,90,0.12)`;

  // Pulse animation for the crown badge
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Fade + slide in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse the badge
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {/* X Close */}
        <Pressable
          onPress={onClose}
          style={[styles.closeBtn, { backgroundColor: theme.surface }]}
          hitSlop={12}
        >
          <MaterialCommunityIcons name="close" size={20} color={theme.textMuted} />
        </Pressable>

        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Pulsing crown badge */}
          <Animated.View
            style={[
              styles.crownWrap,
              { backgroundColor: goldIconBg, transform: [{ scale: pulseAnim }] },
            ]}
          >
            <MaterialCommunityIcons name="crown" size={44} color={theme.gold} />
          </Animated.View>

          {/* Headline */}
          <Text style={[styles.headline, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
            {'We have a '}
            <Text style={{ color: theme.gold }}>Special</Text>
            {' offer\njust for '}
            <Text style={{ color: theme.gold }}>You</Text>
            {'!'}
          </Text>

          <Text style={[styles.subtext, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
            Start your 3-day free trial today — no charge until it ends.
          </Text>

          {/* Perks row */}
          <View style={styles.perksRow}>
            {['No commitment', 'Cancel anytime', 'Full access'].map((perk, i) => (
              <View
                key={i}
                style={[styles.perkChip, { backgroundColor: goldIconBg, borderColor: `${theme.gold}30` }]}
              >
                <MaterialCommunityIcons name="check" size={13} color={theme.gold} />
                <Text style={[styles.perkText, { color: theme.gold, fontFamily: theme.uiFontFamily }]}>
                  {perk}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Bottom CTA */}
        <View style={styles.bottom}>
          <Pressable
            onPress={onContinue}
            style={[styles.ctaButton, { backgroundColor: theme.gold }]}
          >
            <Text style={[styles.ctaText, { fontFamily: theme.uiFontFamily }]}>
              See My Offer
            </Text>
          </Pressable>

          <Pressable onPress={onClose} style={styles.skipBtn}>
            <Text style={[styles.skipText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              No thanks
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 24,
  },
  crownWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  headline: {
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 42,
    marginBottom: 16,
  },
  subtext: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  perksRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  perkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  perkText: {
    fontSize: 13,
    fontWeight: '600',
  },
  bottom: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 4,
  },
  ctaButton: {
    height: 56,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#0D0D0D',
    fontSize: 17,
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
