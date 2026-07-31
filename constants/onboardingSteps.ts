import type { UserPreferences } from '../store/useAppStore';
import { CATEGORIES } from './categories';

/**
 * The 30-screen onboarding flow.
 *
 * Copy is reproduced from the reference flow with the product noun swapped
 * ("affirmations" → "quotes"). Question intent, answer options and ordering
 * are unchanged.
 *
 * Every screen with a `bespoke` kind is a hand-built component in
 * `components/onboarding/screens/`; everything else renders from this config.
 * All copy lives here — screens hold no strings.
 */

export type StepKind = 'statement' | 'single' | 'multi' | 'chips' | 'bespoke';

/** Keys on UserPreferences that onboarding writes to. */
export type AnswerKey = Extract<
  keyof UserPreferences,
  | 'attributionSource'
  | 'age'
  | 'gender'
  | 'zodiac'
  | 'habitHelpers'
  | 'mood'
  | 'moodReasons'
  | 'habitBarriers'
  | 'dailyMinutesGoal'
  | 'streakGoalDays'
  | 'beliefVision'
  | 'beliefThoughts'
  | 'beliefRewire'
  | 'categories'
  | 'improveAreas'
>;

export interface StepOption {
  value: string;
  label: string;
  icon?: string;
}

export interface OnboardingStep {
  /** Stable id — used as the React key and for analytics. */
  id: string;
  kind: StepKind;
  /** Supports `{name}` interpolation. */
  headline?: string;
  subhead?: string;
  /** Statement screens only. */
  text?: string;
  options?: StepOption[];
  /** Where the answer is persisted. Absent on statements and some bespoke screens. */
  dataKey?: AnswerKey;
  /** Renders "Skip" in the header. */
  skippable?: boolean;
  /** Answers stored as numbers rather than strings (time/streak goals). */
  numeric?: boolean;
}

/** Replace `{name}` with the user's name, or a neutral fallback when skipped. */
export function interpolate(text: string, name: string): string {
  const trimmed = name.trim();
  // Drop the trailing ", {name}" / " {name}" entirely rather than printing a
  // filler word — "How old are you, friend?" reads worse than "How old are you?".
  if (!trimmed) return text.replace(/,?\s*\{name\}/g, '');
  return text.replace(/\{name\}/g, trimmed);
}

const ZODIAC: StepOption[] = [
  { value: 'Capricorn',   label: 'Capricorn',   icon: 'zodiac-capricorn'   },
  { value: 'Aquarius',    label: 'Aquarius',    icon: 'zodiac-aquarius'    },
  { value: 'Pisces',      label: 'Pisces',      icon: 'zodiac-pisces'      },
  { value: 'Aries',       label: 'Aries',       icon: 'zodiac-aries'       },
  { value: 'Taurus',      label: 'Taurus',      icon: 'zodiac-taurus'      },
  { value: 'Gemini',      label: 'Gemini',      icon: 'zodiac-gemini'      },
  { value: 'Cancer',      label: 'Cancer',      icon: 'zodiac-cancer'      },
  { value: 'Leo',         label: 'Leo',         icon: 'zodiac-leo'         },
  { value: 'Virgo',       label: 'Virgo',       icon: 'zodiac-virgo'       },
  { value: 'Libra',       label: 'Libra',       icon: 'zodiac-libra'       },
  { value: 'Scorpio',     label: 'Scorpio',     icon: 'zodiac-scorpio'     },
  { value: 'Sagittarius', label: 'Sagittarius', icon: 'zodiac-sagittarius' },
];

/**
 * Topics map to the real quote categories rather than the reference's topic
 * labels — these ids drive the feed via `getCategoryApiTag`, so borrowed labels
 * would make the screen decorative.
 */
const TOPIC_CHIPS = CATEGORIES.map((c) => ({ value: c.id, label: c.name }));

export const ONBOARDING_STEPS: OnboardingStep[] = [
  // ── Act I — Identity ──────────────────────────────────────────────────────
  { id: 'splash', kind: 'bespoke' },

  {
    id: 'attribution',
    kind: 'single',
    headline: 'How did you hear about Quotable?',
    subhead: 'Select an option to continue',
    dataKey: 'attributionSource',
    options: [
      { value: 'TikTok',        label: 'TikTok'        },
      { value: 'Instagram',     label: 'Instagram'     },
      { value: 'Facebook',      label: 'Facebook'      },
      { value: 'Google Play',   label: 'Google Play'   },
      { value: 'Web search',    label: 'Web search'    },
      { value: 'Friend/family', label: 'Friend/family' },
      { value: 'Other',         label: 'Other'         },
    ],
  },

  { id: 'name', kind: 'bespoke', skippable: true },

  {
    id: 'age',
    kind: 'single',
    headline: 'How old are you?',
    subhead: 'Your age is used to personalize your content',
    dataKey: 'age',
    skippable: true,
    options: [
      { value: '13 to 17', label: '13 to 17' },
      { value: '18 to 24', label: '18 to 24' },
      { value: '25 to 34', label: '25 to 34' },
      { value: '35 to 44', label: '35 to 44' },
      { value: '45 to 54', label: '45 to 54' },
      { value: '55+',      label: '55+'      },
    ],
  },

  {
    id: 'gender',
    kind: 'single',
    headline: 'Which option represents you best, {name}?',
    subhead: 'Some quotes will use your gender or pronouns',
    dataKey: 'gender',
    skippable: true,
    options: [
      { value: 'Female',             label: 'Female'             },
      { value: 'Male',               label: 'Male'               },
      { value: 'Others',             label: 'Others'             },
      { value: 'Prefer not to say',  label: 'Prefer not to say'  },
    ],
  },

  {
    id: 'zodiac',
    kind: 'single',
    headline: "What's your Zodiac sign?",
    subhead: 'This information will be used to personalize your quotes',
    dataKey: 'zodiac',
    skippable: true,
    options: ZODIAC,
  },

  // ── Act II — Mechanism & notifications ────────────────────────────────────
  {
    id: 'what-are-quotes',
    kind: 'statement',
    text: 'Quotes are short phrases you repeat to yourself',
  },

  {
    id: 'habit-helpers',
    kind: 'multi',
    headline: 'What would help make quotes a daily habit?',
    subhead: 'You can select more than one option',
    dataKey: 'habitHelpers',
    skippable: true,
    options: [
      { value: 'Getting regular reminders', label: 'Getting regular reminders' },
      { value: 'Tracking my progress',      label: 'Tracking my progress'      },
      { value: 'A home screen widget',      label: 'A home screen widget'      },
      { value: 'A guided practice',         label: 'A guided practice'         },
      { value: "I don't know yet",          label: "I don't know yet"          },
    ],
  },

  {
    id: 'repetition',
    kind: 'statement',
    text: 'Through daily repetition, you can change your beliefs and your mindset',
  },

  { id: 'notification-config',     kind: 'bespoke' },
  { id: 'notification-permission', kind: 'bespoke' },

  {
    id: 'lets-see',
    kind: 'statement',
    text: "Let's see what quotes you need right now…",
  },

  // ── Act III — Emotional state ─────────────────────────────────────────────
  {
    id: 'mood',
    kind: 'single',
    headline: 'How have you been feeling lately, {name}?',
    subhead: 'Choose a mood to personalize your content',
    dataKey: 'mood',
    options: [
      { value: 'awesome',  label: 'Awesome',  icon: 'emoticon-excited-outline' },
      { value: 'good',     label: 'Good',     icon: 'emoticon-happy-outline'   },
      { value: 'neutral',  label: 'Neutral',  icon: 'emoticon-neutral-outline' },
      { value: 'bad',      label: 'Bad',      icon: 'emoticon-sad-outline'     },
      { value: 'terrible', label: 'Terrible', icon: 'emoticon-cry-outline'     },
      { value: 'other',    label: 'Other',    icon: 'emoticon-outline'         },
    ],
  },

  {
    id: 'mood-reasons',
    kind: 'multi',
    headline: "What's making you feel that way?",
    subhead: 'You can select more than one option',
    dataKey: 'moodReasons',
    options: [
      { value: 'Family',  label: 'Family',  icon: 'home-heart'    },
      { value: 'Friends', label: 'Friends', icon: 'hand-heart'    },
      { value: 'Work',    label: 'Work',    icon: 'briefcase'     },
      { value: 'Health',  label: 'Health',  icon: 'heart-pulse'   },
      { value: 'Love',    label: 'Love',    icon: 'heart-multiple'},
      { value: 'Other',   label: 'Other',   icon: 'dots-horizontal' },
    ],
  },

  {
    id: 'studies-show',
    kind: 'statement',
    text: 'Studies show daily quotes boost self-confidence, resilience, and overall well-being',
  },

  {
    id: 'habit-barriers',
    kind: 'multi',
    headline: 'What gets in the way of making self-care a habit?',
    subhead: 'You can select more than one option',
    dataKey: 'habitBarriers',
    skippable: true,
    options: [
      { value: 'I lose momentum or forget',     label: 'I lose momentum or forget'     },
      { value: "I haven't found what works",    label: "I haven't found what works"    },
      { value: "I don't see an immediate effect", label: "I don't see an immediate effect" },
      { value: 'I get overwhelmed and give up', label: 'I get overwhelmed and give up' },
      { value: "I don't know where to start",   label: "I don't know where to start"   },
      { value: 'Nothing, I do it every day',    label: 'Nothing, I do it every day'    },
    ],
  },

  {
    id: 'couple-of-weeks',
    kind: 'statement',
    text: "You'll see results in a couple of weeks, practicing just a few minutes a day",
  },

  // ── Act IV — Commitment ───────────────────────────────────────────────────
  {
    id: 'time-goal',
    kind: 'single',
    headline: 'How much time will you devote to quotes?',
    subhead: 'You can change your goal later',
    dataKey: 'dailyMinutesGoal',
    skippable: true,
    numeric: true,
    options: [
      { value: '1',  label: '1 minute a day'   },
      { value: '3',  label: '3 minutes a day'  },
      { value: '10', label: '10 minutes a day' },
    ],
  },

  {
    id: 'streak-goal',
    kind: 'single',
    headline: 'What goal do you want to start with?',
    subhead: 'You can change your goal later',
    dataKey: 'streakGoalDays',
    skippable: true,
    numeric: true,
    options: [
      { value: '3',  label: '3 days in a row'  },
      { value: '7',  label: '7 days in a row'  },
      { value: '21', label: '21 days in a row' },
    ],
  },

  { id: 'streak-visual', kind: 'bespoke' },

  // ── Act V — Belief ladder ─────────────────────────────────────────────────
  {
    id: 'belief-vision',
    kind: 'single',
    headline: 'Do you have a clear vision of the life you want?',
    subhead: 'Choose one to continue',
    dataKey: 'beliefVision',
    skippable: true,
    options: [
      { value: 'Yes, I do',                  label: 'Yes, I do'                  },
      { value: "I'm working on it",          label: "I'm working on it"          },
      { value: 'I take it one day at a time',label: 'I take it one day at a time'},
      { value: 'Not really',                 label: 'Not really'                 },
    ],
  },

  {
    id: 'belief-thoughts',
    kind: 'single',
    headline: 'Do you believe thoughts help shape your reality?',
    subhead: 'Choose one to continue',
    dataKey: 'beliefThoughts',
    skippable: true,
    options: [
      { value: "Yes, I've seen it happen", label: "Yes, I've seen it happen" },
      { value: "I'm open to it",           label: "I'm open to it"           },
      { value: 'Not really',               label: 'Not really'               },
    ],
  },

  {
    id: 'belief-rewire',
    kind: 'single',
    headline: 'Do you know daily quotes rewire your brain?',
    subhead: 'Choose one to continue',
    dataKey: 'beliefRewire',
    skippable: true,
    options: [
      { value: 'Yes, I believe that',            label: 'Yes, I believe that'            },
      { value: "I've heard of it, but I'm not sure", label: "I've heard of it, but I'm not sure" },
      { value: "I didn't know, tell me more",    label: "I didn't know, tell me more"    },
      { value: "I'm skeptical, but open",        label: "I'm skeptical, but open"        },
    ],
  },

  // ── Act VI — Personalization payoff ───────────────────────────────────────
  {
    id: 'topics',
    kind: 'chips',
    headline: 'Which topics are you interested in?',
    subhead: 'This will be used to personalize your feed',
    dataKey: 'categories',
    skippable: true,
    options: TOPIC_CHIPS,
  },

  { id: 'theme', kind: 'bespoke' },

  {
    id: 'improve',
    kind: 'multi',
    headline: 'What do you want to improve?',
    subhead: 'Choose at least one to tailor your content so it resonates with you',
    dataKey: 'improveAreas',
    options: [
      { value: 'Personal growth',   label: 'Personal growth'   },
      { value: 'Positive thinking', label: 'Positive thinking' },
      { value: 'Relationships',     label: 'Relationships'     },
      { value: 'Happiness',         label: 'Happiness'         },
      { value: 'Stress & anxiety',  label: 'Stress & anxiety'  },
      { value: 'Being thankful',    label: 'Being thankful'    },
      { value: 'Loving myself',     label: 'Loving myself'     },
      { value: 'Loving my body',    label: 'Loving my body'    },
    ],
  },

  // ── Act VII — Offer ───────────────────────────────────────────────────────
  {
    id: 'trial-offer',
    kind: 'statement',
    text: 'We offer 3 days of Premium access for free, just for you',
  },

  { id: 'trial-promise', kind: 'bespoke' },
  { id: 'paywall',       kind: 'bespoke' },
  { id: 'widget',        kind: 'bespoke' },
];

export const TOTAL_STEPS = ONBOARDING_STEPS.length;

/** Step index by id — keeps the orchestrator free of magic numbers. */
export const STEP_INDEX: Record<string, number> = Object.fromEntries(
  ONBOARDING_STEPS.map((s, i) => [s.id, i]),
);
