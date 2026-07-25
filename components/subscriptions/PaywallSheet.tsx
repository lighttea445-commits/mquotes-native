import React from 'react';
import { View, StyleSheet } from 'react-native';
import RevenueCatUI from 'react-native-purchases-ui';
import { useRevenueCat } from '../../hooks/useRevenueCat';

interface PaywallSheetProps {
  visible: boolean;
  onClose: () => void;
  featureName?: string;
}

/**
 * Full-screen paywall powered entirely by RevenueCat dashboard UI.
 * No custom header — the RC paywall handles its own close/dismiss.
 */
export function PaywallSheet({ visible, onClose }: PaywallSheetProps) {
  const { refresh, isInitialized, offerings } = useRevenueCat();

  if (!visible) return null;
  // Don't render the native paywall until RC is initialized with valid offerings.
  // Rendering before init (e.g. placeholder iOS key) causes a native-level crash.
  if (!isInitialized || !offerings) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 1000, elevation: 100 }]}>
      <RevenueCatUI.Paywall
        onDismiss={onClose}
        onPurchaseCompleted={async () => {
          await refresh();
          onClose();
        }}
        onRestoreCompleted={async () => {
          await refresh();
          onClose();
        }}
        onPurchaseError={() => {
          onClose();
        }}
        style={styles.paywall}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  paywall: {
    flex: 1,
  },
});
