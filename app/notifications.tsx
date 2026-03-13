import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Linking,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useAppStore } from '../store/useAppStore';
import {
  requestPermissions,
  rescheduleAll,
  cancelAllNotifications,
  formatHHMMto12h,
} from '../lib/notifications';

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const STEP = 15; // minutes per press

function stepHHMM(hhmm: string, deltaMinutes: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = ((h * 60 + m + deltaMinutes) % 1440 + 1440) % 1440;
  return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
}

interface Settings {
  enabled: boolean;
  days: number[];
  quotesEnabled: boolean;
  showAuthor: boolean;
  count: number;
  startTime: string;
  endTime: string;
  qodEnabled: boolean;
  qodTime: string;
  reflectEnabled: boolean;
  reflectTime: string;
  streakEnabled: boolean;
  streakTime: string;
}

export default function NotificationsScreen({ onClose, onBack }: { onClose?: () => void; onBack?: () => void }) {
  const theme = useTheme();
  const router = useRouter();
  const close = onClose ?? (() => router.back());
  const back = onBack ?? close;
  const { preferences, setPreferences } = useAppStore();
  const pref = preferences;

  // ── Local state (initialized from persisted preferences) ──────────────────
  const [enabled, setEnabled] = useState(pref.notificationsEnabled);
  // Expand the store's "empty = all days" convention to an explicit list so
  // chip toggle logic (which uses .includes()) always behaves correctly.
  const [days, setDays] = useState<number[]>(
    pref.notificationDays?.length ? pref.notificationDays : ALL_DAYS,
  );
  const [quotesEnabled, setQuotesEnabled] = useState(pref.quotesEnabled ?? true);
  const [showAuthor, setShowAuthor] = useState(pref.notificationShowAuthor ?? false);
  const [count, setCount] = useState(pref.notificationCount ?? 5);
  const [startTime, setStartTime] = useState(pref.notificationStartTime ?? '09:00');
  const [endTime, setEndTime] = useState(pref.notificationEndTime ?? '22:00');
  const [qodEnabled, setQodEnabled] = useState(pref.qodEnabled ?? true);
  const [qodTime, setQodTime] = useState(pref.qodTime ?? '08:00');
  const [reflectEnabled, setReflectEnabled] = useState(pref.reflectEnabled ?? true);
  const [reflectTime, setReflectTime] = useState(pref.reflectTime ?? '20:00');
  const [streakEnabled, setStreakEnabled] = useState(pref.streakEnabled ?? true);
  const [streakTime, setStreakTime] = useState(pref.streakTime ?? '21:00');
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  const [saved, setSaved] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const permissionGrantedRef = useRef<boolean | null>(null);
  const prevPermissionRef = useRef<boolean | null>(null);

  // ── Permissions ───────────────────────────────────────────────────────────
  useEffect(() => {
    requestPermissions().then(granted => {
      setPermissionGranted(granted);
      permissionGrantedRef.current = granted;
    });
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      if (next === 'active') {
        requestPermissions().then(granted => {
          setPermissionGranted(granted);
          permissionGrantedRef.current = granted;
        });
      }
    });
    return () => sub.remove();
  }, []);

  // Auto-reschedule when permission is newly granted
  useEffect(() => {
    if (permissionGranted === true && prevPermissionRef.current !== true && enabled) {
      applySettings(buildSettings());
    }
    prevPermissionRef.current = permissionGranted;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionGranted]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  // ── Settings helpers ──────────────────────────────────────────────────────
  function buildSettings(overrides: Partial<Settings> = {}): Settings {
    return {
      enabled, days, quotesEnabled, showAuthor, count, startTime, endTime,
      qodEnabled, qodTime, reflectEnabled, reflectTime, streakEnabled, streakTime,
      ...overrides,
    };
  }

  const applySettings = useCallback((s: Settings) => {
    setPreferences({
      notificationsEnabled: s.enabled,
      notificationCount: s.count,
      notificationStartTime: s.startTime,
      notificationEndTime: s.endTime,
      notificationDays: s.days,
      quotesEnabled: s.quotesEnabled,
      notificationShowAuthor: s.showAuthor,
      qodEnabled: s.qodEnabled,
      qodTime: s.qodTime,
      reflectEnabled: s.reflectEnabled,
      reflectTime: s.reflectTime,
      streakEnabled: s.streakEnabled,
      streakTime: s.streakTime,
    });

    if (s.enabled && permissionGrantedRef.current) {
      rescheduleAll({
        enabled: s.enabled,
        days: s.days,
        quotesEnabled: s.quotesEnabled,
        showAuthor: s.showAuthor,
        quoteCount: s.count,
        startHHMM: s.startTime,
        endHHMM: s.endTime,
        qodEnabled: s.qodEnabled,
        qodTime: s.qodTime,
        reflectEnabled: s.reflectEnabled,
        reflectTime: s.reflectTime,
        streakEnabled: s.streakEnabled,
        streakTime: s.streakTime,
      }).then(() => {
        setPreferences({ lastNotifScheduledAt: new Date().toISOString() });
      }).catch(console.warn);
    } else {
      cancelAllNotifications().catch(console.warn);
    }
  }, [setPreferences]);

  const debouncedApply = useCallback((s: Settings) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => applySettings(s), 400);
  }, [applySettings]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleToggleEnabled(value: boolean) {
    setEnabled(value);
    debouncedApply(buildSettings({ enabled: value }));
  }

  function handleToggleDay(day: number) {
    const next = days.includes(day)
      ? (days.length > 1 ? days.filter(d => d !== day) : days)
      : [...days, day];
    setDays(next);
    debouncedApply(buildSettings({ days: next }));
  }

  function handleCountStep(delta: number) {
    const next = Math.min(10, Math.max(1, count + delta));
    setCount(next);
    debouncedApply(buildSettings({ count: next }));
  }

  function handleTimeStep(
    setter: (v: string) => void,
    current: string,
    delta: number,
    key: 'startTime' | 'endTime' | 'qodTime' | 'reflectTime' | 'streakTime',
  ) {
    const next = stepHHMM(current, delta);
    setter(next);
    debouncedApply(buildSettings({ [key]: next }));
  }

  // ── Save pill ─────────────────────────────────────────────────────────────
  function handleSave() {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    applySettings(buildSettings());
    setSaved(true);
    savedTimerRef.current = setTimeout(() => setSaved(false), 1500);
  }

  // ── Summary text ──────────────────────────────────────────────────────────
  function buildSummary(): string {
    const allSelected = days.length === 0 || days.length === 7;
    const dayStr = allSelected
      ? 'every day'
      : [...days].sort((a, b) => a - b)
          .map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d])
          .join(', ');

    const parts: string[] = [];
    if (quotesEnabled) parts.push(
      `${count} quote${count !== 1 ? 's' : ''} between ${formatHHMMto12h(startTime)} and ${formatHHMMto12h(endTime)}`
    );
    if (qodEnabled) parts.push(`a Quote of the Day at ${formatHHMMto12h(qodTime)}`);
    if (reflectEnabled) parts.push(`a reflection prompt at ${formatHHMMto12h(reflectTime)}`);
    if (streakEnabled) parts.push(`a streak nudge at ${formatHHMMto12h(streakTime)}`);

    if (parts.length === 0) return 'All reminder types are off. Enable one above to get started.';

    const list =
      parts.length === 1
        ? parts[0]
        : parts.slice(0, -1).join(', ') + ', and ' + parts[parts.length - 1];

    return `You'll receive ${list} — ${dayStr}.`;
  }

  // ── Render helpers ────────────────────────────────────────────────────────
  function renderStep(onPress: () => void, label: string, disabled?: boolean) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        style={[styles.stepBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
      >
        <Text style={[styles.stepBtnText, { color: disabled ? theme.border : theme.text }]}>{label}</Text>
      </TouchableOpacity>
    );
  }

  function renderTimeRow(label: string, hhmm: string, onDec: () => void, onInc: () => void) {
    return (
      <View style={[styles.pill, styles.rowPill, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.rowLabel, { color: theme.text, fontFamily: theme.uiFontFamily }]}>{label}</Text>
        <View style={styles.stepper}>
          {renderStep(onDec, '−')}
          <Text style={[styles.timeLabel, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
            {formatHHMMto12h(hhmm)}
          </Text>
          {renderStep(onInc, '+')}
        </View>
      </View>
    );
  }

  function renderSectionRow(iconName: string, label: string, value: boolean, onToggle: (v: boolean) => void) {
    return (
      <View style={[styles.pill, styles.rowPill, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <MaterialCommunityIcons name={iconName as any} size={20} color={theme.gold} style={styles.pillIcon} />
        <Text style={[styles.rowLabel, { color: theme.text, fontFamily: theme.uiFontFamily }]}>{label}</Text>
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: theme.border, true: theme.gold }}
          thumbColor={theme.surface}
        />
      </View>
    );
  }

  function renderSectionLabel(text: string) {
    return (
      <Text style={[styles.sectionLabel, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>{text}</Text>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={back} style={[styles.backBtn, { backgroundColor: theme.surface }]}>
            <MaterialCommunityIcons name="chevron-left" size={22} color={theme.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
            Notifications
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Permission denied banner */}
          {permissionGranted === false && (
            <View style={[styles.banner, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <MaterialCommunityIcons name="bell-off-outline" size={20} color={theme.textMuted} />
              <Text style={[styles.bannerText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                Notifications are disabled. Enable them in your device settings to receive daily quotes.
              </Text>
              <TouchableOpacity onPress={() => Linking.openSettings()}>
                <Text style={[styles.bannerLink, { color: theme.gold, fontFamily: theme.uiFontFamily }]}>
                  Open Settings
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Master toggle */}
          <View style={[styles.pill, styles.rowPill, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <MaterialCommunityIcons name="bell-outline" size={20} color={theme.gold} style={styles.pillIcon} />
            <Text style={[styles.rowLabel, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
              Notifications
            </Text>
            <Switch
              value={enabled}
              onValueChange={handleToggleEnabled}
              trackColor={{ false: theme.border, true: theme.gold }}
              thumbColor={theme.surface}
            />
          </View>

          {enabled && (
            <>
              {/* ACTIVE DAYS */}
              {renderSectionLabel('ACTIVE DAYS')}
              <View style={[styles.pill, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.dayChipsRow}>
                  {ALL_DAYS.map(d => {
                    const selected = days.length === 0 || days.includes(d);
                    return (
                      <TouchableOpacity
                        key={d}
                        onPress={() => handleToggleDay(d)}
                        style={[
                          styles.dayChip,
                          {
                            backgroundColor: selected ? theme.gold : theme.background,
                            borderColor: selected ? theme.gold : theme.border,
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.dayChipText,
                          { color: selected ? '#1A1208' : theme.textMuted, fontFamily: theme.uiFontFamily },
                        ]}>
                          {DAY_LABELS[d]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* DAILY QUOTES */}
              {renderSectionLabel('DAILY QUOTES')}
              {renderSectionRow('format-quote-close', 'Daily Quotes', quotesEnabled, v => {
                setQuotesEnabled(v);
                debouncedApply(buildSettings({ quotesEnabled: v }));
              })}
              {quotesEnabled && (
                <>
                  <View style={[styles.pill, styles.rowPill, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Text style={[styles.rowLabel, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
                      How many
                    </Text>
                    <View style={styles.stepper}>
                      {renderStep(() => handleCountStep(-1), '−', count <= 1)}
                      <Text style={[styles.countLabel, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
                        {count}
                      </Text>
                      {renderStep(() => handleCountStep(1), '+', count >= 10)}
                    </View>
                  </View>
                  <View style={[styles.pill, styles.rowPill, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Text style={[styles.rowLabel, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
                      Show author
                    </Text>
                    <Switch
                      value={showAuthor}
                      onValueChange={v => {
                        setShowAuthor(v);
                        debouncedApply(buildSettings({ showAuthor: v }));
                      }}
                      trackColor={{ false: theme.border, true: theme.gold }}
                      thumbColor={theme.surface}
                    />
                  </View>
                  {renderTimeRow(
                    'Start at', startTime,
                    () => handleTimeStep(setStartTime, startTime, -STEP, 'startTime'),
                    () => handleTimeStep(setStartTime, startTime, STEP, 'startTime'),
                  )}
                  {renderTimeRow(
                    'End at', endTime,
                    () => handleTimeStep(setEndTime, endTime, -STEP, 'endTime'),
                    () => handleTimeStep(setEndTime, endTime, STEP, 'endTime'),
                  )}
                </>
              )}

              {/* REMINDERS */}
              {renderSectionLabel('REMINDERS')}
              {renderSectionRow('white-balance-sunny', 'Quote of the Day', qodEnabled, v => {
                setQodEnabled(v);
                debouncedApply(buildSettings({ qodEnabled: v }));
              })}
              {qodEnabled && renderTimeRow(
                'Send at', qodTime,
                () => handleTimeStep(setQodTime, qodTime, -STEP, 'qodTime'),
                () => handleTimeStep(setQodTime, qodTime, STEP, 'qodTime'),
              )}

              {renderSectionRow('book-open-variant', 'Reflection Reminder', reflectEnabled, v => {
                setReflectEnabled(v);
                debouncedApply(buildSettings({ reflectEnabled: v }));
              })}
              {reflectEnabled && renderTimeRow(
                'Send at', reflectTime,
                () => handleTimeStep(setReflectTime, reflectTime, -STEP, 'reflectTime'),
                () => handleTimeStep(setReflectTime, reflectTime, STEP, 'reflectTime'),
              )}

              {renderSectionRow('fire', 'Streak Reminder', streakEnabled, v => {
                setStreakEnabled(v);
                debouncedApply(buildSettings({ streakEnabled: v }));
              })}
              {streakEnabled && renderTimeRow(
                'Send at', streakTime,
                () => handleTimeStep(setStreakTime, streakTime, -STEP, 'streakTime'),
                () => handleTimeStep(setStreakTime, streakTime, STEP, 'streakTime'),
              )}

              {/* Summary */}
              <Text style={[styles.summary, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                {buildSummary()}
              </Text>
            </>
          )}
        </ScrollView>

        {/* Save pill */}
        <TouchableOpacity
          onPress={handleSave}
          activeOpacity={0.82}
          style={[styles.savePill, { backgroundColor: theme.gold }]}
        >
          <Text style={[styles.savePillText, { color: '#1A1208', fontFamily: theme.uiFontFamily }]}>
            {saved ? '✓ Saved' : 'Save'}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  // Permission banner
  banner: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  bannerText: { fontSize: 13, lineHeight: 19 },
  bannerLink: { fontSize: 13, fontWeight: '600' },
  // Shared pill
  pill: { borderRadius: 14, borderWidth: 1, marginBottom: 8, padding: 16 },
  rowPill: { flexDirection: 'row', alignItems: 'center' },
  pillIcon: { marginRight: 12 },
  rowLabel: { flex: 1, fontSize: 15 },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 8,
    marginTop: 8,
    marginLeft: 4,
  },
  // Day chips
  dayChipsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayChip: {
    flex: 1,
    marginHorizontal: 3,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayChipText: { fontSize: 11, fontWeight: '600' },
  // Stepper
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnText: { fontSize: 20, lineHeight: 22, fontWeight: '300' },
  countLabel: { fontSize: 18, minWidth: 40, textAlign: 'center' },
  timeLabel: { fontSize: 14, fontWeight: '500', minWidth: 76, textAlign: 'center' },
  // Summary
  summary: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 16,
    marginHorizontal: 8,
  },
  // Save pill
  savePill: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 28,
    paddingVertical: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  savePillText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
