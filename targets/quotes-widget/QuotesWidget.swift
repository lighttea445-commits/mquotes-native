import WidgetKit
import SwiftUI
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
  let showBorder: Bool
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

// MARK: - Shared-container reads
//
// Every widget setting is owned by the app and travels through the App Group
// alongside the quote queue. Apple's "Edit Widget" panel is deliberately empty:
// iOS gives the app no widget ids, so a panel-owned setting could never be
// mirrored back into the app, and the two menus disagreed.
//
// Themes are not offered at all. The system discards widget colours entirely in
// accented rendering (a Tinted or Clear Home Screen), so a theme would silently
// do nothing for those users. The border is a stroke rather than a fill, so it
// survives that mode as a tinted outline.

/// Resolved appearance, read from the App Group keys the bridge writes.
private struct Appearance {
  let textSize: String
  let showAuthor: Bool
  let showBorder: Bool
}

/// Free users get the default look. The app gates its own controls too, but a
/// queue written while Pro was active outlives the entitlement, so the render
/// path enforces the gate as well.
private func resolveAppearance() -> Appearance {
  guard let defaults = UserDefaults(suiteName: kAppGroupId) else {
    return Appearance(textSize: "large", showAuthor: false, showBorder: false)
  }

  guard defaults.bool(forKey: "mq_is_pro") else {
    return Appearance(textSize: "large", showAuthor: false, showBorder: false)
  }

  return Appearance(
    textSize: defaults.string(forKey: "mq_text_size") ?? "large",
    showAuthor: defaults.bool(forKey: "mq_show_author"),
    showBorder: defaults.bool(forKey: "mq_show_border")
  )
}

/// Minutes between timeline entries, as chosen in the app. WidgetKit ignores
/// anything under 15; the app only offers 60 / 720 / 1440. Mirrors
/// REFRESH_FREQUENCY_MINUTES in store/useWidgetStore.ts.
private func resolveRotateMinutes() -> Int {
  guard let defaults = UserDefaults(suiteName: kAppGroupId) else { return 60 }
  let stored = defaults.integer(forKey: "mq_rotate_minutes")
  return stored >= 15 ? stored : 60
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

// MARK: - Timeline provider

struct QuoteProvider: TimelineProvider {

  func placeholder(in context: Context) -> QuoteEntry {
    QuoteEntry(
      date: Date(),
      index: 0,
      quoteText: "Be yourself; everyone else is already taken.",
      quoteAuthor: "Oscar Wilde",
      showAuthor: true,
      showBorder: false,
      textSize: "large"
    )
  }

  func getSnapshot(in context: Context, completion: @escaping (QuoteEntry) -> Void) {
    if context.isPreview {
      completion(placeholder(in: context))
      return
    }
    let quotes = loadQuotes()
    completion(entry(at: 0, date: Date(), quote: quotes.first, appearance: resolveAppearance()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<QuoteEntry>) -> Void) {
    completion(buildTimeline())
  }

  private func buildTimeline() -> Timeline<QuoteEntry> {
    let appearance = resolveAppearance()
    let quotes = loadQuotes()
    let minutes = resolveRotateMinutes()
    let now = Date()

    kLog.info("timeline requested: \(quotes.count, privacy: .public) quote(s), rotate every \(minutes, privacy: .public) min, text size \(appearance.textSize, privacy: .public)")

    guard !quotes.isEmpty else {
      // Nothing in the App Group yet — show the fallback and retry soon rather
      // than rendering an empty card.
      let retry = now.addingTimeInterval(15 * 60)
      return Timeline(
        entries: [entry(at: 0, date: now, quote: nil, appearance: appearance)],
        policy: .after(retry)
      )
    }

    let entries = quotes.enumerated().map { offset, quote in
      entry(
        at: offset,
        date: now.addingTimeInterval(TimeInterval(offset * minutes * 60)),
        quote: quote,
        appearance: appearance
      )
    }

    return Timeline(entries: entries, policy: .atEnd)
  }

  private func entry(
    at index: Int,
    date: Date,
    quote: StoredQuote?,
    appearance: Appearance
  ) -> QuoteEntry {
    QuoteEntry(
      date: date,
      index: index,
      quoteText: quote?.text ?? kFallbackText,
      quoteAuthor: quote?.author ?? "",
      showAuthor: appearance.showAuthor,
      showBorder: appearance.showBorder,
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

  private var quoteFontSize: CGFloat {
    let base: CGFloat
    switch entry.textSize {
    case "small":  base = family == .systemSmall ? 11 : 13
    case "large":  base = family == .systemSmall ? 14 : 20
    default:       base = family == .systemSmall ? 12 : 16
    }
    return base
  }

  /// How far the quote may shrink before it would rather clip.
  ///
  /// The whole quote must always be readable, so there is no line limit and the
  /// text scales down to fit instead. `quoteFontSize` is therefore a starting
  /// point, not a fixed size — a long quote at "Large" will render smaller than
  /// a short one. A floor this low is only reached by unusually long quotes on
  /// the small family; it exists so nothing is ever truncated.
  private var minQuoteScale: CGFloat {
    family == .systemSmall ? 0.30 : 0.40
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
        .foregroundColor(isFullColor ? Color.primary : nil)
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

      if entry.showAuthor && !entry.quoteAuthor.isEmpty {
        Spacer(minLength: 4)
        Text("- \(entry.quoteAuthor)")
          .font(.system(size: 11, weight: .regular))
          .foregroundColor(isFullColor ? Color.secondary : nil)
          // Color.secondary already carries the de-emphasis in full colour;
          // when tinted the colour is dropped, so fall back to alpha to keep
          // the author from competing with the quote. Matches the accessory
          // rectangular view, which already does this.
          .opacity(isFullColor ? 1 : 0.7)
          .lineLimit(1)
          // The quote has layoutPriority(1) and is now unbounded, so without
          // this the author — a Pro feature — gets compressed to nothing on a
          // long quote. One line is cheap; the quote scales into what's left.
          .fixedSize(horizontal: false, vertical: true)
          .frame(maxWidth: .infinity, alignment: .trailing)
      }

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
          .strokeBorder(Color.primary.opacity(0.35), lineWidth: 1)
      }
    }
    .widgetURL(tapURL(for: entry))
    // Clear, so the system's own widget material shows through — iOS 26 draws a
    // Liquid Glass container behind every home screen widget, and an opaque fill
    // here simply paints over it. Matches the accessory views, which have always
    // deferred to the system background.
    .containerBackground(.clear, for: .widget)
  }
}

// MARK: - Lock screen (accessory) views
//
// Accessory families render on the system's own translucent background and are
// recoloured by it, so nothing here sets a fill, gradient or explicit colour —
// same principle the home screen body now follows. De-emphasis is expressed as
// alpha, which survives recolouring; a faded colour would not.

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

  var body: some View {
    VStack(alignment: .leading, spacing: 2) {
      Text(entry.quoteText)
        .font(.system(size: quoteFontSize))
        // Same rule as the home screen: show the whole quote, shrink instead of
        // truncating. The floor is higher here because the lock screen rectangle
        // is roughly 160x72pt — below this the text stops being readable at all,
        // and a very long quote will still be small.
        .lineLimit(nil)
        .minimumScaleFactor(0.5)
        .layoutPriority(1)
        // Parity with the home screen body: put the quote in the accent group
        // so it is drawn at full strength wherever the system tints rather than
        // just desaturates. This was the only .widgetAccentable() in the
        // section until the circular view was removed.
        .widgetAccentable()
      if entry.showAuthor && !entry.quoteAuthor.isEmpty {
        Text("— \(entry.quoteAuthor)")
          .font(.system(size: authorFontSize))
          .lineLimit(1)
          .opacity(0.7)
          // As on the home screen: the quote claims space first, so pin the
          // author's height or a long quote squeezes it out.
          .fixedSize(horizontal: false, vertical: true)
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
    // Static, not AppIntent-configured: the app owns every setting and writes
    // them through the App Group, so there is nothing left for Apple's Edit
    // Widget panel to offer.
    StaticConfiguration(kind: kind, provider: QuoteProvider()) { entry in
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

// MARK: - Helpers

// MARK: - Preview

#Preview("Small – No author", as: .systemSmall) {
  QuotesWidget()
} timeline: {
  QuoteEntry(date: .now, index: 0, quoteText: "No one can make you feel inferior without your consent.", quoteAuthor: "Eleanor Roosevelt", showAuthor: false, showBorder: false, textSize: "medium")
}

#Preview("Medium – With author", as: .systemMedium) {
  QuotesWidget()
} timeline: {
  QuoteEntry(date: .now, index: 0, quoteText: "Live in the moment but prepare for your future.", quoteAuthor: "Unknown", showAuthor: true, showBorder: true, textSize: "medium")
}

#Preview("Large – Large text", as: .systemLarge) {
  QuotesWidget()
} timeline: {
  QuoteEntry(date: .now, index: 0, quoteText: "The secret of getting ahead is getting started.", quoteAuthor: "Mark Twain", showAuthor: true, showBorder: true, textSize: "large")
}

#Preview("Lock Screen – Rectangular", as: .accessoryRectangular) {
  QuotesWidget()
} timeline: {
  QuoteEntry(date: .now, index: 0, quoteText: "The secret of getting ahead is getting started.", quoteAuthor: "Mark Twain", showAuthor: true, showBorder: true, textSize: "medium")
  QuoteEntry(date: .now, index: 1, quoteText: "Live in the moment but prepare for your future.", quoteAuthor: "Unknown", showAuthor: true, showBorder: true, textSize: "medium")
}

#Preview("Lock Screen – Inline", as: .accessoryInline) {
  QuotesWidget()
} timeline: {
  QuoteEntry(date: .now, index: 0, quoteText: "The secret of getting ahead is getting started.", quoteAuthor: "Mark Twain", showAuthor: true, showBorder: true, textSize: "medium")
  QuoteEntry(date: .now, index: 1, quoteText: "Live in the moment but prepare for your future.", quoteAuthor: "Unknown", showAuthor: true, showBorder: true, textSize: "medium")
}
