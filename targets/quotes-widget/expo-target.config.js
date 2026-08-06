/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'widget',
  name: 'QuotesWidget',
  // Resolves to com.kovoapps.quotable.quotes-widget (ios.bundleIdentifier + suffix)
  bundleIdentifier: '.quotes-widget',
  // Required by QuotesWidget.swift's use of .containerBackground(for: .widget)
  // and AppIntentConfiguration's dynamic config picker (iOS 17+).
  deploymentTarget: '17.0',
  frameworks: ['WidgetKit', 'SwiftUI', 'AppIntents'],
  // Must be declared here, not just in app.json. @bacons/apple-targets only
  // mirrors the main app's app groups onto the target when an `entitlements`
  // object already exists (build/with-widget.js — the sync block is guarded by
  // `if (entitlementsJson)`). Without this key no generated.entitlements is
  // written, CODE_SIGN_ENTITLEMENTS is removed from the target, and the
  // extension cannot read the App Group UserDefaults the app writes.
  entitlements: {
    'com.apple.security.application-groups': ['group.com.mquotes.shared'],
  },
};
