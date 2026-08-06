import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
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
  withRepeat,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { Icon } from '../ui/Icon';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { useRevenueCat } from '../../hooks/useRevenueCat';
import { useFavoritesStore } from '../../store/useFavoritesStore';
import { useHistoryStore } from '../../store/useHistoryStore';
import { useAppStore, QUOTES_BEFORE_REVEAL } from '../../store/useAppStore';
import { ApiQuote, convertApiQuote, fetchMultipleRandomQuotes, fetchQuotesByCategory, inferCategory } from '../../lib/quotesApi';
import { useUserQuotesStore } from '../../store/useUserQuotesStore';
import { useDeepLinkStore } from '../../store/useDeepLinkStore';
import { useTopics } from '../../hooks/useTopics';
import { useModal } from '../../contexts/ModalContext';
import { useShareStore } from '../../store/useShareStore';
import { PremiumModal } from '../subscriptions/PremiumModal';

import { errorReporting } from '../../lib/errorReporting';
import { analytics } from '../../lib/analytics';

// Pixels per second past which a swipe commits regardless of how far it
// travelled. Low enough that a casual flick counts.
const FLING_VELOCITY = 450;
// Maximum quotes to keep prefetched ahead. Prevents unbounded buffer growth.
const MAX_BUFFER_AHEAD = 20;
// Trim old quotes from buffer when past this many to free memory.
const BUFFER_TRIM_THRESHOLD = 10;

export function QuoteCard() {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Dynamic layout values that adapt to every phone screen size.
  const SWIPE_THRESHOLD = SCREEN_HEIGHT * 0.07;
  const BTN_BOTTOM = insets.bottom + 10;           // above safe-area / home indicator
  const QUOTE_FONT_SIZE = Math.max(18, Math.min(28, Math.round(SCREEN_WIDTH * 0.062)));
  const QUOTE_LINE_HEIGHT = Math.round(QUOTE_FONT_SIZE * 1.58);
  const QUOTE_BODY_PB = BTN_BOTTOM + 52 + 20;      // clear floating buttons

  const theme = useTheme();
  const router = useRouter();
  const modal = useModal();
  const setShareQuote = useShareStore((s) => s.setQuote);
  const haptics = useHaptics();
  const showAuthor = useAppStore((s) => s.preferences.showAuthor);
  const { isPro } = useRevenueCat();
  const { followed, loadQuotesForTopics } = useTopics();
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
  // Incremented by the deep-link effect to cancel any in-flight loadQuotes fetch.
  const loadGenRef = useRef(0);

  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  const bigHeartScale = useSharedValue(0);
  const bigHeartOpacity = useSharedValue(0);

  // ── First-run reveal ──────────────────────────────────────────────────────
  //
  // Straight out of onboarding the screen is stripped to the goal pill, share
  // and favourite so the core loop is the only thing on offer. Everything else
  // fades in once QUOTES_BEFORE_REVEAL quotes have been seen.
  const quoteViews = useAppStore((s) => s.postOnboardingQuoteViews);
  const noteQuoteViewed = useAppStore((s) => s.noteQuoteViewed);
  const chromeHidden = quoteViews !== undefined && quoteViews <= QUOTES_BEFORE_REVEAL;
  const chromeOpacity = useSharedValue(chromeHidden ? 0 : 1);

  useEffect(() => {
    chromeOpacity.value = withTiming(chromeHidden ? 0 : 1, {
      duration: 520,
      easing: Easing.out(Easing.cubic),
    });
  }, [chromeHidden, chromeOpacity]);

  const chromeStyle = useAnimatedStyle(() => ({ opacity: chromeOpacity.value }));

  // Swipe-up hint — a bouncing arrow, no text, shown only until the user's
  // first swipe during the stripped-down post-onboarding window.
  const [hasSwiped, setHasSwiped] = useState(false);
  const showSwipeHint = chromeHidden && !hasSwiped;
  const swipeHintOpacity = useSharedValue(0);
  const swipeHintTranslateY = useSharedValue(0);

  useEffect(() => {
    if (showSwipeHint) {
      swipeHintOpacity.value = withDelay(600, withTiming(1, { duration: 400 }));
      swipeHintTranslateY.value = withRepeat(
        withSequence(
          withTiming(-14, { duration: 650, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 650, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        false,
      );
    } else {
      swipeHintOpacity.value = withTiming(0, { duration: 250 });
    }
  }, [showSwipeHint, swipeHintOpacity, swipeHintTranslateY]);

  const swipeHintStyle = useAnimatedStyle(() => ({
    opacity: swipeHintOpacity.value,
    transform: [{ translateY: swipeHintTranslateY.value }],
  }));

  // Counts each distinct quote as it lands, including the first.
  const countedRef = useRef<string | null>(null);

  const currentQuote = buffer[currentIndex] ?? null;
  const converted = currentQuote ? convertApiQuote(currentQuote) : null;
  const favorited = converted ? isFavorite(converted.id) : false;

  useEffect(() => {
    if (!converted?.id || countedRef.current === converted.id) return;
    countedRef.current = converted.id;
    noteQuoteViewed();
  }, [converted?.id, noteQuoteViewed]);

  // Favorited heart — white on Minimal, gold everywhere else.
  const favoriteColor = theme.favorite ?? theme.gold;


  // Progress pill: favorites toward 5 (unlocks For You section)
  const progressNumerator = Math.min(favorites.length, 5);
  const progressDenominator = 5;
  const progressFraction = progressNumerator / progressDenominator;

  const followedKey = followed.join(',');
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
  }, [followedKey, mood]);

  async function loadQuotes() {
    const gen = ++loadGenRef.current;
    setLoading(true);
    setIsEmpty(false);
    setFetchError(null);
    let quotes: ApiQuote[] = [];
    try {
      quotes = await loadQuotesForTopics();
    } catch (err) {
      if (gen !== loadGenRef.current) return; // cancelled by deep-link
      haptics.notification();
      errorReporting.captureError(err, { context: 'loadQuotes', followed: followedKey });
      setFetchError("Couldn't load quotes. Check your connection.");
      setLoading(false);
      return;
    }
    // A deep-link arrived while we were fetching — discard these results.
    if (gen !== loadGenRef.current) return;
    if (quotes.length === 0 && followed.length > 0) {
      setIsEmpty(true);
      setBuffer([]);
      setCurrentIndex(0);
      setLoading(false);
      return;
    }
    // Network failure — all fetchers returned empty
    if (quotes.length === 0) {
      haptics.notification();
      setFetchError("Couldn't load quotes. Check your connection.");
      setLoading(false);
      return;
    }
    setBuffer(quotes);
    setCurrentIndex(0);
    if (quotes[0]) {
      const c = convertApiQuote(quotes[0]);
      addToHistory({ id: c.id, text: c.text, author: c.author, category: c.category });
      analytics.track('quote_viewed', { author: c.author, category: c.category, source: 'topics' });
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
      more = await loadQuotesForTopics();
      if (more.length > 0) setBuffer(prev => [...prev, ...more]);
    } catch (err) {
      errorReporting.captureError(err, { context: 'prefetchMore' });
    } finally {
      isFetching.current = false;
    }
  }

  // The outgoing card carries on in the direction the finger was already
  // going, so the handoff reads as one continuous motion rather than a
  // gesture that ends and an animation that starts.
  const animateOut = (direction: 'up' | 'down', onDone: () => void) => {
    const toY = direction === 'up' ? -SCREEN_HEIGHT * 0.55 : SCREEN_HEIGHT * 0.55;
    translateY.value = withTiming(toY, { duration: 140, easing: Easing.out(Easing.quad) });
    scale.value = withTiming(0.95, { duration: 140, easing: Easing.out(Easing.quad) });
    opacity.value = withTiming(0, { duration: 110 }, () => { runOnJS(onDone)(); });
  };

  const animateIn = (direction: 'up' | 'down') => {
    const fromY = direction === 'up' ? SCREEN_HEIGHT * 0.16 : -SCREEN_HEIGHT * 0.16;
    translateY.value = fromY;
    scale.value = 0.96;
    opacity.value = 0;
    translateY.value = withSpring(0, { damping: 24, stiffness: 380, mass: 0.7 });
    scale.value = withSpring(1, { damping: 22, stiffness: 360, mass: 0.7 });
    opacity.value = withTiming(1, { duration: 120 });
  };

  /** Put the card back under the finger's start position without animating. */
  const resetCard = () => {
    translateY.value = withSpring(0, { damping: 20, stiffness: 340 });
    scale.value = withSpring(1, { damping: 18, stiffness: 300 });
    opacity.value = withTiming(1, { duration: 110 });
  };

  const goNext = useCallback(() => {
    setHasSwiped(true);
    const nextIdx = currentIndex + 1;
    if (nextIdx >= buffer.length - 3) prefetchMore();
    // Ran off the end of the buffer. Snap the card back rather than leaving it
    // parked wherever the finger let go while the fetch runs.
    if (nextIdx >= buffer.length) { resetCard(); loadQuotes(); return; }
    // No haptic here. Moving between quotes is the app's most repeated
    // gesture, and a buzz per swipe turns a calm read into a rattle.
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
        analytics.track('quote_viewed', { author: c.author, category: c.category, source: 'topics' });
      }
      runOnJS(animateIn)('up');
    });
  }, [currentIndex, buffer]);

  const goPrev = useCallback(() => {
    if (currentIndex <= 0) return;
    setHasSwiped(true);
    // Silent, same as goNext.
    animateOut('down', () => {
      setCurrentIndex(prev => prev - 1);
      runOnJS(animateIn)('down');
    });
  }, [currentIndex]);

  const handleShare = useCallback(() => {
    haptics.impact();
    setShareQuote(converted?.id ?? '', converted?.text ?? '', converted?.author ?? '');
    modal ? modal.openSheet('share') : router.push('/share');
  }, [converted, haptics, setShareQuote, modal, router]);

  const handleFavorite = useCallback(() => {
    if (!converted) return;
    haptics.impact();
    const willFavorite = !favorited;
    analytics.track(willFavorite ? 'quote_favorited' : 'quote_unfavorited', {
      author: converted.author,
      category: converted.category,
    });
    toggleFavorite({
      id: converted.id,
      text: converted.text,
      author: converted.author,
      category: inferCategory(converted.text, currentQuote?.tags),
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
  }, [converted, favorited, toggleFavorite, haptics]);

  // Pan gesture — 8px of vertical movement before activating. Enough that taps
  // on the share/heart buttons still pass through to TouchableOpacity, small
  // enough that the card starts moving almost the instant the finger does.
  const startY = useSharedValue(0);
  const panGesture = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .onStart(() => { startY.value = translateY.value; })
    .onUpdate((e) => {
      const dy = e.translationY;
      // 1:1 with the finger. Any damping factor here reads as the card
      // resisting the drag.
      translateY.value = startY.value + dy;
      const absProgress = Math.abs(dy) / SCREEN_HEIGHT;
      scale.value = 1 - absProgress * 0.03;
      opacity.value = 1 - absProgress * 0.35;
    })
    .onEnd((e) => {
      // Either a deliberate drag past the threshold or a quick flick commits.
      // Without the velocity test a fast, short swipe snaps back, which is the
      // single most common way a feed feels sticky.
      const flungUp = e.velocityY < -FLING_VELOCITY;
      const flungDown = e.velocityY > FLING_VELOCITY;
      if (e.translationY < -SWIPE_THRESHOLD || flungUp) {
        runOnJS(goNext)();
      } else if ((e.translationY > SWIPE_THRESHOLD || flungDown) && currentIndex > 0) {
        runOnJS(goPrev)();
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 340, velocity: e.velocityY });
        scale.value = withSpring(1, { damping: 18, stiffness: 300 });
        opacity.value = withTiming(1, { duration: 110 });
      }
    });

  // Long-press on the quote text or the empty space around it opens the share
  // sheet — a faster path than reaching for the share icon. Scoped to the quote
  // body only: mounted on the container it also fired on the top bar and the
  // floating corner buttons, so holding a nav button opened share. Declared
  // simultaneous with the pan so a hold doesn't block a swipe, and vice versa.
  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .simultaneousWithExternalGesture(panGesture)
    .onStart(() => { runOnJS(handleShare)(); });

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
      </View>
    );
  }

  if (fetchError) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <Icon name="wifi-off" size={48} color={theme.textMuted} />
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
    const onlyFavorites = followed.every(t => t === '_favorites');
    const onlyMyQuotes = followed.every(t => t === '_myquotes');
    const emptyIcon = onlyFavorites ? 'heart-outline' : onlyMyQuotes ? 'pencil-outline' : 'playlist-remove';
    const emptyMessage = onlyFavorites
      ? 'Heart some quotes and they will show up here.'
      : onlyMyQuotes
      ? 'Add your own quotes and they will show up here.'
      : 'Nothing came back for the topics you follow.';

    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <Icon name={emptyIcon} size={48} color={theme.textMuted} />
        <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
          Nothing here yet
        </Text>
        <Text style={[styles.emptyMessage, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
          {emptyMessage}
        </Text>
        <TouchableOpacity
          onPress={() => { haptics.selection(); modal ? modal.openSheet('topics') : router.push('/topics'); }}
          style={[styles.emptyBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <Text style={[styles.emptyBtnText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
            Edit topics
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
          {/* Left: profile */}
          <Animated.View style={chromeStyle} pointerEvents={chromeHidden ? 'none' : 'auto'}>
          <TouchableOpacity
            onPress={() => { haptics.selection(); modal ? modal.openSheet('profile') : router.push('/profile'); }}
            style={[styles.profileBtn, { backgroundColor: theme.surface }]}
            accessibilityLabel="Open profile"
          >
            <Icon name="account" size={20} color={theme.gold} />
          </TouchableOpacity>
          </Animated.View>

          {/* Center: favorites progress nudge */}
          <View style={styles.topBarCenter}>
            {favorites.length < 5 && (
              <Animated.View style={chromeStyle} pointerEvents={chromeHidden ? 'none' : 'auto'}>
                <View style={[styles.progressPill, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Icon name="heart" size={13} color={theme.gold} />
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
              </Animated.View>
            )}
          </View>

          {/* Right: crown icon — gold if Pro, muted if free */}
          <Animated.View style={chromeStyle} pointerEvents={chromeHidden ? 'none' : 'auto'}>
          <TouchableOpacity
            onPress={() => {
              haptics.selection();
              if (isPro) setShowPremiumModal(true);
              else modal ? modal.openSheet('trial') : undefined;
            }}
            style={[styles.crownBtn, { backgroundColor: theme.surface }]}
            accessibilityLabel={isPro ? 'Premium member' : 'Upgrade to premium'}
          >
            <Icon
              name="crown"
              size={20}
              color={isPro ? theme.gold : theme.textMuted}
            />
          </TouchableOpacity>
          </Animated.View>
        </View>

        {/* ── QUOTE ONLY — this is what animates ── */}
        <Animated.View style={[styles.quoteAnimated, animatedStyle]}>
          <GestureDetector gesture={longPressGesture}>
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
                <Icon name="heart" size={180} color={favoriteColor} />
              </Animated.View>
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity onPress={handleShare} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
                <Icon name="share-variant" size={32} color={theme.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleFavorite} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
                <Icon
                  name={favorited ? 'heart' : 'heart-outline'}
                  size={32}
                  color={favorited ? favoriteColor : theme.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>
          </GestureDetector>
        </Animated.View>

        {/* ── SWIPE-UP HINT: bouncing arrow, no text, shown until the first swipe ── */}
        {showSwipeHint && (
          <Animated.View
            style={[styles.swipeHint, { bottom: BTN_BOTTOM + 16 }, swipeHintStyle]}
            pointerEvents="none"
          >
            <Icon name="chevron-up" size={30} color={theme.textMuted} />
          </Animated.View>
        )}

        {/* ── BOTTOM BAR: hidden until the first-run reveal ── */}
        <Animated.View
          style={[StyleSheet.absoluteFill, chromeStyle]}
          pointerEvents={chromeHidden ? 'none' : 'box-none'}
        >
        {/* Left: browse topics — the glyph never changes, so it stays a stable
            landmark whatever collection is active */}
        <TouchableOpacity
          onPress={() => { haptics.selection(); modal ? modal.openSheet('categories') : router.push('/categories'); }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[styles.collectionFloat, { backgroundColor: theme.surface, bottom: BTN_BOTTOM, left: BTN_BOTTOM }]}
          accessibilityLabel="Browse topics"
        >
          <Icon name="apps" size={22} color={theme.gold} />
        </TouchableOpacity>

        {/* Right: theme picker */}
        <TouchableOpacity
          onPress={() => { haptics.selection(); modal ? modal.openSheet('themes') : router.push('/themes'); }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[styles.themesFloat, { backgroundColor: theme.surface, bottom: BTN_BOTTOM, right: BTN_BOTTOM }]}
          accessibilityLabel="Change theme"
        >
          <Icon name="brush-variant" size={22} color={theme.gold} />
        </TouchableOpacity>
        </Animated.View>

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
  profileBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
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
    alignItems: 'center',
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

  // Swipe-up hint — centered, bottom applied inline (dynamic safe-area offset)
  swipeHint: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  // Floating corner buttons (bottom/left/right applied inline — dynamic safe-area offsets)
  collectionFloat: {
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
});
