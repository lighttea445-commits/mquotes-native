import React, { useState } from 'react';
import { FONTS } from '../../constants/fonts';
import { View, StyleSheet, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { ICON_BTN } from '../ui/tokens';
import { liquidGlassAvailable } from '../ui/GlassSurface';
import RevenueCatUI from 'react-native-purchases-ui';
import { useTheme } from '../../hooks/useTheme';
import * as RevenueChat from '../../lib/revenuecat';

interface CustomerCenterModalProps {
  onClose?: () => void;
}

export function CustomerCenterModal({ onClose }: CustomerCenterModalProps) {
  const theme = useTheme();
  const glass = liquidGlassAvailable();
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
        <IconButton
          icon="close"
          onPress={() => onClose?.()}
          disabled={isLoading}
          filled={glass}
          size={glass ? ICON_BTN.md : ICON_BTN.sm}
          iconSize={glass ? 22 : 24}
          color={theme.text}
          accessibilityLabel="Close"
        />
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
    fontWeight: '600', fontFamily: FONTS.display.bold
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
    marginBottom: 8, fontFamily: FONTS.ui.bold
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20, fontFamily: FONTS.body.regular
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
    fontWeight: '600', fontFamily: FONTS.ui.medium
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
    fontWeight: '500', fontFamily: FONTS.ui.regular
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  errorMessage: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500', fontFamily: FONTS.ui.regular
  },
  infoSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18, fontFamily: FONTS.body.regular
  },
});
