import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Linking,
  ActivityIndicator,
  ActionSheetIOS,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { Icon } from '../ui/Icon';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../hooks/useTheme';
import { useRevenueCat } from '../../hooks/useRevenueCat';
import { ENTITLEMENT_PRO, IAP_DIAGNOSTICS } from '../../lib/revenuecat';
import { requestPermissions, canAskForPermissions } from '../../lib/notifications';
import { errorReporting } from '../../lib/errorReporting';
import { analytics } from '../../lib/analytics';
import { SheetHeader } from '../ui/SheetHeader';
import { Toggle } from '../ui/Toggle';
import { FONTS } from '../../constants/fonts';
import { GUTTER, SPACE, RADIUS, HIT, ON_GOLD } from '../ui/tokens';

const TRIAL_REMINDER_KEY = '@trial_reminder_notif_id';

/**
 * Subscription terms and privacy policy. Both stores require both documents to
 * be reachable from the paywall, and this one link is labelled as covering
 * both, so the page it opens has to carry both. Blank hides the footer item
 * rather than pointing it at a dead address.
 */
const TERMS_URL = 'https://my-site-drh2pzq2-kovoapps.wix-vibe-site.com/';

/**
 * Advertised prices, shown only until the store's own strings arrive. The real
 * priceString always wins once offerings load — the store can return a
 * different currency or a regional price. The numbers are the source of truth
 * so the saving badge and the per-month line derive from the same pair.
 */
const FALLBACK_MONTHLY_PRICE = 4.99;
const FALLBACK_ANNUAL_PRICE = 44.99;
const FALLBACK_MONTHLY = `$${FALLBACK_MONTHLY_PRICE.toFixed(2)}`;
const FALLBACK_ANNUAL = `$${FALLBACK_ANNUAL_PRICE.toFixed(2)}`;

/**
 * Trial length in days, shared by the timeline and the line under the CTA so
 * the two can never disagree. This is the advertised length: the real one is
 * the introductory offer set on the product in App Store Connect and Play.
 */
const TRIAL_DAYS = 3;

/**
 * The timeline is the one block on this screen that can give, so the card is a
 * flex child and takes whatever the layout engine has left after the headings,
 * the reminder row and the purchase block.
 *
 * Two earlier attempts summed those heights by hand and both were wrong: the
 * total depends on safe areas, the sheet header, the user's text size and the
 * natural line height of a font, none of which are knowable from here. So
 * nothing is summed any more. Flexbox sizes the card, an onLayout reads the
 * result, and the steps divide that measured height between them.
 *
 * The bounds only stop the card collapsing to nothing on a very small screen
 * or spreading until it stops reading as one sequence on a very large one.
 * Below the floor the ScrollView takes over, which is what it is there for.
 */
// The floor leaves each step ten points clear of its own two lines of text.
// Going below that is what made the card read as cramped rather than calm.
// A step carries 39pt of text. 50 is the floor that keeps a little air under
// it; 78 is as tall as one can stand before four of them read as a stretched
// list rather than a sequence — 96 was tuned when there were only three.
const STEP_HEIGHT_MIN = 50;
const STEP_HEIGHT_MAX = 78;

/** How many `buildSteps` returns, needed by the card bounds at module scope. */
const STEP_COUNT = 4;

/** Card padding plus its border, the only part of the card that is fixed. */
const CARD_CHROME = 26;

/**
 * Marks both headline figures as per month. Annual needs it, because its
 * headline is a monthly equivalent rather than what the store charges; monthly
 * carries it too, since one labelled figure beside one bare one reads as an
 * oversight rather than a distinction.
 */
const PER_MONTH_SUFFIX = '/m';

/**
 * Where the plan choice happens.
 *
 * iOS asks for it in a native action sheet hung off a single button; Android
 * keeps both plans on screen as cards. Worth being clear about what the sheet
 * is: StoreKit has no API that presents a plan picker of its own, so this is
 * UIKit's action sheet, which is native chrome but ours to populate. The
 * store's own sheet still follows, once a plan has been chosen.
 */
const PICKS_PLAN_IN_SHEET = Platform.OS === 'ios';

/** Used for one frame, until the card reports the height flexbox gave it. */
const STEP_HEIGHT_SEED = 60;

const ICON_SIZE = 26;
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
  icon: 'check' | 'lock-open-outline' | 'bell-outline' | 'crown-outline';
  title: string;
  subtitle: string;
  /** Already behind the reader: struck through and dimmed rather than pending. */
  done?: boolean;
}

/**
 * The trial, start to finish, opening on the step already behind the reader.
 *
 * That first step was dropped once, on the grounds that it told the reader
 * something they could see from the fact they were holding the phone, and that
 * it cost a quarter of the card. The second half of that no longer holds: the
 * plan cards left the scroll view on iOS and the reminder row shrank, so the
 * card has the height for four steps without any of them tightening. What it
 * buys is a timeline that starts from something already done rather than from
 * a demand, which is the point of drawing one at all.
 */
function buildSteps(): Step[] {
  const today = new Date();
  const reminderDate = formatDate(addDays(today, TRIAL_DAYS - 1));
  const memberDate = formatDate(addDays(today, TRIAL_DAYS));
  return [
    {
      icon: 'check',
      title: 'Downloaded Quotable',
      subtitle: 'Already done',
      done: true,
    },
    {
      icon: 'lock-open-outline',
      title: 'Today, get full access',
      subtitle: `Free for your first ${TRIAL_DAYS} days`,
    },
    {
      icon: 'bell-outline',
      title: `${reminderDate}, trial reminder`,
      subtitle: "To let you know it's ending soon",
    },
    {
      icon: 'crown-outline',
      title: `${memberDate}, become member`,
      subtitle: 'Your trial ends unless canceled',
    },
  ];
}

/**
 * Every package on offer. An offering that exists but is not marked Current in
 * the RevenueCat dashboard leaves `current` null, which read alone makes the
 * app believe there is nothing to sell and silently skips the store sheet.
 */
function packagesFrom(
  offerings: ReturnType<typeof useRevenueCat>['offerings'],
): PurchasesPackage[] {
  const current = offerings?.current?.availablePackages;
  if (current?.length) return current;
  return Object.values(offerings?.all ?? {}).flatMap(o => o.availablePackages);
}

/**
 * Money in the store's own currency once the product is known, plain dollars
 * for the advertised pair before that. Intl is guarded because an unavailable
 * implementation or an unrecognised code should cost a nicer string, not the
 * whole screen.
 */
function formatMoney(value: number, currencyCode?: string): string {
  if (currencyCode) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currencyCode,
      }).format(value);
    } catch {
      // Fall through to the plain format below.
    }
  }
  return `$${value.toFixed(2)}`;
}

/**
 * What annual saves against paying monthly for a year. Under 5% is not worth a
 * badge, and a missing or zero price makes no claim at all: an inflated saving
 * is exactly the kind of thing this paywall exists not to do.
 */
function savingsPercent(monthlyValue: number, annualValue: number): number | null {
  if (!(monthlyValue > 0) || !(annualValue > 0)) return null;
  const pct = Math.round((1 - annualValue / (monthlyValue * 12)) * 100);
  return pct >= 5 ? pct : null;
}

/**
 * Which of the two plans a package is.
 *
 * The product's own subscription period is the reliable signal. `packageType`
 * only reports ANNUAL or MONTHLY when the RevenueCat dashboard used one of the
 * predefined package identifiers: a package created with a custom identifier
 * reports CUSTOM, and matching on that alone drops both plans on the floor.
 */
function periodOf(pkg: PurchasesPackage): 'annual' | 'monthly' | null {
  const iso = pkg.product.subscriptionPeriod;
  if (iso === 'P1Y' || iso === 'P12M') return 'annual';
  if (iso === 'P1M') return 'monthly';
  if (pkg.packageType === 'ANNUAL') return 'annual';
  if (pkg.packageType === 'MONTHLY') return 'monthly';
  return null;
}

interface PlanOption {
  key: string;
  label: string;
  /**
   * The headline figure on the card. Annual carries its monthly equivalent, so
   * the two cards can be read straight down as one comparison instead of
   * asking the reader to divide a year by twelve.
   */
  price: string;
  /** Tiny line under the label. Empty renders nothing. */
  caption: string;
  badge: string | null;
  /**
   * Zero in this plan's own currency, for the CTA's "Try for …" label. Taken
   * from the store's currency rather than hardcoded, so the button cannot read
   * "$0.00" on a card that prices the plan at "44,99 €".
   */
  zeroPrice: string;
  /**
   * What the store charges, spelled out for the iOS action sheet.
   *
   * The card headline divides the year by twelve so the two plans compare
   * straight down a column. A sheet row has no column to compare against, so
   * it names the real charge instead — putting both figures on one row only
   * asked the reader to work out which of the two they would be paying.
   */
  sheetPrice: string;
  /** Spelled out for screen readers, where a bare "$3.75" has no period. */
  a11yLabel: string;
  /** Null while offerings are in flight — the CTA refetches on tap. */
  pkg: PurchasesPackage | null;
}

/**
 * The plans the user chooses between. Built from the store once it has
 * answered and from the advertised pair before that, so the selector is never
 * empty — the CTA is what reports a store that genuinely has nothing to sell.
 */
function planOptionsFrom(
  offerings: ReturnType<typeof useRevenueCat>['offerings'],
): PlanOption[] {
  const packages = packagesFrom(offerings);
  const annualPkg = packages.find(p => periodOf(p) === 'annual') ?? null;
  const monthlyPkg = packages.find(p => periodOf(p) === 'monthly') ?? null;

  // Neither plan could be identified at all: not a yearly or monthly product
  // between them. Offer what exists rather than mislabelling its period.
  if (packages.length > 0 && !annualPkg && !monthlyPkg) {
    return packages.slice(0, 2).map(p => ({
      key: p.identifier,
      label: p.product.title,
      price: p.product.priceString,
      caption: '',
      badge: null,
      zeroPrice: formatMoney(0, p.product.currencyCode),
      sheetPrice: p.product.priceString,
      a11yLabel: `${p.product.title}, ${p.product.priceString}`,
      pkg: p,
    }));
  }

  const inFlight = packages.length === 0;
  const annualValue = annualPkg?.product.price ?? FALLBACK_ANNUAL_PRICE;
  const monthlyValue = monthlyPkg?.product.price ?? FALLBACK_MONTHLY_PRICE;
  const currency = annualPkg?.product.currencyCode ?? monthlyPkg?.product.currencyCode;
  const saving = savingsPercent(monthlyValue, annualValue);

  // Both headline figures are per month, so the cards compare straight down:
  // $3.75 against $4.99. Annual's real yearly charge moves to its caption and
  // to the line under the CTA, which is what the user is actually billed.
  const perMonth = formatMoney(annualValue / 12, currency);
  const savingLabel = saving ? `Save ${saving}%` : null;
  const zeroPrice = formatMoney(0, currency);

  // The free trial is the strongest thing either card has to say, so it takes
  // the badge whenever the store actually offers it and pushes the saving down
  // into the caption rather than competing with it. Both plans are advertised
  // with a trial, so both assume one until the store says otherwise.
  const annualTrial = trialBadgeFor(annualPkg, inFlight);
  const monthlyTrial = trialBadgeFor(monthlyPkg, inFlight);

  const annualBilled = annualPkg?.product.priceString ?? FALLBACK_ANNUAL;
  const monthlyBilled = monthlyPkg?.product.priceString ?? FALLBACK_MONTHLY;

  const options: PlanOption[] = [];
  if (annualPkg || inFlight) {
    options.push({
      key: 'yearly',
      label: 'Yearly',
      price: `${perMonth}${PER_MONTH_SUFFIX}`,
      caption: `${annualBilled} a year`,
      badge: annualTrial ?? savingLabel,
      zeroPrice,
      sheetPrice: `${annualBilled} a year`,
      a11yLabel: `Yearly, ${perMonth} a month, ${annualBilled} a year`,
      pkg: annualPkg,
    });
  }
  if (monthlyPkg || inFlight) {
    options.push({
      key: 'monthly',
      label: 'Monthly',
      price: `${monthlyBilled}${PER_MONTH_SUFFIX}`,
      // Nothing to add: the headline already reads as the monthly charge.
      caption: '',
      badge: monthlyTrial,
      zeroPrice,
      sheetPrice: `${monthlyBilled} a month`,
      a11yLabel: `Monthly, ${monthlyBilled} a month`,
      pkg: monthlyPkg,
    });
  }
  return options;
}

/**
 * Whether the store actually attaches a free trial to this plan. The trial is
 * an introductory offer on one product, usually the annual one, so promising
 * "$0.00" on whichever plan the user picked would be a claim the store has not
 * agreed to honour.
 */
function hasFreeTrial(pkg: PurchasesPackage | null): boolean {
  return pkg?.product?.introPrice?.price === 0;
}

/**
 * One row of the iOS action sheet: the plan and what it costs, nothing else.
 *
 * A sheet row is a single line that the system truncates rather than wraps, so
 * the two plans read as a pair only while each stays short and parallel —
 * "Yearly — $44.99 a year" against "Monthly — $4.99 a month". The trial and
 * the cancel terms sit in the sheet's own message, above the rows, where they
 * apply to both and are said once.
 */
function sheetLabelFor(option: PlanOption): string {
  return `${option.label} — ${option.sheetPrice}`;
}

/**
 * The trial badge for a card, or null when this plan has no trial to promote.
 * `assumeTrial` covers the window before offerings land, where there is no
 * introPrice to read and the advertised arrangement is the best guess going.
 */
function trialBadgeFor(pkg: PurchasesPackage | null, assumeTrial: boolean): string | null {
  const free = pkg ? hasFreeTrial(pkg) : assumeTrial;
  return free ? `${TRIAL_DAYS} days free` : null;
}

async function ensureTrialChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('trial-reminder', {
      name: 'Trial Reminder',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

/**
 * One selectable plan. The border stays 2pt in both states and only changes
 * colour, so selecting a row cannot nudge the layout by a pixel.
 */
function PlanRow({
  option,
  selected,
  onPress,
  theme,
}: {
  option: PlanOption;
  selected: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={option.a11yLabel + (option.badge ? `, ${option.badge}` : '')}
      style={[
        styles.planRow,
        {
          backgroundColor: selected ? theme.surfaceElevated : theme.surface,
          borderColor: selected ? theme.gold : theme.border,
        },
      ]}
    >
      <View
        style={[
          styles.radio,
          selected
            ? { backgroundColor: theme.gold, borderColor: theme.gold }
            : { borderColor: theme.border },
        ]}
      >
        {selected ? <Icon name="check" size={13} color={ON_GOLD} /> : null}
      </View>

      <View style={styles.planText}>
        <View style={styles.planLabelRow}>
          <Text style={[styles.planLabel, { color: theme.text }]}>{option.label}</Text>
          {option.badge ? (
            <View style={[styles.planBadge, { backgroundColor: theme.gold }]}>
              <Text style={styles.planBadgeText}>{option.badge}</Text>
            </View>
          ) : null}
        </View>
        {option.caption ? (
          <Text
            style={[styles.planCaption, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}
            numberOfLines={1}
          >
            {option.caption}
          </Text>
        ) : null}
      </View>

      <Text style={[styles.planPrice, { color: theme.text }]}>{option.price}</Text>
    </Pressable>
  );
}

interface Props {
  onClose?: () => void;
  onContinue?: () => void;
}

export default function TrialScreen({ onClose, onContinue }: Props) {
  const theme = useTheme();
  const {
    offerings,
    error: rcError,
    isInitialized,
    offeringsLoading,
    offeringsDiagnostic,
    retryOfferings,
  } = useRevenueCat();
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const notifIdRef = useRef<string | null>(null);
  const steps = buildSteps();

  // The card is a flex child, so this is the height flexbox actually gave it,
  // not a height derived from adding up everything else on the screen.
  const [timelineHeight, setTimelineHeight] = useState(0);
  const stepHeight = timelineHeight > 0 ? timelineHeight / steps.length : STEP_HEIGHT_SEED;

  const planOptions = useMemo(() => planOptionsFrom(offerings), [offerings]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  /*
   * Whether the store has answered, and whether it had anything to sell.
   *
   * These were the same question before, read off `packages.length === 0`, and
   * conflating them is what App Review saw: the advertised prices render either
   * way, so a paywall with nothing behind it looked identical to one still
   * loading, right up until the tap produced "Plans could not be loaded."
   */
  const storeSettled = isInitialized && !offeringsLoading;
  const hasRealPackages = planOptions.some(o => o.pkg !== null);
  const plansUnavailable = storeSettled && !hasRealPackages;

  /**
   * One automatic retry when this screen opens on an empty store.
   *
   * Worth doing on its own timeline rather than relying on the launch fetch:
   * onboarding puts twenty steps between app start and here, so this is a
   * genuinely fresh ask minutes later rather than a re-read of a cold start
   * that StoreKit was too slow to answer.
   */
  const autoRetriedRef = useRef(false);
  useEffect(() => {
    if (plansUnavailable && !autoRetriedRef.current) {
      autoRetriedRef.current = true;
      retryOfferings();
    }
  }, [plansUnavailable, retryOfferings]);

  // Falling back to the first option means a key that stops existing when real
  // offerings replace the advertised pair resolves itself, with no effect and
  // no window where nothing is selected. Annual leads, so it is the default.
  const selectedPlan = planOptions.find(o => o.key === selectedKey) ?? planOptions[0] ?? null;

  // Before offerings land there is no introPrice to read. Both advertised
  // plans carry the trial, so assume one and let the real value correct it.
  const trialOnSelected = selectedPlan?.pkg ? hasFreeTrial(selectedPlan.pkg) : !!selectedPlan;

  /*
   * A zero on the button is a claim about what the store charges today, so it
   * is only made where the store has actually attached a free trial.
   *
   * Which plan that has to be true of depends on the platform. Android is
   * buying the selected card, so that card's own offer decides. On iOS the
   * button is pressed before any plan is chosen, so the claim has to hold for
   * every plan in the sheet — a trial on the yearly alone cannot promise a
   * zero to someone about to pick monthly.
   */
  const trialOnCta = PICKS_PLAN_IN_SHEET
    ? planOptions.length > 0 && planOptions.every(o => (o.pkg ? hasFreeTrial(o.pkg) : true))
    : trialOnSelected;
  const ctaPlan = PICKS_PLAN_IN_SHEET ? planOptions[0] ?? null : selectedPlan;

  /*
   * A button that cannot buy anything must not offer to. Once the store has
   * settled with nothing priceable, the CTA stops promising a zero and becomes
   * the retry instead, which is the only useful thing left to press.
   */
  const ctaLabel = plansUnavailable
    ? 'Try again'
    : trialOnCta && ctaPlan
      ? `Try for ${ctaPlan.zeroPrice}`
      : 'Continue';

  /*
   * The single line under the button.
   *
   * On iOS it carries the prices as well, because there are no cards to carry
   * them and the paywall cannot ask for a purchase without naming what it
   * costs — the action sheet only says so after the tap. Android's cards sit
   * directly above the button already, so repeating their prices here would be
   * the same redundancy this screen has trimmed out of it before.
   */
  const disclosure =
    planOptions.length === 0 || plansUnavailable
      ? ''
      : PICKS_PLAN_IN_SHEET
        ? [...planOptions.map(o => `${o.label} ${o.price}`), 'Cancel anytime'].join('    ')
        : 'Cancel anytime';

  /**
   * Restores the switch from the persisted ID, but only after confirming the
   * OS still holds that notification. `rescheduleAll` cancels every scheduled
   * notification, so a stored ID is not proof the reminder survived — showing
   * the switch on regardless would promise a reminder that no longer exists.
   */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const id = await AsyncStorage.getItem(TRIAL_REMINDER_KEY);
        if (!id || cancelled) return;

        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        if (cancelled) return;

        if (scheduled.some(n => n.identifier === id)) {
          notifIdRef.current = id;
          setReminderEnabled(true);
        } else {
          await AsyncStorage.removeItem(TRIAL_REMINDER_KEY);
        }
      } catch {
        // Best effort — leave the switch off rather than lying about state.
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const clearReminder = async () => {
    if (notifIdRef.current) {
      await Notifications.cancelScheduledNotificationAsync(notifIdRef.current);
      notifIdRef.current = null;
    }
    await AsyncStorage.removeItem(TRIAL_REMINDER_KEY);
  };

  /**
   * The switch moves on tap and reverts only if the work behind it fails.
   *
   * Permission goes through lib/notifications, which returns an existing grant
   * instead of re-asking. A raw requestPermissionsAsync() resolves to 'denied'
   * without ever showing a dialog once the user has answered — and onboarding
   * always asks first — so this switch refused to move at all for anyone who
   * skipped or denied that prompt. When no dialog is left to show, Settings is
   * the only route to a grant.
   */
  const handleReminderToggle = async (value: boolean) => {
    if (reminderBusy) return;
    setReminderBusy(true);
    setReminderEnabled(value);

    try {
      if (!value) {
        await clearReminder();
        return;
      }

      if (!(await requestPermissions())) {
        if (!(await canAskForPermissions())) await Linking.openSettings();
        setReminderEnabled(false);
        return;
      }

      await clearReminder();
      await ensureTrialChannel();

      // 9am on day 2, one day before the trial ends on day 3.
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
    } catch (e) {
      errorReporting.captureError(e as Error, { context: 'TrialScreen:reminderToggle' });
      setReminderEnabled(!value);
    } finally {
      setReminderBusy(false);
    }
  };

  const done = () => (onContinue ? onContinue() : onClose?.());

  /**
   * Buys straight through the store's own billing sheet — there is no second
   * paywall in between. A cancelled purchase leaves the user on this screen
   * rather than dismissing it, so the CTA is still there to retry.
   *
   * Every failure surfaces on screen. This used to dismiss silently when no
   * package resolved, which is indistinguishable from a dead button: the store
   * sheet never appears and nothing says why.
   */
  const purchase = async (chosen: PlanOption | null) => {
    if (purchasing) return;
    setPurchasing(true);
    setPurchaseError(null);

    try {
      // Offerings can still be in flight when the sheet opens. Fetch on demand
      // rather than dropping the tap, so the button always reaches the store's
      // billing sheet.
      let pkg = chosen?.pkg ?? null;
      let reason: string | null = null;
      if (!pkg) {
        try {
          // Re-resolve against the same key so a tap made before offerings
          // landed still buys the plan the user actually picked.
          const fresh = planOptionsFrom(await Purchases.getOfferings());
          pkg = (fresh.find(o => o.key === chosen?.key) ?? fresh[0])?.pkg ?? null;
          if (!pkg) reason = 'The store returned no plans for this build.';
        } catch (e) {
          errorReporting.captureError(e as Error, { context: 'TrialScreen:getOfferings' });
          reason = (e as Error)?.message ?? null;
          pkg = null;
        }
      }

      /*
       * An empty offering is a store configuration problem, not a network one,
       * so "Check your connection" was the wrong thing to say and the reason
       * was spliced onto the message instead — a TestFlight device has no
       * console to find it in.
       *
       * It reaches the reporter now rather than the screen. The buyer gets the
       * one fact that concerns them; the configuration error stays diagnosable
       * without being read out to someone who cannot act on it.
       */
      if (!pkg) {
        const detail = reason ?? rcError?.message ?? 'The store returned no plans for this build.';
        errorReporting.captureMessage(`TrialScreen: no packages — ${detail}`, 'error', {
          context: 'TrialScreen:noPackages',
        });
        setPurchaseError('Plans could not be loaded. Please try again.');
        return;
      }

      const { customerInfo } = await Purchases.purchasePackage(pkg);
      if (customerInfo.entitlements.active[ENTITLEMENT_PRO]) {
        analytics.track('subscription_purchased', {
          packageId: pkg.identifier,
          productId: pkg.product.identifier,
        });
        done();
      } else {
        setPurchaseError('Your purchase is still processing. Access unlocks as soon as the store confirms it.');
      }
    } catch (e) {
      const err = e as { userCancelled?: boolean; message?: string };
      if (!err?.userCancelled) {
        errorReporting.captureError(e as Error, { context: 'TrialScreen:purchase' });
        setPurchaseError(err?.message || 'Purchase could not be completed. Please try again.');
      }
    } finally {
      setPurchasing(false);
    }
  };

  /**
   * Android buys the card the user already selected. iOS has no cards, so the
   * choice is asked for first, in the OS's own action sheet.
   *
   * With fewer than two plans there is nothing to choose between, so the sheet
   * is skipped rather than shown with a single row — including the window
   * before offerings land, where the tap falls through to `purchase` and its
   * on-demand refetch resolves what to buy.
   */
  const handleRetry = async () => {
    if (retrying) return;
    setRetrying(true);
    setPurchaseError(null);
    try {
      await retryOfferings();
    } finally {
      setRetrying(false);
    }
  };

  const handleContinue = () => {
    if (purchasing || retrying) return;
    if (plansUnavailable) {
      handleRetry();
      return;
    }
    if (!PICKS_PLAN_IN_SHEET || planOptions.length < 2) {
      purchase(PICKS_PLAN_IN_SHEET ? planOptions[0] ?? null : selectedPlan);
      return;
    }

    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: 'Choose your plan',
        // Same rule as the button: the trial is only promised where every plan
        // in the sheet actually carries one.
        message: trialOnCta
          ? `${TRIAL_DAYS} days free, then your plan renews. Cancel anytime.`
          : 'Cancel anytime.',
        options: [...planOptions.map(sheetLabelFor), 'Cancel'],
        cancelButtonIndex: planOptions.length,
        userInterfaceStyle: theme.isDark ? 'dark' : 'light',
      },
      index => {
        if (index < planOptions.length) purchase(planOptions[index]);
      },
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* SheetHeader is shared by every sheet and carries no spacing prop,
            so the tightening is local: this screen is the one that needs the
            height. It pulls up what sits below the header, never the header
            itself, which has to keep the full safe-area inset above it. */}
        <View style={styles.headerTight}>
          <SheetHeader leading="close" onLeadingPress={onClose} />
        </View>

        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* A subtitle here was dropped once before as redundant, back when
              the line under the CTA spelled out the full terms. That line now
              says only "Cancel anytime", so the one thing a reader wants
              settled before reading a timeline — whether tapping costs them
              anything today — is no longer answered anywhere else. */}
          {/* One line, always. Wrapped across two it stopped reading as a
              heading and cost the card the height of a whole timeline step.
              The size is set to fit; `adjustsFontSizeToFit` only has to catch
              what that cannot know about — a narrower screen than any this
              targets, or the user's own text-size setting scaling it up. */}
          <Text
            style={[styles.title, { color: theme.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            How your free trial works
          </Text>
          <Text style={[styles.subtitle, { color: theme.textMuted, fontFamily: theme.bodyFontFamily }]}>
            You won't pay anything today
          </Text>

          {/* Timeline card */}
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: `${theme.gold}50` }]}>
            <View
              style={styles.timelineRow}
              onLayout={e => setTimelineHeight(e.nativeEvent.layout.height)}
            >

              {/* Left: gradient bar + icon nodes */}
              <View style={styles.timelineLeft}>
                <LinearGradient
                  colors={[theme.gold, `${theme.gold}80`, theme.border]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={{
                    position: 'absolute',
                    left: (LEFT_COL_WIDTH - BAR_WIDTH) / 2,
                    width: BAR_WIDTH,
                    top: stepHeight / 2 - 2,
                    bottom: stepHeight / 2 - 2,
                    borderRadius: BAR_WIDTH / 2,
                  }}
                />
                {steps.map((step, i) => (
                  <View
                    key={i}
                    style={{
                      position: 'absolute',
                      top: i * stepHeight + stepHeight / 2 - ICON_SIZE / 2,
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
                  <View key={i} style={[styles.step, { height: stepHeight }]}>
                    <Text
                      style={[
                        styles.stepTitle,
                        { color: step.done ? theme.textMuted : theme.text },
                        step.done ? styles.stepDone : null,
                      ]}
                    >
                      {step.title}
                    </Text>
                    <Text style={[styles.stepSubtitle, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                      {step.subtitle}
                    </Text>
                  </View>
                ))}
              </View>

            </View>
          </View>

        </ScrollView>

        {/* Bottom */}
        <View style={styles.bottom}>
          {/* Three quarters the height of a plan row, on the same surface,
              radius and gutter, so it joins that family as its lesser member
              rather than competing with it. It sits above the plans, not
              between them and the button, so choosing a plan and buying it
              stay adjacent. */}
          <View style={[styles.toggleRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.toggleLabel, { color: theme.text, fontFamily: theme.uiFontFamily }]}>
              Reminder before trial ends
            </Text>
            <Toggle
              value={reminderEnabled}
              onValueChange={handleReminderToggle}
              disabled={reminderBusy}
              accessibilityLabel="Reminder before trial ends"
            />
          </View>

          {/* Android chooses here; iOS chooses in the action sheet the button
              opens, and carries the same figures on one line instead. */}
          {!PICKS_PLAN_IN_SHEET && planOptions.length > 0 ? (
            <View style={styles.planGroup} accessibilityRole="radiogroup">
              {planOptions.map(option => (
                <PlanRow
                  key={option.key}
                  option={option}
                  selected={selectedPlan?.key === option.key}
                  onPress={() => setSelectedKey(option.key)}
                  theme={theme}
                />
              ))}
            </View>
          ) : null}


          <Pressable
            onPress={handleContinue}
            disabled={purchasing || retrying}
            style={[
              styles.ctaButton,
              { backgroundColor: theme.goldButton, opacity: purchasing || retrying ? 0.7 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: purchasing || retrying }}
          >
            {purchasing || retrying ? (
              <ActivityIndicator color={ON_GOLD} />
            ) : (
              <Text style={[styles.ctaText, { color: ON_GOLD }]}>
                {ctaLabel}
              </Text>
            )}
          </Pressable>

          {/* Said before the tap rather than after it. The whole point of the
              rewrite is that the reviewer learns the store is empty from the
              screen, not from pressing a button that looked like it worked. */}
          {plansUnavailable && !purchaseError ? (
            <Text
              style={[styles.errorLine, { color: theme.text, fontFamily: theme.bodyFontFamily }]}
              accessibilityLiveRegion="polite"
            >
              Plans could not be loaded right now.
            </Text>
          ) : null}

          {purchaseError ? (
            <Text
              style={[styles.errorLine, { color: theme.text, fontFamily: theme.bodyFontFamily }]}
              accessibilityLiveRegion="polite"
            >
              {purchaseError}
            </Text>
          ) : null}

          {/* Compiled out of the App Store build: IAP_DIAGNOSTICS is set only
              by the `device` EAS profile. See lib/revenuecat.ts. */}
          {IAP_DIAGNOSTICS && offeringsDiagnostic ? (
            <Text style={[styles.diagnostic, { color: theme.textMuted, fontFamily: theme.bodyFontFamily }]}>
              {offeringsDiagnostic}
            </Text>
          ) : null}

          {/* Spacing separates the parts rather than punctuation, so the line
              reads as one quiet run instead of a list. */}
          {disclosure ? (
            <Text style={[styles.disclosure, { color: theme.textMuted, fontFamily: theme.bodyFontFamily }]}>
              {disclosure}
            </Text>
          ) : null}

          {TERMS_URL ? (
            <Pressable
              onPress={() => Linking.openURL(TERMS_URL)}
              hitSlop={HIT}
              style={styles.footerItem}
              accessibilityRole="link"
              accessibilityLabel="Terms and Privacy"
            >
              <Text style={[styles.footerText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                Terms & Privacy
              </Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  headerTight: {
    // Bottom only. A negative marginTop here eats the safe-area padding the
    // SafeAreaView just applied, which puts the X under the status bar.
    marginBottom: -SPACE.sm,
  },
  scrollContent: {
    // Fill the viewport when there is room, so the card has slack to flex into,
    // and grow past it only when even the floor sizes do not fit.
    flexGrow: 1,
    paddingHorizontal: GUTTER,
    // No bottom padding. The card is the last thing in the scroll view and the
    // block below opens with its own paddingTop, so anything here stacks on
    // that and separates the two by twice what either one asked for.
  },
  // fontWeight is inert on Peachi and on the Inter families — every weight
  // here is a family name (see constants/fonts.ts).
  title: {
    /*
     * The largest size that keeps "How your free trial works" on one line.
     *
     * Measured, not guessed: Peachi-Bold sets that string at 12.145em, so at
     * this tracking it needs `12.145 * size - 25 * 0.4` points. The binding
     * case is a 360dp Android — 320pt inside the gutter — where the ceiling
     * is 27.0. This takes 26 for a 14pt buffer rather than 27's 2pt, because
     * the backstop below is the less dependable half of this on Android and
     * truncating a heading is worse than losing a point of size.
     */
    fontSize: 26,
    fontFamily: FONTS.display.bold,
    lineHeight: 33,
    includeFontPadding: false,
    letterSpacing: -0.4,
    // Tight to the subtitle it heads. The subtitle carries the gap to the card.
    marginBottom: SPACE.xs,
    textAlign: 'center',
  },
  subtitle: {
    // Holds the title's ratio (26 * 0.52). Larger than the fine print under
    // the button, which is right — this is a subhead, not more small print.
    fontSize: 14,
    lineHeight: 19,
    marginBottom: SPACE.md,
    textAlign: 'center',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: SPACE.md,
    // Takes the slack the rest of the screen leaves. The bounds keep it from
    // collapsing on a small screen or spreading on a large one; past the floor
    // the ScrollView takes over.
    flex: 1,
    minHeight: STEP_HEIGHT_MIN * STEP_COUNT + CARD_CHROME,
    maxHeight: STEP_HEIGHT_MAX * STEP_COUNT + CARD_CHROME,
  },
  timelineRow: {
    flexDirection: 'row',
    flex: 1,
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
    gap: 2,
  },
  stepTitle: {
    fontSize: 16,
    fontFamily: FONTS.display.bold,
    lineHeight: 21,
    includeFontPadding: false,
  },
  stepSubtitle: {
    fontSize: 12.5,
    lineHeight: 16,
  },
  stepDone: {
    // Only the title is struck. Running the rule through the subtitle too
    // makes the pair read as retracted rather than as completed.
    textDecorationLine: 'line-through',
  },
  bottom: {
    paddingHorizontal: GUTTER,
    paddingTop: SPACE.md,
    paddingBottom: SPACE.md,
    gap: SPACE.md,
  },
  disclosure: {
    // One step above footerText and no further. It is reassurance, not a
    // second headline, so it has to outrank the terms link without competing
    // with the button it sits under.
    fontSize: 12.5,
    lineHeight: 17,
    textAlign: 'center',
  },
  planGroup: {
    gap: SPACE.sm,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.card,
    // Constant width in both states so selecting a row cannot shift layout.
    borderWidth: 2,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.md,
    gap: SPACE.md,
    // Only annual carries a caption, so without a floor the two cards would
    // stand at different heights.
    minHeight: 68,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planText: {
    flex: 1,
    gap: 2,
  },
  planLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
  },
  planLabel: {
    fontSize: 17,
    fontFamily: FONTS.display.bold,
    lineHeight: 22,
    includeFontPadding: false,
  },
  planCaption: {
    fontSize: 12.5,
    lineHeight: 16,
  },
  planBadge: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.sm,
    paddingVertical: 2,
  },
  planBadgeText: {
    color: ON_GOLD,
    fontSize: 11,
    fontFamily: FONTS.ui.bold,
    lineHeight: 15,
  },
  planPrice: {
    fontSize: 17,
    fontFamily: FONTS.display.bold,
    lineHeight: 22,
    includeFontPadding: false,
  },
  errorLine: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  diagnostic: {
    // Deliberately small and dense. It exists to be read off a device once,
    // not to sit comfortably in the layout.
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'left',
    opacity: 0.7,
  },
  footerItem: {
    alignSelf: 'center',
    marginTop: -SPACE.xs,
  },
  footerText: {
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
    opacity: 0.8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // The plan rows' own card radius. At 51 it stays under half the box, so
    // the corners still read as a rounded card rather than rounding the whole
    // row into the stadium an earlier pass here already rejected.
    borderRadius: RADIUS.card,
    borderWidth: 1,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.sm,
    // Three quarters of the plan rows' 68. Enough under them to read as the
    // lesser row, and enough over the 30pt switch to clear it by 10 rather
    // than the 2 a true half would have left.
    minHeight: 51,
  },
  toggleLabel: {
    // A step under the plan rows' 17pt label, matching the drop in height.
    fontSize: 15,
  },
  ctaButton: {
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 19,
    fontFamily: FONTS.display.bold,
    lineHeight: 26,
    includeFontPadding: false,
    letterSpacing: 0.2,
  },
});
