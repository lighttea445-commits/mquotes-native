/**
 * Unit tests for lib/notifications.ts
 *
 * The scheduler mixes two trigger models, and most of what can go wrong lives
 * in the seam between them:
 *   Daily quotes  → one-shot DATE triggers, one per slot per future day, so
 *                   every notification can carry its own quote.
 *   QoD / streak  → repeating DAILY (all days) or WEEKLY (a subset of days),
 *                   since their content is static.
 *
 * `new Date()` decides which days get filled, so every rescheduleAll suite
 * runs against a frozen clock.
 */

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Hoisted outside the factories so they survive jest.resetModules().
const mockGetPermissions     = jest.fn().mockResolvedValue({ status: 'granted' });
const mockRequestPermissions = jest.fn().mockResolvedValue({ status: 'granted' });
const mockCancel     = jest.fn().mockResolvedValue(undefined);
const mockSchedule   = jest.fn().mockResolvedValue('id');
const mockSetChannel = jest.fn().mockResolvedValue(undefined);

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: mockGetPermissions,
  requestPermissionsAsync: mockRequestPermissions,
  cancelAllScheduledNotificationsAsync: mockCancel,
  scheduleNotificationAsync: mockSchedule,
  setNotificationChannelAsync: mockSetChannel,
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: {
    DATE: 'date',
    DAILY: 'daily',
    WEEKLY: 'weekly',
  },
}));

// Mutable so a single suite can flip platforms. rescheduleAll reads Platform.OS
// at call time, not at import time.
const mockPlatform = { OS: 'ios' as 'ios' | 'android' };
jest.mock('react-native', () => ({ Platform: mockPlatform }));

// Distinct quotes, as many as asked for, so "every slot gets its own quote" is
// observable rather than hidden behind a three-item fixture.
const mockResolveQuotes = jest.fn(async (_source: string, count: number) =>
  Array.from({ length: count }, (_, i) => ({
    content: `Quote ${i}`,
    author: `Author ${i}`,
    id: `q${i}`,
  })),
);

jest.mock('../../lib/notificationQuotes', () => ({
  SOURCE_FOLLOWING: 'following',
  COLLECTION_PREFIX: 'collection:',
  resolveNotificationQuotes: mockResolveQuotes,
}));

// Quote of the Day and the streak reminder are Premium-gated inside
// rescheduleAll. Mutable so the gate itself can be tested.
let mockIsPro = true;
jest.mock('../../hooks/useRevenueCat', () => ({ getIsPro: () => mockIsPro }));

// ── Helpers ───────────────────────────────────────────────────────────────────

/** iOS hard cap on pending notifications. */
const IOS_NOTIF_LIMIT = 64;

/**
 * Frozen clock: 08:00 local, early enough that a 09:00–22:00 window still has
 * all of today's slots ahead of it.
 */
const NOW = new Date(2026, 2, 10, 8, 0, 0); // 10 March 2026
const TODAY_DOW = NOW.getDay();

const BASE_OPTS = {
  enabled: true,
  days: [] as number[], // all 7 days
  quotesEnabled: true,
  showAuthor: false,
  quoteCount: 5,
  startHHMM: '09:00',
  endHHMM: '22:00',
  qodEnabled: true,
  qodTime: '08:00',
  streakEnabled: true,
  streakTime: '21:00',
};

type Call = { content: any; trigger: any };
const calls = (): Call[] => mockSchedule.mock.calls.map((c) => c[0]);
const triggers = () => calls().map((c) => c.trigger);
const byCategory = (cat: string) => calls().filter((c) => c.content.data?.category === cat);

function freshScheduler() {
  jest.resetModules();
  return require('../../lib/notifications');
}

function resetAll() {
  mockSchedule.mockClear();
  mockCancel.mockClear();
  mockSetChannel.mockClear();
  mockResolveQuotes.mockClear();
  mockPlatform.OS = 'ios';
  mockIsPro = true;
}

// ── formatHHMMto12h ───────────────────────────────────────────────────────────

describe('formatHHMMto12h', () => {
  let formatHHMMto12h: (hhmm: string) => string;

  beforeEach(() => {
    ({ formatHHMMto12h } = freshScheduler());
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

// ── attribution ───────────────────────────────────────────────────────────────

describe('attribution', () => {
  let attribution: (author: string) => string;

  beforeEach(() => {
    ({ attribution } = freshScheduler());
  });

  it('prefixes the author with a hyphen and a space', () => {
    expect(attribution('Marcus Aurelius')).toBe('- Marcus Aurelius');
  });

  it('uses an ASCII hyphen, not an em or en dash', () => {
    expect(attribution('Seneca').charCodeAt(0)).toBe(45);
  });
});

// ── Permissions ───────────────────────────────────────────────────────────────

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

  it('returns false without prompting when hard-denied', async () => {
    mockGetPermissions.mockResolvedValueOnce({ status: 'denied', canAskAgain: false });
    const { requestPermissions } = require('../../lib/notifications');
    expect(await requestPermissions()).toBe(false);
    expect(mockRequestPermissions).not.toHaveBeenCalled();
  });

  // Android keeps re-prompting until the user hard-denies. Gating on the
  // status alone meant one early refusal suppressed the dialog forever.
  it('still prompts when denied but re-askable', async () => {
    mockGetPermissions.mockResolvedValueOnce({ status: 'denied', canAskAgain: true });
    mockRequestPermissions.mockResolvedValueOnce({ status: 'granted' });
    const { requestPermissions } = require('../../lib/notifications');
    expect(await requestPermissions()).toBe(true);
    expect(mockRequestPermissions).toHaveBeenCalled();
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

describe('canAskForPermissions', () => {
  beforeEach(() => {
    jest.resetModules();
    mockGetPermissions.mockReset();
  });

  it('is false once granted — there is no dialog left to show', async () => {
    mockGetPermissions.mockResolvedValueOnce({ status: 'granted' });
    const { canAskForPermissions } = require('../../lib/notifications');
    expect(await canAskForPermissions()).toBe(false);
  });

  it('is false when hard-denied — Settings is the only route left', async () => {
    mockGetPermissions.mockResolvedValueOnce({ status: 'denied', canAskAgain: false });
    const { canAskForPermissions } = require('../../lib/notifications');
    expect(await canAskForPermissions()).toBe(false);
  });

  it('is true when denied but still re-askable', async () => {
    mockGetPermissions.mockResolvedValueOnce({ status: 'denied', canAskAgain: true });
    const { canAskForPermissions } = require('../../lib/notifications');
    expect(await canAskForPermissions()).toBe(true);
  });
});

// ── rescheduleAll ─────────────────────────────────────────────────────────────

describe('rescheduleAll', () => {
  beforeAll(() => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    jest.setSystemTime(NOW);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    resetAll();
    mockGetPermissions.mockResolvedValue({ status: 'granted' });
  });

  // ── Trigger model ─────────────────────────────────────────────────────────

  describe('trigger model', () => {
    it('gives daily quotes one-shot DATE triggers, not repeating ones', async () => {
      const { rescheduleAll } = freshScheduler();
      await rescheduleAll(BASE_OPTS);

      expect(byCategory('daily-quote').length).toBeGreaterThan(0);
      expect(byCategory('daily-quote').every((c) => c.trigger.type === 'date')).toBe(true);
      expect(byCategory('daily-quote').every((c) => c.trigger.date instanceof Date)).toBe(true);
    });

    it('gives QoD and streak DAILY triggers when all 7 days are selected', async () => {
      const { rescheduleAll } = freshScheduler();
      await rescheduleAll({ ...BASE_OPTS, days: [] });

      expect(byCategory('qod').map((c) => c.trigger.type)).toEqual(['daily']);
      expect(byCategory('streak').map((c) => c.trigger.type)).toEqual(['daily']);
    });

    it('treats an explicit all-7 list the same as an empty one', async () => {
      const { rescheduleAll } = freshScheduler();
      await rescheduleAll({ ...BASE_OPTS, days: [0, 1, 2, 3, 4, 5, 6] });

      expect(byCategory('qod').map((c) => c.trigger.type)).toEqual(['daily']);
      expect(byCategory('streak').map((c) => c.trigger.type)).toEqual(['daily']);
    });

    it('gives QoD and streak WEEKLY triggers, one per day, on a subset', async () => {
      const { rescheduleAll } = freshScheduler();
      const days = [1, 2, 3]; // Mon–Wed
      await rescheduleAll({ ...BASE_OPTS, days });

      const qod = byCategory('qod');
      expect(qod).toHaveLength(days.length);
      expect(qod.every((c) => c.trigger.type === 'weekly')).toBe(true);
      expect(byCategory('streak')).toHaveLength(days.length);
    });

    it('converts JS weekdays to Expo weekdays (0-based + 1)', async () => {
      const { rescheduleAll } = freshScheduler();
      // JS Sunday=0 → Expo weekday=1, JS Saturday=6 → Expo weekday=7
      await rescheduleAll({
        ...BASE_OPTS,
        days: [0, 6],
        quotesEnabled: false,
        streakEnabled: false,
      });

      expect(byCategory('qod').map((c) => c.trigger.weekday).sort()).toEqual([1, 7]);
    });

    it('only fills dates matching the selected weekdays', async () => {
      const { rescheduleAll } = freshScheduler();
      const days = [1, 3, 5];
      await rescheduleAll({ ...BASE_OPTS, days, qodEnabled: false, streakEnabled: false });

      const dows = byCategory('daily-quote').map((c) => (c.trigger.date as Date).getDay());
      expect(dows.length).toBeGreaterThan(0);
      expect(dows.every((d) => days.includes(d))).toBe(true);
    });
  });

  // ── Disabled ──────────────────────────────────────────────────────────────

  describe('disabled', () => {
    it('cancels all and schedules nothing when enabled=false', async () => {
      const { rescheduleAll } = freshScheduler();
      await rescheduleAll({ ...BASE_OPTS, enabled: false });

      expect(mockCancel).toHaveBeenCalledTimes(1);
      expect(mockSchedule).not.toHaveBeenCalled();
    });

    it('cancels all and schedules nothing when every sub-type is off', async () => {
      const { rescheduleAll } = freshScheduler();
      await rescheduleAll({
        ...BASE_OPTS,
        quotesEnabled: false,
        qodEnabled: false,
        streakEnabled: false,
      });

      expect(mockCancel).toHaveBeenCalledTimes(1);
      expect(mockSchedule).not.toHaveBeenCalled();
    });
  });

  // ── Premium gating ────────────────────────────────────────────────────────

  describe('premium gating', () => {
    it('drops QoD and streak for a free user even when the prefs say on', async () => {
      mockIsPro = false;
      const { rescheduleAll } = freshScheduler();
      await rescheduleAll(BASE_OPTS);

      expect(byCategory('qod')).toHaveLength(0);
      expect(byCategory('streak')).toHaveLength(0);
      expect(byCategory('daily-quote').length).toBeGreaterThan(0);
    });

    // The cap is spent in whole days, so the two slots QoD and streak reserve
    // only buy back a day when they tip the division: 16 a day fits 3 days
    // inside 62 slots but 4 inside all 64.
    it('reclaims the reserved slots for daily quotes', async () => {
      const { rescheduleAll } = freshScheduler();
      await rescheduleAll({ ...BASE_OPTS, quoteCount: 16 });
      const proQuotes = byCategory('daily-quote').length;

      mockSchedule.mockClear();
      mockIsPro = false;
      await rescheduleAll({ ...BASE_OPTS, quoteCount: 16 });

      expect(byCategory('daily-quote').length).toBeGreaterThan(proQuotes);
      expect(mockSchedule.mock.calls.length).toBeLessThanOrEqual(IOS_NOTIF_LIMIT);
    });
  });

  // ── Volume and the iOS cap ────────────────────────────────────────────────

  describe('volume', () => {
    it('fills several days ahead so one launch covers more than today', async () => {
      const { rescheduleAll } = freshScheduler();
      await rescheduleAll({ ...BASE_OPTS, quoteCount: 5 });

      const days = new Set(
        byCategory('daily-quote').map((c) => (c.trigger.date as Date).toDateString()),
      );
      expect(days.size).toBeGreaterThan(1);
      expect(byCategory('daily-quote')).toHaveLength(days.size * 5);
    });

    it('never exceeds the iOS 64-notification cap', async () => {
      const { rescheduleAll } = freshScheduler();

      const configs = [
        { quoteCount: 20, days: [] as number[] },
        { quoteCount: 12, days: [1, 2, 3, 4, 5] },
        { quoteCount: 1, days: [] as number[] },
        { quoteCount: 20, days: [0, 1, 2, 3, 4, 5] },
      ];

      for (const cfg of configs) {
        mockSchedule.mockClear();
        await rescheduleAll({ ...BASE_OPTS, ...cfg });
        expect(mockSchedule.mock.calls.length).toBeLessThanOrEqual(IOS_NOTIF_LIMIT);
      }
    });

    it('reserves cap room for QoD and streak before filling quote slots', async () => {
      const { rescheduleAll } = freshScheduler();
      await rescheduleAll({ ...BASE_OPTS, quoteCount: 20, days: [] });

      // The repeating pair is scheduled last, so it only lands if the quote
      // loop left room for it.
      expect(byCategory('qod')).toHaveLength(1);
      expect(byCategory('streak')).toHaveLength(1);
      expect(mockSchedule.mock.calls.length).toBeLessThanOrEqual(IOS_NOTIF_LIMIT);
    });

    it('is not capped on Android', async () => {
      mockPlatform.OS = 'android';
      const { rescheduleAll } = freshScheduler();
      await rescheduleAll({ ...BASE_OPTS, quoteCount: 20, days: [] });

      expect(mockSchedule.mock.calls.length).toBeGreaterThan(IOS_NOTIF_LIMIT);
    });

    it('gives every slot its own quote', async () => {
      const { rescheduleAll } = freshScheduler();
      await rescheduleAll({ ...BASE_OPTS, quoteCount: 5, qodEnabled: false, streakEnabled: false });

      const ids = byCategory('daily-quote').map((c) => c.content.data.quoteId);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('cycles a short source rather than scheduling nothing', async () => {
      mockResolveQuotes.mockResolvedValueOnce([
        { content: 'Only one', author: 'Solo', id: 'only' },
      ]);
      const { rescheduleAll } = freshScheduler();
      await rescheduleAll({ ...BASE_OPTS, quoteCount: 3, qodEnabled: false, streakEnabled: false });

      const quotes = byCategory('daily-quote');
      expect(quotes.length).toBeGreaterThan(1);
      expect(quotes.every((c) => c.content.title === 'Only one')).toBe(true);
    });
  });

  // ── Count clamping ────────────────────────────────────────────────────────

  describe('count clamping', () => {
    // Older onboarding builds let the stepper reach 0, which left the reminder
    // reading as on with nothing scheduled behind it.
    it('treats a stored count of 0 as 1 rather than scheduling nothing', async () => {
      const { rescheduleAll } = freshScheduler();
      await rescheduleAll({ ...BASE_OPTS, quoteCount: 0, qodEnabled: false, streakEnabled: false });

      const quotes = byCategory('daily-quote');
      expect(quotes.length).toBeGreaterThan(0);

      const perDay = new Map<string, number>();
      for (const c of quotes) {
        const key = (c.trigger.date as Date).toDateString();
        perDay.set(key, (perDay.get(key) ?? 0) + 1);
      }
      expect([...perDay.values()].every((n) => n === 1)).toBe(true);
    });

    it('clamps an absurd count to 20 per day', async () => {
      const { rescheduleAll } = freshScheduler();
      mockPlatform.OS = 'android'; // no cap, so the clamp is what limits it
      await rescheduleAll({ ...BASE_OPTS, quoteCount: 500, qodEnabled: false, streakEnabled: false });

      const perDay = new Map<string, number>();
      for (const c of byCategory('daily-quote')) {
        const key = (c.trigger.date as Date).toDateString();
        perDay.set(key, (perDay.get(key) ?? 0) + 1);
      }
      expect(Math.max(...perDay.values())).toBe(20);
    });

    it('still schedules nothing when quotesEnabled is false', async () => {
      const { rescheduleAll } = freshScheduler();
      await rescheduleAll({ ...BASE_OPTS, quotesEnabled: false, quoteCount: 0 });

      expect(byCategory('daily-quote')).toHaveLength(0);
    });
  });

  // ── Times ─────────────────────────────────────────────────────────────────

  describe('time windows', () => {
    const timesOn = (dateStr: string) =>
      byCategory('daily-quote')
        .map((c) => c.trigger.date as Date)
        .filter((d) => d.toDateString() === dateStr)
        .map((d) => ({ h: d.getHours(), m: d.getMinutes() }));

    it('distributes quote slots evenly across the window', async () => {
      const { rescheduleAll } = freshScheduler();
      // 09:00..13:00 (240 min) with 3 quotes → 09:00, 11:00, 13:00
      await rescheduleAll({
        ...BASE_OPTS,
        quoteCount: 3,
        startHHMM: '09:00',
        endHHMM: '13:00',
        qodEnabled: false,
        streakEnabled: false,
      });

      expect(timesOn(NOW.toDateString())).toEqual([
        { h: 9, m: 0 },
        { h: 11, m: 0 },
        { h: 13, m: 0 },
      ]);
    });

    it('puts a single daily quote at the start of the window', async () => {
      const { rescheduleAll } = freshScheduler();
      await rescheduleAll({
        ...BASE_OPTS,
        quoteCount: 1,
        startHHMM: '09:15',
        endHHMM: '20:00',
        qodEnabled: false,
        streakEnabled: false,
      });

      expect(timesOn(NOW.toDateString())).toEqual([{ h: 9, m: 15 }]);
    });

    it('falls back to a one-hour window when endTime <= startTime', async () => {
      const { rescheduleAll } = freshScheduler();
      // Zero-width window: should not throw, and the midpoint of 10:00..11:00
      // for two slots is 10:00 and 11:00.
      await rescheduleAll({
        ...BASE_OPTS,
        quoteCount: 2,
        startHHMM: '10:00',
        endHHMM: '10:00',
        qodEnabled: false,
        streakEnabled: false,
      });

      expect(timesOn(NOW.toDateString())).toEqual([
        { h: 10, m: 0 },
        { h: 11, m: 0 },
      ]);
    });

    it('never schedules a DATE trigger in the past', async () => {
      const { rescheduleAll } = freshScheduler();
      await rescheduleAll({ ...BASE_OPTS, startHHMM: '00:00', endHHMM: '23:00' });

      const past = byCategory('daily-quote').filter(
        (c) => (c.trigger.date as Date).getTime() <= NOW.getTime(),
      );
      expect(past).toHaveLength(0);
    });

    it('skips today entirely once the whole window has passed', async () => {
      jest.setSystemTime(new Date(2026, 2, 10, 23, 30, 0));
      try {
        const { rescheduleAll } = freshScheduler();
        await rescheduleAll({
          ...BASE_OPTS,
          startHHMM: '09:00',
          endHHMM: '22:00',
          qodEnabled: false,
          streakEnabled: false,
        });

        const today = byCategory('daily-quote').filter(
          (c) => (c.trigger.date as Date).toDateString() === NOW.toDateString(),
        );
        expect(today).toHaveLength(0);
        expect(byCategory('daily-quote').length).toBeGreaterThan(0);
      } finally {
        jest.setSystemTime(NOW);
      }
    });

    it('fires QoD at the configured hour and minute', async () => {
      const { rescheduleAll } = freshScheduler();
      await rescheduleAll({ ...BASE_OPTS, quotesEnabled: false, qodTime: '07:30', streakEnabled: false });

      expect(byCategory('qod')[0].trigger).toMatchObject({ hour: 7, minute: 30 });
    });

    it('fires the streak reminder at the configured hour and minute', async () => {
      const { rescheduleAll } = freshScheduler();
      await rescheduleAll({ ...BASE_OPTS, quotesEnabled: false, qodEnabled: false, streakTime: '21:45' });

      expect(byCategory('streak')[0].trigger).toMatchObject({ hour: 21, minute: 45 });
    });
  });

  // ── Content ───────────────────────────────────────────────────────────────

  describe('content', () => {
    it('omits the body when showAuthor is false', async () => {
      const { rescheduleAll } = freshScheduler();
      await rescheduleAll({ ...BASE_OPTS, showAuthor: false, qodEnabled: false, streakEnabled: false });

      expect(byCategory('daily-quote').every((c) => c.content.body === undefined)).toBe(true);
    });

    // Attribution uses a plain ASCII hyphen. An em or en dash here is the
    // regression this guards: it looks near-identical in a diff and only shows
    // up on the device.
    it('attributes the author with a hyphen when showAuthor is true', async () => {
      const { rescheduleAll } = freshScheduler();
      await rescheduleAll({ ...BASE_OPTS, showAuthor: true, qodEnabled: false, streakEnabled: false });

      const quotes = byCategory('daily-quote');
      expect(quotes.length).toBeGreaterThan(0);
      for (const c of quotes) {
        expect(c.content.body).toBe(`- ${c.content.data.quoteAuthor}`);
        expect(c.content.body).not.toMatch(/[–—]/);
      }
    });

    it('attributes the QoD author the same way', async () => {
      const { rescheduleAll } = freshScheduler();
      await rescheduleAll({
        ...BASE_OPTS,
        showAuthor: true,
        quotesEnabled: false,
        streakEnabled: false,
      });

      expect(byCategory('qod')[0].content.body).toBe('- Author 0');
    });

    it('labels the QoD body instead of attributing when showAuthor is false', async () => {
      const { rescheduleAll } = freshScheduler();
      await rescheduleAll({
        ...BASE_OPTS,
        showAuthor: false,
        quotesEnabled: false,
        streakEnabled: false,
      });

      expect(byCategory('qod')[0].content.body).toBe('Quote of the Day');
    });

    it('truncates a long quote title at 120 characters with an ellipsis', async () => {
      mockResolveQuotes.mockResolvedValueOnce([
        { content: 'A'.repeat(150), author: 'Author', id: 'long-1' },
      ]);
      const { rescheduleAll } = freshScheduler();
      await rescheduleAll({ ...BASE_OPTS, quoteCount: 1, qodEnabled: false, streakEnabled: false });

      const title = byCategory('daily-quote')[0].content.title as string;
      expect(title).toHaveLength(120); // 119 chars + '…'
      expect(title.endsWith('…')).toBe(true);
    });

    it('leaves a short quote title untouched', async () => {
      const { rescheduleAll } = freshScheduler();
      await rescheduleAll({ ...BASE_OPTS, quoteCount: 1, qodEnabled: false, streakEnabled: false });

      expect(byCategory('daily-quote')[0].content.title).toBe('Quote 0');
    });

    it('carries the quote through data so a tap can open it', async () => {
      const { rescheduleAll } = freshScheduler();
      await rescheduleAll({ ...BASE_OPTS, quoteCount: 1, qodEnabled: false, streakEnabled: false });

      expect(byCategory('daily-quote')[0].content.data).toMatchObject({
        category: 'daily-quote',
        quoteId: 'q0',
        quoteText: 'Quote 0',
        quoteAuthor: 'Author 0',
      });
    });

    it('gives QoD a real quote from its own source', async () => {
      const { rescheduleAll } = freshScheduler();
      await rescheduleAll({
        ...BASE_OPTS,
        quotesEnabled: false,
        streakEnabled: false,
        qodSource: '_favorites',
      });

      const qod = byCategory('qod')[0];
      expect(qod.content.title).toBe('Quote 0');
      expect(qod.content.data.quoteId).toBe('q0');
      expect(mockResolveQuotes).toHaveBeenCalledWith('_favorites', 1);
    });

    it('lets the two reminders draw from different sources', async () => {
      const { rescheduleAll } = freshScheduler();
      await rescheduleAll({
        ...BASE_OPTS,
        streakEnabled: false,
        quoteSource: 'wisdom',
        qodSource: 'collection:abc',
      });

      const sources = mockResolveQuotes.mock.calls.map((c) => c[0]);
      expect(sources).toContain('wisdom');
      expect(sources).toContain('collection:abc');
    });

    it('titles the streak reminder without an emoji', async () => {
      const { rescheduleAll } = freshScheduler();
      await rescheduleAll({ ...BASE_OPTS, quotesEnabled: false, qodEnabled: false });

      expect(byCategory('streak')[0].content.title).toBe('Keep your streak alive');
    });
  });

  // ── Android channel ───────────────────────────────────────────────────────

  describe('android channel', () => {
    it('creates the channel and tags every notification with it', async () => {
      mockPlatform.OS = 'android';
      const { rescheduleAll } = freshScheduler();
      await rescheduleAll({ ...BASE_OPTS, quoteCount: 2 });

      expect(mockSetChannel).toHaveBeenCalledWith('daily-quotes', expect.anything());
      expect(calls().every((c) => c.content.channelId === 'daily-quotes')).toBe(true);
    });

    it('sets no channelId on iOS', async () => {
      const { rescheduleAll } = freshScheduler();
      await rescheduleAll({ ...BASE_OPTS, quoteCount: 2 });

      expect(mockSetChannel).not.toHaveBeenCalled();
      expect(calls().every((c) => c.content.channelId === undefined)).toBe(true);
    });
  });

  // ── Race guard ────────────────────────────────────────────────────────────

  describe('race guard', () => {
    it('lets only the most recent call schedule anything', async () => {
      const { rescheduleAll } = freshScheduler();

      const stale = rescheduleAll({
        ...BASE_OPTS,
        quotesEnabled: false,
        streakEnabled: false,
        qodTime: '07:30',
      });
      const latest = rescheduleAll({
        ...BASE_OPTS,
        quotesEnabled: false,
        streakEnabled: false,
        qodTime: '09:45',
      });
      await Promise.all([stale, latest]);

      const qod = byCategory('qod');
      expect(qod).toHaveLength(1);
      expect(qod[0].trigger).toMatchObject({ hour: 9, minute: 45 });
    });

    it('always clears the existing schedule before rebuilding', async () => {
      const { rescheduleAll } = freshScheduler();
      await rescheduleAll(BASE_OPTS);

      expect(mockCancel).toHaveBeenCalledTimes(1);
      expect(mockCancel.mock.invocationCallOrder[0])
        .toBeLessThan(mockSchedule.mock.invocationCallOrder[0]);
    });
  });

  // ── Legacy compatibility ──────────────────────────────────────────────────

  describe('scheduleQuoteNotifications (legacy)', () => {
    it('delegates with only daily quotes enabled', async () => {
      const { scheduleQuoteNotifications } = freshScheduler();
      await scheduleQuoteNotifications({ count: 3, startHHMM: '09:00', endHHMM: '21:00' });

      expect(byCategory('qod')).toHaveLength(0);
      expect(byCategory('streak')).toHaveLength(0);
      expect(byCategory('daily-quote').length).toBeGreaterThan(0);
      expect(byCategory('daily-quote').every((c) => c.trigger.type === 'date')).toBe(true);
    });

    it('honours the window it is given', async () => {
      const { scheduleQuoteNotifications } = freshScheduler();
      await scheduleQuoteNotifications({ count: 2, startHHMM: '10:00', endHHMM: '18:00' });

      const today = byCategory('daily-quote')
        .map((c) => c.trigger.date as Date)
        .filter((d) => d.toDateString() === NOW.toDateString())
        .map((d) => ({ h: d.getHours(), m: d.getMinutes() }));

      expect(today).toEqual([{ h: 10, m: 0 }, { h: 18, m: 0 }]);
    });
  });
});

// ── ensureNotificationChannel ─────────────────────────────────────────────────

describe('ensureNotificationChannel', () => {
  beforeEach(resetAll);

  it('is a no-op on iOS', async () => {
    const { ensureNotificationChannel } = freshScheduler();
    await ensureNotificationChannel();
    expect(mockSetChannel).not.toHaveBeenCalled();
  });

  it('creates the daily-quotes channel on Android', async () => {
    mockPlatform.OS = 'android';
    const { ensureNotificationChannel } = freshScheduler();
    await ensureNotificationChannel();

    expect(mockSetChannel).toHaveBeenCalledWith(
      'daily-quotes',
      expect.objectContaining({ name: 'Daily Quotes' }),
    );
  });
});

// ── cancelAllNotifications ────────────────────────────────────────────────────

describe('cancelAllNotifications', () => {
  beforeEach(resetAll);

  it('calls cancelAllScheduledNotificationsAsync exactly once', async () => {
    const { cancelAllNotifications } = freshScheduler();
    await cancelAllNotifications();
    expect(mockCancel).toHaveBeenCalledTimes(1);
  });
});
