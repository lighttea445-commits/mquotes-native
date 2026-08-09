import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Linking,
} from 'react-native';
import * as StoreReview from 'expo-store-review';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Icon } from '../ui/Icon';
import { SheetHeader } from '../ui/SheetHeader';
import { useTheme } from '../../hooks/useTheme';
import { useAppStore } from '../../store/useAppStore';
import { useFavoritesStore } from '../../store/useFavoritesStore';
import { useHistoryStore } from '../../store/useHistoryStore';
import { useTopicsStore } from '../../store/useTopicsStore';
import { useCollectionsStore } from '../../store/useCollectionsStore';
import { useUserQuotesStore } from '../../store/useUserQuotesStore';
import { useWidgetStore } from '../../store/useWidgetStore';
import { useModal } from '../../contexts/ModalContext';
import { ConfirmSheet } from '../ui/ConfirmSheet';
import { useRevenueCat, setForcePro } from '../../hooks/useRevenueCat';
import { ON_GOLD } from '../ui/tokens';

export default function SettingsScreen({ onClose, onBack }: { onClose?: () => void; onBack?: () => void }) {
  const theme = useTheme();
  const router = useRouter();
  const modal = useModal();
  const preferences = useAppStore((s) => s.preferences);
  const setName = useAppStore((s) => s.setName);
  const setPreferences = useAppStore((s) => s.setPreferences);
  const resetApp = useAppStore((s) => s.resetApp);
  const [nameValue, setNameValue] = useState(preferences.name || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { isPro } = useRevenueCat();
  const clearFavorites = useFavoritesStore((s) => s.clearFavorites);
  const clearHistory = useHistoryStore((s) => s.clearHistory);
  const resetTopics = useTopicsStore((s) => s.resetTopics);
  const clearCollections = useCollectionsStore((s) => s.clearCollections);
  const clearUserQuotes = useUserQuotesStore((s) => s.clearUserQuotes);
  const clearWidgetConfigs = useWidgetStore((s) => s.clearAll);

  const close = onClose ?? (() => router.back());
  const back = onBack ?? close;

  // Play subscriptions aren't live under com.kovoapps.quotable yet, so the
  // deeplink would land on an empty page — the row stays inert on Android.
  const canManageSubscription = Platform.OS === 'ios';

  const handleNameBlur = () => {
    const trimmed = nameValue.trim();
    if (trimmed !== preferences.name) {
      setName(trimmed);
    }
  };

  const confirmDeleteAccount = () => {
    clearFavorites();
    clearHistory();
    resetTopics();
    clearCollections();
    clearUserQuotes();
    clearWidgetConfigs();
    resetApp();
    router.replace('/onboarding');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <SheetHeader title="Settings" leading="back" onLeadingPress={back} />

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Name */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              YOUR NAME
            </Text>
            <View style={[styles.nameRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Icon name="account-outline" size={20} color={theme.gold} />
              <TextInput
                style={[styles.nameInput, { color: theme.text, fontFamily: theme.uiFontFamily }]}
                value={nameValue}
                onChangeText={setNameValue}
                onBlur={handleNameBlur}
                placeholder="Enter your name"
                placeholderTextColor={theme.textMuted}
                maxLength={50}
                returnKeyType="done"
              />
            </View>
          </View>

          {/* Preferences */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              PREFERENCES
            </Text>

            <View style={[styles.toggleItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Icon name="vibrate" size={20} color={theme.gold} />
              <Text style={[styles.menuText, { color: theme.text, fontFamily: theme.uiFontFamily }]}>Haptics</Text>
              <Switch
                style={styles.switch}
                value={preferences.hapticsEnabled}
                onValueChange={(v) => setPreferences({ hapticsEnabled: v })}
                trackColor={{ false: theme.border, true: theme.gold }}
                thumbColor={preferences.hapticsEnabled ? ON_GOLD : theme.text}
              />
            </View>

            <View style={[styles.toggleItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Icon name="account-outline" size={20} color={theme.gold} />
              <Text style={[styles.menuText, { color: theme.text, fontFamily: theme.uiFontFamily }]}>Show author</Text>
              <Switch
                style={styles.switch}
                value={preferences.showAuthor}
                onValueChange={(v) => setPreferences({ showAuthor: v })}
                trackColor={{ false: theme.border, true: theme.gold }}
                thumbColor={preferences.showAuthor ? ON_GOLD : theme.text}
              />
            </View>


          </View>

          {/* Account */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              ACCOUNT
            </Text>
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
              disabled={!canManageSubscription}
              accessibilityState={{ disabled: !canManageSubscription }}
              onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}
            >
              <Icon
                name="crown-outline"
                size={20}
                color={canManageSubscription ? theme.gold : theme.textMuted}
              />
              <Text style={[styles.menuText, { color: canManageSubscription ? theme.text : theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                Manage Subscription
              </Text>
              {canManageSubscription && (
                <Icon name="chevron-right" size={18} color={theme.textMuted} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: theme.surface, borderColor: theme.border, marginTop: 8 }]}
              onPress={async () => {
                if (await StoreReview.hasAction()) {
                  await StoreReview.requestReview();
                }
              }}
            >
              <Icon name="star-outline" size={20} color={theme.gold} />
              <Text style={[styles.menuText, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
                Rate Quotable
              </Text>
              <Icon name="chevron-right" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Developer */}
          {__DEV__ && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                DEVELOPER
              </Text>
              <View style={[styles.toggleItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Icon name="crown-outline" size={20} color={theme.gold} />
                <Text style={[styles.menuText, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
                  Free Pro
                </Text>
                <Switch
                  style={styles.switch}
                  value={isPro}
                  onValueChange={(v) => setForcePro(v ? true : null)}
                  trackColor={{ false: theme.border, true: theme.gold }}
                  thumbColor={isPro ? ON_GOLD : theme.text}
                />
              </View>
              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: theme.surface, borderColor: theme.border, marginTop: 8 }]}
                onPress={async () => {
                  useAppStore.setState((s) => ({
                    reviewPrompt: { ...s.reviewPrompt, activeMs: 30 * 60 * 1000, promptShown: true },
                  }));
                  if (await StoreReview.hasAction()) {
                    await StoreReview.requestReview();
                  }
                }}
              >
                <Icon name="star-outline" size={20} color={theme.gold} />
                <Text style={[styles.menuText, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
                  Trigger Review Prompt (30min reached)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: theme.surface, borderColor: theme.border, marginTop: 8 }]}
                onPress={() => {
                  useAppStore.setState({ reviewPrompt: { activeMs: 0, promptShown: false } });
                }}
              >
                <Icon name="refresh" size={20} color={theme.gold} />
                <Text style={[styles.menuText, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
                  Reset Review Prompt State
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: theme.surface, borderColor: theme.border, marginTop: 8 }]}
                onPress={() => useAppStore.setState({ returnNudgeType: 'notifications' })}
              >
                <Icon name="bell-outline" size={20} color={theme.gold} />
                <Text style={[styles.menuText, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
                  Trigger Notifications Nudge
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: theme.surface, borderColor: theme.border, marginTop: 8 }]}
                onPress={() => useAppStore.setState({ returnNudgeType: 'widget' })}
              >
                <Icon name="apps" size={20} color={theme.gold} />
                <Text style={[styles.menuText, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
                  Trigger Widget Nudge
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: theme.surface, borderColor: theme.border, marginTop: 8 }]}
                onPress={() => useAppStore.setState({ returnNudgeType: null, lastForegroundAt: 0 })}
              >
                <Icon name="refresh" size={20} color={theme.gold} />
                <Text style={[styles.menuText, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
                  Reset Return Nudge State
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Danger zone */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              DANGER ZONE
            </Text>
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => setShowDeleteConfirm(true)}
            >
              <Icon name="delete-outline" size={20} color="#EF4444" />
              <Text style={[styles.menuText, { color: '#EF4444', fontFamily: theme.uiFontFamily }]}>
                Delete Account
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      <ConfirmSheet
        visible={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Account"
        message="This will permanently erase all your data: favorites, history, quotes, and preferences. This cannot be undone."
        confirmLabel="Delete"
        destructive
        cancelLabel="Cancel"
        onConfirm={confirmDeleteAccount}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  section: {
    paddingHorizontal: 16,
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 8,
    marginLeft: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  nameInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    includeFontPadding: false,
    textAlignVertical: 'center',
    padding: 0,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginBottom: 8,
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    includeFontPadding: false,
  },
  // Android's native Switch reserves ~8px of invisible touch padding around
  // the track, which reads as the knob sitting short of the card's edge next
  // to the flush chevrons on menuItem rows. Pull it back so both line up.
  switch: {
    alignSelf: 'center',
    marginRight: -8,
  },
});
