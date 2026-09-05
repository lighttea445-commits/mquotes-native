import { useEffect, useReducer } from 'react';
import { AppState, Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesOfferings } from 'react-native-purchases';
import {
  initializeRevenueCat,
  fetchOfferingsWithRetry,
  OfferingsResult,
  ENTITLEMENT_PRO,
} from '../lib/revenuecat';
import { errorReporting } from '../lib/errorReporting';

export interface RevenueCatState {
  isInitialized: boolean;
  isLoading: boolean;
  /**
   * Offerings have their own flag because they settle on their own timeline.
   * The store is retried for up to twelve seconds after launch, and nothing
   * that only needs the entitlement should wait on that.
   */
  offeringsLoading: boolean;
  error: Error | null;
  /**
   * What the store said about offerings, in one line. Surfaced on the paywall
   * in diagnostics builds — see IAP_DIAGNOSTICS in lib/revenuecat.ts.
   */
  offeringsDiagnostic: string | null;
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
  offeringsLoading: true,
  error: null,
  offeringsDiagnostic: null,
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
    patch({
      isInitialized: true,
      isLoading: false,
      offeringsLoading: false,
      error: null,
      isPro: false,
    });
    return;
  }

  try {
    await initializeRevenueCat();

    const [ciResult, idResult] = await Promise.allSettled([
      Purchases.getCustomerInfo(),
      Purchases.getAppUserID(),
    ]);

    const customerInfo = ciResult.status === 'fulfilled' ? ciResult.value : null;
    const userID       = idResult.status === 'fulfilled' ? idResult.value : null;
    const isPro        = customerInfo?.entitlements.active[ENTITLEMENT_PRO] !== undefined;

    patch({ isInitialized: true, isLoading: false, customerInfo, isPro, userID });

    // Deliberately not awaited. The entitlement is what gates the app, and it
    // has already landed; the store gets its retries without holding up a
    // spinner on every screen that only wanted to know whether the user is Pro.
    loadOfferings();

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
    patch({
      isInitialized: true,
      isLoading: false,
      offeringsLoading: false,
      error,
      offeringsDiagnostic: `RevenueCat failed to configure. ${error.message}`,
    });
  }
}

// Only one offerings fetch runs at a time: the paywall asks for one on mount,
// and a foreground transition can land in the middle of it.
let _offeringsInFlight = false;

/**
 * Fetch offerings, retrying, patching as each attempt lands.
 *
 * Patching per attempt rather than only at the end means a first attempt that
 * succeeds costs nothing, while one that fails leaves the paywall showing its
 * loading state instead of a dead Continue button for the twelve seconds the
 * retries take.
 */
async function loadOfferings(): Promise<void> {
  if (_offeringsInFlight) return;
  _offeringsInFlight = true;
  patch({ offeringsLoading: true });

  try {
    const apply = (result: OfferingsResult) => {
      patch({
        // A failed attempt returns null. Never let it clear a set that an
        // earlier attempt managed to fetch.
        offerings: result.offerings ?? _state.offerings,
        offeringsDiagnostic: result.diagnostic,
      });
    };

    const final = await fetchOfferingsWithRetry(apply);

    patch({
      offerings: final.offerings ?? _state.offerings,
      offeringsDiagnostic: final.diagnostic,
      error: final.usable ? null : new Error(final.diagnostic),
    });

    if (!final.usable) {
      errorReporting.captureError(new Error(final.diagnostic), {
        context: 'useRevenueCat:getOfferings',
      });
    }
  } finally {
    _offeringsInFlight = false;
    patch({ offeringsLoading: false });
  }
}

/** Re-ask the store. Does not re-run configure, which must happen once. */
export function retryOfferings(): Promise<void> {
  return loadOfferings();
}

/**
 * Write a CustomerInfo the caller already holds into the shared state.
 *
 * Both a purchase and a restore hand back the answer directly. Leaving the
 * update to the SDK's customer-info event means the screen that just
 * succeeded is still reading a stale `isPro` at the moment it decides where
 * to send the user, and it makes that decision depend on a listener
 * registered once at startup inside a branch that can fail. The caller has
 * the entitlement in hand; this writes it.
 *
 * The listener stays for what only it can catch: a subscription bought or
 * cancelled outside the app.
 */
export function applyCustomerInfo(customerInfo: CustomerInfo): void {
  patch({
    customerInfo,
    isPro: customerInfo.entitlements.active[ENTITLEMENT_PRO] !== undefined,
  });
}

async function refresh() {
  patch({ isLoading: true });
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const isPro = customerInfo.entitlements.active[ENTITLEMENT_PRO] !== undefined;
    patch({ customerInfo, isPro, isLoading: false });
  } catch (err) {
    patch({ error: err instanceof Error ? err : new Error('Refresh failed'), isLoading: false });
  }
  // Offerings carry their own flag and their own error, so they are refreshed
  // alongside rather than inside the entitlement round trip.
  loadOfferings();
}

// ── Hook ────────────────────────────────────────────────────────────────────
export interface RevenueCatHookResult extends RevenueCatState {
  refresh: () => Promise<void>;
  retryOfferings: () => Promise<void>;
}

export function useRevenueCat(): RevenueCatHookResult {
  // useReducer dispatch is stable — safe to add to the listener set.
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    _listeners.add(forceUpdate);
    initialize(); // no-op after the first call
    return () => { _listeners.delete(forceUpdate); };
  }, []);

  return { ..._state, refresh, retryOfferings };
}
