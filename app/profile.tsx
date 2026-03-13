import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useAppStore } from '../store/useAppStore';
import { useStreak } from '../hooks/useStreak';
import { useFavoritesStore } from '../store/useFavoritesStore';
import { useHistoryStore } from '../store/useHistoryStore';
import { useMixStore } from '../store/useMixStore';
import { useUserQuotesStore } from '../store/useUserQuotesStore';
import { useReflectStore } from '../store/useReflectStore';
import { StreakCard } from '../components/ui/StreakCard';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { useRevenueCat, setForcePro, getForcePro } from '../hooks/useRevenueCat';
import { useModal } from '../contexts/ModalContext';
import { ConfirmSheet } from '../components/ui/ConfirmSheet';

function StatCard({ label, value, theme }: { label: string; value: string | number; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.statValue, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen({ onClose }: { onClose?: () => void }) {
  const theme = useTheme();
  const router = useRouter();
  const { preferences, setPreferences, resetApp } = useAppStore();
  const { streakCount, weekData } = useStreak();
  const favorites = useFavoritesStore((s) => s.favorites);
  const totalQuotesRead = useHistoryStore((s) => s.totalQuotesRead);
  const { isPro, offerings } = useRevenueCat();
  const clearFavorites = useFavoritesStore((s) => s.clearFavorites);
  const clearHistory = useHistoryStore((s) => s.clearHistory);
  const clearMix = useMixStore((s) => s.clearMix);
  const clearUserQuotes = useUserQuotesStore((s) => s.clearUserQuotes);
  const clearReflections = useReflectStore((s) => s.clearReflections);
  const reflectionsCount = useReflectStore((s) => s.reflections.length);
  const modal = useModal();
  const close = onClose ?? (() => router.back());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const openThemes = () => modal ? modal.openSheet('themes') : router.push('/themes');

  const handleHistory = async () => {
    if (isPro) {
      modal ? modal.openSheet('history') : router.push('/history');
    } else {
      const offering = offerings?.all['sale'] ?? offerings?.current ?? undefined;
      const result = await RevenueCatUI.presentPaywall({ offering });
      if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
        modal ? modal.openSheet('history') : router.push('/history');
      }
    }
  };

  const handleJournal = async () => {
    if (isPro) {
      modal ? modal.openSheet('journal') : router.push('/journal');
    } else {
      const offering = offerings?.all['sale'] ?? offerings?.current ?? undefined;
      const result = await RevenueCatUI.presentPaywall({ offering });
      if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
        modal ? modal.openSheet('journal') : router.push('/journal');
      }
    }
  };

  const handleDeleteAccount = () => setShowDeleteConfirm(true);

  const confirmDeleteAccount = () => {
    clearFavorites();
    clearHistory();
    clearMix();
    clearUserQuotes();
    clearReflections();
    resetApp();
    router.replace('/onboarding');
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* Drag handle hidden when used inline (BottomSheet has its own) */}
      {!onClose && (
        <View style={styles.dragHandle}>
          <View style={[styles.dragPill, { backgroundColor: theme.border }]} />
        </View>
      )}

      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={close} style={[styles.closeBtn, { backgroundColor: theme.surface }]}>
            <MaterialCommunityIcons name="close" size={20} color={theme.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
            Profile
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Name section */}
          <View style={styles.nameSection}>
            <Text style={[styles.name, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
              Hey {preferences.name || 'Reader'}
            </Text>
          </View>

          {/* Streak card — gold sun + 7-day tracker */}
          <View style={styles.streakWrapper}>
            <StreakCard streakCount={streakCount} weekData={weekData} />
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <StatCard label="Favorites" value={favorites.length} theme={theme} />
            <StatCard label="Quotes Read" value={totalQuotesRead} theme={theme} />
            <StatCard label="Reflections" value={reflectionsCount} theme={theme} />
          </View>

          {/* Settings */}
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={openThemes}
            >
              <MaterialCommunityIcons name="palette-outline" size={20} color={theme.gold} />
              <Text style={[styles.menuText, { color: theme.text, fontFamily: theme.uiFontFamily }]}>Theme</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={handleHistory}
            >
              <MaterialCommunityIcons name="history" size={20} color={theme.gold} />
              <Text style={[styles.menuText, { color: theme.text, fontFamily: theme.uiFontFamily }]}>History</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={handleJournal}
            >
              <MaterialCommunityIcons name="pencil-outline" size={20} color={theme.gold} />
              <Text style={[styles.menuText, { color: theme.text, fontFamily: theme.uiFontFamily }]}>Reflections</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => modal ? modal.openSheet('widgets') : router.push('/widgets')}
            >
              <MaterialCommunityIcons name="view-grid-plus-outline" size={20} color={theme.gold} />
              <Text style={[styles.menuText, { color: theme.text, fontFamily: theme.uiFontFamily }]}>Widgets</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => modal ? modal.openSheet('notifications') : router.push('/notifications')}
            >
              <MaterialCommunityIcons name="bell-outline" size={20} color={theme.gold} />
              <Text style={[styles.menuText, { color: theme.text, fontFamily: theme.uiFontFamily }]}>Notifications</Text>
              <Text style={[styles.menuValue, { color: theme.textMuted }]}>
                {preferences.notificationsEnabled ? 'On' : 'Off'}
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
            </TouchableOpacity>
            {__DEV__ && (
              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: theme.surface, borderColor: '#B8975A', borderStyle: 'dashed' }]}
                onPress={() => {
                  const current = getForcePro();
                  if (current === null) setForcePro(true);
                  else if (current === true) setForcePro(false);
                  else setForcePro(null);
                }}
              >
                <MaterialCommunityIcons name="test-tube" size={20} color="#B8975A" />
                <Text style={[styles.menuText, { color: '#B8975A', fontFamily: theme.uiFontFamily }]}>
                  Force Pro (dev)
                </Text>
                <Text style={{ color: '#B8975A', fontFamily: theme.uiFontFamily, fontSize: 12 }}>
                  {getForcePro() === null ? 'real' : getForcePro() ? 'ON' : 'OFF'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={handleDeleteAccount}
            >
              <MaterialCommunityIcons name="delete-outline" size={20} color="#EF4444" />
              <Text style={[styles.menuText, { color: '#EF4444', fontFamily: theme.uiFontFamily }]}>Delete Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      <ConfirmSheet
        visible={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Account"
        message="This will permanently erase all your data — favorites, history, quotes, and preferences. This cannot be undone."
        confirmLabel="Delete"
        destructive
        cancelLabel="Cancel"
        onConfirm={confirmDeleteAccount}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  dragHandle: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  dragPill: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  nameSection: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  name: {
    fontSize: 32,
    fontWeight: '700',
  },
  streakWrapper: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 15,
  },
  menuValue: {
    fontSize: 13,
    textTransform: 'capitalize',
  },
});
