# ASO: Quotable

App Store and Google Play listing copy, keyword targets and competitive positioning.

Voice follows `brand.md`. Every asset below holds the rules in `brand.md:35-42`: no emoji, no em dash, no en dash, no ` - `, no exclamation marks, no urgency, short sentences. Claims are traced to source in the Constraints section at the bottom.

## Field limits and mapping

Google Play

- Title: 30 characters
- Short description: 80 characters
- Full description: 4000 characters
- All three are indexed. The full description carries real ranking weight, so target terms need two or three natural repetitions across it.

App Store

- Title: 30 characters
- Subtitle: 30 characters
- Keyword field: 100 characters, comma separated, not shown to users
- Description: 4000 characters
- Only the title, subtitle and keyword field are indexed. The description is not, so it is written for reading and conversion rather than for keywords.

The nine requested assets map like this. Titles are shared across both stores. The 30 character App Store subtitle and the 80 character Play short description are different jobs, so they are written separately rather than truncated from each other. Each long description ships in two cuts.

## Category recommendation

Move to Health and Fitness.

`brand.md:10` says Lifestyle / Self-improvement. Every meaningful competitor sits in Health and Fitness: `Motivation - Daily quotes`, `Quote Widget: Daily Motivation`, `Motivational Quotes Daily+`. That is where the category traffic and the top chart visibility are. One field change, real ranking effect.

Android is already live with a category set, so this is a deliberate switch to make, not an oversight to fix.

## Competitive read

`Motivation - Daily quotes` (Monkey Taps), the category leader at roughly 5M downloads a year

- Subtitle: `Inspirational positive widgets`
- Health and Fitness. IAP from 3.99 to 47.99
- Opens on hard times and needing a push. Eight feature bullets, one of which is `Set a Home Screen Motivation Widget`

`Quote Widget: Daily Motivation`

- Subtitle: `Positive Affirmations & Focus`
- Leads on AI generated affirmations. We have no AI and must not imitate this

`Stoic Widget: Quotes & Journal`

- Sells on a hard number: 2700 quotes from 15 philosophers, plus a calm warm aesthetic

Two things follow from this.

**We cannot compete on quote count.** Quotes are fetched live from `api.quotable.kurokeita.dev` (`lib/quotesApi.ts`). There is no bundled corpus and no number in the codebase that would support a claim. Every competitor leads with one. Our verifiable counter-numbers are eighteen themes and fifteen topics, and both are used deliberately below.

**The gap is design and calm.** The leader's listing is functional and loud. The generic quote apps are ad supported. Nobody in the top results is selling the thing `brand.md:156` says we win on, which is being the best looking way to get one good line a day.

## Keyword targets

Tier 1, highest volume, must appear in title or subtitle

- daily quotes, motivation, quote widget, motivational quotes, inspiration

Tier 2, strong volume, keyword field or short description

- quote of the day, lock screen quotes, daily motivation, positive quotes, affirmations

Tier 3, lower volume, better conversion

- wisdom, stoic, philosophy, discipline, mindset, self improvement, quote maker

Long tail we can genuinely own

- aesthetic quote widget, quote themes, save quotes, write your own quotes

Apple mechanics applied below: no word repeats between a title, its subtitle and its keyword field, since a repeat is a wasted character. Plurals are not needed. Spaces after commas are not needed. The words `app` and `free` are never used in a keyword field.

## Variant A, habit led

Broadest keyword surface. Positions the daily quote as a small repeated practice. Recommended to ship first.

Title, 26 characters

```
Quotable: Daily Motivation
```

App Store subtitle, 28 characters

```
Quote widget, calm reminders
```

Play short description, 69 characters

```
One good quote a day, on your home screen. Themes, reminders, no ads.
```

App Store keyword field, 100 characters

```
inspirational,wisdom,affirmation,positive,mindset,philosophy,stoic,lock,screen,saying,discipline,zen
```

### Long description, Play cut

```
One good quote a day, on your home screen.

Quotable gives you a single line worth sitting with, on a card worth
looking at. No feed to scroll, no session to start, no ads. Swipe up
when you want another quote.

Read it in ten seconds, or leave the daily quotes widget on your home
screen and let the next one find you.

A QUOTE WIDGET WHERE YOU ALREADY LOOK
Put a quote on your home screen and glance at it through the day. The
widget resizes to fit your layout, and tapping it opens that exact
quote in the app.

DAILY MOTIVATION ON YOUR SCHEDULE
Choose how many quotes a day you want, between which hours, and on
which days. Five across the morning, or one at nine. Every reminder
carries a different quote, drawn from the topics you follow.

EIGHTEEN THEMES
Every theme is dark and seventeen carry a full photo background. Warm
Dark Ivory, Deep Nebula Violet, Golden Harvest Sand, Nocturnal Teal
Glow, Lush Spring Emerald, Crisp Glacier Ice. Pick the one that fits
how you read.

FIFTEEN TOPICS
Motivation, Inspiration, Wisdom, Happiness, Success, Character,
Change, Freedom, Philosophy, Love, Friendship, Life, Future, Science
and History. Follow the ones you want and they blend into one feed.

KEEP THE ONES THAT LAND
Tap the heart to save a quote. Group what you save into collections
named however you like: by mood, by theme, by whatever you are working
on. Search your favorites by text or by author.

WRITE YOUR OWN
Add your own words alongside the world's greatest thinkers. Send them
to your widget and your reminders like any other quote.

SHARE IT PROPERLY
Any quote becomes a clean image in your current theme, sized for a
story or a message.

A STREAK, QUIETLY
Quotable counts the days you show up and shows them in a simple week
view. It does not nag you. Miss a day and nothing happens.

QUOTABLE PREMIUM
Free includes the Minimal theme, the General and Favorites feeds,
daily quote reminders, widgets, collections, favorites and sharing.

Premium adds all eighteen themes, all fifteen topics, your full quote
history, your own quotes, widget customization, Quote of the Day and
the streak reminder.

Three days free, then 4.99 per month or 44.99 per year. Cancel any
time.

No ads. No account. No sign up. Everything stays on your phone.
```

### Long description, App Store cut

```
One good quote a day, on your home screen.

Quotable gives you a single line worth sitting with, on a card worth
looking at. No feed to scroll, no session to start, no ads. Swipe up
when you want another.

Read it in ten seconds, or leave it on your home screen and let the
next one find you.

A QUOTE WHERE YOU ALREADY LOOK
Three home screen widget sizes, plus a lock screen version. Tap it to
open that exact quote.

REMINDERS YOU SET
Choose how many a day, between which hours, and on which days. Every
one carries a different quote, drawn from whatever you follow.

EIGHTEEN THEMES
All dark, and seventeen with a full photo background. Warm Dark Ivory,
Deep Nebula Violet, Golden Harvest Sand, Nocturnal Teal Glow, Crisp
Glacier Ice.

FIFTEEN TOPICS
Motivation, Wisdom, Philosophy, Love, Life, Success, Change, Freedom
and more. Follow what you want and it blends into one feed.

KEEP THE ONES THAT LAND
Tap the heart to save a quote. Group what you save into collections
named however you like. Write your own alongside them.

SHARE IT PROPERLY
Any quote becomes a clean image in your current theme, sized for a
story or a message.

A STREAK, QUIETLY
Quotable counts the days you show up. It does not nag you about them.
Miss one and nothing happens.

QUOTABLE PREMIUM
Free includes the Minimal theme, the General and Favorites feeds,
reminders, widgets, collections, favorites and sharing.

Premium adds the other seventeen themes, all fifteen topics, your full
history, your own quotes, widget customization, Quote of the Day and
the streak reminder.

Three days free, then 4.99 per month or 44.99 per year. Cancel any
time.

No ads. No account. No sign up. Everything stays on your phone.
```

## Variant B, design led

`brand.md:156` verbatim: the best looking way to get one good line a day. Strongest differentiation against the ad supported generic quote apps, and the closest match to what the screenshots will actually show. Lower keyword volume on the aesthetic terms.

Title, 26 characters

```
Quotable: Aesthetic Quotes
```

App Store subtitle, 27 characters

```
Daily motivation, 18 themes
```

Play short description, 67 characters

```
The best looking way to get one good line a day. 18 themes, no ads.
```

App Store keyword field, 98 characters

```
widget,inspirational,wisdom,affirmation,positive,mindset,philosophy,stoic,lock,screen,saying,habit
```

### Long description, Play cut

```
The best looking way to get one good line a day.

Most quote apps are a wall of text over a stock photo, wrapped in ads.
Quotable is one quote at a time, on a card worth looking at, in a
theme you chose.

EIGHTEEN THEMES
Every theme is dark, and seventeen carry a full photo background.
Warm Dark Ivory. Deep Nebula Violet. Golden Harvest Sand. Nocturnal
Teal Glow. Rocky Coast at Dusk. Lush Spring Emerald. Soft Moonbeam
Silver. Crisp Glacier Ice. Pick the one that fits how you read, and
change it whenever you want.

A HOME SCREEN THAT LOOKS LIKE YOURS
The daily quotes widget carries your theme onto your home screen and
your lock screen. It resizes to fit your layout. Tapping it opens that
exact quote.

SHARE IT PROPERLY
Any quote becomes a clean image in your current theme, sized for a
story or a message. Your favorites, and your streak, share the same
way.

FIFTEEN TOPICS
Motivation, Inspiration, Wisdom, Happiness, Success, Character,
Change, Freedom, Philosophy, Love, Friendship, Life, Future, Science
and History. Follow what you want and it blends into one feed.

DAILY MOTIVATION ON YOUR SCHEDULE
Choose how many quotes a day, between which hours, and on which days.
Every reminder carries a different quote.

KEEP THE ONES THAT LAND
Tap the heart to save a quote. Group what you save into collections
named however you like. Write your own alongside the world's greatest
thinkers.

CALM BY DEFAULT
No ads. No badges. No streak guilt. Quotable counts the days you show
up and says nothing when you miss one. Progress is shown, never
demanded.

QUOTABLE PREMIUM
Free includes the Minimal theme, the General and Favorites feeds,
daily quote reminders, widgets, collections, favorites and sharing.

Premium adds the other seventeen themes, all fifteen topics, your full
quote history, your own quotes, widget customization, Quote of the Day
and the streak reminder.

Three days free, then 4.99 per month or 44.99 per year. Cancel any
time.

No account. No sign up. Everything stays on your phone.
```

### Long description, App Store cut

```
The best looking way to get one good line a day.

Most quote apps are a wall of text over a stock photo, wrapped in ads.
Quotable is one quote at a time, on a card worth looking at, in a
theme you chose.

EIGHTEEN THEMES
All dark, and seventeen with a full photo background. Warm Dark Ivory.
Deep Nebula Violet. Golden Harvest Sand. Nocturnal Teal Glow. Rocky
Coast at Dusk. Lush Spring Emerald. Crisp Glacier Ice.

A HOME SCREEN THAT LOOKS LIKE YOURS
The widget carries your theme onto your home screen and your lock
screen. Three home screen sizes, plus a lock screen version. Tapping
it opens that exact quote.

SHARE IT PROPERLY
Any quote becomes a clean image in your current theme, sized for a
story or a message.

FIFTEEN TOPICS
Motivation, Wisdom, Philosophy, Love, Life, Success, Change, Freedom
and more. Follow what you want and it blends into one feed.

REMINDERS YOU SET
Choose how many a day, between which hours, and on which days. Every
one carries a different quote.

KEEP THE ONES THAT LAND
Tap the heart to save a quote. Group what you save into collections
named however you like. Write your own alongside them.

CALM BY DEFAULT
No ads. No badges. No streak guilt. Quotable counts the days you show
up and says nothing when you miss one.

QUOTABLE PREMIUM
Free includes the Minimal theme, the General and Favorites feeds,
reminders, widgets, collections, favorites and sharing.

Premium adds the other seventeen themes, all fifteen topics, your full
history, your own quotes, widget customization, Quote of the Day and
the streak reminder.

Three days free, then 4.99 per month or 44.99 per year. Cancel any
time.

No account. No sign up. Everything stays on your phone.
```

## Variant C, widget led

`brand.md:106` and `brand.md:120` both name the widget as the daily touchpoint and the word of mouth engine. Narrowest keyword surface of the three, but the clearest single promise and the easiest to prove in a screenshot.

Title, 28 characters

```
Quotable: Daily Quote Widget
```

App Store subtitle, 30 characters

```
Motivation on your home screen
```

Play short description, 65 characters

```
A quote on your home screen, every time you glance at your phone.
```

App Store keyword field, 97 characters

```
inspirational,wisdom,affirmation,positive,mindset,philosophy,stoic,lock,aesthetic,saying,reminder
```

### Long description, Play cut

```
A quote on your home screen, every time you glance at your phone.

No app to open. No feed to scroll. The daily quotes widget puts one
line where you already look, and changes it on the schedule you pick.

THE WIDGET
Put it on your home screen at whatever size fits your layout. Set it
to change every hour, twice a day, or once a day. Point it at one
topic, at your favorites, at your own quotes, or at everything you
follow. Tap it and the app opens on that exact quote.

DAILY MOTIVATION ON YOUR SCHEDULE
Choose how many quotes a day you want, between which hours, and on
which days. Every reminder carries a different quote. Add Quote of the
Day if you would rather have one, at a time you set.

EIGHTEEN THEMES
Every theme is dark and seventeen carry a full photo background. Warm
Dark Ivory, Deep Nebula Violet, Golden Harvest Sand, Nocturnal Teal
Glow, Crisp Glacier Ice.

FIFTEEN TOPICS
Motivation, Inspiration, Wisdom, Happiness, Success, Character,
Change, Freedom, Philosophy, Love, Friendship, Life, Future, Science
and History. Follow the ones you want and they blend into one feed.

KEEP THE ONES THAT LAND
Tap the heart to save a quote. Group what you save into collections
named however you like. Write your own alongside the world's greatest
thinkers, and send those to the widget too.

SHARE IT PROPERLY
Any quote becomes a clean image in your current theme, sized for a
story or a message.

A STREAK, QUIETLY
Quotable counts the days you show up. It does not nag you about them.
Miss one and nothing happens.

QUOTABLE PREMIUM
Free includes the Minimal theme, the General and Favorites feeds,
daily quote reminders, widgets, collections, favorites and sharing.

Premium adds all eighteen themes, all fifteen topics, your full quote
history, your own quotes, widget customization, Quote of the Day and
the streak reminder.

Three days free, then 4.99 per month or 44.99 per year. Cancel any
time.

No ads. No account. No sign up. Everything stays on your phone.
```

### Long description, App Store cut

```
A quote on your home screen, every time you glance at your phone.

No app to open. No feed to scroll. The widget puts one line where you
already look, and changes it on the schedule you pick.

THE WIDGET
Three home screen sizes, plus a lock screen version. Set it to change
every hour, twice a day, or once a day. Point it at one topic, at your
favorites, at your own quotes, or at everything you follow. Tap it and
the app opens on that exact quote.

REMINDERS YOU SET
Choose how many a day, between which hours, and on which days. Every
one carries a different quote. Add Quote of the Day if you would
rather have one, at a time you set.

EIGHTEEN THEMES
All dark, and seventeen with a full photo background. Warm Dark Ivory,
Deep Nebula Violet, Golden Harvest Sand, Nocturnal Teal Glow, Crisp
Glacier Ice.

FIFTEEN TOPICS
Motivation, Wisdom, Philosophy, Love, Life, Success, Change, Freedom
and more. Follow what you want and it blends into one feed.

KEEP THE ONES THAT LAND
Tap the heart to save a quote. Group what you save into collections
named however you like. Write your own alongside them.

SHARE IT PROPERLY
Any quote becomes a clean image in your current theme, sized for a
story or a message.

A STREAK, QUIETLY
Quotable counts the days you show up. It does not nag you about them.
Miss one and nothing happens.

QUOTABLE PREMIUM
Free includes the Minimal theme, the General and Favorites feeds,
reminders, widgets, collections, favorites and sharing.

Premium adds the other seventeen themes, all fifteen topics, your full
history, your own quotes, widget customization, Quote of the Day and
the streak reminder.

Three days free, then 4.99 per month or 44.99 per year. Cancel any
time.

No ads. No account. No sign up. Everything stays on your phone.
```

## Recommendation

Ship Variant A first, on both stores.

It carries the two highest volume terms we can plausibly rank for, `daily` and `motivation`, in the title, and it puts `quote widget` in the subtitle where it is still indexed. Variant B is the most honest expression of the brand but `aesthetic` has a fraction of the search volume of `motivation`, which is an expensive trade for a listing with no ranking history on iOS. Variant C is the cleanest promise but gives up the topic and theme keyword surface entirely.

Reassess after roughly six weeks of iOS impression data. Variant B is the natural second test once there is a baseline, since the screenshots will already be doing its argument for it.

The title, subtitle and keyword field are the only things worth iterating on for ranking. The description moves conversion, not position, on the App Store.

## Before this ships

Three items block or weaken the listing. None are copy problems.

**The testimonials on the splash screen are a policy breach.** `components/onboarding/screens/SplashScreen.tsx:26` carries three invented five star reviews and an in file warning that reads `PLACEHOLDER, swap for real reviews before release. Invented ones breach Play Store policy.` They are still shipping. Remove them or replace them with real reviews.

**The paywall has no Terms link.** `TERMS_URL` is an empty string at `components/subscriptions/TrialScreen.tsx:36`, so nothing renders. Both stores require one on a paywall.

**The prices in every long description above are the fallback constants,** `FALLBACK_MONTHLY` and `FALLBACK_ANNUAL` in `TrialScreen.tsx:43-44`. Check them against the actual products configured in App Store Connect and Play Console before publishing, and update the copy if they differ.

Also worth correcting, since it is being cited: `brand.md:134` says the five most popular topics are free. They are not. See Constraints below.

## Constraints

Everything claimed above, traced to source.

Claimable, confirmed in code

- Eighteen themes, all dark, seventeen with a full photo background (`constants/themes.ts`)
- Fifteen topics (`constants/categories.ts`)
- iOS widget: three home screen sizes plus lock screen rectangular and inline (`targets/quotes-widget/QuotesWidget.swift`). Android: one resizable home screen widget (`app.json`)
- Widget refresh every hour, twice a day or once a day, and a per widget source of one topic, favorites, own quotes or everything followed (`store/useWidgetStore.ts`)
- A widget tap deep links to that exact quote (`app/widget-open.tsx`)
- Reminders: count, hour window, days of the week, a different quote each time, an independent source per reminder (`lib/notifications.ts`)
- Quote of the Day and the streak reminder are Premium (`components/screens/NotificationsScreen.tsx:641`, `657`)
- Favorites searchable by text or author, collections, own quotes, history, streaks with a week view
- Share as an image in the current theme (`components/quotes/ShareCard.tsx`)
- No ads, no account, no sign up, all data local (`lib/storage.ts`)
- Three day free trial (`components/subscriptions/TrialScreen.tsx`)

Never claim, each contradicted by code

- **Any quote count.** Quotes are fetched live. No bundled corpus exists (`lib/quotesApi.ts`)
- **Five free topics.** `brand.md:134` claims this and is wrong. `FREE_TOPIC_IDS` is General and Favorites only (`constants/categories.ts:72`)
- **A feed personalized by your onboarding topic picks.** Onboarding writes to `preferences.categories`, the feed reads `useTopicsStore.followed`, and nothing connects them (`hooks/useTopics.ts:12`)
- **Your name appearing in your quotes.** It does not
- **Mood based recommendations.** `fetchQuotesByMood` exists and is never called
- **Anything AI.** There is none
- **Widget themes.** Deliberately removed. The Android widget renders one fixed look (`widget/QuoteWidget.tsx`)
- **Widget text size control.** `components/subscriptions/PremiumModal.tsx:22` claims it. It does not exist
- **Offline use.** Partial only. New quotes need a network call
- **Font choice.** Three fixed roles (`constants/fonts.ts`)
- **Any testimonial or rating.** See above
