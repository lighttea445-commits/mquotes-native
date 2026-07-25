import React, { useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RevenueCatUI from 'react-native-purchases-ui';
import type { PurchasesOffering } from 'react-native-purchases';
import { useTheme } from '../../hooks/useTheme';
import { useRevenueCat } from '../../hooks/useRevenueCat';

interface PaywallViewProps {
  offeringIdentifier?: string; // Offering identifier (e.g., "sale")
  onPurchaseComplete?: () => void;
  onDismiss?: () => void;
  footerText?: string;
}

export function PaywallView({
  offeringIdentifier = 'sale',
  onPurchaseComplete,
  onDismiss,
  footerText = 'Restore purchases in Settings',
}: PaywallViewProps) {
  const theme = useTheme();
  const { offerings, isLoading: rcLoading, refresh } = useRevenueCat();
  const [error, setError] = useState<string | null>(null);

  const offering: PurchasesOffering | undefined =
    offerings?.all[offeringIdentifier] ?? offerings?.current ?? undefined;

  // Show error if RC finished loading but offering still isn't available (includes fetch failure)
  const noOfferings = !rcLoading && !offering;

  const showPaywall = !rcLoading && !error && !noOfferings;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      {/* Centered states: loading + error */}
      {(rcLoading || error || noOfferings) && (
        <View style={styles.centered}>
          {rcLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.accent} />
              <Text style={[styles.loadingText, { color: theme.text }]}>Loading paywall...</Text>
            </View>
          )}
          {(error || noOfferings) && (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorTitle, { color: theme.accent }]}>Something went wrong</Text>
              <Text style={[styles.errorMessage, { color: theme.text }]}>
                {error ?? `No offering found for "${offeringIdentifier}". Check your RevenueCat dashboard.`}
              </Text>
              <Pressable
                style={[styles.retryButton, { backgroundColor: theme.surface }]}
                onPress={() => { setError(null); refresh(); }}
              >
                <Text style={[styles.retryButtonText, { color: theme.text }]}>Try Again</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {/* Full-screen paywall — no centering wrapper */}
      {showPaywall && (
        <>
          <RevenueCatUI.Paywall
            options={{ offering }}
            onDismiss={onDismiss}
            onPurchaseCompleted={({ customerInfo }) => {
              if (__DEV__) console.log('Purchase completed', customerInfo);
              onPurchaseComplete?.();
            }}
            onRestoreCompleted={({ customerInfo }) => {
              if (__DEV__) console.log('Restore completed', customerInfo);
              onPurchaseComplete?.();
            }}
            onPurchaseError={({ error }) => {
              if (__DEV__) console.error('Purchase error', error);
              setError(error?.message || 'Purchase failed');
            }}
            style={styles.paywall}
          />
          {footerText && (
            <Text style={[styles.footerText, { color: theme.textMuted }]}>{footerText}</Text>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paywall: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
    marginHorizontal: 16,
  },
});
