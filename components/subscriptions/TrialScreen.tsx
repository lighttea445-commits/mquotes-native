import React, { useEffect, useRef, useState } from 'react';
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
 * Subscription terms. Both stores require this link on a paywall. Blank hides
 * the footer item rather than pointing it at a dead address.
 */
const TERMS_URL = 'https://my-site-drh2pzq2-kovoapps.wix-vibe-site.com/';

/**
 * Advertised prices, shown only until the store's own strings arrive. The real
 * priceString always wins once offerings load — the store can return a
 * different currency or a regional price.
 */
const FALLBACK_MONTHLY = '$4.99';
const FALLBACK_ANNUAL = '$44.99';

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

/**
 * The price line under the CTA. Prefers the store's own price strings so the
 * user sees their real currency; falls back to the advertised pair so the line
 * is never missing while offerings are still in flight.
 */
function priceLineFor(offerings: ReturnType<typeof useRevenueCat>['offerings']): string {
  const packages = offerings?.current?.availablePackages;

  const monthly = packages?.find(p => p.packageType === 'MONTHLY')?.product?.priceString;
  const annual = packages?.find(p => p.packageType === 'ANNUAL')?.product?.priceString;

  // Offerings loaded but neither plan is the standard monthly/annual pair —
  // show whatever the first package actually is rather than mislabelling its
  // period or quoting a price that isn't on sale.
  if (packages?.length && !monthly && !annual) {
    const price = packages[0].product?.priceString;
    if (price) return price;
  }

  return `${monthly ?? FALLBACK_MONTHLY}/month or ${annual ?? FALLBACK_ANNUAL}/year`;
}

/**
 * The package the CTA buys. Annual is preferred because it is the plan the
 * free trial is attached to; the monthly price is still disclosed in the line
 * beneath the button.
 */
function trialPackageFor(
  offerings: ReturnType<typeof useRevenueCat>['offerings'],
): PurchasesPackage | null {
  const packages = offerings?.current?.availablePackages;
  if (!packages || packages.length === 0) return null;
  return packages.find(p => p.packageType === 'ANNUAL') ?? packages[0];
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
  const { offerings } = useRevenueCat();
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const notifIdRef = useRef<string | null>(null);
  const steps = buildSteps();
  const timelineHeight = STEP_HEIGHT * steps.length;
  const priceLine = priceLineFor(offerings);
  const trialPackage = trialPackageFor(offerings);

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
   */
  const handleContinue = async () => {
    if (purchasing) return;
    setPurchasing(true);

    try {
      // Offerings can still be in flight when the sheet opens. Fetch on demand
      // rather than dropping the tap, so the button always reaches the store's
      // billing sheet.
      let pkg = trialPackage;
      if (!pkg) {
        try {
          pkg = trialPackageFor(await Purchases.getOfferings());
        } catch {
          pkg = null;
        }
      }

      // Offerings never arrived, so there is nothing to buy. Don't strand the
      // user on a dead button — especially mid-onboarding.
      if (!pkg) { done(); return; }

      const { customerInfo } = await Purchases.purchasePackage(pkg);
      if (customerInfo.entitlements.active[ENTITLEMENT_PRO]) {
        analytics.track('subscription_purchased', {
          packageId: pkg.identifier,
          productId: pkg.product.identifier,
        });
        done();
      }
    } catch (e) {
      const err = e as { userCancelled?: boolean };
      if (!err?.userCancelled) {
        errorReporting.captureError(e as Error, { context: 'TrialScreen:purchase' });
      }
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <SheetHeader leading="close" onLeadingPress={onClose} />

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
        </ScrollView>

        {/* Bottom */}
        <View style={styles.bottom}>
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
                Try for $0.00
              </Text>
            )}
          </Pressable>

          {/* What the trial converts to, disclosed on the same screen as the
              CTA. Reads the store's real price once offerings land. */}
          <Text style={[styles.priceLine, { color: theme.textMuted, fontFamily: theme.bodyFontFamily }]}>
            {priceLine}
          </Text>

          {TERMS_URL ? (
            <Pressable
              onPress={() => Linking.openURL(TERMS_URL)}
              hitSlop={HIT}
              style={styles.footerItem}
              accessibilityRole="link"
              accessibilityLabel="Terms"
            >
              <Text style={[styles.footerText, { color: theme.textMuted, fontFamily: theme.uiFontFamily }]}>
                Terms
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
  scrollContent: {
    paddingTop: SPACE.sm,
    paddingHorizontal: GUTTER,
    paddingBottom: SPACE.md,
  },
  // fontWeight is inert on Peachi and on the Inter families — every weight
  // here is a family name (see constants/fonts.ts).
  title: {
    fontSize: 30,
    fontFamily: FONTS.display.bold,
    lineHeight: 38,
    includeFontPadding: false,
    letterSpacing: -0.4,
    marginBottom: 6,
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
    fontSize: 18,
    fontFamily: FONTS.display.bold,
    lineHeight: 24,
    includeFontPadding: false,
  },
  stepTitleDone: {
    fontSize: 18,
    fontFamily: FONTS.display.bold,
    lineHeight: 24,
    includeFontPadding: false,
    textDecorationLine: 'line-through',
  },
  stepSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  bottom: {
    paddingHorizontal: GUTTER,
    paddingTop: SPACE.sm,
    paddingBottom: SPACE.md,
    gap: SPACE.md,
  },
  priceLine: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: -SPACE.xs,
  },
  footerItem: {
    alignSelf: 'center',
    marginTop: -SPACE.sm,
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
  },
  toggleLabel: {
    fontSize: 15,
  },
  ctaButton: {
    height: 56,
    borderRadius: 30,
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
