# RevenueCat Quick Start — Quotable

SDK packages are installed and integrated. This is the quick reference; see `docs/REVENUECAT_SETUP.md` for the full setup guide and `docs/REVENUECAT_EXAMPLES.md` for code examples.

## Configure the RevenueCat dashboard

1. Go to the RevenueCat dashboard at app.revenuecat.com
2. Open (or create) the project for Quotable
3. Under Entitlements, create one entitlement named `Quotable Premium` with identifier `Quotable Premium`. This must match `ENTITLEMENT_PRO` in `lib/revenuecat.ts`
4. Under Offerings, create an offering with identifier `default`
5. Add two packages using RevenueCat's standard package types, Monthly and Annual. The app reads `packageType === 'MONTHLY'` and `packageType === 'ANNUAL'` in `components/subscriptions/TrialScreen.tsx`, not a custom package identifier, so the package type is what matters
6. Link both packages to the `Quotable Premium` entitlement

## Configure store products

Product IDs are created in App Store Connect and Google Play Console, then attached to the packages above inside RevenueCat. Bundle ID is `com.kovoapps.quotable` on both platforms. Pricing shown in the app falls back to $4.99 a month and $44.99 a year (`FALLBACK_MONTHLY` / `FALLBACK_ANNUAL` in `TrialScreen.tsx`) if the offering has not loaded, so the real prices set in each store should match or the fallback will briefly show something inaccurate.

## Test on device

Run the app on a physical device or simulator using Expo Go or a dev build. From the paywall (Profile, then Quotable Premium), start a purchase and complete it in the sandbox environment for that store. Confirm the entitlement shows as active and the app unlocks Pro features.

## Key files

`lib/revenuecat.ts` holds SDK initialization and the entitlement constant. `hooks/useRevenueCat.ts` is the hook that exposes subscription state to the rest of the app. `components/subscriptions/TrialScreen.tsx` is the paywall. `components/subscriptions/PremiumModal.tsx` lists Pro benefits. `components/subscriptions/CustomerCenterModal.tsx` wraps RevenueCat's Customer Center for account management and restoring purchases. `app/subscriptions.tsx` is the full subscriptions screen with Benefits and Account tabs.

## Debugging

Enable verbose SDK logging with `Purchases.setLogLevel(Purchases.LOG_LEVEL.VERBOSE)` before `initializeRevenueCat` runs. To inspect the current entitlement state, read `customerInfo.entitlements.active` from the object `useRevenueCat()` returns.

The public SDK keys are set directly in `lib/revenuecat.ts` (`Platform.select` for iOS and Android). These are publishable keys, not secrets, so committing them is expected. Confirm which project they point to before testing.

## Before release

Test on a real iOS device and a real Android device, not only simulators. Complete a sandbox purchase on both the App Store and Play Store test tracks. Verify the failure paths, such as a cancelled purchase and a restore with no prior purchase. Wire up production analytics and error reporting: `lib/analytics.ts` and `lib/errorReporting.ts` are currently console-only stubs, so purchase events are not being captured anywhere in production yet.

## Support

RevenueCat docs: revenuecat.com/docs. React Native SDK docs: revenuecat.com/docs/sdks/react-native. Troubleshooting: see the Troubleshooting section in `docs/REVENUECAT_SETUP.md`.
