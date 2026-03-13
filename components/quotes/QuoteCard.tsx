import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,

  Share,
  useWindowDimensions,
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
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useRevenueCat } from '../../hooks/useRevenueCat';
import { useFavoritesStore } from '../../store/useFavoritesStore';
import { useHistoryStore } from '../../store/useHistoryStore';
import { useMixStore } from '../../store/useMixStore';
import { useAppStore } from '../../store/useAppStore';
import { ApiQuote, convertApiQuote, fetchMultipleRandomQuotes, fetchQuotesByCategory, inferCategory } from '../../lib/quotesApi';
import { useMix } from '../../hooks/useMix';
import { CATEGORIES } from '../../constants/categories';
import { useModal } from '../../contexts/ModalContext';
import { DailyReflectPill } from './DailyReflectPill';
import { PremiumModal } from '../subscriptions/PremiumModal';
import { errorReporting } from '../../lib/errorReporting';
import { analytics } from '../../lib/analytics';

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
  const isFetching = useRef(false);

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

  useEffect(() => {
    loadQuotes();
  }, [activeCategory, mixActive, selectedCategoriesKey, mood]);

  async function loadQuotes() {
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      errorReporting.captureError(err, { context: 'loadQuotes', activeCategory: activeCategory ?? undefined, mixActive });
      setFetchError("Couldn't load quotes. Check your connection.");
      setLoading(false);
      return;
    }
    if (quotes.length === 0 && mixActive) {
      setIsEmpty(true);
      setBuffer([]);
      setCurrentIndex(0);
      setLoading(false);
      return;
    }
    // Network failure — all fetchers returned empty
    if (quotes.length === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animateOut('down', () => {
      setCurrentIndex(prev => prev - 1);
      runOnJS(animateIn)('down');
    });
  }, [currentIndex]);

  const handleFavorite = useCallback(() => {
    if (!converted) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
    if (!converted) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    analytics.track('quote_shared', { author: converted.author, category: converted.category });
    try {
      await Share.share({
        message: converted.text,
      });
    } catch (e) {
      errorReporting.captureException(e);
    }
  }, [converted]);

  // Pan gesture
  const startY = useSharedValue(0);
  const panGesture = Gesture.Pan()
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
                  Haptics.selectionAsync();
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
              Haptics.selectionAsync();
              if (isPro) setShowPremiumModal(true);
              else modal ? modal.openPaywall() : undefined;
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
              <Animated.View style={[styles.bigHeartOverlay, bigHeartAnimStyle]} pointerEvents="none">
                <MaterialCommunityIcons name="heart" size={180} color={theme.gold} />
              </Animated.View>
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity onPress={handleShare} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
                <MaterialCommunityIcons name="export-variant" size={30} color={theme.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleFavorite} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
                <MaterialCommunityIcons
                  name={favorited ? 'heart' : 'heart-outline'}
                  size={30}
                  color={favorited ? theme.gold : theme.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* ── CORNER BUTTONS: fixed — never animate ── */}
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); modal ? modal.openSheet('categories') : router.push('/categories'); }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[styles.categoriesFloat, { backgroundColor: theme.surface, bottom: BTN_BOTTOM, left: BTN_BOTTOM }]}
          accessibilityLabel="Browse categories"
        >
          <MaterialCommunityIcons name="apps" size={22} color={theme.gold} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); modal ? modal.openSheet('profile') : router.push('/profile'); }}
          style={[styles.profileFloat, { backgroundColor: theme.surface, bottom: PROFILE_BOTTOM, right: BTN_BOTTOM }]}
          accessibilityLabel="Open profile"
        >
          <MaterialCommunityIcons name="account-outline" size={20} color={theme.gold} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); modal ? modal.openSheet('themes') : router.push('/themes'); }}
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
