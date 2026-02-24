import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Share } from 'react-native';
import Animated from 'react-native-reanimated';
import { Theme } from '../../constants/themes';

interface QuoteActionsProps {
  isFavorite: boolean;
  onFavorite: () => void;
  onTheme?: () => void;
  onCategories?: () => void;
  theme: Theme;
  heartStyle?: object;
  quoteText?: string;
  quoteAuthor?: string;
}

export function QuoteActions({
  isFavorite,
  onFavorite,
  onTheme,
  onCategories,
  theme,
  heartStyle,
  quoteText,
  quoteAuthor,
}: QuoteActionsProps) {
  const handleShare = async () => {
    if (!quoteText) return;
    try {
      await Share.share({
        message: `"${quoteText}" — ${quoteAuthor ?? 'Unknown'}\n\nShared via mquotes`,
      });
    } catch {}
  };

  return (
    <View style={styles.container}>
      {/* Left side: share + heart */}
      <View style={styles.group}>
        {quoteText && (
          <TouchableOpacity onPress={handleShare} style={[styles.iconBtn, { backgroundColor: theme.surface }]}>
            <Text style={{ color: theme.textMuted, fontSize: 16 }}>↗</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onFavorite}>
          <Animated.View style={[styles.iconBtn, { backgroundColor: theme.surface }, heartStyle]}>
            <Text style={{ fontSize: 18, color: isFavorite ? '#ef4444' : theme.textMuted }}>
              {isFavorite ? '♥' : '♡'}
            </Text>
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Right side: palette + grid */}
      <View style={styles.group}>
        {onTheme && (
          <TouchableOpacity onPress={onTheme} style={[styles.iconBtn, { backgroundColor: theme.surface }]}>
            <Text style={{ color: theme.textMuted, fontSize: 16 }}>◑</Text>
          </TouchableOpacity>
        )}
        {onCategories && (
          <TouchableOpacity onPress={onCategories} style={[styles.iconBtn, { backgroundColor: theme.surface }]}>
            <Text style={{ color: theme.textMuted, fontSize: 16 }}>⊞</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
  },
  group: {
    flexDirection: 'row',
    gap: 10,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
