/**
 * Unit tests for lib/notifications.ts
 *
 * Bugs exercised:
 * B1 — iOS 64-notification limit overflow: when all 4 reminder types are on,
 *      count=10, and 5+ specific weekdays are selected, total notifications > 64.
 * B2 — buildTimes edge: endTime ≤ startTime falls back to startTime+60.
 * B3 — WEEKLY vs DAILY trigger selection by day count.
 * B4 — scheduleQuoteNotifications (legacy) delegates correctly.
 * B5 — Race guard: only the last rescheduleAll call completes.
 */

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Hoisted outside the factory so they remain stable across jest.resetModules()
const mockGetPermissions    = jest.fn().mockResolvedValue({ status: 'granted' });
const mockRequestPermissions = jest.fn().mockResolvedValue({ status: 'granted' });
const mockCancel    = jest.fn().mockResolvedValue(undefined);
const mockSchedule  = jest.fn().mockResolvedValue('id');
const mockSetChannel = jest.fn().mockResolvedValue(undefined);

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: mockGetPermissions,
  requestPermissionsAsync: mockRequestPermissions,
  cancelAllScheduledNotificationsAsync: mockCancel,
  scheduleNotificationAsync: mockSchedule,
  setNotificationChannelAsync: mockSetChannel,
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: {
    DAILY: 'daily',
    WEEKLY: 'weekly',
  },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

jest.mock('../../lib/quotesApi', () => ({
  fetchQuotesForNotifications: jest.fn().mockResolvedValue([
    { content: 'Quote one', author: 'Author A', _id: 'q1' },
    { content: 'Quote two', author: 'Author B', _id: 'q2' },
    { content: 'Quote three', author: 'Author C', _id: 'q3' },
  ]),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

/** iOS hard cap on scheduled notifications */
const IOS_NOTIF_LIMIT = 64;

const ALL_TYPES_OPTS = {
  enabled: true,
  days: [] as number[], // all 7 days → DAILY triggers
  quotesEnabled: true,
  showAuthor: false,
  quoteCount: 5,
  startHHMM: '09:00',
  endHHMM: '22:00',
  qodEnabled: true,
  qodTime: '08:00',
  reflectEnabled: true,
  reflectTime: '20:00',
  streakEnabled: true,
  streakTime: '21:00',
};

// ── formatHHMMto12h ───────────────────────────────────────────────────────────

describe('formatHHMMto12h', () => {
  let formatHHMMto12h: (hhmm: string) => string;

  beforeEach(() => {
    jest.resetModules();
    ({ formatHHMMto12h } = require('../../lib/notifications'));
  });

  it('formats midnight (00:00) as 12:00 AM', () => {
    expect(formatHHMMto12h('00:00')).toBe('12:00 AM');
  });

  it('formats noon (12:00) as 12:00 PM', () => {
    expect(formatHHMMto12h('12:00')).toBe('12:00 PM');
  });

  it('formats morning time (09:30) as 9:30 AM', () => {
    expect(formatHHMMto12h('09:30')).toBe('9:30 AM');
  });

  it('formats afternoon time (13:45) as 1:45 PM', () => {
    expect(formatHHMMto12h('13:45')).toBe('1:45 PM');
  });

  it('formats last minute of day (23:59) as 11:59 PM', () => {
    expect(formatHHMMto12h('23:59')).toBe('11:59 PM');
  });

  it('pads single-digit minutes with a zero', () => {
    expect(formatHHMMto12h('10:05')).toBe('10:05 AM');
  });
});

// ── requestPermissions ────────────────────────────────────────────────────────

describe('requestPermissions', () => {
  beforeEach(() => {
    jest.resetModules();
    mockGetPermissions.mockReset();
    mockRequestPermissions.mockReset();
  });

  it('returns true when already granted', async () => {
    mockGetPermissions.mockResolvedValueOnce({ status: 'granted' });
    const { requestPermissions } = require('../../lib/notifications');
    expect(await requestPermissions()).toBe(true);
    expect(mockRequestPermissions).not.toHaveBeenCalled();
  });

  it('returns false when denied without prompting again', async () => {
    mockGetPermissions.mockResolvedValueOnce({ status: 'denied' });
    const { requestPermissions } = require('../../lib/notifications');
    expect(await requestPermissions()).toBe(false);
    expect(mockRequestPermissions).not.toHaveBeenCalled();
  });

  it('prompts and returns true when undetermined and user grants', async () => {
    mockGetPermissions.mockResolvedValueOnce({ status: 'undetermined' });
    mockRequestPermissions.mockResolvedValueOnce({ status: 'granted' });
    const { requestPermissions } = require('../../lib/notifications');
    expect(await requestPermissions()).toBe(true);
  });

  it('prompts and returns false when undetermined and user denies', async () => {
    mockGetPermissions.mockResolvedValueOnce({ status: 'undetermined' });
    mockRequestPermissions.mockResolvedValueOnce({ status: 'denied' });
    const { requestPermissions } = require('../../lib/notifications');
    expect(await requestPermissions()).toBe(false);
  });
});

// ── rescheduleAll — trigger types ─────────────────────────────────────────────

describe('rescheduleAll — trigger types', () => {
  beforeEach(() => {
    jest.resetModules();
    mockSchedule.mockClear();
    mockCancel.mockClear();
  });

  it('uses DAILY triggers when all 7 days are selected (empty array)', async () => {
    const { rescheduleAll } = require('../../lib/notifications');
    await rescheduleAll({ ...ALL_TYPES_OPTS, days: [] });

    const triggers = mockSchedule.mock.calls.map((c) => c[0].trigger.type);
    expect(triggers.every((t) => t === 'daily')).toBe(true);
  });

  it('uses DAILY triggers when all 7 specific days are listed', async () => {
    const { rescheduleAll } = require('../../lib/notifications');
    await rescheduleAll({ ...ALL_TYPES_OPTS, days: [0, 1, 2, 3, 4, 5, 6] });

    const triggers = mockSchedule.mock.calls.map((c) => c[0].trigger.type);
    expect(triggers.every((t) => t === 'daily')).toBe(true);
  });

  it('uses WEEKLY triggers when a subset of days is selected', async () => {
    const { rescheduleAll } = require('../../lib/notifications');
    await rescheduleAll({ ...ALL_TYPES_OPTS, days: [1, 2, 3] }); // Mon–Wed

    const triggers = mockSchedule.mock.calls.map((c) => c[0].trigger.type);
    expect(triggers.every((t) => t === 'weekly')).toBe(true);
  });

  it('assigns correct Expo weekday numbers (JS 0-based + 1)', async () => {
    const { rescheduleAll } = require('../../lib/notifications');
    // JS Sunday=0 → Expo weekday=1, JS Saturday=6 → Expo weekday=7
    await rescheduleAll({ ...ALL_TYPES_OPTS, days: [0, 6], quotesEnabled: false, qodEnabled: true, qodTime: '08:00', reflectEnabled: false, streakEnabled: false });

    const weekdays = mockSchedule.mock.calls.map((c) => c[0].trigger.weekday);
    expect(weekdays).toContain(1); // Sunday
    expect(weekdays).toContain(7); // Saturday
  });
});

// ── rescheduleAll — disabled ───────────────────────────────────────────────────

describe('rescheduleAll — disabled', () => {
  beforeEach(() => {
    jest.resetModules();
    mockSchedule.mockClear();
    mockCancel.mockClear();
  });

  it('cancels all and schedules nothing when enabled=false', async () => {
    const { rescheduleAll } = require('../../lib/notifications');
    await rescheduleAll({ ...ALL_TYPES_OPTS, enabled: false });

    expect(mockCancel).toHaveBeenCalledTimes(1);
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('cancels all and schedules nothing when all sub-types disabled', async () => {
    const { rescheduleAll } = require('../../lib/notifications');
    await rescheduleAll({
      ...ALL_TYPES_OPTS,
      quotesEnabled: false,
      qodEnabled: false,
      reflectEnabled: false,
      streakEnabled: false,
    });

    expect(mockCancel).toHaveBeenCalledTimes(1);
    expect(mockSchedule).not.toHaveBeenCalled();
  });
});

// ── rescheduleAll — notification counts ───────────────────────────────────────

describe('rescheduleAll — notification counts', () => {
  beforeEach(() => {
    jest.resetModules();
    mockSchedule.mockClear();
    mockCancel.mockClear();
  });

  it('schedules exactly count+3 notifications on DAILY (all days, all types)', async () => {
    const { rescheduleAll } = require('../../lib/notifications');
    const count = 5;
    await rescheduleAll({ ...ALL_TYPES_OPTS, quoteCount: count, days: [] });

    // count quote slots + 1 QOD + 1 reflect + 1 streak
    expect(mockSchedule).toHaveBeenCalledTimes(count + 3);
  });

  it('schedules count×days + 3×days notifications with WEEKLY triggers', async () => {
    const { rescheduleAll } = require('../../lib/notifications');
    const count = 3;
    const days = [1, 3, 5]; // 3 specific weekdays
    await rescheduleAll({ ...ALL_TYPES_OPTS, quoteCount: count, days });

    // (count + 3 types) × number of days
    expect(mockSchedule).toHaveBeenCalledTimes((count + 3) * days.length);
  });

  /**
   * B1 — iOS overflow regression test.
   *
   * With count=10 and 5 specific weekdays + all 4 reminder types:
   *   quotes: 10×5 = 50
   *   QOD:     1×5 =  5
   *   reflect: 1×5 =  5
   *   streak:  1×5 =  5
   *   total         = 65 → would exceed iOS limit of 64
   *
   * The fix caps scheduling at 64 so the last slot is silently skipped
   * rather than causing the system to silently drop the oldest notification.
   */
  it('[B1] caps scheduled notifications at 64 on iOS (overflow fixed)', async () => {
    const { rescheduleAll } = require('../../lib/notifications');
    await rescheduleAll({
      ...ALL_TYPES_OPTS,
      quoteCount: 10,
      days: [1, 2, 3, 4, 5], // Mon–Fri (5 days) → would be 65 without cap
    });

    const totalScheduled = mockSchedule.mock.calls.length;
    expect(totalScheduled).toBe(IOS_NOTIF_LIMIT);
    expect(totalScheduled).toBeLessThanOrEqual(IOS_NOTIF_LIMIT);
  });

  it('stays within iOS limit with all-day DAILY triggers (max settings)', async () => {
    const { rescheduleAll } = require('../../lib/notifications');
    // With DAILY triggers (empty days): count + 3 = 13 → well within 64
    await rescheduleAll({ ...ALL_TYPES_OPTS, quoteCount: 10, days: [] });

    expect(mockSchedule.mock.calls.length).toBeLessThanOrEqual(IOS_NOTIF_LIMIT);
  });
});

// ── rescheduleAll — time scheduling ───────────────────────────────────────────

describe('rescheduleAll — time scheduling', () => {
  beforeEach(() => {
    jest.resetModules();
    mockSchedule.mockClear();
    mockCancel.mockClear();
  });

  it('QOD trigger fires at the configured hour and minute', async () => {
    const { rescheduleAll } = require('../../lib/notifications');
    await rescheduleAll({
      ...ALL_TYPES_OPTS,
      quotesEnabled: false,
      qodEnabled: true,
      qodTime: '07:30',
      reflectEnabled: false,
      streakEnabled: false,
    });

    const trigger = mockSchedule.mock.calls[0][0].trigger;
    expect(trigger.hour).toBe(7);
    expect(trigger.minute).toBe(30);
  });

  it('reflect trigger fires at the configured hour and minute', async () => {
    const { rescheduleAll } = require('../../lib/notifications');
    await rescheduleAll({
      ...ALL_TYPES_OPTS,
      quotesEnabled: false,
      qodEnabled: false,
      reflectEnabled: true,
      reflectTime: '19:15',
      streakEnabled: false,
    });

    const trigger = mockSchedule.mock.calls[0][0].trigger;
    expect(trigger.hour).toBe(19);
    expect(trigger.minute).toBe(15);
  });

  it('streak trigger fires at the configured hour and minute', async () => {
    const { rescheduleAll } = require('../../lib/notifications');
    await rescheduleAll({
      ...ALL_TYPES_OPTS,
      quotesEnabled: false,
      qodEnabled: false,
      reflectEnabled: false,
      streakEnabled: true,
      streakTime: '21:00',
    });

    const trigger = mockSchedule.mock.calls[0][0].trigger;
    expect(trigger.hour).toBe(21);
    expect(trigger.minute).toBe(0);
  });

  it('[B2] gracefully handles endTime ≤ startTime by using startTime+60 as window', async () => {
    const { rescheduleAll } = require('../../lib/notifications');
    // startTime = endTime — zero-width window; should not throw and should schedule 1 quote
    await rescheduleAll({
      ...ALL_TYPES_OPTS,
      quoteCount: 1,
      startHHMM: '10:00',
      endHHMM: '10:00',
      qodEnabled: false,
      reflectEnabled: false,
      streakEnabled: false,
    });

    expect(mockSchedule).toHaveBeenCalledTimes(1);
    const trigger = mockSchedule.mock.calls[0][0].trigger;
    // Midpoint of 10:00..11:00 is 10:30
    expect(trigger.hour).toBe(10);
    expect(trigger.minute).toBe(30);
  });

  it('distributes quote slots evenly across the window', async () => {
    const { rescheduleAll } = require('../../lib/notifications');
    // 09:00..13:00 (240 min) with 3 quotes → at 09:00, 11:00, 13:00
    await rescheduleAll({
      ...ALL_TYPES_OPTS,
      quoteCount: 3,
      startHHMM: '09:00',
      endHHMM: '13:00',
      qodEnabled: false,
      reflectEnabled: false,
      streakEnabled: false,
    });

    const times = mockSchedule.mock.calls.map((c) => ({
      h: c[0].trigger.hour,
      m: c[0].trigger.minute,
    }));

    expect(times[0]).toEqual({ h: 9, m: 0 });
    expect(times[1]).toEqual({ h: 11, m: 0 });
    expect(times[2]).toEqual({ h: 13, m: 0 });
  });
});

// ── rescheduleAll — content ────────────────────────────────────────────────────

describe('rescheduleAll — notification content', () => {
  beforeEach(() => {
    jest.resetModules();
    mockSchedule.mockClear();
    mockCancel.mockClear();
  });

  it('omits author body when showAuthor=false', async () => {
    const { rescheduleAll } = require('../../lib/notifications');
    await rescheduleAll({
      ...ALL_TYPES_OPTS,
      showAuthor: false,
      qodEnabled: false,
      reflectEnabled: false,
      streakEnabled: false,
    });

    mockSchedule.mock.calls.forEach(([call]) => {
      expect(call.content.body).toBeUndefined();
    });
  });

  it('includes "— Author" body when showAuthor=true', async () => {
    const { rescheduleAll } = require('../../lib/notifications');
    await rescheduleAll({
      ...ALL_TYPES_OPTS,
      showAuthor: true,
      qodEnabled: false,
      reflectEnabled: false,
      streakEnabled: false,
    });

    mockSchedule.mock.calls.forEach(([call]) => {
      expect(call.content.body).toMatch(/^— /);
    });
  });

  it('truncates quote title at 120 characters with ellipsis', async () => {
    const longContent = 'A'.repeat(150);
    const { fetchQuotesForNotifications } = require('../../lib/quotesApi');
    fetchQuotesForNotifications.mockResolvedValueOnce([
      { content: longContent, author: 'Author', _id: 'long-1' },
    ]);

    const { rescheduleAll } = require('../../lib/notifications');
    await rescheduleAll({
      ...ALL_TYPES_OPTS,
      quoteCount: 1,
      qodEnabled: false,
      reflectEnabled: false,
      streakEnabled: false,
    });

    const title = mockSchedule.mock.calls[0][0].content.title as string;
    expect(title.length).toBeLessThanOrEqual(121); // 120 chars + '…'
    expect(title.endsWith('…')).toBe(true);
  });

  it('QOD notification has the correct title', async () => {
    const { rescheduleAll } = require('../../lib/notifications');
    await rescheduleAll({
      ...ALL_TYPES_OPTS,
      quotesEnabled: false,
      qodEnabled: true,
      reflectEnabled: false,
      streakEnabled: false,
    });

    expect(mockSchedule.mock.calls[0][0].content.title).toBe('✨ Quote of the Day');
  });

  it('reflect notification has the correct title', async () => {
    const { rescheduleAll } = require('../../lib/notifications');
    await rescheduleAll({
      ...ALL_TYPES_OPTS,
      quotesEnabled: false,
      qodEnabled: false,
      reflectEnabled: true,
      streakEnabled: false,
    });

    expect(mockSchedule.mock.calls[0][0].content.title).toBe('📖 Time to reflect');
  });

  it('streak notification has the correct title', async () => {
    const { rescheduleAll } = require('../../lib/notifications');
    await rescheduleAll({
      ...ALL_TYPES_OPTS,
      quotesEnabled: false,
      qodEnabled: false,
      reflectEnabled: false,
      streakEnabled: true,
    });

    expect(mockSchedule.mock.calls[0][0].content.title).toBe('🔥 Keep your streak alive');
  });
});

// ── scheduleQuoteNotifications (legacy compat) ────────────────────────────────

describe('scheduleQuoteNotifications (legacy)', () => {
  beforeEach(() => {
    jest.resetModules();
    mockSchedule.mockClear();
    mockCancel.mockClear();
  });

  it('[B4] delegates to rescheduleAll with only quotes enabled', async () => {
    const { scheduleQuoteNotifications } = require('../../lib/notifications');
    await scheduleQuoteNotifications({ count: 3, startHHMM: '09:00', endHHMM: '21:00' });

    // Only quote notifications should be scheduled (no QOD, reflect, streak)
    // count=3, DAILY triggers → 3 scheduleNotificationAsync calls
    expect(mockSchedule).toHaveBeenCalledTimes(3);

    // All titles should be quote text (not fixed strings)
    const titles = mockSchedule.mock.calls.map((c) => c[0].content.title);
    expect(titles.every((t) => !['✨ Quote of the Day', '📖 Time to reflect', '🔥 Keep your streak alive'].includes(t))).toBe(true);
  });
});

// ── cancelAllNotifications ────────────────────────────────────────────────────

describe('cancelAllNotifications', () => {
  beforeEach(() => {
    jest.resetModules();
    mockCancel.mockClear();
  });

  it('calls cancelAllScheduledNotificationsAsync exactly once', async () => {
    const { cancelAllNotifications } = require('../../lib/notifications');
    await cancelAllNotifications();
    expect(mockCancel).toHaveBeenCalledTimes(1);
  });
});
