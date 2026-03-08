# mquotes Bug Testing Checklist

> App: mquotes-native · Stack: Expo Go / React Native / Expo Router v3 · Updated: 2026-03-08

---

## How to use
- Work through each section top-to-bottom on a physical device via Expo Go
- Check `[ ]` as you verify each item
- Mark failing items with `[x]` and note the bug inline (e.g., `[x] ← CRASH on iOS 17`)
- Re-test after every fix before closing the item

---

## 1. Onboarding Flow

### First Launch
- [ ] App opens to onboarding screen (not home) on a fresh install / cleared storage
- [ ] Progress bar advances correctly at every step (`stepIndex + 1 / STEPS.length`)
- [ ] Back chevron `‹` is hidden on step 0 and visible on all subsequent steps
- [ ] Back button animates (fade) and restores previous step state correctly
- [ ] "Continue →" / "Next →" / "Let's go →" label changes match the step type
- [ ] CTA button is disabled (opacity 0.35) until the required selection is made

### Name Step
- [ ] TextInput auto-focuses and keyboard appears immediately
- [ ] "Next →" remains disabled while input is empty
- [ ] Submitting via keyboard "Done" key advances the step
- [ ] Name persists across app restarts (stored via `useAppStore.setName`)

### Single-Choice Steps (Focus, Drives, Barrier, Morning, Overwhelmed, Notifications)
- [ ] Only one option can be selected per step; selecting a new one deselects the old one
- [ ] Selected state visually shows gold border + lighter background
- [ ] Choice is saved correctly to `singleChoices[step.id]`
- [ ] Notification step: choosing a time saves `notificationsEnabled: true` + correct `notificationTime` (08:00 / 12:00 / 19:00)
- [ ] Notification step: choosing "No thanks" leaves notifications disabled

### Multi-Choice Step (Categories)
- [ ] Multiple options can be toggled independently
- [ ] Tapping a selected option deselects it
- [ ] Selections survive step navigation (go back then forward)
- [ ] On completion, selected category IDs are saved to `preferences.categories`

### Theme Picker Step
- [ ] Horizontal ScrollView renders all 6 theme chips without clipping
- [ ] Selecting a chip applies a white 2px border
- [ ] Selected theme is saved via `useAppStore.setTheme` at completion

### Completion
- [ ] Tapping "Let's go →" on the final step calls `completeOnboarding()` and navigates to `/`
- [ ] After completing onboarding, re-launching the app goes directly to the home screen (no repeat onboarding)

---

## 2. UI / Widgets

### Home Screen (QuoteCard)
- [ ] Quote card renders with correct theme background (`ThemeBackground`)
- [ ] Quote text uses `theme.quoteFontFamily` (Playfair Display)
- [ ] Author name uses `theme.uiFontFamily` (Inter)
- [ ] Swiping to next quote loads a new quote without blank card flash
- [ ] Swipe gesture responds correctly (react-native-gesture-handler + reanimated)
- [ ] Favorite (heart) button toggles filled/unfilled state immediately
- [ ] Heart icon reflects current `isFavorite` state on initial render (not stale)
- [ ] History is updated every time a new quote is viewed
- [ ] Streak banner appears the day after a first visit (not on day 1)
- [ ] Streak banner auto-dismisses or dismisses on tap
- [ ] Week streak dots correctly reflect `weekData[6]` (today = last dot)
- [ ] SafeAreaView `edges={['top']}` prevents content going under status bar

### Modals — General Rules
- [ ] Drag handle pill is visible at the top of every modal (Categories, Themes, Mix, Profile)
- [ ] X close button (MaterialCommunityIcons `close`, 20px) is present and tappable
- [ ] Tapping X returns to the previous screen via `router.back()`
- [ ] `SafeAreaView edges={['bottom']}` prevents content being clipped by home indicator
- [ ] Modals open with a smooth presentation animation (no jump/flash)
- [ ] Backdrop/background does not bleed incorrect colors between themes

### Categories Modal (`/categories`)
- [ ] All 19 categories render in the list
- [ ] Selecting a category highlights it and loads quotes for that category
- [ ] Selected state persists correctly when re-opening the modal
- [ ] Modal closes and quote card refreshes with category-filtered quotes

### Themes Modal (`/themes`)
- [ ] All 15 themes are displayed
- [ ] Selecting a theme immediately updates the home screen background (live preview)
- [ ] Selected theme border/highlight renders correctly
- [ ] Theme preference is persisted after app restart (`useAppStore` MMKV)
- [ ] Themes with `backgroundImage` render image-based backgrounds without stretching/distortion
- [ ] Light themes (`isDark: false`) render correct dark-on-light text contrast

### Mix Builder (`/mix/create`)
- [ ] Grid renders both special categories (`_favorites`, `_my-quotes`) and all 19 regular categories
- [ ] Special category cards show correct count: Favorites count and My Quotes count
- [ ] Tapping a card toggles selected state with gold border + checkbadge
- [ ] "Clear" button appears when ≥1 category is selected, clears all selections
- [ ] "Disable" button appears only when mix is active AND no categories are locally selected
- [ ] Footer "Save Mix" button is gold when ≥1 selected, muted when 0 selected
- [ ] "Save (No filter)" saves an empty array and returns to home
- [ ] After saving a mix, home screen quote feed reflects the mixed categories
- [ ] `mixActive` state is correctly set to `true` after saving with ≥1 category
- [ ] Scrolling the category grid does not trigger the footer "Save Mix" button

### Favorites Screen (`/favorites`)
- [ ] All favorited quotes render in chronological order (newest first)
- [ ] Empty state is shown when no favorites exist
- [ ] Un-favoriting a quote from this screen removes it from the list immediately
- [ ] `savedAt` timestamp displays correctly per quote
- [ ] SafeAreaView `edges={['top']}` is applied

### History Screen (`/history`)
- [ ] Up to 100 quotes display (MAX_HISTORY cap)
- [ ] Duplicate quote IDs are deduplicated (same quote re-viewed updates position, not count)
- [ ] `viewedAt` timestamps render correctly
- [ ] "Clear history" action empties the list
- [ ] Empty state shown when history is empty

### Profile Modal (`/profile`)
- [ ] Displays saved user name from `useAppStore`
- [ ] Streak count and week data render correctly
- [ ] Editing name updates `useAppStore` and reflects across the app
- [ ] "Reset app" (if present) triggers `useAppStore.resetApp()` and clears all stores

### Mood Screen (`/mood`)
- [ ] All mood options render
- [ ] Selecting a mood saves to `preferences.mood` via `useAppStore.setMood`
- [ ] Mood-based quote filter applies on the home screen after selection

---

## 3. Notifications

### Permission & Setup
- [ ] Choosing a notification time during onboarding requests OS permission
- [ ] If permission is denied, `notificationsEnabled` is set to `false` (not left as `true`)
- [ ] Notification settings survive app restart (stored in MMKV)

### Delivery
- [ ] Push notification fires at the scheduled time (`notificationTime` HH:mm)
- [ ] Notification appears when app is in the background
- [ ] Notification appears when app is completely closed (killed)
- [ ] Notification body contains a real quote (not empty / placeholder text)
- [ ] Notification title matches the app name/branding

### In-App Behavior
- [ ] Tapping the notification opens the app to the home/quote screen
- [ ] If notifications are disabled, no scheduled notifications exist in the OS queue
- [ ] Re-enabling notifications re-schedules them at the stored time

---

## 4. Authentication / Session (Onboarding-based)

> mquotes uses local onboarding state rather than server-auth. These checks cover the equivalent flows.

- [ ] `onboardingComplete: false` → redirects to `/onboarding` on every cold start
- [ ] `onboardingComplete: true` → goes directly to `/` on every cold start
- [ ] `resetApp()` clears `onboardingComplete` and all preferences, returning to onboarding
- [ ] No user data (name, preferences, streak) leaks after a reset
- [ ] MMKV storage keys (`app-store`, `favorites-store`, `mix-store`, `history-store`) are distinct and do not overwrite each other
- [ ] After clearing app data from OS settings and reopening, onboarding starts fresh

---

## 5. Data / API

### Quote Fetching (`lib/quotesApi.ts`)
- [ ] `fetchMultipleRandomQuotes` returns quotes on first app load (cache is empty at cold start)
- [ ] `fetchQuotesByCategory(category)` returns quotes that contain at least one matching keyword
- [ ] `fetchQuotesByMood(moodId)` returns contextually relevant quotes for the selected mood
- [ ] `fetchQuotesByTags(tags)` returns quotes when tags are valid category IDs
- [ ] No duplicate quote IDs appear in a single fetch batch (`seenQuoteTexts` dedup)
- [ ] `convertApiQuote` maps `_id → id`, `content → text` correctly (no undefined fields)
- [ ] API response with `response.ok === false` is caught; error is logged, empty array returned
- [ ] App does not crash when `fetchFromApi` returns `[]` (zero new quotes)
- [ ] `ensureQuotesAvailable` does not enter an infinite loop when API always returns `[]`
- [ ] Quote with missing `_id` field gets fallback ID `zen-{timestamp}`

### Supabase Edge Function
- [ ] `EXPO_PUBLIC_SUPABASE_URL` is set and correctly injected at build time
- [ ] The `/functions/v1/quotes` endpoint returns a valid JSON array of `ApiQuote[]`
- [ ] Response parsing does not throw on unexpected data shapes (extra fields, missing fields)

### Zustand Persistence (MMKV)
- [ ] Favorites persist across app restarts (add → kill app → reopen → favorites present)
- [ ] Mix selection persists across app restarts
- [ ] History persists across app restarts (up to 100 entries)
- [ ] `addFavorite` deduplicates: adding the same quote ID twice results in one entry
- [ ] `addToHistory` deduplicates: re-viewing a quote moves it to the top, does not duplicate
- [ ] `clearFavorites` empties the list and persists the empty state
- [ ] `clearHistory` empties the list and persists the empty state
- [ ] Corrupted/missing MMKV storage does not crash the app (store falls back to defaults)

---

## 6. Performance

### Load Time
- [ ] App reaches the home/quote screen within 3 seconds on a mid-range device
- [ ] First quote is visible before the full `fetchMultipleRandomQuotes` batch completes (loading state handled)
- [ ] Onboarding screen renders immediately without waiting for API calls

### Memory & Leaks
- [ ] Swiping through 50+ quotes does not cause noticeable frame drops
- [ ] Opening and closing the same modal 20 times does not increase memory significantly
- [ ] `cachedQuotes` array does not grow unboundedly — `shift()` correctly removes consumed quotes
- [ ] Animated values (`useSharedValue`) in onboarding do not leak between step transitions

### Low Connectivity
- [ ] App loads with a meaningful state (cached quotes or empty state UI) when offline
- [ ] No crash or unhandled promise rejection when `fetch` throws a network error
- [ ] `fetchFromApi` error is caught and logged; no error propagates to the UI as a crash
- [ ] Switching from offline to online triggers a fresh fetch without requiring a restart

### FlatList / Scroll Performance
- [ ] Favorites list with 50+ items scrolls at 60fps
- [ ] History list with 100 items scrolls at 60fps
- [ ] Mix builder category grid (21 items) has no layout jank

---

## 7. Navigation

### Expo Router Stack
- [ ] `/` (Home) renders on cold start (or after onboarding)
- [ ] `/categories` opens as a modal from home
- [ ] `/themes` opens as a modal from home
- [ ] `/mix/create` opens as a modal from home
- [ ] `/profile` opens as a modal from home
- [ ] `/favorites` pushes as a stack screen from home
- [ ] `/history` pushes as a stack screen from home
- [ ] `/mood` is accessible and navigates correctly
- [ ] `/onboarding` is only shown when `onboardingComplete === false`

### Back Navigation
- [ ] Android hardware back button closes modals correctly (goes to `/`)
- [ ] Android hardware back button on Home does not crash or go blank
- [ ] `router.back()` in modal X buttons returns to the correct previous screen
- [ ] Back button on `/favorites` and `/history` returns to Home (not a blank screen)
- [ ] Pressing back rapidly (double-tap) does not cause a navigation state corruption

### Deep Links & URL Scheme
- [ ] If deep links are configured, tapping a link opens the correct screen
- [ ] Unknown route paths show a 404/not-found screen rather than crashing

### State After Navigation
- [ ] Returning from Themes modal: home screen shows the newly selected theme immediately
- [ ] Returning from Categories modal: home screen shows quotes for the selected category
- [ ] Returning from Mix builder: home screen loads mix-filtered quotes (not stale category)
- [ ] Returning from Favorites: heart icon on home card reflects any un-favorites done in the list
- [ ] Streak count in Profile reflects today's visit (not yesterday's stale value)

---

## 8. Theming & Visual Consistency

- [ ] All 15 themes render without white flashes on navigation
- [ ] `theme.quoteFontFamily` (Playfair Display) loads; no fallback system font visible on quotes
- [ ] `theme.uiFontFamily` (Inter) loads; no fallback system font visible on UI labels
- [ ] `theme.border` color is visible but subtle across all themes (not invisible on dark, not harsh on light)
- [ ] Icon buttons are consistently 48×48, `borderRadius: 14`, `theme.surface` background
- [ ] Drag handle pill is rendered with `theme.border` color (not hardcoded)
- [ ] No hardcoded accent colors (`indigo`, `blue`, etc.) appear in the UI
- [ ] Light themes: text is dark enough to pass contrast ratio AA (4.5:1) against `background`
- [ ] Dark themes: text is light enough to pass contrast ratio AA against `background`

---

## 9. Edge Cases & Stress Tests

- [ ] User name set to 1 character — renders without truncation or layout break
- [ ] User name set to 80 characters — does not overflow container
- [ ] Quote with 500+ characters renders without clipping in the card
- [ ] Quote with 1 word renders without empty whitespace artifacts
- [ ] Favorites store with 100 entries — list scrolls without crash
- [ ] Mix with all 19 categories selected — quote feed loads (may be generic)
- [ ] Mix with `_favorites` selected but 0 favorites — empty state handled, no crash
- [ ] Mix with `_my-quotes` selected but 0 user quotes — empty state handled, no crash
- [ ] Rapidly tapping the favorite button 10 times — ends in correct `isFavorite` state
- [ ] Changing theme mid-swipe gesture — no visual glitch or crash
- [ ] Rotating device (if orientation is not locked) — no layout break
- [ ] Opening app from recent apps (background resume) — correct screen shown, no blank state
- [ ] App interrupted by a phone call — resumes to the same screen without data loss

---

## 10. Device / Platform Compatibility

### iOS
- [ ] Safe area insets respected on iPhone with Dynamic Island (iPhone 15+)
- [ ] Safe area insets respected on iPhone with notch (iPhone 12–14)
- [ ] No overlap with Home Indicator at bottom
- [ ] Fonts load correctly (Playfair Display, Inter via Expo Google Fonts)
- [ ] Haptic feedback (if used) fires correctly

### Android
- [ ] Status bar color matches `theme.background` (no white bar flash)
- [ ] Android back gesture (swipe from edge) behaves the same as hardware back
- [ ] Keyboard does not cover inputs during onboarding name step
- [ ] Fonts load correctly on Android

### Expo Go Specific
- [ ] App loads via Expo Go QR scan without errors in the Metro bundler console
- [ ] No "New Architecture" warnings or crashes (project must stay compatible with Expo Go)
- [ ] Hot reload / fast refresh does not corrupt Zustand store state

---

*Last updated: 2026-03-08 — mquotes-native*
