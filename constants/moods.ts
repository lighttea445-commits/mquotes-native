export interface Mood {
  id: string;
  name: string;
  emoji: string;
  description: string;
  categories: string[];
}

export const MOODS: Mood[] = [
  {
    id: 'awesome',
    name: 'Awesome',
    emoji: '🌟',
    description: "On top of the world",
    categories: ['happiness', 'success', 'motivation'],
  },
  {
    id: 'good',
    name: 'Good',
    emoji: '😊',
    description: "Feeling solid",
    categories: ['happiness', 'mindfulness', 'growth'],
  },
  {
    id: 'neutral',
    name: 'Neutral',
    emoji: '😐',
    description: "Just existing",
    categories: ['wisdom', 'mindfulness', 'time'],
  },
  {
    id: 'motivated',
    name: 'Motivated',
    emoji: '🔥',
    description: "Ready to go",
    categories: ['motivation', 'success', 'ambition'],
  },
  {
    id: 'sad',
    name: 'Sad',
    emoji: '😢',
    description: "Going through it",
    categories: ['hope', 'self-love', 'strength'],
  },
  {
    id: 'anxious',
    name: 'Anxious',
    emoji: '😰',
    description: "Mind is racing",
    categories: ['mindfulness', 'peace', 'self-love'],
  },
  {
    id: 'lost',
    name: 'Lost',
    emoji: '🧭',
    description: "Finding my way",
    categories: ['growth', 'courage', 'wisdom'],
  },
  {
    id: 'grateful',
    name: 'Grateful',
    emoji: '🙏',
    description: "Counting blessings",
    categories: ['mindfulness', 'happiness', 'love'],
  },
];
