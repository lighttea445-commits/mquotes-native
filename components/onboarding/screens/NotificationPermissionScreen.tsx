import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../hooks/useTheme';
import { getPermissionStatus } from '../../../lib/notifications';
import { OnboardingHeader } from '../OnboardingHeader';
import { ContinueButton } from '../ContinueButton';
import { BellMoon } from '../art/BellMoon';
import { OB } from '../tokens';

interface Props {
  /** Re-prompts, or deep-links to system settings once the OS says 'denied'. */
  onRetry: () => Promise<boolean>;
  /** Re-reads OS status after returning from settings. */
  onRecheck: () => Promise<boolean>;
  next: () => void;
  back?: () => void;
  progress?: number;
}

/**
 * Recovery screen, shown only when the config step's native prompt was denied
 * (the orchestrator skips it entirely on a grant).
 *
 * Once the OS status is 'denied' it will not prompt again, so the primary
 * action becomes a deep-link to system settings. Returning to the app
 * re-checks, and advances automatically if permission was granted there.
 */
export function NotificationPermissionScreen({
  onRetry,
  onRecheck,
  next,
  back,
  progress,
}: Props) {
  const theme = useTheme();
  const [asking, setAsking] = useState(false);
  const [hardDenied, setHardDenied] = useState(false);

  // `next` is called from an AppState listener that must not be re-subscribed
  // on every render; a ref keeps the callback current without re-binding.
  const nextRef = useRef(next);
  nextRef.current = next;
  const recheckRef = useRef(onRecheck);
  recheckRef.current = onRecheck;

  /**
   * Android's permission dialog can background the app, so the AppState
   * listener and the button handler can both decide to advance off the same
   * grant. Whichever gets there first wins.
   */
  const advanced = useRef(false);
  const advanceOnce = () => {
    if (advanced.current) return;
    advanced.current = true;
    nextRef.current();
  };

  useEffect(() => {
    let alive = true;
    getPermissionStatus().then((s) => alive && setHardDenied(s === 'denied'));
    return () => {
      alive = false;
    };
  }, []);

  // Picks up permission granted in system settings while the app was backgrounded.
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state: AppStateStatus) => {
      if (state !== 'active') return;
      const granted = await recheckRef.current();
      if (granted) advanceOnce();
      else setHardDenied((await getPermissionStatus()) === 'denied');
    });
    return () => sub.remove();
  }, []);

  const handlePrimary = async () => {
    setAsking(true);
    try {
      const granted = await onRetry();
      if (granted) advanceOnce();
    } finally {
      setAsking(false);
    }
  };

  const primaryLabel = asking ? 'Asking…' : hardDenied ? 'Open Settings' : 'Allow';

  return (
    <View style={[np.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={np.safe} edges={['top', 'bottom']}>
        <OnboardingHeader progress={progress} onBack={back} />

        <View style={np.heads}>
          <Text style={[np.headline, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
            Don't miss your daily quotes!
          </Text>
          <Text style={[np.subhead, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
            {hardDenied
              ? 'Notifications are turned off for Quotable. Enable them in Settings to get your daily quotes.'
              : "Allow notifications, it'll have a big impact in your life"}
          </Text>
        </View>

        <View style={np.art}>
          <BellMoon size={230} color={theme.gold} />
        </View>

        <View style={np.footer}>
          <ContinueButton onPress={handlePrimary} label={primaryLabel} disabled={asking} />
          <ContinueButton onPress={advanceOnce} label="I'm not ready yet" variant="ghost" />
        </View>
      </SafeAreaView>
    </View>
  );
}

const np = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  heads: { paddingHorizontal: OB.gutter, paddingTop: 20, paddingBottom: 24 },
  headline: { fontSize: 28, lineHeight: 36, textAlign: 'center' },
  subhead: { fontSize: 15, lineHeight: 21, textAlign: 'center', marginTop: 10 },
  art: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingBottom: 12 },
});
