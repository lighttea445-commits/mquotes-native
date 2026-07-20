# iOS Build Prompt

Paste this entire file as your first message in a new Claude Code session.

---

You are picking up an existing React Native / Expo app called Quotable and porting it to iOS. The Android version is complete and live. Read CLAUDE.md first — it has the stack, architecture, and the git workflow rule (versionCode increment + commit + push after every edit, no exceptions).

The iOS groundwork is partially done but has never been compiled or run. Your job is to finish it, verify it, fix whatever is broken, and get to a working simulator build. Do not skip steps. Do not assume the existing iOS code is correct just because it exists.

Work through the following phases in order. Do not move to the next phase until the current one is complete.


## Phase 1: Audit existing iOS code

Read every file listed below. For each one, verify it is correct and flag anything that looks wrong before touching it.

**targets/quotes-widget/QuotesWidget.swift**
- Reads from UserDefaults suite `group.com.mquotes.shared`
- Serves .systemSmall, .systemMedium, .systemLarge (home screen) and .accessoryCircular, .accessoryRectangular, .accessoryInline (lock screen)
- Has a `themeColors` dictionary with 18 entries — open `constants/themes.ts` and verify every theme name key in the Swift file matches the theme name strings used in the JS codebase exactly (case-sensitive)
- Lock screen families must be guarded by `#if os(iOS)` and `@available(iOSApplicationExtension 16.0, *)`

**native/ios/WidgetBridge/WidgetBridgeModule.swift**
- Opens `UserDefaults(suiteName: "group.com.mquotes.shared")` — if nil, rejects with DEFAULTS_ERROR
- Calls `WidgetCenter.shared.reloadAllTimelines()` after writing
- Exports `updateWidget(_ jsonPayload: String)` and `reloadAllTimelines()` to JS

**native/ios/WidgetBridge/WidgetBridgeModule.m**
- RCT_EXTERN_MODULE name must match the Swift class name exactly
- Both methods must be registered with RCT_EXTERN_METHOD

**plugins/withWidgetBridgeModule.js**
- Copies both WidgetBridge files into the generated /ios directory
- Adds them to the main app target source files (not the widget extension target)

**targets/quotes-widget/expo-target.config.js**
- bundleId must follow the pattern `com.eriksen_dawson.quotable.<suffix>`
- deploymentTarget should be 16.0 to support lock screen widgets

**app.json**
- `ios.bundleIdentifier` is `com.eriksen_dawson.quotable`
- `ios.entitlements` contains `com.apple.security.application-groups: ["group.com.mquotes.shared"]`
- Plugins array includes: `@bacons/apple-targets`, `./plugins/withWidgetBridgeModule`, `./plugins/withWidgetExported`, `./plugins/withWidgetPreview`

**eas.json**
- iOS profiles exist for development (simulator: true), preview (simulator: true), production (Release + autoIncrement: true)
- `submit.production.ios` block exists but credentials are intentionally left blank — leave them blank, the user will fill them in

**lib/revenuecat.ts**
- Find where Purchases.configure() is called
- If it uses a single hardcoded key, replace it with Platform.select:
  ```typescript
  import { Platform } from 'react-native';
  const rcApiKey = Platform.select({
    ios: 'REPLACE_WITH_IOS_KEY',
    android: 'EXISTING_ANDROID_KEY',
  })!;
  ```
- Do not invent an iOS key — use the placeholder string REPLACE_WITH_IOS_KEY and leave a comment telling the user where to get it (RevenueCat dashboard → iOS app → Public SDK Key)

Fix anything broken in Phase 1. Commit after fixes.


## Phase 2: Generate the Xcode project

Run:
```
npx expo prebuild --platform ios
```

If it errors, read the error, fix the root cause, and re-run. Do not manually edit files inside /ios — fix the source (app.json or config plugin) and re-run prebuild.

After prebuild succeeds, check the generated /ios directory:
- Confirm WidgetBridgeModule.swift and WidgetBridgeModule.m exist in the /ios project folder
- Confirm the widget extension target folder exists
- Read the generated Xcode project file (.pbxproj) and confirm both WidgetBridge files are listed as sources under the main app target

Tell the user exactly what to check manually in Xcode after they open `ios/Quotable.xcworkspace`:
1. Main app target → Signing & Capabilities → App Groups → group.com.mquotes.shared is checked
2. QuotesWidget target → Signing & Capabilities → App Groups → same group is checked
3. Both targets have a signing team set


## Phase 3: Verify widget UserDefaults keys

Search the JS codebase for where widget data is written. Find calls to the WidgetBridge native module and confirm the keys being written match exactly what QuotesWidget.swift reads:

| Key | Expected type |
|---|---|
| mq_quote_text | String |
| mq_quote_author | String |
| mq_show_author | Bool |
| mq_widget_type | String ("quote" or "streak") |
| mq_streak_count | Int |
| mq_theme_name | String |
| mq_text_size | String ("small", "medium", or "large") |

If any keys are missing, misnamed, or the wrong type, fix the JS side.


## Phase 4: Attempt a simulator build

Run:
```
eas build --platform ios --profile development
```

If the build fails, read the error and fix it. Common failure causes:
- Missing native module registration
- Swift/Obj-C bridging header issues
- App Group entitlement mismatch
- Missing CocoaPods dependency

Fix, commit, and re-run until the build succeeds.


## Steps that require human action (pause and tell the user)

Claude cannot complete these — stop and tell the user clearly:

1. **Apple Developer account** — Register both bundle IDs, create the App Group, create provisioning profiles, create a Distribution Certificate. Then run `eas credentials --platform ios`.
2. **App Groups in Xcode** — After prebuild, open Xcode and manually check the App Groups capability on both targets (see Phase 2 above).
3. **RevenueCat iOS app** — Create the iOS app in the RevenueCat dashboard, get the Public SDK Key, paste it into lib/revenuecat.ts replacing REPLACE_WITH_IOS_KEY.
4. **In-app purchases** — Create Monthly and Annual products in App Store Connect with product IDs matching what RevenueCat expects. Link them in RevenueCat.
5. **APNs key** — Generate at developer.apple.com → Keys, upload to RevenueCat dashboard.
6. **App Store Connect listing** — Create the app, fill metadata, upload screenshots (iPhone 6.5" and 6.7" Pro Max required).
7. **EAS submit credentials** — Fill in eas.json submit.production.ios with appleId, ascAppId, appleTeamId.


## Key constants

- iOS bundle ID: `com.eriksen_dawson.quotable`
- Widget extension bundle ID: `com.eriksen_dawson.quotable.quotes-widget`
- App Group: `group.com.mquotes.shared`
- EAS project ID: `7076af1d-0e03-4913-813f-3fa8061e252d`
- Git remote: https://github.com/lighttea445-commits/mquotes-native (branch: main)


## What has never been tested

Flag these explicitly when you encounter them — do not assume they work:
- WidgetBridgeModule writing to shared UserDefaults on a real device
- QuotesWidget rendering across all six widget families
- Lock screen widget rendering (requires iOS 16+ physical device)
- RevenueCat iOS paywall and StoreKit purchase flow
- Push notification delivery via APNs
