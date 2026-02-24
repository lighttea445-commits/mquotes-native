# mquotes-native — Claude Instructions

## Project
React Native / Expo app (Expo Go compatible). Do NOT attempt to run a web server or use `preview_start` — this is a native mobile app, verified via Expo Go on a physical device.

## Stack
- Expo SDK (Expo Go compatible, no New Architecture)
- Expo Router v3 (file-based routing, flat Stack — no tab navigator)
- NativeWind / Tailwind for styling
- Zustand + AsyncStorage for state persistence
- `@expo/vector-icons` (MaterialCommunityIcons, Ionicons)
- `react-native-gesture-handler` + `react-native-reanimated` for gestures/animations

## Architecture
- `app/index.tsx` — root screen (quote card)
- `app/categories.tsx` — full-height categories overlay (modal)
- `app/profile.tsx` — profile modal
- `app/themes.tsx` — themes picker modal
- `app/mix/create.tsx` — mix builder modal
- `app/favorites.tsx`, `app/history.tsx` — push screens
- `store/` — Zustand stores (useMixStore, useAppStore, useFavoritesStore, etc.)
- `constants/themes.ts` — 15 themes; `constants/categories.ts` — 19 categories
- `lib/quotesApi.ts` — quote fetching (fetchMultipleRandomQuotes, fetchQuotesByCategory)

## Design Conventions
- Black-and-white color scheme — use `theme.*` tokens, no hardcoded accent colors
- Modals: drag handle pill at top + X close button (MaterialCommunityIcons `close`)
- Buttons: `theme.surface` background, `borderRadius: 14`, 48×48 for icon buttons
- Fonts: `theme.quoteFontFamily` (Playfair Display) for headings/quotes, `theme.uiFontFamily` (Inter) for UI text
- Safe area: modals use `edges={['bottom']}`, push screens use `edges={['top']}`

## Custom Instructions

# CLAUDE.md — Frontend Website Rules

## Always Do First
- **Invoke the `frontend-design` skill** before writing any frontend code, every session, no exceptions.

## Reference Images
- If a reference image is provided: match layout, spacing, typography, and color exactly. Swap in placeholder content (images via `https://placehold.co/`, generic copy). Do not improve or add to the design.
- If no reference image: design from scratch with high craft (see guardrails below).
- Screenshot your output, compare against reference, fix mismatches, re-screenshot. Do at least 2 comparison rounds. Stop only when no visible differences remain or user says so.

## Output Defaults
- Single `index.html` file, all styles inline, unless user says otherwise
- Tailwind CSS via CDN: `<script src="https://cdn.tailwindcss.com"></script>`
- Placeholder images: `https://placehold.co/WIDTHxHEIGHT`
- Mobile-first responsive

## Anti-Generic Guardrails
- **Colors:** Never use default Tailwind palette (indigo-500, blue-600, etc.). Pick a custom brand color and derive from it.
- **Shadows:** Never use flat `shadow-md`. Use layered, color-tinted shadows with low opacity.
- **Typography:** Never use the same font for headings and body. Pair a display/serif with a clean sans. Apply tight tracking (`-0.03em`) on large headings, generous line-height (`1.7`) on body.
- **Gradients:** Layer multiple radial gradients. Add grain/texture via SVG noise filter for depth.
- **Animations:** Only animate `transform` and `opacity`. Never `transition-all`. Use spring-style easing.
- **Interactive states:** Every clickable element needs hover, focus-visible, and active states. No exceptions.
- **Images:** Add a gradient overlay (`bg-gradient-to-t from-black/60`) and a color treatment layer with `mix-blend-multiply`.
- **Spacing:** Use intentional, consistent spacing tokens — not random Tailwind steps.
- **Depth:** Surfaces should have a layering system (base → elevated → floating), not all sit at the same z-plane.

## Hard Rules
- Do not add sections, features, or content not in the reference
- Do not "improve" a reference design — match it
- Do not stop after one screenshot pass
- Do not use `transition-all`
- Do not use default Tailwind blue/indigo as primary color
