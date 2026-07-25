import { useEffect, useReducer } from 'react';
import { AppState } from 'react-native';
import Purchases, { CustomerInfo, PurchasesOfferings } from 'react-native-purchases';
import { initializeRevenueCat, ENTITLEMENT_PRO } from '../lib/revenuecat';

export interface RevenueCatState {
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOfferings | null;
  isPro: boolean;
  userID: string | null;
}

// ── Dev override ────────────────────────────────────────────────────────────
// Set via setForcePro() in dev builds to bypass RevenueCat during testing.
let _forcePro: boolean | null = null;

export function setForcePro(val: boolean | null) {
  _forcePro = val;
  notify();
}

export function getForcePro(): boolean | null {
  return _forcePro;
}

// ── Module-level singleton ──────────────────────────────────────────────────
// All hook instances share one state so a purchase immediately propagates
// to every screen without needing a React context or prop drilling.

let _state: RevenueCatState = {
  isInitialized: false,
  isLoading: true,
  error: null,
  customerInfo: null,
  offerings: null,
  isPro: false,
  userID: null,
};

const _listeners = new Set<() => void>();

function notify() {
  _listeners.forEach((fn) => fn());
}

function patch(update: Partial<RevenueCatState>) {
  _state = { ..._state, ...update };
  notify();
}

// Initialization runs only once regardless of how many hook instances exist.
let _initStarted = false;

async function initialize() {
  if (_initStarted) return;
  _initStarted = true;

  try {
    await initializeRevenueCat();

    const [ciResult, ofResult, idResult] = await Promise.allSettled([
      Purchases.getCustomerInfo(),
      Purchases.getOfferings(),
      Purchases.getAppUserID(),
    ]);

    const customerInfo = ciResult.status === 'fulfilled' ? ciResult.value : null;
    const offerings   = ofResult.status === 'fulfilled' ? ofResult.value  : null;
    const userID      = idResult.status === 'fulfilled' ? idResult.value  : null;
    const isPro       = customerInfo?.entitlements.active[ENTITLEMENT_PRO] !== undefined;

    patch({ isInitialized: true, isLoading: false, error: null, customerInfo, offerings, isPro, userID });

    // One listener for the lifetime of the app — fires after every purchase/restore.
    Purchases.addCustomerInfoUpdateListener((info) => {
      const isPro = info.entitlements.active[ENTITLEMENT_PRO] !== undefined;
      patch({ customerInfo: info, isPro });
    });

    // Refresh subscriptions when app returns to foreground (catches external purchases).
    let lastAppState = AppState.currentState;
    AppState.addEventListener('change', (nextState) => {
      if (lastAppState !== 'active' && nextState === 'active' && !_state.isLoading) {
        refresh();
      }
      lastAppState = nextState;
    });
  } catch (err) {
    const isConfigError =
      err instanceof Error &&
      (err.message.includes('ConfigurationError') ||
        err.message.includes('no Test Store products') ||
        err.message.includes('Check the underlying error'));
    if (!isConfigError) {
      console.error('RevenueCat initialization error:', err);
    }
    patch({
      isInitialized: true,
      isLoading: false,
      error: isConfigError ? null : err instanceof Error ? err : new Error('Unknown error'),
    });
  }
}

async function refresh() {
  patch({ isLoading: true });
  try {
    const [customerInfo, offerings] = await Promise.all([
      Purchases.getCustomerInfo(),
      Purchases.getOfferings(),
    ]);
    const isPro = customerInfo.entitlements.active[ENTITLEMENT_PRO] !== undefined;
    patch({ customerInfo, offerings, isPro, error: null, isLoading: false });
  } catch (err) {
    patch({ error: err instanceof Error ? err : new Error('Refresh failed'), isLoading: false });
  }
}

// ── Hook ────────────────────────────────────────────────────────────────────
export interface RevenueCatHookResult extends RevenueCatState {
  refresh: () => Promise<void>;
}

export function useRevenueCat(): RevenueCatHookResult {
  // useReducer dispatch is stable — safe to add to the listener set.
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    _listeners.add(forceUpdate);
    initialize(); // no-op after the first call
    return () => { _listeners.delete(forceUpdate); };
  }, []);

  const isPro = _forcePro !== null ? _forcePro : _state.isPro;
  return { ..._state, isPro, refresh };
}
