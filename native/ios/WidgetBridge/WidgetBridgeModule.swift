import Foundation
import WidgetKit

// MARK: - WidgetBridge Native Module
//
// Bridges React Native → WidgetKit by writing quote data to a shared
// UserDefaults App Group container, then calling WidgetCenter.reloadAllTimelines().
//
// App Group identifier must match the one set in:
//   • Xcode → Signing & Capabilities → App Groups  (main target)
//   • Xcode → Signing & Capabilities → App Groups  (QuotesWidget extension target)
//   • ios/QuotesWidget/QuotesWidget.swift           (appGroupId constant)

private let kAppGroupId = "group.com.mquotes.shared"

@objc(WidgetBridge)
class WidgetBridgeModule: NSObject {

  // MARK: updateWidget

  @objc
  func updateWidget(
    _ jsonPayload: String,
    resolver resolve: @escaping (Any?) -> Void,
    rejecter reject: @escaping (String?, String?, Error?) -> Void
  ) {
    guard
      let data = jsonPayload.data(using: .utf8),
      let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    else {
      reject("PARSE_ERROR", "Invalid JSON payload", nil)
      return
    }

    guard let defaults = UserDefaults(suiteName: kAppGroupId) else {
      reject("DEFAULTS_ERROR", "Cannot access App Group UserDefaults. Check entitlements.", nil)
      return
    }

    defaults.set(json["quoteText"]  as? String ?? "",       forKey: "mq_quote_text")
    // JS sends authorText (not quoteAuthor) — read that key
    defaults.set(json["authorText"] as? String ?? "",       forKey: "mq_quote_author")
    defaults.set(json["showAuthor"] as? Bool   ?? false,    forKey: "mq_show_author")
    defaults.set(json["widgetType"] as? String ?? "basic",  forKey: "mq_widget_type")
    defaults.set(json["streakCount"] as? Int   ?? 0,        forKey: "mq_streak_count")
    defaults.set(json["themeName"]  as? String ?? "minimal",forKey: "mq_theme_name")
    defaults.set(json["textSize"]   as? String ?? "medium", forKey: "mq_text_size")
    defaults.set(Date().timeIntervalSince1970,              forKey: "mq_last_updated")
    defaults.synchronize()

    resolve(nil)
  }

  // MARK: reloadAllTimelines

  @objc
  func reloadAllTimelines(
    _ resolve: @escaping (Any?) -> Void,
    rejecter reject: @escaping (String?, String?, Error?) -> Void
  ) {
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }
    resolve(nil)
  }

  // MARK: getSwallowedExceptions

  /// Returns the "Module.method | Name: reason" strings recorded by the patched
  /// RCTTurboModule.mm (patches/react-native+0.81.5.patch) when a native module
  /// throws from a void TurboModule method during startup. Upstream React Native
  /// turns those into Hermes heap corruption on iOS 26; the patch swallows them
  /// and stashes them here so the app can say which module actually misbehaved.
  @objc
  func getSwallowedExceptions(
    _ resolve: @escaping (Any?) -> Void,
    rejecter reject: @escaping (String?, String?, Error?) -> Void
  ) {
    let stored = UserDefaults.standard.array(forKey: "RCTSwallowedTurboModuleExceptions") as? [String]
    resolve(stored ?? [])
  }

  /// Clears the recorded list (used by the in-app "Dismiss" action).
  @objc
  func clearSwallowedExceptions(
    _ resolve: @escaping (Any?) -> Void,
    rejecter reject: @escaping (String?, String?, Error?) -> Void
  ) {
    UserDefaults.standard.removeObject(forKey: "RCTSwallowedTurboModuleExceptions")
    resolve(nil)
  }

  // MARK: React Native bridge requirements

  @objc static func requiresMainQueueSetup() -> Bool { false }
}
