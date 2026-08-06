import Foundation
import WidgetKit

// MARK: - WidgetBridge Native Module
//
// Bridges React Native → WidgetKit by writing quote data to a shared
// UserDefaults App Group container, then calling WidgetCenter.reloadAllTimelines().
//
// App Group identifier must match the one set in:
//   • app.json → ios.entitlements                       (main target)
//   • targets/quotes-widget/expo-target.config.js        (extension target)
//   • targets/quotes-widget/QuotesWidget.swift           (kAppGroupId constant)

private let kAppGroupId = "group.com.mquotes.shared"

@objc(WidgetBridge)
class WidgetBridgeModule: NSObject {

  // MARK: updateWidgetQueue

  /// Writes one config's quote queue, which the widget extension rotates
  /// through on its own — iOS cannot wake JS in the background to fetch a
  /// fresh quote. Each config in the app's library gets its own queue, keyed
  /// by id, so a widget bound to any of them (via the AppIntent picker in
  /// Apple's Edit Widget panel) shows that config's own topic.
  ///
  /// The queue index travels in the widget's tap URL, which is how a tap
  /// resolves back to the exact quote that was on screen.
  ///
  /// Payload: `{ configId: String, quotes: [{ text, author, id }],
  ///             rotateMinutes: Int, isPro: Bool, showBorder: Bool, showButtons: Bool }`
  @objc
  func updateWidgetQueue(
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

    guard let configId = json["configId"] as? String, !configId.isEmpty else {
      reject("PARSE_ERROR", "Payload is missing configId", nil)
      return
    }

    // Re-serialize rather than storing the whole payload — the widget decodes
    // mq_queue_<id> as a bare array.
    guard
      let quotes = json["quotes"] as? [[String: Any]],
      let quotesData = try? JSONSerialization.data(withJSONObject: quotes),
      let quotesString = String(data: quotesData, encoding: .utf8)
    else {
      reject("PARSE_ERROR", "Payload is missing a valid quotes array", nil)
      return
    }

    defaults.set(quotesString, forKey: "mq_queue_\(configId)")
    defaults.set(json["rotateMinutes"] as? Int ?? 60, forKey: "mq_rotate_\(configId)")
    defaults.set(json["showBorder"] as? Bool ?? false, forKey: "mq_border_\(configId)")
    defaults.set(json["showButtons"] as? Bool ?? false, forKey: "mq_buttons_\(configId)")
    // Pro gate is shared across configs — one entitlement, not per-config.
    defaults.set(json["isPro"] as? Bool ?? false, forKey: "mq_is_pro")
    defaults.synchronize()

    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }

    resolve(nil)
  }

  // MARK: updateConfigList

  /// Writes the id/name/appearance list backing the AppIntent's dynamic option
  /// list in Apple's Edit Widget panel — every config the user has created, so
  /// any placed widget can be pointed at any of them.
  ///
  /// Payload: `{ configs: [{ id, name, showBorder, showButtons, rotateMinutes }], isPro: Bool }`
  @objc
  func updateConfigList(
    _ jsonPayload: String,
    resolver resolve: @escaping (Any?) -> Void,
    rejecter reject: @escaping (String?, String?, Error?) -> Void
  ) {
    guard
      let data = jsonPayload.data(using: .utf8),
      let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
      let configs = json["configs"] as? [[String: Any]],
      let configsData = try? JSONSerialization.data(withJSONObject: configs),
      let configsString = String(data: configsData, encoding: .utf8)
    else {
      reject("PARSE_ERROR", "Invalid JSON payload", nil)
      return
    }

    guard let defaults = UserDefaults(suiteName: kAppGroupId) else {
      reject("DEFAULTS_ERROR", "Cannot access App Group UserDefaults. Check entitlements.", nil)
      return
    }

    defaults.set(configsString, forKey: "mq_configs")
    defaults.set(json["isPro"] as? Bool ?? false, forKey: "mq_is_pro")
    defaults.synchronize()

    resolve(nil)
  }

  // MARK: getConfigSeenAt

  /// Milliseconds-since-epoch the extension last rendered this config, from
  /// the mq_seen_<id> stamp it writes on every timeline request — or 0 if it
  /// never has. This is the only channel that flows extension-to-app, and it's
  /// how the app infers whether a config is "Pending" (unbound) or in use.
  @objc
  func getConfigSeenAt(
    _ configId: String,
    resolver resolve: @escaping (Any?) -> Void,
    rejecter reject: @escaping (String?, String?, Error?) -> Void
  ) {
    guard let defaults = UserDefaults(suiteName: kAppGroupId) else {
      resolve(0)
      return
    }
    resolve(defaults.double(forKey: "mq_seen_\(configId)"))
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
