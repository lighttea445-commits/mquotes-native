import React from 'react';
import { FONTS } from '../constants/fonts';
import { View, StyleSheet, Text, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Icon } from '../components/ui/Icon';
import { useTheme } from '../hooks/useTheme';
import { useRevenueCat } from '../hooks/useRevenueCat';
import { CustomerCenterModal } from '../components/subscriptions/CustomerCenterModal';
import TrialScreen from '../components/subscriptions/TrialScreen';

export default function SubscriptionsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { isPro, isLoading: rcLoading, customerInfo } = useRevenueCat();

  if (rcLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      </SafeAreaView>
    );
  }

  // Not a member yet — this route is the non-modal fallback for every gated
  // action, so it shows the same trial screen the sheets do. Its CTA buys
  // through the store directly; there is no RevenueCat paywall any more.
  if (!isPro) {
    return <TrialScreen onClose={() => router.back()} />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Icon name="arrow-left" size={24} color={theme.gold} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Quotable Premium</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Premium Membership Card */}
      {isPro && (
        <View style={[styles.memberCard, { borderColor: `${theme.accent}4D`, backgroundColor: `${theme.accent}14` }]}>
          <View style={[styles.memberCardIcon, { backgroundColor: `${theme.accent}26` }]}>
            <Icon name="crown" size={28} color={theme.accent} />
          </View>
          <View style={styles.memberCardBody}>
            <Text style={[styles.memberCardTitle, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
              Quotable Premium
            </Text>
            <View style={styles.memberCardStatus}>
              <Icon name="check-circle" size={14} color={theme.accent} />
              <Text style={[styles.memberCardStatusText, { color: theme.accent, fontFamily: theme.uiFontFamily }]}>
                Active member
              </Text>
            </View>
            {customerInfo?.entitlements.active['Quotable Premium']?.expirationDate && (
              <Text style={[styles.memberCardExpiry, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                Renews {new Date(customerInfo.entitlements.active['Quotable Premium'].expirationDate!).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Manage the subscription. The Benefits tab is gone: it re-presented the
          RevenueCat paywall, which no longer exists, and there is nothing to
          sell someone who is already a member. */}
      <CustomerCenterModal onClose={() => router.back()} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600', fontFamily: FONTS.display.bold
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  memberCardIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberCardBody: {
    flex: 1,
    gap: 4,
  },
  memberCardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  memberCardStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  memberCardStatusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  memberCardExpiry: {
    fontSize: 12,
    marginTop: 2,
  },
});
