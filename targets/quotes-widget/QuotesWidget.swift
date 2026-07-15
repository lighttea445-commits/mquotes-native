import WidgetKit
import SwiftUI

// MARK: - Constants
// Must match WidgetBridgeModule.swift
private let kAppGroupId = "group.com.mquotes.shared"

// MARK: - Data model

struct QuoteEntry: TimelineEntry {
  let date: Date
  let quoteText: String
  let quoteAuthor: String
  let showAuthor: Bool
  let widgetType: String   // "basic" | "custom" | "streak"
  let streakCount: Int
  let themeName: String
  let textSize: String     // "small" | "medium" | "large"
}

// MARK: - Timeline provider

struct QuoteProvider: TimelineProvider {

  func placeholder(in context: Context) -> QuoteEntry {
    QuoteEntry(
      date: Date(),
      quoteText: "Be yourself; everyone else is already taken.",
      quoteAuthor: "Oscar Wilde",
      showAuthor: true,
      widgetType: "basic",
      streakCount: 7,
      themeName: "minimal",
      textSize: "medium"
    )
  }

  func getSnapshot(in context: Context, completion: @escaping (QuoteEntry) -> Void) {
    completion(context.isPreview ? placeholder(in: context) : loadEntry())
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<QuoteEntry>) -> Void) {
    let entry = loadEntry()
    // Refresh every 30 min — the RN background task will write fresher data
    // before this fires, so the widget shows the task-updated quote.
    let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
    completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
  }

  private func loadEntry() -> QuoteEntry {
    let d = UserDefaults(suiteName: kAppGroupId)
    return QuoteEntry(
      date: Date(),
      quoteText:   d?.string(forKey: "mq_quote_text")   ?? "The journey of a thousand miles begins with a single step.",
      quoteAuthor: d?.string(forKey: "mq_quote_author") ?? "",
      showAuthor:  d?.bool(forKey: "mq_show_author")    ?? false,
      widgetType:  d?.string(forKey: "mq_widget_type")  ?? "basic",
      streakCount: d?.integer(forKey: "mq_streak_count") ?? 0,
      themeName:   d?.string(forKey: "mq_theme_name")   ?? "minimal",
      textSize:    d?.string(forKey: "mq_text_size")    ?? "medium"
    )
  }
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

  // Home screen widget (systemSmall/systemMedium/systemLarge) — unchanged.
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
    .containerBackground(.clear, for: .widget)
  }
}

private struct AccessoryInlineView: View {
  let entry: QuoteEntry

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
    StaticConfiguration(kind: kind, provider: QuoteProvider()) { entry in
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
  QuoteEntry(date: .now, quoteText: "No one can make you feel inferior without your consent.", quoteAuthor: "Eleanor Roosevelt", showAuthor: false, widgetType: "basic", streakCount: 0, themeName: "minimal", textSize: "medium")
}

#Preview("Medium – Streak", as: .systemMedium) {
  QuotesWidget()
} timeline: {
  QuoteEntry(date: .now, quoteText: "Live in the moment but prepare for your future.", quoteAuthor: "Unknown", showAuthor: true, widgetType: "streak", streakCount: 12, themeName: "minimal", textSize: "medium")
}

#Preview("Large – Custom", as: .systemLarge) {
  QuotesWidget()
} timeline: {
  QuoteEntry(date: .now, quoteText: "The secret of getting ahead is getting started.", quoteAuthor: "Mark Twain", showAuthor: true, widgetType: "custom", streakCount: 0, themeName: "ember", textSize: "large")
}

#Preview("Lock Screen – Circular", as: .accessoryCircular) {
  QuotesWidget()
} timeline: {
  QuoteEntry(date: .now, quoteText: "No one can make you feel inferior without your consent.", quoteAuthor: "Eleanor Roosevelt", showAuthor: false, widgetType: "basic", streakCount: 0, themeName: "minimal", textSize: "medium")
  QuoteEntry(date: .now, quoteText: "Live in the moment but prepare for your future.", quoteAuthor: "Unknown", showAuthor: true, widgetType: "streak", streakCount: 12, themeName: "minimal", textSize: "medium")
}

#Preview("Lock Screen – Rectangular", as: .accessoryRectangular) {
  QuotesWidget()
} timeline: {
  QuoteEntry(date: .now, quoteText: "The secret of getting ahead is getting started.", quoteAuthor: "Mark Twain", showAuthor: true, widgetType: "basic", streakCount: 0, themeName: "minimal", textSize: "medium")
  QuoteEntry(date: .now, quoteText: "Live in the moment but prepare for your future.", quoteAuthor: "Unknown", showAuthor: true, widgetType: "streak", streakCount: 12, themeName: "minimal", textSize: "medium")
}

#Preview("Lock Screen – Inline", as: .accessoryInline) {
  QuotesWidget()
} timeline: {
  QuoteEntry(date: .now, quoteText: "The secret of getting ahead is getting started.", quoteAuthor: "Mark Twain", showAuthor: true, widgetType: "basic", streakCount: 0, themeName: "minimal", textSize: "medium")
  QuoteEntry(date: .now, quoteText: "Live in the moment but prepare for your future.", quoteAuthor: "Unknown", showAuthor: true, widgetType: "streak", streakCount: 12, themeName: "minimal", textSize: "medium")
}
