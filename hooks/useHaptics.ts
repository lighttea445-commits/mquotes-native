import * as Haptics from 'expo-haptics';
import { useAppStore } from '../store/useAppStore';

export function useHaptics() {
  const hapticsEnabled = useAppStore((s) => s.preferences.hapticsEnabled);

  return {
    impact: (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
      if (hapticsEnabled) Haptics.impactAsync(style);
    },
    notification: (type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success) => {
      if (hapticsEnabled) Haptics.notificationAsync(type);
    },
    selection: () => {
      if (hapticsEnabled) Haptics.selectionAsync();
    },
  };
}
