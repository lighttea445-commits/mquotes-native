# iOS Port — Full Handoff Document

Read `CLAUDE.md` first for project context, stack, and the git workflow rule (versionCode + commit + push after every edit).

This document is a complete picture of the iOS port — what exists, what it does, and what remains. Review everything even if it looks done. Some of it has never been run on a real iOS build.

---

## Project Context

**App name:** Quotable  
**Stack:** React Native / Expo SDK, New Architecture, Expo Router v3, NativeWind, Zustand + AsyncStorage, RevenueCat  
**Android bundle ID:** `com.eriksen_dawson.quotable`  
**iOS bundle ID:** `com.eriksen_dawson.quotable` (same)  
**Git remote:** https://github.com/lighttea445-commits/mquotes-native — branch `main`  
**EAS project ID:** `7076af1d-0e03-4913-813f-3fa8061e252d`

---

## 1. iOS Config in app.json

**File:** `app.json`

Review the `ios` block:

```json
"ios": {
  "supportsTablet": false,
  "bundleIdentifier": "com.eriksen_dawson.quotable",
  "buildNumber": "2",
  "usesAppleSignIn": false,
  "entitlements": {
    "com.apple.security.application-groups": ["group.com.mquotes.shared"]
  },
  "infoPlist": {
    "ITSAppUsesNonExemptEncryption": false
  }
}
```

What to verify:
- `bundleIdentifier` matches what is registered in Apple Developer portal
- `buildNumber` will be auto-incremented by EAS on production builds (`autoIncrement: true` in `eas.json`)
- App Group entitlement `group.com.mquotes.shared` is present — this is required for the widget bridge to write to shared UserDefaults
- Plugins list includes `@bacons/apple-targets`, `./plugins/withWidgetBridgeModule`, `./plugins/withWidgetExported`, `./plugins/withWidgetPreview`

---

## 2. EAS Build Profiles

**File:** `eas.json`

Review the build profiles:

```json
"development": {
  "ios": { "simulator": true }
},
"preview": {
  "ios": { "simulator": true }
},
"production": {
  "ios": {
    "buildConfiguration": "Release",
    "autoIncrement": true
  }
}
```

What to verify:
- The `submit.production` block — it is currently empty. It needs App Store Connect API credentials before `eas submit` will work:

```json
"submit": {
  "production": {
    "ios": {
      "appleId": "YOUR_APPLE_ID",
      "ascAppId": "YOUR_APP_STORE_CONNECT_NUMERIC_APP_ID",
      "appleTeamId": "YOUR_TEAM_ID"
    }
  }
}
```

---

## 3. WidgetKit Implementation

**File:** `targets/quotes-widget/QuotesWidget.swift`

This is the full native iOS widget — home screen and lock screen. Read the whole file before running a build.

What it does:
- Implements a `TimelineProvider` that refreshes every 30 minutes
- Reads quote data from `UserDefaults(suiteName: "group.com.mquotes.shared")`
- Renders three home screen widget families: `.systemSmall`, `.systemMedium`, `.systemLarge`
- Renders three lock screen widget families: `.accessoryCircular`, `.accessoryRectangular`, `.accessoryInline`
- Mirrors all 18 app themes as hardcoded color values in a `themeColors` dictionary
- Shows streak count in widgets when `mq_widget_type` is `"streak"`

UserDefaults keys the JS side must write (see Section 4):

| Key | Type | Description |
|---|---|---|
| `mq_quote_text` | String | Current quote body |
| `mq_quote_author` | String | Author name |
| `mq_show_author` | Bool | Whether to show author |
| `mq_widget_type` | String | `"quote"` or `"streak"` |
| `mq_streak_count` | Int | Streak day count |
| `mq_theme_name` | String | Active theme name (must match a key in `themeColors`) |
| `mq_text_size` | String | `"small"`, `"medium"`, or `"large"` |

What to verify:
- All 18 theme color names in `themeColors` match the theme name strings used in `constants/themes.ts`
- Font used in Swift widgets is correct (the widget cannot load the app's bundled Playfair Display — it uses system fonts unless you bundle the font into the widget extension target)
- Lock screen widgets are guarded by `#if os(iOS)` and `@available(iOSApplicationExtension 16.0, *)` — confirm this compiles on your minimum deployment target
- The `group.com.mquotes.shared` App Group ID matches exactly what is provisioned in Apple Developer portal

---

## 4. Native Module — Widget Bridge

**Files:**
- `native/ios/WidgetBridge/WidgetBridgeModule.swift`
- `native/ios/WidgetBridge/WidgetBridgeModule.m`

These two files together form the React Native native module that lets JS call into the iOS widget system.

**WidgetBridgeModule.swift** — what it does:
- Receives a JSON payload from JS with quote, author, streak, theme, and settings
- Writes each field to `UserDefaults(suiteName: "group.com.mquotes.shared")`
- Calls `WidgetCenter.shared.reloadAllTimelines()` to trigger a widget refresh
- Exports two methods to JS: `updateWidget(jsonPayload)` and `reloadAllTimelines()`
- Rejects the promise with `DEFAULTS_ERROR` if the App Group UserDefaults container cannot be opened (this happens when the entitlement is missing or mismatched)

**WidgetBridgeModule.m** — what it does:
- Registers the Swift module with the React Native Objective-C bridge using `RCT_EXTERN_MODULE`
- Bridges both exported methods using `RCT_EXTERN_METHOD`

What to verify:
- The App Group ID string in the Swift file (`group.com.mquotes.shared`) exactly matches `app.json` and the provisioned entitlement
- The module name `WidgetBridge` in the `.m` file matches the class name in the `.swift` file
- The JS-facing method signatures match what the React Native JS side calls (search `WidgetBridge` in `lib/` or wherever widget updates are triggered from)

---

## 5. Expo Config Plugin — Widget Bridge Module

**File:** `plugins/withWidgetBridgeModule.js`

This Expo config plugin runs during `expo prebuild` and wires the native module into the generated Xcode project automatically.

What it does:
- Copies `native/ios/WidgetBridge/WidgetBridgeModule.swift` and `WidgetBridgeModule.m` into the generated `/ios` project directory
- Adds both files to the main app target's source file list in the Xcode project

What to verify:
- The destination paths in the plugin match the generated Xcode project structure after running `expo prebuild`
- Both `.swift` and `.m` files are added to the **main app target**, not the widget extension target
- After prebuild, open the Xcode project and confirm both files appear under the main target in the file navigator

---

## 6. Widget Extension Target Config

**File:** `targets/quotes-widget/expo-target.config.js`

Wires the QuotesWidget extension into the Xcode project via `@bacons/apple-targets`.

What to verify:
- `bundleId` in this config matches `com.eriksen_dawson.quotable.quotes-widget` (or whatever suffix was set — confirm it matches what Apple requires for widget extensions: must be `<main-bundle-id>.<extension-name>`)
- `deploymentTarget` is set appropriately (iOS 14+ for home widgets, iOS 16+ for lock screen widgets)
- The extension links against the App Group entitlement

---

## 7. Push Notifications

**Package:** `expo-notifications` (already in `app.json` plugins)

The notification permission prompt, scheduling, and delivery flow is already in the codebase. iOS is different from Android in two ways:

1. iOS requires an explicit permission prompt (`requestPermissionsAsync`) — Android 13+ also does this now, so the JS code likely already handles it
2. Remote push notifications require an APNs key uploaded to the push service

What to verify:
- `expo-notifications` plugin is in `app.json` plugins list — if missing, add it
- The permission request call handles both granted and denied states gracefully
- If using Expo's push service: upload the APNs key at expo.dev under the project's credentials
- If RevenueCat sends push (for win-back campaigns, etc.): upload the APNs key in the RevenueCat dashboard under the iOS app

---

## 8. RevenueCat — iOS SDK Key

**File:** `lib/revenuecat.ts`

RevenueCat uses platform-specific API keys. The Android key is already configured. iOS needs its own key.

What to verify:
- Read `lib/revenuecat.ts` and find where `Purchases.configure()` is called
- If there is a single key string: replace it with a `Platform.select` call:
  ```typescript
  import { Platform } from 'react-native';
  const rcApiKey = Platform.select({
    ios: 'appl_XXXXXXXXXXXXXXXX',
    android: 'goog_XXXXXXXXXXXXXXXX',
  })!;
  ```
- The iOS key is obtained from the RevenueCat dashboard: create the iOS app there (separate from the Android app), then copy the Public SDK Key
- In-app purchase products (monthly, annual, lifetime if applicable) must be created in App Store Connect first, then added to RevenueCat entitlements and offerings

---

## 9. Xcode Project Generation

The `/ios` folder is gitignored and does not exist in the repo. Nothing in this section needs to be written — it is generated.

To generate it:

```bash
npx expo prebuild --platform ios
```

This runs all config plugins including `withWidgetBridgeModule` and `@bacons/apple-targets`. It creates the `/ios` folder with a fully configured Xcode project.

**Do not manually edit files inside `/ios`.** If something needs to change, change it in `app.json` or the relevant config plugin, then re-run `expo prebuild --platform ios`.

After prebuild:
- Open `ios/Quotable.xcworkspace` (not the `.xcodeproj`) in Xcode
- Verify the two WidgetBridge source files appear under the main app target
- Verify the QuotesWidget extension target exists

---

## 10. App Groups Capability — Must Verify in Xcode

This cannot be automated fully through config plugins. After prebuild:

1. Open `ios/Quotable.xcworkspace` in Xcode
2. Select the **main app target** → Signing & Capabilities tab
3. Confirm App Groups capability is present and `group.com.mquotes.shared` is checked
4. Select the **QuotesWidget extension target** → Signing & Capabilities tab
5. Confirm the same App Group is checked there too

If either entitlement is missing, the widget bridge will fail at runtime with `DEFAULTS_ERROR` and the widget will show stale or empty data.

---

## 11. Apple Developer Account Setup

Required before any iOS build can be signed and distributed:

- Register bundle ID `com.eriksen_dawson.quotable` at developer.apple.com → Identifiers
- Register the widget extension bundle ID (e.g. `com.eriksen_dawson.quotable.quotes-widget`)
- Add the App Group `group.com.mquotes.shared` at developer.apple.com → Identifiers → App Groups
- Associate the App Group with **both** bundle IDs
- Create a Distribution Certificate (reuse existing if one exists)
- Create an App Store provisioning profile for the main app bundle ID
- Create an App Store provisioning profile for the widget extension bundle ID

Run `eas credentials --platform ios` to let EAS manage signing automatically — it will create or reuse certificates and profiles.

---

## 12. App Store Connect Setup

- Create the app at appstoreconnect.apple.com using bundle ID `com.eriksen_dawson.quotable`
- Set up in-app purchases matching the RevenueCat products (Monthly, Annual — exact product IDs must match what RevenueCat expects)
- Prepare metadata: app name, subtitle, description, keywords, support URL, marketing URL, privacy policy URL
- Set age rating (likely 4+)
- Upload screenshots for iPhone 6.5" and iPhone 5.5" minimum; 6.7" Pro Max is also required for newer submissions
- `supportsTablet: false` is set so iPad screenshots are not required

---

## 13. EAS Build and Submit Commands

Build for simulator (no signing needed):
```bash
eas build --platform ios --profile development
```

Build for TestFlight / App Store:
```bash
eas build --platform ios --profile production
```

Submit to App Store:
```bash
eas submit --platform ios --latest
```

---

## 14. What Has Never Been Tested on iOS

The following exists in code but has not been run against a real iOS build:

- **WidgetBridgeModule end-to-end** — the Swift and Obj-C bridge files are written but the App Group UserDefaults write path has not been verified on a device
- **QuotesWidget rendering** — the Swift widget compiles but visual output on all six widget families has not been tested
- **Lock screen widgets** — require a physical device running iOS 16+; simulator lock screen widget preview is unreliable
- **RevenueCat iOS paywall** — the RevenueCat UI components are cross-platform but the iOS-specific paywall sheet behaviour and StoreKit purchase flow have not been verified
- **Push notification delivery on iOS** — the permission prompt flow exists in JS but APNs key has not been uploaded anywhere

---

## Key Constants

| Thing | Value |
|---|---|
| iOS bundle ID | `com.eriksen_dawson.quotable` |
| Widget extension bundle ID | `com.eriksen_dawson.quotable.quotes-widget` (verify in `expo-target.config.js`) |
| App Group | `group.com.mquotes.shared` |
| EAS project ID | `7076af1d-0e03-4913-813f-3fa8061e252d` |
| Deep link scheme | `quotable://` |
| Widget UserDefaults suite | `group.com.mquotes.shared` |
| Widget UserDefaults keys | `mq_quote_text`, `mq_quote_author`, `mq_show_author`, `mq_widget_type`, `mq_streak_count`, `mq_theme_name`, `mq_text_size` |
