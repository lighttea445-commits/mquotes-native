import React, { useState } from 'react';
import { View, StyleSheet, Text, Pressable, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useRevenueCat } from '../hooks/useRevenueCat';
import { PaywallView } from '../components/subscriptions/PaywallView';
import { CustomerCenterModal } from '../components/subscriptions/CustomerCenterModal';

type SubscriptionView = 'paywall' | 'customer-center';

export default function SubscriptionsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { isPro, customerInfo } = useRevenueCat();
  const [activeView, setActiveView] = useState<SubscriptionView>('paywall');

  const handlePurchaseComplete = () => {
    // Refresh and show success state
    setActiveView('customer-center');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Quotes Pro</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Status Badge (if already subscribed) */}
      {isPro && (
        <View style={[styles.statusBadge, { backgroundColor: 'rgba(184,151,90,0.12)' }]}>
          <MaterialCommunityIcons name="check-circle" size={16} color="#B8975A" />
          <Text style={[styles.statusText, { color: '#B8975A' }]}>You're a Pro member</Text>
        </View>
      )}

      {/* Tab Navigation */}
      {isPro && (
        <View style={[styles.tabNavigation, { borderBottomColor: theme.surface }]}>
          <Pressable
            style={[styles.tab, activeView === 'paywall' && styles.tabActive]}
            onPress={() => setActiveView('paywall')}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: activeView === 'paywall' ? theme.text : theme.secondaryText,
                  fontWeight: activeView === 'paywall' ? '600' : '400',
                },
              ]}
            >
              Benefits
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeView === 'customer-center' && styles.tabActive]}
            onPress={() => setActiveView('customer-center')}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: activeView === 'customer-center' ? theme.text : theme.secondaryText,
                  fontWeight: activeView === 'customer-center' ? '600' : '400',
                },
              ]}
            >
              Account
            </Text>
          </Pressable>
        </View>
      )}

      {/* Content */}
      {activeView === 'paywall' && (
        <PaywallView
          offering="default"
          onPurchaseComplete={handlePurchaseComplete}
          onDismiss={() => router.back()}
        />
      )}

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
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginVertical: 12,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
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
  tabActive: {
    borderBottomColor: '#B8975A',
  },
  tabText: {
    fontSize: 14,
  },
});
