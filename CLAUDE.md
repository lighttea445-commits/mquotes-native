# CLAUDE.md — Quotable

## Project

**Quotable** is a premium minimalist motivation app for Android. Built with React Native / Expo. Verified on physical device via Expo Go or a dev build — never a web server or browser preview. Do NOT call `preview_start` or any browser preview tools.

## Stack

- Expo SDK, New Architecture enabled (`newArchEnabled: true` in `app.json`)
- Expo Router v3 (file-based routing, flat Stack — no tab navigator)
- Plain `StyleSheet.create` for styling — NativeWind/Tailwind is NOT installed
- Zustand + MMKV for state persistence
- `@expo/vector-icons` (MaterialCommunityIcons, Ionicons)
- `react-native-gesture-handler` + `react-native-reanimated@4.x` for gestures/animations
- RevenueCat (`react-native-purchases@9.11.0`) for subscriptions

## Architecture

- `app/index.tsx` — root screen (quote card + all sheet orchestration via `ModalContext`)
- Every screen lives in `components/screens/` and is mounted BOTH as an inline `BottomSheet` from `index.tsx` AND as a route (`app/favorites.tsx` etc. are 3-line re-exports). Both paths must keep working — screens do `onClose ?? (() => router.back())`.
- `app/subscriptions.tsx` — full subscription screen (Benefits / Account tabs)
- `components/quotes/QuoteCard.tsx` — main card with gestures, progress pill, bottom bar
- `components/layout/BottomSheet.tsx` — slide-up/down animation, backdrop, drag-to-dismiss
- `store/` — Zustand stores (useMixStore, useAppStore, useFavoritesStore, useHistoryStore, useUserQuotesStore)
- `constants/themes.ts` — 18 themes
- `constants/categories.ts` — 15 categories, each with `apiTag` and `section: 'byType' | 'forYou'`
- `lib/quotesApi.ts` — direct Quotable API calls, no Supabase
- `lib/revenuecat.ts` — RevenueCat SDK init and entitlement checks

## Navigation Pattern

All modals open as inline `BottomSheet` components managed by `ModalContext` in `index.tsx`. No push navigation for overlays. Each sheet accepts `onClose?: () => void`. Sheets slide up to the very top of the screen (full height) and slide back down — each screen supplies its own top safe-area inset.

## Design Conventions

- Premium minimalist aesthetic — elevated and calm, not loud or gamified
- Design tokens only — colors from `theme.*`, no hardcoded values
- Accent: `theme.gold`, CTA fill: `theme.goldButton`, label on that fill: `ON_GOLD` from `components/ui/tokens.ts`. The token names are historical — read the value from the theme, never assume it is gold (Minimal is warm ivory)
- Icon buttons: 48×48, `borderRadius: 24` (circle), `backgroundColor: theme.surface`
- Modals: X close button via `SheetHeader`; sheets run full height and supply their own top safe-area inset (`edges={['top','bottom']}`)
- No dark patterns, no pushy notifications, no gamification badges

### Color — off-white, never pure white

**Never use `#FFFFFF`, `#fff`, or `'white'`.** Pure white is cold and clips against the warm dark palette. The app's lightest tone is the theme's own off-white.

- Text and glyphs: `theme.text` (off-white — e.g. `#E8E0D0` in Minimal)
- Secondary text: `theme.textMuted`
- Something that must read as "white" on a colored fill (a toggle knob, a badge glyph): `theme.text`, or `ON_GOLD` when it sits on gold
- The same applies to near-white literals — take the value from `theme.*`, don't hand-pick a hex

### Type — three roles, weight is a family name

The type system lives in `constants/fonts.ts` and nothing outside it may name a font directly. Three roles, each surfaced on the theme:

| Role | Token | Face | Used for |
|---|---|---|---|
| display | `theme.quoteFontFamily` | Peachi | quotes, screen titles, headings, the wordmark |
| ui | `theme.uiFontFamily` | Averta (falls back to Inter until `AVERTA_READY`) | buttons, labels, controls |
| body | `theme.bodyFontFamily` | Inter | body and legal copy |

**`fontWeight` does nothing on these faces.** React Native applies no synthetic bolding to custom families, so `fontWeight: '700'` on Peachi or Inter is silently ignored. A weight change means naming a different family:

```ts
// wrong — inert, renders at the theme's single weight
{ fontFamily: theme.quoteFontFamily, fontWeight: '700' }

// right — the weight IS the family
import { FONTS } from '../../constants/fonts';
{ fontFamily: FONTS.display.bold }
```

Use `FONTS.display.*` / `FONTS.ui.*` / `FONTS.body.*` whenever a weight other than the theme's default is needed. Available: `regular`, `medium`, `bold` per role.

**Set the family in one place.** `style={[styles.title, { fontFamily: theme.quoteFontFamily }]}` overrides whatever `styles.title` declared, because the inline object wins the array merge. Put the family in the StyleSheet and keep only color inline.

Peachi carries heavy ascent/descent — for display text set an explicit `lineHeight` and `includeFontPadding: false`, or Android's font padding inflates the text box and breaks vertical centering against adjacent icons.

## Brand

- **App name:** Quotable
- **Platform:** Android only
- **Category:** Lifestyle / Self-improvement
- **Tone:** Calm, refined, unhurried — the app offers, it doesn't push
- **Core promise:** One great quote a day can shift how you see a moment

## Developer Approach

**Identify** — Find the root before acting. Read the error, trace the call stack, scope the change. Flag unrelated issues but don't fix them unless asked.

**Analyze** — Read ALL relevant files before editing. Follow the data through stores, hooks, components, and constants. Understand why something was built the way it was.

**Breakdown** — For tasks touching more than three files, write out the plan first. Each step needs a clear output and dependency.

**Summarize** — After a task, say what changed and why in one or two sentences. No bullet-point recaps. No restating the request.

## Communication

- Draft written content (docs, copy, md files) for approval before creating the file
- No emoji in responses or files
- Short and direct — no preamble, summaries, or filler
- Don't restate what was just said, just act

## Git Workflow

After every code edit: stage all changes, commit with a concise message, and push to GitHub (`git push origin main`). No exceptions.
