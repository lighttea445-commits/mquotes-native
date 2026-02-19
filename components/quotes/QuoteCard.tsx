import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
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
import { useTheme } from '../../hooks/useTheme';
import { useFavoritesStore } from '../../store/useFavoritesStore';
import { useHistoryStore } from '../../store/useHistoryStore';
import { useMixStore } from '../../store/useMixStore';
import { useAppStore } from '../../store/useAppStore';
import { QuoteActions } from './QuoteActions';
import { ApiQuote, convertApiQuote, fetchMultipleRandomQuotes } from '../../lib/quotesApi';
import { useMix } from '../../hooks/useMix';

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
  const mood = useAppStore((s) => s.preferences.mood);
  const { toggleFavorite, isFavorite } = useFavoritesStore();
  const { addToHistory } = useHistoryStore();

  const [buffer, setBuffer] = useState<ApiQuote[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swipeDirection, setSwipeDirection] = useState<'up' | 'down'>('up');
  const [showHint, setShowHint] = useState(true);
  const isFetching = useRef(false);

  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  const currentQuote = buffer[currentIndex] ?? null;
  const converted = currentQuote ? convertApiQuote(currentQuote) : null;
  const favorited = converted ? isFavorite(converted.id) : false;

  // Load quotes on mount or when mix/mood changes
  useEffect(() => {
    loadQuotes();
  }, [mixActive, mood]);

  async function loadQuotes() {
    setLoading(true);
    let quotes: ApiQuote[] = [];
    if (mixActive && selectedCategories.length > 0) {
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
    // Hide hint after first swipe or 3 seconds
    setTimeout(() => setShowHint(false), 3000);
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
    opacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(onDone)();
    });
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
    if (nextIdx >= buffer.length) {
      loadQuotes();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSwipeDirection('up');
    animateOut('up', () => {
      setCurrentIndex(nextIdx);
      const q = buffer[nextIdx];
      if (q) {
        const c = convertApiQuote(q);
        addToHistory({ id: c.id, text: c.text, author: c.author, category: c.category });
      }
      runOnJS(animateIn)('up');
    });
    setShowHint(false);
  }, [currentIndex, buffer]);

  const goPrev = useCallback(() => {
    if (currentIndex <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSwipeDirection('down');
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
    scale.value = withSpring(1.2, { damping: 8 }, () => {
      scale.value = withSpring(1);
    });
  }, [converted, toggleFavorite]);

  // Swipe gesture
  const startY = useSharedValue(0);
  const panGesture = Gesture.Pan()
    .onStart(() => {
      startY.value = translateY.value;
    })
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
        // Snap back
        translateY.value = withSpring(0);
        opacity.value = withTiming(1);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.text} size="large" />
      </View>
    );
  }

  return (
    <GestureDetector gesture={panGesture}>
      <View style={styles.container}>
        <Animated.View style={[styles.quoteContainer, animatedStyle]}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={onOpenMix ?? (() => router.push('/mix/create'))}
              style={[styles.mixPill, {
                backgroundColor: mixActive ? theme.accent : theme.surface,
                borderColor: theme.border,
              }]}
            >
              <Text style={[styles.mixPillText, { color: mixActive ? theme.background : theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                {mixActive ? `Mix (${selectedCategories.length})` : 'My Mix'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/profile')}
              style={[styles.profileBtn, { backgroundColor: theme.surface }]}
            >
              <Text style={{ color: theme.textMuted, fontSize: 16 }}>◉</Text>
            </TouchableOpacity>
          </View>

          {/* Quote text */}
          <View style={styles.quoteBody}>
            <Text
              style={[
                styles.quoteText,
                {
                  color: theme.text,
                  fontFamily: theme.quoteFontFamily,
                },
              ]}
            >
              "{converted?.text}"
            </Text>
            <Text style={[styles.authorText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              — {converted?.author}
            </Text>
          </View>

          {/* Swipe hint */}
          {showHint && (
            <View style={styles.hintContainer}>
              <Text style={[styles.hintText, { color: theme.textMuted }]}>Swipe up for next quote</Text>
              <Text style={{ color: theme.textMuted, fontSize: 18 }}>↑</Text>
            </View>
          )}

          {/* Bottom bar with actions */}
          <QuoteActions
            isFavorite={favorited}
            onFavorite={handleFavorite}
            onTheme={onOpenThemes}
            onCategories={onOpenCategories}
            theme={theme}
            heartStyle={heartStyle}
          />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quoteContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  mixPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  mixPillText: {
    fontSize: 13,
    fontWeight: '500',
  },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quoteBody: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 32,
  },
  quoteText: {
    fontSize: 26,
    lineHeight: 40,
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 0.3,
  },
  authorText: {
    fontSize: 14,
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  hintContainer: {
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  hintText: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
