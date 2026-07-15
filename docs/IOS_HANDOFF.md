# iOS Port — Handoff Document

Read `CLAUDE.md` first for the full project context, stack, and dev conventions.
This document covers only what is specific to the iOS port.

---

## Current State

More iOS work exists than it might appear. The following is already written and should not be recreated:

| File | What it does |
|---|---|
| `targets/quotes-widget/QuotesWidget.swift` | Full WidgetKit implementation — home screen (small/medium/large) and lock screen (circular/rectangular/inline) widgets, all 18 themes mirrored |
| `native/ios/WidgetBridge/WidgetBridgeModule.swift` | Swift native module that writes quote data to a shared App Group UserDefaults container and calls `WidgetCenter.reloadAllTimelines()` |
| `native/ios/WidgetBridge/WidgetBridgeModule.m` | Objective-C bridge file that exposes the Swift module to the React Native bridge |
| `plugins/withWidgetBridgeModule.js` | Expo config plugin that copies the WidgetBridge native module into the generated Xcode project and registers it as a source file on the main app target |
| `targets/quotes-widget/expo-target.config.js` | Wires the QuotesWidget extension target via `@bacons/apple-targets` |
| `app.json` → `ios` | Bundle ID (`com.eriksen_dawson.quotable`), build number, App Group entitlement (`group.com.mquotes.shared`), encryption flag |
| `eas.json` | iOS build profiles for development (simulator), preview (simulator), and production already configured |

The app also already handles `Platform.OS === 'ios'` in `KeyboardAvoidingView` and safe area edges are used correctly throughout.

---

## What Still Needs to Be Done

### 1. Generate the Xcode project

The `/ios` folder is gitignored and does not exist. Generate it with:

```bash
npx expo prebuild --platform ios
```

This runs all the config plugins including `withWidgetBridgeModule` and `@bacons/apple-targets`, which wire the native module and widget extension into the Xcode project automatically.

Do not manually edit the generated `/ios` folder — re-run prebuild if something changes in `app.json` or the plugins.

### 2. App Groups capability in Xcode

After prebuild, open `ios/Quotable.xcworkspace` in Xcode and verify:

- Main app target → Signing & Capabilities → App Groups → `group.com.mquotes.shared` is checked
- QuotesWidget extension target → Signing & Capabilities → App Groups → same group is checked

Both targets must share the same App Group or the widget bridge will fail silently (the Swift module rejects with `DEFAULTS_ERROR`).

### 3. Apple Developer account setup

- Register the bundle ID `com.eriksen_dawson.quotable` at developer.apple.com if not already done
- Create a Distribution Certificate and App Store provisioning profile
- Run `eas credentials --platform ios` to configure signing for EAS Build

### 4. App Store Connect

- Create the app listing at appstoreconnect.apple.com with bundle ID `com.eriksen_dawson.quotable`
- Add in-app purchase products matching what is already configured in the RevenueCat dashboard for Android
- Prepare screenshots for iPhone and iPad (if iPad is ever supported — currently `supportsTablet: false`)
- Write app description, keywords, support URL, privacy policy URL
- Set age rating (likely 4+ with no content concerns)

### 5. RevenueCat iOS

- Add the iOS app in the RevenueCat dashboard
- Configure the iOS SDK key in the app (check `lib/revenuecat.ts` — if there is a single key it may already be cross-platform; if not, add the iOS key there)
- Link App Store Connect IAP products to RevenueCat entitlements

### 6. Push notifications (APNs)

- Generate an APNs key (not certificate) in developer.apple.com → Keys
- Upload it to the RevenueCat dashboard under the iOS app settings, OR to the Expo push notification service if using Expo's push infrastructure
- The `expo-notifications` plugin is already configured in `app.json` — the permission prompt flow should work on iOS without code changes

### 7. EAS submission config

`eas.json` has an empty `submit.production` block. Add the App Store Connect API key:

```json
"submit": {
  "production": {
    "ios": {
      "appleId": "your-apple-id@email.com",
      "ascAppId": "your-app-store-connect-app-id",
      "appleTeamId": "YOUR_TEAM_ID"
    }
  }
}
```

Or use `eas submit --platform ios` interactively the first time.

### 8. Test on simulator and device

After prebuild and signing are set up:

```bash
eas build --platform ios --profile development
```

Walk the full onboarding flow on simulator. Then test on a physical device for:
- Push notification permission prompt (does not appear on simulator)
- Widget installation and data refresh (simulator widgets are limited)
- RevenueCat paywall rendering
- Haptics

---

## Known Unknowns

- The `WidgetBridgeModule` Swift code has not been run end-to-end. The logic is correct but it needs to be tested against a real build with the App Group entitlement active.
- Lock screen widget tap behaviour (deep link back into the app) may need a URL scheme handler — check if the existing `quotable://` scheme in `app.json` covers this.
- `react-native-android-widget` (the Android home screen widget package) is Android-only and will be ignored on iOS — the iOS widget is handled entirely by WidgetKit via the native module. No code changes needed but confirm it does not cause iOS build errors.

---

## Key Constants

| Thing | Value |
|---|---|
| Bundle ID | `com.eriksen_dawson.quotable` |
| App Group | `group.com.mquotes.shared` |
| EAS project ID | `7076af1d-0e03-4913-813f-3fa8061e252d` |
| Deep link scheme | `quotable://` |
| Widget UserDefaults keys | `mq_quote_text`, `mq_quote_author`, `mq_show_author`, `mq_widget_type`, `mq_streak_count`, `mq_theme_name`, `mq_text_size` |
