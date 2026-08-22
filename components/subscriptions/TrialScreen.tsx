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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { Icon } from '../ui/Icon';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../hooks/useTheme';
import { useRevenueCat } from '../../hooks/useRevenueCat';
import { ENTITLEMENT_PRO } from '../../lib/revenuecat';
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
const STEP_HEIGHT_MIN = 44;
const STEP_HEIGHT_MAX = 84;

/** Card padding plus its border, the only part of the card that is fixed. */
const CARD_CHROME = 30;

/** Used for one frame, until the card reports the height flexbox gave it. */
const STEP_HEIGHT_SEED = 60;

const ICON_SIZE = 28;
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
  const reminderDate = formatDate(addDays(today, TRIAL_DAYS - 1));
  const memberDate = formatDate(addDays(today, TRIAL_DAYS));
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
      subtitle: `Full access, free for ${TRIAL_DAYS} days`,
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

interface PlanOption {
  key: string;
  label: string;
  /** The store's own price string, or the advertised one until offerings land. */
  price: string;
  /** How it bills, spelled out under the label. */
  caption: string;
  /** Reads after the price in the line under the CTA. Empty when unknown. */
  period: string;
  badge: string | null;
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
  const annualPkg = packages.find(p => p.packageType === 'ANNUAL') ?? null;
  const monthlyPkg = packages.find(p => p.packageType === 'MONTHLY') ?? null;

  // The store returned packages, but not the standard monthly/annual pair.
  // Offer exactly what exists rather than mislabelling its billing period.
  if (packages.length > 0 && !annualPkg && !monthlyPkg) {
    return packages.slice(0, 2).map(p => ({
      key: p.identifier,
      label: p.product.title,
      price: p.product.priceString,
      caption: p.product.description,
      period: '',
      badge: null,
      pkg: p,
    }));
  }

  const inFlight = packages.length === 0;
  const annualValue = annualPkg?.product.price ?? FALLBACK_ANNUAL_PRICE;
  const monthlyValue = monthlyPkg?.product.price ?? FALLBACK_MONTHLY_PRICE;
  const currency = annualPkg?.product.currencyCode ?? monthlyPkg?.product.currencyCode;
  const saving = savingsPercent(monthlyValue, annualValue);

  // Each card states its own plan in the other card's billing period, so the
  // two are comparable in both directions and the annual saving is visible as
  // a pair of numbers rather than a claim.
  const perMonth = formatMoney(annualValue / 12, currency);
  const perYear = formatMoney(monthlyValue * 12, currency);
  const savingLabel = saving ? `Save ${saving}%` : null;

  // The free trial is the strongest thing either card has to say, so it takes
  // the badge whenever the store actually offers it and pushes the saving down
  // into the caption rather than competing with it. Both plans are advertised
  // with a trial, so both assume one until the store says otherwise.
  const annualTrial = trialBadgeFor(annualPkg, inFlight);
  const monthlyTrial = trialBadgeFor(monthlyPkg, inFlight);

  const options: PlanOption[] = [];
  if (annualPkg || inFlight) {
    options.push({
      key: 'annual',
      label: 'Annual',
      price: annualPkg?.product.priceString ?? FALLBACK_ANNUAL,
      caption: `${perMonth} a month`,
      period: 'per year',
      badge: annualTrial ?? savingLabel,
      pkg: annualPkg,
    });
  }
  if (monthlyPkg || inFlight) {
    options.push({
      key: 'monthly',
      label: 'Monthly',
      price: monthlyPkg?.product.priceString ?? FALLBACK_MONTHLY,
      caption: `${perYear} a year`,
      period: 'per month',
      badge: monthlyTrial,
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
      accessibilityLabel={
        `${option.label}, ${option.price} ${option.period}`.trim() +
        (option.badge ? `, ${option.badge}` : '')
      }
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
        <Text
          style={[styles.planCaption, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}
          numberOfLines={1}
        >
          {option.caption}
        </Text>
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
  const { offerings, error: rcError } = useRevenueCat();
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const notifIdRef = useRef<string | null>(null);
  const steps = buildSteps();

  // The card is a flex child, so this is the height flexbox actually gave it,
  // not a height derived from adding up everything else on the screen.
  const [timelineHeight, setTimelineHeight] = useState(0);
  const stepHeight = timelineHeight > 0 ? timelineHeight / steps.length : STEP_HEIGHT_SEED;

  const planOptions = useMemo(() => planOptionsFrom(offerings), [offerings]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Falling back to the first option means a key that stops existing when real
  // offerings replace the advertised pair resolves itself, with no effect and
  // no window where nothing is selected. Annual leads, so it is the default.
  const selectedPlan = planOptions.find(o => o.key === selectedKey) ?? planOptions[0] ?? null;

  // Before offerings land there is no introPrice to read. Both advertised
  // plans carry the trial, so assume one and let the real value correct it.
  const trialOnSelected = selectedPlan?.pkg ? hasFreeTrial(selectedPlan.pkg) : !!selectedPlan;

  // Names the exact plan the button charges, on the same screen as the button.
  const disclosure = (() => {
    if (!selectedPlan) return '';
    const priced = [selectedPlan.price, selectedPlan.period].filter(Boolean).join(' ');
    return trialOnSelected
      ? `${TRIAL_DAYS} days free, then ${priced}. Cancel anytime.`
      : `${priced}. Cancel anytime.`;
  })();

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
  const handleContinue = async () => {
    if (purchasing) return;
    setPurchasing(true);
    setPurchaseError(null);

    try {
      // Offerings can still be in flight when the sheet opens. Fetch on demand
      // rather than dropping the tap, so the button always reaches the store's
      // billing sheet.
      let pkg = selectedPlan?.pkg ?? null;
      let reason: string | null = null;
      if (!pkg) {
        try {
          // Re-resolve against the same key so a tap made before offerings
          // landed still buys the plan the user actually picked.
          const fresh = planOptionsFrom(await Purchases.getOfferings());
          pkg = (fresh.find(o => o.key === selectedPlan?.key) ?? fresh[0])?.pkg ?? null;
          if (!pkg) reason = 'The store returned no plans for this build.';
        } catch (e) {
          errorReporting.captureError(e as Error, { context: 'TrialScreen:getOfferings' });
          reason = (e as Error)?.message ?? null;
          pkg = null;
        }
      }

      // "Check your connection" was the wrong thing to say: an empty offering
      // is a store configuration problem, not a network one, and there is no
      // console on a TestFlight device to find the real reason in.
      if (!pkg) {
        const detail = reason ?? rcError?.message ?? 'The store returned no plans for this build.';
        setPurchaseError(`Plans could not be loaded. ${detail}`);
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
          <Text style={[styles.title, { color: theme.text }]}>
            How your free trial works
          </Text>
          <Text style={[styles.subtitle, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
            You won't be charged anything today
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
                    {step.done ? (
                      <>
                        <Text style={[styles.stepTitleDone, { color: theme.textMuted }]}>
                          {step.title}
                        </Text>
                        <Text style={[styles.stepSubtitle, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                          {step.subtitle}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text style={[styles.stepTitle, { color: theme.text }]}>
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

          {/* Sits with the timeline it refers to, which keeps the purchase
              block below to plans, button, fine print. */}
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
        </ScrollView>

        {/* Bottom */}
        <View style={styles.bottom}>
          {planOptions.length > 0 ? (
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
            disabled={purchasing}
            style={[styles.ctaButton, { backgroundColor: theme.goldButton, opacity: purchasing ? 0.7 : 1 }]}
            accessibilityRole="button"
            accessibilityState={{ disabled: purchasing }}
          >
            {purchasing ? (
              <ActivityIndicator color={ON_GOLD} />
            ) : (
              <Text style={[styles.ctaText, { color: ON_GOLD }]}>
                Continue
              </Text>
            )}
          </Pressable>

          {purchaseError ? (
            <Text
              style={[styles.errorLine, { color: theme.text, fontFamily: theme.bodyFontFamily }]}
              accessibilityLiveRegion="polite"
            >
              {purchaseError}
            </Text>
          ) : null}

          {/* Names the selected plan, its price and its renewal directly under
              the button that charges it. Reads the store's real price once
              offerings land. */}
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
    paddingBottom: SPACE.md,
  },
  // fontWeight is inert on Peachi and on the Inter families — every weight
  // here is a family name (see constants/fonts.ts).
  title: {
    fontSize: 27,
    fontFamily: FONTS.display.bold,
    lineHeight: 34,
    includeFontPadding: false,
    letterSpacing: -0.4,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 18,
    textAlign: 'center',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    // Takes the slack the rest of the screen leaves. The bounds keep it from
    // collapsing on a small screen or spreading on a large one; past the floor
    // the ScrollView takes over.
    flex: 1,
    minHeight: STEP_HEIGHT_MIN * 4 + CARD_CHROME,
    maxHeight: STEP_HEIGHT_MAX * 4 + CARD_CHROME,
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
    fontSize: 17,
    fontFamily: FONTS.display.bold,
    lineHeight: 22,
    includeFontPadding: false,
  },
  stepTitleDone: {
    fontSize: 17,
    fontFamily: FONTS.display.bold,
    lineHeight: 22,
    includeFontPadding: false,
    textDecorationLine: 'line-through',
  },
  stepSubtitle: {
    fontSize: 12.5,
    lineHeight: 16,
  },
  bottom: {
    paddingHorizontal: GUTTER,
    paddingTop: SPACE.sm,
    paddingBottom: SPACE.md,
    gap: SPACE.sm,
  },
  disclosure: {
    fontSize: 13,
    lineHeight: 18,
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
    paddingVertical: SPACE.sm,
    gap: SPACE.md,
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
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.sm,
    // Stands in for the `gap` it lost when it moved inside the ScrollView.
    marginTop: SPACE.sm,
  },
  toggleLabel: {
    fontSize: 15,
  },
  ctaButton: {
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 18,
    fontFamily: FONTS.display.bold,
    lineHeight: 26,
    includeFontPadding: false,
    letterSpacing: 0.2,
  },
});
