import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';

export interface Review {
  /** The quoted text, without surrounding quote marks. */
  text: string;
  /** Optional attribution, e.g. "Sarah M." */
  author?: string;
}

interface Props {
  reviews: Review[];
  /** Milliseconds each review is held before advancing. */
  interval?: number;
  stars?: number;
}

/** Solid five-pointed star. */
function Star({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45-4.7-4.6 6.5-.95z"
        fill={color}
      />
    </Svg>
  );
}

export function StarRow({ count = 5, size = 18 }: { count?: number; size?: number }) {
  const theme = useTheme();
  return (
    <View style={rc.stars}>
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} size={size} color={theme.gold} />
      ))}
    </View>
  );
}

/**
 * Five stars above a review that cross-fades to the next one on a timer.
 *
 * Height is reserved for the longest review in the set so the CTA below never
 * shifts as they rotate. Renders nothing when `reviews` is empty, so the
 * splash still composes correctly before real reviews are supplied.
 */
export function ReviewCarousel({ reviews, interval = 4000, stars = 5 }: Props) {
  const theme = useTheme();
  const [index, setIndex] = useState(0);

  // RN Animated rather than Reanimated: the cross-fade needs a JS callback
  // between the two halves, and Reanimated's completion callback is a worklet
  // — a state updater can't be handed across that boundary.
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reviews.length < 2) return;

    const timer = setInterval(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return;
        setIndex((i) => (i + 1) % reviews.length);
        Animated.timing(opacity, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }).start();
      });
    }, interval);

    return () => clearInterval(timer);
  }, [reviews.length, interval, opacity]);

  if (reviews.length === 0) return null;

  const review = reviews[index];

  return (
    <View style={rc.wrap}>
      <StarRow count={stars} />

      <Animated.View style={[rc.textWrap, { opacity }]}>
        <Text style={[rc.text, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
          {`"${review.text}"`}
        </Text>
        {review.author ? (
          <Text style={[rc.author, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
            {review.author}
          </Text>
        ) : null}
      </Animated.View>

    </View>
  );
}

const rc = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 12 },
  stars: { flexDirection: 'row', gap: 4 },
  // Fixed height keeps the CTA still while reviews of different lengths rotate.
  textWrap: { height: 64, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 300 },
  author: { fontSize: 12, marginTop: 6, opacity: 0.8 },
});
