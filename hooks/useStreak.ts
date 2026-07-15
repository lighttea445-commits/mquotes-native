import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

export function useStreak() {
  const { streak, showStreakBanner, updateStreak, dismissStreakBanner } = useAppStore();

  useEffect(() => {
    updateStreak();
  }, []);

  return {
    streakCount: streak.count,
    weekData: streak.weekData,
    showStreakBanner,
    dismissStreakBanner,
  };
}
