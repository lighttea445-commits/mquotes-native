import type { IconName } from './icons';

export interface Category {
  id: string;        // lowercased slug used as internal key
  name: string;      // display name
  icon: IconName;    // resolved to a glyph by constants/icons.ts
  color: string;
  section: 'forYou' | 'byType';
  apiTag: string;    // exact Quotable API tag name (e.g. 'Wisdom')
}

export const CATEGORIES: Category[] = [
  // ── For You ───────────────────────────────────────────────────────────────
  { id: 'wisdom',        name: 'Wisdom',      icon: 'book-open-variant', color: '#0EA5E9', section: 'forYou', apiTag: 'Wisdom'        },
  { id: 'inspirational', name: 'Inspiration', icon: 'weather-sunset-up', color: '#FB923C', section: 'forYou', apiTag: 'Inspirational' },
  { id: 'love',          name: 'Love',        icon: 'heart-multiple',    color: '#F43F5E', section: 'forYou', apiTag: 'Love'          },
  { id: 'happiness',     name: 'Happiness',   icon: 'weather-sunny',     color: '#FCD34D', section: 'forYou', apiTag: 'Happiness'     },
  { id: 'life',          name: 'Life',        icon: 'flower',            color: '#22C55E', section: 'forYou', apiTag: 'Life'          },
  { id: 'change',        name: 'Change',      icon: 'refresh',           color: '#14B8A6', section: 'forYou', apiTag: 'Change'        },
  { id: 'friendship',    name: 'Friendship',  icon: 'account-group',     color: '#F59E0B', section: 'forYou', apiTag: 'Friendship'    },
  // ── By Type ───────────────────────────────────────────────────────────────
  { id: 'success',       name: 'Success',     icon: 'trophy',            color: '#EAB308', section: 'byType', apiTag: 'Success'       },
  { id: 'motivational',  name: 'Motivation',  icon: 'fire',              color: '#F97316', section: 'byType', apiTag: 'Motivational'  },
  { id: 'future',        name: 'Future',      icon: 'rocket-launch',     color: '#A78BFA', section: 'byType', apiTag: 'Future'        },
  { id: 'philosophy',    name: 'Philosophy',  icon: 'head-snowflake',    color: '#6366F1', section: 'byType', apiTag: 'Philosophy'    },
  { id: 'character',     name: 'Character',   icon: 'shield',            color: '#7C3AED', section: 'byType', apiTag: 'Character'     },
  { id: 'history',       name: 'History',     icon: 'book-clock',        color: '#92400E', section: 'byType', apiTag: 'History'       },
  { id: 'science',       name: 'Science',     icon: 'atom',              color: '#0891B2', section: 'byType', apiTag: 'Science'       },
  { id: 'freedom',       name: 'Freedom',     icon: 'feather',           color: '#16A34A', section: 'byType', apiTag: 'Freedom'       },
];

export const SPECIAL_CATEGORIES = [
  { id: '_favorites', name: 'My Favorites', icon: 'heart-outline',  color: '#EF4444' },
  { id: '_myquotes',  name: 'My Quotes',    icon: 'pencil-outline', color: '#8B5CF6' },
];

/** Return the Quotable API tag for a given category id. */
export function getCategoryApiTag(categoryId: string): string {
  const cat = CATEGORIES.find(c => c.id === categoryId);
  return cat?.apiTag ?? (categoryId.charAt(0).toUpperCase() + categoryId.slice(1));
}
