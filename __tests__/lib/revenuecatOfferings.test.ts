/**
 * Offerings diagnostics and retry.
 *
 * These cover the failure App Review hit under guideline 2.1(b): the store
 * returned nothing purchasable, the paywall showed its advertised fallback
 * prices anyway, and the only report was one flat "Plans could not be loaded."
 *
 * What matters here is that the three failures stay distinguishable. "No
 * offerings" is a RevenueCat problem, "offerings but no packages" is an App
 * Store Connect problem, and a thrown ConfigurationError usually names the
 * products outright. Collapsing them is what left the cause unknowable.
 */

const mockGetOfferings = jest.fn();

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    setLogLevel: jest.fn(),
    getOfferings: (...args: unknown[]) => mockGetOfferings(...args),
  },
  LOG_LEVEL: { VERBOSE: 'VERBOSE' },
}));

import {
  describeOfferings,
  describePurchasesError,
  fetchOfferingsWithRetry,
} from '../../lib/revenuecat';

/** Minimal shape of what getOfferings resolves to, for the fields read here. */
function offeringsWith(packageCounts: Record<string, number>, current?: string) {
  const all = Object.fromEntries(
    Object.entries(packageCounts).map(([id, n]) => [
      id,
      { identifier: id, availablePackages: Array.from({ length: n }, (_, i) => ({ identifier: `p${i}` })) },
    ]),
  );
  return { all, current: current ? all[current] : null } as never;
}

beforeEach(() => {
  mockGetOfferings.mockReset();
});

describe('describeOfferings', () => {
  it('names RevenueCat when there are no offerings at all', () => {
    const text = describeOfferings(offeringsWith({}));
    expect(text).toContain('0 offerings');
    expect(text).toMatch(/RevenueCat/);
  });

  it('names App Store Connect when offerings exist but nothing is priceable', () => {
    const text = describeOfferings(offeringsWith({ default: 0 }));
    expect(text).toContain('0 packages');
    // The whole point of this branch: RevenueCat is configured, Apple is not.
    expect(text).toMatch(/App Store Connect/);
    expect(text).toMatch(/Paid Applications/);
  });

  it('reports the counts and the current offering when healthy', () => {
    const text = describeOfferings(offeringsWith({ default: 2, legacy: 1 }, 'default'));
    expect(text).toContain('3 package(s)');
    expect(text).toContain('Current: default');
    expect(text).toContain('default: 2');
  });

  it('survives a null offerings object', () => {
    expect(describeOfferings(null)).toContain('returned nothing');
  });
});

describe('describePurchasesError', () => {
  it('surfaces the underlying StoreKit message, which is the useful field', () => {
    const text = describePurchasesError({
      code: '23',
      message: 'There is an issue with your configuration.',
      readableErrorCode: 'CONFIGURATION_ERROR',
      underlyingErrorMessage:
        'None of the products registered in the RevenueCat dashboard could be fetched from App Store Connect',
    });
    expect(text).toContain('CONFIGURATION_ERROR');
    expect(text).toContain('could be fetched from App Store Connect');
    expect(text).toContain('code 23');
  });

  it('reads the same fields off userInfo, where one platform puts them', () => {
    const text = describePurchasesError({
      code: 23,
      userInfo: { readableErrorCode: 'CONFIGURATION_ERROR', underlyingErrorMessage: 'Invalid product IDs' },
    });
    expect(text).toContain('CONFIGURATION_ERROR');
    expect(text).toContain('Invalid product IDs');
  });

  it('falls back to the raw value rather than reporting nothing', () => {
    expect(describePurchasesError('boom')).toContain('boom');
    expect(describePurchasesError(null)).toContain('without an error object');
  });
});

describe('fetchOfferingsWithRetry', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('does not wait when the first attempt is already usable', async () => {
    mockGetOfferings.mockResolvedValue(offeringsWith({ default: 2 }, 'default'));

    const result = await fetchOfferingsWithRetry();

    expect(result.usable).toBe(true);
    expect(mockGetOfferings).toHaveBeenCalledTimes(1);
  });

  it('retries a thrown fetch and keeps the result that finally works', async () => {
    // The exact shape App Review would have hit: StoreKit slow to answer at
    // cold start, then fine a second later.
    mockGetOfferings
      .mockRejectedValueOnce({ code: 23, underlyingErrorMessage: 'timed out' })
      .mockResolvedValueOnce(offeringsWith({ default: 2 }, 'default'));

    const pending = fetchOfferingsWithRetry();
    await jest.advanceTimersByTimeAsync(1000);
    const result = await pending;

    expect(mockGetOfferings).toHaveBeenCalledTimes(2);
    expect(result.usable).toBe(true);
    expect(result.offerings).not.toBeNull();
  });

  it('retries an empty offering set, not just a thrown error', async () => {
    // A StoreKit product lookup that came back empty resolves successfully, so
    // treating only rejections as retryable would give up on the first answer.
    mockGetOfferings
      .mockResolvedValueOnce(offeringsWith({ default: 0 }))
      .mockResolvedValueOnce(offeringsWith({ default: 2 }, 'default'));

    const pending = fetchOfferingsWithRetry();
    await jest.advanceTimersByTimeAsync(1000);
    const result = await pending;

    expect(mockGetOfferings).toHaveBeenCalledTimes(2);
    expect(result.usable).toBe(true);
  });

  it('gives up after the full backoff and says how many times it asked', async () => {
    mockGetOfferings.mockResolvedValue(offeringsWith({ default: 0 }));
    const seen: string[] = [];

    const pending = fetchOfferingsWithRetry(r => seen.push(r.diagnostic));
    await jest.advanceTimersByTimeAsync(1000 + 3000 + 8000);
    const result = await pending;

    expect(mockGetOfferings).toHaveBeenCalledTimes(4);
    expect(result.usable).toBe(false);
    expect(result.diagnostic).toContain('4 attempts');
    // Every attempt reports, so the paywall can show what it has instead of
    // sitting blank for the twelve seconds the backoff takes.
    expect(seen).toHaveLength(4);
  });

  it('never clears an offerings object it already has by failing later', async () => {
    mockGetOfferings
      .mockResolvedValueOnce(offeringsWith({ default: 0 }))
      .mockRejectedValue({ code: 23, underlyingErrorMessage: 'network down' });

    const pending = fetchOfferingsWithRetry();
    await jest.advanceTimersByTimeAsync(1000 + 3000 + 8000);
    const result = await pending;

    expect(result.usable).toBe(false);
    // The last word is the thrown error, which is the more informative one.
    expect(result.diagnostic).toContain('network down');
  });
});
