# iOS Handoff Checklist

Read CLAUDE.md first. Then work through this top to bottom.

Bundle ID: com.kovoapps.quotable (ios.bundleIdentifier in app.json)
Widget extension bundle ID: com.kovoapps.quotable.quotes-widget
Apple Team ID: HF7548K866
App Group: group.com.mquotes.shared
Git: https://github.com/lighttea445-commits/mquotes-native (branch: main)
EAS project ID: 7076af1d-0e03-4913-813f-3fa8061e252d


## Review existing code (done but unverified)

- [ ] app.json — confirm ios.bundleIdentifier, ios.entitlements App Group, and all four plugins are present: @bacons/apple-targets, ./plugins/withWidgetBridgeModule, ./plugins/withWidgetExported, ./plugins/withWidgetPreview
- [ ] eas.json — confirm ios build profiles exist for development (simulator), preview (simulator), production (Release + autoIncrement)
- [ ] targets/quotes-widget/QuotesWidget.swift — full WidgetKit implementation. Reads from UserDefaults suite group.com.mquotes.shared. Serves .systemSmall/Medium/Large plus .accessoryRectangular/Inline. .accessoryCircular is deliberately absent: the area below the clock accepts both circular and rectangular, so declaring both lists Quotable twice. No themes are offered, because the system discards widget colours in accented rendering
- [ ] native/ios/WidgetBridge/WidgetBridgeModule.swift — writes quote data to shared UserDefaults, calls WidgetCenter.shared.reloadAllTimelines(). Verify App Group ID string matches exactly
- [ ] native/ios/WidgetBridge/WidgetBridgeModule.m — Obj-C bridge registering the Swift module. Verify module name matches Swift class name
- [ ] plugins/withWidgetBridgeModule.js — copies WidgetBridge files into generated /ios and adds them to main app target (not widget extension). Verify after prebuild
- [ ] targets/quotes-widget/expo-target.config.js — widget extension wired via @bacons/apple-targets. Verify bundleId suffix and deploymentTarget (17.0 — required by AppIntentConfiguration and .containerBackground). The App Group entitlement MUST be declared in this file: @bacons/apple-targets only mirrors app.json's app groups onto the target when an `entitlements` object is already present, otherwise it strips CODE_SIGN_ENTITLEMENTS and the extension can't read the shared container. After prebuild, confirm targets/quotes-widget/generated.entitlements exists
- [ ] lib/revenuecat.ts — find Purchases.configure(). Currently Android-only key. Needs Platform.select with iOS key once RevenueCat iOS app is created


## Apple Developer portal (manual, requires paid account)

- [ ] Register bundle ID com.kovoapps.quotable
- [ ] Register widget extension bundle ID com.kovoapps.quotable.quotes-widget
- [ ] Create App Group group.com.mquotes.shared
- [ ] Associate App Group with both bundle IDs
- [ ] Create Distribution Certificate
- [ ] Create App Store provisioning profile for main app
- [ ] Create App Store provisioning profile for widget extension


## Generate Xcode project

- [ ] Run: npx expo prebuild --platform ios
- [ ] Open ios/Quotable.xcworkspace in Xcode (not .xcodeproj)
- [ ] Confirm WidgetBridgeModule.swift and .m appear under main app target in file navigator
- [ ] Confirm QuotesWidget extension target exists
- [ ] Main app target → Signing & Capabilities → App Groups → group.com.mquotes.shared is checked
- [ ] QuotesWidget target → Signing & Capabilities → App Groups → same group is checked
- [ ] Run eas credentials --platform ios to configure signing


## RevenueCat

- [ ] Create iOS app in RevenueCat dashboard
- [ ] Copy iOS Public SDK Key
- [ ] Add Platform.select in lib/revenuecat.ts with iOS key
- [ ] Create IAP products in App Store Connect (Monthly, Annual — IDs must match RevenueCat)
- [ ] Link App Store Connect products to RevenueCat entitlements and offerings


## Push notifications (APNs)

- [ ] Generate APNs key at developer.apple.com → Keys (auth key, not certificate)
- [ ] Upload to RevenueCat dashboard under iOS app settings, OR to expo.dev credentials if using Expo push


## App Store Connect

- [ ] Create app listing with bundle ID com.kovoapps.quotable
- [ ] Fill metadata: name, subtitle, description, keywords, support URL, privacy policy URL
- [ ] Set age rating
- [ ] Upload screenshots: iPhone 6.5" and 6.7" Pro Max required; 5.5" recommended
- [ ] Add submit credentials to eas.json submit.production.ios (appleId, ascAppId, appleTeamId)


## Build and test

- [ ] eas build --platform ios --profile development (simulator build)
- [ ] Walk full onboarding flow on simulator
- [ ] eas build --platform ios --profile production
- [ ] Test on physical device: notification permission prompt, widget install, widget data refresh, RevenueCat paywall, haptics
- [ ] Lock screen widgets need iOS 16+ physical device — simulator is unreliable


## Submit

- [ ] eas submit --platform ios --latest


## What has never been tested

These exist in code but have never run against a real iOS build:
- WidgetBridgeModule end-to-end (UserDefaults write + WidgetCenter reload)
- QuotesWidget visual output across all five widget families
- The per-config quote queue (mq_queue_<configId>) and its multi-entry rotating timeline
- Rotation position surviving a reload, via the mq_epoch_<configId> stamp
- Widget tap deep link (quotable://widget-open?src=ios&cfg=<configId>&i=N, and the setup=1 variant when no config resolves)
- Apple's Edit Widget panel (the config picker via QuoteWidgetIntent, backed by mq_configs)
- The mq_is_pro render-path gate on the border
- The mq_ext_last_run / mq_ext_last_status heartbeat the extension writes

Note: the widget moved from StaticConfiguration to AppIntentConfiguration. Any
widget placed by an older build must be removed and re-added — iOS will not
migrate a static widget onto an intent-configured one.
- Lock screen widget rendering on device
- RevenueCat iOS paywall and StoreKit purchase flow
- Push notification delivery via APNs
