import { useEffect, useReducer } from 'react';
import { AppState, Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesOfferings } from 'react-native-purchases';
import { initializeRevenueCat, ENTITLEMENT_PRO } from '../lib/revenuecat';
import { errorReporting } from '../lib/errorReporting';

export interface RevenueCatState {
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOfferings | null;
  isPro: boolean;
  userID: string | null;
}

/**
 * Non-hook read of the same value useRevenueCat() returns, for code that runs
 * outside React (e.g. writing the Pro flag into the iOS widget's App Group).
 */
export function getIsPro(): boolean {
  return _state.isPro;
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
  const wasPro = getIsPro();
  _state = { ..._state, ...update };
  notify();

  // The iOS widget's theme / text size / author are picked in Apple's Edit
  // Widget panel, which knows nothing about entitlements — the widget reads a
  // Pro flag out of the App Group instead. Rewrite it as soon as entitlement
  // state flips so an upgrade takes effect without the user re-editing.
  const isPro = getIsPro();
  if (Platform.OS === 'ios' && isPro !== wasPro) {
    import('../lib/iosWidget')
      .then((m) => m.setIOSWidgetPro(isPro))
      .catch(() => {});
  }
}

// Escape hatch: skips every RevenueCat native call at startup. Left in place
// because it was useful for isolating startup crashes — a build with this set
// to true confirmed RevenueCat is NOT the source of the iOS 26 launch crash.
const DISABLE_REVENUECAT: boolean = false;

// Initialization runs only once regardless of how many hook instances exist.
let _initStarted = false;

async function initialize() {
  if (_initStarted) return;
  _initStarted = true;

  if (DISABLE_REVENUECAT) {
    // Report as "settled, not pro" so the UI renders normally instead of
    // sitting on a loading spinner forever.
    patch({ isInitialized: true, isLoading: false, error: null, isPro: false });
    return;
  }

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

    // allSettled swallows rejections. This is the one moment the store says why
    // it has nothing to sell, so keep it on `error` where the paywall can read
    // it. On a TestFlight build there is no console to fall back to.
    let offeringsError: Error | null = null;
    if (ofResult.status === 'rejected') {
      offeringsError =
        ofResult.reason instanceof Error ? ofResult.reason : new Error(String(ofResult.reason));
      errorReporting.captureError(offeringsError, { context: 'useRevenueCat:getOfferings' });
    } else if (!ofResult.value.current && Object.keys(ofResult.value.all).length === 0) {
      offeringsError = new Error(
        'RevenueCat returned zero offerings. The store has no purchasable products.',
      );
      errorReporting.captureMessage(offeringsError.message, 'error', {
        context: 'useRevenueCat:init',
      });
    }

    patch({ isInitialized: true, isLoading: false, error: offeringsError, customerInfo, offerings, isPro, userID });

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
    // A ConfigurationError here is the most informative thing the SDK ever
    // says: wrong key, missing store connection, or no products. It used to be
    // rewritten to `error: null`, which left no evidence the failure happened.
    const error = err instanceof Error ? err : new Error(String(err));
    errorReporting.captureError(error, { context: 'useRevenueCat:init' });
    patch({ isInitialized: true, isLoading: false, error });
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

  return { ..._state, refresh };
}
