import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Dimensions,
  Modal,
  Animated as RNAnimated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { useRevenueCat } from '../../hooks/useRevenueCat';
import { useReflectStore, Reflection, MOODS, getMoodMeta } from '../../store/useReflectStore';
import { useModal } from '../../contexts/ModalContext';
import { ConfirmSheet } from '../ui/ConfirmSheet';

const SCREEN_W = Dimensions.get('window').width;

// ─── Rotating copy ────────────────────────────────────────────────────────────

const SECTION_LABELS = ['RECENT', 'LOOKING BACK', 'YOUR ENTRIES'];
const EMPTY_STATES = [
  { title: 'No reflections yet',  sub: 'Today is a good day to start.' },
  { title: 'Nothing here yet',     sub: 'Your first entry is a tap away.' },
  { title: 'A blank page',         sub: 'Write one line — see how it goes.' },
];
const GATE_TITLES = ['Reflect is Pro', 'Keep a Reflection journal', 'A quiet place for your thoughts'];
const GATE_SUBS = [
  'Upgrade to keep daily reflections and revisit them anytime.',
  'Turn quotes into insights with mood-tagged entries and a month-at-a-glance view.',
  'Unlock daily reflections, a mood calendar, and 365 days of memory.',
];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

// ─── Date helpers ─────────────────────────────────────────────────────────────

function pad(n: number): string { return String(n).padStart(2, '0'); }
function keyOf(y: number, m: number, d: number): string { return `${y}-${pad(m + 1)}-${pad(d)}`; }
function todayParts(): { y: number; m: number; d: number } {
  const t = new Date();
  return { y: t.getFullYear(), m: t.getMonth(), d: t.getDate() };
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DOW_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// ─── Calendar heatmap ─────────────────────────────────────────────────────────

interface HeatmapProps {
  year: number;
  month: number; // 0-indexed
  reflectionsByKey: Map<string, Reflection>;
  onTapDay: (r: Reflection) => void;
  theme: ReturnType<typeof useTheme>;
}

function Heatmap({ year, month, reflectionsByKey, onTapDay, theme }: HeatmapProps) {
  const today = todayParts();
  const firstDay = new Date(year, month, 1);
  // Mon=0 ... Sun=6
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Array<{ day: number | null }> = [];
  for (let i = 0; i < startOffset; i++) cells.push({ day: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d });
  while (cells.length % 7 !== 0) cells.push({ day: null });

  return (
    <View>
      {/* Day-of-week header */}
      <View style={hmStyles.dowRow}>
        {DOW_INITIALS.map((l, i) => (
          <Text
            key={i}
            style={[hmStyles.dow, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}
          >
            {l}
          </Text>
        ))}
      </View>

      {/* Grid */}
      <View style={hmStyles.grid}>
        {cells.map((c, i) => {
          if (c.day === null) {
            return <View key={i} style={hmStyles.cell} />;
          }
          const k = keyOf(year, month, c.day);
          const r = reflectionsByKey.get(k);
          const isToday = year === today.y && month === today.m && c.day === today.d;
          const isFuture =
            year > today.y ||
            (year === today.y && month > today.m) ||
            (year === today.y && month === today.m && c.day > today.d);

          return (
            <View key={i} style={hmStyles.cell}>
              <Pressable
                onPress={r ? () => onTapDay(r) : undefined}
                disabled={!r}
                style={hmStyles.cellInner}
                hitSlop={2}
              >
                {r ? (
                  (() => {
                    const meta = getMoodMeta(r.mood);
                    return (
                      <LinearGradient
                        colors={[meta.colorLight, meta.color]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[
                          hmStyles.dot,
                          isToday && { borderWidth: 2, borderColor: theme.gold },
                        ]}
                      >
                        <Text
                          style={[
                            hmStyles.dayNum,
                            { color: '#F7F2E6', fontFamily: theme.uiFontFamily },
                          ]}
                        >
                          {c.day}
                        </Text>
                      </LinearGradient>
                    );
                  })()
                ) : (
                  <View
                    style={[
                      hmStyles.dot,
                      {
                        borderWidth: 1,
                        borderColor: isToday ? theme.gold : theme.border,
                        backgroundColor: 'transparent',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        hmStyles.dayNum,
                        {
                          color: isFuture
                            ? theme.textMuted + '66'
                            : isToday
                            ? theme.gold
                            : theme.textMuted,
                          fontFamily: theme.uiFontFamily,
                        },
                      ]}
                    >
                      {c.day}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const CELL_W = (SCREEN_W - 48) / 7; // padding 24 each side
const DOT_SIZE = Math.min(CELL_W - 8, 36);

const hmStyles = StyleSheet.create({
  dowRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dow: {
    width: CELL_W,
    textAlign: 'center',
    fontSize: 10,
    letterSpacing: 1.2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: CELL_W,
    height: CELL_W,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellInner: {
    width: CELL_W,
    height: CELL_W,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: { fontSize: 11, fontWeight: '600' },
});

// ─── Legend ───────────────────────────────────────────────────────────────────

function MoodLegend({ theme }: { theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={legendStyles.wrap}>
      {MOODS.map(m => (
        <View key={m.label} style={legendStyles.item}>
          <LinearGradient
            colors={[m.colorLight, m.color]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={legendStyles.dot}
          />
          <Text
            style={[
              legendStyles.label,
              { color: theme.textMuted, fontFamily: theme.uiFontFamily },
            ]}
          >
            {m.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const legendStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingHorizontal: 4,
  },
  item: { flexDirection: 'column', alignItems: 'center', gap: 6 },
  dot:  { width: 12, height: 12, borderRadius: 6 },
  label:{ fontSize: 9.5, letterSpacing: 0.6, textTransform: 'uppercase' },
});

// ─── Reflection card ──────────────────────────────────────────────────────────

function ReflectCard({
  item,
  theme,
  highlighted,
  onPress,
  onLayoutY,
}: {
  item: Reflection;
  theme: ReturnType<typeof useTheme>;
  highlighted: boolean;
  onPress: () => void;
  onLayoutY: (y: number) => void;
}) {
  const meta = getMoodMeta(item.mood);
  const date = new Date(item.createdAt);
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const pulse = useSharedValue(0);
  React.useEffect(() => {
    if (highlighted) {
      pulse.value = withSequence(
        withTiming(1, { duration: 280 }),
        withTiming(0, { duration: 900 }),
      );
    }
  }, [highlighted]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: 1 + pulse.value * 0.02 }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onLayout={e => onLayoutY(e.nativeEvent.layout.y)}
      style={[cardStyles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
    >
      <Animated.View
        style={[cardStyles.pulse, { shadowColor: meta.color, borderColor: meta.color }, pulseStyle]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={[meta.colorLight, meta.color]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={cardStyles.rule}
      />
      <View style={cardStyles.body}>
        <View style={cardStyles.metaRow}>
          <Text style={[cardStyles.date, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
            {dateStr}
          </Text>
          <View style={[cardStyles.moodPill, { backgroundColor: meta.color + '1F' }]}>
            <MaterialCommunityIcons name={meta.icon as any} size={11} color={meta.color} />
            <Text style={[cardStyles.moodText, { color: meta.color, fontFamily: theme.uiFontFamily }]}>
              {item.mood}
            </Text>
          </View>
        </View>

        <Text
          numberOfLines={2}
          style={[cardStyles.quote, { color: theme.text, fontFamily: theme.quoteFontFamily }]}
        >
          {item.quoteText}
        </Text>
        <Text style={[cardStyles.author, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
          — {item.quoteAuthor}
        </Text>

        <View style={[cardStyles.divider, { backgroundColor: theme.border }]} />
        <Text
          numberOfLines={3}
          style={[cardStyles.reflection, { color: theme.text, fontFamily: theme.uiFontFamily }]}
        >
          {item.reflectionText}
        </Text>
      </View>
    </Pressable>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 110,
  },
  pulse: {
    position: 'absolute',
    top: -2, left: -2, right: -2, bottom: -2,
    borderRadius: 20,
    borderWidth: 2,
    shadowOpacity: 0.6,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  rule:       { width: 4 },
  body:       { flex: 1, padding: 16, gap: 6 },
  metaRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  date:       { fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
  moodPill:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  moodText:   { fontSize: 10.5, letterSpacing: 0.6, fontWeight: '600', textTransform: 'uppercase' },
  quote:      { fontSize: 15, lineHeight: 22 },
  author:     { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  divider:    { height: 1, marginVertical: 6 },
  reflection: { fontSize: 14, lineHeight: 22 },
});

// ─── Detail modal ─────────────────────────────────────────────────────────────

function ReflectionDetail({
  item,
  isToday,
  onClose,
  onEdit,
  onDelete,
  theme,
}: {
  item: Reflection | null;
  isToday: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const [rendered, setRendered] = useState(false);
  const scale   = useRef(new RNAnimated.Value(0.92)).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (item) {
      setRendered(true);
      setShowDeleteConfirm(false);
    } else if (rendered) {
      RNAnimated.parallel([
        RNAnimated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        RNAnimated.timing(scale,   { toValue: 0.92, duration: 200, useNativeDriver: true }),
      ]).start(() => setRendered(false));
    }
  }, [item]);

  useEffect(() => {
    if (rendered) {
      scale.setValue(0.92);
      opacity.setValue(0);
      RNAnimated.parallel([
        RNAnimated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        RNAnimated.spring(scale,   { toValue: 1, damping: 20, stiffness: 260, useNativeDriver: true }),
      ]).start();
    }
  }, [rendered]);

  if (!rendered || !item) return null;

  const meta = getMoodMeta(item.mood);
  const date = new Date(item.createdAt);
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <RNAnimated.View style={[StyleSheet.absoluteFill, detailStyles.backdrop, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </RNAnimated.View>

      <View style={detailStyles.center} pointerEvents="box-none">
        <RNAnimated.View
          style={[
            detailStyles.card,
            { backgroundColor: theme.surface, transform: [{ scale }], opacity },
          ]}
        >
          {/* Header row */}
          <View style={detailStyles.topRow}>
            <View style={[detailStyles.moodPill, { backgroundColor: meta.color + '1F' }]}>
              <MaterialCommunityIcons name={meta.icon as any} size={12} color={meta.color} />
              <Text style={[detailStyles.moodText, { color: meta.color, fontFamily: theme.uiFontFamily }]}>
                {item.mood}
              </Text>
            </View>
            <Text style={[detailStyles.dateText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              {dateStr}
            </Text>
          </View>

          {/* Quote */}
          <View style={detailStyles.quoteRow}>
            <View style={[detailStyles.quoteRule, { backgroundColor: theme.gold }]} />
            <View style={{ flex: 1 }}>
              <Text style={[detailStyles.quoteText, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
                {item.quoteText}
              </Text>
              <Text style={[detailStyles.quoteAuthor, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                — {item.quoteAuthor}
              </Text>
            </View>
          </View>

          <View style={[detailStyles.divider, { backgroundColor: theme.border }]} />

          {/* Reflection */}
          <ScrollView
            style={{ maxHeight: 160 }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            <Text style={[detailStyles.reflection, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
              {item.reflectionText}
            </Text>
          </ScrollView>

          {/* Actions */}
          {!showDeleteConfirm ? (
            <View style={detailStyles.actions}>
              <Pressable
                style={[detailStyles.btn, { backgroundColor: theme.background, borderColor: theme.border, borderWidth: 1 }]}
                onPress={onClose}
              >
                <Text style={[detailStyles.btnText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                  Close
                </Text>
              </Pressable>
              {isToday && (
                <Pressable
                  style={[detailStyles.btn, { backgroundColor: theme.gold }]}
                  onPress={onEdit}
                >
                  <Text style={[detailStyles.btnText, { color: '#1A1208', fontFamily: theme.uiFontFamily }]}>
                    Edit
                  </Text>
                </Pressable>
              )}
              <Pressable
                style={[detailStyles.iconBtn, { backgroundColor: '#C0392B18', borderColor: '#C0392B44', borderWidth: 1 }]}
                onPress={() => setShowDeleteConfirm(true)}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={17} color="#C0392B" />
              </Pressable>
            </View>
          ) : (
            <View style={detailStyles.confirmRow}>
              <Text style={[detailStyles.confirmText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                Delete this entry?
              </Text>
              <View style={detailStyles.confirmBtns}>
                <Pressable
                  style={[detailStyles.btn, { backgroundColor: theme.background, borderColor: theme.border, borderWidth: 1 }]}
                  onPress={() => setShowDeleteConfirm(false)}
                >
                  <Text style={[detailStyles.btnText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  style={[detailStyles.btn, { backgroundColor: '#C0392B' }]}
                  onPress={onDelete}
                >
                  <Text style={[detailStyles.btnText, { color: '#fff', fontFamily: theme.uiFontFamily }]}>
                    Delete
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </RNAnimated.View>
      </View>
    </Modal>
  );
}

const detailStyles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(0,0,0,0.55)' },
  center:   { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  card: {
    width: '100%',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 24,
    gap: 14,
  },
  topRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  moodPill:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  moodText:   { fontSize: 11, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' },
  dateText:   { fontSize: 11, letterSpacing: 0.3 },
  quoteRow:   { flexDirection: 'row', gap: 12 },
  quoteRule:  { width: 3, borderRadius: 2 },
  quoteText:  { fontSize: 17, lineHeight: 27 },
  quoteAuthor:{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginTop: 8 },
  divider:    { height: 1 },
  reflection: { fontSize: 14, lineHeight: 22 },
  actions:    { flexDirection: 'row', gap: 8, marginTop: 4 },
  btn:        { flex: 1, paddingVertical: 13, borderRadius: 14, alignItems: 'center' },
  btnText:    { fontSize: 14, fontWeight: '600' },
  iconBtn:    { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  confirmRow: { gap: 10, marginTop: 4 },
  confirmText:{ fontSize: 13, textAlign: 'center' },
  confirmBtns:{ flexDirection: 'row', gap: 8 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function JournalScreen({
  onClose,
  onBack,
}: {
  onClose?: () => void;
  onBack?: () => void;
}) {
  const theme = useTheme();
  const router = useRouter();
  const close = onClose ?? (() => router.back());
  const back = onBack ?? close;
  const { isPro, isLoading } = useRevenueCat();
  const { reflections, clearReflections, deleteReflection } = useReflectStore();
  const modal = useModal();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [detailItem, setDetailItem] = useState<Reflection | null>(null);

  // Rotating copy — pick once per mount
  const [sectionLabel] = useState(() => pick(SECTION_LABELS));
  const [emptyCopy] = useState(() => pick(EMPTY_STATES));
  const [gateTitle] = useState(() => pick(GATE_TITLES));
  const [gateSub]   = useState(() => pick(GATE_SUBS));

  // Month nav — default to current month
  const tp = todayParts();
  const [viewYear, setViewYear] = useState(tp.y);
  const [viewMonth, setViewMonth] = useState(tp.m);

  // Map reflections by dateKey for fast lookup
  const reflectionsByKey = useMemo(() => {
    const m = new Map<string, Reflection>();
    for (const r of reflections) m.set(r.dateKey, r);
    return m;
  }, [reflections]);

  // Scroll-to + highlight
  const scrollRef = useRef<ScrollView>(null);
  const offsetsRef = useRef<Record<string, number>>({});
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  // y of the cards container within the ScrollView content — needed for accurate scrollTo
  const [listContainerY, setListContainerY] = useState(0);

  // Today's dateKey for "Edit" affordance in detail modal
  const todayKey = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const handleTapDay = (r: Reflection) => {
    Haptics.selectionAsync();
    setHighlightedId(r.id);
    const cardY = offsetsRef.current[r.id];
    if (typeof cardY === 'number' && scrollRef.current) {
      scrollRef.current.scrollTo({ y: listContainerY + cardY - 12, animated: true });
    }
    setTimeout(() => setHighlightedId(null), 1400);
  };

  const handleOpenDetail = (r: Reflection) => {
    Haptics.selectionAsync();
    setDetailItem(r);
  };

  const handleDeleteFromDetail = () => {
    if (!detailItem) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    deleteReflection(detailItem.id);
    setDetailItem(null);
  };

  const handleEditFromDetail = () => {
    setDetailItem(null);
    // Small delay so the detail modal closes before reflect opens
    setTimeout(() => {
      if (modal) modal.openSheet('reflect');
    }, 200);
  };

  const prevMonth = () => {
    Haptics.selectionAsync();
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    Haptics.selectionAsync();
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
    else setViewMonth(viewMonth + 1);
  };

  const handleUnlock = () => {
    modal ? modal.openSheet('features') : router.push('/subscriptions');
  };

  // ── Pro gate ─────────────────────────────────────────────────────────────
  if (!isLoading && !isPro) {
    return (
      <View style={{ flex: 1 }}>
        <SafeAreaView style={styles.safe} edges={['bottom']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={back} style={[styles.backBtn, { backgroundColor: theme.surface }]}>
              <MaterialCommunityIcons name="chevron-left" size={22} color={theme.textMuted} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
              Reflections
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.gate}>
            <LinearGradient
              colors={[theme.gold + '33', theme.gold + '0F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gateIconBg}
            >
              <MaterialCommunityIcons name="crown" size={32} color={theme.gold} />
            </LinearGradient>
            <Text style={[styles.gateTitle, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
              {gateTitle}
            </Text>
            <Text style={[styles.gateBody, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              {gateSub}
            </Text>
            <TouchableOpacity
              style={[styles.unlockBtn, { backgroundColor: theme.gold }]}
              onPress={handleUnlock}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="crown" size={16} color="#1A1208" />
              <Text style={[styles.unlockBtnText, { fontFamily: theme.uiFontFamily }]}>
                Unlock Pro
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── Full screen ──────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={back} style={[styles.backBtn, { backgroundColor: theme.surface }]}>
            <MaterialCommunityIcons name="chevron-left" size={22} color={theme.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
            Reflections
          </Text>
          {reflections.length > 0 ? (
            <TouchableOpacity onPress={() => setShowClearConfirm(true)} hitSlop={8}>
              <Text style={[styles.clearBtn, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                Clear
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {/* Month nav */}
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={prevMonth} style={styles.monthBtn} hitSlop={10}>
              <MaterialCommunityIcons name="chevron-left" size={20} color={theme.textMuted} />
            </TouchableOpacity>
            <Text style={[styles.monthLabel, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={styles.monthBtn} hitSlop={10}>
              <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Heatmap */}
          <Heatmap
            year={viewYear}
            month={viewMonth}
            reflectionsByKey={reflectionsByKey}
            onTapDay={handleTapDay}
            theme={theme}
          />

          {/* Legend */}
          <MoodLegend theme={theme} />

          {/* Section label */}
          {reflections.length > 0 && (
            <Text
              style={[
                styles.sectionLabel,
                { color: theme.textMuted, fontFamily: theme.uiFontFamily },
              ]}
            >
              {sectionLabel}
            </Text>
          )}

          {/* Cards list */}
          {reflections.length === 0 ? (
            <View style={styles.empty}>
              <LinearGradient
                colors={[theme.gold + '22', theme.gold + '08']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.emptyIconBg}
              >
                <MaterialCommunityIcons name="pencil-outline" size={28} color={theme.gold} />
              </LinearGradient>
              <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
                {emptyCopy.title}
              </Text>
              <Text style={[styles.emptySub, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                {emptyCopy.sub}
              </Text>
            </View>
          ) : (
            <View
              style={{ gap: 12, paddingBottom: 24 }}
              onLayout={e => setListContainerY(e.nativeEvent.layout.y)}
            >
              {reflections.map(r => (
                <ReflectCard
                  key={r.id}
                  item={r}
                  theme={theme}
                  highlighted={highlightedId === r.id}
                  onPress={() => handleOpenDetail(r)}
                  onLayoutY={y => { offsetsRef.current[r.id] = y; }}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      <ReflectionDetail
        item={detailItem}
        isToday={detailItem?.dateKey === todayKey}
        onClose={() => setDetailItem(null)}
        onEdit={handleEditFromDetail}
        onDelete={handleDeleteFromDetail}
        theme={theme}
      />

      <ConfirmSheet
        visible={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        title="Clear Reflections"
        message="This will permanently delete all your reflections. This cannot be undone."
        confirmLabel="Delete All"
        destructive
        cancelLabel="Cancel"
        onConfirm={clearReflections}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 22, fontWeight: '700' },
  clearBtn: { fontSize: 13 },

  scroll: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },

  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  monthBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  monthLabel: { fontSize: 17, fontWeight: '700' },

  sectionLabel: {
    marginTop: 28,
    marginBottom: 12,
    fontSize: 10.5,
    letterSpacing: 2.2,
  },

  empty: {
    alignItems: 'center',
    paddingTop: 44,
    paddingBottom: 20,
    gap: 10,
  },
  emptyIconBg: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub:   { fontSize: 13, lineHeight: 20, textAlign: 'center' },

  gate: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 14,
  },
  gateIconBg: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  gateTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  gateBody: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
    marginTop: 8,
  },
  unlockBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1208',
  },
});
