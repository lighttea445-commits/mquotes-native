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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import {
  useWidgetStore,
  WidgetType,
  WidgetRefreshFrequency,
  WidgetQuoteType,
  WidgetTextSize,
  REFRESH_FREQUENCY_LABELS,
  REFRESH_FREQUENCY_MINUTES,
  QUOTE_TYPE_LABELS,
  TEXT_SIZE_LABELS,
  TEXT_SIZE_MULTIPLIERS,
  defaultInstanceConfig,
} from '../store/useWidgetStore';
import { fetchQuotesByCategory, fetchWidgetRandomQuote } from '../lib/quotesApi';
import { WidgetBridge, ActiveWidget } from '../modules/widget-bridge';
import { useFavoritesStore } from '../store/useFavoritesStore';
import { useUserQuotesStore } from '../store/useUserQuotesStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Widget type meta ──────────────────────────────────────────────────────────

const WIDGET_META: Record<WidgetType, { label: string; subtitle: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }> = {
  basic: { label: 'Basic', subtitle: 'Rotating quotes', icon: 'format-quote-open' },
};

// ── Widget preview (no quote mark, no author, gold streak) ───────────────────

function WidgetPreview({
  transparentBg,
  quoteText,
  textSize = 'medium',
  small,
}: {
  transparentBg: boolean;
  quoteText?: string;
  textSize?: WidgetTextSize;
  small?: boolean;
}) {
  const theme = useTheme();
  const W = small ? 110 : SCREEN_WIDTH * 0.56;
  const H = small ? 72  : W * 0.62;

  const displayQuote = quoteText || 'The only way to do great work is to love what you do.';
  const textLen = displayQuote.length;

  // Mirror the adaptive font logic from Kotlin (increased for better fill)
  const hDp = small ? 72 : Math.round(H * 0.6);
  let fontSize: number;
  if (textLen > 200)      fontSize = Math.min(Math.max(hDp / 11, 10), small ? 9  : 18);
  else if (textLen > 120) fontSize = Math.min(Math.max(hDp / 9,  12), small ? 10 : 22);
  else if (textLen > 60)  fontSize = Math.min(Math.max(hDp / 7,  14), small ? 11 : 28);
  else                    fontSize = Math.min(Math.max(hDp / 6,  16), small ? 12 : 34);
  fontSize = Math.round(fontSize * TEXT_SIZE_MULTIPLIERS[textSize]);

  const bgColor = transparentBg ? 'transparent' : theme.background;
  // NOTE: do NOT use borderStyle:'dashed' here — combining it with overflow:'hidden'
  // on the same View corrupts Android's render state and makes text disappear.
  const borderStyle = transparentBg
    ? { borderWidth: 1, borderColor: theme.border }
    : { borderWidth: 0 };

  return (
    <View style={[previewStyles.card, { width: W, height: H, backgroundColor: bgColor }, borderStyle]}>
      <Text
        style={[previewStyles.quoteText, { color: theme.text, fontSize, lineHeight: fontSize * 1.45 }]}
        numberOfLines={small ? 4 : 8}
      >
        {displayQuote}
      </Text>
    </View>
  );
}

const previewStyles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  quoteText: {
    fontFamily: 'PlayfairDisplay_700Bold',
    textAlign: 'center',
  },
});

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
  const quoteSnippet = config?.cachedQuote?.text
    ? (config.cachedQuote.text.length > 80
        ? config.cachedQuote.text.slice(0, 80) + '…'
        : config.cachedQuote.text)
    : null;

  return (
    <View style={[cardStyles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={cardStyles.cardMain}>
        <View style={cardStyles.typeRow}>
          <MaterialCommunityIcons name={meta.icon} size={15} color={theme.gold} />
          <Text style={[cardStyles.typeLabel, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
            {meta.label}
          </Text>
        </View>
        {quoteSnippet && (
          <Text style={[cardStyles.quoteSnippet, { color: theme.textMuted, fontFamily: theme.quoteFontFamily }]} numberOfLines={2}>
            {quoteSnippet}
          </Text>
        )}
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

function EmptyState({ theme }: { theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={emptyStyles.container}>
      <MaterialCommunityIcons name="view-grid-plus-outline" size={48} color={theme.textMuted} style={{ opacity: 0.4 }} />
      <Text style={[emptyStyles.title, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
        No widgets yet
      </Text>
      <Text style={[emptyStyles.body, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
        Long-press your home screen → tap Widgets → find Quotable → choose Basic and add it.
      </Text>
      <Text style={[emptyStyles.note, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
        The editor opens automatically when you place a widget.
      </Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, gap: 12 },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  body: { fontSize: 14, lineHeight: 22, textAlign: 'center', opacity: 0.75 },
  note: { fontSize: 12, lineHeight: 18, textAlign: 'center', opacity: 0.5 },
});

// ── Main screen ───────────────────────────────────────────────────────────────

type ActivePicker = 'interval' | 'quoteType' | 'textSize' | null;

export default function WidgetsScreen({ onClose, onBack }: { onClose?: () => void; onBack?: () => void }) {
  const theme = useTheme();
  const router = useRouter();
  const close = onClose ?? (() => router.back());
  const back = onBack ?? close;
  const { widgetConfigs, setWidgetConfig, removeWidgetConfig } = useWidgetStore();

  // Route params: set when launched from WidgetConfigActivity (standalone route mode)
  const params = useLocalSearchParams<{ widgetId?: string; type?: string; configuring?: string }>();
  const routeWidgetId   = params.widgetId ? parseInt(params.widgetId, 10) : null;
  const routeWidgetType = (params.type as WidgetType | undefined) ?? 'basic';
  const isConfiguring   = params.configuring === 'true';

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

  const updateConfig = useCallback(
    (updates: Parameters<typeof setWidgetConfig>[1]) => {
      if (editorId === null) return;
      setWidgetConfig(editorId.toString(), updates);
    },
    [editorId, setWidgetConfig],
  );

  const handleUpdateWidget = useCallback(async () => {
    if (editorId === null || !editorConfig) return;

    let quoteText   = editorConfig.cachedQuote?.text   ?? '';
    let quoteAuthor = editorConfig.cachedQuote?.author ?? '';

    const qt = editorConfig.quoteType;
    if (qt === 'general') {
      const fresh = await fetchWidgetRandomQuote();
      if (fresh) { quoteText = fresh.content; quoteAuthor = fresh.author; }
    } else if (qt === 'favorites') {
      const favs = useFavoritesStore.getState().favorites;
      if (favs.length > 0) {
        const pick = favs[Math.floor(Math.random() * favs.length)];
        quoteText   = pick.text;
        quoteAuthor = pick.author;
      }
    } else if (qt === 'my-quotes') {
      const myQuotes = useUserQuotesStore.getState().userQuotes;
      if (myQuotes.length > 0) {
        const pick = myQuotes[Math.floor(Math.random() * myQuotes.length)];
        quoteText   = pick.text;
        quoteAuthor = pick.author;
      }
    } else {
      const fresh = await fetchQuotesByCategory(qt);
      if (fresh.length > 0) { quoteText = fresh[0].content; quoteAuthor = fresh[0].author; }
    }

    // Persist the fetched quote so the list card and editor preview stay current.
    updateConfig({ cachedQuote: { text: quoteText, author: quoteAuthor } });

    await WidgetBridge.updateWidget({
      widgetId:      editorId,
      widgetType:    editorConfig.type,
      quoteText,
      transparentBg: editorConfig.transparentBg,
      intervalMs:    REFRESH_FREQUENCY_MINUTES[editorConfig.updateInterval] * 60_000,
      quoteType:     editorConfig.quoteType,
      textSize:      editorConfig.textSize,
    });

    if (isConfiguring) {
      await WidgetBridge.finishConfiguration(editorId);
    } else {
      await WidgetBridge.reloadTimelines();
    }

    if (onClose) {
      setLocalEditorId(null);
    } else {
      router.back();
    }
  }, [editorId, editorConfig, isConfiguring, router, updateConfig]);

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

  // ── Render: editor ─────────────────────────────────────────────────────────

  if (editorId !== null && editorConfig) {
    const meta = WIDGET_META[editorConfig.type];
    const handleEditorBack = onClose ? () => setLocalEditorId(null) : () => router.back();

    return (
      <View style={{ flex: 1 }}>
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
            <View style={styles.previewContainer}>
              <WidgetPreview
                transparentBg={editorConfig.transparentBg}
                quoteText={editorConfig.cachedQuote?.text}
                textSize={editorConfig.textSize}
              />
            </View>

            <View style={[styles.settingsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <ToggleRow
                icon="circle-opacity"
                label="Transparent background"
                value={editorConfig.transparentBg}
                onToggle={(v) => updateConfig({ transparentBg: v })}
                theme={theme}
              />

              <View style={[rowStyles.separator, { backgroundColor: theme.border }]} />

              <SettingsRow
                icon="refresh"
                label="Update interval"
                value={REFRESH_FREQUENCY_LABELS[editorConfig.updateInterval]}
                onPress={() => setActivePicker('interval')}
                theme={theme}
              />

              <View style={[rowStyles.separator, { backgroundColor: theme.border }]} />
              <SettingsRow
                icon="tag-outline"
                label="Quote category"
                value={QUOTE_TYPE_LABELS[editorConfig.quoteType]}
                onPress={() => setActivePicker('quoteType')}
                theme={theme}
              />

              <View style={[rowStyles.separator, { backgroundColor: theme.border }]} />
              <SettingsRow
                icon="format-size"
                label="Text size"
                value={TEXT_SIZE_LABELS[editorConfig.textSize]}
                onPress={() => setActivePicker('textSize')}
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
      </View>
    );
  }

  // ── Render: card list ──────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1 }}>
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
            <MaterialCommunityIcons name="loading" size={32} color={theme.textMuted} style={{ opacity: 0.4 }} />
          </View>
        ) : activeWidgets.length === 0 ? (
          <EmptyState theme={theme} />
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
  previewContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
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
