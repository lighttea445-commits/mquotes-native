import React, { useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RevenueCatUI } from 'react-native-purchases-ui';
import { useTheme } from '../../hooks/useTheme';

interface PaywallViewProps {
  offering?: string; // Offering identifier (e.g., "default")
  onPurchaseComplete?: () => void;
  onDismiss?: () => void;
  footerText?: string;
}

export function PaywallView({
  offering = 'default',
  onPurchaseComplete,
  onDismiss,
  footerText = 'Restore purchases in Settings',
}: PaywallViewProps) {
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handlePaywallResult = (result: any) => {
    console.log('Paywall result:', result);

    if (result?.paywallResult === 'PURCHASED') {
      setIsLoading(false);
      onPurchaseComplete?.();
    } else if (result?.paywallResult === 'RESTORED') {
      setIsLoading(false);
      onPurchaseComplete?.();
    } else if (result?.paywallResult === 'CANCELLED') {
      setIsLoading(false);
      onDismiss?.();
    } else if (result?.paywallResult === 'ERROR') {
      setError(result.error?.message || 'Unknown error');
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <View style={styles.content}>
        {isLoading && !error && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[styles.loadingText, { color: theme.text }]}>Loading paywall...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorTitle, { color: theme.accent }]}>Something went wrong</Text>
            <Text style={[styles.errorMessage, { color: theme.text }]}>{error}</Text>
            <Pressable
              style={[styles.retryButton, { backgroundColor: theme.surface }]}
              onPress={() => {
                setError(null);
                setIsLoading(true);
              }}
            >
              <Text style={[styles.retryButtonText, { color: theme.text }]}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {!error && (
          <>
            <RevenueCatUI.Paywall
              offering={offering}
              onResult={handlePaywallResult}
              style={styles.paywall}
            />
            {footerText && (
              <Text style={[styles.footerText, { color: theme.secondaryText }]}>{footerText}</Text>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paywall: {
    flex: 1,
    width: '100%',
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
