import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetInfo } from 'react-native-android-widget';
import type { WidgetConfig } from '../store/useWidgetStore';

// ── Widget appearance ─────────────────────────────────────────────────────────
//
// One fixed look, matching the app's Minimal theme. Themes used to select one of
// eighteen palettes and a full-bleed photo background, but iOS discards widget
// colours entirely in accented rendering, so the setting could never mean the
// same thing on both platforms. The border is the one appearance control left,
// and it is a stroke rather than a fill for the same reason.

const WIDGET_BACKGROUND = '#0D0D0D' as const;
const WIDGET_TEXT = '#E8E0D0' as const;
// A band rather than a hairline, so the outline reads as a frame around the
// card. At this width the old near-black line vanished against the background,
// so the colour is the text tone knocked back over it — the flattened
// equivalent of the 60% white the iOS stroke draws.
const WIDGET_BORDER = '#908C82' as const;
const WIDGET_BORDER_WIDTH = 6;
const WIDGET_FONT = 'serif' as const;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QuoteData {
  id?: string;
  text: string;
  author: string;
}

interface Props {
  quote: QuoteData;
  config: Pick<WidgetConfig, 'showBorder'>;
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
  quoteMaxLinesCap: number;
  lineHeight: number;
}

// Deterministic sizing — we don't rely on Android's autoSize because it doesn't
// engage reliably in the bitmap-render path used by react-native-android-widget.
// Instead we pick the largest fontSize that's mathematically guaranteed to fit
// (chars-per-line × lines-that-fit >= quote length), and truncate the rest.
const SIZE_SPEC: Record<SizeFamily, SizeSpec> = {
  xs: { padding: 4,  quoteMin: 6,  quoteMax: 9,  quoteMaxLinesCap: 20, lineHeight: 1.1 },
  sm: { padding: 6,  quoteMin: 7,  quoteMax: 11, quoteMaxLinesCap: 20, lineHeight: 1.15 },
  md: { padding: 12, quoteMin: 11, quoteMax: 19, quoteMaxLinesCap: 20, lineHeight: 1.3 },
  lg: { padding: 18, quoteMin: 14, quoteMax: 26, quoteMaxLinesCap: 20, lineHeight: 1.35 },
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
): { fontSize: number; maxLines: number } {
  const upper = spec.quoteMax;

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
  // The border is painted over the card rather than laid out, so its width has
  // to come out of the padding by hand. Without this the band sits on top of
  // the quote on the smaller families, whose padding is thinner than the band.
  const border = config.showBorder ? WIDGET_BORDER_WIDTH : 0;
  const padding = spec.padding + border;

  const innerW = Math.max(20, widgetInfo.width  - padding * 2);
  const innerH = Math.max(20, widgetInfo.height - padding * 2);

  const { fontSize: quoteSize, maxLines: quoteMaxLines } =
    fitQuoteSize(quote.text.length, innerW, innerH, spec);

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
        ...(config.showBorder ? { borderWidth: WIDGET_BORDER_WIDTH, borderColor: WIDGET_BORDER } : {}),
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: tapUri }}
    >
      {quoteText}
    </FlexWidget>
  );
}
