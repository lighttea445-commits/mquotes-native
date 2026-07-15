# RevenueCat Integration Guide

Complete setup guide for RevenueCat subscriptions in mquotes-native.

## 📋 Table of Contents
1. [SDK Installation](#sdk-installation)
2. [API Key Configuration](#api-key-configuration)
3. [Dashboard Setup](#dashboard-setup)
4. [Product Configuration](#product-configuration)
5. [Offering Setup](#offering-setup)
6. [Implementation](#implementation)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## SDK Installation

✅ **Already completed:**
```bash
npm install --save react-native-purchases react-native-purchases-ui
```

---

## API Key Configuration

Your test API key is configured in `lib/revenuecat.ts`:
```typescript
const REVENUECAT_API_KEY = 'test_vMJWzIBFIQvlbwxFbmgSFfPUrKu';
```

### For Production:
1. Go to [RevenueCat Dashboard](https://app.revenuecat.com)
2. Navigate to **Projects** → Your Project → **Settings** → **API Keys**
3. Copy your **Production** API key
4. Replace `test_*` with production key before app release

---

## Dashboard Setup

### Step 1: Create Your Project
1. Visit [RevenueCat Dashboard](https://app.revenuecat.com)
2. Click **Create a New Project**
3. Name it: `Quotes App` or similar
4. Select your platforms: **iOS** and **Android**

### Step 2: Configure App Stores
#### iOS Setup:
1. Go to **Project Settings** → **iOS** → **App Store**
2. Upload your **Shared Secret** from App Store Connect
3. Set the **Bundle ID** (e.g., `com.example.mquotes`)

#### Android Setup:
1. Go to **Project Settings** → **Android** → **Google Play**
2. Provide your **Service Account JSON** from Google Cloud Console
3. Set the **Package Name** (e.g., `com.example.mquotes`)

---

## Product Configuration

### Products Required:
- **Monthly Subscription**: `monthly`
- **Yearly Subscription**: `yearly`

### Create Products in App Stores:

#### iOS App Store Connect:
1. Log in to [App Store Connect](https://appstoreconnect.apple.com)
2. **App** → Your App → **Subscriptions**
3. Create Subscription Group: `quotes_pro` (type: auto-renewable)
4. Add products:
   - **Product ID**: `com.example.mquotes.monthly` | **Price**: $4.99/month
   - **Product ID**: `com.example.mquotes.yearly` | **Price**: $49.99/year

#### Google Play Console:
1. Log in to [Google Play Console](https://play.google.com/console)
2. **Subscriptions** → **Create Subscription**
3. Add products:
   - **Product ID**: `com.example.mquotes.monthly` | **Price**: $4.99/month
   - **Product ID**: `com.example.mquotes.yearly` | **Price**: $49.99/year

---

## Offering Setup

### Create Offering in RevenueCat Dashboard:

1. **Dashboard** → **Offerings**
2. Click **Create Offering**
3. Configure:
   - **Name**: `default`
   - **Description**: Primary offering for all users
   - **Identifier**: `default` (used in code)

### Add Packages:
1. Select your offering
2. Click **Add Package**
3. Create two packages:

#### Package 1: Monthly
- **Name**: `Monthly`
- **Package Identifier**: `monthly`
- **Billing Period**: Monthly
- **Price**: Variable (auto-sync from App Store)
- **Product**: Link to your iOS monthly product

#### Package 2: Yearly
- **Name**: `Yearly`
- **Package Identifier**: `yearly`
- **Billing Period**: Yearly
- **Price**: Variable (auto-sync from App Store)
- **Product**: Link to your iOS yearly product

---

## Entitlements Setup

### Create "Quotes Pro" Entitlement:

1. **Dashboard** → **Entitlements**
2. Click **Create Entitlement**
3. Configure:
   - **Name**: `Quotes Pro`
   - **Identifier**: `Quotes Pro` (must match code)
   - **Description**: Access to all premium features

### Link to Packages:
1. Select each package (monthly, yearly)
2. Assign entitlement: `Quotes Pro`
3. Save

---

## Implementation

### 1. Initialize RevenueCat (Auto-loaded)
The app initializes RevenueCat on launch via `app/_layout.tsx`:
```typescript
useEffect(() => {
  initializeRevenueCat().catch((err) =>
    console.warn('RevenueCat initialization failed:', err)
  );
  // ... rest of initialization
}, []);
```

### 2. Check Entitlements
```typescript
import { useRevenueCat } from '../hooks/useRevenueCat';

function MyComponent() {
  const { isPro, isLoading } = useRevenueCat();

  if (isLoading) return <Spinner />;

  return (
    <Text>{isPro ? '👑 Pro Member' : '⬆️ Upgrade'}</Text>
  );
}
```

### 3. Show Paywall
```typescript
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <TouchableOpacity onPress={() => router.push('/subscriptions')}>
      <Text>Upgrade to Pro</Text>
    </TouchableOpacity>
  );
}
```

### 4. Handle Purchases
```typescript
import { useSubscriptions } from '../hooks/useSubscriptions';

function PaywallScreen() {
  const { purchase } = useSubscriptions();

  const handlePurchase = async () => {
    const result = await purchase('monthly', 'default');
    if (result.success) {
      alert('Purchase successful!');
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  return <Button onPress={handlePurchase}>Buy Monthly</Button>;
}
```

### 5. Restore Purchases
```typescript
import { useSubscriptions } from '../hooks/useSubscriptions';

function CustomerCenterModal() {
  const { restore } = useSubscriptions();

  const handleRestore = async () => {
    const result = await restore();
    if (result.success) {
      alert('Purchases restored!');
    }
  };

  return <Button onPress={handleRestore}>Restore Purchases</Button>;
}
```

---

## Testing

### Test Environment Setup:

1. **Use Test API Key** (already configured):
   - `test_vMJWzIBFIQvlbwxFbmgSFfPUrKu`
   - Allows free test purchases

2. **Test Entitlements**:
   - Grant yourself test entitlements in Dashboard:
   - **Settings** → **Project Credentials** → **Grant Entitlements** (for your user)

3. **Test on Physical Device**:
   ```bash
   npm start
   # Scan QR with Expo Go on iOS/Android device
   ```

### Test Purchase Flow:
1. Open app on test device
2. Navigate to **Profile** → **Quotes Pro**
3. Tap **Upgrade to Pro**
4. Complete purchase (free in test mode)
5. Verify entitlement granted
6. Check **Account & Billing** → **Manage Subscription**

### iOS Test Users:
- Create test users in App Store Connect
- Use sandbox users for free testing
- No real payment method required

### Android Test Users:
- Use license testing in Google Play Console
- Or use a real test Google Play account

---

## Troubleshooting

### Issue: Paywall shows blank/loading forever

**Causes:**
- API key not initialized
- Offerings not created in dashboard
- Network connectivity issue

**Solutions:**
```typescript
// 1. Check console for errors
console.log(state.error); // from useRevenueCat

// 2. Verify API key in lib/revenuecat.ts
const REVENUECAT_API_KEY = 'test_vMJWzIBFIQvlbwxFbmgSFfPUrKu';

// 3. Ensure offerings exist in dashboard
// Dashboard → Offerings (should see "default")

// 4. Check network logs
// Network tab in Expo DevTools
```

### Issue: "Entitlement not found" errors

**Solution:**
1. Go to **Dashboard** → **Entitlements**
2. Verify `Quotes Pro` exists
3. Verify it's linked to your packages
4. Make sure identifier matches code: `ENTITLEMENT_PRO = 'Quotes Pro'`

### Issue: Purchases fail with "Invalid Package"

**Causes:**
- Product IDs don't match between dashboard and app stores
- Package identifier mismatch

**Solutions:**
1. Verify package IDs in offering:
   - `monthly` and `yearly` must match
2. Check App Store products are linked correctly
3. In Dashboard → Offerings → [Offering] → [Package] → verify "Product" field

### Issue: "Already Subscribed" error

**Cause:** User tries to purchase while already having an active subscription

**Solution:**
- Check customer info before showing paywall:
```typescript
const { isPro, customerInfo } = useRevenueCat();

if (isPro) {
  // Show "Manage Subscription" instead of purchase screen
}
```

### Issue: Restore Purchases not working

**Cause:**
- User not properly identified
- No purchases to restore

**Solution:**
1. Ensure RevenueCat is fully initialized
2. Wait for `isInitialized === true`
3. Test with a real purchase (use test App Store account)

### Debugging with Logs:

Enable verbose logging:
```typescript
import Purchases from 'react-native-purchases';

// In initializeRevenueCat()
Purchases.setLogLevel(Purchases.LOG_LEVEL.VERBOSE);
```

---

## Best Practices

### ✅ Do:
- Always check `isPro` before showing premium features
- Call `refresh()` after purchase to sync state
- Handle network errors gracefully
- Show loading states during async operations
- Test on real devices with real App Store/Play Store accounts

### ❌ Don't:
- Hardcode product IDs in multiple places (use offering system)
- Forget to handle the user-cancelled error
- Ignore network connectivity
- Make purchases without user confirmation
- Test with expired/invalid test users

---

## Additional Resources

- [RevenueCat Docs](https://www.revenuecat.com/docs/overview)
- [React Native SDK Reference](https://www.revenuecat.com/docs/sdks/react-native)
- [Paywall Documentation](https://www.revenuecat.com/docs/tools/paywalls)
- [Customer Center](https://www.revenuecat.com/docs/tools/customer-center)
- [Testing Guide](https://www.revenuecat.com/docs/testing)

---

## Quick Reference: Files Created

- `lib/revenuecat.ts` — SDK initialization & API functions
- `lib/subscription-errors.ts` — Error handling utilities
- `hooks/useRevenueCat.ts` — Main subscription state hook
- `hooks/useSubscriptions.ts` — Subscription helper functions
- `components/subscriptions/PaywallView.tsx` — Paywall display component
- `components/subscriptions/CustomerCenterModal.tsx` — Account management UI
- `app/subscriptions.tsx` — Subscriptions screen (route)

---

## Support

For issues or questions:
- Check RevenueCat Dashboard status
- Enable debug logging
- Test on physical device (not simulator)
- Contact RevenueCat support: support@revenuecat.com
