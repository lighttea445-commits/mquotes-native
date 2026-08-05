import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetInfo } from 'react-native-android-widget';
import type { WidgetInstanceConfig } from '../store/useWidgetStore';

// ── Widget appearance ─────────────────────────────────────────────────────────
//
// One fixed look, matching the app's Minimal theme. Themes used to select one of
// eighteen palettes and a full-bleed photo background, but iOS discards widget
// colours entirely in accented rendering, so the setting could never mean the
// same thing on both platforms. The border is the one appearance control left,
// and it is a stroke rather than a fill for the same reason.

const WIDGET_BACKGROUND = '#0D0D0D' as const;
const WIDGET_TEXT = '#E8E0D0' as const;
const WIDGET_BORDER = '#2A2520' as const;
const WIDGET_FONT = 'serif' as const;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QuoteData {
  id?: string;
  text: string;
  author: string;
}

interface Props {
  quote: QuoteData;
  config: Pick<WidgetInstanceConfig, 'showAuthor' | 'showBorder' | 'textSize'>;
  widgetInfo: WidgetInfo;
}

// ── Size families ─────────────────────────────────────────────────────────────
//
// Widget cells are ~70dp on most launchers. We bucket widgets by the SMALLER
// dimension so that narrow-but-tall and short-but-wide widgets both fall into
// the sensible family. Each family carries its own font range, padding,
// max-lines, and gaps — so the layout never runs off-screen on small sizes
// or looks dwarfed on large ones.

type SizeFamily = 'xs' | 'sm' | 'md' | 'lg';

interface SizeSpec {
  padding: number;
  quoteMin: number;
  quoteMax: number;
  authorRatio: number;
  quoteMaxLinesCap: number;
  lineHeight: number;
  dashGap: number;
  authorGap: number;
}

// Deterministic sizing — we don't rely on Android's autoSize because it doesn't
// engage reliably in the bitmap-render path used by react-native-android-widget.
// Instead we pick the largest fontSize that's mathematically guaranteed to fit
// (chars-per-line × lines-that-fit >= quote length), and truncate the rest.
const SIZE_SPEC: Record<SizeFamily, SizeSpec> = {
  xs: { padding: 4,  quoteMin: 6,  quoteMax: 9,  authorRatio: 0.95, quoteMaxLinesCap: 20, lineHeight: 1.1,  dashGap: 0, authorGap: 0 },
  sm: { padding: 6,  quoteMin: 7,  quoteMax: 11, authorRatio: 0.9,  quoteMaxLinesCap: 20, lineHeight: 1.15, dashGap: 1, authorGap: 1 },
  md: { padding: 12, quoteMin: 11, quoteMax: 19, authorRatio: 0.85, quoteMaxLinesCap: 20, lineHeight: 1.3,  dashGap: 4, authorGap: 4 },
  lg: { padding: 18, quoteMin: 14, quoteMax: 26, authorRatio: 0.85, quoteMaxLinesCap: 20, lineHeight: 1.35, dashGap: 7, authorGap: 7 },
};

// Average character width for a bold serif at fontSize dp. Empirical — slightly
// conservative (overestimates char width) so the calc errs toward fitting.
const CHAR_WIDTH_RATIO = 0.58;

function getSizeFamily(w: number, h: number): SizeFamily {
  // Bucket by sqrt(area), not by min(w,h). A 4x1 widget (~280x70) has min=70
  // which would force it into the xs tier even though it has plenty of total
  // real estate; sqrt(area) gives ≈140 and lands it in sm/md where fonts and
  // author both fit comfortably.
  const eff = Math.sqrt(w * h);
  if (eff < 80)  return 'xs';
  if (eff < 130) return 'sm';
  if (eff < 200) return 'md';
  return 'lg';
}

// Positive offset raises the starting fontSize above the family's quoteMax so
// the "Large" preference genuinely tries bigger glyphs (accepting more truncation).
// Negative offset lowers the starting point so "Small" packs in more text.
const TEXT_SIZE_OFFSET: Record<WidgetInstanceConfig['textSize'], number> = {
  small: -2,
  medium: 0,
  large: 3,
};

/**
 * Pick the largest fontSize that's guaranteed to fit `length` characters in the
 * available width × height, given the family's lineHeight ratio. Falls back to
 * quoteMin when nothing in the range fits — the TextView will then ellipsis-
 * truncate with `truncate=END`.
 */
function fitQuoteSize(
  length: number,
  innerW: number,
  innerH: number,
  spec: SizeSpec,
  textSize: WidgetInstanceConfig['textSize'],
): { fontSize: number; maxLines: number } {
  const offset = TEXT_SIZE_OFFSET[textSize];
  // Do NOT cap upper at spec.quoteMax — a positive offset intentionally
  // raises the ceiling so "Large" starts the search above the family max.
  // The loop will fall back if the bigger size doesn't fit.
  const upper = Math.max(spec.quoteMin, spec.quoteMax + offset);

  for (let fs = upper; fs >= spec.quoteMin; fs--) {
    const lh = Math.ceil(fs * spec.lineHeight);
    const charsPerLine = Math.max(1, Math.floor(innerW / (fs * CHAR_WIDTH_RATIO)));
    const linesAvail = Math.max(1, Math.floor(innerH / lh));
    const capacity = charsPerLine * linesAvail;
    if (capacity >= length) {
      return { fontSize: fs, maxLines: Math.min(spec.quoteMaxLinesCap, linesAvail) };
    }
  }
  // Nothing fits — use min font and let END truncation clip cleanly.
  const fs = spec.quoteMin;
  const lh = Math.ceil(fs * spec.lineHeight);
  const linesAvail = Math.max(1, Math.floor(innerH / lh));
  return { fontSize: fs, maxLines: Math.min(spec.quoteMaxLinesCap, linesAvail) };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function QuoteWidget({ quote, config, widgetInfo }: Props) {
  const family = getSizeFamily(widgetInfo.width, widgetInfo.height);
  const spec   = SIZE_SPEC[family];
  const padding = spec.padding;

  // Respect the user's toggle on every size. On 1x1 the deterministic font
  // sizer will shrink the quote to keep room for the dash + author, which is
  // what the toggle should mean.
  const showAuthor = !!config.showAuthor && !!quote.author;

  const innerW = Math.max(20, widgetInfo.width  - padding * 2);
  const innerH = Math.max(20, widgetInfo.height - padding * 2);

  // Reserve space for the author block first; whatever remains is the quote box.
  // We pick the author/dash size from the family floor so it never dominates.
  const authorSize = showAuthor ? Math.max(spec.quoteMin, 9) : 0;
  const dashSize   = authorSize;
  const authorBlockH = showAuthor
    ? Math.ceil(dashSize * spec.lineHeight) + spec.dashGap +
      Math.ceil(authorSize * spec.lineHeight) + spec.authorGap
    : 0;

  const quoteH = Math.max(Math.ceil(spec.quoteMin * spec.lineHeight), innerH - authorBlockH);

  const { fontSize: quoteSize, maxLines: quoteMaxLines } =
    fitQuoteSize(quote.text.length, innerW, quoteH, spec, config.textSize);

  const tapUri = `quotable://widget-open?widgetId=${widgetInfo.widgetId}`;

  const quoteText = (
    <TextWidget
      text={quote.text}
      style={{
        width: 'match_parent',
        color: WIDGET_TEXT,
        fontSize: quoteSize,
        fontFamily: WIDGET_FONT,
        fontWeight: 'bold',
        textAlign: 'center',
      }}
      maxLines={quoteMaxLines}
      truncate="END"
      allowFontScaling={false}
      clickAction="OPEN_URI"
      clickActionData={{ uri: tapUri }}
    />
  );

  const dashText = showAuthor ? (
    <TextWidget
      text="-"
      style={{
        width: 'match_parent',
        color: WIDGET_TEXT,
        fontSize: dashSize,
        fontFamily: WIDGET_FONT,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: spec.dashGap,
      }}
      maxLines={1}
      allowFontScaling={false}
      clickAction="OPEN_URI"
      clickActionData={{ uri: tapUri }}
    />
  ) : null;

  const authorText = showAuthor ? (
    <TextWidget
      text={quote.author}
      style={{
        width: 'match_parent',
        color: WIDGET_TEXT,
        fontSize: authorSize,
        fontFamily: WIDGET_FONT,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: spec.authorGap,
      }}
      maxLines={1}
      truncate="END"
      allowFontScaling={false}
      clickAction="OPEN_URI"
      clickActionData={{ uri: tapUri }}
    />
  ) : null;

  return (
    <FlexWidget
      style={{
        width: widgetInfo.width,
        height: widgetInfo.height,
        justifyContent: 'center',
        alignItems: 'center',
        padding,
        borderRadius: 16,
        backgroundColor: WIDGET_BACKGROUND,
        overflow: 'hidden',
        ...(config.showBorder ? { borderWidth: 1, borderColor: WIDGET_BORDER } : {}),
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: tapUri }}
    >
      {quoteText}
      {dashText}
      {authorText}
    </FlexWidget>
  );
}
