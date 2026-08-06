/**
 * Regenerates constants/icons.ts from the Iconify API.
 *
 * The app speaks MaterialCommunityIcons names (left column below) because that
 * is what every call site and every `icon:` string in constants/ already uses.
 * This table is the only place those names are tied to a real icon set, so
 * swapping sets later means editing this file and re-running it.
 *
 *   node scripts/generate-icons.mjs
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SET = 'tabler';

/** app name -> icon name in SET */
const MAP = {
  // Android's own person glyph, deliberately not Tabler's — this is the
  // profile button, where the platform default is what users expect.
  account: 'material-symbols:person-outline',
  'account-group': 'users',
  'account-outline': 'user',
  apps: 'layout-grid',
  'arrow-left': 'arrow-left',
  atom: 'atom',
  'bell-outline': 'bell',
  'book-clock': 'book',
  'book-open-variant': 'book-2',
  briefcase: 'briefcase',
  'brush-variant': 'paint',
  'cards-outline': 'layout-grid',
  check: 'check',
  'check-bold': 'check',
  'check-circle': 'circle-check',
  'check-circle-outline': 'circle-check',
  'chevron-left': 'chevron-left',
  'chevron-right': 'chevron-right',
  'chevron-up': 'chevron-up',
  circle: 'circle',
  'circle-opacity': 'circle-half-2',
  'clock-outline': 'clock',
  close: 'x',
  'cog-outline': 'settings',
  'compass-outline': 'compass',
  'content-copy': 'copy',
  crown: 'crown',
  'crown-outline': 'crown',
  'delete-outline': 'trash',
  'dots-horizontal': 'dots',
  'dots-vertical': 'dots',
  'magnify': 'search',
  'bookmark-outline': 'bookmark',
  'bookmark': 'bookmark-filled',
  'emoticon-cry-outline': 'mood-cry',
  'emoticon-excited-outline': 'mood-happy',
  'emoticon-happy-outline': 'mood-smile',
  'emoticon-neutral-outline': 'mood-empty',
  'emoticon-outline': 'mood-neutral',
  'emoticon-sad-outline': 'mood-sad',
  'export-variant': 'share-3',
  feather: 'feather',
  fire: 'flame',
  flower: 'flower',
  'format-quote-close': 'quote',
  'format-quote-open': 'quote',
  'format-size': 'text-size',
  'hand-heart': 'heart-handshake',
  'head-snowflake': 'brain',
  // `heart` is the filled state of the favorite toggle, `heart-outline` the
  // empty one — Tabler's plain `heart` is stroke-only, so both names pointing
  // at it made the toggle look identical either way.
  heart: 'heart-filled',
  'heart-multiple': 'hearts',
  'heart-outline': 'heart',
  'heart-pulse': 'heartbeat',
  history: 'history',
  'home-heart': 'home-heart',
  'image-minus-outline': 'photo-minus',
  'image-off-outline': 'photo-off',
  'information-outline': 'info-circle',
  lock: 'lock',
  'lock-open-outline': 'lock-open',
  'lock-outline': 'lock',
  minus: 'minus',
  'palette-outline': 'palette',
  'pencil-outline': 'pencil',
  'playlist-music': 'playlist',
  'playlist-remove': 'playlist-x',
  plus: 'plus',
  'plus-circle-outline': 'circle-plus',
  refresh: 'refresh',
  restart: 'rotate',
  'rocket-launch': 'rocket',
  'shape-outline': 'shape',
  'share-variant': 'share-3',
  shield: 'shield',
  'sort-variant': 'arrows-sort',
  'star-outline': 'star',
  'tag-outline': 'tag',
  'trash-can-outline': 'trash',
  trophy: 'trophy',
  'tune-variant': 'adjustments',
  vibrate: 'device-mobile-vibration',
  'view-grid-outline': 'layout-grid',
  'view-grid-plus-outline': 'layout-grid-add',
  'weather-sunny': 'sun',
  'weather-sunset-up': 'sunrise',
  'white-balance-sunny': 'sun',
  'wifi-off': 'wifi-off',
  'zodiac-aquarius': 'zodiac-aquarius',
  'zodiac-aries': 'zodiac-aries',
  'zodiac-cancer': 'zodiac-cancer',
  'zodiac-capricorn': 'zodiac-capricorn',
  'zodiac-gemini': 'zodiac-gemini',
  'zodiac-leo': 'zodiac-leo',
  'zodiac-libra': 'zodiac-libra',
  'zodiac-pisces': 'zodiac-pisces',
  'zodiac-sagittarius': 'zodiac-sagittarius',
  'zodiac-scorpio': 'zodiac-scorpio',
  'zodiac-taurus': 'zodiac-taurus',
  'zodiac-virgo': 'zodiac-virgo',
};

/** Names whose glyph is the mirror of another — rotated at render time. */
// Tabler ships only a horizontal `dots`; the vertical overflow glyph is the
// same three dots turned a quarter turn.
const ROTATE = { 'format-quote-close': 180, 'dots-vertical': 90 };

/**
 * Optical corrections, keyed by icon name in SET so one entry covers every
 * alias pointing at that glyph. Most Tabler icons fill 18 of the 24 grid; the
 * grid glyphs are drawn at 16, so they read small next to everything else.
 * The grid glyphs go past 18 to 20 — four detached squares carry less optical
 * weight than a single contiguous shape, so matching the box isn't enough.
 */
const SCALE = {
  'layout-grid': 20 / 16,
  'layout-grid-add': 20 / 16,
  // Material draws to a 16-unit extent where Tabler uses 18.
  'material-symbols:person-outline': 18 / 16,
};

// A value is a bare name from SET, or "prefix:name" to pull from another set.
const values = [...new Set(Object.values(MAP))].sort();
const byPrefix = new Map();
for (const v of values) {
  const [prefix, name] = v.includes(':') ? v.split(':') : [SET, v];
  if (!byPrefix.has(prefix)) byPrefix.set(prefix, []);
  byPrefix.get(prefix).push([v, name]);
}

const resolved = new Map();
for (const [prefix, entries] of byPrefix) {
  const res = await fetch(
    `https://api.iconify.design/${prefix}.json?icons=${entries.map(([, n]) => n).join(',')}`,
  );
  if (!res.ok) throw new Error(`Iconify returned ${res.status} for ${prefix}`);
  const data = await res.json();
  for (const [value, name] of entries) {
    if (!data.icons?.[name]) throw new Error(`Not found: ${prefix}:${name}`);
    resolved.set(value, data.icons[name].body);
  }
}

const bodies = values
  .map((v) => `  ${JSON.stringify(v)}: ${JSON.stringify(resolved.get(v))},`)
  .join('\n');
const alias = Object.entries(MAP)
  .map(([from, to]) => `  ${JSON.stringify(from)}: ${JSON.stringify(to)},`)
  .join('\n');
const rotate = Object.entries(ROTATE)
  .map(([n, deg]) => `  ${JSON.stringify(n)}: ${deg},`)
  .join('\n');
const scale = Object.entries(SCALE)
  .map(([n, s]) => `  ${JSON.stringify(n)}: ${s.toFixed(4)},`)
  .join('\n');

const out = `// Generated by scripts/generate-icons.mjs — do not edit by hand.
// Icons: Tabler Icons (MIT), 24x24 grid, 2px stroke, currentColor.
// Values written as "prefix:name" come from that Iconify set instead
// (currently Material Symbols, Apache 2.0, for the Android profile glyph).

/** Raw SVG bodies, keyed by Tabler name. */
export const ICON_BODIES: Record<string, string> = {
${bodies}
};

/** App icon name -> Tabler name. The only place a set is named. */
export const ICON_ALIAS = {
${alias}
} as const;

/** Degrees of rotation applied at render, for mirrored glyphs. */
export const ICON_ROTATE: Partial<Record<IconName, number>> = {
${rotate}
};

/** Optical size corrections, keyed by Tabler name. */
export const ICON_SCALE: Record<string, number> = {
${scale}
};

export type IconName = keyof typeof ICON_ALIAS;
`;

const dir = dirname(fileURLToPath(import.meta.url));
writeFileSync(join(dir, '..', 'constants', 'icons.ts'), out);
console.log(`wrote constants/icons.ts — ${values.length} glyphs, ${Object.keys(MAP).length} names`);
