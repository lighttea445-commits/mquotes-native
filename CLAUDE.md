# CLAUDE.md — Quotable

## Project

**Quotable** is a premium minimalist motivation app for Android. Built with React Native / Expo. Verified on physical device via Expo Go or a dev build — never a web server or browser preview. Do NOT call `preview_start` or any browser preview tools.

## Stack

- Expo SDK, New Architecture enabled (`newArchEnabled: true` in `app.json`)
- Expo Router v3 (file-based routing, flat Stack — no tab navigator)
- NativeWind / Tailwind for styling
- Zustand + AsyncStorage for state persistence
- `@expo/vector-icons` (MaterialCommunityIcons, Ionicons)
- `react-native-gesture-handler` + `react-native-reanimated@4.x` for gestures/animations
- RevenueCat (`react-native-purchases@9.11.0`) for subscriptions

## Architecture

- `app/index.tsx` — root screen (quote card + all sheet orchestration via `ModalContext`)
- `app/categories.tsx`, `app/themes.tsx`, `app/mix/create.tsx`, `app/profile.tsx` — inline BottomSheet modals
- `app/favorites.tsx`, `app/history.tsx`, `app/settings.tsx`, `app/notifications.tsx`, `app/widgets.tsx` — push screens
- `app/subscriptions.tsx` — full subscription screen (Benefits / Account tabs)
- `components/quotes/QuoteCard.tsx` — main card with gestures, progress pill, bottom bar
- `components/layout/BottomSheet.tsx` — slide-up/down animation, backdrop, drag-to-dismiss
- `store/` — Zustand stores (useMixStore, useAppStore, useFavoritesStore, useHistoryStore, useUserQuotesStore)
- `constants/themes.ts` — 18 themes
- `constants/categories.ts` — 15 categories, each with `apiTag` and `section: 'byType' | 'forYou'`
- `lib/quotesApi.ts` — direct Quotable API calls, no Supabase
- `lib/revenuecat.ts` — RevenueCat SDK init and entitlement checks

## Navigation Pattern

All modals open as inline `BottomSheet` components managed by `ModalContext` in `index.tsx`. No push navigation for overlays. Each sheet accepts `onClose?: () => void`. Sheet leaves 8% gap at top so the main card peeks through.

## Design Conventions

- Premium minimalist aesthetic — elevated and calm, not loud or gamified
- Design tokens only — colors from `theme.*`, no hardcoded values
- Gold accent: `#B8975A`, gold icon bg: `rgba(184,151,90,0.12)`
- Fonts: `theme.quoteFontFamily` (Playfair Display) for quotes/headings, `theme.uiFontFamily` (Inter) for UI
- Icon buttons: 48×48, `borderRadius: 24` (circle), `backgroundColor: theme.surface`
- Modals: drag handle pill at top + X close button (MaterialCommunityIcons `close`)
- Safe area: modals use `edges={['bottom']}`, push screens use `edges={['top']}`
- No dark patterns, no pushy notifications, no gamification badges

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
