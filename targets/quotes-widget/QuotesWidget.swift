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

  func defaultResult() async -> WidgetConfigEntity? {
    loadConfigMetas().first.map { WidgetConfigEntity(id: $0.id, name: $0.name) }
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

  func snapshot(for configuration: QuoteWidgetIntent, in context: Context) async -> QuoteEntry {
    if context.isPreview { return placeholder(in: context) }
    guard let configId = resolveConfigId(configuration) else { return placeholder(in: context) }
    let quotes = loadQuotes(configId: configId)
    return entry(configId: configId, at: 0, date: Date(), quote: quotes.first, appearance: resolveAppearance(configId: configId))
  }

  func timeline(for configuration: QuoteWidgetIntent, in context: Context) async -> Timeline<QuoteEntry> {
    guard let configId = resolveConfigId(configuration) else {
      // No config exists yet, or none was ever created — nothing to show.
      let retry = Date().addingTimeInterval(15 * 60)
      return Timeline(entries: [placeholder(in: context)], policy: .after(retry))
    }

    markSeen(configId: configId)

    let appearance = resolveAppearance(configId: configId)
    let quotes = loadQuotes(configId: configId)
    let minutes = resolveRotateMinutes(configId: configId)
    let now = Date()

    kLog.info("timeline requested: config \(configId, privacy: .public), \(quotes.count, privacy: .public) quote(s), rotate every \(minutes, privacy: .public) min")

    guard !quotes.isEmpty else {
      let retry = now.addingTimeInterval(15 * 60)
      return Timeline(
        entries: [entry(configId: configId, at: 0, date: now, quote: nil, appearance: appearance)],
        policy: .after(retry)
      )
    }

    let entries = quotes.enumerated().map { offset, quote in
      entry(
        configId: configId,
        at: offset,
        date: now.addingTimeInterval(TimeInterval(offset * minutes * 60)),
        quote: quote,
        appearance: appearance
      )
    }

    return Timeline(entries: entries, policy: .atEnd)
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

private func tapURL(for entry: QuoteEntry) -> URL? {
  guard !entry.configId.isEmpty else { return nil }
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
    .padding(family == .systemSmall ? 12 : 16)
    // Stretch to the full container, so the quote centres on the card rather
    // than collapsing to its own height.
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    // Drawn as an overlay stroke rather than a filled shape. A stroke keeps its
    // geometry in accented rendering, so the outline survives on a Tinted or
    // Clear Home Screen where a coloured fill would be flattened away.
    .overlay {
      if entry.showBorder {
        RoundedRectangle(cornerRadius: 22, style: .continuous)
          .strokeBorder((isFullColor ? kWidgetText : Color.primary).opacity(0.35), lineWidth: 1)
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
