import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ThemeBackground } from '../components/layout/ThemeBackground';
import { useTheme } from '../hooks/useTheme';
import { useAppStore } from '../store/useAppStore';
import { MOODS } from '../constants/moods';

export default function MoodScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { preferences, setMood } = useAppStore();

  const handleSelect = (moodId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMood(moodId === preferences.mood ? null : moodId);
    router.back();
  };

  return (
    <ThemeBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.backBtn, { color: theme.textMuted }]}>✕</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
            How are you feeling?
          </Text>
          <View style={{ width: 28 }} />
        </View>

        <Text style={[styles.subtitle, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
          We'll tailor quotes to match your mood
        </Text>

        <FlatList
          data={MOODS}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => {
            const isSelected = preferences.mood === item.id;
            return (
              <TouchableOpacity
                style={[
                  styles.moodCard,
                  {
                    backgroundColor: isSelected ? theme.gold + '22' : theme.surface,
                    borderColor: isSelected ? theme.gold : theme.border,
                  },
                ]}
                onPress={() => handleSelect(item.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.emoji}>{item.emoji}</Text>
                <Text style={[styles.moodName, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
                  {item.name}
                </Text>
                <Text style={[styles.moodDesc, { color: theme.textMuted }]}>{item.description}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </SafeAreaView>
    </ThemeBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: { fontSize: 20, padding: 4 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { paddingHorizontal: 24, paddingBottom: 16, fontSize: 13 },
  grid: { padding: 16 },
  row: { gap: 12, marginBottom: 12, justifyContent: 'space-between' },
  moodCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  emoji: { fontSize: 36 },
  moodName: { fontSize: 15, fontWeight: '600' },
  moodDesc: { fontSize: 11, textAlign: 'center' },
});
