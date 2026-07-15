import React from 'react';
import { FlexWidget, TextWidget, ImageWidget, OverlapWidget } from 'react-native-android-widget';
import type { WidgetInfo } from 'react-native-android-widget';
import type { WidgetInstanceConfig } from '../store/useWidgetStore';

// ── Static image map — require() calls must be top-level for Metro ────────────

// Natural pixel dimensions of each source image (used for cover-crop math).
const THEME_IMAGE_NATURAL: Record<string, { w: number; h: number }> = {
  galaxy:     { w: 1536, h: 2752 },
  orbit:      { w: 1536, h: 2752 },
  tempest:    { w: 1536, h: 2752 },
  seashore:   { w: 1536, h: 2752 },
  apex:       { w: 1536, h: 2752 },
  ember:      { w: 1080, h: 1920 },
  daybreak:   { w: 1536, h: 2752 },
  crescent:   { w: 1536, h: 2752 },
  shore:      { w: 1536, h: 2752 },
  'rose-sky': { w: 1080, h: 1920 },
  dusk:       { w: 1080, h: 1920 },
  blush:      { w: 1536, h: 2752 },
  woodland:   { w: 1536, h: 2752 },
  botanical:  { w: 1536, h: 2752 },
  lunar:      { w: 1536, h: 2752 },
  alpine:     { w: 1536, h: 2752 },
  obsidian:   { w: 1536, h: 2752 },
};

const THEME_IMAGES: Record<string, number | null> = {
  minimal:    null,
  galaxy:     require('../assets/themes/galaxy-bg.jpg'),
  orbit:      require('../assets/themes/orbit-bg.jpg'),
  tempest:    require('../assets/themes/tempest-bg.jpg'),
  seashore:   require('../assets/themes/golden-shore-bg.jpg'),
  apex:       require('../assets/themes/lion-bg.jpg'),
  ember:      require('../assets/themes/sunset-bg.jpg'),
  daybreak:   require('../assets/themes/daybreak-bg.jpg'),
  crescent:   require('../assets/themes/crescent-bg.jpg'),
  shore:      require('../assets/themes/shore-bg.jpg'),
  'rose-sky': require('../assets/themes/sakura-bg.jpg'),
  dusk:       require('../assets/themes/lavender-bg.jpg'),
  blush:      require('../assets/themes/cotton-candy-bg.jpg'),
  woodland:   require('../assets/themes/woodland-bg.jpg'),
  botanical:  require('../assets/themes/plant-bg.jpg'),
  lunar:      require('../assets/themes/lunar-bg.jpg'),
  alpine:     require('../assets/themes/alpine-bg.jpg'),
  obsidian:   require('../assets/themes/obsidian-bg.jpg'),
};

// ── Widget-safe theme text/color map ──────────────────────────────────────────

type WidgetThemeStyle = {
  background: `#${string}`;
  text: `#${string}`;
  textMuted: `#${string}`;
  fontFamily: 'serif' | 'sans-serif';
};

const WIDGET_THEMES: Record<string, WidgetThemeStyle> = {
  minimal:    { background: '#0D0D0D', text: '#E8E0D0', textMuted: '#9A9590', fontFamily: 'serif' },
  galaxy:     { background: '#030408', text: '#d8d0f8', textMuted: '#9088c8', fontFamily: 'serif' },
  orbit:      { background: '#010306', text: '#b8d8f8', textMuted: '#6098c8', fontFamily: 'serif' },
  tempest:    { background: '#05080f', text: '#d0d8f0', textMuted: '#7888b8', fontFamily: 'serif' },
  seashore:   { background: '#0e0804', text: '#fce8c8', textMuted: '#c8a070', fontFamily: 'serif' },
  apex:       { background: '#060606', text: '#f0f0f0', textMuted: '#a0a0a0', fontFamily: 'serif' },
  ember:      { background: '#120400', text: '#ffe8d0', textMuted: '#c07050', fontFamily: 'serif' },
  daybreak:   { background: '#160804', text: '#fde4cc', textMuted: '#c87848', fontFamily: 'serif' },
  crescent:   { background: '#060c10', text: '#d0e8f0', textMuted: '#60a8b8', fontFamily: 'serif' },
  shore:      { background: '#0c1520', text: '#e8f4f8', textMuted: '#80a8c0', fontFamily: 'serif' },
  'rose-sky': { background: '#140810', text: '#fce4ec', textMuted: '#d080a8', fontFamily: 'serif' },
  dusk:       { background: '#0e0818', text: '#f0d8ff', textMuted: '#a870d0', fontFamily: 'serif' },
  blush:      { background: '#180c16', text: '#fce0ee', textMuted: '#c878a8', fontFamily: 'serif' },
  woodland:   { background: '#060d08', text: '#cce8c0', textMuted: '#609858', fontFamily: 'serif' },
  botanical:  { background: '#050c06', text: '#d0f0d4', textMuted: '#58b068', fontFamily: 'serif' },
  lunar:      { background: '#080910', text: '#e4e8ec', textMuted: '#808898', fontFamily: 'serif' },
  alpine:     { background: '#07101a', text: '#d8e8f4', textMuted: '#6890c0', fontFamily: 'serif' },
  obsidian:   { background: '#070707', text: '#e0e0e0', textMuted: '#808080', fontFamily: 'serif' },
};

function resolveWidgetTheme(name?: string): WidgetThemeStyle {
  return WIDGET_THEMES[name ?? 'minimal'] ?? WIDGET_THEMES.minimal;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QuoteData {
  id?: string;
  text: string;
  author: string;
}

interface Props {
  quote: QuoteData;
  config: Pick<WidgetInstanceConfig, 'showAuthor' | 'transparentBg' | 'textSize' | 'widgetTheme'>;
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

function coverCrop(
  natural: { w: number; h: number },
  widgetW: number,
  widgetH: number,
): { renderW: number; renderH: number; marginLeft: number; marginTop: number } {
  const scale = Math.max(widgetW / natural.w, widgetH / natural.h);
  const renderW = Math.ceil(natural.w * scale);
  const renderH = Math.ceil(natural.h * scale);
  return {
    renderW,
    renderH,
    marginLeft: -Math.floor((renderW - widgetW) / 2),
    marginTop:  -Math.floor((renderH - widgetH) / 2),
  };
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

  const tapUri  = `quotable://widget-open?widgetId=${widgetInfo.widgetId}`;
  const wTheme  = resolveWidgetTheme(config.widgetTheme);
  const bgImage = config.transparentBg ? null : (THEME_IMAGES[config.widgetTheme ?? 'minimal'] ?? null);

  const quoteText = (
    <TextWidget
      text={quote.text}
      style={{
        width: 'match_parent',
        color: wTheme.text,
        fontSize: quoteSize,
        fontFamily: wTheme.fontFamily,
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
        color: wTheme.text,
        fontSize: dashSize,
        fontFamily: wTheme.fontFamily,
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
        color: wTheme.text,
        fontSize: authorSize,
        fontFamily: wTheme.fontFamily,
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

  // Solid-background path: minimal theme or transparent mode.
  if (!bgImage) {
    const bgColor = config.transparentBg ? ('#00000000' as `#${string}`) : wTheme.background;
    return (
      <FlexWidget
        style={{
          width: widgetInfo.width,
          height: widgetInfo.height,
          justifyContent: 'center',
          alignItems: 'center',
          padding,
          borderRadius: 16,
          backgroundColor: bgColor,
          overflow: 'hidden',
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

  // Photo-background path: OverlapWidget stacks image → scrim+text.
  const natural = THEME_IMAGE_NATURAL[config.widgetTheme ?? 'minimal'];
  const crop = natural
    ? coverCrop(natural, widgetInfo.width, widgetInfo.height)
    : { renderW: widgetInfo.width, renderH: widgetInfo.height, marginLeft: 0, marginTop: 0 };

  return (
    <OverlapWidget
      style={{
        width: widgetInfo.width,
        height: widgetInfo.height,
        borderRadius: 16,
        overflow: 'hidden',
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: tapUri }}
    >
      {/* Layer 1: background photo — cover-scaled and center-cropped */}
      <ImageWidget
        image={bgImage}
        imageWidth={crop.renderW}
        imageHeight={crop.renderH}
        style={{ width: crop.renderW, height: crop.renderH, marginLeft: crop.marginLeft, marginTop: crop.marginTop }}
      />

      {/* Layer 2: dark scrim + text */}
      <FlexWidget
        style={{
          width: 'match_parent',
          height: 'match_parent',
          justifyContent: 'center',
          alignItems: 'center',
          padding,
          backgroundColor: '#00000050',
        }}
        clickAction="OPEN_URI"
        clickActionData={{ uri: tapUri }}
      >
        {quoteText}
        {dashText}
        {authorText}
      </FlexWidget>
    </OverlapWidget>
  );
}
