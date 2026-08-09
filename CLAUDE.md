# CLAUDE.md — Quotable

## Project

**Quotable** is a premium minimalist motivation app built with React Native and Expo. Android is live. iOS is fully wired but not yet verified on hardware.

Verification is on a physical device or simulator, via Expo Go or a dev build. Never a web server, never a browser preview. Do NOT call `preview_start` or any browser preview tool.

Brand, voice, audience and the free/pro line live in `brand.md`. This file is the technical source of truth. Nothing else in the repo overrides it.

## Stack

- Expo SDK ~54.0.36, React Native 0.81.5, React 19.1.0
- New Architecture enabled on both platforms (`newArchEnabled: true` in `app.json`, set at root and per platform)
- Expo Router ~6.0.24, file-based, flat Stack, no tab navigator, typed routes on
- TypeScript ~5.9.2
- Plain `StyleSheet.create` for styling. NativeWind/Tailwind is NOT installed
- Zustand ~5 for state, persisted through AsyncStorage
- `react-native-svg` for all iconography (no icon font package)
- `react-native-gesture-handler` ~2.28 and `react-native-reanimated` ~4.1 with `react-native-worklets`
- RevenueCat: `react-native-purchases` ^9.11 and `react-native-purchases-ui` ^9.11
- `react-native-android-widget` for Android widgets, `@bacons/apple-targets` for the iOS widget extension
- `expo-notifications`, `expo-task-manager`, `expo-background-fetch` for scheduling
- Jest via `jest-expo`

## Architecture

### Entry and root

- `index.ts` is the app entry. `app/_layout.tsx` is the root layout: it registers fonts, sets the notification handler, registers the widget refresh task, drains the iOS widget queue, and handles deep links.
- `app/index.tsx` is the home screen. It renders `ThemeBackground`, `QuoteCard`, `StreakBanner`, and mounts every sheet inline under `ModalProvider`.

### Screens are mounted twice

Every screen in `components/screens/` is mounted BOTH as an inline `BottomSheet` from `app/index.tsx` AND as a route (`app/favorites.tsx` and friends are three-line re-exports). Both paths must keep working. Screens take an optional `onClose` and fall back to the router:

```ts
onClose ?? (() => router.back())
```

Breaking either path is a regression even if the other still works.

### Directories

- `app/` — routes. Sheet re-exports plus `subscriptions.tsx` (Benefits / Account tabs), `widget-open.tsx` (widget deep-link target), `onboarding/`
- `components/screens/` — the thirteen sheet screens
- `components/quotes/` — `QuoteCard` (gestures, progress pill, bottom bar) and `ShareCard`
- `components/layout/` — `BottomSheet`, `ThemeBackground`, `StreakBanner`
- `components/ui/` — the shared primitives and `tokens.ts`
- `components/onboarding/` — the onboarding renderer, its own `tokens.ts`, and the bespoke screens
- `components/subscriptions/`, `components/streak/`, `components/collections/`, `components/art/`
- `contexts/ModalContext.tsx` — the sheet stack
- `store/` — nine Zustand stores
- `constants/` — `themes.ts`, `categories.ts`, `fonts.ts`, `icons.ts`, `moods.ts`, `onboardingSteps.ts`
- `hooks/` — `useTheme`, `useRevenueCat`, `useStreak`, `useTopics`, `useHaptics`
- `lib/` — API, storage, notifications, widget data, RevenueCat, analytics, error reporting
- `widget/`, `tasks/` — Android widget
- `targets/`, `native/ios/`, `modules/widget-bridge/`, `plugins/` — iOS widget
- `__tests__/` — Jest suites
- `patches/` — patch-package patches, load-bearing (see Native and build)

### Stores

Nine, all Zustand, most persisted through `zustandMMKVStorage`:

`useAppStore`, `useCollectionsStore`, `useDeepLinkStore`, `useFavoritesStore`, `useHistoryStore`, `useShareStore`, `useTopicsStore`, `useUserQuotesStore`, `useWidgetStore`.

There is no `useMixStore`. Mixes were replaced by topics and collections.

### Storage

`lib/storage.ts` is the only storage layer. Two exports:

- `zustandMMKVStorage` — the async adapter passed to Zustand's `persist` middleware. **It is backed by AsyncStorage.** The name is historical. MMKV is not installed and should not be reached for.
- `Storage` — sync typed helpers over an in-memory map. Convenient, but **not persisted across restarts**. Anything durable goes through a persisted store.

### Quotes

`lib/quotesApi.ts` calls `https://api.quotable.kurokeita.dev/api` directly and transforms the response into the app's own `Quote` shape. There is no backend and no Supabase.

### Categories and topics

`constants/categories.ts` holds two distinct concepts.

**Categories** — 15, each with an `apiTag` for the quotes API and a `group`:

- `popular` — Motivation, Inspiration, Wisdom, Happiness, Success
- `mindset` — Character, Change, Freedom, Philosophy
- `relationships` — Love, Friendship
- `horizons` — Life, Future, Science, History

There is no `section: 'byType' | 'forYou'` field. That naming is gone.

**Topics** — what the user actually follows. `SPECIAL_TOPICS` adds General, Favorites and My quotes on top of the categories. `FREE_TOPIC_IDS` and `isTopicFree()` define the free tier: General and Favorites only. Every one of the 14 `CATEGORIES` shows a lock and routes to the paywall.

### Onboarding

Twenty steps, defined as data in `constants/onboardingSteps.ts`. Five step kinds: `statement`, `single`, `multi`, `chips`, `bespoke`. Everything except `bespoke` renders straight from the config, and **all copy lives in that file** — the renderer holds no strings. `bespoke` steps are hand-built components in `components/onboarding/screens/`.

Answers write to typed keys on `UserPreferences` in `useAppStore`.

The flow is deliberately long. Do not propose shortening it, merging steps, or skipping ahead; the pacing is intentional.

### Widgets

The two platforms use deliberately different models. Do not try to unify them.

**Android** — `react-native-android-widget`. `BasicWidget` is declared in `app.json`. `widget/QuoteWidget.tsx` renders it, `widget/widgetTaskHandler.ts` handles widget events, `tasks/widgetRefreshTask.ts` is the registered background refresh. Each placed widget has its own config keyed by widget id in `useWidgetStore`.

**iOS** — the OS gives the app no widget ids and cannot wake JS in the background, so the Android model does not carry over. Instead, all iOS widgets share one config under `IOS_WIDGET_CONFIG_ID`, and the app pre-writes a batch of quotes into the App Group `group.com.mquotes.shared`. The extension walks that queue on its own timeline. Appearance is configured in Apple's Edit Widget panel, not in the app.

- `lib/iosWidget.ts` — the data pump, and the best explanation of the model
- `targets/quotes-widget/QuotesWidget.swift` — the WidgetKit extension, deployment target 17.0, bundle id `com.kovoapps.quotable.quotes-widget`
- `native/ios/WidgetBridge/` — the Swift module and its ObjC export
- `modules/widget-bridge/index.ts` — the JS side for both platforms
- `plugins/withWidgetExported.js`, `withWidgetPreview.js`, `withWidgetBridgeModule.js` — prebuild config plugins

### Deep links

Scheme `quotable`. A widget tap opens `quotable://widget-open?src=<platform>&i=<index>`, handled by `app/widget-open.tsx` through `useDeepLinkStore`. `app/index.tsx` keeps a fallback for the older `quotable://?src=widget&...` format still baked into widgets rendered before the change.

### Notifications

`lib/notifications.ts`. Three categories: `daily-quote`, `qod`, `streak`. Daily reminders and Quote of the Day each pick a source independently from the same vocabulary: `following`, a topic id, `_favorites`, `_myquotes`, or `collection:<id>`.

The module lazily requires `notificationQuotes` and `useRevenueCat` inside `rescheduleAll` rather than importing them at the top, because both drag in the stores and the RevenueCat SDK, and the pure helpers in this file are used where that cost is not wanted. Keep it that way.

### Subscriptions

`lib/revenuecat.ts` and `hooks/useRevenueCat.ts`. The entitlement string is `Quotable Premium`. `isPro` is the single gate. On iOS, a change to `isPro` propagates to the widget through `setIOSWidgetPro`.

Gated today: all themes except `minimal`, History, My quotes, and every topic outside `FREE_TOPIC_IDS`.

### Analytics and error reporting

`lib/analytics.ts` and `lib/errorReporting.ts` are abstraction shells with typed event unions and console-only implementations. **Nothing is sent anywhere.** Both carry TODOs for a real provider. Do not assume an event is being captured in production.

## Navigation pattern

All modals open as inline `BottomSheet` components managed by `ModalContext`. No push navigation for overlays.

`ModalContext` is a **stack**, not a single active sheet:

- `openSheet(name)` pushes
- `goBack()` pops to the previous sheet
- `closeSheet()` clears the whole stack, used by X buttons and backdrop taps

`previousSheet` is non-null whenever the transition is sheet-to-sheet rather than a fresh open or a full close. `app/index.tsx` reads it as `isSwitching` to skip the slide animation, so switching between sheets is instant while opening and closing still animate. Changing this without understanding it produces a visible flash.

Sheets slide up to the very top of the screen (full height) and slide back down. Each screen supplies its own top safe-area inset via `edges={['top','bottom']}`.

## Design conventions

- Premium minimalist aesthetic: elevated and calm, not loud or gamified
- Design tokens only. Colors come from `theme.*`, geometry from `components/ui/tokens.ts`. No hardcoded values
- Accent: `theme.gold`. CTA fill: `theme.goldButton`. Label on that fill: `ON_GOLD` from `tokens.ts`
- **The `gold` token names are historical.** Read the value from the theme, never assume it is gold. The default Minimal theme's accent is warm ivory (`#E4DCCC`), and several other themes are blue, orange or grey
- Geometry: `GUTTER`, `SPACE`, `RADIUS`, `HIT` and `ICON_BTN` (36 / 44 / 52) from `tokens.ts`. Icon buttons are circles at `borderRadius: size / 2` on `theme.surface`. The onboarding flow keeps its own tuned values in `components/onboarding/tokens.ts`
- Modals: X close button via `SheetHeader`, full height, own top safe-area inset
- No dark patterns, no pushy notifications, no gamification badges

### Icons

There is no icon font. `components/ui/Icon.tsx` is the single icon primitive, rendering Tabler SVG bodies from `constants/icons.ts` through `react-native-svg`.

Call sites use MaterialCommunityIcons names as the vocabulary. `ICON_ALIAS` maps each one to a real glyph, so swapping icon sets never touches a call site. To add an icon, add it to `scripts/generate-icons.mjs` and regenerate. An unmapped name warns in dev and falls back to a visible marker.

`@expo/vector-icons` is not installed. Do not import from it.

### Color: off-white, never pure white

**Never use `#FFFFFF`, `#fff`, or `'white'`.** Pure white is cold and clips against the warm dark palette. The app's lightest tone is the theme's own off-white.

- Text and glyphs: `theme.text` (off-white, `#E8E0D0` in Minimal)
- Secondary text: `theme.textMuted`
- Something that must read as "white" on a colored fill (a toggle knob, a badge glyph): `theme.text`, or `ON_GOLD` when it sits on the gold fill
- The same applies to near-white literals. Take the value from `theme.*`, don't hand-pick a hex

### Type: three roles, weight is a family name

The type system lives in `constants/fonts.ts` and nothing outside it may name a font directly. Three roles, each surfaced on the theme:

- **display** — `theme.quoteFontFamily`, Peachi. Quotes, screen titles, headings, the wordmark. All 18 themes use `FONTS.display.medium`
- **ui** — `theme.uiFontFamily`, Averta (falls back to Inter until `AVERTA_READY`). Buttons, labels, controls
- **body** — `theme.bodyFontFamily`, Inter. Body and legal copy

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

Peachi carries heavy ascent/descent. For display text set an explicit `lineHeight` and `includeFontPadding: false`, or Android's font padding inflates the text box and breaks vertical centering against adjacent icons.

## Native and build

### Patches are load-bearing

`patch-package` runs on postinstall. Two patches, both required:

**`patches/react-native+0.81.5.patch`** fixes the iOS launch crash. Upstream `RCTTurboModule.mm` converts an NSException thrown from a void TurboModule method into a `jsi::JSError` and rethrows it. Both halves are unsafe: the conversion allocates JSI values on the Hermes runtime from the native method queue, concurrently with the JS thread, corrupting the heap so the app dies later inside unrelated GC code; and for async void methods the rethrow escapes a dispatch block where nothing can catch it. The patch logs instead. Confirmed against an on-device crash report. **Reinstalling node_modules without applying this patch reintroduces the crash.**

**`patches/expo-router+6.0.24.patch`**

### iOS

- Bundle id `com.kovoapps.quotable`, team `HF7548K866`, App Group `group.com.mquotes.shared`
- The App Group must be declared in BOTH `app.json` entitlements and `targets/quotes-widget/expo-target.config.js`. `@bacons/apple-targets` only mirrors app groups onto the target when an `entitlements` object already exists there. Without it, no `generated.entitlements` is written, `CODE_SIGN_ENTITLEMENTS` is dropped, and the extension cannot read the UserDefaults the app writes
- Widget target deployment 17.0, required by `.containerBackground(for: .widget)` and `AppIntentConfiguration`
- `expo-build-properties` sets `buildReactNativeFromSource: true`

### EAS

`development` and `preview` build for the iOS simulator. `production` is an Android app bundle and an iOS Release with `autoIncrement`. `appVersionSource: local`.

## Testing

```bash
npm test
```

- `npm test` — watch mode, `jest-expo`
- `npm run test:ci` — single run with coverage
- `npm run test:ios-startup` — the iOS startup smoke test under its own `jest.ios.config.js`

Suites live in `__tests__/lib/`, `__tests__/store/`, `__tests__/integration/`, plus `__tests__/ios-startup.smoke.test.ts`.

## Developer approach

**Identify** — Find the root before acting. Read the error, trace the call stack, scope the change. Flag unrelated issues but don't fix them unless asked.

**Analyze** — Read ALL relevant files before editing. Follow the data through stores, hooks, components, and constants. Understand why something was built the way it was. Weigh tradeoffs honestly: performance, readability, consistency with what's already there.

**Breakdown** — For tasks touching more than three files, write out the plan first. Each step needs a clear output and a clear dependency.

**Minimal footprint** — Change only what the task requires. No drive-by refactors, no extra comments, no speculative abstractions.

**Summarize** — After a task, say what changed and why in one or two sentences. No bullet-point recaps. No restating the request.

## Communication

- Draft written content (docs, copy, md files) for approval before creating the file
- No emoji in responses or files
- **Never write `---`** — no horizontal rules, no section dividers, no markdown tables (their separator row is `---`). Use a heading or a blank line to break sections, and a bullet list instead of a table
- **No dashes in user-facing copy** — no em dashes, en dashes or ` - ` in any string the user reads (screen text, empty states, button labels, accessibility labels). Use a colon, a comma, or two sentences. Dashes in code comments and in this file are fine
- Short and direct. No preamble, summaries, or filler
- Don't restate what was just said, just act
- If something is a tradeoff, say so. If unsure, say so before acting

## Git workflow

After every code edit: stage all changes, commit with a concise message, and push (`git push origin main`). No exceptions.

Do not bump `versionCode` or `versionName`. Version lives in `app.json` and EAS handles increments at release.
