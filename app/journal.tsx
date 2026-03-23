import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../hooks/useTheme';
import { useRevenueCat } from '../hooks/useRevenueCat';
import { useReflectStore, Reflection, MOODS } from '../store/useReflectStore';
import { useModal } from '../contexts/ModalContext';
import { ConfirmSheet } from '../components/ui/ConfirmSheet';

function getMoodIcon(moodLabel: string): string {
  return MOODS.find(m => m.label === moodLabel)?.icon ?? 'emoticon-neutral-outline';
}

function ReflectItem({ item, theme }: { item: Reflection; theme: ReturnType<typeof useTheme> }) {
  const date = new Date(item.createdAt);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {/* Date + mood row */}
      <View style={styles.cardMeta}>
        <Text style={[styles.metaText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
          {dateStr}
        </Text>
        <View style={[styles.moodBadge, { backgroundColor: 'rgba(184,151,90,0.10)', borderColor: theme.border }]}>
          <MaterialCommunityIcons name={getMoodIcon(item.mood) as any} size={13} color={theme.gold} />
          <Text style={[styles.moodText, { color: theme.gold, fontFamily: theme.uiFontFamily }]}>
            {item.mood}
          </Text>
        </View>
      </View>

      {/* Quote */}
      <Text
        numberOfLines={2}
        style={[styles.quoteText, { color: theme.text, fontFamily: theme.quoteFontFamily }]}
      >
        "{item.quoteText}"
      </Text>
      <Text style={[styles.authorText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
        {item.quoteAuthor}
      </Text>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      {/* Reflection text */}
      <Text style={[styles.reflectionText, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
        {item.reflectionText}
      </Text>
    </View>
  );
}

export default function JournalScreen({ onClose, onBack }: { onClose?: () => void; onBack?: () => void }) {
  const theme = useTheme();
  const router = useRouter();
  const close = onClose ?? (() => router.back());
  const back = onBack ?? close;
  const { isPro, isLoading } = useRevenueCat();
  const { reflections, clearReflections } = useReflectStore();
  const modal = useModal();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClear = () => setShowClearConfirm(true);

  const handleUnlock = () => {
    modal ? modal.openSheet('features') : router.push('/subscriptions');
  };

  // Pro gate
  if (!isLoading && !isPro) {
    return (
      <View style={{ flex: 1 }}>
        <SafeAreaView style={styles.safe} edges={['bottom']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={back} style={[styles.backBtn, { backgroundColor: theme.surface }]}>
              <MaterialCommunityIcons name="chevron-left" size={22} color={theme.textMuted} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>Reflections</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.gate}>
            <View style={[styles.gateIconBg, { backgroundColor: 'rgba(184,151,90,0.12)' }]}>
              <MaterialCommunityIcons name="crown" size={32} color="#B8975A" />
            </View>
            <Text style={[styles.gateTitle, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
              Reflect is Pro
            </Text>
            <Text style={[styles.gateBody, { color: theme.textMuted, fontFamily: 'Inter_500Medium' }]}>
              Upgrade to Quotable Pro to write daily reflections and revisit them anytime.
            </Text>
            <TouchableOpacity
              style={styles.unlockBtn}
              onPress={handleUnlock}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="crown" size={16} color="#1A1208" />
              <Text style={[styles.unlockBtnText, { color: '#1A1208', fontFamily: 'Inter_600SemiBold' }]}>
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
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={back} style={[styles.backBtn, { backgroundColor: theme.surface }]}>
            <MaterialCommunityIcons name="chevron-left" size={22} color={theme.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
            Reflections
          </Text>
          {reflections.length > 0 ? (
            <TouchableOpacity onPress={handleClear}>
              <Text style={[styles.clearBtn, { color: theme.textMuted }]}>Clear</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        {reflections.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="pencil-outline" size={48} color={theme.textMuted} style={{ marginBottom: 16 }} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No reflections yet</Text>
            <Text style={[styles.emptySubtext, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              Tap "Reflect" on the home screen to write your first reflection.
            </Text>
          </View>
        ) : (
          <FlatList
            data={reflections}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <ReflectItem item={item} theme={theme} />}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>

      <ConfirmSheet
        visible={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        title="Clear Reflections"
        message="This will permanently delete all your reflections. This cannot be undone."
        confirmLabel="Delete All"
        destructive
        cancelLabel="Cancel"
        onConfirm={clearReflections}
      />
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
  clearBtn: { fontSize: 13 },
  list: { padding: 16, gap: 12 },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 8,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  metaText: { fontSize: 12 },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  moodText: { fontSize: 11, letterSpacing: 0.3 },
  quoteText: { fontSize: 14, lineHeight: 21 },
  authorText: { fontSize: 12, letterSpacing: 0.3 },
  divider: { height: 1, marginVertical: 4 },
  reflectionText: { fontSize: 14, lineHeight: 22 },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 8,
  },
  emptyText: { fontSize: 16 },
  emptySubtext: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
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
