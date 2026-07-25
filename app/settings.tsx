import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Linking,
} from 'react-native';
import * as StoreReview from 'expo-store-review';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useAppStore } from '../store/useAppStore';
import { useFavoritesStore } from '../store/useFavoritesStore';
import { useHistoryStore } from '../store/useHistoryStore';
import { useMixStore } from '../store/useMixStore';
import { useUserQuotesStore } from '../store/useUserQuotesStore';
import { useReflectStore } from '../store/useReflectStore';
import { useWidgetStore } from '../store/useWidgetStore';
import { useModal } from '../contexts/ModalContext';
import { ConfirmSheet } from '../components/ui/ConfirmSheet';

export default function SettingsScreen({ onClose, onBack }: { onClose?: () => void; onBack?: () => void }) {
  const theme = useTheme();
  const router = useRouter();
  const modal = useModal();
  const { preferences, setName, setPreferences, resetApp } = useAppStore();
  const [nameValue, setNameValue] = useState(preferences.name || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const clearFavorites = useFavoritesStore((s) => s.clearFavorites);
  const clearHistory = useHistoryStore((s) => s.clearHistory);
  const clearMix = useMixStore((s) => s.clearMix);
  const clearUserQuotes = useUserQuotesStore((s) => s.clearUserQuotes);
  const clearReflections = useReflectStore((s) => s.clearReflections);
  const clearWidgetConfigs = useWidgetStore((s) => s.clearWidgetConfigs);

  const close = onClose ?? (() => router.back());
  const back = onBack ?? close;

  const handleNameBlur = () => {
    const trimmed = nameValue.trim();
    if (trimmed !== preferences.name) {
      setName(trimmed);
    }
  };

  const handleJournal = () => {
    modal ? modal.openSheet('journal') : router.push('/journal');
  };

  const confirmDeleteAccount = () => {
    clearFavorites();
    clearHistory();
    clearMix();
    clearUserQuotes();
    clearReflections();
    clearWidgetConfigs();
    resetApp();
    router.replace('/onboarding');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={back} style={[styles.backBtn, { backgroundColor: theme.surface }]}>
            <MaterialCommunityIcons name="arrow-left" size={20} color={theme.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
            Settings
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Name */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              YOUR NAME
            </Text>
            <View style={[styles.nameRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <MaterialCommunityIcons name="account-outline" size={20} color={theme.gold} />
              <TextInput
                style={[styles.nameInput, { color: theme.text, fontFamily: theme.uiFontFamily }]}
                value={nameValue}
                onChangeText={setNameValue}
                onBlur={handleNameBlur}
                placeholder="Enter your name"
                placeholderTextColor={theme.textMuted}
                maxLength={50}
                returnKeyType="done"
              />
            </View>
          </View>

          {/* Preferences */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              PREFERENCES
            </Text>

            <View style={[styles.toggleItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <MaterialCommunityIcons name="white-balance-sunny" size={20} color={theme.gold} />
              <Text style={[styles.menuText, { color: theme.text, fontFamily: theme.uiFontFamily }]}>Light mode</Text>
              <Switch
                value={preferences.lightMode}
                onValueChange={(v) => setPreferences({ lightMode: v })}
                trackColor={{ false: theme.border, true: theme.gold }}
                thumbColor="#fff"
              />
            </View>

            <View style={[styles.toggleItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <MaterialCommunityIcons name="vibrate" size={20} color={theme.gold} />
              <Text style={[styles.menuText, { color: theme.text, fontFamily: theme.uiFontFamily }]}>Haptics</Text>
              <Switch
                value={preferences.hapticsEnabled}
                onValueChange={(v) => setPreferences({ hapticsEnabled: v })}
                trackColor={{ false: theme.border, true: theme.gold }}
                thumbColor="#fff"
              />
            </View>

            <View style={[styles.toggleItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <MaterialCommunityIcons name="account-outline" size={20} color={theme.gold} />
              <Text style={[styles.menuText, { color: theme.text, fontFamily: theme.uiFontFamily }]}>Show author</Text>
              <Switch
                value={preferences.showAuthor}
                onValueChange={(v) => setPreferences({ showAuthor: v })}
                trackColor={{ false: theme.border, true: theme.gold }}
                thumbColor="#fff"
              />
            </View>


          </View>

          {/* Content */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              CONTENT
            </Text>
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={handleJournal}
            >
              <MaterialCommunityIcons name="pencil-outline" size={20} color={theme.gold} />
              <Text style={[styles.menuText, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
                Reflections
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Account */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              ACCOUNT
            </Text>
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => Linking.openURL(
              Platform.OS === 'ios'
                ? 'https://apps.apple.com/account/subscriptions'
                : 'https://play.google.com/store/account/subscriptions?package=com.eriksen_dawson.quotable'
            )}
            >
              <MaterialCommunityIcons name="crown-outline" size={20} color={theme.gold} />
              <Text style={[styles.menuText, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
                Manage Subscription
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: theme.surface, borderColor: theme.border, marginTop: 8 }]}
              onPress={async () => {
                if (await StoreReview.hasAction()) {
                  await StoreReview.requestReview();
                }
              }}
            >
              <MaterialCommunityIcons name="star-outline" size={20} color={theme.gold} />
              <Text style={[styles.menuText, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
                Rate Quotable
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Danger zone */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
              DANGER ZONE
            </Text>
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => setShowDeleteConfirm(true)}
            >
              <MaterialCommunityIcons name="delete-outline" size={20} color="#EF4444" />
              <Text style={[styles.menuText, { color: '#EF4444', fontFamily: theme.uiFontFamily }]}>
                Delete Account
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      <ConfirmSheet
        visible={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Account"
        message="This will permanently erase all your data: favorites, history, quotes, and preferences. This cannot be undone."
        confirmLabel="Delete"
        destructive
        cancelLabel="Cancel"
        onConfirm={confirmDeleteAccount}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 8,
    marginLeft: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  nameInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginBottom: 8,
  },
  menuText: {
    flex: 1,
    fontSize: 15,
  },
});
