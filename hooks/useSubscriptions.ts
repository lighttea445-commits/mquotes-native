import { useCallback } from 'react';
import Purchases from 'react-native-purchases';
import * as RevenueChat from '../lib/revenuecat';
import { ENTITLEMENT_PRO } from '../lib/revenuecat';

export function useSubscriptions() {
  /**
   * Check if user has Pro entitlement
   */
  const hasProAccess = useCallback(async (): Promise<boolean> => {
    try {
      return await RevenueChat.hasProEntitlement();
    } catch (error) {
      console.error('Error checking Pro access:', error);
      return false;
    }
  }, []);

  /**
   * Initiate purchase flow for a specific package
   */
  const purchase = useCallback(async (packageId: string, offering: string = 'sale') => {
    try {
      const result = await RevenueChat.purchasePackage(packageId, offering);
      return {
        success: true,
        result,
      };
    } catch (error) {
      console.error('Purchase error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Purchase failed',
      };
    }
  }, []);

  /**
   * Restore previously purchased subscriptions
   */
  const restore = useCallback(async () => {
    try {
      const result = await RevenueChat.restorePurchases();
      return {
        success: true,
        result,
      };
    } catch (error) {
      console.error('Restore error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Restore failed',
      };
    }
  }, []);

  /**
   * Get formatted price for a package
   */
  const getPackagePrice = useCallback(
    async (packageId: string, offering: string = 'sale'): Promise<string | null> => {
      try {
        const offerings = await RevenueChat.getOfferings();
        const pkg = offerings.all[offering]?.packagesById[packageId];
        return pkg?.product?.priceString || null;
      } catch (error) {
        console.error('Error getting package price:', error);
        return null;
      }
    },
    []
  );

  /**
   * Get all available packages in an offering
   */
  const getPackages = useCallback(async (offering: string = 'sale') => {
    try {
      const offerings = await RevenueChat.getOfferings();
      return offerings.all[offering]?.availablePackages || [];
    } catch (error) {
      console.error('Error getting packages:', error);
      return [];
    }
  }, []);

  /**
   * Check if user has an active trial
   */
  const isOnTrial = useCallback(async (): Promise<boolean> => {
    try {
      const customerInfo = await RevenueChat.getCustomerInfo();
      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_PRO];
      return entitlement?.isActive && entitlement?.isSandbox ? true : false;
    } catch (error) {
      console.error('Error checking trial status:', error);
      return false;
    }
  }, []);

  /**
   * Get the expiration date of the Pro subscription
   */
  const getProExpirationDate = useCallback(async (): Promise<Date | null> => {
    try {
      const customerInfo = await RevenueChat.getCustomerInfo();
      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_PRO];
      return entitlement?.expirationDate ? new Date(entitlement.expirationDate) : null;
    } catch (error) {
      console.error('Error getting expiration date:', error);
      return null;
    }
  }, []);

  return {
    hasProAccess,
    purchase,
    restore,
    getPackagePrice,
    getPackages,
    isOnTrial,
    getProExpirationDate,
  };
}
