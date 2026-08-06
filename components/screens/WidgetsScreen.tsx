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
  createConfig,
  nextConfigName,
  type WidgetConfig,
  type WidgetRefreshFrequency,
  type WidgetQuoteType,
  REFRESH_FREQUENCY_LABELS,
  QUOTE_TYPE_LABELS,
} from '../../store/useWidgetStore';
import { WidgetBridge } from '../../modules/widget-bridge';
import { syncWidgets } from '../../lib/widgetSync';
import { useRevenueCat } from '../../hooks/useRevenueCat';
import { useModal } from '../../contexts/ModalContext';
import { GUTTER, SPACE, RADIUS, ON_GOLD } from '../ui/tokens';

const PREVIEW_QUOTE = 'Discipline always beats motivation.';

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
        <Text style={[pickerStyles.title, { color: theme.text, fontFamily: FONTS.display.bold }]}>
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
              {item.value === selected && <Icon name="check" size={18} color={theme.gold} />}
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
  title: { fontSize: 18, paddingHorizontal: 20, paddingVertical: 14 },
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
// A handset with the widget face inside it. Deliberately plain Views rather
// than art/PhoneFrame: that one is a single-weight line-art outline, and this
// needs a solid body so the widget card reads as sitting on a home screen.

const PHONE_VB_W = 240;
const PHONE_VB_H = 240 * 1.28;

/**
 * Vector handset chrome: rounded body, a top sheen for depth, a Dynamic
 * Island-style pill and a home indicator. Renders once behind the widget
 * face content, which stays regular RN Views/Text — SVG doesn't wrap dynamic
 * multiline text cleanly, so only the chrome is drawn as SVG.
 */
function PhoneChrome({ width, height, theme }: { width: number; height: number; theme: ReturnType<typeof useTheme> }) {
  const r = PHONE_VB_W * 0.14;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${PHONE_VB_W} ${PHONE_VB_H}`} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id="phoneSheen" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={theme.text} stopOpacity={0.08} />
          <Stop offset="0.35" stopColor={theme.text} stopOpacity={0} />
        </LinearGradient>
      </Defs>

      <Rect
        x={1.5}
        y={1.5}
        width={PHONE_VB_W - 3}
        height={PHONE_VB_H - 3}
        rx={r}
        fill={theme.surface}
        stroke={theme.border}
        strokeWidth={1.5}
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
        x={PHONE_VB_W / 2 - 20}
        y={PHONE_VB_H - 16}
        width={40}
        height={4}
        rx={2}
        fill={theme.text}
        opacity={0.35}
      />
    </Svg>
  );
}

function WidgetPreview({
  config,
  pending,
  width,
  theme,
}: {
  config: WidgetConfig;
  pending: boolean;
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
                borderWidth: config.showBorder ? 1.5 : 0,
                borderColor: theme.text,
              },
            ]}
          >
            <Text
              style={[previewStyles.quote, { color: theme.text, fontFamily: theme.quoteFontFamily }]}
              numberOfLines={4}
            >
              {PREVIEW_QUOTE}
            </Text>

            {config.showButtons && (
              <View style={previewStyles.buttons}>
                <Icon name="chevron-left" size={16} color={theme.text} />
                <Icon name="export-variant" size={16} color={theme.text} />
                <Icon name="heart-outline" size={16} color={theme.text} />
                <Icon name="chevron-right" size={16} color={theme.text} />
              </View>
            )}

            {pending && (
              <View style={[previewStyles.badge, { backgroundColor: theme.goldButton }]}>
                <Text style={[previewStyles.badgeText, { color: ON_GOLD, fontFamily: FONTS.ui.medium }]}>
                  Pending
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const previewStyles = StyleSheet.create({
  faceWrap: {
    flex: 1,
    paddingTop: 34,
    paddingHorizontal: 18,
    paddingBottom: 34,
  },
  face: {
    width: '100%',
    flex: 1,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  quote: { fontSize: 17, lineHeight: 24, textAlign: 'center' },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    position: 'absolute',
    bottom: 14,
    left: 18,
    right: 18,
  },
  badge: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
  },
  badgeText: { fontSize: 12 },
});

// ── Settings card ─────────────────────────────────────────────────────────────

function ConfigCard({
  config,
  onChange,
  onOpenPicker,
}: {
  config: WidgetConfig;
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
            trailing={{ kind: 'valueChevron', value: QUOTE_TYPE_LABELS[config.quoteType] }}
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
            onPress={() => onOpenPicker('interval')}
            trailing={{ kind: 'valueChevron', value: REFRESH_FREQUENCY_LABELS[config.updateInterval] }}
          />
          <ListRow
            label="Show buttons"
            last
            trailing={{
              kind: 'switch',
              value: config.showButtons,
              onValueChange: (v) => onChange({ showButtons: v }),
            }}
          />
        </>
      )}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

type ActivePicker = 'quoteType' | 'interval' | null;

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
  const bindings = useWidgetStore((s) => s.bindings);
  const addConfig = useWidgetStore((s) => s.addConfig);
  const updateConfig = useWidgetStore((s) => s.updateConfig);
  const removeConfig = useWidgetStore((s) => s.removeConfig);

  const [index, setIndex] = useState(0);
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);
  const [renaming, setRenaming] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  /** Non-null while the "+" flow is open; not yet added to the store. */
  const [draft, setDraft] = useState<WidgetConfig | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // The screen is never empty: a first configuration is created on open so
  // there is always something to show and bind to.
  useEffect(() => {
    if (configs.length === 0) addConfig();
  }, [configs.length, addConfig]);

  // Android can enumerate placed widgets, so bindings are refreshed whenever
  // the screen is shown or the app returns to the foreground.
  const reconcile = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    const placed = await WidgetBridge.getActiveWidgets();
    const store = useWidgetStore.getState();
    const placedIds = new Set(placed.map((w) => w.widgetId.toString()));

    for (const widgetId of Object.keys(store.bindings)) {
      if (!placedIds.has(widgetId)) store.unbindWidget(widgetId);
    }
    for (const id of placedIds) {
      store.claimConfigFor(id);
    }
  }, []);

  useEffect(() => { reconcile(); }, [reconcile]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') reconcile();
    });
    return () => sub.remove();
  }, [reconcile]);

  const active: WidgetConfig | undefined = draft ?? configs[Math.min(index, configs.length - 1)];

  const isPending = useCallback(
    (configId: string) => !Object.values(bindings).includes(configId),
    [bindings],
  );

  const openPaywall = () => (modal ? modal.openSheet('trial') : router.push('/subscriptions'));

  /** Every change is Pro-gated and pushes straight through to the widget. */
  const change = useCallback(
    (updates: Partial<WidgetConfig>) => {
      if (!active) return;
      if (!isPro) { openPaywall(); return; }

      if (draft) {
        setDraft({ ...draft, ...updates });
        return;
      }
      updateConfig(active.id, updates);
      // A topic change can change WHICH quotes show, not just how the current
      // one is drawn, so it needs a refetch rather than a re-render.
      syncWidgets(active.id, { refetchQuote: 'quoteType' in updates || 'customize' in updates }).catch(() => {});
    },
    [active, draft, isPro, updateConfig],
  );

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  };

  const handleCreate = () => {
    if (!isPro) { openPaywall(); return; }
    // A new config always starts uncustomized — never inherits an existing
    // config's Customize toggle along with its other borrowed defaults.
    setDraft({
      ...(useWidgetStore.getState().configs[0] ?? createConfig(nextConfigName(configs))),
      id: '',
      name: '',
      customize: false,
      cachedQuote: null,
    });
  };

  const quoteTypeOptions = useMemo(
    () => (Object.entries(QUOTE_TYPE_LABELS) as [WidgetQuoteType, string][])
      .map(([value, label]) => ({ value, label })),
    [],
  );

  const intervalOptions = useMemo(
    () => (Object.entries(REFRESH_FREQUENCY_LABELS) as [WidgetRefreshFrequency, string][])
      .map(([value, label]) => ({ value, label })),
    [],
  );

  if (!active) return <View style={{ flex: 1, backgroundColor: theme.background }} />;

  // ── Create mode ────────────────────────────────────────────────────────────

  if (draft) {
    const commit = () => {
      const created = addConfig(draft.name || undefined);
      updateConfig(created.id, {
        customize: draft.customize,
        quoteType: draft.quoteType,
        showBorder: draft.showBorder,
        updateInterval: draft.updateInterval,
        showButtons: draft.showButtons,
      });
      setDraft(null);
      setIndex(useWidgetStore.getState().configs.length - 1);
      syncWidgets(created.id).catch(() => {});
    };

    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <SheetHeader
            title={draft.name || 'New widget'}
            leading="back"
            onLeadingPress={() => setDraft(null)}
          />

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <WidgetPreview config={draft} pending width={width} theme={theme} />

            <TouchableOpacity
              style={styles.nameRow}
              onPress={() => setRenaming(true)}
              activeOpacity={0.7}
            >
              <Icon name="pencil-outline" size={22} color={theme.text} />
              <Text style={[styles.nameText, { color: theme.text, fontFamily: FONTS.display.medium }]}>
                {draft.name || 'New widget'}
              </Text>
            </TouchableOpacity>

            <ConfigCard
              config={draft}
              onChange={change}
              onOpenPicker={(p) => setActivePicker(p)}
            />
          </ScrollView>

          <View style={[styles.ctaWrap, { backgroundColor: theme.background }]}>
            <TouchableOpacity
              style={[styles.cta, { backgroundColor: theme.goldButton }]}
              onPress={commit}
              activeOpacity={0.85}
            >
              <Text style={[styles.ctaText, { color: ON_GOLD, fontFamily: FONTS.ui.bold }]}>
                Create new widget
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <EditNameDialog
          visible={renaming}
          onClose={() => setRenaming(false)}
          title="Edit name"
          initialValue={draft.name}
          onSubmit={(name) => setDraft({ ...draft, name })}
        />

        <PickerModal
          visible={activePicker === 'quoteType'}
          title="Topics"
          options={quoteTypeOptions}
          selected={draft.quoteType}
          onSelect={(v) => change({ quoteType: v })}
          onClose={() => setActivePicker(null)}
          theme={theme}
        />
        <PickerModal
          visible={activePicker === 'interval'}
          title="Refresh"
          options={intervalOptions}
          selected={draft.updateInterval}
          onSelect={(v) => change({ updateInterval: v })}
          onClose={() => setActivePicker(null)}
          theme={theme}
        />
      </View>
    );
  }

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
          <Text style={[styles.subtitle, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
            Set up your Home Screen widget
          </Text>

          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScrollEnd}
            style={{ marginHorizontal: -GUTTER }}
          >
            {configs.map((c) => (
              <WidgetPreview
                key={c.id}
                config={c}
                pending={isPending(c.id)}
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
            <Icon name="pencil-outline" size={22} color={theme.text} />
            <Text style={[styles.nameText, { color: theme.text, fontFamily: FONTS.display.medium }]}>
              {active.customize ? active.name : 'Mirror the app'}
            </Text>
          </TouchableOpacity>

          <ConfigCard
            config={active}
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
          removeConfig(active.id);
          setIndex((i) => Math.max(0, i - 1));
          scrollRef.current?.scrollTo({ x: 0, animated: false });
        }}
      />

      <PickerModal
        visible={activePicker === 'quoteType'}
        title="Topics"
        options={quoteTypeOptions}
        selected={active.quoteType}
        onSelect={(v) => change({ quoteType: v })}
        onClose={() => setActivePicker(null)}
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
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: SPACE.lg },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    marginBottom: SPACE.md,
  },
  nameText: { fontSize: 22, flex: 1 },
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
