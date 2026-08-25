import Purchases, { LOG_LEVEL, PurchasesOfferings } from 'react-native-purchases';
import { Platform } from 'react-native';

// iOS key: RevenueCat dashboard → (your iOS app) → API Keys → Public SDK Key (starts with appl_)
const REVENUECAT_API_KEY = Platform.select({
  ios: 'appl_ZdEOrrPGxYzZwjTMVuoiWzQZNQm',
  android: 'goog_fqnpPxNEvjAxDwwUmmLJkOnIofu',
})!;

/** Entitlement identifier for "Quotable Premium" subscription */
export const ENTITLEMENT_PRO = 'Quotable Premium';

/**
 * Whether this build carries the store diagnostics.
 *
 * Set only by the `device` EAS profile. A Release build is otherwise silent
 * about why the store has nothing to sell: every console call in this file is
 * __DEV__ gated, errorReporting is a console-only shell, and there is no Mac
 * in the loop to read a device log from. That silence is why App Review's
 * "the plans could not be loaded" arrived with no way to reproduce it.
 *
 * Reading process.env directly is what makes this safe to leave in the tree:
 * the App Store build never sets the variable, so the value inlines to
 * undefined and the diagnostics branch is stripped rather than hidden.
 */
export const IAP_DIAGNOSTICS = process.env.EXPO_PUBLIC_IAP_DIAGNOSTICS === '1';

/** Backoff between offerings attempts. Length also sets the retry count. */
const OFFERINGS_RETRY_DELAYS_MS = [1000, 3000, 8000];

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface OfferingsResult {
  offerings: PurchasesOfferings | null;
  /** What the store said, in one line, on the last attempt. */
  diagnostic: string;
  /** True once at least one package survived StoreKit's product lookup. */
  usable: boolean;
}

/** Packages that StoreKit actually priced, across every offering. */
function countPackages(offerings: PurchasesOfferings): number {
  return Object.values(offerings.all).reduce((n, o) => n + o.availablePackages.length, 0);
}

/**
 * A RevenueCat rejection, flattened to one readable line.
 *
 * `underlyingErrorMessage` is the point of this function: it carries StoreKit's
 * own words, and it is usually the only field that names the real cause. The
 * RN SDK puts these on the error itself on one platform and under `userInfo`
 * on the other, so both are read.
 */
export function describePurchasesError(error: unknown): string {
  const e = error as {
    code?: string | number;
    message?: string;
    readableErrorCode?: string;
    underlyingErrorMessage?: string;
    userInfo?: { readableErrorCode?: string; underlyingErrorMessage?: string };
  } | null;

  if (!e) return 'getOfferings failed without an error object.';

  const readable = e.readableErrorCode ?? e.userInfo?.readableErrorCode;
  const underlying = e.underlyingErrorMessage ?? e.userInfo?.underlyingErrorMessage;

  const parts = [
    e.code !== undefined && e.code !== null ? `code ${e.code}` : null,
    readable ? `readable ${readable}` : null,
    e.message ? `message ${e.message}` : null,
    underlying ? `underlying ${underlying}` : null,
  ].filter(Boolean);

  return parts.length > 0
    ? `getOfferings threw. ${parts.join(' | ')}`
    : `getOfferings threw. ${String(error)}`;
}

/**
 * What came back, and which side of the wire the problem is on.
 *
 * The two empty results mean completely different things and the app used to
 * collapse them into one empty array. RevenueCat serves the offering config
 * from its own backend, then asks StoreKit on device to price the products; a
 * package whose product StoreKit will not return is dropped silently. So an
 * offering with zero packages means RevenueCat is configured and Apple is the
 * one refusing, while zero offerings means RevenueCat never had the config.
 */
export function describeOfferings(offerings: PurchasesOfferings | null): string {
  if (!offerings) return 'getOfferings returned nothing.';

  const ids = Object.keys(offerings.all);
  if (ids.length === 0) {
    return 'RevenueCat returned 0 offerings. Either nothing is configured on the RevenueCat side, or this API key points at a different project.';
  }

  const current = offerings.current?.identifier ?? 'none';
  const breakdown = ids.map((id) => `${id}: ${offerings.all[id].availablePackages.length}`).join(', ');
  const total = countPackages(offerings);

  if (total === 0) {
    return `RevenueCat returned ${ids.length} offering(s) but 0 packages. Current: ${current}. Packages per offering: ${breakdown}. RevenueCat has the config, so StoreKit did not price the products: check the Paid Applications agreement and that the product IDs match App Store Connect exactly.`;
  }

  return `${total} package(s) across ${ids.length} offering(s). Current: ${current}. Packages per offering: ${breakdown}.`;
}

/**
 * Offerings, retried.
 *
 * Sandbox StoreKit on a fresh device is slow and the first call after launch
 * fails often. This used to be a single shot at startup, so one cold failure
 * left the paywall with nothing to sell for the whole session, which is
 * exactly the dead Continue button App Review reported.
 *
 * An offering set with no priceable packages is retried as well as a thrown
 * error, because the SDK reports a StoreKit product lookup that came back
 * empty as a success.
 *
 * Worth knowing what this does not fix. The SDK caches a *successful* offerings
 * response for about five minutes, so retries inside that window return the
 * same object without asking StoreKit again. A thrown ConfigurationError, which
 * is what a store with no fetchable products actually produces, is not cached,
 * and that is the case these retries are for. A genuinely misconfigured store
 * still needs the store fixed: this buys a correct diagnosis, not a cure.
 *
 * `onAttempt` fires as each attempt lands, so a caller can show what it has
 * rather than waiting out the whole backoff before rendering anything.
 */
export async function fetchOfferingsWithRetry(
  onAttempt?: (result: OfferingsResult) => void,
): Promise<OfferingsResult> {
  let last: OfferingsResult = {
    offerings: null,
    diagnostic: 'Offerings were never fetched.',
    usable: false,
  };
  let attempts = 0;

  for (let i = 0; i <= OFFERINGS_RETRY_DELAYS_MS.length; i++) {
    if (i > 0) await sleep(OFFERINGS_RETRY_DELAYS_MS[i - 1]);
    attempts = i + 1;

    try {
      const offerings = await Purchases.getOfferings();
      last = {
        offerings,
        diagnostic: describeOfferings(offerings),
        usable: countPackages(offerings) > 0,
      };
    } catch (error) {
      last = { offerings: null, diagnostic: describePurchasesError(error), usable: false };
    }

    onAttempt?.(last);
    if (last.usable) break;
  }

  const diagnostic = last.usable
    ? last.diagnostic
    : `${last.diagnostic} (${attempts} attempt${attempts === 1 ? '' : 's'})`;

  if (__DEV__ || IAP_DIAGNOSTICS) console.log('[RevenueCat] offerings:', diagnostic);

  return { ...last, diagnostic };
}

/** Initialize RevenueCat SDK */
export async function initializeRevenueCat(): Promise<void> {
  try {
    // Must be set before configure() to capture the store handshake, which is
    // where a missing product or unsigned agreement actually reports itself.
    if (__DEV__ || IAP_DIAGNOSTICS) Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

    // Configure SDK with API key
    Purchases.configure({ apiKey: REVENUECAT_API_KEY });

    if (__DEV__) console.log('✅ RevenueCat initialized successfully');
  } catch (error) {
    if (__DEV__) console.error('❌ RevenueCat initialization failed:', error);
    throw error;
  }
}

/** Get the current user ID (may be generated by RevenueCat) */
export async function getUserID(): Promise<string> {
  try {
    return await Purchases.getAppUserID();
  } catch (error) {
    if (__DEV__) console.error('Error getting user ID:', error);
    throw error;
  }
}

/** Check if user has "Quotable Premium" entitlement */
export async function hasProEntitlement(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[ENTITLEMENT_PRO] !== undefined;
  } catch (error) {
    if (__DEV__) console.error('Error checking entitlement:', error);
    return false;
  }
}

/** Get full customer info (purchases, entitlements, etc.) */
export async function getCustomerInfo() {
  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    if (__DEV__) console.error('Error fetching customer info:', error);
    throw error;
  }
}

/** Get available offerings & products */
export async function getOfferings() {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings;
  } catch (error) {
    if (__DEV__) console.error('Error fetching offerings:', error);
    throw error;
  }
}

/** Purchase a package */
export async function purchasePackage(packageId: string, offering: string) {
  try {
    const offerings = await Purchases.getOfferings();
    // PurchasesOffering exposes availablePackages — there is no packagesById map.
    const selectedPackage = offerings.all[offering]?.availablePackages.find(
      (p) => p.identifier === packageId,
    );

    if (!selectedPackage) {
      throw new Error(`Package ${packageId} not found in offering ${offering}`);
    }

    const result = await Purchases.purchasePackage(selectedPackage);
    return result;
  } catch (error) {
    if (__DEV__) console.error('Purchase failed:', error);
    throw error;
  }
}

/** Restore purchases from App Store / Play Store */
export async function restorePurchases() {
  try {
    const result = await Purchases.restorePurchases();
    if (__DEV__) console.log('✅ Purchases restored');
    return result;
  } catch (error) {
    if (__DEV__) console.error('Restore purchases failed:', error);
    throw error;
  }
}

/** Set custom user ID (e.g., after login) */
export async function setAppUserID(userID: string) {
  try {
    await Purchases.logIn(userID);
    if (__DEV__) console.log('✅ User ID set');
  } catch (error) {
    if (__DEV__) console.error('Error setting user ID:', error);
    throw error;
  }
}

/** Log out the current user */
export async function logout() {
  try {
    await Purchases.logOut();
    if (__DEV__) console.log('✅ User logged out');
  } catch (error) {
    if (__DEV__) console.error('Error logging out:', error);
    throw error;
  }
}
