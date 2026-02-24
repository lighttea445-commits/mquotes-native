import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ThemeBackground } from '../components/layout/ThemeBackground';
import { useTheme } from '../hooks/useTheme';
import { useHistoryStore, HistoryQuote } from '../store/useHistoryStore';

function HistoryItem({ item, theme }: { item: HistoryQuote; theme: ReturnType<typeof useTheme> }) {
  const date = new Date(item.viewedAt);
  const timeStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.quoteText, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
        "{item.text.length > 120 ? item.text.slice(0, 120) + '…' : item.text}"
      </Text>
      <View style={styles.cardFooter}>
        <Text style={[styles.authorText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
          — {item.author}
        </Text>
        <Text style={[styles.dateText, { color: theme.textMuted }]}>{timeStr}</Text>
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { history, clearHistory } = useHistoryStore();

  return (
    <ThemeBackground>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.backBtn, { color: theme.textMuted }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
            History
          </Text>
          {history.length > 0 && (
            <TouchableOpacity onPress={clearHistory}>
              <Text style={[styles.clearBtn, { color: theme.textMuted }]}>Clear</Text>
            </TouchableOpacity>
          )}
          {history.length === 0 && <View style={{ width: 40 }} />}
        </View>

        {history.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>⌚</Text>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No history yet</Text>
          </View>
        ) : (
          <FlatList
            data={history}
            keyExtractor={item => item.id + item.viewedAt}
            renderItem={({ item }) => <HistoryItem item={item} theme={theme} />}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
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
    paddingBottom: 8,
  },
  backBtn: { fontSize: 28, padding: 4 },
  title: { fontSize: 22, fontWeight: '700' },
  clearBtn: { fontSize: 13 },
  list: { padding: 16, gap: 12 },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  quoteText: { fontSize: 15, lineHeight: 23, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  authorText: { fontSize: 12, letterSpacing: 0.5 },
  dateText: { fontSize: 11 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16 },
});
