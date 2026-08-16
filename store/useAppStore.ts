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
  notificationCount: number; // 1–20, default 5
  notificationStartTime: string; // HH:mm, default "09:00"
  notificationEndTime: string; // HH:mm, default "22:00"
  notificationDays: number[]; // JS weekdays 0=Sun..6=Sat; empty = all 7
  // Sub-type toggles (each independently enabled under the master toggle)
  quotesEnabled: boolean;      // daily random quotes
  notificationShowAuthor: boolean; // show author under quote notification, default false
  /**
   * Second General group. Same shape as the first one and scheduled alongside
   * it, so the user can run one window in the morning and another at night.
   * Off until they turn it on.
   */
  quotes2Enabled: boolean;
  notificationCount2: number;      // 1–20, default 5
  notificationStartTime2: string;  // HH:mm, default "09:00"
  notificationEndTime2: string;    // HH:mm, default "22:00"
  notificationShowAuthor2: boolean;
  qodEnabled: boolean;         // quote of the day
  qodTime: string;             // HH:mm, default "08:00"
  /**
   * Which quotes each reminder is drawn from: 'following', a topic id,
   * '_favorites', '_myquotes', or 'collection:<id>'. Chosen per reminder, so
   * the daily drip and Quote of the Day can sit on different categories.
   */
  notifQuoteSource: string;
  notifQuoteSource2: string;
  notifQodSource: string;
  streakEnabled: boolean;      // streak reminder
  streakTime: string;          // HH:mm, default "21:00"
  /** Master switch for streak counting. Off = no count, no banner, no card. */
  streakTrackingEnabled: boolean;
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

export interface ReviewPromptState {
  /** Cumulative foreground active time, in ms, since the last prompt (or since install). */
  activeMs: number;
  /** Once true, the native review prompt is never triggered again. */
  promptShown: boolean;
}

/** Which "come back" nudge is currently on screen. Only one at a time. */
export type ReturnNudgeType = 'notifications' | 'widget' | null;

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
  /**
   * Latched once the "add 5 favorites" goal has been acknowledged, so the
   * completion toast plays exactly once and never returns if the count dips
   * back under the goal and climbs again.
   */
  favoritesGoalCelebrated: boolean;
  streak: StreakData;
  showStreakBanner: boolean;
  reviewPrompt: ReviewPromptState;
  /** Epoch ms of the last time the app came to the foreground. 0 = never recorded. */
  lastForegroundAt: number;
  returnNudgeType: ReturnNudgeType;

  // Actions
  setPreferences: (prefs: Partial<UserPreferences>) => void;
  setTheme: (themeId: string) => void;
  setMood: (moodId: string | null) => void;
  setName: (name: string) => void;
  completeOnboarding: () => void;
  /** Counts a quote toward the first-run reveal. No-op once past the threshold. */
  noteQuoteViewed: () => void;
  /** Latches the favorites goal so its completion toast never plays again. */
  markFavoritesGoalCelebrated: () => void;
  updateStreak: () => void;
  dismissStreakBanner: () => void;
  /** Adds elapsed foreground time toward the review-prompt threshold. */
  addActiveUsageMs: (ms: number) => void;
  /** Latches the review prompt off so it never fires again. */
  markReviewPromptShown: () => void;
  /** Records a foreground open and returns the gap since the previous one, in ms (0 on the very first open). */
  noteForegroundOpen: () => number;
  setReturnNudgeType: (type: ReturnNudgeType) => void;
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
  quotes2Enabled: false,
  notificationCount2: 5,
  notificationStartTime2: '09:00',
  notificationEndTime2: '22:00',
  notificationShowAuthor2: false,
  qodEnabled: true,
  qodTime: '08:00',
  notifQuoteSource: 'following',
  notifQuoteSource2: 'following',
  notifQodSource: 'following',
  streakEnabled: true,
  streakTime: '21:00',
  streakTrackingEnabled: true,
  hapticsEnabled: true,
  showAuthor: false,
};

const defaultStreak: StreakData = {
  count: 0,
  lastVisitDate: '',
  weekData: [false, false, false, false, false, false, false],
};

const defaultReviewPrompt: ReviewPromptState = {
  activeMs: 0,
  promptShown: false,
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
      favoritesGoalCelebrated: false,
      streak: defaultStreak,
      showStreakBanner: false,
      reviewPrompt: defaultReviewPrompt,
      lastForegroundAt: 0,
      returnNudgeType: null,

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


      noteQuoteViewed: () => {
        const seen = get().postOnboardingQuoteViews;
        // Undefined = not staging; past the threshold = nothing left to reveal.
        if (seen === undefined || seen > QUOTES_BEFORE_REVEAL) return;
        set({ postOnboardingQuoteViews: seen + 1 });
      },

      markFavoritesGoalCelebrated: () => set({ favoritesGoalCelebrated: true }),

      updateStreak: () => {
        // Tracking off — leave the stored streak untouched so turning it back
        // on resumes from where it stopped rather than starting over.
        if (get().preferences.streakTrackingEnabled === false) return;

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

      addActiveUsageMs: (ms) =>
        set((state) => ({
          reviewPrompt: { ...state.reviewPrompt, activeMs: state.reviewPrompt.activeMs + ms },
        })),

      markReviewPromptShown: () =>
        set((state) => ({
          reviewPrompt: { ...state.reviewPrompt, promptShown: true },
        })),

      noteForegroundOpen: () => {
        const prev = get().lastForegroundAt;
        const now = Date.now();
        set({ lastForegroundAt: now });
        return prev === 0 ? 0 : now - prev;
      },

      setReturnNudgeType: (type) => set({ returnNudgeType: type }),

      resetApp: () =>
        set({
          preferences: defaultPreferences,
          onboardingComplete: false,
          favoritesGoalCelebrated: false,
          streak: defaultStreak,
          showStreakBanner: false,
          reviewPrompt: defaultReviewPrompt,
          lastForegroundAt: 0,
          returnNudgeType: null,
        }),
    }),
    {
      name: 'app-store',
      storage: createJSONStorage(() => zustandMMKVStorage),
    },
  ),
);
