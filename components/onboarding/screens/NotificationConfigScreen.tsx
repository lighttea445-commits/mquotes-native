import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  Platform,
  Modal,
  ScrollView,
  LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../../hooks/useTheme';
import { useHaptics } from '../../../hooks/useHaptics';
import { useAppStore } from '../../../store/useAppStore';
import { OnboardingHeader } from '../OnboardingHeader';
import { ContinueButton } from '../ContinueButton';
import { OB, ON_GOLD } from '../tokens';

const MIN_COUNT = 0;
const MAX_COUNT = 20;
/** Slider knob diameter — also halved to centre it on the fill. */
const THUMB = 17;

export interface NotificationConfig {
  count: number;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
}

interface Props {
  /**
   * Persists the settings and raises the native permission prompt.
   * Resolves to whether permission was granted.
   */
  onSave: (v: NotificationConfig) => Promise<boolean>;
  /** Keeps the settings but asks for nothing — the flow then offers a retry. */
  onSkip: (v: NotificationConfig) => void;
  next: () => void;
  back?: () => void;
  progress?: number;
}

function hhmmToDate(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function dateToHHMM(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Count slider + delivery window.
 *
 * Deliberately lighter than the in-app `NotificationsScreen`, which is a
 * four-card surface with drill-downs and Pro gating — but backed by the same
 * store fields, so what's set here is what the Reminders screen shows later.
 *
 * "Allow" raises the native iOS/Android permission prompt; "Skip" keeps the
 * settings and asks for nothing, leaving the retry screen to follow.
 */
export function NotificationConfigScreen({ onSave, onSkip, next, back, progress }: Props) {
  const theme = useTheme();
  const haptics = useHaptics();
  const prefs = useAppStore((s) => s.preferences);

  // Seeded from the user's real settings so re-entering onboarding shows what
  // they already have rather than resetting to defaults.
  const [value, setValue] = useState<NotificationConfig>({
    count: prefs.notificationCount,
    startTime: prefs.notificationStartTime,
    endTime: prefs.notificationEndTime,
  });
  const [saving, setSaving] = useState(false);
  const [trackWidth, setTrackWidth] = useState(0);
  const [picker, setPicker] = useState<null | 'start' | 'end'>(null);
  const [tempDate, setTempDate] = useState<Date>(new Date());

  // PanResponder reads these through refs so the gesture closure never goes stale.
  const widthRef = useRef(0);
  const countRef = useRef(value.count);
  countRef.current = value.count;

  const onChange = setValue;

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(value);
    } finally {
      setSaving(false);
      next();
    }
  }, [onSave, value, next]);

  const handleSkip = useCallback(() => {
    onSkip(value);
    next();
  }, [onSkip, value, next]);

  const setCount = useCallback(
    (n: number) => {
      const clamped = Math.max(MIN_COUNT, Math.min(MAX_COUNT, Math.round(n)));
      if (clamped !== countRef.current) {
        countRef.current = clamped;
        haptics.selection();
        setValue((v) => ({ ...v, count: clamped }));
      }
    },
    [haptics],
  );

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        // The track sits inside a ScrollView, which would otherwise claim the
        // gesture the moment the drag picks up any vertical component.
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          if (!widthRef.current) return;
          setCount((e.nativeEvent.locationX / widthRef.current) * MAX_COUNT);
        },
        onPanResponderMove: (e) => {
          if (!widthRef.current) return;
          setCount((e.nativeEvent.locationX / widthRef.current) * MAX_COUNT);
        },
      }),
    [setCount],
  );

  const onTrackLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    widthRef.current = w;
    setTrackWidth(w);
  };

  const commitPicker = (d: Date) => {
    const hhmm = dateToHHMM(d);
    onChange(picker === 'start' ? { ...value, startTime: hhmm } : { ...value, endTime: hhmm });
  };

  const openPicker = (which: 'start' | 'end') => {
    setTempDate(hhmmToDate(which === 'start' ? value.startTime : value.endTime));
    setPicker(which);
  };

  const fillWidth = trackWidth * (value.count / MAX_COUNT);

  return (
    <View style={[nc.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={nc.safe} edges={['top', 'bottom']}>
        <OnboardingHeader progress={progress} onBack={back} />

        <View style={nc.heads}>
          <Text style={[nc.headline, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
            Get positivity throughout the day
          </Text>
          <Text style={[nc.subhead, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
            Reading quotes regularly will help you reach your goals
          </Text>
        </View>

        <ScrollView
          style={nc.scroll}
          contentContainerStyle={nc.body}
          showsVerticalScrollIndicator={false}
        >
          {/* Notification preview */}
          <View style={[nc.preview, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[nc.avatar, { backgroundColor: theme.goldButton }]}>
              <Text style={[nc.avatarText, { fontFamily: theme.quoteFontFamily }]}>Q</Text>
            </View>
            <View style={nc.previewText}>
              <Text style={[nc.previewApp, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
                Quotable <Text style={{ color: theme.textMuted }}>· Now</Text>
              </Text>
              <Text style={[nc.previewBody, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
                The best way out is always through.
              </Text>
            </View>
          </View>

          {/* Count slider */}
          <View style={[nc.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={nc.cardRow}>
              <Text style={[nc.cardLabel, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
                How many
              </Text>
              <Text style={[nc.cardValue, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
                {value.count}x
              </Text>
            </View>

            <View
              style={nc.trackHit}
              onLayout={onTrackLayout}
              {...pan.panHandlers}
              accessibilityRole="adjustable"
              accessibilityLabel="Quotes per day"
              accessibilityValue={{ min: MIN_COUNT, max: MAX_COUNT, now: value.count }}
            >
              <View style={[nc.track, { backgroundColor: theme.background }]}>
                <View style={[nc.trackFill, { width: fillWidth, backgroundColor: theme.gold }]} />
              </View>
              <View
                style={[
                  nc.thumb,
                  { left: Math.max(0, fillWidth - THUMB / 2), backgroundColor: theme.gold },
                ]}
                pointerEvents="none"
              />
            </View>

            <View style={nc.cardRow}>
              <Text style={[nc.bound, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                {MIN_COUNT}
              </Text>
              <Text style={[nc.bound, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                {MAX_COUNT}
              </Text>
            </View>
          </View>

          {/* Delivery window */}
          <View style={[nc.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {(['start', 'end'] as const).map((which, i) => (
              <TouchableOpacity
                key={which}
                onPress={() => openPicker(which)}
                activeOpacity={0.8}
                style={[
                  nc.timeRow,
                  i === 0 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
                ]}
              >
                <Text style={[nc.cardLabel, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
                  {which === 'start' ? 'Start at' : 'End at'}
                </Text>
                <View style={[nc.timePill, { backgroundColor: theme.background }]}>
                  <Text style={[nc.timeText, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
                    {which === 'start' ? value.startTime : value.endTime}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={nc.footer}>
          <ContinueButton
            onPress={handleSave}
            label={saving ? 'Asking…' : 'Allow'}
            disabled={saving}
          />
          <ContinueButton onPress={handleSkip} label="Skip" variant="ghost" disabled={saving} />
        </View>

        {picker !== null &&
          (Platform.OS === 'ios' ? (
            <Modal visible transparent animationType="slide" onRequestClose={() => setPicker(null)}>
              <TouchableOpacity
                style={nc.pickerBackdrop}
                activeOpacity={1}
                onPress={() => setPicker(null)}
              />
              <View style={[nc.pickerSheet, { backgroundColor: theme.surface }]}>
                <View style={nc.pickerHeader}>
                  <TouchableOpacity onPress={() => setPicker(null)} hitSlop={12}>
                    <Text style={[nc.pickerCancel, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <Text style={[nc.pickerTitle, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
                    {picker === 'start' ? 'Start at' : 'End at'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      commitPicker(tempDate);
                      setPicker(null);
                    }}
                    style={[nc.pickerDone, { backgroundColor: theme.gold }]}
                  >
                    <Text style={[nc.pickerDoneText, { fontFamily: theme.uiFontFamily }]}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  mode="time"
                  display="spinner"
                  value={tempDate}
                  onChange={(_, d) => d && setTempDate(d)}
                  textColor={theme.text}
                  style={nc.pickerWidget}
                />
              </View>
            </Modal>
          ) : (
            <DateTimePicker
              mode="time"
              display="default"
              value={tempDate}
              onChange={(e, d) => {
                setPicker(null);
                if (e.type === 'set' && d) commitPicker(d);
              }}
            />
          ))}
      </SafeAreaView>
    </View>
  );
}

const nc = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  heads: { paddingHorizontal: OB.gutter, paddingTop: 20, paddingBottom: 28 },
  headline: { fontSize: 22, lineHeight: 28, textAlign: 'center' },
  subhead: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 10 },
  scroll: { flex: 1 },
  // Scrolls rather than compressing — three cards plus two buttons overflow a
  // shorter phone, and squeezing them was what read as cramped.
  body: { paddingHorizontal: OB.gutter, paddingBottom: 12, gap: 20 },
  footer: { paddingTop: 8, paddingBottom: 12 },

  preview: { flexDirection: 'row', gap: 11, borderRadius: 16, borderWidth: 1, padding: 13 },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, color: ON_GOLD },
  previewText: { flex: 1 },
  previewApp: { fontSize: 11, fontWeight: '600' },
  previewBody: { fontSize: 11, lineHeight: 16, marginTop: 4 },

  card: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 13 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLabel: { fontSize: 12 },
  cardValue: { fontSize: 12, fontWeight: '600' },
  bound: { fontSize: 10 },

  trackHit: { height: 30, justifyContent: 'center', marginVertical: 7 },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  trackFill: { height: 4, borderRadius: 2 },
  thumb: { position: 'absolute', width: THUMB, height: THUMB, borderRadius: THUMB / 2 },

  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  timePill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
  timeText: { fontSize: 12, fontWeight: '600' },

  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  pickerSheet: { paddingBottom: 32, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  pickerCancel: { fontSize: 15 },
  pickerTitle: { fontSize: 17 },
  pickerDone: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 99 },
  pickerDoneText: { fontSize: 14, fontWeight: '600', color: ON_GOLD },
  pickerWidget: { width: '100%' },
});
