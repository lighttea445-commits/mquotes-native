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

/** Returns the ISO date of the Monday that starts the week containing dateStr */
function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay(); // 0=Sun
  const dayIndex = day === 0 ? 6 : day - 1; // Mon=0..Sun=6
  d.setDate(d.getDate() - dayIndex);
  return d.toISOString().split('T')[0];
}

/** Returns 0=Mon .. 6=Sun for today */
function getTodayDayIndex(): number {
  const day = new Date().getDay(); // 0=Sun
  return day === 0 ? 6 : day - 1;
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
        const todayDayIndex = getTodayDayIndex(); // Mon=0..Sun=6

        // Detect stale rolling-window data from the old format:
        // future days in the current week should never be marked.
        const hasFutureMarks = streak.weekData.some((v, i) => i > todayDayIndex && v);

        /** Rebuild weekData for the current week using streak count as ground truth */
        function rebuildWeekData(count: number): boolean[] {
          const wd: boolean[] = [false, false, false, false, false, false, false];
          const daysThisWeek = Math.min(count, todayDayIndex + 1);
          for (let i = 0; i < daysThisWeek; i++) {
            wd[todayDayIndex - i] = true;
          }
          return wd;
        }

        if (streak.lastVisitDate === today) {
          // Already visited today — only write if stale data needs fixing
          if (hasFutureMarks) {
            set({ streak: { ...streak, weekData: rebuildWeekData(streak.count) } });
          }
          return;
        }

        // Determine clean weekData for the new visit
        let weekData: boolean[];
        if (streak.lastVisitDate === '' || getWeekStart(today) !== getWeekStart(streak.lastVisitDate)) {
          // New week or first ever visit — start fresh
          weekData = [false, false, false, false, false, false, false];
        } else if (hasFutureMarks) {
          // Stale rolling-window data in the same week — reconstruct from streak count
          weekData = rebuildWeekData(streak.count);
        } else {
          weekData = [...streak.weekData];
        }
        weekData[todayDayIndex] = true;

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
