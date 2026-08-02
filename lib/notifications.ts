import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { fetchQuotesForNotifications } from './quotesApi';

// ── Types ─────────────────────────────────────────────────────────────────────

export type NotifCategory = 'daily-quote' | 'qod' | 'streak';

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
  // Streak reminder
  streakEnabled: boolean;
  streakTime: string;      // HH:mm
}

// ── Permission ────────────────────────────────────────────────────────────────

/**
 * Raises the OS permission dialog when the OS will still show one.
 *
 * A `denied` status is not by itself final. Android re-prompts until the user
 * hard-denies, and only then does `canAskAgain` flip to false; iOS sets it
 * false after the first refusal, which is its one-shot model. Gating on the
 * status alone meant a single early denial permanently suppressed the dialog.
 */
export async function requestPermissions(): Promise<boolean> {
  const perms = await Notifications.getPermissionsAsync();
  if (perms.status === 'granted') return true;
  if (perms.canAskAgain === false) return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Whether asking would actually surface a dialog. False means Settings is the
 * only route left — either already granted, or hard-denied.
 */
export async function canAskForPermissions(): Promise<boolean> {
  const perms = await Notifications.getPermissionsAsync();
  if (perms.status === 'granted') return false;
  return perms.canAskAgain !== false;
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
    return [{ hour: startH, minute: startM }];
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
 * Daily quotes use one-shot DATE triggers so every notification has a unique
 * quote. The scheduler fills as many future days as fit within the iOS 64-
 * notification cap. The app re-calls this on every foreground to top up.
 *
 * QoD / streak use repeating DAILY or WEEKLY triggers since their
 * content is static.
 *
 * Day-of-week filtering:
 *   Specific days selected → only matching dates get quote notifications;
 *                            static types use WEEKLY triggers with `weekday`.
 *   All 7 days / empty    → every day gets quotes; static types use DAILY.
 */
export async function rescheduleAll(opts: RescheduleOptions): Promise<void> {
  const gen = ++_scheduleGen;

  await Notifications.cancelAllScheduledNotificationsAsync();
  if (gen !== _scheduleGen) return;
  if (!opts.enabled) return;

  await ensureNotificationChannel();
  if (gen !== _scheduleGen) return;

  const specificDays = resolveActiveDays(opts.days);
  const MAX_TITLE = 120;
  const IOS_NOTIF_LIMIT = Platform.OS === 'ios' ? 64 : Infinity;
  let scheduledCount = 0;

  /** Schedule a repeating notification (for static-content types). */
  async function schedRepeating(
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

  // Count how many repeating-trigger slots the static types will consume
  // so we know how many DATE slots remain for daily quotes.
  const repeatingSlots = (() => {
    let n = 0;
    const multiplier = specificDays ? specificDays.length : 1;
    if (opts.qodEnabled) n += multiplier;
    if (opts.streakEnabled) n += multiplier;
    return n;
  })();
  const quoteDateSlots = Math.max(0, IOS_NOTIF_LIMIT - repeatingSlots);

  // ── 1. Daily Quotes (one-shot DATE triggers, unique quote per slot) ────
  if (opts.quotesEnabled && opts.quoteCount > 0) {
    const times = buildTimes(opts.quoteCount, opts.startHHMM, opts.endHHMM);
    const activeDaySet = specificDays ? new Set(specificDays) : null;

    // Figure out how many future days we can schedule
    const slotsPerDay = times.length;
    const maxDays = slotsPerDay > 0
      ? Math.min(Math.floor(quoteDateSlots / slotsPerDay), 14) // cap at 14 days
      : 0;

    // Build the list of future dates that match the allowed weekdays
    const now = new Date();
    const futureDates: Date[] = [];
    for (let offset = 0; futureDates.length < maxDays && offset < 30; offset++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
      if (activeDaySet && !activeDaySet.has(d.getDay())) continue;
      // Skip today if all time slots have already passed
      if (offset === 0) {
        const lastTime = times[times.length - 1];
        if (now.getHours() > lastTime.hour ||
            (now.getHours() === lastTime.hour && now.getMinutes() >= lastTime.minute)) {
          continue;
        }
      }
      futureDates.push(d);
    }

    const totalQuotesNeeded = futureDates.length * slotsPerDay;

    let quotes: { content: string; author: string; id: string }[] = [];
    try {
      const fetched = await fetchQuotesForNotifications(Math.min(totalQuotesNeeded + 10, 100));
      quotes = fetched.map(q => ({ content: q.content, author: q.author, id: q._id }));
    } catch {
      quotes = [{ content: 'The only way to do great work is to love what you do.', author: 'Steve Jobs', id: 'fallback' }];
    }
    if (gen !== _scheduleGen) return;

    let quoteIdx = 0;
    for (const date of futureDates) {
      for (const time of times) {
        if (gen !== _scheduleGen) return;
        if (scheduledCount >= IOS_NOTIF_LIMIT) break;

        // For today, skip time slots that are already past
        if (date.toDateString() === now.toDateString()) {
          if (now.getHours() > time.hour ||
              (now.getHours() === time.hour && now.getMinutes() >= time.minute)) {
            continue;
          }
        }

        const quote = quotes[quoteIdx % quotes.length];
        quoteIdx++;
        const title = quote.content.length > MAX_TITLE
          ? quote.content.slice(0, MAX_TITLE - 1) + '…'
          : quote.content;

        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            ...(opts.showAuthor && { body: quote.author }),
            sound: true,
            data: { category: 'daily-quote' as NotifCategory, quoteId: quote.id, quoteText: quote.content, quoteAuthor: quote.author },
            ...(Platform.OS === 'android' && { channelId: 'daily-quotes' }),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(
              date.getFullYear(), date.getMonth(), date.getDate(),
              time.hour, time.minute, 0,
            ),
          },
        });
        scheduledCount++;
      }
    }
  }

  // ── 2. Quote of the Day (repeating — static content) ──────────────────
  if (opts.qodEnabled) {
    if (gen !== _scheduleGen) return;
    const [hour, minute] = opts.qodTime.split(':').map(Number);
    await schedRepeating(
      {
        title: 'Quote of the Day',
        body: 'Tap to read today\'s quote',
        sound: true,
        data: { category: 'qod' as NotifCategory },
        ...(Platform.OS === 'android' && { channelId: 'daily-quotes' }),
      },
      { hour, minute },
    );
  }

  // ── 3. Streak Reminder (repeating — static content) ───────────────────
  if (opts.streakEnabled) {
    if (gen !== _scheduleGen) return;
    const [hour, minute] = opts.streakTime.split(':').map(Number);
    await schedRepeating(
      {
        title: 'Keep your streak alive',
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
    streakEnabled: false,
    streakTime: '21:00',
  });
}
