import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useHaptics } from '../../hooks/useHaptics';
import { Icon } from '../ui/Icon';
import { SheetHeader } from '../ui/SheetHeader';
import { GUTTER, SPACE, RADIUS, ON_GOLD } from '../ui/tokens';
import { useTheme } from '../../hooks/useTheme';
import { useRevenueCat } from '../../hooks/useRevenueCat';
import { useTopicsStore } from '../../store/useTopicsStore';
import { useModal } from '../../contexts/ModalContext';
import { FONTS } from '../../constants/fonts';
import {
  CATEGORIES,
  SPECIAL_TOPICS,
  TOPIC_GROUP_ORDER,
  TOPIC_GROUP_TITLES,
  TOPIC_GENERAL,
  isTopicFree,
} from '../../constants/categories';

interface Row {
  id: string;
  name: string;
  locked: boolean;
}

interface Section {
  key: string;
  title?: string;
  rows: Row[];
}

export default function TopicsScreen({ onClose, onBack }: { onClose?: () => void; onBack?: () => void }) {
  const theme = useTheme();
  const router = useRouter();
  const modal = useModal();
  const { isPro } = useRevenueCat();
  const haptics = useHaptics();
  const followed = useTopicsStore((s) => s.followed);
  const toggleTopic = useTopicsStore((s) => s.toggleTopic);
  const followAll = useTopicsStore((s) => s.followAll);
  const [query, setQuery] = useState('');

  const close = onClose ?? (() => router.back());
  const back = onBack ?? close;
  const openPaywall = () => (modal ? modal.openSheet('trial') : router.push('/subscriptions'));

  const locked = (id: string) => !isPro && !isTopicFree(id);

  const sections: Section[] = useMemo(() => {
    const all: Section[] = [
      {
        key: 'special',
        rows: SPECIAL_TOPICS.map(t => ({ id: t.id, name: t.name, locked: locked(t.id) })),
      },
      ...TOPIC_GROUP_ORDER.map(group => ({
        key: group,
        title: TOPIC_GROUP_TITLES[group],
        rows: CATEGORIES.filter(c => c.group === group).map(c => ({
          id: c.id,
          name: c.name,
          locked: locked(c.id),
        })),
      })),
    ];

    const q = query.trim().toLowerCase();
    if (!q) return all;

    return all
      .map(s => ({ ...s, rows: s.rows.filter(r => r.name.toLowerCase().includes(q)) }))
      .filter(s => s.rows.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, isPro]);

  const handleToggle = (row: Row) => {
    if (row.locked) { openPaywall(); return; }
    // General is the fallback feed — unfollowing everything would leave the
    // home screen with nothing to show.
    if (row.id === TOPIC_GENERAL && followed.length === 1 && followed[0] === TOPIC_GENERAL) return;
    haptics.selection();
    toggleTopic(row.id);
  };

  const handleFollowAll = (rows: Row[]) => {
    const unlockable = rows.filter(r => !r.locked).map(r => r.id);
    if (unlockable.length === 0) { openPaywall(); return; }
    haptics.selection();
    followAll(unlockable);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <SheetHeader title="Topics you follow" leading="back" onLeadingPress={back} />

        <View style={styles.searchWrap}>
          <View style={[styles.search, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Icon name="magnify" size={20} color={theme.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: theme.text, fontFamily: theme.uiFontFamily }]}
              value={query}
              onChangeText={setQuery}
              placeholder="Search"
              placeholderTextColor={theme.textMuted}
              returnKeyType="search"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Clear search">
                <Icon name="close" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {sections.map(section => (
            <View key={section.key} style={styles.section}>
              {section.title && (
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>{section.title}</Text>
                  <TouchableOpacity
                    onPress={() => handleFollowAll(section.rows)}
                    hitSlop={10}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.followAll, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
                      Follow all
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={[styles.group, { backgroundColor: theme.surface }]}>
                {section.rows.map((row, i) => {
                  const following = followed.includes(row.id);
                  return (
                    <View
                      key={row.id}
                      style={[
                        styles.row,
                        i < section.rows.length - 1 && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.rowLabel,
                          { color: following ? theme.text : theme.textMuted, fontFamily: theme.uiFontFamily },
                        ]}
                        numberOfLines={1}
                      >
                        {row.name}
                      </Text>

                      {row.locked && (
                        <Icon name="lock-outline" size={16} color={theme.textMuted} />
                      )}

                      <TouchableOpacity
                        onPress={() => handleToggle(row)}
                        style={[
                          styles.followBtn,
                          following
                            ? { backgroundColor: theme.surfaceElevated ?? theme.border, borderColor: 'transparent' }
                            : { borderColor: theme.text },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`${following ? 'Unfollow' : 'Follow'} ${row.name}`}
                      >
                        <Text
                          style={[
                            styles.followText,
                            { color: following ? theme.textMuted : theme.text, fontFamily: theme.uiFontFamily },
                          ]}
                        >
                          {following ? 'Following' : 'Follow'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}

          {sections.length === 0 && (
            <Text style={[styles.empty, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              No topics match “{query.trim()}”.
            </Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  searchWrap: {
    paddingHorizontal: GUTTER,
    paddingBottom: SPACE.md,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    height: 52,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    paddingHorizontal: SPACE.lg,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  scroll: {
    paddingHorizontal: GUTTER,
    paddingBottom: 40,
  },
  section: {
    marginBottom: SPACE.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACE.md,
    gap: SPACE.md,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 22,
    fontFamily: FONTS.display.bold,
    lineHeight: 28,
    includeFontPadding: false,
  },
  followAll: {
    fontSize: 15,
  },
  group: {
    borderRadius: RADIUS.card,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    minHeight: 64,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.md,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
  },
  followBtn: {
    minWidth: 96,
    height: 40,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACE.md,
  },
  followText: {
    fontSize: 15,
  },
  empty: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: SPACE.xxl,
  },
});
