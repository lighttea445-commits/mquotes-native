import React, { useState } from 'react';
import { View, StyleSheet, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import RevenueCatUI from 'react-native-purchases-ui';
import { useTheme } from '../../hooks/useTheme';
import * as RevenueChat from '../../lib/revenuecat';

interface CustomerCenterModalProps {
  onClose?: () => void;
}

export function CustomerCenterModal({ onClose }: CustomerCenterModalProps) {
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleRestorePurchases = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await RevenueChat.restorePurchases();
      setSuccessMessage('✅ Purchases restored successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore purchases');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Account & Billing</Text>
        <Pressable onPress={onClose} disabled={isLoading}>
          <MaterialCommunityIcons
            name="close"
            size={24}
            color={theme.text}
          />
        </Pressable>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* RevenueCat Customer Center UI */}
        <View style={styles.customerCenterContainer}>
          <RevenueCatUI.CustomerCenterView
            onDismiss={() => onClose?.()}
            style={styles.customerCenter}
          />
        </View>

        {/* Manual Restore Purchases Button */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Restore Purchases</Text>
          <Text style={[styles.sectionDescription, { color: theme.textMuted }]}>
            If you purchased a subscription on another device or reinstalled the app, tap below to restore your access.
          </Text>
          <Pressable
            style={[
              styles.restoreButton,
              { backgroundColor: theme.surface },
              isLoading && styles.restoreButtonDisabled,
            ]}
            onPress={handleRestorePurchases}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.text} />
            ) : (
              <Text style={[styles.restoreButtonText, { color: theme.text }]}>
                Restore Purchases
              </Text>
            )}
          </Pressable>
        </View>

        {/* Messages */}
        {successMessage && (
          <View style={[styles.messageContainer, styles.successContainer]}>
            <Text style={styles.successMessage}>{successMessage}</Text>
          </View>
        )}

        {error && (
          <View style={[styles.messageContainer, styles.errorContainer]}>
            <Text style={styles.errorMessage}>{error}</Text>
          </View>
        )}

        {/* Info */}
        <View style={styles.infoSection}>
          <Text style={[styles.infoText, { color: theme.textMuted }]}>
            All subscription and billing management happens through the RevenueCat Customer Center above. Changes made here will be reflected on all your devices.
          </Text>
        </View>
      </ScrollView>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  customerCenterContainer: {
    marginVertical: 12,
  },
  customerCenter: {
    minHeight: 300,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  restoreButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restoreButtonDisabled: {
    opacity: 0.6,
  },
  restoreButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  messageContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
  },
  successContainer: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  successMessage: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  errorMessage: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
  },
  infoSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
