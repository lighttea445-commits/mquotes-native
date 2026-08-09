import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

export function useStreak() {
  const streak = useAppStore((s) => s.streak);
  const showStreakBanner = useAppStore((s) => s.showStreakBanner);
  const updateStreak = useAppStore((s) => s.updateStreak);
  const dismissStreakBanner = useAppStore((s) => s.dismissStreakBanner);

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
