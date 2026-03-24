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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useAppStore } from '../store/useAppStore';
import {
  requestPermissions,
  getPermissionStatus,
  rescheduleAll,
  cancelAllNotifications,
  formatHHMMto12h,
} from '../lib/notifications';

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
function buildNotifTimes(
  count: number, startHHMM: string, endHHMM: string,
): Array<{ hour: number; minute: number }> {
  const [sh, sm] = startHHMM.split(':').map(Number);
  const [eh, em] = endHHMM.split(':').map(Number);
  const startMins = sh * 60 + sm;
  const endMins = (eh * 60 + em) > startMins ? (eh * 60 + em) : startMins + 60;
  if (count === 1) return [{ hour: sh, minute: sm }];
  const interval = (endMins - startMins) / (count - 1);
  return Array.from({ length: count }, (_, i) => {
    const t = Math.round(startMins + i * interval);
    return { hour: Math.floor(t / 60) % 24, minute: t % 60 };
  });
}

// ── Types ──────────────────────────────────────────────────────────────────
type PickerTarget = 'startTime' | 'endTime' | 'qodTime' | 'reflectTime' | 'streakTime';
type ActiveCard = null | 'days' | 'quotes' | 'qod' | 'reflect' | 'streak';
interface Settings {
  enabled: boolean; days: number[];
  quotesEnabled: boolean; showAuthor: boolean;
  count: number; startTime: string; endTime: string;
  qodEnabled: boolean; qodTime: string;
  reflectEnabled: boolean; reflectTime: string;
  streakEnabled: boolean; streakTime: string;
}

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const COUNT_PRESETS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// ── Main screen ────────────────────────────────────────────────────────────
export default function NotificationsScreen({ onClose, onBack, onContinue }: { onClose?: () => void; onBack?: () => void; onContinue?: () => void }) {
  const theme = useTheme();
  const router = useRouter();
  const close = onClose ?? (() => router.back());
  const back = onBack ?? close;
  const { preferences, setPreferences } = useAppStore();
  const pref = preferences;

  const [enabled, setEnabled] = useState(pref.notificationsEnabled);
  const [days, setDays] = useState<number[]>(pref.notificationDays?.length ? pref.notificationDays : ALL_DAYS);
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
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [pickerTempDate, setPickerTempDate] = useState<Date>(new Date());
  const [activeCard, setActiveCard] = useState<ActiveCard>(null);

  // ── Stagger animation refs ─────────────────────────────────────────────
  const anim0 = useRef(new Animated.Value(enabled ? 1 : 0)).current;
  const anim1 = useRef(new Animated.Value(enabled ? 1 : 0)).current;
  const anim2 = useRef(new Animated.Value(enabled ? 1 : 0)).current;
  const anim3 = useRef(new Animated.Value(enabled ? 1 : 0)).current;
  const savedOpacity = useRef(new Animated.Value(0)).current;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPermissionRef = useRef<boolean | null>(null);
  const didInitRef = useRef(true);

  useEffect(() => {
    requestPermissions().then(g => setPermissionGranted(g));
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      if (next === 'active') requestPermissions().then(g => setPermissionGranted(g));
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (permissionGranted === true && prevPermissionRef.current !== true && enabled) applySettings(buildSettings());
    prevPermissionRef.current = permissionGranted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionGranted]);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  // Stagger in/out when enabled changes
  useEffect(() => {
    if (didInitRef.current) { didInitRef.current = false; return; }
    if (enabled) {
      [anim0, anim1, anim2, anim3].forEach(a => a.setValue(0));
      Animated.stagger(70, [anim0, anim1, anim2, anim3].map(a =>
        Animated.spring(a, { toValue: 1, useNativeDriver: true, tension: 65, friction: 11 }),
      )).start();
    } else {
      setActiveCard(null);
      Animated.parallel([anim0, anim1, anim2, anim3].map(a =>
        Animated.timing(a, { toValue: 0, duration: 180, useNativeDriver: true }),
      )).start();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  function buildSettings(o: Partial<Settings> = {}): Settings {
    return { enabled, days, quotesEnabled, showAuthor, count, startTime, endTime, qodEnabled, qodTime, reflectEnabled, reflectTime, streakEnabled, streakTime, ...o };
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
      reflectEnabled: s.reflectEnabled, reflectTime: s.reflectTime,
      streakEnabled: s.streakEnabled, streakTime: s.streakTime,
    });
    if (s.enabled) {
      getPermissionStatus().then(status => {
        setPermissionGranted(status === 'granted');
        if (status !== 'granted') { cancelAllNotifications().catch(console.warn); return; }
        return rescheduleAll({
          enabled: s.enabled, days: s.days, quotesEnabled: s.quotesEnabled,
          showAuthor: s.showAuthor, quoteCount: s.count,
          startHHMM: s.startTime, endHHMM: s.endTime,
          qodEnabled: s.qodEnabled, qodTime: s.qodTime,
          reflectEnabled: s.reflectEnabled, reflectTime: s.reflectTime,
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

  function handleToggleEnabled(v: boolean) {
    setEnabled(v);
    debouncedApply(buildSettings({ enabled: v }));
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
    else if (pickerTarget === 'reflectTime') { setReflectTime(hhmm); next = buildSettings({ reflectTime: hhmm }); }
    else if (pickerTarget === 'streakTime') { setStreakTime(hhmm); next = buildSettings({ streakTime: hhmm }); }
    debouncedApply(next);
  }

  function handleToggleDay(day: number) {
    const next = days.includes(day) ? (days.length > 1 ? days.filter(d => d !== day) : days) : [...days, day];
    setDays(next); debouncedApply(buildSettings({ days: next }));
  }

  // ── Sub-components ─────────────────────────────────────────────────────
  function animStyle(anim: Animated.Value) {
    return {
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
    };
  }

  function Row({ icon, label, sub, muted, children }: { icon?: string; label: string; sub?: string; muted?: boolean; children?: React.ReactNode }) {
    return (
      <View style={ss.row}>
        {icon && (
          <View style={ss.rowIcon}>
            <MaterialCommunityIcons name={icon as any} size={15} color={theme.gold} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[ss.rowLabel, { color: muted ? theme.textMuted : theme.text, fontFamily: theme.uiFontFamily }]}>{label}</Text>
          {sub && <Text style={[ss.rowSub, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>{sub}</Text>}
        </View>
        {children}
      </View>
    );
  }

  function TimePill({ target, value }: { target: PickerTarget; value: string }) {
    return (
      <TouchableOpacity
        onPress={() => openPicker(target, value)}
        style={[ss.timePill, { backgroundColor: 'rgba(184,151,90,0.08)', borderColor: 'rgba(184,151,90,0.35)' }]}
        activeOpacity={0.65}
      >
        <MaterialCommunityIcons name="clock-outline" size={13} color={theme.gold} />
        <Text style={[ss.timePillText, { color: theme.gold, fontFamily: theme.uiFontFamily }]}>
          {formatHHMMto12h(value)}
        </Text>
        <MaterialCommunityIcons name="pencil-outline" size={11} color={theme.gold} style={{ opacity: 0.6 }} />
      </TouchableOpacity>
    );
  }

  function CountSegments() {
    return (
      <View style={[ss.segBar, { borderColor: theme.border, backgroundColor: theme.background }]}>
        {COUNT_PRESETS.map((val, i) => {
          const sel = val === count;
          return (
            <React.Fragment key={val}>
              {i > 0 && <View style={[ss.segDivider, { backgroundColor: theme.border }]} />}
              <TouchableOpacity
                onPress={() => { setCount(val); debouncedApply(buildSettings({ count: val })); }}
                style={[ss.seg, {
                  backgroundColor: sel ? theme.gold : 'transparent',
                  borderTopLeftRadius: i === 0 ? 11 : 0,
                  borderBottomLeftRadius: i === 0 ? 11 : 0,
                  borderTopRightRadius: i === COUNT_PRESETS.length - 1 ? 11 : 0,
                  borderBottomRightRadius: i === COUNT_PRESETS.length - 1 ? 11 : 0,
                }]}
                activeOpacity={0.65}
              >
                <Text style={[ss.segText, { color: sel ? '#1A1208' : theme.textMuted, fontFamily: theme.uiFontFamily, fontWeight: sel ? '700' : '500' }]}>
                  {val}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
      </View>
    );
  }

  // ── Large type card (main list) ─────────────────────────────────────────
  function TypeCard({
    anim, icon, title, description, isEnabled, statusText, onPress,
  }: {
    anim: Animated.Value;
    icon: string;
    title: string;
    description: string;
    isEnabled: boolean;
    statusText: string;
    onPress: () => void;
  }) {
    return (
      <Animated.View style={animStyle(anim)}>
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.75}
          style={[ss.typeCard, { backgroundColor: theme.surface, borderColor: isEnabled ? 'rgba(184,151,90,0.30)' : theme.border }]}
        >
          {/* Icon */}
          <View style={[ss.typeCardIcon, {
            backgroundColor: isEnabled ? 'rgba(184,151,90,0.12)' : `${theme.border}44`,
          }]}>
            <MaterialCommunityIcons name={icon as any} size={26} color={isEnabled ? theme.gold : theme.textMuted} />
          </View>

          {/* Text */}
          <View style={{ flex: 1 }}>
            <Text style={[ss.typeCardTitle, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>{title}</Text>
            <Text style={[ss.typeCardDesc, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>{description}</Text>
            {/* Status badge */}
            <View style={[ss.typeCardBadge, { backgroundColor: isEnabled ? 'rgba(184,151,90,0.10)' : `${theme.border}55` }]}>
              <View style={[ss.typeCardDot, { backgroundColor: isEnabled ? theme.gold : theme.border }]} />
              <Text style={[ss.typeCardBadgeText, { color: isEnabled ? theme.gold : theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                {statusText}
              </Text>
            </View>
          </View>

          {/* Chevron */}
          <MaterialCommunityIcons name="chevron-right" size={20} color={theme.border} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // ── Detail view card wrapper ────────────────────────────────────────────
  function DetailCard({ children }: { children: React.ReactNode }) {
    const items = React.Children.toArray(children).filter(Boolean);
    return (
      <View style={[ss.detailCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {items.map((child, i) => (
          <React.Fragment key={i}>
            {i > 0 && <View style={[ss.divider, { backgroundColor: theme.border }]} />}
            {child}
          </React.Fragment>
        ))}
      </View>
    );
  }

  // ── Detail views per card type ──────────────────────────────────────────
  function DaysDetail() {
    return (
      <DetailCard>
        <View style={ss.daysRow}>
          {ALL_DAYS.map(d => {
            const sel = days.includes(d);
            return (
              <TouchableOpacity
                key={d}
                onPress={() => handleToggleDay(d)}
                style={[ss.dayChip, {
                  backgroundColor: sel ? theme.gold : 'transparent',
                  borderColor: sel ? theme.gold : theme.border,
                  shadowColor: sel ? theme.gold : 'transparent',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: sel ? 0.4 : 0,
                  shadowRadius: 6,
                  elevation: sel ? 3 : 0,
                }]}
                activeOpacity={0.7}
              >
                <Text style={[ss.dayText, { color: sel ? '#1A1208' : theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                  {DAY_LABELS[d]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Row muted label="These days apply to all notification types." />
      </DetailCard>
    );
  }

  function QuotesDetail() {
    return (
      <DetailCard>
        <Row icon="format-quote-close" label="Send daily quotes" sub="Random quotes throughout your day">
          <Switch
            value={quotesEnabled}
            onValueChange={v => { setQuotesEnabled(v); debouncedApply(buildSettings({ quotesEnabled: v })); }}
            trackColor={{ false: theme.border, true: theme.gold }} thumbColor={theme.surface}
          />
        </Row>
        {quotesEnabled && (
          <>
            <View style={ss.countSection}>
              <View style={ss.countHeader}>
                <Text style={[ss.countLabel, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>How many per day</Text>
                <Text style={[ss.countValue, { color: theme.gold, fontFamily: theme.uiFontFamily }]}>
                  {count} {count === 1 ? 'quote' : 'quotes'}
                </Text>
              </View>
              <CountSegments />
            </View>
            <Row label="Start at" muted>
              <TimePill target="startTime" value={startTime} />
            </Row>
            <Row label="End at" muted>
              <TimePill target="endTime" value={endTime} />
            </Row>
            <Row label="Show author" muted>
              <Switch
                value={showAuthor}
                onValueChange={v => { setShowAuthor(v); debouncedApply(buildSettings({ showAuthor: v })); }}
                trackColor={{ false: theme.border, true: theme.gold }} thumbColor={theme.surface}
              />
            </Row>
          </>
        )}
      </DetailCard>
    );
  }

  function QodDetail() {
    return (
      <DetailCard>
        <Row icon="white-balance-sunny" label="Quote of the Day" sub="One curated quote each morning">
          <Switch
            value={qodEnabled}
            onValueChange={v => { setQodEnabled(v); debouncedApply(buildSettings({ qodEnabled: v })); }}
            trackColor={{ false: theme.border, true: theme.gold }} thumbColor={theme.surface}
          />
        </Row>
        {qodEnabled && <Row label="Send at" muted><TimePill target="qodTime" value={qodTime} /></Row>}
      </DetailCard>
    );
  }

  function ReflectDetail() {
    return (
      <DetailCard>
        <Row icon="book-open-variant" label="Reflection Reminder" sub="Prompt to write in your journal">
          <Switch
            value={reflectEnabled}
            onValueChange={v => { setReflectEnabled(v); debouncedApply(buildSettings({ reflectEnabled: v })); }}
            trackColor={{ false: theme.border, true: theme.gold }} thumbColor={theme.surface}
          />
        </Row>
        {reflectEnabled && <Row label="Send at" muted><TimePill target="reflectTime" value={reflectTime} /></Row>}
      </DetailCard>
    );
  }

  function StreakDetail() {
    return (
      <DetailCard>
        <Row icon="fire" label="Streak Reminder" sub="Don't let your streak slip">
          <Switch
            value={streakEnabled}
            onValueChange={v => { setStreakEnabled(v); debouncedApply(buildSettings({ streakEnabled: v })); }}
            trackColor={{ false: theme.border, true: theme.gold }} thumbColor={theme.surface}
          />
        </Row>
        {streakEnabled && <Row label="Send at" muted><TimePill target="streakTime" value={streakTime} /></Row>}
      </DetailCard>
    );
  }

  // ── Detail header ───────────────────────────────────────────────────────
  const CARD_META: Record<NonNullable<ActiveCard>, { icon: string; title: string; color: string }> = {
    days:    { icon: 'calendar-week',         title: 'Active Days',          color: theme.gold },
    quotes:  { icon: 'format-quote-close',    title: 'Daily Quotes',         color: theme.gold },
    qod:     { icon: 'white-balance-sunny',   title: 'Quote of the Day',     color: theme.gold },
    reflect: { icon: 'book-open-variant',     title: 'Reflection Reminder',  color: theme.gold },
    streak:  { icon: 'fire',                  title: 'Streak Reminder',      color: theme.gold },
  };

  // ── Status helpers ─────────────────────────────────────────────────────
  function daysStatus(): string {
    if (days.length === 7) return 'Every day';
    if (days.length === 0) return 'No days';
    return days.map(d => DAY_LABELS[d]).join(', ');
  }

  // ── Picker node ────────────────────────────────────────────────────────
  function pickerLabel() {
    if (pickerTarget === 'startTime') return 'Start at';
    if (pickerTarget === 'endTime') return 'End at';
    if (pickerTarget === 'qodTime') return 'Quote of the Day';
    if (pickerTarget === 'reflectTime') return 'Reflection Reminder';
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
          <View style={[ss.pickerAccent, { backgroundColor: theme.gold }]} />
          <Text style={[ss.pickerBigTime, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
            {formatHHMMto12h(dateToHHMM(pickerTempDate))}
          </Text>
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

  // ── Top-bar back action ─────────────────────────────────────────────────
  const topBarBack = activeCard !== null ? () => setActiveCard(null) : back;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>

        {/* Top bar */}
        <View style={ss.topBar}>
          <TouchableOpacity onPress={topBarBack} style={[ss.backBtn, { backgroundColor: theme.surface }]}>
            <MaterialCommunityIcons name="chevron-left" size={22} color={theme.textMuted} />
          </TouchableOpacity>
          <Animated.Text style={[ss.savedBadge, { color: theme.gold, fontFamily: theme.uiFontFamily, opacity: savedOpacity }]}>
            ✓ Saved
          </Animated.Text>
        </View>

        {/* ── Detail view ────────────────────────────────────────────── */}
        {activeCard !== null ? (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={ss.scroll} showsVerticalScrollIndicator={false}>
            {/* Detail header */}
            <View style={ss.detailHero}>
              <View style={[ss.detailHeroIcon, { backgroundColor: 'rgba(184,151,90,0.12)', borderColor: 'rgba(184,151,90,0.25)' }]}>
                <MaterialCommunityIcons name={CARD_META[activeCard].icon as any} size={30} color={theme.gold} />
              </View>
              <Text style={[ss.detailHeroTitle, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
                {CARD_META[activeCard].title}
              </Text>
            </View>

            {activeCard === 'days'    && <DaysDetail />}
            {activeCard === 'quotes'  && <QuotesDetail />}
            {activeCard === 'qod'     && <QodDetail />}
            {activeCard === 'reflect' && <ReflectDetail />}
            {activeCard === 'streak'  && <StreakDetail />}
          </ScrollView>

        ) : (
          /* ── Main view ─────────────────────────────────────────────── */
          <ScrollView style={{ flex: 1 }} contentContainerStyle={ss.scroll} showsVerticalScrollIndicator={false}>

            {/* Hero */}
            <View style={ss.heroWrap}>
              <View style={[ss.heroIconWrap, {
                backgroundColor: enabled ? 'rgba(184,151,90,0.12)' : theme.surface,
                borderColor: enabled ? 'rgba(184,151,90,0.30)' : theme.border,
              }]}>
                <MaterialCommunityIcons
                  name={enabled ? 'bell-ring-outline' : 'bell-outline'}
                  size={34}
                  color={enabled ? theme.gold : theme.textMuted}
                />
              </View>

              <Text style={[ss.heroTitle, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
                Notifications
              </Text>
              <Text style={[ss.heroSub, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                {enabled ? 'Delivering your daily inspiration' : 'Receive quotes on your schedule'}
              </Text>

              <TouchableOpacity
                onPress={() => handleToggleEnabled(!enabled)}
                style={[ss.heroBtn, {
                  backgroundColor: enabled ? theme.gold : theme.surface,
                  borderColor: enabled ? theme.gold : theme.border,
                  shadowColor: enabled ? theme.gold : 'transparent',
                  shadowOpacity: 0.35,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: enabled ? 6 : 0,
                }]}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name={enabled ? 'check-circle-outline' : 'bell-plus-outline'}
                  size={18}
                  color={enabled ? '#1A1208' : theme.textMuted}
                />
                <Text style={[ss.heroBtnText, { color: enabled ? '#1A1208' : theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                  {enabled ? 'Reminders on' : 'Enable reminders'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Permission banner */}
            {permissionGranted === false && (
              <TouchableOpacity
                onPress={() => Linking.openSettings()}
                style={[ss.permBanner, { backgroundColor: theme.surface, borderColor: theme.border }]}
                activeOpacity={0.8}
              >
                <View style={ss.permIcon}>
                  <MaterialCommunityIcons name="bell-off-outline" size={18} color={theme.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[ss.permTitle, { color: theme.text, fontFamily: theme.uiFontFamily }]}>Notifications are off</Text>
                  <Text style={[ss.permBody, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>Tap to open Settings and allow them.</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={16} color={theme.textMuted} />
              </TouchableOpacity>
            )}

            {enabled ? (
              <>
                {/* Active Days */}
                <TypeCard
                  anim={anim0}
                  icon="calendar-week"
                  title="Active Days"
                  description="Which days you receive notifications"
                  isEnabled
                  statusText={daysStatus()}
                  onPress={() => setActiveCard('days')}
                />

                {/* Daily Quotes */}
                <TypeCard
                  anim={anim1}
                  icon="format-quote-close"
                  title="Daily Quotes"
                  description="Random quotes throughout your day"
                  isEnabled={quotesEnabled}
                  statusText={quotesEnabled ? `${count} quote${count === 1 ? '' : 's'} · ${formatHHMMto12h(startTime)}–${formatHHMMto12h(endTime)}` : 'Off'}
                  onPress={() => setActiveCard('quotes')}
                />

                {/* Quote of the Day */}
                <TypeCard
                  anim={anim2}
                  icon="white-balance-sunny"
                  title="Quote of the Day"
                  description="One curated quote each morning"
                  isEnabled={qodEnabled}
                  statusText={qodEnabled ? `Daily at ${formatHHMMto12h(qodTime)}` : 'Off'}
                  onPress={() => setActiveCard('qod')}
                />

                {/* Reflection Reminder */}
                <TypeCard
                  anim={anim3}
                  icon="book-open-variant"
                  title="Reflection Reminder"
                  description="Prompt to write in your journal"
                  isEnabled={reflectEnabled}
                  statusText={reflectEnabled ? `Daily at ${formatHHMMto12h(reflectTime)}` : 'Off'}
                  onPress={() => setActiveCard('reflect')}
                />

                {/* Streak Reminder — uses anim0 (already at 1 by this point) */}
                <Animated.View style={animStyle(anim0)}>
                  <TouchableOpacity
                    onPress={() => setActiveCard('streak')}
                    activeOpacity={0.75}
                    style={[ss.typeCard, { backgroundColor: theme.surface, borderColor: streakEnabled ? 'rgba(184,151,90,0.30)' : theme.border }]}
                  >
                    <View style={[ss.typeCardIcon, {
                      backgroundColor: streakEnabled ? 'rgba(184,151,90,0.12)' : `${theme.border}44`,
                    }]}>
                      <MaterialCommunityIcons name="fire" size={26} color={streakEnabled ? theme.gold : theme.textMuted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[ss.typeCardTitle, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>Streak Reminder</Text>
                      <Text style={[ss.typeCardDesc, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>Don't let your streak slip</Text>
                      <View style={[ss.typeCardBadge, { backgroundColor: streakEnabled ? 'rgba(184,151,90,0.10)' : `${theme.border}55` }]}>
                        <View style={[ss.typeCardDot, { backgroundColor: streakEnabled ? theme.gold : theme.border }]} />
                        <Text style={[ss.typeCardBadgeText, { color: streakEnabled ? theme.gold : theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                          {streakEnabled ? `Daily at ${formatHHMMto12h(streakTime)}` : 'Off'}
                        </Text>
                      </View>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={theme.border} style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                </Animated.View>
              </>
            ) : (
              <View style={ss.empty}>
                <MaterialCommunityIcons name="bell-sleep-outline" size={44} color={theme.border} />
                <Text style={[ss.emptyTitle, { color: theme.textMuted, fontFamily: theme.quoteFontFamily }]}>No reminders set</Text>
                <Text style={[ss.emptyBody, { color: theme.border, fontFamily: theme.uiFontFamily }]}>
                  Tap the button above to start receiving daily inspiration.
                </Text>
              </View>
            )}
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

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  savedBadge: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },

  // ── Hero ───────────────────────────────────────────────────────────────
  heroWrap: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 20 },
  heroIconWrap: { width: 76, height: 76, borderRadius: 24, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 22 },
  heroTitle: { fontSize: 30, fontWeight: '700', marginBottom: 8, letterSpacing: -0.5 },
  heroSub: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 26, paddingHorizontal: 16 },
  heroBtn: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 26, paddingVertical: 14, borderRadius: 32, borderWidth: 1 },
  heroBtnText: { fontSize: 15, fontWeight: '600' },

  // ── Permission banner ──────────────────────────────────────────────────
  permBanner: { borderRadius: 16, borderWidth: 1, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  permIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(184,151,90,0.12)', justifyContent: 'center', alignItems: 'center' },
  permTitle: { fontSize: 13, fontWeight: '600', marginBottom: 1 },
  permBody: { fontSize: 12, lineHeight: 16 },

  // ── Large type cards ───────────────────────────────────────────────────
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 12,
    gap: 16,
  },
  typeCardIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeCardTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, marginBottom: 3 },
  typeCardDesc: { fontSize: 12, lineHeight: 17, marginBottom: 8 },
  typeCardBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  typeCardDot: { width: 5, height: 5, borderRadius: 3 },
  typeCardBadgeText: { fontSize: 11, fontWeight: '600' },

  // ── Detail view ────────────────────────────────────────────────────────
  detailHero: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20 },
  detailHeroIcon: { width: 68, height: 68, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  detailHeroTitle: { fontSize: 26, fontWeight: '700', letterSpacing: -0.4 },
  detailCard: { borderRadius: 18, borderWidth: 1, overflow: 'hidden', marginBottom: 14 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 16 },

  // ── Rows ───────────────────────────────────────────────────────────────
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  rowIcon: { width: 30, height: 30, borderRadius: 9, backgroundColor: 'rgba(184,151,90,0.10)', justifyContent: 'center', alignItems: 'center' },
  rowLabel: { fontSize: 14, fontWeight: '500' },
  rowSub: { fontSize: 11, lineHeight: 16, marginTop: 2, opacity: 0.8 },

  // ── Days ───────────────────────────────────────────────────────────────
  daysRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 14, gap: 6 },
  dayChip: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  dayText: { fontSize: 11, fontWeight: '700' },

  // ── Segmented count ────────────────────────────────────────────────────
  countSection: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14 },
  countHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  countLabel: { fontSize: 13 },
  countValue: { fontSize: 12, fontWeight: '600' },
  segBar: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  seg: { flex: 1, height: 40, justifyContent: 'center', alignItems: 'center' },
  segDivider: { width: StyleSheet.hairlineWidth, height: 40 },
  segText: { fontSize: 12 },

  // ── Time pill ──────────────────────────────────────────────────────────
  timePill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7 },
  timePillText: { fontSize: 13, fontWeight: '600' },

  // ── Empty state ────────────────────────────────────────────────────────
  empty: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 32, gap: 12 },
  emptyTitle: { fontSize: 22, fontWeight: '700', marginTop: 8, letterSpacing: -0.3 },
  emptyBody: { fontSize: 13, lineHeight: 20, textAlign: 'center' },

  // ── Continue button ────────────────────────────────────────────────────
  continueWrapper: { paddingHorizontal: 24, paddingBottom: 12, paddingTop: 8 },
  continueBtn: { borderRadius: 18, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  continueBtnText: { fontSize: 16, fontWeight: '700', color: '#1A1208' },

  // ── iOS picker sheet ───────────────────────────────────────────────────
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  pickerSheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingBottom: 40, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.22, shadowRadius: 18, elevation: 24 },
  pickerHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 2 },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14 },
  pickerCancelText: { fontSize: 15 },
  pickerTitle: { fontSize: 16, fontWeight: '700' },
  pickerAccent: { height: 1, opacity: 0.25, marginHorizontal: 20, borderRadius: 1 },
  pickerBigTime: { fontSize: 42, fontWeight: '700', textAlign: 'center', marginTop: 8, marginBottom: -8, letterSpacing: -1 },
  pickerDoneBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 22 },
  pickerDoneText: { fontSize: 14, fontWeight: '700', color: '#1A1208' },
});
