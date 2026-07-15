# RevenueCat Code Examples & Usage Patterns

Complete, production-ready code examples for RevenueCat integration.

---

## Table of Contents
1. [Basic Setup](#basic-setup)
2. [Checking Entitlements](#checking-entitlements)
3. [Displaying Paywall](#displaying-paywall)
4. [Handling Purchases](#handling-purchases)
5. [Restoring Purchases](#restoring-purchases)
6. [Error Handling](#error-handling)
7. [Customer Management](#customer-management)
8. [Advanced Patterns](#advanced-patterns)

---

## Basic Setup

### Initialization (Auto-runs in app/_layout.tsx)

```typescript
// lib/revenuecat.ts
import Purchases from 'react-native-purchases';

const REVENUECAT_API_KEY = 'test_vMJWzIBFIQvlbwxFbmgSFfPUrKu';

export async function initializeRevenueCat(): Promise<void> {
  try {
    await Purchases.configure({
      apiKey: REVENUECAT_API_KEY,
      appUserID: undefined, // Auto-generate anonymous ID
    });
    console.log('✅ RevenueCat initialized');
  } catch (error) {
    console.error('❌ RevenueCat init failed:', error);
    throw error;
  }
}
```

### In App Root

```typescript
// app/_layout.tsx
useEffect(() => {
  initializeRevenueCat().catch((err) =>
    console.warn('RevenueCat initialization failed:', err)
  );
  // ... rest of initialization
}, []);
```

---

## Checking Entitlements

### Pattern 1: Simple Hook Usage (Recommended)

```typescript
import { useRevenueCat } from '../hooks/useRevenueCat';

function MyComponent() {
  const { isPro, isLoading, error } = useRevenueCat();

  if (isLoading) {
    return <ActivityIndicator />;
  }

  return (
    <Text>
      {isPro ? '👑 You are a Pro member' : '⬆️ Upgrade to Pro'}
    </Text>
  );
}
```

### Pattern 2: Manual Check

```typescript
import * as RevenueChat from '../lib/revenuecat';

async function checkProAccess() {
  try {
    const hasPro = await RevenueChat.hasProEntitlement();
    console.log('Pro access:', hasPro);
  } catch (error) {
    console.error('Check failed:', error);
  }
}
```

### Pattern 3: Get Full Customer Info

```typescript
const { customerInfo } = useRevenueCat();

// Access subscription details
if (customerInfo) {
  const proEntitlement = customerInfo.entitlements.active['Quotes Pro'];

  if (proEntitlement) {
    console.log('Subscription expires:', proEntitlement.expirationDate);
    console.log('Auto-renews:', proEntitlement.willRenew);
    console.log('Purchased:', proEntitlement.purchaseDate);
  }
}
```

---

## Displaying Paywall

### Pattern 1: Dedicated Screen (Recommended)

```typescript
// app/subscriptions.tsx
import { PaywallView } from '../components/subscriptions/PaywallView';

export default function SubscriptionsScreen() {
  const router = useRouter();
  const { isPro } = useRevenueCat();

  return (
    <SafeAreaView style={styles.container}>
      <Header onBack={() => router.back()} />

      {isPro && <ProBadge />}

      <PaywallView
        offering="default"
        onPurchaseComplete={() => {
          // Handle successful purchase
          alert('Welcome to Pro!');
        }}
        onDismiss={() => router.back()}
      />
    </SafeAreaView>
  );
}
```

### Pattern 2: Modal Paywall

```typescript
import { Modal } from 'react-native';
import { PaywallView } from '../components/subscriptions/PaywallView';

function PaywallModal({ visible, onDismiss }: {
  visible: boolean;
  onDismiss: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide">
      <PaywallView
        offering="default"
        onPurchaseComplete={onDismiss}
        onDismiss={onDismiss}
      />
    </Modal>
  );
}
```

### Pattern 3: BottomSheet Paywall

```typescript
import { BottomSheet } from '../components/layout/BottomSheet';
import { PaywallView } from '../components/subscriptions/PaywallView';

function HomeScreen() {
  const [showPaywall, setShowPaywall] = useState(false);

  return (
    <>
      <Button onPress={() => setShowPaywall(true)}>Upgrade</Button>

      <BottomSheet visible={showPaywall} onClose={() => setShowPaywall(false)}>
        <PaywallView
          offering="default"
          onPurchaseComplete={() => setShowPaywall(false)}
          onDismiss={() => setShowPaywall(false)}
        />
      </BottomSheet>
    </>
  );
}
```

---

## Handling Purchases

### Pattern 1: Using Hook (Simplest)

```typescript
import { useSubscriptions } from '../hooks/useSubscriptions';

function PurchaseButton() {
  const { purchase } = useSubscriptions();
  const [loading, setLoading] = useState(false);

  const handlePurchase = async (packageId: 'monthly' | 'yearly') => {
    setLoading(true);
    const result = await purchase(packageId, 'default');

    if (result.success) {
      console.log('✅ Purchase successful!', result.result);
      // Navigate to success screen or update UI
    } else {
      console.error('❌ Purchase failed:', result.error);
      alert(`Purchase failed: ${result.error}`);
    }

    setLoading(false);
  };

  return (
    <View style={{ gap: 12 }}>
      <Button
        title="Buy Monthly ($4.99/mo)"
        onPress={() => handlePurchase('monthly')}
        disabled={loading}
      />
      <Button
        title="Buy Yearly ($49.99/yr)"
        onPress={() => handlePurchase('yearly')}
        disabled={loading}
      />
    </View>
  );
}
```

### Pattern 2: With Error Handling

```typescript
import { parseSubscriptionError } from '../lib/subscription-errors';
import { useSubscriptions } from '../hooks/useSubscriptions';

function PurchaseWithErrorHandling() {
  const { purchase } = useSubscriptions();
  const [error, setError] = useState<string | null>(null);

  const handlePurchase = async (packageId: string) => {
    setError(null);

    try {
      const result = await purchase(packageId);

      if (!result.success) {
        const parsedError = parseSubscriptionError(new Error(result.error));
        setError(parsedError.message);
        console.warn('Purchase error:', parsedError.suggestedAction);
      } else {
        // Success
        console.log('✅ Purchase complete');
      }
    } catch (err) {
      const parsedError = parseSubscriptionError(err);
      setError(parsedError.message);
    }
  };

  return (
    <>
      <Button onPress={() => handlePurchase('monthly')}>Buy Monthly</Button>
      {error && <ErrorMessage message={error} />}
    </>
  );
}
```

### Pattern 3: With Retry Logic

```typescript
import {
  parseSubscriptionError,
  getRetryStrategy,
} from '../lib/subscription-errors';

async function purchaseWithRetry(packageId: string): Promise<boolean> {
  let attempts = 0;
  const maxRetries = 3;

  while (attempts < maxRetries) {
    try {
      const result = await purchase(packageId);
      if (result.success) return true;

      const error = parseSubscriptionError(new Error(result.error));
      const strategy = getRetryStrategy(error.type);

      if (!strategy.shouldRetry || attempts >= strategy.maxAttempts) {
        throw error;
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, strategy.delayMs));
      attempts++;
    } catch (err) {
      attempts++;
      if (attempts >= maxRetries) throw err;
    }
  }

  return false;
}
```

---

## Restoring Purchases

### Pattern 1: Simple Restore

```typescript
import { useSubscriptions } from '../hooks/useSubscriptions';

function RestorePurchasesButton() {
  const { restore } = useSubscriptions();
  const [loading, setLoading] = useState(false);

  const handleRestore = async () => {
    setLoading(true);

    const result = await restore();

    if (result.success) {
      alert('✅ Purchases restored!');
    } else {
      alert(`Failed to restore: ${result.error}`);
    }

    setLoading(false);
  };

  return (
    <Button
      title="Restore Purchases"
      onPress={handleRestore}
      disabled={loading}
    />
  );
}
```

### Pattern 2: Restore in Customer Center

```typescript
// components/subscriptions/CustomerCenterModal.tsx
function handleRestorePurchases() {
  const result = await RevenueChat.restorePurchases();
  setSuccessMessage('✅ Purchases restored successfully');
}
```

---

## Error Handling

### Complete Error Handling Example

```typescript
import {
  parseSubscriptionError,
  formatErrorForUI,
  logSubscriptionError,
  getRetryStrategy,
} from '../lib/subscription-errors';

async function purchaseWithFullErrorHandling(packageId: string) {
  try {
    setLoading(true);
    const result = await purchase(packageId, 'default');

    if (!result.success) {
      // Parse the error
      const error = parseSubscriptionError(new Error(result.error));
      logSubscriptionError(error, { packageId });

      // Format for UI display
      const { title, message, actionText } = formatErrorForUI(error);

      // Show error modal
      showErrorModal({
        title,
        message,
        actionText,
        onAction: () => {
          // Handle action based on error type
          if (getRetryStrategy(error.type).shouldRetry) {
            purchaseWithFullErrorHandling(packageId);
          } else {
            closePaywall();
          }
        },
      });
    }
  } catch (err) {
    const error = parseSubscriptionError(err);
    logSubscriptionError(error);
    // ... show error UI
  } finally {
    setLoading(false);
  }
}
```

### Error Alert Component

```typescript
function SubscriptionError({
  type,
  message,
  onRetry,
  onDismiss,
}: {
  type: string;
  message: string;
  onRetry?: () => void;
  onDismiss: () => void;
}) {
  const theme = useTheme();

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.dialog, { backgroundColor: theme.background }]}>
          <MaterialCommunityIcons
            name="alert-circle"
            size={48}
            color={theme.accent}
          />
          <Text style={[styles.title, { color: theme.text }]}>
            {type === 'PAYMENT_FAILED' ? 'Payment Failed' : 'Something Went Wrong'}
          </Text>
          <Text style={[styles.message, { color: theme.secondaryText }]}>
            {message}
          </Text>

          <View style={styles.actions}>
            <Button title="Dismiss" onPress={onDismiss} />
            {onRetry && <Button title="Retry" onPress={onRetry} />}
          </View>
        </View>
      </View>
    </Modal>
  );
}
```

---

## Customer Management

### Pattern 1: Access Subscription Details

```typescript
import { useRevenueCat } from '../hooks/useRevenueCat';

function SubscriptionStatus() {
  const { customerInfo } = useRevenueCat();

  if (!customerInfo) return null;

  const proEntitlement = customerInfo.entitlements.active['Quotes Pro'];

  if (!proEntitlement) {
    return <Text>You don't have an active subscription</Text>;
  }

  const expiryDate = new Date(proEntitlement.expirationDate!);
  const daysLeft = Math.ceil(
    (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <View>
      <Text>✅ Pro member</Text>
      <Text>Expires in {daysLeft} days</Text>
      <Text>Auto-renews: {proEntitlement.willRenew ? 'Yes' : 'No'}</Text>
    </View>
  );
}
```

### Pattern 2: Custom User ID

```typescript
import * as RevenueChat from '../lib/revenuecat';

// After user logs in
async function onUserLogin(userId: string) {
  try {
    await RevenueChat.setAppUserID(userId);
    console.log('✅ User linked to RevenueCat');
  } catch (error) {
    console.error('Failed to link user:', error);
  }
}

// On logout
async function onUserLogout() {
  try {
    await RevenueChat.logout();
    console.log('✅ User logged out from RevenueCat');
  } catch (error) {
    console.error('Failed to logout:', error);
  }
}
```

### Pattern 3: Show Customer Center

```typescript
import { CustomerCenterModal } from '../components/subscriptions/CustomerCenterModal';

function ProfileScreen() {
  const [showCustomerCenter, setShowCustomerCenter] = useState(false);

  return (
    <>
      <Button
        title="Manage Subscription"
        onPress={() => setShowCustomerCenter(true)}
      />

      {showCustomerCenter && (
        <CustomerCenterModal
          onClose={() => setShowCustomerCenter(false)}
        />
      )}
    </>
  );
}
```

---

## Advanced Patterns

### Pattern 1: Conditional Feature Access

```typescript
function PremiumFeature() {
  const { isPro, isLoading } = useRevenueCat();
  const { push } = useRouter();

  if (isLoading) {
    return <Skeleton />;
  }

  if (!isPro) {
    return (
      <LockedFeature
        title="Unlock Premium Quotes"
        onUnlock={() => push('/subscriptions')}
      />
    );
  }

  return <FeatureContent />;
}
```

### Pattern 2: Observing Subscription Changes

```typescript
import { useEffect, useState } from 'react';
import Purchases from 'react-native-purchases';

function useSubscriptionListener(onChanged?: (info: CustomerInfo) => void) {
  useEffect(() => {
    const listener = Purchases.onCustomerInfoUpdated((info) => {
      console.log('Subscription updated:', info);
      onChanged?.(info);
    });

    return () => listener.remove();
  }, [onChanged]);
}

// Usage
function MyComponent() {
  useSubscriptionListener((info) => {
    if (info.entitlements.active['Quotes Pro']) {
      alert('Welcome to Pro!');
    }
  });

  return <Text>Listening for changes...</Text>;
}
```

### Pattern 3: A/B Testing Different Paywalls

```typescript
async function getRandomOffering() {
  const offerings = await Purchases.getOfferings();

  // Randomly show different offerings to users
  const offering = Math.random() > 0.5 ? 'default' : 'experimental';

  return offerings.all[offering];
}

function PaywallScreen() {
  const [offering, setOffering] = useState('default');

  useEffect(() => {
    getRandomOffering().then((off) => setOffering(off?.identifier || 'default'));
  }, []);

  return <PaywallView offering={offering} />;
}
```

### Pattern 4: Free Trial Indicator

```typescript
function PriceDisplay() {
  const { customerInfo } = useRevenueCat();
  const [packages, setPackages] = useState<Package[]>([]);

  useEffect(() => {
    Purchases.getOfferings().then((offerings) => {
      const pkgs = offerings.current?.availablePackages || [];
      setPackages(pkgs);
    });
  }, []);

  return (
    <View>
      {packages.map((pkg) => (
        <View key={pkg.identifier}>
          <Text>{pkg.product.title}</Text>
          <Text>{pkg.product.priceString}</Text>

          {pkg.introPrice && (
            <Text>
              Free trial: {pkg.introPrice.billingPeriod}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}
```

---

## Testing Checklist

- [ ] Install packages: `npm install --save react-native-purchases react-native-purchases-ui`
- [ ] Configure API key in `lib/revenuecat.ts`
- [ ] Create offerings in RevenueCat dashboard
- [ ] Set up products in App Store Connect and Google Play Console
- [ ] Test on physical iOS device (requires sandbox account)
- [ ] Test on physical Android device (requires Google Play test account)
- [ ] Test purchase flow
- [ ] Test restore purchases
- [ ] Test error handling
- [ ] Test entitlement checking
- [ ] Verify Customer Center loads
- [ ] Switch to production API key before release

---

## Common Issues & Solutions

### Issue: PaywallView shows loading forever
```typescript
// Enable debug logging
import Purchases from 'react-native-purchases';
Purchases.setLogLevel(Purchases.LOG_LEVEL.VERBOSE);
```

### Issue: Purchase silently fails
```typescript
// Always check result.success
const result = await purchase('monthly');
console.log('Success:', result.success);
console.log('Error:', result.error);
```

### Issue: Entitlement not recognized
```typescript
// Verify exact identifier match
const ENTITLEMENT_PRO = 'Quotes Pro'; // Must match dashboard
const hasAccess = customerInfo.entitlements.active[ENTITLEMENT_PRO];
```

---

## Related Files

- `lib/revenuecat.ts` — Core SDK functions
- `lib/subscription-errors.ts` — Error handling
- `hooks/useRevenueCat.ts` — State management hook
- `hooks/useSubscriptions.ts` — Convenience functions
- `components/subscriptions/PaywallView.tsx` — Paywall display
- `components/subscriptions/CustomerCenterModal.tsx` — Account UI
- `app/subscriptions.tsx` — Subscriptions screen
