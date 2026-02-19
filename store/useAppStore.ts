import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandMMKVStorage } from '../lib/storage';
import { DEFAULT_THEME_ID } from '../constants/themes';

export interface UserPreferences {
  name: string;
  theme: string;
  mood: string | null;
  categories: string[];
  notificationsEnabled: boolean;
  notificationTime: string; // HH:mm format e.g. "08:00"
}

export interface StreakData {
  count: number;
  lastVisitDate: string; // ISO date string e.g. "2026-02-19"
  weekData: boolean[]; // last 7 days: true = visited
}

interface AppState {
  preferences: UserPreferences;
  onboardingComplete: boolean;
  streak: StreakData;
  showStreakBanner: boolean;

  // Actions
  setPreferences: (prefs: Partial<UserPreferences>) => void;
  setTheme: (themeId: string) => void;
  setMood: (moodId: string | null) => void;
  setName: (name: string) => void;
  completeOnboarding: () => void;
  updateStreak: () => void;
  dismissStreakBanner: () => void;
  resetApp: () => void;
}

const defaultPreferences: UserPreferences = {
  name: '',
  theme: DEFAULT_THEME_ID,
  mood: null,
  categories: [],
  notificationsEnabled: false,
  notificationTime: '08:00',
};

const defaultStreak: StreakData = {
  count: 0,
  lastVisitDate: '',
  weekData: [false, false, false, false, false, false, false],
};

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      preferences: defaultPreferences,
      onboardingComplete: false,
      streak: defaultStreak,
      showStreakBanner: false,

      setPreferences: (prefs) =>
        set((state) => ({
          preferences: { ...state.preferences, ...prefs },
        })),

      setTheme: (themeId) =>
        set((state) => ({
          preferences: { ...state.preferences, theme: themeId },
        })),

      setMood: (moodId) =>
        set((state) => ({
          preferences: { ...state.preferences, mood: moodId },
        })),

      setName: (name) =>
        set((state) => ({
          preferences: { ...state.preferences, name },
        })),

      completeOnboarding: () => set({ onboardingComplete: true }),

      updateStreak: () => {
        const { streak } = get();
        const today = getTodayString();
        const yesterday = getYesterdayString();

        if (streak.lastVisitDate === today) return; // Already visited today

        const weekData = [...streak.weekData];
        // Shift week data left, add today as true
        weekData.shift();
        weekData.push(true);

        let newCount = streak.count;
        let showBanner = false;

        if (streak.lastVisitDate === yesterday) {
          // Continuing streak
          newCount = streak.count + 1;
          showBanner = true;
        } else if (streak.lastVisitDate === '') {
          // First ever visit
          newCount = 1;
        } else {
          // Streak broken
          newCount = 1;
        }

        set({
          streak: {
            count: newCount,
            lastVisitDate: today,
            weekData,
          },
          showStreakBanner: showBanner,
        });
      },

      dismissStreakBanner: () => set({ showStreakBanner: false }),

      resetApp: () =>
        set({
          preferences: defaultPreferences,
          onboardingComplete: false,
          streak: defaultStreak,
          showStreakBanner: false,
        }),
    }),
    {
      name: 'app-store',
      storage: createJSONStorage(() => zustandMMKVStorage),
    },
  ),
);
