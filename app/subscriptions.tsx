import React, { useEffect, useState } from 'react';
import { FONTS } from '../constants/fonts';
import { View, StyleSheet, Text, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Icon } from '../components/ui/Icon';
import { useTheme } from '../hooks/useTheme';
import { useRevenueCat } from '../hooks/useRevenueCat';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { CustomerCenterModal } from '../components/subscriptions/CustomerCenterModal';

type SubscriptionView = 'loading' | 'paywall' | 'customer-center';

export default function SubscriptionsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { isPro, isLoading: rcLoading, offerings, customerInfo } = useRevenueCat();
  const [activeView, setActiveView] = useState<SubscriptionView>('loading');

  // Auto-present paywall as a native modal when ready
  useEffect(() => {
    if (rcLoading) return;
    if (isPro) {
      setActiveView('customer-center');
      return;
    }
    setActiveView('paywall');
    const offering = offerings?.all['sale'] ?? offerings?.current ?? undefined;
    RevenueCatUI.presentPaywall({ offering })
      .then((result) => {
        if (__DEV__) console.log('Paywall result:', result);
        if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
          setActiveView('customer-center');
        } else {
          router.back();
        }
      })
      .catch((err) => {
        if (__DEV__) console.error('Paywall error:', err);
        router.back();
      });
  }, [rcLoading, isPro]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Icon name="arrow-left" size={24} color={theme.text} />
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

      {/* Tab Navigation — pro users only */}
      {isPro && (
        <View style={[styles.tabNavigation, { borderBottomColor: theme.surface }]}>
          <Pressable
            style={[styles.tab, { borderBottomColor: activeView !== 'customer-center' ? theme.accent : 'transparent' }]}
            onPress={() => {
              const offering = offerings?.all['sale'] ?? offerings?.current ?? undefined;
              RevenueCatUI.presentPaywall({ offering }).catch(() => {});
            }}
          >
            <Text style={[styles.tabText, { color: activeView !== 'customer-center' ? theme.text : theme.textMuted, fontWeight: activeView !== 'customer-center' ? '600' : '400' }]}>
              Benefits
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, { borderBottomColor: activeView === 'customer-center' ? theme.accent : 'transparent' }]}
            onPress={() => setActiveView('customer-center')}
          >
            <Text style={[styles.tabText, { color: activeView === 'customer-center' ? theme.text : theme.textMuted, fontWeight: activeView === 'customer-center' ? '600' : '400' }]}>
              Account
            </Text>
          </Pressable>
        </View>
      )}

      {/* Loading while RC initializes */}
      {activeView === 'loading' && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      )}

      {/* Customer center for pro users */}
      {activeView === 'customer-center' && (
        <CustomerCenterModal onClose={() => router.back()} />
      )}
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
  tabNavigation: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14, fontFamily: FONTS.ui.medium
  },
});
