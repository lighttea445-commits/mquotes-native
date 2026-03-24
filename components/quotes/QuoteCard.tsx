import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  Share,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useRevenueCat } from '../../hooks/useRevenueCat';
import { useFavoritesStore } from '../../store/useFavoritesStore';
import { useHistoryStore } from '../../store/useHistoryStore';
import { useMixStore } from '../../store/useMixStore';
import { useAppStore } from '../../store/useAppStore';
import { ApiQuote, convertApiQuote, fetchMultipleRandomQuotes, fetchQuotesByCategory, inferCategory } from '../../lib/quotesApi';
import { useUserQuotesStore } from '../../store/useUserQuotesStore';
import { useDeepLinkStore } from '../../store/useDeepLinkStore';
import { useMix } from '../../hooks/useMix';
import { CATEGORIES } from '../../constants/categories';
import { useModal } from '../../contexts/ModalContext';
import { DailyReflectPill } from './DailyReflectPill';
import { PremiumModal } from '../subscriptions/PremiumModal';
import * as ExpoSharing from 'expo-sharing';
let ExpoClipboard: { setStringAsync: (text: string) => Promise<void> } | null = null;
try {
  ExpoClipboard = require('expo-clipboard');
} catch {}

import { ShareCard } from './ShareCard';
import { errorReporting } from '../../lib/errorReporting';
import { analytics } from '../../lib/analytics';

let saveToLibrary: ((uri: string) => Promise<void>) | null = null;
let requestMediaPermissions: (() => Promise<{ status: string }>) | null = null;
try {
  const MediaLibrary = require('expo-media-library');
  saveToLibrary = MediaLibrary.saveToLibraryAsync;
  requestMediaPermissions = MediaLibrary.requestPermissionsAsync;
} catch {}

let captureRef: ((ref: React.RefObject<any>, opts: object) => Promise<string>) | null = null;
try { captureRef = require('react-native-view-shot').captureRef; } catch {}

// Maximum quotes to keep prefetched ahead. Prevents unbounded buffer growth.
const MAX_BUFFER_AHEAD = 20;
// Trim old quotes from buffer when past this many to free memory.
const BUFFER_TRIM_THRESHOLD = 10;

export function QuoteCard() {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Dynamic layout values that adapt to every phone screen size.
  const SWIPE_THRESHOLD = SCREEN_HEIGHT * 0.15;
  const BTN_BOTTOM = insets.bottom + 10;           // above safe-area / home indicator
  const PROFILE_BOTTOM = BTN_BOTTOM + 52 + 8;      // stacked above bottom buttons
  const QUOTE_FONT_SIZE = Math.max(18, Math.min(28, Math.round(SCREEN_WIDTH * 0.062)));
  const QUOTE_LINE_HEIGHT = Math.round(QUOTE_FONT_SIZE * 1.58);
  const QUOTE_BODY_PB = BTN_BOTTOM + 52 + 20;      // clear floating buttons

  const theme = useTheme();
  const router = useRouter();
  const modal = useModal();
  const hapticsEnabled = useAppStore((s) => s.preferences.hapticsEnabled);
  const showAuthor = useAppStore((s) => s.preferences.showAuthor);
  const { isPro } = useRevenueCat();
  const { mixActive, selectedCategories, loadQuotesForMix } = useMix();
  const activeCategory = useMixStore((s) => s.activeCategory);
  const mood = useAppStore((s) => s.preferences.mood);
  const { toggleFavorite, isFavorite, favorites } = useFavoritesStore();
  const { addToHistory } = useHistoryStore();

  const [buffer, setBuffer] = useState<ApiQuote[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isEmpty, setIsEmpty] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isSharingMedia, setIsSharingMedia] = useState(false);
  const [watermarkRemoved, setWatermarkRemoved] = useState(false);
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const shareCardRef = useRef<View>(null);
  const isFetching = useRef(false);
  // Incremented by the deep-link effect to cancel any in-flight loadQuotes fetch.
  const loadGenRef = useRef(0);

  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const bigHeartScale = useSharedValue(0);
  const bigHeartOpacity = useSharedValue(0);

  const currentQuote = buffer[currentIndex] ?? null;
  const converted = currentQuote ? convertApiQuote(currentQuote) : null;
  const favorited = converted ? isFavorite(converted.id) : false;

  // Collection pill label + icon
  const activeCategoryName = activeCategory
    ? CATEGORIES.find(c => c.id === activeCategory)?.name ?? activeCategory
    : null;
  const pillLabel = activeCategoryName
    ? activeCategoryName
    : mixActive
      ? 'Mix'
      : 'General';
  const pillIcon = activeCategory
    ? (CATEGORIES.find(c => c.id === activeCategory)?.icon ?? 'apps')
    : mixActive
      ? 'playlist-music'
      : 'cards-outline';

  // Progress pill: favorites toward 5 (unlocks For You section)
  const progressNumerator = Math.min(favorites.length, 5);
  const progressDenominator = 5;
  const progressFraction = progressNumerator / progressDenominator;

  const selectedCategoriesKey = selectedCategories.join(',');
  const pendingQuote = useDeepLinkStore((s) => s.pendingQuote);
  const clearPendingQuote = useDeepLinkStore((s) => s.clearPendingQuote);

  // Flag set by the deep-link effect so the loadQuotes effect (which fires in the
  // same render cycle on mount) knows NOT to start a competing fetch.
  const deepLinkHandledRef = useRef(false);

  // When a notification or widget tap sends us a specific quote, show it immediately.
  // We use the content carried in the deep-link payload (text + author) so no network
  // call is needed — the quote text was already embedded in the notification or cached
  // in the widget store. This effect must run BEFORE the loadQuotes effect.
  useEffect(() => {
    if (!pendingQuote) return;
    console.log('[QuoteCard] Deep-link effect fired, pendingQuote:', pendingQuote.id, pendingQuote.text?.slice(0, 40));
    deepLinkHandledRef.current = true;
    // Bump the generation so any in-flight loadQuotes discards its result and
    // doesn't overwrite the buffer we're about to set.
    loadGenRef.current++;
    const { id, text, author } = pendingQuote;
    clearPendingQuote();

    // Resolve quote text: payload may be empty for user quotes.
    let resolvedText = text;
    let resolvedAuthor = author;
    if (!resolvedText) {
      if (id.startsWith('user-')) {
        const userQuote = useUserQuotesStore.getState().userQuotes.find(q => q.id === id);
        if (userQuote) {
          resolvedText = userQuote.text;
          resolvedAuthor = userQuote.author;
        }
      }
      // Still no text — fall back to a normal random load.
      if (!resolvedText) {
        loadQuotes();
        return;
      }
    }

    const quote: ApiQuote = {
      _id: id,
      content: resolvedText,
      author: resolvedAuthor || 'Unknown',
      tags: [],
      authorSlug: '',
      length: resolvedText.length,
    };
    const c = convertApiQuote(quote);
    addToHistory({ id: c.id, text: c.text, author: c.author, category: c.category });
    setBuffer([quote]);
    setCurrentIndex(0);
    setLoading(false);
    prefetchMore();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingQuote]);

  useEffect(() => {
    // Skip if the deep-link effect just populated the buffer in this same
    // render cycle. clearPendingQuote() has already run so the store reads null
    // — we use the ref to detect this case without a stale closure.
    if (deepLinkHandledRef.current) {
      deepLinkHandledRef.current = false;
      return;
    }
    // Best-effort: if a widget/notification quote is already waiting in the
    // store (set before QuoteCard mounted), skip the network load entirely.
    if (useDeepLinkStore.getState().pendingQuote) {
      return;
    }
    loadQuotes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, mixActive, selectedCategoriesKey, mood]);

  async function loadQuotes() {
    const gen = ++loadGenRef.current;
    setLoading(true);
    setIsEmpty(false);
    setFetchError(null);
    let quotes: ApiQuote[] = [];
    try {
      if (activeCategory) {
        quotes = await fetchQuotesByCategory(activeCategory);
        if (quotes.length === 0) quotes = await fetchMultipleRandomQuotes(20);
      } else if (mixActive && selectedCategories.length > 0) {
        quotes = await loadQuotesForMix();
      } else {
        quotes = await fetchMultipleRandomQuotes(20);
      }
    } catch (err) {
      if (gen !== loadGenRef.current) return; // cancelled by deep-link
      if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      errorReporting.captureError(err, { context: 'loadQuotes', activeCategory: activeCategory ?? undefined, mixActive });
      setFetchError("Couldn't load quotes. Check your connection.");
      setLoading(false);
      return;
    }
    // A deep-link arrived while we were fetching — discard these results.
    if (gen !== loadGenRef.current) return;
    if (quotes.length === 0 && mixActive) {
      setIsEmpty(true);
      setBuffer([]);
      setCurrentIndex(0);
      setLoading(false);
      return;
    }
    // Network failure — all fetchers returned empty
    if (quotes.length === 0) {
      if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setFetchError("Couldn't load quotes. Check your connection.");
      setLoading(false);
      return;
    }
    setBuffer(quotes);
    setCurrentIndex(0);
    if (quotes[0]) {
      const c = convertApiQuote(quotes[0]);
      addToHistory({ id: c.id, text: c.text, author: c.author, category: c.category });
      analytics.track('quote_viewed', { author: c.author, category: c.category, source: activeCategory ?? 'general' });
    }
    setLoading(false);
  }

  async function prefetchMore() {
    if (isFetching.current) return;
    // Skip if there are already enough quotes buffered ahead of the current position.
    if (buffer.length - currentIndex > MAX_BUFFER_AHEAD) return;
    isFetching.current = true;
    try {
      let more: ApiQuote[];
      if (activeCategory) {
        more = await fetchQuotesByCategory(activeCategory);
        if (more.length === 0) more = await fetchMultipleRandomQuotes(10);
      } else if (mixActive && selectedCategories.length > 0) {
        more = await loadQuotesForMix();
      } else {
        more = await fetchMultipleRandomQuotes(10);
      }
      if (more.length > 0) setBuffer(prev => [...prev, ...more]);
    } catch (err) {
      errorReporting.captureError(err, { context: 'prefetchMore' });
    } finally {
      isFetching.current = false;
    }
  }

  const animateOut = (direction: 'up' | 'down', onDone: () => void) => {
    const toY = direction === 'up' ? -SCREEN_HEIGHT * 0.55 : SCREEN_HEIGHT * 0.55;
    translateY.value = withTiming(toY, { duration: 200, easing: Easing.in(Easing.cubic) });
    scale.value = withTiming(0.93, { duration: 200, easing: Easing.in(Easing.quad) });
    opacity.value = withTiming(0, { duration: 160 }, () => { runOnJS(onDone)(); });
  };

  const animateIn = (direction: 'up' | 'down') => {
    const fromY = direction === 'up' ? SCREEN_HEIGHT * 0.22 : -SCREEN_HEIGHT * 0.22;
    translateY.value = fromY;
    scale.value = 0.93;
    opacity.value = 0;
    translateY.value = withSpring(0, { damping: 22, stiffness: 280, mass: 0.85 });
    scale.value = withSpring(1, { damping: 20, stiffness: 260, mass: 0.85 });
    opacity.value = withTiming(1, { duration: 160 });
  };

  const goNext = useCallback(() => {
    const nextIdx = currentIndex + 1;
    if (nextIdx >= buffer.length - 3) prefetchMore();
    if (nextIdx >= buffer.length) { loadQuotes(); return; }
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animateOut('up', () => {
      const q = buffer[nextIdx]; // capture before potential trim
      if (nextIdx > BUFFER_TRIM_THRESHOLD) {
        // Trim consumed quotes to prevent unbounded memory growth
        setBuffer(prev => prev.slice(nextIdx));
        setCurrentIndex(0);
      } else {
        setCurrentIndex(nextIdx);
      }
      if (q) {
        const c = convertApiQuote(q);
        addToHistory({ id: c.id, text: c.text, author: c.author, category: c.category });
        analytics.track('quote_viewed', { author: c.author, category: c.category, source: activeCategory ?? 'general' });
      }
      runOnJS(animateIn)('up');
    });
  }, [currentIndex, buffer]);

  const goPrev = useCallback(() => {
    if (currentIndex <= 0) return;
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animateOut('down', () => {
      setCurrentIndex(prev => prev - 1);
      runOnJS(animateIn)('down');
    });
  }, [currentIndex]);

  const handleFavorite = useCallback(() => {
    if (!converted) return;
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const willFavorite = !favorited;
    analytics.track(willFavorite ? 'quote_favorited' : 'quote_unfavorited', {
      author: converted.author,
      category: converted.category,
    });
    toggleFavorite({
      id: converted.id,
      text: converted.text,
      author: converted.author,
      category: activeCategory ?? inferCategory(converted.text, currentQuote?.tags),
      tags: currentQuote?.tags,
    });
    if (willFavorite) {
      bigHeartScale.value = 0;
      bigHeartOpacity.value = 0;
      bigHeartScale.value = withSequence(
        withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }),
        withDelay(800, withTiming(0, { duration: 1 })),
      );
      bigHeartOpacity.value = withSequence(
        withTiming(1, { duration: 80 }),
        withDelay(320, withTiming(0, { duration: 400 })),
      );
    }
  }, [converted, favorited, toggleFavorite]);

  const handleShare = useCallback(async () => {
    if (!converted || isSharingMedia) return;
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    analytics.track('quote_shared', { author: converted.author, category: converted.category });
    setIsSharingMedia(true);
    try {
      if (captureRef) {
        try {
          const uri = await captureRef(shareCardRef, { format: 'png', quality: 1.0, result: 'tmpfile' });
          const canShare = await ExpoSharing.isAvailableAsync();
          if (canShare) {
            await ExpoSharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share Quote' });
            return;
          }
        } catch (captureErr) {
          errorReporting.captureException(captureErr as Error, { context: 'handleShare:capture' });
          // fall through to text share
        }
      }
      await Share.share({ message: `"${converted.text}"\n\n— ${converted.author}` });
    } catch (e) {
      errorReporting.captureException(e as Error, { context: 'handleShare' });
    } finally {
      setIsSharingMedia(false);
    }
  }, [converted, isSharingMedia]);

  const handleCopyText = useCallback(async () => {
    if (!converted) return;
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await ExpoClipboard?.setStringAsync(converted.text);
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 1500);
    analytics.track('quote_copied', { author: converted.author, category: converted.category });
  }, [converted]);

  const handleSaveImage = useCallback(async () => {
    if (!converted || isSharingMedia) return;
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    analytics.track('quote_saved', { author: converted.author, category: converted.category });
    setIsSharingMedia(true);
    try {
      if (captureRef) {
        const uri = await captureRef(shareCardRef, { format: 'png', quality: 1.0, result: 'tmpfile' });
        if (saveToLibrary && requestMediaPermissions) {
          const { status } = await requestMediaPermissions();
          if (status === 'granted') {
            await saveToLibrary(uri);
            return;
          }
        }
        // Fallback: share if no media library access
        const canShare = await ExpoSharing.isAvailableAsync();
        if (canShare) {
          await ExpoSharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Save Quote Image' });
        }
      }
    } catch (e) {
      errorReporting.captureException(e as Error, { context: 'handleSaveImage' });
    } finally {
      setIsSharingMedia(false);
    }
  }, [converted, isSharingMedia]);

  const handleToggleWatermark = useCallback(() => {
    if (!isPro) {
      if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      modal ? modal.openSheet('features') : setShowPremiumModal(true);
      return;
    }
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWatermarkRemoved(prev => !prev);
  }, [isPro, modal]);

  // Pan gesture — require 15px vertical movement before activating so taps
  // on the share/heart buttons pass through cleanly to TouchableOpacity.
  const startY = useSharedValue(0);
  const panGesture = Gesture.Pan()
    .activeOffsetY([-15, 15])
    .onStart(() => { startY.value = translateY.value; })
    .onUpdate((e) => {
      const dy = e.translationY;
      translateY.value = startY.value + dy * 0.55;
      const absProgress = Math.abs(dy) / SCREEN_HEIGHT;
      scale.value = 1 - absProgress * 0.04;
      opacity.value = 1 - absProgress * 0.45;
    })
    .onEnd((e) => {
      if (e.translationY < -SWIPE_THRESHOLD) {
        runOnJS(goNext)();
      } else if (e.translationY > SWIPE_THRESHOLD && currentIndex > 0) {
        runOnJS(goPrev)();
      } else {
        translateY.value = withSpring(0, { damping: 22, stiffness: 300 });
        scale.value = withSpring(1, { damping: 18, stiffness: 280 });
        opacity.value = withTiming(1, { duration: 120 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  const bigHeartAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bigHeartScale.value }],
    opacity: bigHeartOpacity.value,
  }));

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.gold} size="large" />
        {activeCategory && (
          <Text style={[styles.loadingLabel, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
            Loading quotes…
          </Text>
        )}
      </View>
    );
  }

  if (fetchError) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <MaterialCommunityIcons name="wifi-off" size={48} color={theme.textMuted} />
        <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
          Couldn't load quotes
        </Text>
        <Text style={[styles.emptyMessage, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
          {fetchError}
        </Text>
        <TouchableOpacity
          onPress={loadQuotes}
          style={[styles.emptyBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <Text style={[styles.emptyBtnText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
            Try Again
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isEmpty) {
    const onlyFavorites = selectedCategories.every(c => c === '_favorites');
    const onlyMyQuotes = selectedCategories.every(c => c === '_myquotes');
    const emptyIcon = onlyFavorites ? 'heart-outline' : onlyMyQuotes ? 'pencil-outline' : 'playlist-remove';
    const emptyMessage = onlyFavorites
      ? 'Heart some quotes to fill this mix.'
      : onlyMyQuotes
      ? 'Add your own quotes to fill this mix.'
      : 'No quotes found for the selected categories.';

    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <MaterialCommunityIcons name={emptyIcon as any} size={48} color={theme.textMuted} />
        <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
          Nothing here yet
        </Text>
        <Text style={[styles.emptyMessage, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
          {emptyMessage}
        </Text>
        <TouchableOpacity
          onPress={() => modal ? modal.openSheet('mix') : router.push('/mix/create')}
          style={[styles.emptyBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <Text style={[styles.emptyBtnText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
            Edit Mix
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const containerContent = (
      <View
        style={styles.container}
        accessible={true}
        accessibilityRole="adjustable"
        accessibilityHint="Swipe up for the next quote, swipe down to go back"
      >

        {/* ── TOP BAR: fixed — never animates ── */}
        <View style={styles.topBar}>
          {/* Left spacer balances the crown on the right */}
          <View style={styles.topBarSpacer} />

          {/* Center: progress pill or collection pill */}
          <View style={styles.topBarCenter}>
            {favorites.length < 5 ? (
              <View style={[styles.progressPill, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <MaterialCommunityIcons name="heart" size={13} color={theme.gold} />
                <Text style={[styles.progressText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                  {progressNumerator}/{progressDenominator}
                </Text>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: theme.gold,
                        width: `${Math.round(progressFraction * 100)}%`,
                      } as any,
                    ]}
                  />
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  if (hapticsEnabled) Haptics.selectionAsync();
                  modal ? modal.openSheet('mix') : router.push('/mix/create');
                }}
                style={[styles.collectionPill, { backgroundColor: theme.surface, borderColor: theme.border }]}
                accessibilityLabel="Open mix builder"
              >
                {!mixActive && (
                  <MaterialCommunityIcons name={pillIcon as any} size={14} color={theme.textMuted} />
                )}
                <Text style={[styles.collectionPillText, { color: pillLabel === 'Mix' ? theme.gold : theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                  {pillLabel}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Right: crown icon — gold if Pro, muted if free */}
          <TouchableOpacity
            onPress={() => {
              if (hapticsEnabled) Haptics.selectionAsync();
              if (isPro) setShowPremiumModal(true);
              else modal ? modal.openSheet('features') : undefined;
            }}
            style={[styles.crownBtn, { backgroundColor: theme.surface }]}
            accessibilityLabel={isPro ? 'Premium member' : 'Upgrade to premium'}
          >
            <MaterialCommunityIcons
              name="crown"
              size={20}
              color={isPro ? theme.gold : theme.textMuted}
            />
          </TouchableOpacity>
        </View>

        {/* ── QUOTE ONLY — this is what animates ── */}
        <Animated.View style={[styles.quoteAnimated, animatedStyle]}>
          <View style={[styles.quoteBody, { paddingBottom: QUOTE_BODY_PB }]}>
            <View style={styles.quoteWrapper}>
              <Text
                style={[styles.quoteText, { color: theme.text, fontFamily: theme.quoteFontFamily, fontSize: QUOTE_FONT_SIZE, lineHeight: QUOTE_LINE_HEIGHT }]}
                accessible={true}
                accessibilityRole="text"
                accessibilityLabel={`Quote by ${converted?.author ?? 'Unknown'}: ${converted?.text}`}
              >
                {converted?.text}
              </Text>
              {showAuthor && converted?.author ? (
                <Text style={[styles.authorText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                  — {converted.author}
                </Text>
              ) : null}
              <Animated.View style={[styles.bigHeartOverlay, bigHeartAnimStyle]} pointerEvents="none">
                <MaterialCommunityIcons name="heart" size={180} color={theme.gold} />
              </Animated.View>
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity onPress={() => { if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowShareSheet(true); }} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
                <MaterialCommunityIcons name="redo" size={32} color={theme.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleFavorite} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
                <MaterialCommunityIcons
                  name={favorited ? 'heart' : 'heart-outline'}
                  size={32}
                  color={favorited ? theme.gold : theme.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* ── CORNER BUTTONS: fixed — never animate ── */}
        <TouchableOpacity
          onPress={() => { if (hapticsEnabled) Haptics.selectionAsync(); modal ? modal.openSheet('categories') : router.push('/categories'); }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[styles.categoriesFloat, { backgroundColor: theme.surface, bottom: BTN_BOTTOM, left: BTN_BOTTOM }]}
          accessibilityLabel="Browse categories"
        >
          <MaterialCommunityIcons name="apps" size={22} color={theme.gold} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { if (hapticsEnabled) Haptics.selectionAsync(); modal ? modal.openSheet('profile') : router.push('/profile'); }}
          style={[styles.profileFloat, { backgroundColor: theme.surface, bottom: PROFILE_BOTTOM, right: BTN_BOTTOM }]}
          accessibilityLabel="Open profile"
        >
          <MaterialCommunityIcons name="account-outline" size={20} color={theme.gold} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { if (hapticsEnabled) Haptics.selectionAsync(); modal ? modal.openSheet('themes') : router.push('/themes'); }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[styles.themesFloat, { backgroundColor: theme.surface, bottom: BTN_BOTTOM, right: BTN_BOTTOM }]}
          accessibilityLabel="Change theme"
        >
          <MaterialCommunityIcons name="brush-variant" size={22} color={theme.gold} />
        </TouchableOpacity>

        {/* Daily Reflect pill — centered bottom */}
        <DailyReflectPill />

      </View>
  );

  return (
    <>
      <GestureDetector gesture={panGesture}>
        {containerContent}
      </GestureDetector>
      <PremiumModal visible={showPremiumModal} onClose={() => setShowPremiumModal(false)} />

      {/* ── SHARE SHEET MODAL ── */}
      <Modal
        visible={showShareSheet}
        animationType="slide"
        onRequestClose={() => setShowShareSheet(false)}
      >
        <View style={[styles.sheetScreen, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
          {/* Drag handle */}
          <View style={styles.sheetDragHandle}>
            <View style={styles.sheetDragPill} />
          </View>

          {/* Header */}
          <View style={styles.sheetHeader}>
            <TouchableOpacity
              onPress={() => setShowShareSheet(false)}
              style={styles.sheetCloseBtn}
              accessibilityLabel="Close share sheet"
            >
              <MaterialCommunityIcons name="close" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
          </View>

          {/* Screen title */}
          <Text style={[styles.sheetTitle, { fontFamily: theme.quoteFontFamily }]}>Share</Text>

          {/* Card preview */}
          <View style={styles.sheetCardWrapper}>
            <ShareCard
              quote={converted?.text ?? ''}
              author={converted?.author ?? ''}
              theme={theme}
              size={Math.round(SCREEN_WIDTH * 0.72)}
              showWatermark={!(isPro && watermarkRemoved)}
            />
          </View>

          {/* Action buttons */}
          <View style={styles.sheetActions}>
            {/* Save image */}
            <TouchableOpacity onPress={handleSaveImage} style={styles.sheetActionItem}>
              <View style={styles.sheetActionCircle}>
                <MaterialCommunityIcons name="tray-arrow-down" size={24} color="#fff" />
              </View>
              <Text style={[styles.sheetActionLabel, { fontFamily: theme.uiFontFamily }]}>
                Save{'\n'}image
              </Text>
            </TouchableOpacity>

            {/* Copy text */}
            <TouchableOpacity onPress={handleCopyText} style={styles.sheetActionItem}>
              <View style={[styles.sheetActionCircle, copiedFeedback && styles.sheetActionCircleActive]}>
                <MaterialCommunityIcons
                  name={copiedFeedback ? 'check' : 'content-copy'}
                  size={24}
                  color={copiedFeedback ? theme.gold : '#fff'}
                />
              </View>
              <Text style={[styles.sheetActionLabel, { fontFamily: theme.uiFontFamily, color: copiedFeedback ? theme.gold : '#fff' }]}>
                {copiedFeedback ? 'Copied!' : 'Copy\ntext'}
              </Text>
            </TouchableOpacity>

            {/* Hide watermark */}
            <TouchableOpacity onPress={handleToggleWatermark} style={styles.sheetActionItem}>
              <View style={[styles.sheetActionCircle, (isPro && watermarkRemoved) && styles.sheetActionCircleActive]}>
                <MaterialCommunityIcons
                  name={(isPro && watermarkRemoved) ? 'image-off-outline' : 'image-minus-outline'}
                  size={24}
                  color={(isPro && watermarkRemoved) ? theme.gold : '#fff'}
                />
              </View>
              <Text style={[styles.sheetActionLabel, { fontFamily: theme.uiFontFamily, color: (isPro && watermarkRemoved) ? theme.gold : '#fff' }]}>
                {(isPro && watermarkRemoved) ? 'Show\nwatermark' : 'Hide\nwatermark'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Share button */}
          <TouchableOpacity
            onPress={handleShare}
            style={[styles.sheetShareBtn, { borderColor: 'rgba(255,255,255,0.15)' }]}
          >
            <MaterialCommunityIcons name="export-variant" size={20} color="#fff" />
            <Text style={[styles.sheetShareBtnText, { fontFamily: theme.uiFontFamily }]}>
              Share
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Hidden card for image capture — opacity:0 keeps it in viewport so Fabric allocates a real native view */}
      <View style={{ position: 'absolute', top: 0, left: 0, opacity: 0 }} pointerEvents="none" collapsable={false}>
        <View ref={shareCardRef} collapsable={false} renderToHardwareTextureAndroid style={{ borderRadius: 0, overflow: 'hidden' }}>
          <ShareCard
            quote={converted?.text ?? ''}
            author={converted?.author ?? ''}
            theme={theme}
            size={400}
            showWatermark={!(isPro && watermarkRemoved)}
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingLabel: {
    marginTop: 12,
    fontSize: 14,
  },
  quoteAnimated: {
    flex: 1,
  },

  // Empty state
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 32,
    marginBottom: 24,
  },
  emptyBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  emptyBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  topBarSpacer: {
    width: 52,
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
  },
  crownBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 7,
    minWidth: 140,
    maxWidth: 220,
  },
  progressText: {
    fontSize: 13,
  },
  progressTrack: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(184,151,90,0.18)',
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 1,
  },

  // Quote body
  quoteBody: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 16,
    // paddingBottom applied inline (dynamic, accounts for safe-area + floating buttons)
  },
  quoteText: {
    // fontSize and lineHeight applied inline (dynamic, scales with screen width)
    textAlign: 'center',
    letterSpacing: 0.2,
    marginBottom: 20,
  },
  authorText: {
    fontSize: 13,
    textAlign: 'center',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  // Actions (inside quoteBody, below author)
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    marginTop: 28,
  },

  // Share sheet screen
  sheetScreen: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  sheetDragHandle: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  sheetDragPill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 8,
  },
  sheetCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#fff',
    alignSelf: 'flex-start',
    marginBottom: 28,
  },
  sheetCardWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 14,
    marginBottom: 36,
  },
  sheetActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    marginBottom: 36,
  },
  sheetActionItem: {
    alignItems: 'center',
    gap: 10,
    minWidth: 72,
  },
  sheetActionCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetActionCircleActive: {
    backgroundColor: 'rgba(184,151,90,0.15)',
  },
  sheetActionLabel: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    color: '#fff',
  },
  sheetShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  sheetShareBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },

  // Collection pill (mix / category / general)
  collectionPill: {
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 28,
    minWidth: 100,
  },
  collectionPillText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Wraps quote text so the big heart overlay positions relative to it.
  // minHeight matches the heart icon size so short quotes don't clip it.
  quoteWrapper: {
    position: 'relative',
    minHeight: 180,
    justifyContent: 'center',
    overflow: 'visible',
  },

  // Big heart overlay — centered over the quote text wrapper
  bigHeartOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Floating corner buttons (bottom/left/right applied inline — dynamic safe-area offsets)
  categoriesFloat: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themesFloat: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileFloat: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
