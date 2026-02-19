export interface Category {
  id: string;
  name: string;
  icon: string; // MaterialCommunityIcons or Ionicons name
  color: string;
}

export const CATEGORIES: Category[] = [
  { id: 'motivation', name: 'Motivation', icon: 'fire', color: '#F97316' },
  { id: 'success', name: 'Success', icon: 'trophy', color: '#EAB308' },
  { id: 'mindfulness', name: 'Mindfulness', icon: 'flower', color: '#22C55E' },
  { id: 'self-love', name: 'Self Love', icon: 'heart', color: '#EC4899' },
  { id: 'growth', name: 'Growth', icon: 'sprout', color: '#16A34A' },
  { id: 'happiness', name: 'Happiness', icon: 'weather-sunny', color: '#FCD34D' },
  { id: 'courage', name: 'Courage', icon: 'shield', color: '#6366F1' },
  { id: 'love', name: 'Love', icon: 'heart-multiple', color: '#F43F5E' },
  { id: 'hope', name: 'Hope', icon: 'weather-sunset-up', color: '#FB923C' },
  { id: 'strength', name: 'Strength', icon: 'arm-flex', color: '#7C3AED' },
  { id: 'wisdom', name: 'Wisdom', icon: 'book-open-variant', color: '#0EA5E9' },
  { id: 'time', name: 'Time', icon: 'timer-sand', color: '#A78BFA' },
  { id: 'nature', name: 'Nature', icon: 'tree', color: '#15803D' },
  { id: 'change', name: 'Change', icon: 'refresh', color: '#14B8A6' },
  { id: 'friendship', name: 'Friendship', icon: 'account-group', color: '#F59E0B' },
  { id: 'solitude', name: 'Solitude', icon: 'moon-waning-crescent', color: '#64748B' },
  { id: 'ambition', name: 'Ambition', icon: 'target', color: '#DC2626' },
  { id: 'death', name: 'Mortality', icon: 'infinity', color: '#374151' },
  { id: 'peace', name: 'Peace', icon: 'feather', color: '#06B6D4' },
];

export const SPECIAL_CATEGORIES = [
  { id: '_favorites', name: 'My Favorites', icon: 'heart', color: '#EF4444' },
  { id: '_myquotes', name: 'My Quotes', icon: 'pencil', color: '#8B5CF6' },
];
