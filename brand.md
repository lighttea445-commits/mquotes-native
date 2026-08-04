# brand.md — Quotable

Brand, voice, audience and monetization. `CLAUDE.md` is the technical source of truth; this file governs everything a user reads or sees.

## What Quotable is

A premium minimalist motivation app. One quote at a time, on a card worth looking at. Every screen is intentional: dark, warm, uncluttered.

**Name:** Quotable
**Category:** Lifestyle / Self-improvement
**Platform:** Android live. iOS built, not yet shipped

**Core promise:** One great quote a day can shift how you see a moment. Quotable makes that easy, beautiful, and personal.

## Visual identity

Near-black backgrounds. Warm off-white text. A single accent per theme. Eighteen themes let users make it theirs without breaking the aesthetic.

**Type:** Peachi for display (quotes, headings, the wordmark). Averta for interface, currently falling back to Inter. Inter for body and legal copy.

**Color:** the app's lightest tone is a warm off-white, never pure white. The default Minimal theme's accent is warm ivory. Other themes run blue, orange, grey and amber.

Three things this document used to claim that are wrong and should not resurface:

- It is not Playfair Display. It is Peachi
- It is not a serif system. Peachi is a display face
- Gold is not the accent. The theme tokens are still named `gold` for historical reasons, but the value is per-theme and the default is ivory

## Product voice

**Calm. Refined. Unhurried.** The app offers, it does not push. Language is minimal and warm, never motivational-poster loud.

This voice governs every string inside the app: screen copy, empty states, buttons, notifications, paywall, accessibility labels, store listing.

### Rules

- No emoji
- No dashes in user-facing copy. No em dashes, no en dashes, no ` - `. Use a colon, a comma, or two sentences
- No exclamation marks
- No urgency, no countdowns, no "don't lose it"
- No second-person scolding
- Short. If a sentence can lose half its words, it should

### Examples

Empty favorites

- Don't: "No favorites yet! Start saving quotes you love."
- Do: "Nothing saved yet. Tap the heart on any quote."

Paywall

- Don't: "Unlock EVERYTHING - limited time!"
- Do: "All 18 themes, your full history, and your own quotes."

Streak notification

- Don't: "Don't break your 6 day streak!"
- Do: "Day six. Here's today's quote."

Error state

- Don't: "Oops! Something went wrong - please try again"
- Do: "Couldn't load quotes. Pull to retry."

## Audience

### Who installs the app

Distribution is short-form video, in the glow-up and self-improvement niche. That is where installs come from, and the acquisition audience is younger and broader than the app's aesthetic suggests.

**Age:** 16 to 30, skewing 18 to 24
**Mindset:** actively working on themselves right now. Trying to become the person they have in mind. Motivated in bursts, and looking for something to hold the momentum
**Behavior:** saves and reshares content that says the thing they were already feeling. Curates their home screen. Screenshots what lands. Judges an app in about two seconds of video

**They follow:** glow-up, discipline, self-improvement and aesthetic creators
**They already use:** TikTok, Instagram, Pinterest, Notes app screenshots, Spotify
**They value:** proof that the change is working, something that looks good enough to show people, low effort to keep up

### What they are actually buying

Not a quote database. A daily moment that feels like the version of themselves they are working toward, and a home screen that reflects it back.

## Acquisition voice

Short-form video has to earn attention in the first second. That voice is allowed to be more direct and higher energy than the app's.

**Permitted in marketing:** punchy openers, direct address, a fast hook, plain confident claims, showing the widget on a real home screen.

**Never, in marketing or anywhere else:** fake urgency, invented statistics, before/after body content, shame or guilt as a hook, "you're lazy" framing, engagement bait, fake scarcity.

### The line

The app never inherits the marketing energy. A viewer arriving from a punchy video should land in something calm, and that contrast is the product working, not a mismatch.

Specifically, none of this leaks into app copy: hype, exclamation marks, urgency, emoji, dashes, streak guilt, or any claim the app cannot keep.

Note also that the current channel and the app's aesthetic are not perfectly matched. The resolution is the split above, not softening the product.

## Decision factors

- **Design quality** — if the app looks cheap, they're out immediately. The first three seconds decide it
- **Quote quality** — generic motivational filler is a dealbreaker. Wisdom, literature and philosophy land harder than platitudes
- **Personalization** — themes, topics, collections, their own quotes. It has to feel like theirs
- **Calm by default** — no dark patterns, no manipulation, no badge walls. Progress is shown, never demanded. Trust is slow to build and fast to lose
- **Widget** — home screen presence is the daily touchpoint and doubles as word of mouth

## Streaks: the line

Quotable has streaks. They are a record of progress, not a mechanic for extracting sessions.

**Allowed:** the flame, the day count, the week view, a chosen streak goal, a quiet banner, one calm reminder at a time the user picked.

**Banned:** guilt copy, loss-aversion framing ("don't lose", "you're about to break"), countdown pressure, nagging repeats, badge walls, anything that punishes a missed day, and anything that makes returning feel like an obligation.

A broken streak gets no comment. It resets and the app moves on.

## Buying triggers

- **The widget moment** — they see a Quotable widget on someone's home screen and want it
- **A quote that lands** — one line stops the scroll. They screenshot it, they share it, then they wonder what else is in there
- **The free ceiling** — a locked theme or the history wall surfaces after they're already invested, not before
- **Wanting it to look like theirs** — one theme is free. The other seventeen are the most common reason to upgrade
- **Sent by someone they trust** — shared in a story or a DM. Almost no friction to install

## Monetization

RevenueCat, entitlement `Quotable Premium`. A single Pro tier, no consumables, no ads ever.

**Free**

- The Minimal theme
- General and Favorites
- The five most popular topics: Motivation, Inspiration, Wisdom, Happiness, Success
- Widgets, notifications, sharing, collections

**Pro**

- The other 17 themes
- The remaining 10 topics
- Full quote history
- My quotes, the user's own additions

**How paywalls are allowed to behave:** shown when the user reaches for a locked thing, never as an interstitial. Dismissible in one tap. Priced and named plainly. No countdown timers, no "last chance", no pre-selected upsells, no dark-pattern cancel flow.

## Positioning

The motivation category splits three ways, and Quotable takes the gap between them.

- **Motivation, ThinkUp and the affirmation apps** own repetition and volume. Reminders all day, recorded affirmations, heavy streak mechanics. Effective and noisy
- **Headspace, Calm and Shine** own guided practice. Bigger commitment, session-based, a real time cost
- **Generic quote apps** own the free tier and look it. Ad-supported, stock backgrounds, no reason to keep the widget

Quotable is the one you leave on your home screen. Ten seconds, no session to start, and it looks good enough to be seen by other people.

**The one thing it wins on:** it is the best-looking way to get one good line a day, and the widget makes that visible to everyone who glances at the phone.
