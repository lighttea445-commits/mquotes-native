import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Icon } from '../ui/Icon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useRevenueCat } from '../../hooks/useRevenueCat';
import { useHistoryStore, HistoryQuote } from '../../store/useHistoryStore';
import { useModal } from '../../contexts/ModalContext';
import { FONTS } from '../../constants/fonts';

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
          {item.author}
        </Text>
        <Text style={[styles.dateText, { color: theme.textMuted }]}>{timeStr}</Text>
      </View>
    </View>
  );
}

export default function HistoryScreen({ onClose, onBack }: { onClose?: () => void; onBack?: () => void }) {
  const theme = useTheme();
  const router = useRouter();
  const close = onClose ?? (() => router.back());
  const back = onBack ?? close;
  const { isPro, isLoading } = useRevenueCat();
  const { history, clearHistory } = useHistoryStore();
  const modal = useModal();

  const handleUnlock = () => {
    modal ? modal.openSheet('features') : router.push('/subscriptions');
  };

  // Show gate screen for free users (skip during loading to avoid flash)
  if (!isLoading && !isPro) {
    return (
      <View style={{ flex: 1 }}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={back} style={[styles.backBtn, { backgroundColor: theme.surface }]}>
              <Icon name="chevron-left" size={22} color={theme.textMuted} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>History</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.gate}>
            <View style={[styles.gateIconBg, { backgroundColor: 'rgba(184,151,90,0.12)' }]}>
              <Icon name="crown" size={32} color="#B8975A" />
            </View>
            <Text style={[styles.gateTitle, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
              History is Pro
            </Text>
            <Text style={[styles.gateBody, { color: theme.textMuted, fontFamily: FONTS.body.regular }]}>
              Upgrade to Quotable Pro to browse every quote you've ever read.
            </Text>
            <TouchableOpacity
              style={styles.unlockBtn}
              onPress={handleUnlock}
              activeOpacity={0.85}
            >
              <Icon name="crown" size={16} color="#1A1208" />
              <Text style={[styles.unlockBtnText, { color: '#1A1208', fontFamily: FONTS.ui.bold }]}>
                Unlock Pro
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={back} style={[styles.backBtn, { backgroundColor: theme.surface }]}>
            <Icon name="chevron-left" size={22} color={theme.textMuted} />
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
            <Icon name="clock-outline" size={48} color={theme.textMuted} style={{ marginBottom: 16 }} />
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
    </View>
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
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700' },
  clearBtn: { fontSize: 13, fontFamily: FONTS.ui.regular },
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
  dateText: { fontSize: 11, fontFamily: FONTS.ui.regular },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, fontFamily: FONTS.ui.regular },
  gate: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 14,
  },
  gateIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  gateTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  gateBody: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
    backgroundColor: '#B8975A',
    marginTop: 8,
  },
  unlockBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
