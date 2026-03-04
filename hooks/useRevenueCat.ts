import { useEffect, useState, useCallback } from 'react';
import Purchases, { CustomerInfo, Offerings } from 'react-native-purchases';
import { initializeRevenueCat, ENTITLEMENT_PRO } from '../lib/revenuecat';

export interface RevenueCatState {
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
  customerInfo: CustomerInfo | null;
  offerings: Offerings | null;
  isPro: boolean;
  userID: string | null;
}

export function useRevenueCat() {
  const [state, setState] = useState<RevenueCatState>({
    isInitialized: false,
    isLoading: true,
    error: null,
    customerInfo: null,
    offerings: null,
    isPro: false,
    userID: null,
  });

  // Initialize RevenueCat on mount
  useEffect(() => {
    (async () => {
      try {
        await initializeRevenueCat();

        // Fetch customer info and offerings
        const [customerInfo, offerings, userID] = await Promise.all([
          Purchases.getCustomerInfo(),
          Purchases.getOfferings(),
          Purchases.getAppUserID(),
        ]);

        const isPro = customerInfo.entitlements.active[ENTITLEMENT_PRO] !== undefined;

        setState({
          isInitialized: true,
          isLoading: false,
          error: null,
          customerInfo,
          offerings,
          isPro,
          userID,
        });

        // Set up listener for customer info updates
        const customerInfoListener = Purchases.onCustomerInfoUpdated((info) => {
          const hasProAccess = info.entitlements.active[ENTITLEMENT_PRO] !== undefined;
          setState((prev) => ({
            ...prev,
            customerInfo: info,
            isPro: hasProAccess,
          }));
        });

        return () => {
          customerInfoListener.remove();
        };
      } catch (err) {
        console.error('useRevenueCat initialization error:', err);
        setState((prev) => ({
          ...prev,
          isInitialized: false,
          isLoading: false,
          error: err instanceof Error ? err : new Error('Unknown error'),
        }));
      }
    })();
  }, []);

  // Refresh customer info and offerings
  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const [customerInfo, offerings] = await Promise.all([
        Purchases.getCustomerInfo(),
        Purchases.getOfferings(),
      ]);

      const isPro = customerInfo.entitlements.active[ENTITLEMENT_PRO] !== undefined;

      setState((prev) => ({
        ...prev,
        customerInfo,
        offerings,
        isPro,
        error: null,
        isLoading: false,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err : new Error('Refresh failed'),
        isLoading: false,
      }));
    }
  }, []);

  return {
    ...state,
    refresh,
  };
}
