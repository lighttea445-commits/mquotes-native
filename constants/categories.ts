import type { IconName } from './icons';

/** Themed groups shown as sections on the topics screen. */
export type TopicGroup = 'popular' | 'mindset' | 'relationships' | 'horizons';

export const TOPIC_GROUP_TITLES: Record<TopicGroup, string> = {
  popular:       'Most popular',
  mindset:       'Improve your mindset',
  relationships: 'Elevate your relationships',
  horizons:      'Broaden your horizons',
};

/** Section order on the topics screen. */
export const TOPIC_GROUP_ORDER: TopicGroup[] = ['popular', 'mindset', 'relationships', 'horizons'];

export interface Category {
  id: string;        // lowercased slug used as internal key
  name: string;      // display name
  icon: IconName;    // resolved to a glyph by constants/icons.ts
  color: string;
  group: TopicGroup;
  apiTag: string;    // exact Quotable API tag name (e.g. 'Wisdom')
}

export const CATEGORIES: Category[] = [
  // ── Most popular ───────────────────────────────────────────────────────────
  { id: 'motivational',  name: 'Motivation',  icon: 'fire',              color: '#F97316', group: 'popular',       apiTag: 'Motivational'  },
  { id: 'inspirational', name: 'Inspiration', icon: 'weather-sunset-up', color: '#FB923C', group: 'popular',       apiTag: 'Inspirational' },
  { id: 'wisdom',        name: 'Wisdom',      icon: 'book-open-variant', color: '#0EA5E9', group: 'popular',       apiTag: 'Wisdom'        },
  { id: 'happiness',     name: 'Happiness',   icon: 'weather-sunny',     color: '#FCD34D', group: 'popular',       apiTag: 'Happiness'     },
  { id: 'success',       name: 'Success',     icon: 'trophy',            color: '#EAB308', group: 'popular',       apiTag: 'Success'       },
  // ── Improve your mindset ──────────────────────────────────────────────────
  { id: 'character',     name: 'Character',   icon: 'shield',            color: '#7C3AED', group: 'mindset',       apiTag: 'Character'     },
  { id: 'change',        name: 'Change',      icon: 'refresh',           color: '#14B8A6', group: 'mindset',       apiTag: 'Change'        },
  { id: 'freedom',       name: 'Freedom',     icon: 'feather',           color: '#16A34A', group: 'mindset',       apiTag: 'Freedom'       },
  { id: 'philosophy',    name: 'Philosophy',  icon: 'head-snowflake',    color: '#6366F1', group: 'mindset',       apiTag: 'Philosophy'    },
  // ── Elevate your relationships ────────────────────────────────────────────
  { id: 'love',          name: 'Love',        icon: 'heart-multiple',    color: '#F43F5E', group: 'relationships', apiTag: 'Love'          },
  { id: 'friendship',    name: 'Friendship',  icon: 'account-group',     color: '#F59E0B', group: 'relationships', apiTag: 'Friendship'    },
  // ── Broaden your horizons ─────────────────────────────────────────────────
  { id: 'life',          name: 'Life',        icon: 'flower',            color: '#22C55E', group: 'horizons',      apiTag: 'Life'          },
  { id: 'future',        name: 'Future',      icon: 'rocket-launch',     color: '#A78BFA', group: 'horizons',      apiTag: 'Future'        },
  { id: 'science',       name: 'Science',     icon: 'atom',              color: '#0891B2', group: 'horizons',      apiTag: 'Science'       },
  { id: 'history',       name: 'History',     icon: 'book-clock',        color: '#92400E', group: 'horizons',      apiTag: 'History'       },
];

// ── Special topics ───────────────────────────────────────────────────────────
// Followable like any other topic, but sourced locally rather than from the API.

export const TOPIC_GENERAL = '_general';
export const TOPIC_FAVORITES = '_favorites';
export const TOPIC_MYQUOTES = '_myquotes';

export interface SpecialTopic {
  id: string;
  name: string;
  icon: IconName;
  /** Pro-only, matching how the underlying screen is gated. */
  pro?: boolean;
}

export const SPECIAL_TOPICS: SpecialTopic[] = [
  { id: TOPIC_GENERAL,   name: 'General',   icon: 'apps'           },
  { id: TOPIC_FAVORITES, name: 'Favorites', icon: 'heart-outline'  },
  { id: TOPIC_MYQUOTES,  name: 'My quotes', icon: 'feather', pro: true },
];

/**
 * Free without Premium: General and Favorites only. Every CATEGORIES topic
 * shows a lock and routes to the paywall.
 */
export const FREE_TOPIC_IDS: string[] = [
  TOPIC_GENERAL,
  TOPIC_FAVORITES,
];

export function isTopicFree(id: string): boolean {
  return FREE_TOPIC_IDS.includes(id);
}

/** Display name for any topic id, special or not. */
export function getTopicName(id: string): string {
  return (
    SPECIAL_TOPICS.find(t => t.id === id)?.name ??
    CATEGORIES.find(c => c.id === id)?.name ??
    id
  );
}

/** Return the Quotable API tag for a given category id. */
export function getCategoryApiTag(categoryId: string): string {
  const cat = CATEGORIES.find(c => c.id === categoryId);
  return cat?.apiTag ?? (categoryId.charAt(0).toUpperCase() + categoryId.slice(1));
}
