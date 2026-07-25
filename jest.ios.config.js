/**
 * iOS startup smoke-test config.
 *
 * Evaluates the route modules under iOS platform resolution (Platform.OS ===
 * 'ios', .ios.js files win) so an iOS-only module-load failure shows up here
 * instead of as a black screen on device. Run with: npm run test:ios-startup
 */
module.exports = {
  preset: 'jest-expo/ios',
  rootDir: __dirname,
  testMatch: ['<rootDir>/__tests__/ios-startup.smoke.test.ts'],
  setupFiles: ['<rootDir>/jest.ios.setup.js'],
  // npm leaves several of expo's own deps (expo-asset, expo-file-system,
  // @expo/vector-icons) nested under expo/node_modules rather than hoisted.
  // Metro resolves them; jest's resolver does not. Widen the search path.
  modulePaths: ['<rootDir>/node_modules/expo/node_modules', '<rootDir>/node_modules'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|native-base|react-native-svg|react-native-reanimated|react-native-worklets|react-native-gesture-handler|react-native-purchases.*|@revenuecat/.*|zustand)',
  ],
};
