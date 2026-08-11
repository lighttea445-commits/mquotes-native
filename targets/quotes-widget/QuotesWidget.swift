import WidgetKit
import SwiftUI
import AppIntents
import os

// MARK: - Constants
// Must match WidgetBridgeModule.swift
private let kAppGroupId = "group.com.mquotes.shared"

/// One line per timeline request. Visible in Console.app / sysdiagnose filtered
/// on subsystem com.kovoapps.quotable.quotes-widget — the only way to tell a
/// blank widget apart from an extension that never ran.
private let kLog = Logger(subsystem: "com.kovoapps.quotable.quotes-widget", category: "timeline")

/// Hard cap on timeline entries. The app writes ~48; WidgetKit will not thank
/// us for thousands if the queue is ever malformed.
private let kMaxEntries = 64

/// Last-resort text when the App Group holds nothing at all.
private let kFallbackText = "The journey of a thousand miles begins with a single step."

/// Shown when no configuration can be resolved: the app has never written
/// mq_configs, so there is no queue to walk and nothing for a tap to resolve.
/// Naming the state beats showing a quote the widget cannot actually rotate.
private let kSetupText = "Tap to activate"

/// The Minimal theme's background and text, mirrored from constants/themes.ts
/// (#0D0D0D and #E8E0D0). The extension cannot reach the app's tokens, so the
/// two values are restated here and must be changed together with the theme.
///
/// These are used only in full colour rendering. They give the widget an opaque
/// card of its own instead of letting iOS 26's Liquid Glass container show
/// through, and they are fixed rather than `Color.primary` because the widget is
/// always dark: `Color.primary` follows the device's light/dark setting and
/// would render the quote near-black on this background in light mode.
private let kWidgetBackground = Color(red: 0.051, green: 0.051, blue: 0.051)
private let kWidgetText = Color(red: 0.910, green: 0.878, blue: 0.816)

// MARK: - Data model

struct QuoteEntry: TimelineEntry {
  let date: Date
  /// Which config's queue this entry came from — travels in the widget tap
  /// URL alongside the index, so the app knows which queue to resolve the
  /// tapped quote from (each config keeps its own).
  let configId: String
  /// Position in that config's stored queue.
  let index: Int
  let quoteText: String
  let quoteAuthor: String
  let showBorder: Bool
}

/// Shape of each element in the `mq_queue_<configId>` JSON array written by the app.
private struct StoredQuote: Decodable {
  let text: String
  let author: String
  let id: String?

  init(text: String, author: String, id: String?) {
    self.text = text
    self.author = author
    self.id = id
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    text = try c.decode(String.self, forKey: .text)
    author = (try? c.decode(String.self, forKey: .author)) ?? ""
    id = try? c.decode(String.self, forKey: .id)
  }

  private enum CodingKeys: String, CodingKey { case text, author, id }
}

// MARK: - Config picker
//
// Every widget setting except *which config* lives entirely in the App Group,
// written by the app. Apple's Edit Widget panel keeps exactly one control:
// which of the app's named configurations this placed widget shows. iOS gives
// the app no widget ids, so this AppIntent is the only mechanism that can bind
// a specific widget to a specific config — nothing else can.
//
// Themes are not offered anywhere. The system discards widget colours entirely
// in accented rendering (a Tinted or Clear Home Screen), so a theme would
// silently do nothing for those users. The border is a stroke rather than a
// fill, so it survives that mode as a tinted outline.

/// Shape of each element in `mq_configs`, written by WidgetBridge.updateIOSConfigList.
private struct StoredConfigMeta: Decodable {
  let id: String
  let name: String
}

private func loadConfigMetas() -> [StoredConfigMeta] {
  guard
    let defaults = UserDefaults(suiteName: kAppGroupId),
    let raw = defaults.string(forKey: "mq_configs"),
    let data = raw.data(using: .utf8),
    let decoded = try? JSONDecoder().decode([StoredConfigMeta].self, from: data)
  else { return [] }
  return decoded
}

struct WidgetConfigEntity: AppEntity, Identifiable {
  let id: String
  let name: String

  static var typeDisplayRepresentation: TypeDisplayRepresentation { "Widget Configuration" }
  static var defaultQuery = WidgetConfigQuery()

  var displayRepresentation: DisplayRepresentation { DisplayRepresentation(title: "\(name)") }
}

struct WidgetConfigQuery: EntityQuery {
  func entities(for identifiers: [WidgetConfigEntity.ID]) async throws -> [WidgetConfigEntity] {
    let metas = loadConfigMetas()
    return identifiers.compactMap { id in
      metas.first(where: { $0.id == id }).map { WidgetConfigEntity(id: $0.id, name: $0.name) }
    }
  }

  func suggestedEntities() async throws -> [WidgetConfigEntity] {
    loadConfigMetas().map { WidgetConfigEntity(id: $0.id, name: $0.name) }
  }

  /// Prefers a config nothing is using yet, so placing several widgets spreads
  /// them across the library instead of stacking every one on the first entry.
  /// Two widgets on one config aren't just similar, they're identical forever:
  /// position is derived from that config's shared queue and epoch, so they
  /// rotate in lockstep.
  ///
  /// The claim is stamped here rather than left to the first timeline render,
  /// or two widgets placed back to back both resolve to the same free entry.
  func defaultResult() async -> WidgetConfigEntity? {
    let metas = loadConfigMetas()
    guard let chosen = metas.first(where: { !isConfigInUse($0.id) }) ?? metas.first else {
      return nil
    }
    markClaimed(configId: chosen.id)
    return WidgetConfigEntity(id: chosen.id, name: chosen.name)
  }
}

struct QuoteWidgetIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource { "Quote Widget" }
  static var description: IntentDescription {
    IntentDescription("Choose which of your widget configurations this shows.")
  }

  @Parameter(title: "Configuration")
  var config: WidgetConfigEntity?

  init() {}
}

// MARK: - Shared-container reads

private struct Appearance {
  let showBorder: Bool
}

/// Free users get the default look. The app gates its own controls too, but a
/// queue written while Pro was active outlives the entitlement, so the render
/// path enforces the gate as well.
private func resolveAppearance(configId: String) -> Appearance {
  guard let defaults = UserDefaults(suiteName: kAppGroupId) else {
    return Appearance(showBorder: false)
  }
  guard defaults.bool(forKey: "mq_is_pro") else {
    return Appearance(showBorder: false)
  }
  return Appearance(showBorder: defaults.bool(forKey: "mq_border_\(configId)"))
}

/// Minutes between timeline entries for this config. WidgetKit ignores
/// anything under 15. Mirrors REFRESH_FREQUENCY_MINUTES in useWidgetStore.ts.
private func resolveRotateMinutes(configId: String) -> Int {
  guard let defaults = UserDefaults(suiteName: kAppGroupId) else { return 60 }
  let stored = defaults.integer(forKey: "mq_rotate_\(configId)")
  return stored >= 15 ? stored : 60
}

/// The quote queue the app pre-writes for this config, so the widget can
/// rotate on its own — iOS cannot wake JS in the background to fetch a fresh
/// quote, and each config keeps a separate queue so it can follow its own topic.
private func loadQuotes(configId: String) -> [StoredQuote] {
  guard
    let defaults = UserDefaults(suiteName: kAppGroupId),
    let raw = defaults.string(forKey: "mq_queue_\(configId)"),
    let data = raw.data(using: .utf8),
    let decoded = try? JSONDecoder().decode([StoredQuote].self, from: data),
    !decoded.isEmpty
  else { return [] }
  return Array(decoded.prefix(kMaxEntries))
}

/// Stamps that this config was just rendered. The only channel that flows
/// extension-to-app — it's how the app tells a config apart from "Pending"
/// (created but not yet picked in any placed widget's Edit Widget panel).
private func markSeen(configId: String) {
  guard let defaults = UserDefaults(suiteName: kAppGroupId) else { return }
  defaults.set(Date().timeIntervalSince1970 * 1000, forKey: "mq_seen_\(configId)")
}

/// Stamps that the picker handed this config out as a new widget's default.
///
/// Deliberately NOT mq_seen_: the system can ask for a default outside a real
/// placement, and the app reads mq_seen_ to decide whether to tell the user a
/// config is on their Home Screen. Writing this one keeps a speculative call
/// from turning into a claim the UI repeats back as fact.
private func markClaimed(configId: String) {
  guard let defaults = UserDefaults(suiteName: kAppGroupId) else { return }
  defaults.set(Date().timeIntervalSince1970 * 1000, forKey: "mq_claimed_\(configId)")
}

/// Mirrors SEEN_WINDOW_MS in lib/iosWidget.ts. Long, because the only proof a
/// config is still in use is the extension rendering it, and WidgetKit can go
/// a while between timeline requests on a rarely viewed Home Screen page.
private let kSeenWindow: TimeInterval = 3 * 24 * 60 * 60

/// Rendered recently, or handed out recently. Only the picker asks this — it's
/// about which config to give the NEXT widget, not what to show the user.
private func isConfigInUse(_ configId: String) -> Bool {
  guard let defaults = UserDefaults(suiteName: kAppGroupId) else { return false }
  let now = Date().timeIntervalSince1970
  for key in ["mq_seen_\(configId)", "mq_claimed_\(configId)"] {
    let ms = defaults.double(forKey: key)
    if ms > 0 && now - ms / 1000 < kSeenWindow { return true }
  }
  return false
}

/// Heartbeat for the whole extension, not one config.
///
/// A blank or stuck widget has three causes that look identical from the
/// outside: the bridge never linked so nothing was ever written, the App Group
/// is unreachable so the write went to a container the extension can't see, or
/// no config exists yet. Without a Mac there is no Console.app to tell them
/// apart, so the extension records that it ran and what it found. Nothing reads
/// these keys today; they exist so a reader can be added without another guess.
private func markStatus(_ status: String) {
  guard let defaults = UserDefaults(suiteName: kAppGroupId) else { return }
  defaults.set(Date().timeIntervalSince1970 * 1000, forKey: "mq_ext_last_run")
  defaults.set(status, forKey: "mq_ext_last_status")
}

// MARK: - Timeline provider

struct QuoteProvider: AppIntentTimelineProvider {

  func placeholder(in context: Context) -> QuoteEntry {
    QuoteEntry(
      date: Date(),
      configId: "",
      index: 0,
      quoteText: "Be yourself; everyone else is already taken.",
      quoteAuthor: "Oscar Wilde",
      showBorder: false
    )
  }

  // Rendered for real while the timeline loads, so it must agree with what the
  // timeline is about to show: the setup state when no config resolves, and the
  // current cursor rather than the first quote. Only the gallery preview keeps
  // the placeholder.
  func snapshot(for configuration: QuoteWidgetIntent, in context: Context) async -> QuoteEntry {
    let now = Date()
    if context.isPreview { return placeholder(in: context) }
    guard let configId = resolveConfigId(configuration) else { return setupEntry(date: now) }
    let quotes = loadQuotes(configId: configId)
    let index = cursor(configId: configId, count: quotes.count, at: now)
    return entry(
      configId: configId,
      at: index,
      date: now,
      quote: quotes.isEmpty ? nil : quotes[index],
      appearance: resolveAppearance(configId: configId)
    )
  }

  func timeline(for configuration: QuoteWidgetIntent, in context: Context) async -> Timeline<QuoteEntry> {
    let now = Date()

    guard let configId = resolveConfigId(configuration) else {
      // No config exists yet, or the App Group is unreachable. Logged before
      // the guard rather than after it, because this branch used to produce no
      // record at all: a widget stuck here looked identical to one that had
      // never run.
      kLog.info("timeline requested: no config available")
      markStatus("no-config")
      let retry = now.addingTimeInterval(15 * 60)
      return Timeline(entries: [setupEntry(date: now)], policy: .after(retry))
    }

    markSeen(configId: configId)

    let appearance = resolveAppearance(configId: configId)
    let quotes = loadQuotes(configId: configId)
    let minutes = resolveRotateMinutes(configId: configId)

    kLog.info("timeline requested: config \(configId, privacy: .public), \(quotes.count, privacy: .public) quote(s), rotate every \(minutes, privacy: .public) min")

    guard !quotes.isEmpty else {
      markStatus("empty-queue:\(configId)")
      let retry = now.addingTimeInterval(15 * 60)
      return Timeline(
        entries: [entry(configId: configId, at: 0, date: now, quote: nil, appearance: appearance)],
        policy: .after(retry)
      )
    }

    markStatus("ok:\(configId)")

    let count = quotes.count
    let step = TimeInterval(minutes * 60)
    let start = cursor(configId: configId, count: count, at: now)
    let steps = elapsedSteps(configId: configId, step: step, at: now)
    let nextBoundary = epochDate(configId: configId, fallback: now)
      .addingTimeInterval(Double(steps + 1) * step)

    // The first entry is dated `now`, not on a rotation boundary: WidgetKit
    // leaves the previous render in place if a timeline opens in the future.
    var entries: [QuoteEntry] = [
      entry(configId: configId, at: start, date: now, quote: quotes[start], appearance: appearance)
    ]

    // `at:` carries the index into the stored array, never the timeline offset,
    // so the tap URL still resolves against the app's unrotated mirror.
    if count > 1 {
      for k in 1..<min(count, kMaxEntries) {
        let idx = (start + k) % count
        entries.append(
          entry(
            configId: configId,
            at: idx,
            date: nextBoundary.addingTimeInterval(Double(k - 1) * step),
            quote: quotes[idx],
            appearance: appearance
          )
        )
      }
    }

    return Timeline(entries: entries, policy: .atEnd)
  }

  // MARK: - Rotation position
  //
  // Position comes from elapsed wall clock against the epoch the app stamps
  // when the queue's *contents* change, not from position in a freshly built
  // timeline. Every reload used to restart at quote 0, so an appearance change,
  // a Pro flip or a routine queue rewrite threw away the rotation. Deriving it
  // instead makes a reload idempotent, and makes snapshot and timeline agree.

  private func epochDate(configId: String, fallback: Date) -> Date {
    let ms = UserDefaults(suiteName: kAppGroupId)?.double(forKey: "mq_epoch_\(configId)") ?? 0
    return ms > 0 ? Date(timeIntervalSince1970: ms / 1000) : fallback
  }

  /// Clamped at zero so a clock moved backwards reads as "no rotations yet"
  /// rather than a negative index.
  private func elapsedSteps(configId: String, step: TimeInterval, at date: Date) -> Int {
    let epoch = epochDate(configId: configId, fallback: date)
    return max(0, Int(date.timeIntervalSince(epoch) / step))
  }

  /// Index into the stored queue, wrapped. A one-quote queue always yields 0,
  /// which is correct rather than a stall.
  private func cursor(configId: String, count: Int, at date: Date) -> Int {
    guard count > 1 else { return 0 }
    let step = TimeInterval(resolveRotateMinutes(configId: configId) * 60)
    return elapsedSteps(configId: configId, step: step, at: date) % count
  }

  /// Distinct from `placeholder(in:)`, which is the gallery and redacted
  /// preview and is never tappable. This one is rendered for real and its tap
  /// URL carries `setup=1` so it opens the app instead of doing nothing.
  private func setupEntry(date: Date) -> QuoteEntry {
    QuoteEntry(
      date: date,
      configId: "",
      index: 0,
      quoteText: kSetupText,
      quoteAuthor: "",
      showBorder: false
    )
  }

  /// The intent's own parameter when the user picked one, else the first
  /// config in the library — covers a freshly placed widget that hasn't been
  /// through Edit Widget yet, so it shows something instead of a blank prompt.
  private func resolveConfigId(_ configuration: QuoteWidgetIntent) -> String? {
    if let id = configuration.config?.id { return id }
    return loadConfigMetas().first?.id
  }

  private func entry(
    configId: String,
    at index: Int,
    date: Date,
    quote: StoredQuote?,
    appearance: Appearance
  ) -> QuoteEntry {
    QuoteEntry(
      date: date,
      configId: configId,
      index: index,
      quoteText: quote?.text ?? kFallbackText,
      quoteAuthor: quote?.author ?? "",
      showBorder: appearance.showBorder
    )
  }
}

// MARK: - Deep link
//
// A tap opens quotable://widget-open?src=ios&cfg=<configId>&i=<index>. The
// index is resolved against that config's own queue mirrored into
// AsyncStorage, so the app shows exactly the quote that was on the widget
// face. See app/widget-open.tsx.
//
// The setup state has no config to name, so it carries src=ios&setup=1
// instead. It must still return a URL: .widgetURL(nil) makes the whole widget
// a dead target, and that state is exactly when the user most needs the tap to
// take them into the app. widget-open.tsx already falls through to the home
// screen when cfg is absent, so no new handling is needed there.

private func tapURL(for entry: QuoteEntry) -> URL? {
  if entry.configId.isEmpty {
    return URL(string: "quotable://widget-open?src=ios&setup=1")
  }
  return URL(string: "quotable://widget-open?src=ios&cfg=\(entry.configId)&i=\(entry.index)")
}

// MARK: - Widget view

struct QuoteWidgetView: View {
  let entry: QuoteEntry
  @Environment(\.widgetFamily) var family
  @Environment(\.widgetRenderingMode) var renderingMode

  /// True only when the system draws the widget in full colour.
  ///
  /// A Tinted or Clear Home Screen (iOS 18+, and the default look of several
  /// iOS 26 appearance options) renders widgets in `.accented`: the system
  /// flattens the hierarchy into an accent group and a default group and
  /// recolours every view in each group to a single colour. Explicit
  /// foreground colours are discarded. Anything drawn as *content* — including
  /// a full-bleed background rectangle — is recoloured too, so it ends up the
  /// same shade as the text and washes it out into a solid pale card.
  ///
  /// The container background is the one thing the system correctly drops in
  /// that mode, which is why it must be the *only* place the background is
  /// drawn. See `homeScreenBody`.
  private var isFullColor: Bool { renderingMode == .fullColor }

  /// Starting size for the quote, before shrink-to-fit. Large no longer shares
  /// medium's value: it has roughly four times the area, so one size across both
  /// left the text stranded in the middle of the large card.
  private var quoteFontSize: CGFloat {
    switch family {
    case .systemSmall: return 15
    case .systemLarge: return 24
    default: return 20
    }
  }

  /// How far the quote may shrink before it would rather clip.
  ///
  /// The whole quote must always be readable, so there is no line limit and the
  /// text scales down to fit instead. `quoteFontSize` is therefore a starting
  /// point, not a fixed size. A floor this low is only reached by unusually
  /// long quotes on the small family; it exists so nothing is ever truncated.
  ///
  /// The factor is chosen to hold that floor at a fixed absolute size (3.6pt on
  /// small, 6.4pt elsewhere) rather than to be round in itself, so raising
  /// `quoteFontSize` never takes away the room a long quote needs. Change one
  /// and recompute the other.
  private var minQuoteScale: CGFloat {
    switch family {
    case .systemSmall: return 0.24
    case .systemLarge: return 0.27
    default: return 0.32
    }
  }

  var body: some View {
    switch family {
    case .accessoryRectangular:
      AccessoryRectangularView(entry: entry)
    case .accessoryInline:
      AccessoryInlineView(entry: entry)
    default:
      homeScreenBody
    }
  }

  // Home screen widget (systemSmall/systemMedium/systemLarge).
  private var homeScreenBody: some View {
    // No background fill here on purpose — the background belongs to
    // .containerBackground() alone. Drawing it as content as well made the
    // widget render as a solid pale card in accented mode (see isFullColor).
    VStack(alignment: .center, spacing: 0) {
      Spacer(minLength: 0)

      Text(entry.quoteText)
        .font(.custom("Georgia", size: quoteFontSize))
        .foregroundColor(isFullColor ? kWidgetText : nil)
        .multilineTextAlignment(.center)
        // No line limit — the quote must be shown in full, so it wraps freely
        // and shrinks to fit rather than truncating with an ellipsis.
        .lineLimit(nil)
        .minimumScaleFactor(minQuoteScale)
        // Claim space before the surrounding Spacers do. Without this the
        // Spacers can compress the text box and force scaling far earlier
        // than necessary, or clip it outright.
        .layoutPriority(1)
        // In accented mode this puts the quote in the accent group, which the
        // system draws at full strength; ungrouped content is dimmed.
        .widgetAccentable()

      Spacer(minLength: 0)
    }
    // Absorbs WidgetKit's 16pt default content margin, which
    // `.contentMarginsDisabled()` removes so the border can reach the real card
    // edge. The visible text inset is unchanged: 12/16 of its own plus the 16
    // the system used to add. Change these together with that modifier.
    .padding(family == .systemSmall ? 28 : 32)
    // Stretch to the full container, so the quote centres on the card rather
    // than collapsing to its own height.
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    // Drawn as an overlay stroke rather than a filled shape. A stroke keeps its
    // geometry in accented rendering, so the outline survives on a Tinted or
    // Clear Home Screen where a coloured fill would be flattened away.
    //
    // It cannot move into .containerBackground() to reach the edge instead: the
    // system drops that background entirely in accented mode (see isFullColor),
    // which is exactly where the stroke has to survive. ContainerRelativeShape
    // takes the widget's own corner radius, so the outline follows the card
    // rather than guessing at it.
    .overlay {
      if entry.showBorder {
        ContainerRelativeShape()
          .strokeBorder((isFullColor ? kWidgetText : Color.primary).opacity(0.6), lineWidth: 6)
      }
    }
    .widgetURL(tapURL(for: entry))
    // Opaque on purpose. Left clear, the widget shows iOS 26's Liquid Glass
    // container instead of a card of its own, and the glass reads as bright
    // refracted edges down the left and right sides.
    //
    // This is the only place the background may be drawn. As content — a
    // Rectangle, a .background() — it would be recoloured along with the text in
    // accented rendering and flatten the whole widget into a pale card. As the
    // container background the system drops it entirely in that mode and
    // substitutes its own material, so a Tinted or Clear Home Screen is
    // unaffected by this fill (see isFullColor).
    .containerBackground(kWidgetBackground, for: .widget)
  }
}

// MARK: - Lock screen (accessory) views
//
// Accessory families render on the system's own translucent background and are
// recoloured by it, so nothing here sets a fill, gradient or explicit colour.

private struct AccessoryRectangularView: View {
  let entry: QuoteEntry

  var body: some View {
    Text(entry.quoteText)
      .font(.system(size: 12))
      // Same rule as the home screen: show the whole quote, shrink instead of
      // truncating. The floor is higher here because the lock screen rectangle
      // is roughly 160x72pt — below this the text stops being readable at all.
      .lineLimit(nil)
      .minimumScaleFactor(0.5)
      .layoutPriority(1)
      // Parity with the home screen body: put the quote in the accent group so
      // it is drawn at full strength wherever the system tints rather than
      // just desaturates.
      .widgetAccentable()
      .frame(maxWidth: .infinity, alignment: .leading)
      .widgetURL(tapURL(for: entry))
      .containerBackground(.clear, for: .widget)
  }
}

private struct AccessoryInlineView: View {
  let entry: QuoteEntry

  // accessoryInline cannot carry a tap target — the system owns the tap.
  var body: some View {
    Label(entry.quoteText, systemImage: "quote.opening")
  }
}

// MARK: - Widget configuration

@main
struct QuotesWidgetBundle: WidgetBundle {
  var body: some Widget {
    QuotesWidget()
  }
}

struct QuotesWidget: Widget {
  let kind = "QuotesWidget"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, intent: QuoteWidgetIntent.self, provider: QuoteProvider()) { entry in
      QuoteWidgetView(entry: entry)
    }
    // The border setting draws the outline of the card itself, so the content
    // has to own the full widget bounds. With the default 16pt margins in place
    // the stroke sat inset from the edge, floating inside the card. The home
    // screen body adds that 16pt back as padding of its own.
    .contentMarginsDisabled()
    .configurationDisplayName("Quotes")
    .description("Display an inspiring quote on your home screen or lock screen.")
    .supportedFamilies([
      .systemSmall, .systemMedium, .systemLarge,
      // .accessoryCircular is deliberately absent. The area below the clock
      // accepts both circular and rectangular widgets, so declaring both makes
      // iOS list Quotable twice in that picker. Rectangular is the one that can
      // actually hold a quote.
      .accessoryRectangular, .accessoryInline,
    ])
  }
}

// MARK: - Preview

#Preview("Small", as: .systemSmall) {
  QuotesWidget()
} timeline: {
  QuoteEntry(date: .now, configId: "preview", index: 0, quoteText: "No one can make you feel inferior without your consent.", quoteAuthor: "Eleanor Roosevelt", showBorder: false)
}

#Preview("Medium", as: .systemMedium) {
  QuotesWidget()
} timeline: {
  QuoteEntry(date: .now, configId: "preview", index: 0, quoteText: "Live in the moment but prepare for your future.", quoteAuthor: "Unknown", showBorder: true)
}

#Preview("Large", as: .systemLarge) {
  QuotesWidget()
} timeline: {
  QuoteEntry(date: .now, configId: "preview", index: 0, quoteText: "The secret of getting ahead is getting started.", quoteAuthor: "Mark Twain", showBorder: true)
}

#Preview("Lock Screen – Rectangular", as: .accessoryRectangular) {
  QuotesWidget()
} timeline: {
  QuoteEntry(date: .now, configId: "preview", index: 0, quoteText: "The secret of getting ahead is getting started.", quoteAuthor: "Mark Twain", showBorder: true)
  QuoteEntry(date: .now, configId: "preview", index: 1, quoteText: "Live in the moment but prepare for your future.", quoteAuthor: "Unknown", showBorder: true)
}

#Preview("Lock Screen – Inline", as: .accessoryInline) {
  QuotesWidget()
} timeline: {
  QuoteEntry(date: .now, configId: "preview", index: 0, quoteText: "The secret of getting ahead is getting started.", quoteAuthor: "Mark Twain", showBorder: true)
  QuoteEntry(date: .now, configId: "preview", index: 1, quoteText: "Live in the moment but prepare for your future.", quoteAuthor: "Unknown", showBorder: true)
}
