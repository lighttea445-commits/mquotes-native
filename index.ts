import { Platform } from 'react-native';

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
