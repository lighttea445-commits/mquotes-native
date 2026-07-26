import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  FlatList,
  AppState,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import {
  useWidgetStore,
  WidgetType,
  WidgetRefreshFrequency,
  WidgetQuoteType,
  WidgetTextSize,
  REFRESH_FREQUENCY_LABELS,
  QUOTE_TYPE_LABELS,
  TEXT_SIZE_LABELS,
  defaultInstanceConfig,
} from '../../store/useWidgetStore';
import { THEMES } from '../../constants/themes';
import { fetchQuotesByCategory, fetchMultipleRandomQuotes } from '../../lib/quotesApi';
import { WidgetBridge, ActiveWidget } from '../../modules/widget-bridge';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFavoritesStore } from '../../store/useFavoritesStore';
import { useUserQuotesStore } from '../../store/useUserQuotesStore';
import { useRevenueCat } from '../../hooks/useRevenueCat';
import { useModal } from '../../contexts/ModalContext';
import { useAppStore } from '../../store/useAppStore';

const WIDGET_STORE_KEY = 'widget-store-v2';

async function persistWidgetQuote(
  widgetId: number,
  config: ReturnType<typeof defaultInstanceConfig>,
  quote: { id?: string; text: string; author: string },
) {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_STORE_KEY);
    const parsed = raw
      ? (JSON.parse(raw) as { state: { widgetConfigs: Record<string, typeof config> }; version?: number })
      : { state: { widgetConfigs: {} } };
    // Merge so any fields already in storage (e.g. written by a concurrent
    // background refresh) aren't clobbered by a stale editor snapshot.
    const existing = parsed.state.widgetConfigs[widgetId.toString()];
    parsed.state.widgetConfigs[widgetId.toString()] = {
      ...(existing ?? {}),
      ...config,
      cachedQuote: { text: quote.text, author: quote.author, quoteId: quote.id },
    };
    await AsyncStorage.setItem(WIDGET_STORE_KEY, JSON.stringify(parsed));
  } catch {
    // Non-critical
  }
}

// ── Widget type meta ──────────────────────────────────────────────────────────

const WIDGET_META: Record<WidgetType, { label: string; subtitle: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }> = {
  basic: { label: 'Basic', subtitle: 'Rotating quotes', icon: 'format-quote-open' },
};


// ── Picker modal ──────────────────────────────────────────────────────────────

function PickerModal<T extends string>({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
  theme,
}: {
  visible: boolean;
  title: string;
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
  onClose: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={pickerStyles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[pickerStyles.sheet, { backgroundColor: theme.navBackground }]}>
        <View style={[pickerStyles.handle, { backgroundColor: theme.border }]} />
        <Text style={[pickerStyles.title, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
          {title}
        </Text>
        <FlatList
          data={options}
          keyExtractor={(o) => o.value}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                pickerStyles.row,
                {
                  backgroundColor: item.value === selected ? theme.surface : 'transparent',
                  borderColor: theme.border,
                },
              ]}
              onPress={() => { onSelect(item.value); onClose(); }}
            >
              <Text style={[pickerStyles.rowLabel, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
                {item.label}
              </Text>
              {item.value === selected && (
                <MaterialCommunityIcons name="check" size={18} color={theme.gold} />
              )}
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { maxHeight: '60%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  title: { fontSize: 18, fontWeight: '700', paddingHorizontal: 20, paddingVertical: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginHorizontal: 10,
    borderRadius: 12,
    marginBottom: 2,
  },
  rowLabel: { fontSize: 15 },
});

// ── Settings row ──────────────────────────────────────────────────────────────

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  theme,
  isLast,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
  isLast?: boolean;
}) {
  return (
    <>
      <TouchableOpacity style={rowStyles.row} onPress={onPress} activeOpacity={0.7}>
        <MaterialCommunityIcons name={icon} size={18} color={theme.gold} />
        <Text style={[rowStyles.label, { color: theme.text, fontFamily: theme.uiFontFamily }]}>{label}</Text>
        <Text style={[rowStyles.value, { color: theme.textMuted }]} numberOfLines={1}>{value}</Text>
        <MaterialCommunityIcons name="chevron-right" size={16} color={theme.textMuted} />
      </TouchableOpacity>
      {!isLast && <View style={[rowStyles.separator, { backgroundColor: theme.border }]} />}
    </>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15, gap: 12 },
  label: { flex: 1, fontSize: 15 },
  value: { fontSize: 13, maxWidth: 160, textAlign: 'right' },
  separator: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
});

// ── Toggle row ────────────────────────────────────────────────────────────────

function ToggleRow({
  icon,
  label,
  value,
  onToggle,
  theme,
  isLast,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  theme: ReturnType<typeof useTheme>;
  isLast?: boolean;
}) {
  return (
    <>
      <View style={rowStyles.row}>
        <MaterialCommunityIcons name={icon} size={18} color={theme.gold} />
        <Text style={[rowStyles.label, { color: theme.text, fontFamily: theme.uiFontFamily }]}>{label}</Text>
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: theme.border, true: theme.gold + '88' }}
          thumbColor={value ? theme.gold : theme.textMuted}
        />
      </View>
      {!isLast && <View style={[rowStyles.separator, { backgroundColor: theme.border }]} />}
    </>
  );
}

// ── Active-widget card ────────────────────────────────────────────────────────

function WidgetCard({
  widgetId,
  type,
  theme,
  onEdit,
}: {
  widgetId: number;
  type: WidgetType;
  theme: ReturnType<typeof useTheme>;
  onEdit: () => void;
}) {
  const config = useWidgetStore((s) => s.widgetConfigs[widgetId.toString()]);
  const meta   = WIDGET_META[type];
  const displayName = config?.name || 'Unnamed Widget';

  return (
    <View style={[cardStyles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={cardStyles.cardMain}>
        <View style={cardStyles.typeRow}>
          <MaterialCommunityIcons name={meta.icon} size={15} color={theme.gold} />
          <Text style={[cardStyles.typeLabel, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
            {displayName}
          </Text>
        </View>
        <Text style={[cardStyles.quoteSnippet, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]} numberOfLines={1}>
          {meta.label} · {QUOTE_TYPE_LABELS[config?.quoteType ?? 'general']}
        </Text>
      </View>

      <TouchableOpacity
        style={[cardStyles.editBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
        onPress={onEdit}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="pencil-outline" size={14} color={theme.textMuted} />
        <Text style={[cardStyles.editBtnText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
          Edit
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 12,
  },
  cardMain: { flex: 1, gap: 6 },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeLabel: { fontSize: 14, fontWeight: '600' },
  quoteSnippet: { fontSize: 13, lineHeight: 19 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    flexShrink: 0,
  },
  editBtnText: { fontSize: 12, fontWeight: '500' },
});

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ theme, onRefresh }: { theme: ReturnType<typeof useTheme>; onRefresh: () => void }) {
  const [adding, setAdding] = useState(false);

  const handleAddWidget = async () => {
    setAdding(true);
    try {
      await WidgetBridge.requestPinWidget();
    } finally {
      setAdding(false);
    }
  };

  return (
    <View style={emptyStyles.container}>
      <MaterialCommunityIcons name="view-grid-plus-outline" size={48} color={theme.textMuted} style={{ opacity: 0.4 }} />
      <Text style={[emptyStyles.title, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
        No widgets yet
      </Text>

      <TouchableOpacity
        style={[emptyStyles.addBtn, { backgroundColor: theme.gold }]}
        onPress={handleAddWidget}
        activeOpacity={0.82}
        disabled={adding}
      >
        <MaterialCommunityIcons name="plus-circle-outline" size={18} color="#1A1208" />
        <Text style={[emptyStyles.addBtnText, { fontFamily: theme.uiFontFamily }]}>
          {adding ? 'Opening…' : 'Add Widget'}
        </Text>
      </TouchableOpacity>

      <View style={[emptyStyles.stepsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {[
          'Tap "Add Widget" above',
          'Confirm in the system prompt',
          'Position it on your home screen',
        ].map((step, i) => (
          <View key={i} style={emptyStyles.stepRow}>
            <View style={[emptyStyles.stepBadge, { backgroundColor: theme.gold + '22' }]}>
              <Text style={[emptyStyles.stepNum, { color: theme.gold, fontFamily: theme.uiFontFamily }]}>{i + 1}</Text>
            </View>
            <Text style={[emptyStyles.stepText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>{step}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[emptyStyles.refreshBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={onRefresh}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons name="refresh" size={16} color={theme.textMuted} />
        <Text style={[emptyStyles.refreshBtnText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
          Refresh
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 16 },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  stepsCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNum: { fontSize: 13, fontWeight: '700' },
  stepText: { fontSize: 14, lineHeight: 20, flex: 1 },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  refreshBtnText: { fontSize: 14, fontWeight: '500' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
  },
  addBtnText: { fontSize: 16, fontWeight: '700', color: '#1A1208' },
});

// ── Main screen ───────────────────────────────────────────────────────────────

type ActivePicker = 'interval' | 'quoteType' | 'textSize' | 'theme' | null;

export default function WidgetsScreen({ onClose, onBack, onContinue }: { onClose?: () => void; onBack?: () => void; onContinue?: () => void }) {
  const theme = useTheme();
  const router = useRouter();
  const close = onClose ?? (() => router.back());
  const back = onBack ?? close;
  const { widgetConfigs, setWidgetConfig, removeWidgetConfig } = useWidgetStore();
  const { isPro, isLoading: rcLoading } = useRevenueCat();
  const modal = useModal();

  // Route params: set when launched from WidgetConfigActivity (standalone route mode)
  const params = useLocalSearchParams<{ widgetId?: string; type?: string }>();
  const routeWidgetId   = params.widgetId ? parseInt(params.widgetId, 10) : null;
  const routeWidgetType = (params.type as WidgetType | undefined) ?? 'basic';

  // Local editor state for BottomSheet (in-app) mode
  const [localEditorId, setLocalEditorId] = useState<number | null>(null);
  const [localEditorType, setLocalEditorType] = useState<WidgetType>('basic');

  // List-view state
  const [activeWidgets, setActiveWidgets] = useState<ActiveWidget[]>([]);
  const [loadingList, setLoadingList]     = useState(true);
  const appStateRef = useRef(AppState.currentState);
  // Ref so loadActiveWidgets can read the latest configs without being in its
  // useCallback deps (avoids an infinite loop: remove → configs change →
  // new callback → effect re-fires → remove again → …).
  const widgetConfigsRef = useRef(widgetConfigs);
  widgetConfigsRef.current = widgetConfigs;

  // Editor state
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);

  // Derive editor config — in BottomSheet mode use local state; in route mode use route params.
  const editorId = onClose ? localEditorId : routeWidgetId;
  const editorType = onClose ? localEditorType : routeWidgetType;
  const storedConfig = editorId !== null ? widgetConfigs[editorId.toString()] : undefined;
  const editorConfig = editorId !== null
    ? (storedConfig ?? defaultInstanceConfig(editorType))
    : null;

  // Persist the default config after mount if the widget has no stored config yet.
  useEffect(() => {
    if (editorId !== null && !storedConfig) {
      setWidgetConfig(editorId.toString(), defaultInstanceConfig(editorType));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorId, editorType]);

  // ── Load active widgets list ───────────────────────────────────────────────

  const loadActiveWidgets = useCallback(async () => {
    setLoadingList(true);
    const list = await WidgetBridge.getActiveWidgets();
    setActiveWidgets(list);
    setLoadingList(false);

    // Remove configs for widgets that are no longer placed on the home screen.
    // Read via ref to avoid widgetConfigs appearing in deps, which would
    // recreate this callback on every removal and re-trigger the effect.
    const activeIds = new Set(list.map((w) => w.widgetId.toString()));
    for (const id of Object.keys(widgetConfigsRef.current)) {
      if (!activeIds.has(id)) removeWidgetConfig(id);
    }

    // Force-re-render all placed widgets so their PendingIntents are always
    // up-to-date (e.g. after a code change to clickAction).
    if (list.length > 0) {
      WidgetBridge.reloadTimelines().catch(() => {});
    }
  }, [removeWidgetConfig]);

  useEffect(() => {
    if (editorId === null) {
      loadActiveWidgets();
    }
  }, [editorId, loadActiveWidgets]);

  useEffect(() => {
    if (editorId !== null) return;
    const sub = AppState.addEventListener('change', (next) => {
      if (appStateRef.current.match(/inactive|background/) && next === 'active') {
        loadActiveWidgets();
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [editorId, loadActiveWidgets]);

  // ── Editor helpers ─────────────────────────────────────────────────────────

  // Update zustand immediately for UI reactivity, then force-flush to
  // AsyncStorage so a headless resize task running right after sees the
  // change. Without the direct write, the zustand persist middleware's
  // async flush can lose the race against a WIDGET_RESIZED that fires
  // as soon as the user touches the widget on their home screen.
  const updateConfig = useCallback(
    (updates: Parameters<typeof setWidgetConfig>[1]) => {
      if (editorId === null) return;
      setWidgetConfig(editorId.toString(), updates);

      (async () => {
        try {
          const raw = await AsyncStorage.getItem(WIDGET_STORE_KEY);
          const parsed = raw
            ? (JSON.parse(raw) as { state: { widgetConfigs: Record<string, ReturnType<typeof defaultInstanceConfig>> }; version?: number })
            : { state: { widgetConfigs: {} } };
          const existing = parsed.state.widgetConfigs[editorId.toString()] ?? defaultInstanceConfig('basic');
          parsed.state.widgetConfigs[editorId.toString()] = { ...existing, ...updates };
          await AsyncStorage.setItem(WIDGET_STORE_KEY, JSON.stringify(parsed));
        } catch {
          // Non-critical — zustand persist will eventually flush the same data.
        }
      })();
    },
    [editorId, setWidgetConfig],
  );

  const handleUpdateWidget = useCallback(async () => {
    if (editorId === null || !editorConfig) return;

    const qt = editorConfig.quoteType;
    let quote: { id?: string; text: string; author: string } | null = null;

    if (qt === 'general') {
      const fresh = await fetchMultipleRandomQuotes(1);
      if (fresh[0]) quote = { id: fresh[0]._id, text: fresh[0].content, author: fresh[0].author };
    } else if (qt === 'favorites') {
      const favs = useFavoritesStore.getState().favorites;
      if (favs.length > 0) {
        const f = favs[Math.floor(Math.random() * favs.length)];
        quote = { id: f.id, text: f.text, author: f.author };
      } else {
        // No favorites yet — fall back to general
        const fresh = await fetchMultipleRandomQuotes(1);
        if (fresh[0]) quote = { id: fresh[0]._id, text: fresh[0].content, author: fresh[0].author };
      }
    } else if (qt === 'my-quotes') {
      const myQuotes = useUserQuotesStore.getState().userQuotes;
      if (myQuotes.length > 0) {
        const q = myQuotes[Math.floor(Math.random() * myQuotes.length)];
        quote = { id: q.id, text: q.text, author: q.author };
      } else {
        // No user quotes yet — fall back to general
        const fresh = await fetchMultipleRandomQuotes(1);
        if (fresh[0]) quote = { id: fresh[0]._id, text: fresh[0].content, author: fresh[0].author };
      }
    } else {
      const fresh = await fetchQuotesByCategory(qt);
      if (fresh.length > 0) {
        const q = fresh[Math.floor(Math.random() * fresh.length)];
        quote = { id: q._id, text: q.content, author: q.author };
      }
    }

    // Fall back to cached quote if fetch returned nothing.
    if (!quote && editorConfig.cachedQuote) {
      quote = {
        id: editorConfig.cachedQuote.quoteId,
        text: editorConfig.cachedQuote.text,
        author: editorConfig.cachedQuote.author,
      };
    }
    if (!quote) return;

    // Persist to Zustand store (for UI preview) and to AsyncStorage (for
    // widget tap deep-link resolution and task handler access).
    updateConfig({ cachedQuote: { text: quote.text, author: quote.author, quoteId: quote.id } });
    await persistWidgetQuote(editorId, editorConfig, quote);

    await WidgetBridge.updateWidget({
      widgetId: editorId,
      quote,
      config: {
        showAuthor:    editorConfig.showAuthor,
        transparentBg: editorConfig.transparentBg,
        textSize:      editorConfig.textSize,
      },
      themeName: editorConfig.widgetTheme ?? 'minimal',
    });

    await WidgetBridge.reloadTimelines();

    if (onClose) {
      setLocalEditorId(null);
    } else {
      router.back();
    }
  }, [editorId, editorConfig, router, updateConfig]);

  // ── Picker options ─────────────────────────────────────────────────────────

  const intervalOptions = (
    Object.entries(REFRESH_FREQUENCY_LABELS) as [WidgetRefreshFrequency, string][]
  ).map(([value, label]) => ({ value, label }));

  const quoteTypeOptions = (
    Object.entries(QUOTE_TYPE_LABELS) as [WidgetQuoteType, string][]
  ).map(([value, label]) => ({ value, label }));

  const textSizeOptions = (
    Object.entries(TEXT_SIZE_LABELS) as [WidgetTextSize, string][]
  ).map(([value, label]) => ({ value, label }));

  const themeOptions = THEMES.map((t) => ({ value: t.id, label: t.name }));

  // ── Pro-gate helper ────────────────────────────────────────────────────────

  const openPaywall = () =>
    modal ? modal.openSheet('features') : router.push('/subscriptions');

  // ── Render: editor ─────────────────────────────────────────────────────────

  if (editorId !== null && editorConfig) {
    const meta = WIDGET_META[editorConfig.type];
    const handleEditorBack = onClose ? () => setLocalEditorId(null) : () => router.back();

    // Gates a callback behind Pro — opens paywall for free users instead.
    function gated<T extends unknown[]>(fn: (...args: T) => void) {
      return (...args: T) => { if (isPro) { fn(...args); } else { openPaywall(); } };
    }

    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <SafeAreaView style={styles.safe} edges={['bottom']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleEditorBack} style={[styles.backBtn, { backgroundColor: theme.surface }]} activeOpacity={0.7}>
              <MaterialCommunityIcons name="arrow-left" size={22} color={theme.textMuted} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
              Widget Editor
            </Text>
            <View style={[styles.typeBadge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <MaterialCommunityIcons name={meta.icon} size={13} color={theme.gold} />
              <Text style={[styles.typeBadgeText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                {meta.label}
              </Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
            <View style={styles.nameContainer}>
              <Text style={[styles.nameLabel, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                Widget Name
              </Text>
              <TextInput
                style={[styles.nameInput, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border, fontFamily: theme.uiFontFamily }]}
                value={editorConfig.name}
                onChangeText={(v) => updateConfig({ name: v })}
                placeholder="e.g. Morning Motivation"
                placeholderTextColor={theme.textMuted + '66'}
                autoCapitalize="words"
                returnKeyType="done"
              />
            </View>

            <View style={[styles.settingsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <ToggleRow
                icon="circle-opacity"
                label="Transparent background"
                value={editorConfig.transparentBg}
                onToggle={gated((v) => updateConfig({ transparentBg: v }))}
                theme={theme}
              />

              <View style={[rowStyles.separator, { backgroundColor: theme.border }]} />

              <ToggleRow
                icon="account-outline"
                label="Show author"
                value={editorConfig.showAuthor}
                onToggle={gated((v) => updateConfig({ showAuthor: v }))}
                theme={theme}
              />

              <View style={[rowStyles.separator, { backgroundColor: theme.border }]} />

              <SettingsRow
                icon="refresh"
                label="Update interval"
                value={REFRESH_FREQUENCY_LABELS[editorConfig.updateInterval]}
                onPress={gated(() => setActivePicker('interval'))}
                theme={theme}
              />

              <View style={[rowStyles.separator, { backgroundColor: theme.border }]} />
              <SettingsRow
                icon="tag-outline"
                label="Quote category"
                value={QUOTE_TYPE_LABELS[editorConfig.quoteType]}
                onPress={gated(() => setActivePicker('quoteType'))}
                theme={theme}
              />

              <View style={[rowStyles.separator, { backgroundColor: theme.border }]} />
              <SettingsRow
                icon="format-size"
                label="Text size"
                value={TEXT_SIZE_LABELS[editorConfig.textSize]}
                onPress={gated(() => setActivePicker('textSize'))}
                theme={theme}
              />

              <View style={[rowStyles.separator, { backgroundColor: theme.border }]} />
              <SettingsRow
                icon="palette-outline"
                label="Theme"
                value={THEMES.find((t) => t.id === (editorConfig.widgetTheme ?? 'minimal'))?.name ?? 'Minimal'}
                onPress={gated(() => setActivePicker('theme'))}
                theme={theme}
                isLast
              />

            </View>
          </ScrollView>

          <View style={[styles.saveBtnWrapper, { backgroundColor: theme.background }]}>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: theme.gold }]}
              onPress={handleUpdateWidget}
              activeOpacity={0.82}
            >
              <Text style={[styles.saveBtnText, { fontFamily: theme.uiFontFamily, color: '#1A1208' }]}>
                Update Widget
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <PickerModal
          visible={activePicker === 'interval'}
          title="Update Interval"
          options={intervalOptions}
          selected={editorConfig.updateInterval}
          onSelect={(v) => updateConfig({ updateInterval: v })}
          onClose={() => setActivePicker(null)}
          theme={theme}
        />
        <PickerModal
          visible={activePicker === 'quoteType'}
          title="Quote Category"
          options={quoteTypeOptions}
          selected={editorConfig.quoteType}
          onSelect={(v) => updateConfig({ quoteType: v })}
          onClose={() => setActivePicker(null)}
          theme={theme}
        />
        <PickerModal
          visible={activePicker === 'textSize'}
          title="Text Size"
          options={textSizeOptions}
          selected={editorConfig.textSize}
          onSelect={(v) => updateConfig({ textSize: v })}
          onClose={() => setActivePicker(null)}
          theme={theme}
        />
        <PickerModal
          visible={activePicker === 'theme'}
          title="Widget Theme"
          options={themeOptions}
          selected={editorConfig.widgetTheme ?? 'minimal'}
          onSelect={(v) => updateConfig({ widgetTheme: v })}
          onClose={() => setActivePicker(null)}
          theme={theme}
        />
      </View>
    );
  }

  // ── Render: card list ──────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={back} style={[styles.backBtn, { backgroundColor: theme.surface }]} activeOpacity={0.7}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={theme.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
            Widgets
          </Text>
          <TouchableOpacity onPress={loadActiveWidgets} style={styles.backBtn} activeOpacity={0.7}>
            <MaterialCommunityIcons name="refresh" size={20} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {loadingList ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.textMuted} />
          </View>
        ) : activeWidgets.length === 0 ? (
          <EmptyState theme={theme} onRefresh={loadActiveWidgets} />
        ) : (
          <ScrollView contentContainerStyle={styles.cardList} showsVerticalScrollIndicator={false}>
            {activeWidgets.map((w) => (
              <WidgetCard
                key={w.widgetId}
                widgetId={w.widgetId}
                type={w.type}
                theme={theme}
                onEdit={() => {
                  if (onClose) {
                    setLocalEditorType(w.type);
                    setLocalEditorId(w.widgetId);
                  } else {
                    router.push({
                      pathname: '/widgets',
                      params: { widgetId: w.widgetId.toString(), type: w.type },
                    });
                  }
                }}
              />
            ))}
            <Text style={[styles.hintText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              To add more widgets, long-press your home screen → Widgets → Quotable.
            </Text>
          </ScrollView>
        )}
        {onContinue && (
          <View style={[styles.saveBtnWrapper, { backgroundColor: theme.background }]}>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: theme.gold }]}
              onPress={onContinue}
              activeOpacity={0.82}
            >
              <Text style={[styles.saveBtnText, { fontFamily: theme.uiFontFamily, color: '#1A1208' }]}>
                Continue
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  typeBadgeText: { fontSize: 12 },
  nameContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  nameLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  nameInput: {
    fontSize: 16,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingsCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  saveBtnWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
  },
  saveBtn: {
    borderRadius: 28,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  cardList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  hintText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    opacity: 0.5,
    marginTop: 8,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
