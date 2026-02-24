export interface Category {
  id: string;
  name: string;
  icon: string; // MaterialCommunityIcons or Ionicons name
  color: string;
  section: 'forYou' | 'byType';
}

export const CATEGORIES: Category[] = [
  { id: 'wisdom', name: 'Wisdom', icon: 'book-open-variant', color: '#0EA5E9', section: 'forYou' },
  { id: 'growth', name: 'Growth', icon: 'sprout', color: '#16A34A', section: 'forYou' },
  { id: 'love', name: 'Love', icon: 'heart-multiple', color: '#F43F5E', section: 'forYou' },
  { id: 'hope', name: 'Hope', icon: 'weather-sunset-up', color: '#FB923C', section: 'forYou' },
  { id: 'peace', name: 'Peace', icon: 'feather', color: '#06B6D4', section: 'forYou' },
  { id: 'mindfulness', name: 'Mindfulness', icon: 'flower', color: '#22C55E', section: 'forYou' },
  { id: 'self-love', name: 'Self Love', icon: 'heart', color: '#EC4899', section: 'forYou' },
  { id: 'happiness', name: 'Happiness', icon: 'weather-sunny', color: '#FCD34D', section: 'forYou' },
  { id: 'solitude', name: 'Solitude', icon: 'moon-waning-crescent', color: '#64748B', section: 'forYou' },
  { id: 'friendship', name: 'Friendship', icon: 'account-group', color: '#F59E0B', section: 'forYou' },
  { id: 'motivation', name: 'Motivation', icon: 'fire', color: '#F97316', section: 'byType' },
  { id: 'success', name: 'Success', icon: 'trophy', color: '#EAB308', section: 'byType' },
  { id: 'courage', name: 'Courage', icon: 'shield', color: '#6366F1', section: 'byType' },
  { id: 'strength', name: 'Strength', icon: 'arm-flex', color: '#7C3AED', section: 'byType' },
  { id: 'time', name: 'Time', icon: 'timer-sand', color: '#A78BFA', section: 'byType' },
  { id: 'nature', name: 'Nature', icon: 'tree', color: '#15803D', section: 'byType' },
  { id: 'change', name: 'Change', icon: 'refresh', color: '#14B8A6', section: 'byType' },
  { id: 'ambition', name: 'Ambition', icon: 'target', color: '#DC2626', section: 'byType' },
  { id: 'death', name: 'Mortality', icon: 'infinity', color: '#374151', section: 'byType' },
];

export const SPECIAL_CATEGORIES = [
  { id: '_favorites', name: 'My Favorites', icon: 'heart', color: '#EF4444' },
  { id: '_myquotes', name: 'My Quotes', icon: 'pencil', color: '#8B5CF6' },
];
