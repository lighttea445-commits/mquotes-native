import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  AppState,
  Platform,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { FONTS } from '../../constants/fonts';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { SheetHeader } from '../ui/SheetHeader';
import { ListRow } from '../ui/ListRow';
import { PageDots } from '../ui/PageDots';
import { EditNameDialog } from '../ui/EditNameDialog';
import { ConfirmSheet } from '../ui/ConfirmSheet';
import { useTheme } from '../../hooks/useTheme';
import {
  useWidgetStore,
  type WidgetConfig,
  type WidgetRefreshFrequency,
  type WidgetQuoteType,
  type WidgetBuiltInQuoteType,
  REFRESH_FREQUENCY_LABELS,
  QUOTE_TYPE_LABELS,
  collectionIdFromQuoteType,
  collectionQuoteType,
  quoteTypeLabel,
} from '../../store/useWidgetStore';
import { useCollectionsStore } from '../../store/useCollectionsStore';
import { WidgetBridge } from '../../modules/widget-bridge';
import { syncWidgets } from '../../lib/widgetSync';
import { isIOSConfigPending } from '../../lib/iosWidget';
import { useRevenueCat } from '../../hooks/useRevenueCat';
import { useModal } from '../../contexts/ModalContext';
import { GUTTER, SPACE, RADIUS, ON_GOLD } from '../ui/tokens';

const PREVIEW_QUOTE = 'Discipline always beats motivation.';

// ── Picker modal ──────────────────────────────────────────────────────────────

interface PickerOption<T extends string> {
  value: T;
  label: string;
  /**
   * A row that opens another list instead of choosing a value. Used by the
   * Collections row, which drills into the user's own collections rather than
   * being a source in itself. Selecting it leaves the sheet open.
   */
  drill?: boolean;
  /** Shown under the label, e.g. how many quotes a collection holds. */
  meta?: string;
}

function PickerModal<T extends string>({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
  onBack,
  emptyLabel,
  theme,
}: {
  visible: boolean;
  title: string;
  options: PickerOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
  onClose: () => void;
  /** Present on a drilled-in list, so the sheet can step back rather than only close. */
  onBack?: () => void;
  /** Shown in place of the list when there is nothing to choose from. */
  emptyLabel?: string;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onBack ?? onClose}>
      <TouchableOpacity style={pickerStyles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[pickerStyles.sheet, { backgroundColor: theme.navBackground }]}>
        <View style={[pickerStyles.handle, { backgroundColor: theme.border }]} />
        <View style={pickerStyles.header}>
          {onBack && (
            <TouchableOpacity onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
              <Icon name="chevron-left" size={24} color={theme.text} />
            </TouchableOpacity>
          )}
          <Text style={[pickerStyles.title, { color: theme.text, fontFamily: FONTS.display.bold }]}>
            {title}
          </Text>
        </View>
        {options.length === 0 && emptyLabel ? (
          <Text style={[pickerStyles.empty, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
            {emptyLabel}
          </Text>
        ) : (
          <FlatList
            data={options}
            keyExtractor={(o) => o.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  pickerStyles.row,
                  {
                    backgroundColor: !item.drill && item.value === selected ? theme.surface : 'transparent',
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => { onSelect(item.value); if (!item.drill) onClose(); }}
                accessibilityRole="button"
                accessibilityState={item.drill ? undefined : { selected: item.value === selected }}
              >
                <View style={pickerStyles.rowText}>
                  <Text
                    style={[pickerStyles.rowLabel, { color: theme.text, fontFamily: theme.uiFontFamily }]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                  {item.meta !== undefined && (
                    <Text style={[pickerStyles.rowMeta, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                      {item.meta}
                    </Text>
                  )}
                </View>
                {item.drill ? (
                  <Icon name="chevron-right" size={20} color={theme.textMuted} />
                ) : (
                  item.value === selected && <Icon name="check" size={18} color={theme.gold} />
                )}
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { maxHeight: '60%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', paddingLeft: 20, gap: 8 },
  title: { fontSize: 18, paddingVertical: 14 },
  empty: { fontSize: 15, lineHeight: 23, textAlign: 'center', paddingHorizontal: 32, paddingVertical: 28 },
  rowText: { flex: 1, gap: 2 },
  rowMeta: { fontSize: 13 },
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

// ── Widget preview ────────────────────────────────────────────────────────────
//
// A handset with the widget face inside it. Solid body with a top sheen for
// depth, a Dynamic Island pill, and a bottom fade so the body dissolves into
// the page rather than ending in a hard edge. Renders once behind the widget
// face content, which stays regular RN Views/Text — SVG doesn't wrap dynamic
// multiline text cleanly, so only the chrome is drawn as SVG.

const PHONE_VB_W = 240;
const PHONE_VB_H = 240 * 1.28;

function PhoneChrome({ width, height, theme }: { width: number; height: number; theme: ReturnType<typeof useTheme> }) {
  const r = PHONE_VB_W * 0.16;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${PHONE_VB_W} ${PHONE_VB_H}`} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id="phoneSheen" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={theme.text} stopOpacity={0.08} />
          <Stop offset="0.35" stopColor={theme.text} stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id="phoneFade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={theme.background} stopOpacity={0} />
          <Stop offset="0.45" stopColor={theme.background} stopOpacity={0} />
          <Stop offset="0.9" stopColor={theme.background} stopOpacity={1} />
          <Stop offset="1" stopColor={theme.background} stopOpacity={1} />
        </LinearGradient>
      </Defs>

      <Rect
        x={1.5}
        y={1.5}
        width={PHONE_VB_W - 3}
        height={PHONE_VB_H - 3}
        rx={r}
        fill={theme.surface}
      />
      <Rect
        x={1.5}
        y={1.5}
        width={PHONE_VB_W - 3}
        height={PHONE_VB_H - 3}
        rx={r}
        fill="url(#phoneSheen)"
      />
      <Rect
        x={PHONE_VB_W / 2 - 34}
        y={16}
        width={68}
        height={20}
        rx={10}
        fill={theme.background}
      />
      <Rect
        x={1.5}
        y={1.5}
        width={PHONE_VB_W - 3}
        height={PHONE_VB_H - 3}
        rx={r}
        fill="url(#phoneFade)"
      />
    </Svg>
  );
}

function WidgetPreview({
  config,
  width,
  theme,
}: {
  config: WidgetConfig;
  width: number;
  theme: ReturnType<typeof useTheme>;
}) {
  const phoneW = Math.min(width - GUTTER * 4, 300);
  const phoneH = phoneW * (PHONE_VB_H / PHONE_VB_W);

  return (
    <View style={{ width, alignItems: 'center' }}>
      <View style={{ width: phoneW, height: phoneH }}>
        <PhoneChrome width={phoneW} height={phoneH} theme={theme} />

        <View style={previewStyles.faceWrap}>
          <View
            style={[
              previewStyles.face,
              {
                backgroundColor: theme.background,
                borderWidth: config.showBorder ? 8 : 0,
                borderColor: theme.textMuted,
              },
            ]}
          >
            <Text
              style={[previewStyles.quote, { color: theme.text, fontFamily: theme.quoteFontFamily }]}
              numberOfLines={4}
            >
              {PREVIEW_QUOTE}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const previewStyles = StyleSheet.create({
  faceWrap: {
    flex: 1,
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 130,
  },
  face: {
    width: '100%',
    flex: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  quote: { fontSize: 17, lineHeight: 24, textAlign: 'center' },
});

// ── Settings card ─────────────────────────────────────────────────────────────

function ConfigCard({
  config,
  sourceLabel,
  onChange,
  onOpenPicker,
}: {
  config: WidgetConfig;
  /** Resolved here rather than from the label map — a collection has no static label. */
  sourceLabel: string;
  onChange: (updates: Partial<WidgetConfig>) => void;
  onOpenPicker: (picker: 'quoteType' | 'interval') => void;
}) {
  return (
    <View style={styles.card}>
      <ListRow
        label="Customize"
        first
        last={!config.customize}
        trailing={{
          kind: 'switch',
          value: config.customize,
          onValueChange: (v) => onChange({ customize: v }),
        }}
      />

      {config.customize && (
        <>
          <ListRow
            label="Topics"
            onPress={() => onOpenPicker('quoteType')}
            trailing={{ kind: 'valueChevron', value: sourceLabel }}
          />
          <ListRow
            label="Widget border"
            trailing={{
              kind: 'switch',
              value: config.showBorder,
              onValueChange: (v) => onChange({ showBorder: v }),
            }}
          />
          <ListRow
            label="Refresh"
            last
            onPress={() => onOpenPicker('interval')}
            trailing={{ kind: 'valueChevron', value: REFRESH_FREQUENCY_LABELS[config.updateInterval] }}
          />
        </>
      )}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

type ActivePicker = 'quoteType' | 'collection' | 'interval' | null;

/**
 * Sentinel for the Topics row that drills into the user's collections rather
 * than being a source itself. Never stored on a config.
 */
const COLLECTIONS_DRILL = '__collections__';
type QuoteTypeOptionValue = WidgetQuoteType | typeof COLLECTIONS_DRILL;

export default function WidgetsScreen({
  onClose,
  onBack,
  onContinue,
}: {
  onClose?: () => void;
  onBack?: () => void;
  onContinue?: () => void;
}) {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const close = onClose ?? (() => router.back());
  const back = onBack ?? close;
  const modal = useModal();
  const { isPro } = useRevenueCat();

  const configs = useWidgetStore((s) => s.configs);
  const addConfig = useWidgetStore((s) => s.addConfig);
  const updateConfig = useWidgetStore((s) => s.updateConfig);
  const removeConfig = useWidgetStore((s) => s.removeConfig);
  const collections = useCollectionsStore((s) => s.collections);

  const [index, setIndex] = useState(0);
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);
  const [renaming, setRenaming] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  // A new page doesn't exist yet on the render that adds it, so the scroll
  // target is parked here and fired from onContentSizeChange instead.
  const pendingIndex = useRef<number | null>(null);

  // The screen is never empty: a first configuration is created on open so
  // there is always something to show and bind to. It syncs immediately, the
  // same as handleCreate — without that the new config reaches nothing until
  // the next foreground, and on iOS a placed widget has no config to resolve
  // until it does.
  //
  // Gated on hydration, or a cold start straight into this screen sees an
  // empty list, seeds a config, syncs it, and then has it thrown away when the
  // persisted state lands. app/_layout.tsx gates its own seeding the same way.
  const [hydrated, setHydrated] = useState(() => useWidgetStore.persist.hasHydrated());
  useEffect(() => {
    if (hydrated) return;
    return useWidgetStore.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || configs.length > 0) return;
    const created = addConfig();
    syncWidgets(created.id).catch(() => {});
  }, [hydrated, configs.length, addConfig]);

  // Which configs no placed widget is using. Android reads its own bindings;
  // iOS has to infer it from the extension's mq_seen_ stamps, which is a
  // 3-day-old signal at worst, so treat a "pending" label there as a hint
  // rather than proof. Keyed by config id, absent means not yet determined.
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const refreshPending = useCallback(async () => {
    const { configs: current, isPending } = useWidgetStore.getState();
    if (Platform.OS === 'android') {
      setPending(Object.fromEntries(current.map((c) => [c.id, isPending(c.id)])));
      return;
    }
    if (Platform.OS !== 'ios') return;
    const flags = await Promise.all(current.map((c) => isIOSConfigPending(c.id)));
    setPending(Object.fromEntries(current.map((c, n) => [c.id, flags[n]])));
  }, []);

  // Android can enumerate placed widgets, so bindings are refreshed whenever
  // the screen is shown or the app returns to the foreground.
  const reconcile = useCallback(async () => {
    if (Platform.OS === 'android') {
      const placed = await WidgetBridge.getActiveWidgets();
      const store = useWidgetStore.getState();
      const placedIds = new Set(placed.map((w) => w.widgetId.toString()));

      for (const widgetId of Object.keys(store.bindings)) {
        if (!placedIds.has(widgetId)) store.unbindWidget(widgetId);
      }
      for (const id of placedIds) {
        store.claimConfigFor(id);
      }
    }
    await refreshPending();
  }, [refreshPending]);

  useEffect(() => { reconcile(); }, [reconcile]);

  // A config added on this screen starts unused by definition, and nothing
  // above re-runs on that.
  useEffect(() => { refreshPending(); }, [configs.length, refreshPending]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') reconcile();
    });
    return () => sub.remove();
  }, [reconcile]);

  const active: WidgetConfig | undefined = configs[Math.min(index, configs.length - 1)];

  /** The collection this config draws from, if it draws from one that still exists. */
  const selectedCollection = useMemo(() => {
    const collectionId = active ? collectionIdFromQuoteType(active.quoteType) : null;
    return collectionId === null ? null : collections.find((c) => c.id === collectionId) ?? null;
  }, [active, collections]);

  const openPaywall = () => (modal ? modal.openSheet('trial') : router.push('/subscriptions'));

  /** Every change is Pro-gated and pushes straight through to the widget. */
  const change = useCallback(
    (updates: Partial<WidgetConfig>) => {
      if (!active) return;
      if (!isPro) { openPaywall(); return; }

      updateConfig(active.id, updates);
      // A topic change can change WHICH quotes show, not just how the current
      // one is drawn, so it needs a refetch rather than a re-render.
      syncWidgets(active.id, { refetchQuote: 'quoteType' in updates || 'customize' in updates }).catch(() => {});
    },
    [active, isPro, updateConfig],
  );

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  };

  /** Adding a widget is free — it always starts uncustomized ("mirror the app"). */
  const handleCreate = () => {
    const created = addConfig();
    const newIndex = useWidgetStore.getState().configs.length - 1;
    setIndex(newIndex);
    pendingIndex.current = newIndex;
    syncWidgets(created.id).catch(() => {});
  };

  // Collections sit behind one row rather than inline: the list is the user's
  // own and unbounded, so folding it into the topic list would bury the topics.
  const quoteTypeOptions = useMemo<PickerOption<QuoteTypeOptionValue>[]>(
    () => {
      const builtIn = (Object.entries(QUOTE_TYPE_LABELS) as [WidgetBuiltInQuoteType, string][])
        .map(([value, label]) => ({ value: value as QuoteTypeOptionValue, label }));
      // Straight after the other personal sources (Favorites, My Own Quotes)
      // and ahead of the topic list.
      const [general, favorites, myQuotes, ...topics] = builtIn;
      return [
        general,
        favorites,
        myQuotes,
        {
          value: COLLECTIONS_DRILL,
          label: 'Collections',
          drill: true,
          meta: selectedCollection?.name,
        },
        ...topics,
      ];
    },
    [selectedCollection],
  );

  const collectionOptions = useMemo<PickerOption<QuoteTypeOptionValue>[]>(
    () => collections.map((c) => ({
      value: collectionQuoteType(c.id),
      label: c.name,
      meta: `${c.quotes.length} ${c.quotes.length === 1 ? 'quote' : 'quotes'}`,
    })),
    [collections],
  );

  const intervalOptions = useMemo(
    () => (Object.entries(REFRESH_FREQUENCY_LABELS) as [WidgetRefreshFrequency, string][])
      .map(([value, label]) => ({ value, label })),
    [],
  );

  if (!active) return <View style={{ flex: 1, backgroundColor: theme.background }} />;

  // ── Carousel mode ──────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <SheetHeader
          title="Widgets"
          leading="back"
          onLeadingPress={back}
          right={
            <IconButton icon="plus" onPress={handleCreate} accessibilityLabel="Add widget configuration" />
          }
        />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScrollEnd}
            onContentSizeChange={() => {
              if (pendingIndex.current === null) return;
              scrollRef.current?.scrollTo({ x: pendingIndex.current * width, animated: true });
              pendingIndex.current = null;
            }}
            style={{ marginHorizontal: -GUTTER }}
          >
            {configs.map((c) => (
              <WidgetPreview
                key={c.id}
                config={c}
                width={width}
                theme={theme}
              />
            ))}
          </ScrollView>

          <PageDots count={configs.length} activeIndex={index} />

          <TouchableOpacity
            style={styles.nameRow}
            onPress={() => setRenaming(true)}
            activeOpacity={0.7}
          >
            <Icon name="pencil-outline" size={22} color={theme.gold} />
            <Text style={[styles.nameText, { color: theme.text, fontFamily: FONTS.display.medium }]}>
              {active.customize ? active.name : 'Mirror the app'}
            </Text>
          </TouchableOpacity>

          {/* Only the pending case gets copy. A config that's already in use
              needs no instruction, and the absent case means the lookup hasn't
              landed yet, so claiming either state would be a guess. */}
          {pending[active.id] === true && (
            <Text style={[styles.statusText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              {Platform.OS === 'ios'
                ? 'Not on your Home Screen yet. Add a widget, then hold it, tap Edit Widget, and choose this name.'
                : 'Not on your Home Screen yet. Add a Quotable widget to start using it.'}
            </Text>
          )}

          <ConfigCard
            config={active}
            sourceLabel={quoteTypeLabel(active.quoteType, collections)}
            onChange={change}
            onOpenPicker={(p) => (isPro ? setActivePicker(p) : openPaywall())}
          />

          {configs.length > 1 && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => setConfirmDelete(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.deleteText, { color: theme.text, fontFamily: FONTS.display.medium }]}>
                Delete widget
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {onContinue && (
          <View style={[styles.ctaWrap, { backgroundColor: theme.background }]}>
            <TouchableOpacity
              style={[styles.cta, { backgroundColor: theme.goldButton }]}
              onPress={onContinue}
              activeOpacity={0.85}
            >
              <Text style={[styles.ctaText, { color: ON_GOLD, fontFamily: FONTS.ui.bold }]}>
                Continue
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>

      <EditNameDialog
        visible={renaming}
        onClose={() => setRenaming(false)}
        title="Edit name"
        initialValue={active.name}
        onSubmit={(name) => updateConfig(active.id, { name })}
      />

      <ConfirmSheet
        visible={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete widget"
        message="This configuration will be removed. Any Home Screen widget using it will fall back to another configuration."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => {
          const next = Math.max(0, index - 1);
          removeConfig(active.id);
          setIndex(next);
          pendingIndex.current = next;
        }}
      />

      {/* Topics and Collections share one Modal rather than being two that
          swap. Dismissing one and presenting the other in the same frame drops
          the transition on iOS; switching the contents of a mounted sheet
          reads as a drill-in and can't. */}
      <PickerModal
        visible={activePicker === 'quoteType' || activePicker === 'collection'}
        title={activePicker === 'collection' ? 'Collections' : 'Topics'}
        options={activePicker === 'collection' ? collectionOptions : quoteTypeOptions}
        selected={active.quoteType}
        onSelect={(v) => {
          if (v === COLLECTIONS_DRILL) { setActivePicker('collection'); return; }
          change({ quoteType: v as WidgetQuoteType });
        }}
        onClose={() => setActivePicker(null)}
        onBack={activePicker === 'collection' ? () => setActivePicker('quoteType') : undefined}
        emptyLabel="No collections yet. Save a few quotes into one, then point this widget at it."
        theme={theme}
      />
      <PickerModal
        visible={activePicker === 'interval'}
        title="Refresh"
        options={intervalOptions}
        selected={active.updateInterval}
        onSelect={(v) => change({ updateInterval: v })}
        onClose={() => setActivePicker(null)}
        theme={theme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: GUTTER, paddingBottom: 120 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    marginBottom: SPACE.md,
  },
  nameText: { fontSize: 22, flex: 1 },
  statusText: { fontSize: 13, lineHeight: 19, marginBottom: SPACE.md },
  card: { borderRadius: RADIUS.row, overflow: 'hidden' },
  deleteBtn: { alignItems: 'center', paddingVertical: SPACE.xl },
  deleteText: { fontSize: 18 },
  ctaWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: GUTTER,
    paddingBottom: 32,
    paddingTop: SPACE.md,
  },
  cta: {
    borderRadius: RADIUS.pill,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontSize: 16, letterSpacing: 0.2 },
});
