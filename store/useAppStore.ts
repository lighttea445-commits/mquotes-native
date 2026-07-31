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
  notificationTime: string; // HH:mm format e.g. "08:00" (legacy, kept for onboarding compat)
  notificationCount: number; // 1–10, default 5
  notificationStartTime: string; // HH:mm, default "09:00"
  notificationEndTime: string; // HH:mm, default "22:00"
  notificationDays: number[]; // JS weekdays 0=Sun..6=Sat; empty = all 7
  // Sub-type toggles (each independently enabled under the master toggle)
  quotesEnabled: boolean;      // daily random quotes
  notificationShowAuthor: boolean; // show author under quote notification, default false
  qodEnabled: boolean;         // quote of the day
  qodTime: string;             // HH:mm, default "08:00"
  reflectEnabled: boolean;     // reflect reminder
  reflectTime: string;         // HH:mm, default "20:00"
  streakEnabled: boolean;      // streak reminder
  streakTime: string;          // HH:mm, default "21:00"
  lastNotifScheduledAt?: string; // ISO timestamp of most recent rescheduleAll call
  goals?: string[]; // onboarding goals (e.g. "Build a daily motivation habit")
  phoneUsage?: string; // daily phone usage range e.g. "2-3 hours"
  age?: string; // age range e.g. "25-34"
  gender?: string; // e.g. "Male", "Female", "Other", "Prefer not to say"
  joyCategories?: string[]; // quote categories the user said bring them joy
  // ── Onboarding answers (all optional; absent on installs from before the rebuild) ──
  zodiac?: string;             // "Capricorn" … "Sagittarius"
  habitHelpers?: string[];     // what would help make quotes a daily habit
  moodReasons?: string[];      // what's driving the current mood
  habitBarriers?: string[];    // what gets in the way of a self-care habit
  dailyMinutesGoal?: number;   // 1 | 3 | 10
  streakGoalDays?: number;     // 3 | 7 | 21
  beliefVision?: string;       // clear vision of the life they want
  beliefThoughts?: string;     // thoughts shape reality
  beliefRewire?: string;       // daily quotes rewire your brain
  improveAreas?: string[];     // "Personal growth", "Positive thinking", …
  hapticsEnabled: boolean;
  lightMode: boolean;
  showAuthor: boolean;
}

/**
 * How many quotes stay stripped back after onboarding. The quote screen shows
 * only the goal pill, share and favourite until this many have been seen, then
 * fades the rest of the interface in.
 */
export const QUOTES_BEFORE_REVEAL = 3;

export interface StreakData {
  count: number;
  lastVisitDate: string; // ISO date string e.g. "2026-02-19"
  weekData: boolean[]; // last 7 days: true = visited
}

interface AppState {
  preferences: UserPreferences;
  onboardingComplete: boolean;
  /**
   * Quotes seen since finishing onboarding, used to stage the first-run reveal
   * on the quote screen.
   *
   * Undefined means "not a fresh finisher" — anyone who onboarded before this
   * existed sees the full interface immediately rather than having chrome
   * hidden from them retroactively.
   */
  postOnboardingQuoteViews?: number;
  streak: StreakData;
  showStreakBanner: boolean;

  // Actions
  setPreferences: (prefs: Partial<UserPreferences>) => void;
  setTheme: (themeId: string) => void;
  setMood: (moodId: string | null) => void;
  setName: (name: string) => void;
  completeOnboarding: () => void;
  /** Replays onboarding on next launch without touching any user data. */
  restartOnboarding: () => void;
  /** Counts a quote toward the first-run reveal. No-op once past the threshold. */
  noteQuoteViewed: () => void;
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
  notificationCount: 5,
  notificationStartTime: '09:00',
  notificationEndTime: '22:00',
  notificationDays: [],  // empty = all 7 days
  quotesEnabled: true,
  notificationShowAuthor: false,
  qodEnabled: true,
  qodTime: '08:00',
  reflectEnabled: true,
  reflectTime: '20:00',
  streakEnabled: true,
  streakTime: '21:00',
  hapticsEnabled: true,
  lightMode: false,
  showAuthor: false,
};

const defaultStreak: StreakData = {
  count: 0,
  lastVisitDate: '',
  weekData: [false, false, false, false, false, false, false],
};

function toLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodayString(): string {
  return toLocalDateString(new Date());
}

function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toLocalDateString(d);
}

/** Returns the ISO date of the Monday that starts the week containing dateStr */
function getWeekStart(dateStr: string): string {
  // Parse as local date to avoid UTC midnight shifting the day in non-UTC timezones
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  const jsDay = d.getDay(); // 0=Sun
  const dayIndex = jsDay === 0 ? 6 : jsDay - 1; // Mon=0..Sun=6
  d.setDate(d.getDate() - dayIndex);
  return toLocalDateString(d);
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
          preferences: { ...state.preferences, name: name.slice(0, 50) },
        })),

      // Seeding the counter here is what opts a user into the staged reveal.
      completeOnboarding: () => set({ onboardingComplete: true, postOnboardingQuoteViews: 0 }),

      restartOnboarding: () => set({ onboardingComplete: false }),

      noteQuoteViewed: () => {
        const seen = get().postOnboardingQuoteViews;
        // Undefined = not staging; past the threshold = nothing left to reveal.
        if (seen === undefined || seen > QUOTES_BEFORE_REVEAL) return;
        set({ postOnboardingQuoteViews: seen + 1 });
      },

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
          const stateUpdate: Partial<AppState> = {};
          if (hasFutureMarks) {
            stateUpdate.streak = { ...streak, weekData: rebuildWeekData(streak.count) };
          }
          // Clear persisted banner so it doesn't re-appear if app was closed mid-animation
          if (get().showStreakBanner) {
            stateUpdate.showStreakBanner = false;
          }
          if (Object.keys(stateUpdate).length > 0) set(stateUpdate);
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
          // First ever visit — streak starts
          newCount = 1;
          showBanner = true;
        } else {
          // Streak broken — resets to 1 but no celebration
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
