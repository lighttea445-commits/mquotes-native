import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ThemeBackground } from '../../components/layout/ThemeBackground';
import { useTheme } from '../../hooks/useTheme';
import { useAppStore } from '../../store/useAppStore';
import { useStreak } from '../../hooks/useStreak';
import { useFavoritesStore } from '../../store/useFavoritesStore';
import { useHistoryStore } from '../../store/useHistoryStore';

function WeekHeatmap({ weekData, theme }: { weekData: boolean[]; theme: ReturnType<typeof useTheme> }) {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return (
    <View style={styles.heatmap}>
      {weekData.map((active, i) => (
        <View key={i} style={styles.dayContainer}>
          <View style={[
            styles.dayDot,
            {
              backgroundColor: active ? theme.accent : theme.surface,
              borderColor: theme.border,
            },
          ]} />
          <Text style={[styles.dayLabel, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
            {days[i]}
          </Text>
        </View>
      ))}
    </View>
  );
}

function StatCard({ label, value, theme }: { label: string; value: string | number; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.statValue, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { preferences, setPreferences } = useAppStore();
  const { streakCount, weekData } = useStreak();
  const favorites = useFavoritesStore((s) => s.favorites);
  const history = useHistoryStore((s) => s.history);

  return (
    <ThemeBackground>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={[styles.greeting, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              Welcome back
            </Text>
            <Text style={[styles.name, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
              {preferences.name || 'Reader'}
            </Text>
          </View>

          {/* Streak card */}
          <View style={[styles.streakCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.streakTop}>
              <Text style={{ fontSize: 32 }}>🔥</Text>
              <View>
                <Text style={[styles.streakNumber, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
                  {streakCount}
                </Text>
                <Text style={[styles.streakLabel, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                  day streak
                </Text>
              </View>
            </View>
            <WeekHeatmap weekData={weekData} theme={theme} />
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <StatCard label="Favorites" value={favorites.length} theme={theme} />
            <StatCard label="Quotes Read" value={history.length} theme={theme} />
          </View>

          {/* Actions */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              SETTINGS
            </Text>

            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => router.push('/themes')}
            >
              <Text style={{ fontSize: 20 }}>◑</Text>
              <Text style={[styles.menuText, { color: theme.text, fontFamily: theme.uiFontFamily }]}>Theme</Text>
              <Text style={[styles.menuValue, { color: theme.textMuted }]}>{preferences.theme}</Text>
              <Text style={{ color: theme.textMuted }}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => router.push('/history')}
            >
              <Text style={{ fontSize: 20 }}>⌚</Text>
              <Text style={[styles.menuText, { color: theme.text, fontFamily: theme.uiFontFamily }]}>History</Text>
              <Text style={{ color: theme.textMuted }}>›</Text>
            </TouchableOpacity>

            <View style={[styles.menuItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={{ fontSize: 20 }}>🔔</Text>
              <Text style={[styles.menuText, { color: theme.text, fontFamily: theme.uiFontFamily }]}>Notifications</Text>
              <Switch
                value={preferences.notificationsEnabled}
                onValueChange={(v) => setPreferences({ notificationsEnabled: v })}
                trackColor={{ false: theme.border, true: theme.accent }}
                thumbColor={theme.text}
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemeBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
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
  streakCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  streakTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  streakNumber: {
    fontSize: 42,
    fontWeight: '700',
    lineHeight: 44,
  },
  streakLabel: {
    fontSize: 13,
    letterSpacing: 0.5,
  },
  heatmap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayContainer: {
    alignItems: 'center',
    gap: 4,
  },
  dayDot: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
  },
  dayLabel: {
    fontSize: 10,
    letterSpacing: 0.5,
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
    marginBottom: 24,
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
    borderRadius: 14,
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
