/**
 * Unit tests for useAppStore Zustand store
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  jest.resetModules();
});

describe('useAppStore', () => {
  it('starts with onboardingComplete = false', () => {
    const { useAppStore } = require('../../store/useAppStore');
    expect(useAppStore.getState().onboardingComplete).toBe(false);
  });

  it('sets onboardingComplete to true on completeOnboarding()', () => {
    const { useAppStore } = require('../../store/useAppStore');
    useAppStore.getState().completeOnboarding();
    expect(useAppStore.getState().onboardingComplete).toBe(true);
  });

  it('updates theme preference', () => {
    const { useAppStore } = require('../../store/useAppStore');
    useAppStore.getState().setTheme('midnight');
    expect(useAppStore.getState().preferences.theme).toBe('midnight');
  });

  it('updates name preference', () => {
    const { useAppStore } = require('../../store/useAppStore');
    useAppStore.getState().setName('Alice');
    expect(useAppStore.getState().preferences.name).toBe('Alice');
  });

  it('sets and clears mood', () => {
    const { useAppStore } = require('../../store/useAppStore');
    useAppStore.getState().setMood('happy');
    expect(useAppStore.getState().preferences.mood).toBe('happy');
    useAppStore.getState().setMood(null);
    expect(useAppStore.getState().preferences.mood).toBeNull();
  });

  it('updates streak on first visit', () => {
    const { useAppStore } = require('../../store/useAppStore');
    useAppStore.getState().resetApp();
    useAppStore.getState().updateStreak();
    const streak = useAppStore.getState().streak;
    expect(streak.count).toBe(1);
    expect(streak.lastVisitDate).toBeTruthy();
  });

  it('does not double-count streak on same day', () => {
    const { useAppStore } = require('../../store/useAppStore');
    useAppStore.getState().resetApp();
    useAppStore.getState().updateStreak();
    const count1 = useAppStore.getState().streak.count;
    useAppStore.getState().updateStreak();
    const count2 = useAppStore.getState().streak.count;
    expect(count1).toBe(count2);
  });

  it('dismisses streak banner', () => {
    const { useAppStore } = require('../../store/useAppStore');
    useAppStore.setState({ showStreakBanner: true });
    useAppStore.getState().dismissStreakBanner();
    expect(useAppStore.getState().showStreakBanner).toBe(false);
  });

  it('continues streak when last visit was yesterday', () => {
    const { useAppStore } = require('../../store/useAppStore');
    useAppStore.getState().resetApp();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().slice(0, 10);
    useAppStore.setState({
      streak: { count: 3, lastVisitDate: yStr, weekData: [false, false, false, false, false, false, false] },
    });
    useAppStore.getState().updateStreak();
    expect(useAppStore.getState().streak.count).toBe(4);
    expect(useAppStore.getState().showStreakBanner).toBe(true);
  });

  it('resets streak to 1 without banner when more than one day has passed', () => {
    const { useAppStore } = require('../../store/useAppStore');
    useAppStore.getState().resetApp();
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const oldDate = threeDaysAgo.toISOString().slice(0, 10);
    useAppStore.setState({
      streak: { count: 10, lastVisitDate: oldDate, weekData: [false, false, false, false, false, false, false] },
    });
    useAppStore.getState().updateStreak();
    expect(useAppStore.getState().streak.count).toBe(1);
    expect(useAppStore.getState().showStreakBanner).toBe(false);
  });

  it('marks today in weekData when visiting', () => {
    const { useAppStore } = require('../../store/useAppStore');
    useAppStore.getState().resetApp();
    useAppStore.getState().updateStreak();
    const { weekData } = useAppStore.getState().streak;
    const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
    expect(weekData[todayIdx]).toBe(true);
  });

  it('does not mark future days in weekData', () => {
    const { useAppStore } = require('../../store/useAppStore');
    useAppStore.getState().resetApp();
    useAppStore.getState().updateStreak();
    const { weekData } = useAppStore.getState().streak;
    const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
    for (let i = todayIdx + 1; i < 7; i++) {
      expect(weekData[i]).toBe(false);
    }
  });

  it('truncates name to 50 chars', () => {
    const { useAppStore } = require('../../store/useAppStore');
    useAppStore.getState().setName('A'.repeat(100));
    expect(useAppStore.getState().preferences.name.length).toBe(50);
  });

  it('resetApp restores all defaults', () => {
    const { useAppStore } = require('../../store/useAppStore');
    useAppStore.getState().setTheme('rose-sky');
    useAppStore.getState().completeOnboarding();
    useAppStore.getState().updateStreak();
    useAppStore.getState().resetApp();
    const state = useAppStore.getState();
    expect(state.onboardingComplete).toBe(false);
    expect(state.streak.count).toBe(0);
    expect(state.preferences.theme).toBe('minimal');
  });

  it('counts each review prompt and stamps when it was raised', () => {
    const { useAppStore } = require('../../store/useAppStore');
    useAppStore.getState().resetApp();
    expect(useAppStore.getState().reviewPrompt.attempts).toBe(0);
    expect(useAppStore.getState().reviewPrompt.lastPromptAt).toBeNull();

    useAppStore.getState().noteReviewPromptShown();
    useAppStore.getState().noteReviewPromptShown();
    expect(useAppStore.getState().reviewPrompt.attempts).toBe(2);
    expect(useAppStore.getState().reviewPrompt.lastPromptAt).toEqual(expect.any(String));

    useAppStore.getState().resetApp();
    expect(useAppStore.getState().reviewPrompt.attempts).toBe(0);
    expect(useAppStore.getState().reviewPrompt.lastPromptAt).toBeNull();
  });

  it('returns a 0 gap on the very first foreground open', () => {
    const { useAppStore } = require('../../store/useAppStore');
    useAppStore.getState().resetApp();
    const gap = useAppStore.getState().noteForegroundOpen();
    expect(gap).toBe(0);
    expect(useAppStore.getState().lastForegroundAt).toBeGreaterThan(0);
  });

  it('returns the elapsed gap on subsequent foreground opens', () => {
    const { useAppStore } = require('../../store/useAppStore');
    useAppStore.getState().resetApp();
    useAppStore.setState({ lastForegroundAt: Date.now() - 100_000 });
    const gap = useAppStore.getState().noteForegroundOpen();
    expect(gap).toBeGreaterThanOrEqual(100_000);
  });

  it('sets and clears the return nudge type', () => {
    const { useAppStore } = require('../../store/useAppStore');
    useAppStore.getState().resetApp();
    expect(useAppStore.getState().returnNudgeType).toBeNull();
    useAppStore.getState().setReturnNudgeType('notifications');
    expect(useAppStore.getState().returnNudgeType).toBe('notifications');
    useAppStore.getState().setReturnNudgeType('widget');
    expect(useAppStore.getState().returnNudgeType).toBe('widget');
    useAppStore.getState().resetApp();
    expect(useAppStore.getState().returnNudgeType).toBeNull();
  });
});
