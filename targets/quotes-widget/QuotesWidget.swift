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

// MARK: - Data model

struct QuoteEntry: TimelineEntry {
  let date: Date
  /// Position in the stored queue — travels in the widget tap URL so the app
  /// can resolve exactly which quote was on screen.
  let index: Int
  let quoteText: String
  let quoteAuthor: String
  let showAuthor: Bool
  let widgetType: String   // "basic" | "custom" | "streak"
  let streakCount: Int
  let themeName: String
  let textSize: String     // "small" | "medium" | "large"
}

/// Shape of each element in the `mq_quotes` JSON array written by the app.
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

// MARK: - Widget configuration intent
//
// Appearance is configured in Apple's own "Edit Widget" panel (long-press the
// widget on the home screen), not in the app — iOS gives the app no widget ids,
// so it cannot drive per-instance appearance itself. The app still owns the
// quote *data* (source and cadence) via the App Group.

enum WidgetThemeOption: String, AppEnum {
  case minimal, galaxy, orbit, tempest, seashore, apex, ember, daybreak
  case crescent, shore, dusk, blush, woodland, botanical, lunar, alpine, obsidian
  case roseSky = "rose-sky"

  static var typeDisplayRepresentation: TypeDisplayRepresentation { "Theme" }

  static var caseDisplayRepresentations: [WidgetThemeOption: DisplayRepresentation] {[
    .minimal:   "Minimal",
    .galaxy:    "Galaxy",
    .orbit:     "Orbit",
    .tempest:   "Tempest",
    .seashore:  "Seashore",
    .apex:      "Apex",
    .ember:     "Ember",
    .daybreak:  "Daybreak",
    .crescent:  "Crescent",
    .shore:     "Shore",
    .roseSky:   "Rose Sky",
    .dusk:      "Dusk",
    .blush:     "Blush",
    .woodland:  "Woodland",
    .botanical: "Botanical",
    .lunar:     "Lunar",
    .alpine:    "Alpine",
    .obsidian:  "Obsidian",
  ]}
}

enum WidgetTextSizeOption: String, AppEnum {
  case small, medium, large

  static var typeDisplayRepresentation: TypeDisplayRepresentation { "Text Size" }

  static var caseDisplayRepresentations: [WidgetTextSizeOption: DisplayRepresentation] {[
    .small:  "Small",
    .medium: "Medium",
    .large:  "Large",
  ]}
}

struct QuoteWidgetIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource { "Quote Widget" }
  static var description: IntentDescription {
    IntentDescription("Choose how the quote on your home screen looks.")
  }

  @Parameter(title: "Theme", default: .minimal)
  var theme: WidgetThemeOption

  @Parameter(title: "Text Size", default: .large)
  var textSize: WidgetTextSizeOption

  @Parameter(title: "Show Author", default: false)
  var showAuthor: Bool

  init() {}
}

// MARK: - Shared-container reads

/// Resolved appearance. Theme, text size and author are Pro features in the
/// app, and Apple's Edit Widget panel has no way to know about entitlements —
/// so the gate has to live here, in the render path. Free users can pick
/// anything; the widget renders defaults until `mq_is_pro` is true.
private struct Appearance {
  let themeName: String
  let textSize: String
  let showAuthor: Bool

  static let free = Appearance(themeName: "minimal", textSize: "large", showAuthor: false)
}

private func resolveAppearance(_ configuration: QuoteWidgetIntent) -> Appearance {
  let defaults = UserDefaults(suiteName: kAppGroupId)
  guard defaults?.bool(forKey: "mq_is_pro") == true else { return .free }
  return Appearance(
    themeName: configuration.theme.rawValue,
    textSize: configuration.textSize.rawValue,
    showAuthor: configuration.showAuthor
  )
}

/// The quote queue the app pre-writes, so the widget can rotate on its own —
/// iOS cannot wake JS in the background to fetch a fresh quote.
private func loadQuotes() -> [StoredQuote] {
  guard let defaults = UserDefaults(suiteName: kAppGroupId) else { return [] }

  if
    let raw = defaults.string(forKey: "mq_quotes"),
    let data = raw.data(using: .utf8),
    let decoded = try? JSONDecoder().decode([StoredQuote].self, from: data),
    !decoded.isEmpty
  {
    return Array(decoded.prefix(kMaxEntries))
  }

  // Fallback: the single-quote keys written by the legacy updateWidget path.
  // Keeps a version-mismatched build showing a real quote instead of going blank.
  if let text = defaults.string(forKey: "mq_quote_text"), !text.isEmpty {
    return [StoredQuote(text: text, author: defaults.string(forKey: "mq_quote_author") ?? "", id: nil)]
  }

  return []
}

/// Minutes between rotations, written by the app from its refresh-frequency
/// setting. Floored at 15 — WidgetKit will not honour anything tighter.
private func loadRotateMinutes() -> Int {
  let stored = UserDefaults(suiteName: kAppGroupId)?.integer(forKey: "mq_rotate_minutes") ?? 0
  return stored > 0 ? max(15, stored) : 60
}

/// Non-appearance bits the app owns: which widget variant to draw and the
/// streak count it shows.
private struct Badge {
  let widgetType: String
  let streakCount: Int
}

private func loadBadge() -> Badge {
  let defaults = UserDefaults(suiteName: kAppGroupId)
  return Badge(
    widgetType: defaults?.string(forKey: "mq_widget_type") ?? "basic",
    streakCount: defaults?.integer(forKey: "mq_streak_count") ?? 0
  )
}

// MARK: - Timeline provider

struct QuoteProvider: AppIntentTimelineProvider {

  func placeholder(in context: Context) -> QuoteEntry {
    QuoteEntry(
      date: Date(),
      index: 0,
      quoteText: "Be yourself; everyone else is already taken.",
      quoteAuthor: "Oscar Wilde",
      showAuthor: true,
      widgetType: "basic",
      streakCount: 7,
      themeName: "minimal",
      textSize: "large"
    )
  }

  func snapshot(for configuration: QuoteWidgetIntent, in context: Context) async -> QuoteEntry {
    if context.isPreview { return placeholder(in: context) }
    let appearance = resolveAppearance(configuration)
    let quotes = loadQuotes()
    return entry(at: 0, date: Date(), quote: quotes.first, appearance: appearance, badge: loadBadge())
  }

  func timeline(for configuration: QuoteWidgetIntent, in context: Context) async -> Timeline<QuoteEntry> {
    let appearance = resolveAppearance(configuration)
    let quotes = loadQuotes()
    let minutes = loadRotateMinutes()
    // Read once, not once per entry — a full queue builds ~48 entries.
    let badge = loadBadge()
    let now = Date()

    kLog.info("timeline requested: \(quotes.count, privacy: .public) quote(s), rotate every \(minutes, privacy: .public) min, theme \(appearance.themeName, privacy: .public)")

    guard !quotes.isEmpty else {
      // Nothing in the App Group yet — show the fallback and retry soon rather
      // than rendering an empty card.
      let retry = now.addingTimeInterval(15 * 60)
      return Timeline(
        entries: [entry(at: 0, date: now, quote: nil, appearance: appearance, badge: badge)],
        policy: .after(retry)
      )
    }

    let entries = quotes.enumerated().map { offset, quote in
      entry(
        at: offset,
        date: now.addingTimeInterval(TimeInterval(offset * minutes * 60)),
        quote: quote,
        appearance: appearance,
        badge: badge
      )
    }

    return Timeline(entries: entries, policy: .atEnd)
  }

  private func entry(
    at index: Int,
    date: Date,
    quote: StoredQuote?,
    appearance: Appearance,
    badge: Badge
  ) -> QuoteEntry {
    QuoteEntry(
      date: date,
      index: index,
      quoteText: quote?.text ?? kFallbackText,
      quoteAuthor: quote?.author ?? "",
      showAuthor: appearance.showAuthor,
      widgetType: badge.widgetType,
      streakCount: badge.streakCount,
      themeName: appearance.themeName,
      textSize: appearance.textSize
    )
  }
}

// MARK: - Deep link
//
// A tap opens quotable://widget-open?src=ios&i=<index>. The index is resolved
// against the same queue mirrored into AsyncStorage, so the app shows exactly
// the quote that was on the widget face. See app/widget-open.tsx.

private func tapURL(for entry: QuoteEntry) -> URL? {
  URL(string: "quotable://widget-open?src=ios&i=\(entry.index)")
}

// MARK: - Theme colours (mirrors constants/themes.ts subset)

private struct ThemeColors {
  let background: Color
  let text: Color
  let textMuted: Color
  let gold: Color
}

private func resolveTheme(_ name: String) -> ThemeColors {
  switch name {
  case "minimal":     return .init(background: Color(hex:"#0D0D0D"), text: Color(hex:"#E8E0D0"), textMuted: Color(hex:"#6B6560"), gold: Color(hex:"#B8975A"))
  case "galaxy":      return .init(background: Color(hex:"#030408"), text: Color(hex:"#d8d0f8"), textMuted: Color(hex:"#6050b8"), gold: Color(hex:"#c09050"))
  case "orbit":       return .init(background: Color(hex:"#010306"), text: Color(hex:"#b8d8f8"), textMuted: Color(hex:"#2068c8"), gold: Color(hex:"#40b8ff"))
  case "tempest":     return .init(background: Color(hex:"#05080f"), text: Color(hex:"#d0d8f0"), textMuted: Color(hex:"#3858a8"), gold: Color(hex:"#6898f8"))
  case "seashore":    return .init(background: Color(hex:"#0e0804"), text: Color(hex:"#fce8c8"), textMuted: Color(hex:"#b89060"), gold: Color(hex:"#c89038"))
  case "apex":        return .init(background: Color(hex:"#060606"), text: Color(hex:"#f0f0f0"), textMuted: Color(hex:"#787878"), gold: Color(hex:"#d8d8d8"))
  case "ember":       return .init(background: Color(hex:"#120400"), text: Color(hex:"#ffe8d0"), textMuted: Color(hex:"#ff9060"), gold: Color(hex:"#ff9040"))
  case "daybreak":    return .init(background: Color(hex:"#160804"), text: Color(hex:"#fde4cc"), textMuted: Color(hex:"#c87848"), gold: Color(hex:"#e89050"))
  case "crescent":    return .init(background: Color(hex:"#060c10"), text: Color(hex:"#d0e8f0"), textMuted: Color(hex:"#408898"), gold: Color(hex:"#70c8d8"))
  case "shore":       return .init(background: Color(hex:"#0c1520"), text: Color(hex:"#e8f4f8"), textMuted: Color(hex:"#80a8c0"), gold: Color(hex:"#B8975A"))
  case "rose-sky":    return .init(background: Color(hex:"#140810"), text: Color(hex:"#fce4ec"), textMuted: Color(hex:"#d080a8"), gold: Color(hex:"#e8a0c0"))
  case "dusk":        return .init(background: Color(hex:"#0e0818"), text: Color(hex:"#f0d8ff"), textMuted: Color(hex:"#a870d0"), gold: Color(hex:"#c090e0"))
  case "blush":       return .init(background: Color(hex:"#180c16"), text: Color(hex:"#fce0ee"), textMuted: Color(hex:"#c878a8"), gold: Color(hex:"#f0a8d0"))
  case "woodland":    return .init(background: Color(hex:"#060d08"), text: Color(hex:"#cce8c0"), textMuted: Color(hex:"#427838"), gold: Color(hex:"#68c058"))
  case "botanical":   return .init(background: Color(hex:"#050c06"), text: Color(hex:"#d0f0d4"), textMuted: Color(hex:"#389048"), gold: Color(hex:"#50e068"))
  case "lunar":       return .init(background: Color(hex:"#080910"), text: Color(hex:"#e4e8ec"), textMuted: Color(hex:"#606878"), gold: Color(hex:"#b0c0d4"))
  case "alpine":      return .init(background: Color(hex:"#07101a"), text: Color(hex:"#d8e8f4"), textMuted: Color(hex:"#5080b0"), gold: Color(hex:"#78b0e0"))
  case "obsidian":    return .init(background: Color(hex:"#070707"), text: Color(hex:"#e0e0e0"), textMuted: Color(hex:"#606060"), gold: Color(hex:"#b0b0b0"))
  default:            return .init(background: Color(hex:"#0D0D0D"), text: Color(hex:"#E8E0D0"), textMuted: Color(hex:"#6B6560"), gold: Color(hex:"#B8975A"))
  }
}

// MARK: - Widget view

struct QuoteWidgetView: View {
  let entry: QuoteEntry
  @Environment(\.widgetFamily) var family

  private var colors: ThemeColors { resolveTheme(entry.themeName) }

  private var quoteFontSize: CGFloat {
    let base: CGFloat
    switch entry.textSize {
    case "small":  base = family == .systemSmall ? 11 : 13
    case "large":  base = family == .systemSmall ? 14 : 20
    default:       base = family == .systemSmall ? 12 : 16
    }
    return base
  }

  /// Maximum lines the quote text may occupy. Chosen to ensure the text +
  /// optional author line fits inside the widget without clipping.
  private var quoteLineLimit: Int {
    switch family {
    case .systemSmall:
      // Small widget: tighter limit so author line never gets pushed out.
      return entry.textSize == "large" ? 3 : 4
    case .systemMedium:
      return 4
    default:
      return 8
    }
  }

  var body: some View {
    switch family {
    case .accessoryCircular:
      AccessoryCircularView(entry: entry)
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
    ZStack(alignment: .bottomLeading) {
      colors.background

      VStack(alignment: .center, spacing: 0) {
        // Quotation mark (basic widget only)
        if entry.widgetType == "basic" && family != .systemSmall {
          Text("\u{201C}")
            .font(.custom("Georgia", size: 26))
            .foregroundColor(colors.text.opacity(0.25))
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.bottom, -8)
        }

        Spacer(minLength: 0)

        Text(entry.quoteText)
          .font(.custom("Georgia", size: quoteFontSize))
          .foregroundColor(colors.text)
          .multilineTextAlignment(.center)
          .lineLimit(quoteLineLimit)
          .minimumScaleFactor(0.75)
          .fixedSize(horizontal: false, vertical: false)

        if entry.showAuthor && !entry.quoteAuthor.isEmpty {
          Spacer(minLength: 4)
          Text("- \(entry.quoteAuthor)")
            .font(.system(size: 11, weight: .regular))
            .foregroundColor(colors.textMuted)
            .lineLimit(1)
            .frame(maxWidth: .infinity, alignment: .trailing)
        }

        Spacer(minLength: 0)
      }
      .padding(family == .systemSmall ? 12 : 16)

      // Streak badge (streak widget only)
      if entry.widgetType == "streak" {
        HStack(spacing: 5) {
          Image(systemName: "flame.fill")
            .font(.system(size: family == .systemSmall ? 13 : 16))
            .foregroundStyle(
              LinearGradient(
                colors: [Color(hex: "#a855f7"), Color(hex: "#ec4899")],
                startPoint: .top, endPoint: .bottom
              )
            )
          Text("\(entry.streakCount)")
            .font(.custom("Georgia", size: family == .systemSmall ? 14 : 18))
            .bold()
            .foregroundColor(colors.text)
        }
        .padding(.horizontal, 14)
        .padding(.bottom, 12)
      }
    }
    .widgetURL(tapURL(for: entry))
    .containerBackground(for: .widget) {
      colors.background
    }
  }
}

// MARK: - Lock screen (accessory) views
//
// Accessory families render on the system's own translucent/monochrome
// background, so no colors.background fills, gradients, or theme colors
// are used here — the system applies its own tint via .widgetAccentable().

private struct AccessoryCircularView: View {
  let entry: QuoteEntry

  private var fontSize: CGFloat {
    switch entry.textSize {
    case "small": return 8
    case "large": return 10
    default:      return 9
    }
  }

  var body: some View {
    ZStack {
      AccessoryWidgetBackground()
      Text(entry.quoteText)
        .font(.system(size: fontSize))
        .lineLimit(4)
        .multilineTextAlignment(.center)
        .minimumScaleFactor(0.6)
        .padding(5)
    }
    .widgetAccentable()
    .widgetURL(tapURL(for: entry))
    .containerBackground(.clear, for: .widget)
  }
}

private struct AccessoryRectangularView: View {
  let entry: QuoteEntry

  private var quoteFontSize: CGFloat {
    switch entry.textSize {
    case "small": return 11
    case "large": return 13
    default:      return 12
    }
  }

  private var authorFontSize: CGFloat { quoteFontSize - 2 }

  private var quoteLineLimit: Int {
    entry.showAuthor && !entry.quoteAuthor.isEmpty ? 2 : 3
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 2) {
      Text(entry.quoteText)
        .font(.system(size: quoteFontSize))
        .lineLimit(quoteLineLimit)
        .minimumScaleFactor(0.85)
      if entry.showAuthor && !entry.quoteAuthor.isEmpty {
        Text("— \(entry.quoteAuthor)")
          .font(.system(size: authorFontSize))
          .lineLimit(1)
          .opacity(0.7)
      }
    }
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
      .accessoryCircular, .accessoryRectangular, .accessoryInline,
    ])
  }
}

// MARK: - Helpers

extension Color {
  init(hex: String) {
    let h = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
    var n: UInt64 = 0
    Scanner(string: h).scanHexInt64(&n)
    let r = Double((n >> 16) & 0xFF) / 255
    let g = Double((n >> 8)  & 0xFF) / 255
    let b = Double(n         & 0xFF) / 255
    self.init(red: r, green: g, blue: b)
  }
}

// MARK: - Preview

#Preview("Small – Basic", as: .systemSmall) {
  QuotesWidget()
} timeline: {
  QuoteEntry(date: .now, index: 0, quoteText: "No one can make you feel inferior without your consent.", quoteAuthor: "Eleanor Roosevelt", showAuthor: false, widgetType: "basic", streakCount: 0, themeName: "minimal", textSize: "medium")
}

#Preview("Medium – Streak", as: .systemMedium) {
  QuotesWidget()
} timeline: {
  QuoteEntry(date: .now, index: 0, quoteText: "Live in the moment but prepare for your future.", quoteAuthor: "Unknown", showAuthor: true, widgetType: "streak", streakCount: 12, themeName: "minimal", textSize: "medium")
}

#Preview("Large – Custom", as: .systemLarge) {
  QuotesWidget()
} timeline: {
  QuoteEntry(date: .now, index: 0, quoteText: "The secret of getting ahead is getting started.", quoteAuthor: "Mark Twain", showAuthor: true, widgetType: "custom", streakCount: 0, themeName: "ember", textSize: "large")
}

#Preview("Lock Screen – Circular", as: .accessoryCircular) {
  QuotesWidget()
} timeline: {
  QuoteEntry(date: .now, index: 0, quoteText: "No one can make you feel inferior without your consent.", quoteAuthor: "Eleanor Roosevelt", showAuthor: false, widgetType: "basic", streakCount: 0, themeName: "minimal", textSize: "medium")
  QuoteEntry(date: .now, index: 1, quoteText: "Live in the moment but prepare for your future.", quoteAuthor: "Unknown", showAuthor: true, widgetType: "streak", streakCount: 12, themeName: "minimal", textSize: "medium")
}

#Preview("Lock Screen – Rectangular", as: .accessoryRectangular) {
  QuotesWidget()
} timeline: {
  QuoteEntry(date: .now, index: 0, quoteText: "The secret of getting ahead is getting started.", quoteAuthor: "Mark Twain", showAuthor: true, widgetType: "basic", streakCount: 0, themeName: "minimal", textSize: "medium")
  QuoteEntry(date: .now, index: 1, quoteText: "Live in the moment but prepare for your future.", quoteAuthor: "Unknown", showAuthor: true, widgetType: "streak", streakCount: 12, themeName: "minimal", textSize: "medium")
}

#Preview("Lock Screen – Inline", as: .accessoryInline) {
  QuotesWidget()
} timeline: {
  QuoteEntry(date: .now, index: 0, quoteText: "The secret of getting ahead is getting started.", quoteAuthor: "Mark Twain", showAuthor: true, widgetType: "basic", streakCount: 0, themeName: "minimal", textSize: "medium")
  QuoteEntry(date: .now, index: 1, quoteText: "Live in the moment but prepare for your future.", quoteAuthor: "Unknown", showAuthor: true, widgetType: "streak", streakCount: 12, themeName: "minimal", textSize: "medium")
}
