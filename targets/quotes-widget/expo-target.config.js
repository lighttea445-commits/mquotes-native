/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'widget',
  name: 'QuotesWidget',
  // Resolves to com.eriksen_dawson.quotable.QuotesWidget
  bundleIdentifier: '.QuotesWidget',
  // Required by QuotesWidget.swift's use of .containerBackground(for: .widget)
  deploymentTarget: '17.0',
  frameworks: ['WidgetKit', 'SwiftUI'],
  // App Group entitlement is mirrored automatically from app.json's
  // ios.entitlements['com.apple.security.application-groups'].
};
