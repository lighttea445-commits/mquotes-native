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
  Animated,
  Modal,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Icon } from '../ui/Icon';
import { SheetHeader } from '../ui/SheetHeader';
import { useTheme } from '../../hooks/useTheme';
import { useAppStore } from '../../store/useAppStore';
import { useRevenueCat } from '../../hooks/useRevenueCat';
import { useModal } from '../../contexts/ModalContext';
import { useCollectionsStore } from '../../store/useCollectionsStore';
import { SOURCE_FOLLOWING, COLLECTION_PREFIX } from '../../lib/notificationQuotes';
import {
  CATEGORIES,
  TOPIC_FAVORITES,
  TOPIC_MYQUOTES,
  TOPIC_GENERAL,
} from '../../constants/categories';
import {
  requestPermissions,
  canAskForPermissions,
  getPermissionStatus,
  rescheduleAll,
  cancelAllNotifications,
  formatHHMMto12h,
} from '../../lib/notifications';

// ── Helpers ────────────────────────────────────────────────────────────────
function hhmmToDate(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}
function dateToHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
function describeDays(days: number[]): string {
  if (days.length === 7) return 'Every day';
  const sorted = [...days].sort((a, b) => a - b);
  if (JSON.stringify(sorted) === JSON.stringify([1, 2, 3, 4, 5])) return 'Every weekday';
  if (JSON.stringify(sorted) === JSON.stringify([0, 6])) return 'Weekends';
  if (days.length === 0) return 'Never';
  return days.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ');
}

// ── Types ──────────────────────────────────────────────────────────────────
type PickerTarget = 'startTime' | 'endTime' | 'qodTime' | 'streakTime';
type ActiveCard = null | 'quotes' | 'qod' | 'streak';
/** Which reminder's category list is open on top of its edit view. */
type CategoryTarget = null | 'quotes' | 'qod';
interface Settings {
  enabled: boolean; days: number[];
  quotesEnabled: boolean; showAuthor: boolean;
  count: number; startTime: string; endTime: string;
  qodEnabled: boolean; qodTime: string;
  streakEnabled: boolean; streakTime: string;
  quoteSource: string; qodSource: string;
}

interface SourceOption { id: string; label: string; }

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// ── Main screen ────────────────────────────────────────────────────────────
export default function NotificationsScreen({ onClose, onBack, onContinue, progress }: { onClose?: () => void; onBack?: () => void; onContinue?: () => void; progress?: number }) {
  const theme = useTheme();
  const router = useRouter();
  const modal = useModal();
  const close = onClose ?? (() => router.back());
  const back = onBack ?? close;
  const { isPro } = useRevenueCat();
  const preferences = useAppStore((s) => s.preferences);
  const setPreferences = useAppStore((s) => s.setPreferences);

  const openPaywall = () => {
    if (modal) modal.openSheet('trial');
    else router.push('/subscriptions');
  };
  const pref = preferences;

  const [days, setDays] = useState<number[]>(pref.notificationDays?.length ? pref.notificationDays : ALL_DAYS);
  const [quotesEnabled, setQuotesEnabled] = useState(pref.quotesEnabled ?? true);
  const [showAuthor, setShowAuthor] = useState(pref.notificationShowAuthor ?? false);
  const [count, setCount] = useState(pref.notificationCount ?? 5);
  const [startTime, setStartTime] = useState(pref.notificationStartTime ?? '09:00');
  const [endTime, setEndTime] = useState(pref.notificationEndTime ?? '22:00');
  const [qodEnabled, setQodEnabled] = useState(pref.qodEnabled ?? true);
  const [qodTime, setQodTime] = useState(pref.qodTime ?? '08:00');
  const [streakEnabled, setStreakEnabled] = useState(pref.streakEnabled ?? true);
  const [streakTime, setStreakTime] = useState(pref.streakTime ?? '21:00');
  // Each reminder picks its own category, so Quote of the Day can sit on
  // Favorites while the daily drip stays on everything you follow.
  const [quoteSource, setQuoteSource] = useState(pref.notifQuoteSource ?? SOURCE_FOLLOWING);
  const [qodSource, setQodSource] = useState(pref.notifQodSource ?? SOURCE_FOLLOWING);
  const collections = useCollectionsStore((s) => s.collections);

  /** Everything a reminder can draw from, in the order the picker shows them. */
  const sourceOptions: SourceOption[] = [
    { id: SOURCE_FOLLOWING, label: 'Topics you follow' },
    { id: TOPIC_GENERAL, label: 'General' },
    { id: TOPIC_FAVORITES, label: 'Favorites' },
    { id: TOPIC_MYQUOTES, label: 'My quotes' },
    ...collections.map(c => ({ id: COLLECTION_PREFIX + c.id, label: c.name })),
    ...CATEGORIES.map(c => ({ id: c.id, label: c.name })),
  ];

  const labelForSource = (id: string) =>
    sourceOptions.find(o => o.id === id)?.label ?? 'Topics you follow';
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [pickerTempDate, setPickerTempDate] = useState<Date>(new Date());
  const [activeCard, setActiveCard] = useState<ActiveCard>(null);
  const [categoryTarget, setCategoryTarget] = useState<CategoryTarget>(null);

  const savedOpacity = useRef(new Animated.Value(0)).current;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPermissionRef = useRef<boolean | null>(null);

  // Card stagger anims
  const cardAnims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  // As a sheet this screen mounts on its first open and then stays mounted
  // (BottomSheet keep-alive), so a mount-only ask would raise the OS dialog
  // once per app launch. Following the sheet's own visibility asks on every
  // open instead. As a route there is no modal context, so it is always shown.
  const isVisible = modal ? modal.activeSheet === 'notifications' : true;
  const visibleRef = useRef(isVisible);
  visibleRef.current = isVisible;

  useEffect(() => {
    Animated.stagger(70, cardAnims.map(a =>
      Animated.spring(a, { toValue: 1, useNativeDriver: true, tension: 65, friction: 12 }),
    )).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Opening the screen raises the dialog whenever the OS will still show one.
  // requestPermissions is a no-op once permission is granted or hard-denied.
  useEffect(() => {
    if (!isVisible) return;
    requestPermissions().then(g => setPermissionGranted(g)).catch(console.warn);
  }, [isVisible]);

  // Coming back from the background only re-reads status. Asking here as well
  // would fire a second dialog on Android, where the first one backgrounds the
  // app, and would prompt from behind a sheet that is no longer on screen.
  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      if (next !== 'active' || !visibleRef.current) return;
      getPermissionStatus().then(s => setPermissionGranted(s === 'granted')).catch(console.warn);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (permissionGranted === true && prevPermissionRef.current !== true) applySettings(buildSettings());
    prevPermissionRef.current = permissionGranted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionGranted]);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  function buildSettings(o: Partial<Settings> = {}): Settings {
    const anyEnabled = quotesEnabled || qodEnabled || streakEnabled;
    return {
      enabled: anyEnabled,
      days, quotesEnabled, showAuthor, count, startTime, endTime,
      qodEnabled, qodTime,
      streakEnabled, streakTime,
      quoteSource, qodSource,
      ...o,
    };
  }

  const flashSaved = useCallback(() => {
    Animated.sequence([
      Animated.timing(savedOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.delay(900),
      Animated.timing(savedOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [savedOpacity]);

  const applySettings = useCallback((s: Settings) => {
    setPreferences({
      notificationsEnabled: s.enabled, notificationCount: s.count,
      notificationStartTime: s.startTime, notificationEndTime: s.endTime,
      notificationDays: s.days, quotesEnabled: s.quotesEnabled,
      notificationShowAuthor: s.showAuthor, qodEnabled: s.qodEnabled, qodTime: s.qodTime,
      notifQuoteSource: s.quoteSource, notifQodSource: s.qodSource,
      streakEnabled: s.streakEnabled, streakTime: s.streakTime,
    });
    if (s.enabled) {
      getPermissionStatus().then(status => {
        setPermissionGranted(status === 'granted');
        if (status !== 'granted') { cancelAllNotifications().catch(console.warn); return; }
        return rescheduleAll({
          enabled: s.enabled, days: s.days, quotesEnabled: s.quotesEnabled,
          showAuthor: s.showAuthor, quoteCount: s.count,
          startHHMM: s.startTime, endHHMM: s.endTime, quoteSource: s.quoteSource,
          qodEnabled: s.qodEnabled, qodTime: s.qodTime, qodSource: s.qodSource,
          streakEnabled: s.streakEnabled, streakTime: s.streakTime,
        }).then(() => setPreferences({ lastNotifScheduledAt: new Date().toISOString() }));
      }).catch(console.warn);
    } else {
      cancelAllNotifications().catch(console.warn);
    }
  }, [setPreferences]);

  const debouncedApply = useCallback((s: Settings) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { applySettings(s); flashSaved(); }, 400);
  }, [applySettings, flashSaved]);

  /**
   * Gate in front of anything that would schedule.
   *
   * Raises the OS dialog while one can still be shown. Once it cannot, the OS
   * refuses silently: iOS reports `canAskAgain: false` the moment a request is
   * refused and never shows that dialog again, so Settings is the only route
   * left to a grant. Whether a dialog was available is read *before* asking,
   * so refusing the dialog just leaves the reminder off rather than dropping
   * the user into Settings, which would be arguing with the answer they gave.
   */
  const ensurePermission = useCallback(async (): Promise<boolean> => {
    const couldAsk = await canAskForPermissions();
    const granted = await requestPermissions();
    setPermissionGranted(granted);
    if (!granted && !couldAsk) await Linking.openSettings();
    return granted;
  }, []);

  /** Runs `apply` only once the OS grant is in hand. */
  const enableWithPermission = useCallback((apply: () => void) => {
    ensurePermission().then(granted => { if (granted) apply(); }).catch(console.warn);
  }, [ensurePermission]);

  function handleToggleDay(day: number) {
    const next = days.includes(day) ? (days.length > 1 ? days.filter(d => d !== day) : days) : [...days, day];
    setDays(next); debouncedApply(buildSettings({ days: next }));
  }

  function openPicker(target: PickerTarget, currentHHMM: string) {
    setPickerTempDate(hhmmToDate(currentHHMM));
    setPickerTarget(target);
  }

  function commitPicker(date: Date) {
    const hhmm = dateToHHMM(date);
    let next = buildSettings();
    if (pickerTarget === 'startTime') { setStartTime(hhmm); next = buildSettings({ startTime: hhmm }); }
    else if (pickerTarget === 'endTime') { setEndTime(hhmm); next = buildSettings({ endTime: hhmm }); }
    else if (pickerTarget === 'qodTime') { setQodTime(hhmm); next = buildSettings({ qodTime: hhmm }); }
    else if (pickerTarget === 'streakTime') { setStreakTime(hhmm); next = buildSettings({ streakTime: hhmm }); }
    debouncedApply(next);
  }

  // ── Sub-components ─────────────────────────────────────────────────────

  function Stepper({ value, onDecrement, onIncrement, display }: {
    value?: number | string; display?: string;
    onDecrement: () => void; onIncrement: () => void;
  }) {
    const label = display ?? String(value);
    return (
      <View style={ss.stepperRow}>
        <TouchableOpacity onPress={onDecrement} activeOpacity={0.7}
          style={[ss.stepperBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Icon name="minus" size={18} color={theme.text} />
        </TouchableOpacity>
        <Text style={[ss.stepperValue, { color: theme.text, fontFamily: theme.uiFontFamily }]}>{label}</Text>
        <TouchableOpacity onPress={onIncrement} activeOpacity={0.7}
          style={[ss.stepperBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Icon name="plus" size={18} color={theme.text} />
        </TouchableOpacity>
      </View>
    );
  }

  function TimeButton({ hhmm, target }: { hhmm: string; target: PickerTarget }) {
    return (
      <TouchableOpacity
        onPress={() => openPicker(target, hhmm)}
        activeOpacity={0.7}
        style={[ss.timeBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
      >
        <Icon name="clock-outline" size={16} color={theme.textMuted} style={{ marginRight: 6 }} />
        <Text style={[ss.timeBtnText, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
          {formatHHMMto12h(hhmm)}
        </Text>
      </TouchableOpacity>
    );
  }

  function EditRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <View style={[ss.editRow, { borderBottomColor: theme.border }]}>
        <Text style={[ss.editRowLabel, { color: theme.text, fontFamily: theme.uiFontFamily }]}>{label}</Text>
        {children}
      </View>
    );
  }

  function DayChips() {
    return (
      <View style={ss.dayChipsWrap}>
        {ALL_DAYS.map(d => {
          const sel = days.includes(d);
          return (
            <TouchableOpacity
              key={d}
              onPress={() => handleToggleDay(d)}
              activeOpacity={0.7}
              style={[ss.dayChip, {
                backgroundColor: sel ? theme.gold : 'transparent',
                borderColor: sel ? theme.gold : theme.border,
              }]}
            >
              <Text style={[ss.dayChipText, { color: sel ? '#1A1208' : theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                {DAY_LABELS[d]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // ── Reminder card (main list) ──────────────────────────────────────────
  function ReminderCard({ anim, icon, title, timeLabel, countLabel, isEnabled, onToggle, onPress, locked }: {
    anim: Animated.Value;
    icon: string;
    title: string;
    timeLabel: string;
    countLabel: string;
    isEnabled: boolean;
    onToggle: (v: boolean) => void;
    onPress: () => void;
    locked?: boolean;
  }) {
    const handlePress = locked ? (onContinue ? undefined : openPaywall) : onPress;
    return (
      <Animated.View style={{
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
      }}>
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={locked ? (onContinue ? 1 : 0.8) : 0.8}
          style={[ss.reminderCard, {
            backgroundColor: theme.surface,
            borderColor: locked ? theme.border : isEnabled ? 'rgba(184,151,90,0.25)' : theme.border,
            opacity: locked ? 0.6 : 1,
          }]}
        >
          {/* Top row: title + time. Locked cards read the same as the rest,
              with the lock glyph below carrying the state on its own. */}
          <View style={ss.reminderCardTop}>
            <Text style={[ss.reminderCardTitle, {
              color: locked ? theme.textMuted : isEnabled ? theme.text : theme.textMuted,
              fontFamily: theme.quoteFontFamily,
            }]}>{title}</Text>
            <Text style={[ss.reminderCardTime, {
              color: !locked && isEnabled ? theme.gold : theme.textMuted,
              fontFamily: theme.uiFontFamily,
            }]}>
              {timeLabel}
            </Text>
          </View>

          {/* Bottom row: count+days + toggle/lock */}
          <View style={ss.reminderCardBottom}>
            <View style={ss.reminderCardMeta}>
              <Text style={[ss.reminderCardCount, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                {countLabel}
              </Text>
              <Text style={[ss.reminderCardDays, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                {'  '}{describeDays(days)}
              </Text>
            </View>
            {locked ? (
              <Icon name="lock-outline" size={20} color={theme.textMuted} />
            ) : (
              <Switch
                value={isEnabled}
                onValueChange={onToggle}
                trackColor={{ false: theme.border, true: theme.gold }}
                thumbColor={theme.background}
              />
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // ── Edit views per card ────────────────────────────────────────────────

  /** In-card entry point to that one reminder's category list. */
  function CategoryRow({ value, onPress }: { value: string; onPress: () => void }) {
    return (
      <TouchableOpacity
        style={[ss.editRow, { borderBottomColor: theme.border }]}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Quote category, currently ${labelForSource(value)}`}
      >
        <Text style={[ss.editRowLabel, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
          Quote category
        </Text>
        <View style={ss.categoryValue}>
          <Text
            style={[ss.categoryValueText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}
            numberOfLines={1}
          >
            {labelForSource(value)}
          </Text>
          <Icon name="chevron-right" size={18} color={theme.textMuted} />
        </View>
      </TouchableOpacity>
    );
  }

  function CategoryPicker({ value, onSelect }: { value: string; onSelect: (id: string) => void }) {
    return (
      <View style={[ss.editCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {sourceOptions.map((opt, i) => (
          <TouchableOpacity
            key={opt.id}
            style={[
              ss.sourceRow,
              i < sourceOptions.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
            ]}
            onPress={() => onSelect(opt.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: value === opt.id }}
          >
            <Text
              style={[
                ss.sourceLabel,
                { color: value === opt.id ? theme.text : theme.textMuted, fontFamily: theme.uiFontFamily },
              ]}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
            {value === opt.id && <Icon name="check" size={20} color={theme.gold} />}
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  function QuotesEdit() {
    return (
      <View style={[ss.editCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <CategoryRow value={quoteSource} onPress={() => setCategoryTarget('quotes')} />
        <EditRow label="How many">
          <Stepper
            display={`${count}×`}
            onDecrement={() => { const v = Math.max(1, count - 1); setCount(v); debouncedApply(buildSettings({ count: v })); }}
            onIncrement={() => { const v = Math.min(20, count + 1); setCount(v); debouncedApply(buildSettings({ count: v })); }}
          />
        </EditRow>
        <EditRow label="Start at">
          <TimeButton hhmm={startTime} target="startTime" />
        </EditRow>
        <EditRow label="End at">
          <TimeButton hhmm={endTime} target="endTime" />
        </EditRow>
        <View style={[ss.editRepeatSection, { borderTopColor: theme.border }]}>
          <Text style={[ss.editRepeatLabel, { color: theme.text, fontFamily: theme.uiFontFamily }]}>Repeat</Text>
          <DayChips />
        </View>
        <View style={[ss.editRow, { borderBottomColor: 'transparent' }]}>
          <Text style={[ss.editRowLabel, { color: theme.text, fontFamily: theme.uiFontFamily }]}>Show author</Text>
          <Switch
            value={showAuthor}
            onValueChange={v => { setShowAuthor(v); debouncedApply(buildSettings({ showAuthor: v })); }}
            trackColor={{ false: theme.border, true: theme.gold }}
            thumbColor={theme.background}
          />
        </View>
      </View>
    );
  }

  function SingleTimeEdit({ timeValue, setTimeValue, pickerTgt, categoryRow }: {
    timeValue: string;
    setTimeValue: (v: string) => void;
    pickerTgt: PickerTarget;
    /** Omitted for the streak reminder, which carries no quote. */
    categoryRow?: React.ReactNode;
  }) {
    return (
      <View style={[ss.editCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {categoryRow}
        <EditRow label="Time">
          <TimeButton hhmm={timeValue} target={pickerTgt} />
        </EditRow>
        <View style={[ss.editRepeatSection, { borderTopColor: theme.border }]}>
          <Text style={[ss.editRepeatLabel, { color: theme.text, fontFamily: theme.uiFontFamily }]}>Repeat</Text>
          <DayChips />
        </View>
      </View>
    );
  }

  // ── Edit screen header metadata ────────────────────────────────────────
  const EDIT_META: Record<NonNullable<ActiveCard>, { icon: string; title: string }> = {
    quotes:  { icon: 'format-quote-close',  title: 'Edit reminder'       },
    qod:     { icon: 'white-balance-sunny', title: 'Edit reminder'       },
    streak:  { icon: 'fire',                title: 'Edit reminder'       },
  };

  // ── iOS picker sheet ───────────────────────────────────────────────────
  function pickerLabel() {
    if (pickerTarget === 'startTime') return 'Start at';
    if (pickerTarget === 'endTime') return 'End at';
    if (pickerTarget === 'qodTime') return 'Quote of the Day';
    if (pickerTarget === 'streakTime') return 'Streak Reminder';
    return 'Select time';
  }

  const pickerNode = pickerTarget !== null && (
    Platform.OS === 'ios' ? (
      <Modal visible transparent animationType="slide" onRequestClose={() => setPickerTarget(null)}>
        <TouchableOpacity style={ss.pickerBackdrop} activeOpacity={1} onPress={() => setPickerTarget(null)} />
        <View style={[ss.pickerSheet, { backgroundColor: theme.surface }]}>
          <View style={[ss.pickerHandle, { backgroundColor: theme.border }]} />
          <View style={ss.pickerHeader}>
            <TouchableOpacity onPress={() => setPickerTarget(null)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={[ss.pickerCancelText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[ss.pickerTitle, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>{pickerLabel()}</Text>
            <TouchableOpacity onPress={() => { commitPicker(pickerTempDate); setPickerTarget(null); }} style={[ss.pickerDoneBtn, { backgroundColor: theme.gold }]}>
              <Text style={[ss.pickerDoneText, { fontFamily: theme.uiFontFamily }]}>Done</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker mode="time" display="spinner" value={pickerTempDate}
            onChange={(_, date) => { if (date) setPickerTempDate(date); }}
            textColor={theme.text} style={{ width: '100%' }} />
        </View>
      </Modal>
    ) : (
      <DateTimePicker mode="time" display="default" value={pickerTempDate}
        onChange={(e, date) => { setPickerTarget(null); if (e.type === 'set' && date) commitPicker(date); }} />
    )
  );

  // ── Render ─────────────────────────────────────────────────────────────
  const topBarBack =
    categoryTarget !== null ? () => setCategoryTarget(null)
    : activeCard !== null ? () => setActiveCard(null)
    : back;
  const topBarTitle =
    categoryTarget !== null ? 'Quote category'
    : activeCard !== null ? EDIT_META[activeCard].title
    : 'Reminders';

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>

        {/* Progress bar (onboarding only) */}
        {progress !== undefined && (
          <View style={[ss.progressTrack, { backgroundColor: theme.surface }]}>
            <View
              style={[
                ss.progressFill,
                { width: `${Math.min(progress, 100)}%`, backgroundColor: theme.gold },
              ]}
            />
          </View>
        )}

        {/* Header. Shared with every other sheet, so the back arrow matches
            Topics you follow: bare glyph, no circular surface behind it. */}
        <SheetHeader
          title={topBarTitle}
          leading="back"
          onLeadingPress={topBarBack}
          right={
            <Animated.Text style={[ss.savedBadge, { color: theme.gold, fontFamily: theme.uiFontFamily, opacity: savedOpacity }]}>
              ✓ Saved
            </Animated.Text>
          }
        />

        {/* ── Edit view ──────────────────────────────────────────────────── */}
        {categoryTarget !== null ? (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={ss.scroll} showsVerticalScrollIndicator={false}>
            <CategoryPicker
              value={categoryTarget === 'quotes' ? quoteSource : qodSource}
              onSelect={id => {
                if (categoryTarget === 'quotes') {
                  setQuoteSource(id);
                  debouncedApply(buildSettings({ quoteSource: id }));
                } else {
                  setQodSource(id);
                  debouncedApply(buildSettings({ qodSource: id }));
                }
                setCategoryTarget(null);
              }}
            />
          </ScrollView>

        ) : activeCard !== null ? (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={ss.scroll} showsVerticalScrollIndicator={false}>
            {activeCard === 'quotes'  && <QuotesEdit />}
            {activeCard === 'qod'     && (
              <SingleTimeEdit
                timeValue={qodTime}
                setTimeValue={setQodTime}
                pickerTgt="qodTime"
                categoryRow={<CategoryRow value={qodSource} onPress={() => setCategoryTarget('qod')} />}
              />
            )}
            {activeCard === 'streak'  && (
              <SingleTimeEdit timeValue={streakTime} setTimeValue={setStreakTime} pickerTgt="streakTime" />
            )}
          </ScrollView>

        ) : (
          /* ── Main list ───────────────────────────────────────────────── */
          <ScrollView style={{ flex: 1 }} contentContainerStyle={ss.scroll} showsVerticalScrollIndicator={false}>

            {/* Subtitle */}
            <Text style={[ss.subtitle, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              Set up your daily routine to make your inspiration fit your habits.
            </Text>

            {/* Permission banner */}
            {permissionGranted === false && (
              <TouchableOpacity
                onPress={() => Linking.openSettings()}
                style={[ss.permBanner, { backgroundColor: theme.surface, borderColor: theme.border }]}
                activeOpacity={0.8}
              >
                <View style={[ss.permIconWrap, { backgroundColor: 'rgba(184,151,90,0.10)' }]}>
                  <Icon name="information-outline" size={16} color={theme.gold} />
                </View>
                <Text style={[ss.permText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                  Notifications not working?
                </Text>
                <Icon name="chevron-right" size={16} color={theme.textMuted} />
              </TouchableOpacity>
            )}

            {/* ── Reminder cards ─────────────────────────────────────────── */}
            <ReminderCard
              anim={cardAnims[0]}
              icon="format-quote-close"
              title="Daily Quotes"
              timeLabel={`${formatHHMMto12h(startTime)} - ${formatHHMMto12h(endTime)}`}
              countLabel={`${count}×`}
              isEnabled={permissionGranted !== false && quotesEnabled}
              onToggle={v => {
                if (!v) { setQuotesEnabled(false); debouncedApply(buildSettings({ quotesEnabled: false })); return; }
                enableWithPermission(() => {
                  setQuotesEnabled(true);
                  debouncedApply(buildSettings({ quotesEnabled: true }));
                });
              }}
              onPress={() => setActiveCard('quotes')}
            />

            <ReminderCard
              anim={cardAnims[1]}
              icon="white-balance-sunny"
              title="Quote of the Day"
              timeLabel={formatHHMMto12h(qodTime)}
              countLabel="1×"
              isEnabled={isPro && permissionGranted !== false && qodEnabled}
              onToggle={v => {
                if (!isPro) { if (!onContinue) openPaywall(); return; }
                if (!v) { setQodEnabled(false); debouncedApply(buildSettings({ qodEnabled: false })); return; }
                enableWithPermission(() => {
                  setQodEnabled(true);
                  debouncedApply(buildSettings({ qodEnabled: true }));
                });
              }}
              onPress={() => { if (!isPro) { if (!onContinue) openPaywall(); return; } setActiveCard('qod'); }}
              locked={!isPro}
            />

            <ReminderCard
              anim={cardAnims[2]}
              icon="fire"
              title="Streak Reminder"
              timeLabel={formatHHMMto12h(streakTime)}
              countLabel="1×"
              isEnabled={isPro && permissionGranted !== false && streakEnabled}
              onToggle={v => {
                if (!isPro) { if (!onContinue) openPaywall(); return; }
                if (!v) { setStreakEnabled(false); debouncedApply(buildSettings({ streakEnabled: false })); return; }
                enableWithPermission(() => {
                  setStreakEnabled(true);
                  debouncedApply(buildSettings({ streakEnabled: true }));
                });
              }}
              onPress={() => { if (!isPro) { if (!onContinue) openPaywall(); return; } setActiveCard('streak'); }}
              locked={!isPro}
            />
          </ScrollView>
        )}

        {onContinue && (
          <View style={[ss.continueWrapper, { backgroundColor: theme.background }]}>
            <TouchableOpacity
              style={[ss.continueBtn, { backgroundColor: theme.gold }]}
              onPress={onContinue}
              activeOpacity={0.82}
            >
              <Text style={[ss.continueBtnText, { fontFamily: theme.uiFontFamily }]}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>

      {pickerNode}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 56 },

  // ── Progress ───────────────────────────────────────────────────────────
  progressTrack: {
    height: 3,
    borderRadius: 2,
    marginHorizontal: 24,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: { height: 3, borderRadius: 2 },

  // ── Header ─────────────────────────────────────────────────────────────
  savedBadge: { fontSize: 11, letterSpacing: 0.5 },

  // ── Subtitle ───────────────────────────────────────────────────────────
  subtitle: { fontSize: 15, lineHeight: 22, marginBottom: 20, marginTop: 4, textAlign: 'center' },

  // ── Permission banner ──────────────────────────────────────────────────
  permBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11,
    marginBottom: 18,
  },
  permIconWrap: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  permText: { flex: 1, fontSize: 13 },

  // ── Reminder card ──────────────────────────────────────────────────────
  // Grown by padding rather than a fixed height, so the card still fits its
  // content on a narrow screen where the day list wraps.
  reminderCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
    marginBottom: 14,
  },
  reminderCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  reminderCardTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3, flex: 1, marginRight: 8 },
  reminderCardTime: { fontSize: 13, fontWeight: '600' },
  reminderCardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reminderCardMeta: { flexDirection: 'row', alignItems: 'center' },
  reminderCardCount: { fontSize: 15, fontWeight: '700' },
  reminderCardDays: { fontSize: 13 },

  // ── Edit card ──────────────────────────────────────────────────────────
  editCard: {
    borderRadius: 18, borderWidth: 1, overflow: 'hidden', marginBottom: 16,
  },
  // ── Quote category ────────────────────────────────────────────────────
  categoryValue: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  categoryValueText: { fontSize: 14, flexShrink: 1 },
  sourceRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 15, gap: 12,
  },
  sourceLabel: { flex: 1, fontSize: 15 },
  editRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  editRowLabel: { fontSize: 16 },
  editRepeatSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16,
  },
  editRepeatLabel: { fontSize: 16, marginBottom: 14 },

  // ── Stepper ────────────────────────────────────────────────────────────
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepperBtn: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },
  stepperValue: { fontSize: 16, fontWeight: '700', minWidth: 64, textAlign: 'center' },

  // ── Time button ────────────────────────────────────────────────────────
  timeBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1,
  },
  timeBtnText: { fontSize: 16, fontWeight: '700' },

  // ── Day chips ──────────────────────────────────────────────────────────
  dayChipsWrap: { flexDirection: 'row', justifyContent: 'space-between' },
  dayChip: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },
  dayChipText: { fontSize: 12, fontWeight: '700' },

  // ── Continue button ────────────────────────────────────────────────────
  continueWrapper: { paddingHorizontal: 24, paddingBottom: 12, paddingTop: 8 },
  continueBtn: { borderRadius: 18, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  continueBtnText: { fontSize: 16, fontWeight: '700', color: '#1A1208' },

  // ── iOS picker sheet ───────────────────────────────────────────────────
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  pickerSheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingBottom: 40 },
  pickerHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 2 },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14 },
  pickerCancelText: { fontSize: 15 },
  pickerTitle: { fontSize: 16, fontWeight: '700' },
  pickerDoneBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 22 },
  pickerDoneText: { fontSize: 14, fontWeight: '700', color: '#1A1208' },
});
