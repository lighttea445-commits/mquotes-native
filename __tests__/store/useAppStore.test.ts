/**
 * Unit tests for useAppStore Zustand store
 */

// Mock MMKV and Zustand persist
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn().mockReturnValue(undefined),
    set: jest.fn(),
    delete: jest.fn(),
    clearAll: jest.fn(),
    getBoolean: jest.fn().mockReturnValue(undefined),
    getNumber: jest.fn().mockReturnValue(undefined),
  })),
}));

jest.mock('../../lib/storage', () => ({
  storage: {
    getString: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    clearAll: jest.fn(),
  },
  zustandMMKVStorage: {
    getItem: jest.fn().mockReturnValue(null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

beforeEach(() => {
  jest.resetModules();
});

describe('useAppStore', () => {
  it('starts with onboardingComplete = false', async () => {
    const { useAppStore } = await import('../../store/useAppStore');
    const state = useAppStore.getState();
    expect(state.onboardingComplete).toBe(false);
  });

  it('sets onboardingComplete to true on completeOnboarding()', async () => {
    const { useAppStore } = await import('../../store/useAppStore');
    useAppStore.getState().completeOnboarding();
    expect(useAppStore.getState().onboardingComplete).toBe(true);
  });

  it('updates theme preference', async () => {
    const { useAppStore } = await import('../../store/useAppStore');
    useAppStore.getState().setTheme('midnight');
    expect(useAppStore.getState().preferences.theme).toBe('midnight');
  });

  it('updates name preference', async () => {
    const { useAppStore } = await import('../../store/useAppStore');
    useAppStore.getState().setName('Alice');
    expect(useAppStore.getState().preferences.name).toBe('Alice');
  });

  it('sets and clears mood', async () => {
    const { useAppStore } = await import('../../store/useAppStore');
    useAppStore.getState().setMood('happy');
    expect(useAppStore.getState().preferences.mood).toBe('happy');
    useAppStore.getState().setMood(null);
    expect(useAppStore.getState().preferences.mood).toBeNull();
  });

  it('updates streak on first visit', async () => {
    const { useAppStore } = await import('../../store/useAppStore');
    // Reset
    useAppStore.getState().resetApp();
    useAppStore.getState().updateStreak();
    const streak = useAppStore.getState().streak;
    expect(streak.count).toBe(1);
    expect(streak.lastVisitDate).toBeTruthy();
  });

  it('does not double-count streak on same day', async () => {
    const { useAppStore } = await import('../../store/useAppStore');
    useAppStore.getState().resetApp();
    useAppStore.getState().updateStreak();
    const count1 = useAppStore.getState().streak.count;
    useAppStore.getState().updateStreak();
    const count2 = useAppStore.getState().streak.count;
    expect(count1).toBe(count2);
  });

  it('dismisses streak banner', async () => {
    const { useAppStore } = await import('../../store/useAppStore');
    useAppStore.setState({ showStreakBanner: true });
    useAppStore.getState().dismissStreakBanner();
    expect(useAppStore.getState().showStreakBanner).toBe(false);
  });
});
