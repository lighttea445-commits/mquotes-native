import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '../ui/Icon';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../hooks/useTheme';
import { useModal } from '../../contexts/ModalContext';

const TRIAL_REMINDER_KEY = '@trial_reminder_notif_id';
const STEP_HEIGHT = 80;
const ICON_SIZE = 30;
const BAR_WIDTH = 10;
const LEFT_COL_WIDTH = 44;

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

interface Step {
  icon: 'check-circle-outline' | 'lock-open-outline' | 'bell-outline' | 'crown-outline';
  title: string;
  subtitle: string;
  done: boolean;
}

function buildSteps(): Step[] {
  const today = new Date();
  const reminderDate = formatDate(addDays(today, 2));
  const memberDate = formatDate(addDays(today, 3));
  return [
    {
      icon: 'check-circle-outline',
      title: 'Download Quotable',
      subtitle: 'Start discovering quotes that move you',
      done: true,
    },
    {
      icon: 'lock-open-outline',
      title: 'Today - get full access',
      subtitle: 'Enjoy full access, totally free for\nyour first 3 days',
      done: false,
    },
    {
      icon: 'bell-outline',
      title: `${reminderDate} - Trial reminder`,
      subtitle: "To let you know it's ending soon",
      done: false,
    },
    {
      icon: 'crown-outline',
      title: `${memberDate} - Become member`,
      subtitle: 'Your trial ends unless canceled',
      done: false,
    },
  ];
}

async function ensureTrialChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('trial-reminder', {
      name: 'Trial Reminder',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

interface Props {
  onClose?: () => void;
  onContinue?: () => void;
}

export default function TrialScreen({ onClose, onContinue }: Props) {
  const theme = useTheme();
  const modal = useModal();
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const notifIdRef = useRef<string | null>(null);
  const steps = buildSteps();
  const timelineHeight = STEP_HEIGHT * steps.length;

  // Restore persisted notification ID on mount
  useEffect(() => {
    AsyncStorage.getItem(TRIAL_REMINDER_KEY).then(id => {
      if (id) {
        notifIdRef.current = id;
        setReminderEnabled(true);
      }
    });
  }, []);

  const handleReminderToggle = async (value: boolean) => {
    if (value) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        setReminderEnabled(false);
        return;
      }
      // Cancel any existing trial reminder
      if (notifIdRef.current) {
        await Notifications.cancelScheduledNotificationAsync(notifIdRef.current);
        notifIdRef.current = null;
      }
      await ensureTrialChannel();
      // Schedule for 9am on day 2 (one day before trial ends on day 3)
      const triggerDate = addDays(new Date(), 2);
      triggerDate.setHours(9, 0, 0, 0);
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Your free trial ends tomorrow',
          body: 'Upgrade to Quotable Premium to keep your themes, history, and favorites.',
          sound: true,
          ...(Platform.OS === 'android' && { channelId: 'trial-reminder' }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });
      notifIdRef.current = id;
      await AsyncStorage.setItem(TRIAL_REMINDER_KEY, id);
      setReminderEnabled(true);
    } else {
      if (notifIdRef.current) {
        await Notifications.cancelScheduledNotificationAsync(notifIdRef.current);
        notifIdRef.current = null;
      }
      await AsyncStorage.removeItem(TRIAL_REMINDER_KEY);
      setReminderEnabled(false);
    }
  };

  const handleContinue = () => {
    if (onContinue) {
      onContinue();
    } else {
      modal?.openPaywall();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* X Close */}
        <Pressable
          onPress={onClose}
          style={[styles.closeBtn, { backgroundColor: theme.surface }]}
          hitSlop={12}
        >
          <Icon name="close" size={20} color={theme.textMuted} />
        </Pressable>

        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={[styles.title, { color: theme.text, fontFamily: theme.quoteFontFamily }]}>
            How your free trial works
          </Text>
          <Text style={[styles.subtitle, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
            You won't be charged anything today
          </Text>

          {/* Timeline card */}
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: `${theme.gold}50` }]}>
            <View style={styles.timelineRow}>

              {/* Left: gradient bar + icon nodes */}
              <View style={[styles.timelineLeft, { height: timelineHeight }]}>
                <LinearGradient
                  colors={[theme.gold, `${theme.gold}80`, theme.border]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={{
                    position: 'absolute',
                    left: (LEFT_COL_WIDTH - BAR_WIDTH) / 2,
                    width: BAR_WIDTH,
                    top: STEP_HEIGHT / 2 - 2,
                    bottom: STEP_HEIGHT / 2 - 2,
                    borderRadius: BAR_WIDTH / 2,
                  }}
                />
                {steps.map((step, i) => (
                  <View
                    key={i}
                    style={{
                      position: 'absolute',
                      top: i * STEP_HEIGHT + STEP_HEIGHT / 2 - ICON_SIZE / 2,
                      left: (LEFT_COL_WIDTH - ICON_SIZE) / 2,
                      width: ICON_SIZE,
                      height: ICON_SIZE,
                      borderRadius: ICON_SIZE / 2,
                      backgroundColor: i === 0 ? theme.gold : theme.surface,
                      borderWidth: 1,
                      borderColor: i === 0 ? 'transparent' : `${theme.gold}40`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon
                      name={step.icon}
                      size={15}
                      color={i === 0 ? theme.background : i === 1 ? theme.gold : theme.textMuted}
                    />
                  </View>
                ))}
              </View>

              {/* Right: step text */}
              <View style={styles.stepsContent}>
                {steps.map((step, i) => (
                  <View key={i} style={[styles.step, { height: STEP_HEIGHT }]}>
                    {step.done ? (
                      <>
                        <Text style={[styles.stepTitleDone, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                          {step.title}
                        </Text>
                        <Text style={[styles.stepSubtitle, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                          {step.subtitle}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text style={[styles.stepTitle, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
                          {step.title}
                        </Text>
                        <Text style={[styles.stepSubtitle, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                          {step.subtitle}
                        </Text>
                      </>
                    )}
                  </View>
                ))}
              </View>

            </View>
          </View>
        </ScrollView>

        {/* Bottom */}
        <View style={styles.bottom}>
          <View style={[styles.toggleRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.toggleLabel, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
              Reminder before trial ends
            </Text>
            <Switch
              value={reminderEnabled}
              onValueChange={handleReminderToggle}
              trackColor={{ false: theme.border, true: theme.gold }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={theme.border}
            />
          </View>

          <Pressable onPress={handleContinue} style={[styles.ctaButton, { backgroundColor: theme.gold }]}>
            <Text style={[styles.ctaText, { fontFamily: theme.uiFontFamily }]}>Continue</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  closeBtn: {
    position: 'absolute',
    top: 12,
    left: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 24,
    textAlign: 'center',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  timelineRow: {
    flexDirection: 'row',
  },
  timelineLeft: {
    width: LEFT_COL_WIDTH,
    position: 'relative',
  },
  stepsContent: {
    flex: 1,
    paddingLeft: 8,
  },
  step: {
    justifyContent: 'center',
    gap: 3,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  stepTitleDone: {
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'line-through',
  },
  stepSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  bottom: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  ctaButton: {
    height: 56,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#0D0D0D',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
