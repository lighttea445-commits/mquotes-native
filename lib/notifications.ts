import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { fetchQuotesForNotifications } from './quotesApi';

// ── Types ─────────────────────────────────────────────────────────────────────

export type NotifCategory = 'daily-quote' | 'qod' | 'reflect' | 'streak';

export interface RescheduleOptions {
  enabled: boolean;
  days: number[];          // JS weekdays 0=Sun..6=Sat; empty = all 7
  // Daily random quotes
  quotesEnabled: boolean;
  quoteCount: number;      // per day (1–10)
  startHHMM: string;
  endHHMM: string;
  showAuthor: boolean;     // include "— Author" in notification body
  // Quote of the Day
  qodEnabled: boolean;
  qodTime: string;         // HH:mm
  // Reflect reminder
  reflectEnabled: boolean;
  reflectTime: string;     // HH:mm
  // Streak reminder
  streakEnabled: boolean;
  streakTime: string;      // HH:mm
}

// ── Permission ────────────────────────────────────────────────────────────────

export async function requestPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  if (existing === 'denied') return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

// ── Formatting ────────────────────────────────────────────────────────────────

/** "09:00" → "9:00 AM", "22:00" → "10:00 PM" */
export function formatHHMMto12h(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
}

// ── Android channel ───────────────────────────────────────────────────────────

export async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('daily-quotes', {
      name: 'Daily Quotes',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#B8975A',
    });
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/** JS weekday (0=Sun..6=Sat) → Expo CALENDAR weekday (1=Sun..7=Sat) */
function toExpoWeekday(jsDay: number): number {
  return jsDay + 1;
}

/** Build evenly-spaced trigger times within startHHMM..endHHMM */
function buildTimes(count: number, startHHMM: string, endHHMM: string): Array<{ hour: number; minute: number }> {
  const [startH, startM] = startHHMM.split(':').map(Number);
  const [endH, endM] = endHHMM.split(':').map(Number);
  const startMins = startH * 60 + startM;
  const endMins = endH * 60 + endM;
  const effectiveEnd = endMins > startMins ? endMins : startMins + 60;
  const windowMins = effectiveEnd - startMins;

  if (count === 1) {
    const total = startMins + Math.round(windowMins / 2);
    return [{ hour: Math.floor(total / 60) % 24, minute: total % 60 }];
  }
  const interval = windowMins / (count - 1);
  return Array.from({ length: count }, (_, i) => {
    const total = Math.round(startMins + i * interval);
    return { hour: Math.floor(total / 60) % 24, minute: total % 60 };
  });
}

/**
 * Resolve active days for scheduling.
 * Returns null → use DAILY trigger (all days or empty selection).
 * Returns number[] → use CALENDAR+weekday trigger for each listed day.
 */
function resolveActiveDays(days: number[]): number[] | null {
  if (days.length === 0 || days.length === 7) return null;
  return [...days].sort((a, b) => a - b);
}

// ── Generation counter (prevents races) ──────────────────────────────────────

let _scheduleGen = 0;

// ── Main scheduler ────────────────────────────────────────────────────────────

/**
 * Cancels all scheduled notifications and reschedules all enabled types.
 * Safe to call concurrently — only the most recent invocation completes.
 *
 * Day-of-week filtering:
 *   Specific days selected → CALENDAR triggers with `weekday` (weekly repeat).
 *   All 7 days / empty    → DAILY triggers (simpler, fewer notifications).
 *
 * iOS limit: 64 scheduled notifications. With DAILY triggers the 4 types
 * use at most count+3 total; with CALENDAR+weekday: days×(count+3) at most.
 */
export async function rescheduleAll(opts: RescheduleOptions): Promise<void> {
  const gen = ++_scheduleGen;

  await Notifications.cancelAllScheduledNotificationsAsync();
  if (gen !== _scheduleGen) return;
  if (!opts.enabled) return;

  await ensureNotificationChannel();
  if (gen !== _scheduleGen) return;

  // null → DAILY (all days); array → CALENDAR per specific weekday
  const specificDays = resolveActiveDays(opts.days);
  const MAX_TITLE = 120;
  // iOS caps scheduled notifications at 64; Android has no meaningful limit.
  const IOS_NOTIF_LIMIT = Platform.OS === 'ios' ? 64 : Infinity;
  let scheduledCount = 0;

  /**
   * Schedule one notification content at one time, either as a DAILY
   * trigger or as one WEEKLY trigger per specific weekday.
   * Silently stops once the iOS 64-notification cap is reached.
   */
  async function sched(
    content: Notifications.NotificationContentInput,
    time: { hour: number; minute: number },
  ) {
    if (specificDays) {
      for (const jsDay of specificDays) {
        if (gen !== _scheduleGen) return;
        if (scheduledCount >= IOS_NOTIF_LIMIT) return;
        await Notifications.scheduleNotificationAsync({
          content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: toExpoWeekday(jsDay),
            hour: time.hour,
            minute: time.minute,
          },
        });
        scheduledCount++;
      }
    } else {
      if (gen !== _scheduleGen) return;
      if (scheduledCount >= IOS_NOTIF_LIMIT) return;
      await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: time.hour,
          minute: time.minute,
        },
      });
      scheduledCount++;
    }
  }

  // ── 1. Daily Quotes ──────────────────────────────────────────────────────
  if (opts.quotesEnabled && opts.quoteCount > 0) {
    const times = buildTimes(opts.quoteCount, opts.startHHMM, opts.endHHMM);
    let quotes: { content: string; author: string; id: string }[] = [];
    try {
      const needed = (specificDays?.length ?? 1) * opts.quoteCount + 5;
      const fetched = await fetchQuotesForNotifications(Math.min(needed, 100));
      quotes = fetched.map(q => ({ content: q.content, author: q.author, id: q._id }));
    } catch {
      quotes = [{ content: 'The only way to do great work is to love what you do.', author: 'Steve Jobs', id: 'fallback' }];
    }
    if (gen !== _scheduleGen) return;

    for (let i = 0; i < times.length; i++) {
      if (gen !== _scheduleGen) return;
      const quote = quotes[i % quotes.length];
      const title = quote.content.length > MAX_TITLE
        ? quote.content.slice(0, MAX_TITLE - 1) + '…'
        : quote.content;
      await sched(
        {
          title,
          ...(opts.showAuthor && { body: `— ${quote.author}` }),
          sound: true,
          data: { category: 'daily-quote' as NotifCategory, quoteId: quote.id },
          ...(Platform.OS === 'android' && { channelId: 'daily-quotes' }),
        },
        times[i],
      );
    }
  }

  // ── 2. Quote of the Day ──────────────────────────────────────────────────
  if (opts.qodEnabled) {
    if (gen !== _scheduleGen) return;
    const [hour, minute] = opts.qodTime.split(':').map(Number);
    await sched(
      {
        title: '✨ Quote of the Day',
        body: 'Tap to read today\'s quote',
        sound: true,
        data: { category: 'qod' as NotifCategory },
        ...(Platform.OS === 'android' && { channelId: 'daily-quotes' }),
      },
      { hour, minute },
    );
  }

  // ── 3. Reflect Reminder ──────────────────────────────────────────────────
  if (opts.reflectEnabled) {
    if (gen !== _scheduleGen) return;
    const [hour, minute] = opts.reflectTime.split(':').map(Number);
    await sched(
      {
        title: '📖 Time to reflect',
        body: 'A few words a day builds a life of intention.',
        sound: true,
        data: { category: 'reflect' as NotifCategory },
        ...(Platform.OS === 'android' && { channelId: 'daily-quotes' }),
      },
      { hour, minute },
    );
  }

  // ── 4. Streak Reminder ───────────────────────────────────────────────────
  if (opts.streakEnabled) {
    if (gen !== _scheduleGen) return;
    const [hour, minute] = opts.streakTime.split(':').map(Number);
    await sched(
      {
        title: '🔥 Keep your streak alive',
        body: "Don't break your streak today!",
        sound: true,
        data: { category: 'streak' as NotifCategory },
        ...(Platform.OS === 'android' && { channelId: 'daily-quotes' }),
      },
      { hour, minute },
    );
  }
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ── Legacy compatibility ──────────────────────────────────────────────────────

/** @deprecated Use rescheduleAll instead. Kept for onboarding compatibility. */
interface ScheduleOptions {
  count: number;
  startHHMM: string;
  endHHMM: string;
}

export async function scheduleQuoteNotifications(opts: ScheduleOptions): Promise<void> {
  await rescheduleAll({
    enabled: true,
    days: [],
    quotesEnabled: true,
    showAuthor: false,
    quoteCount: opts.count,
    startHHMM: opts.startHHMM,
    endHHMM: opts.endHHMM,
    qodEnabled: false,
    qodTime: '08:00',
    reflectEnabled: false,
    reflectTime: '20:00',
    streakEnabled: false,
    streakTime: '21:00',
  });
}
