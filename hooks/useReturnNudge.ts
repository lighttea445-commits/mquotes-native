import { useEffect } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { useWidgetStore } from '../store/useWidgetStore';
import { WidgetBridge } from '../modules/widget-bridge';
import { isIOSConfigPending } from '../lib/iosWidget';

const RETURN_THRESHOLD_MS = 24 * 60 * 60 * 1000;

/**
 * iOS can't enumerate placed widgets (see modules/widget-bridge), so "has a
 * widget" there is a proxy: has any config been reported as bound by the
 * extension's mq_seen_<id> stamp (see lib/iosWidget.ts's isIOSConfigPending).
 * Not proof a widget is still pinned, but the closest signal available.
 */
async function hasWidget(): Promise<boolean> {
  if (Platform.OS === 'android') {
    const active = await WidgetBridge.getActiveWidgets();
    return active.length > 0;
  }
  if (Platform.OS === 'ios') {
    const configs = useWidgetStore.getState().configs;
    if (configs.length === 0) return false;
    const pending = await Promise.all(configs.map((c) => isIOSConfigPending(c.id)));
    return pending.some((p) => !p);
  }
  return true;
}

/**
 * Detects the user returning after 24h+ away and, if they're missing a
 * useful piece of setup, surfaces one nudge — notifications takes priority
 * over the widget nudge, and only one shows per qualifying return. Clears
 * itself on the next open once the underlying condition is fixed.
 */
export function useReturnNudge() {
  useEffect(() => {
    function evaluate() {
      if (!useAppStore.getState().onboardingComplete) return;

      const gap = useAppStore.getState().noteForegroundOpen();
      if (gap < RETURN_THRESHOLD_MS) return;

      if (!useAppStore.getState().preferences.notificationsEnabled) {
        useAppStore.getState().setReturnNudgeType('notifications');
        return;
      }

      hasWidget().then((got) => {
        if (!got) useAppStore.getState().setReturnNudgeType('widget');
      });
    }

    function handleAppStateChange(next: AppStateStatus) {
      if (next === 'active') evaluate();
    }

    function start() {
      if (AppState.currentState === 'active') evaluate();
      const sub = AppState.addEventListener('change', handleAppStateChange);
      return () => sub.remove();
    }

    let cleanup: (() => void) | undefined;
    let unsubHydration: (() => void) | undefined;
    if (useAppStore.persist.hasHydrated()) {
      cleanup = start();
    } else {
      unsubHydration = useAppStore.persist.onFinishHydration(() => {
        cleanup = start();
      });
    }

    return () => {
      cleanup?.();
      unsubHydration?.();
    };
  }, []);
}
