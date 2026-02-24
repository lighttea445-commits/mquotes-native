import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Share,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
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
import { ApiQuote, convertApiQuote, fetchMultipleRandomQuotes, fetchQuotesByCategory } from '../../lib/quotesApi';
import { useMix } from '../../hooks/useMix';
import { CATEGORIES } from '../../constants/categories';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_HEIGHT * 0.15;

interface QuoteCardProps {
  onOpenMix?: () => void;
  onOpenThemes?: () => void;
  onOpenCategories?: () => void;
}

export function QuoteCard({ onOpenMix, onOpenThemes, onOpenCategories }: QuoteCardProps) {
  const theme = useTheme();
  const router = useRouter();
  const { mixActive, selectedCategories, loadQuotesForMix } = useMix();
  const activeCategory = useMixStore((s) => s.activeCategory);
  const mood = useAppStore((s) => s.preferences.mood);
  const { toggleFavorite, isFavorite } = useFavoritesStore();
  const { addToHistory } = useHistoryStore();

  const [buffer, setBuffer] = useState<ApiQuote[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const isFetching = useRef(false);

  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const heartScale = useSharedValue(1);

  const currentQuote = buffer[currentIndex] ?? null;
  const converted = currentQuote ? convertApiQuote(currentQuote) : null;
  const favorited = converted ? isFavorite(converted.id) : false;

  // Collection pill label
  const activeCategoryName = activeCategory
    ? CATEGORIES.find(c => c.id === activeCategory)?.name ?? activeCategory
    : null;
  const pillLabel = activeCategoryName
    ? activeCategoryName
    : mixActive
      ? `Mix (${selectedCategories.length})`
      : 'General';

  // Progress pill: currentIndex+1 / buffer length (capped at 20)
  const progressNumerator = currentIndex + 1;
  const progressDenominator = Math.min(buffer.length || 1, 20);
  const progressFraction = Math.min(progressNumerator / progressDenominator, 1);

  useEffect(() => {
    loadQuotes();
  }, [activeCategory, mixActive, mood]);

  async function loadQuotes() {
    setLoading(true);
    let quotes: ApiQuote[] = [];
    if (activeCategory) {
      quotes = await fetchQuotesByCategory(activeCategory);
      if (quotes.length === 0) quotes = await fetchMultipleRandomQuotes(20);
    } else if (mixActive && selectedCategories.length > 0) {
      quotes = await loadQuotesForMix();
    } else {
      quotes = await fetchMultipleRandomQuotes(20);
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
      const more = await fetchMultipleRandomQuotes(10);
      setBuffer(prev => [...prev, ...more]);
    } finally {
      isFetching.current = false;
    }
  }

  const animateOut = (direction: 'up' | 'down', onDone: () => void) => {
    const toY = direction === 'up' ? -SCREEN_HEIGHT : SCREEN_HEIGHT;
    translateY.value = withTiming(toY, { duration: 250, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(0, { duration: 200 }, () => { runOnJS(onDone)(); });
  };

  const animateIn = (direction: 'up' | 'down') => {
    const fromY = direction === 'up' ? SCREEN_HEIGHT * 0.3 : -SCREEN_HEIGHT * 0.3;
    translateY.value = fromY;
    opacity.value = 0;
    translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
    opacity.value = withTiming(1, { duration: 250 });
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
    toggleFavorite({
      id: converted.id,
      text: converted.text,
      author: converted.author,
      category: converted.category,
    });
    heartScale.value = withSpring(1.3, { damping: 6 }, () => {
      heartScale.value = withSpring(1);
    });
  }, [converted, toggleFavorite]);

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
      translateY.value = startY.value + e.translationY * 0.3;
      opacity.value = 1 - Math.abs(e.translationY) / (SCREEN_HEIGHT * 0.8);
    })
    .onEnd((e) => {
      if (e.translationY < -SWIPE_THRESHOLD) {
        runOnJS(goNext)();
      } else if (e.translationY > SWIPE_THRESHOLD && currentIndex > 0) {
        runOnJS(goPrev)();
      } else {
        translateY.value = withSpring(0);
        opacity.value = withTiming(1);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const heartAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.gold} size="large" />
      </View>
    );
  }

  return (
    <GestureDetector gesture={panGesture}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Animated.View style={[styles.inner, animatedStyle]}>

          {/* ── TOP BAR: nav arrow + progress pill ── */}
          <View style={styles.topBar}>
            <Text style={[styles.navArrow, { color: theme.textMuted }]}>›</Text>

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

            <View style={{ width: 28 }} />
          </View>

          {/* ── QUOTE BODY ── */}
          <View style={styles.quoteBody}>
            <Text style={[styles.quoteText, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
              {converted?.text}
            </Text>
            {converted?.author ? (
              <Text style={[styles.authorText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                — {converted.author}
              </Text>
            ) : null}
          </View>

          {/* ── SHARE + HEART (centered) ── */}
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={handleShare} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
              <MaterialCommunityIcons name="export-variant" size={24} color={theme.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleFavorite} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
              <Animated.View style={heartAnimStyle}>
                <MaterialCommunityIcons
                  name={favorited ? 'heart' : 'heart-outline'}
                  size={24}
                  color={favorited ? theme.gold : theme.textMuted}
                />
              </Animated.View>
            </TouchableOpacity>
          </View>

          {/* ── BOTTOM BAR: grid | pill | brush ── */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              onPress={onOpenCategories ?? (() => router.push('/categories'))}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.bottomIconBtn}
            >
              <MaterialCommunityIcons name="apps" size={22} color={theme.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onOpenMix ?? (() => router.push('/mix/create'))}
              style={[styles.collectionPill, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <Text style={[styles.collectionPillText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                {pillLabel}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onOpenThemes ?? (() => router.push('/themes'))}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.bottomIconBtn}
            >
              <MaterialCommunityIcons name="brush-variant" size={22} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* ── FLOATING PROFILE BUTTON (bottom-right, above bar) ── */}
          <TouchableOpacity
            onPress={() => router.push('/profile')}
            style={[styles.profileFloat, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <MaterialCommunityIcons name="account-outline" size={20} color={theme.textMuted} />
          </TouchableOpacity>

        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 12,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  navArrow: {
    fontSize: 22,
    width: 28,
    textAlign: 'center',
  },
  progressPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginHorizontal: 10,
    gap: 7,
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
    paddingVertical: 16,
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

  // Actions
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    marginBottom: 20,
  },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bottomIconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  collectionPill: {
    flex: 1,
    marginHorizontal: 8,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  collectionPillText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Floating profile button
  profileFloat: {
    position: 'absolute',
    bottom: 60,
    right: 0,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
