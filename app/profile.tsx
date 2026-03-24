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
import { useReflectStore } from '../store/useReflectStore';
import { StreakCard } from '../components/ui/StreakCard';
import { StreakShareSheet } from '../components/streak/StreakShareSheet';
import { useRevenueCat, setForcePro, getForcePro } from '../hooks/useRevenueCat';
import { useModal } from '../contexts/ModalContext';

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
  const { preferences } = useAppStore();
  const { streakCount, weekData } = useStreak();
  const favorites = useFavoritesStore((s) => s.favorites);
  const totalQuotesRead = useHistoryStore((s) => s.totalQuotesRead);
  const { isPro } = useRevenueCat();
  const reflectionsCount = useReflectStore((s) => s.reflections.length);
  const modal = useModal();
  const close = onClose ?? (() => router.back());
  const [showStreakShare, setShowStreakShare] = useState(false);

  const openSettings = () => modal ? modal.openSheet('settings') : router.push('/settings');

  const handleHistory = () => {
    if (isPro) {
      modal ? modal.openSheet('history') : router.push('/history');
    } else {
      modal ? modal.openSheet('features') : router.push('/history');
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
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
          <TouchableOpacity onPress={openSettings} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.settingsLink, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>Settings</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Name */}
          <View style={styles.nameSection}>
            <Text style={[styles.name, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
              Hey {preferences.name || 'Reader'}
            </Text>
          </View>

          {/* Streak card */}
          <View style={styles.streakWrapper}>
            <StreakCard streakCount={streakCount} weekData={weekData} />
            <TouchableOpacity
              style={[styles.shareStreakBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => setShowStreakShare(true)}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons name="share-variant-outline" size={16} color={theme.textMuted} />
              <Text style={[styles.shareStreakText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                Share streak
              </Text>
            </TouchableOpacity>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <StatCard label="Favorites" value={favorites.length} theme={theme} />
            <StatCard label="Quotes Read" value={totalQuotesRead} theme={theme} />
            <StatCard label="Reflections" value={reflectionsCount} theme={theme} />
          </View>

          {/* Feature rows */}
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => modal ? modal.openSheet('themes') : router.push('/themes')}
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
              <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {__DEV__ && (
            <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
              <TouchableOpacity
                style={[styles.devItem, { backgroundColor: theme.surface, borderColor: '#B8975A' }]}
                onPress={() => {
                  const current = getForcePro();
                  if (current === null) setForcePro(true);
                  else if (current === true) setForcePro(false);
                  else setForcePro(null);
                }}
              >
                <MaterialCommunityIcons name="test-tube" size={20} color="#B8975A" />
                <Text style={[styles.devText, { fontFamily: theme.uiFontFamily }]}>Force Pro (dev)</Text>
                <Text style={[styles.devValue, { fontFamily: theme.uiFontFamily }]}>
                  {getForcePro() === null ? 'real' : getForcePro() ? 'ON' : 'OFF'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>

      <StreakShareSheet
        visible={showStreakShare}
        streakCount={streakCount}
        onClose={() => setShowStreakShare(false)}
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
  name: {
    fontSize: 32,
    fontWeight: '700',
  },
  streakWrapper: {
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 10,
  },
  shareStreakBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
  },
  shareStreakText: {
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
  },
  statLabel: {
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  settingsLink: {
    fontSize: 14,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 15,
  },
  devItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 12,
  },
  devText: {
    flex: 1,
    fontSize: 15,
    color: '#B8975A',
  },
  devValue: {
    fontSize: 12,
    color: '#B8975A',
  },
});
