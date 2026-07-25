import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';

// Paste the DSN from Sentry → Settings → Projects → (your project) → Client Keys (DSN).
const SENTRY_DSN = 'REPLACE_WITH_SENTRY_DSN';

// Initialise crash reporting first so startup crashes are captured. An unset or
// invalid DSN makes the SDK a no-op rather than throwing.
Sentry.init({
  dsn: SENTRY_DSN,
  // Surfaces the JS frames for native crashes that originate in the JS thread —
  // this is what makes an otherwise unsymbolicated Hermes crash readable.
  enableNative: true,
  tracesSampleRate: 0,
});

// Register the widget background task handler before the app initialises.
// Must run at module-load time so Android can find it during headless wakes.
//
// Android-only: react-native-android-widget ships no iOS native module, so on
// iOS this import only pulls a large dead dependency graph (React, AsyncStorage,
// QuoteWidget, quotesApi, two Zustand stores) into the first JS ever evaluated.
//
// require() rather than import so the ordering above is preserved — ES imports
// hoist above everything else in this file.
if (Platform.OS === 'android') {
  require('./widget/widgetTaskHandler');
}

require('expo-router/entry');
