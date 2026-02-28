import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Share,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
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
import { useFavoritesStore } from '../../store/useFavoritesStore';
import { useHistoryStore } from '../../store/useHistoryStore';
import { useMixStore } from '../../store/useMixStore';
import { useAppStore } from '../../store/useAppStore';
import { ApiQuote, convertApiQuote, fetchMultipleRandomQuotes, fetchQuotesByCategory, inferCategory } from '../../lib/quotesApi';
import { useMix } from '../../hooks/useMix';
import { CATEGORIES } from '../../constants/categories';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_HEIGHT * 0.15;

interface QuoteCardProps {
  onOpenMix?: () => void;
  onOpenThemes?: () => void;
  onOpenCategories?: () => void;
  onOpenProfile?: () => void;
}

export function QuoteCard({ onOpenMix, onOpenThemes, onOpenCategories, onOpenProfile }: QuoteCardProps) {
  const theme = useTheme();
  const router = useRouter();
  const { mixActive, selectedCategories, loadQuotesForMix } = useMix();
  const activeCategory = useMixStore((s) => s.activeCategory);
  const mood = useAppStore((s) => s.preferences.mood);
  const { toggleFavorite, isFavorite, favorites } = useFavoritesStore();
  const { addToHistory } = useHistoryStore();

  const [buffer, setBuffer] = useState<ApiQuote[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isEmpty, setIsEmpty] = useState(false);
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
    let quotes: ApiQuote[] = [];
    if (activeCategory) {
      quotes = await fetchQuotesByCategory(activeCategory);
      if (quotes.length === 0) quotes = await fetchMultipleRandomQuotes(20);
    } else if (mixActive && selectedCategories.length > 0) {
      quotes = await loadQuotesForMix();
    } else {
      quotes = await fetchMultipleRandomQuotes(20);
    }
    if (quotes.length === 0 && mixActive) {
      setIsEmpty(true);
      setBuffer([]);
      setCurrentIndex(0);
      setLoading(false);
      return;
    }
    setBuffer(quotes);
    setCurrentIndex(0);
    if (quotes[0]) {
      const c = convertApiQuote(quotes[0]);
      addToHistory({ id: c.id, text: c.text, author: c.author, category: c.category });
    }
    setLoading(false);
  }

  async function prefetchMore() {
    if (isFetching.current) return;
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
      setBuffer(prev => [...prev, ...more]);
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
      setCurrentIndex(nextIdx);
      const q = buffer[nextIdx];
      if (q) {
        const c = convertApiQuote(q);
        addToHistory({ id: c.id, text: c.text, author: c.author, category: c.category });
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
    try {
      await Share.share({
        message: `"${converted.text}" — ${converted.author ?? 'Unknown'}\n\nShared via mquotes`,
      });
    } catch {}
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
          onPress={onOpenMix ?? (() => router.push('/mix/create'))}
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
      <View style={[styles.container, !theme.backgroundImage && { backgroundColor: theme.background }]}>

        {/* ── TOP BAR: fixed — never animates ── */}
        <View style={styles.topBar}>
          {favorites.length < 5 ? (
            <View style={[styles.progressPill, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={{ color: theme.gold, fontSize: 13 }}>♥</Text>
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
              onPress={onOpenMix ?? (() => router.push('/mix/create'))}
              style={[styles.collectionPill, { backgroundColor: theme.surface, borderColor: theme.border }]}
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

        {/* ── QUOTE ONLY — this is what animates ── */}
        <Animated.View style={[styles.quoteAnimated, animatedStyle]}>
          <View style={styles.quoteBody}>
            <View style={styles.quoteWrapper}>
              <Text style={[styles.quoteText, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
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
          onPress={onOpenCategories ?? (() => router.push('/categories'))}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[styles.categoriesFloat, { backgroundColor: theme.surface }]}
        >
          <MaterialCommunityIcons name="apps" size={22} color={theme.gold} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onOpenProfile ?? (() => router.push('/profile'))}
          style={[styles.profileFloat, { backgroundColor: theme.surface }]}
        >
          <MaterialCommunityIcons name="account-outline" size={20} color={theme.gold} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onOpenThemes ?? (() => router.push('/themes'))}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[styles.themesFloat, { backgroundColor: theme.surface }]}
        >
          <MaterialCommunityIcons name="brush-variant" size={22} color={theme.gold} />
        </TouchableOpacity>

      </View>
  );

  return (
    <GestureDetector gesture={panGesture}>
      {theme.backgroundImage ? (
        <ImageBackground
          source={theme.backgroundImage}
          style={styles.imageBg}
          resizeMode="cover"
        >
          <View style={styles.imageOverlay} />
          {containerContent}
        </ImageBackground>
      ) : (
        containerContent
      )}
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  imageBg: {
    flex: 1,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
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
    justifyContent: 'center',
    marginBottom: 4,
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
    paddingBottom: 80,
  },
  quoteText: {
    fontSize: 24,
    lineHeight: 38,
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

  // Floating corner buttons
  categoriesFloat: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themesFloat: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileFloat: {
    position: 'absolute',
    bottom: 76,
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
