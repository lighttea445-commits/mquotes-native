# RevenueCat Quick Start — mquotes-native

## ✅ Installation Complete

All SDK packages installed and integrated. You're ready to test!

---

## 🚀 Next Steps (in order)

### 1. Configure RevenueCat Dashboard
1. Go to [RevenueCat Dashboard](https://app.revenuecat.com)
2. Create project: `Quotes App`
3. Navigate to **Offerings** → **Create Offering**
4. Name: `default` | Identifier: `default`
5. Add 2 packages:
   - **Name**: Monthly | **ID**: `monthly`
   - **Name**: Yearly | **ID**: `yearly`
6. Create entitlement: **Name**: `Quotes Pro` | **ID**: `Quotes Pro`
7. Link packages to entitlement

### 2. Configure App Store Products
#### iOS (App Store Connect):
- Product IDs:
  - `com.example.mquotes.monthly` → $4.99/month
  - `com.example.mquotes.yearly` → $49.99/year
- Type: Auto-renewable subscription
- Group: `quotes_pro`

#### Android (Google Play Console):
- Same product IDs as iOS
- Subscription prices in local currency

### 3. Test on Device
```bash
npm start
# Scan QR with Expo Go (iOS or Android device)
```

1. Open app → **Profile** → **Quotes Pro**
2. Tap **Upgrade** button
3. Complete test purchase (free in sandbox)
4. Verify success and entitlement granted
5. Check **Account & Billing** tab to see subscription

---

## 📁 Files Created

```
lib/
├── revenuecat.ts              # Core SDK functions
└── subscription-errors.ts     # Error handling & retry logic

hooks/
├── useRevenueCat.ts           # Main subscription state hook
└── useSubscriptions.ts        # Helper methods

components/subscriptions/
├── PaywallView.tsx            # Paywall display component
└── CustomerCenterModal.tsx    # Account management UI

app/
└── subscriptions.tsx          # Full subscription screen

docs/
├── REVENUECAT_SETUP.md        # Complete setup guide
└── REVENUECAT_EXAMPLES.md     # 50+ code examples
```

---

## 💻 Usage Examples

### Check if User is Pro
```typescript
import { useRevenueCat } from '../hooks/useRevenueCat';

function MyComponent() {
  const { isPro, isLoading } = useRevenueCat();

  if (isLoading) return <Spinner />;

  return <Text>{isPro ? '👑 Pro' : '⬆️ Upgrade'}</Text>;
}
```

### Open Subscription Screen
```typescript
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <Button onPress={() => router.push('/subscriptions')}>
      Quotes Pro
    </Button>
  );
}
```

### Handle Purchase
```typescript
import { useSubscriptions } from '../hooks/useSubscriptions';

const { purchase } = useSubscriptions();

const result = await purchase('monthly', 'default');
if (result.success) {
  alert('Welcome to Pro!');
} else {
  alert(`Error: ${result.error}`);
}
```

---

## 🔍 Key Files to Know

| File | Purpose |
|------|---------|
| `lib/revenuecat.ts` | SDK initialization & core API |
| `hooks/useRevenueCat.ts` | Main hook for subscription state |
| `app/subscriptions.tsx` | Full subscription management screen |
| `components/subscriptions/PaywallView.tsx` | Displays RevenueCat paywall UI |
| `components/subscriptions/CustomerCenterModal.tsx` | Account management & restore purchases |

---

## 🐛 Debugging

### Enable Verbose Logging
```typescript
import Purchases from 'react-native-purchases';

Purchases.setLogLevel(Purchases.LOG_LEVEL.VERBOSE);
```

### Check Entitlements
```typescript
import { useRevenueCat } from '../hooks/useRevenueCat';

const { customerInfo } = useRevenueCat();
console.log('Active entitlements:', customerInfo?.entitlements.active);
```

### Verify API Key
```typescript
// lib/revenuecat.ts
const REVENUECAT_API_KEY = 'test_vMJWzIBFIQvlbwxFbmgSFfPUrKu';
```

---

## 📚 Documentation

For complete guides, see:
- **Setup**: `docs/REVENUECAT_SETUP.md` — Dashboard & product configuration
- **Examples**: `docs/REVENUECAT_EXAMPLES.md` — 50+ production code examples
- **This file**: `REVENUECAT_QUICK_START.md` — Quick reference

---

## ✨ Features Implemented

- ✅ SDK installation & initialization
- ✅ Entitlement checking (`isPro`)
- ✅ Customer info management
- ✅ RevenueCat Paywall UI integration
- ✅ RevenueCat Customer Center (account & restore purchases)
- ✅ Purchase flow with error handling
- ✅ Retry logic for network failures
- ✅ Error formatting for UI display
- ✅ Integration into profile screen
- ✅ Dedicated subscriptions management screen
- ✅ Real-time entitlement updates via listeners

---

## 🎯 Before Release

**Before shipping to production:**

1. [ ] Test on real iOS device (not simulator)
2. [ ] Test on real Android device (not emulator)
3. [ ] Test with test App Store account
4. [ ] Test with test Google Play account
5. [ ] Verify all error scenarios
6. [ ] Replace test API key with production:
   ```typescript
   const REVENUECAT_API_KEY = 'YOUR_PRODUCTION_KEY_HERE';
   ```
7. [ ] Set up analytics (optional: uncomment in `subscription-errors.ts`)

---

## 🆘 Support

- RevenueCat Docs: https://www.revenuecat.com/docs
- React Native SDK: https://www.revenuecat.com/docs/sdks/react-native
- Troubleshooting: See "Troubleshooting" section in `docs/REVENUECAT_SETUP.md`

---

**Ready to test?** Run `npm start` and open the app on a physical device! 🚀
