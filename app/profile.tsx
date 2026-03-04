import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useAppStore } from '../store/useAppStore';
import { useStreak } from '../hooks/useStreak';
import { useFavoritesStore } from '../store/useFavoritesStore';
import { useHistoryStore } from '../store/useHistoryStore';
import { useRevenueCat } from '../hooks/useRevenueCat';
import { StreakCard } from '../components/ui/StreakCard';

function StatCard({ label, value, theme }: { label: string; value: string | number; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.statValue, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen({ onClose, onOpenThemes }: { onClose?: () => void; onOpenThemes?: () => void }) {
  const theme = useTheme();
  const router = useRouter();
  const { preferences, setPreferences } = useAppStore();
  const { streakCount, weekData } = useStreak();
  const favorites = useFavoritesStore((s) => s.favorites);
  const totalQuotesRead = useHistoryStore((s) => s.totalQuotesRead);
  const { isPro } = useRevenueCat();

  const close = onClose ?? (() => router.back());
  const openThemes = onOpenThemes ?? (() => router.push('/themes'));

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
          </View>

          {/* Subscription Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              SUBSCRIPTION
            </Text>

            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => {
                close();
                router.push('/subscriptions');
              }}
            >
              <MaterialCommunityIcons name="crown-outline" size={20} color={theme.gold} />
              <Text style={[styles.menuText, { color: theme.text, fontFamily: theme.uiFontFamily }]}>Quotes Pro</Text>
              <Text style={[styles.menuValue, { color: theme.textMuted }]}>
                {isPro ? 'Active' : 'Upgrade'}
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Settings */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              SETTINGS
            </Text>

            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={openThemes}
            >
              <MaterialCommunityIcons name="palette-outline" size={20} color={theme.gold} />
              <Text style={[styles.menuText, { color: theme.text, fontFamily: theme.uiFontFamily }]}>Theme</Text>
              <Text style={[styles.menuValue, { color: theme.textMuted }]}>{preferences.theme}</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => router.push('/history')}
            >
              <MaterialCommunityIcons name="history" size={20} color={theme.gold} />
              <Text style={[styles.menuText, { color: theme.text, fontFamily: theme.uiFontFamily }]}>History</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => router.push('/widgets')}
            >
              <MaterialCommunityIcons name="view-grid-plus-outline" size={20} color={theme.gold} />
              <Text style={[styles.menuText, { color: theme.text, fontFamily: theme.uiFontFamily }]}>Widgets</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => router.push('/notifications')}
            >
              <MaterialCommunityIcons name="bell-outline" size={20} color={theme.gold} />
              <Text style={[styles.menuText, { color: theme.text, fontFamily: theme.uiFontFamily }]}>Notifications</Text>
              <Text style={[styles.menuValue, { color: theme.textMuted }]}>
                {preferences.notificationsEnabled ? 'On' : 'Off'}
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
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
