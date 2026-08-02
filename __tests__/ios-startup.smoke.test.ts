/**
 * iOS startup smoke test.
 *
 * Evaluates every route module the way the production bundle does on iOS
 * (Platform.OS === 'ios', .ios.js resolution) and reports:
 *   • modules that throw while being evaluated
 *   • modules whose default export is missing/undefined
 *
 * A route whose module evaluation throws is exactly the failure that shows up
 * on device as a black screen — expo-router's fromImport() destructures the
 * module and blows up before anything renders.
 *
 * Run with:  npx jest --preset jest-expo/ios __tests__/ios-startup.smoke.test.ts
 */

const ROUTES = [
  ['app/_layout', () => require('../app/_layout')],
  ['app/index', () => require('../app/index')],
  ['app/+not-found', () => require('../app/+not-found')],
  ['app/onboarding/index', () => require('../app/onboarding/index')],
  ['app/categories', () => require('../app/categories')],
  ['app/favorites', () => require('../app/favorites')],
  ['app/history', () => require('../app/history')],
  ['app/mix/create', () => require('../app/mix/create')],
  ['app/mood', () => require('../app/mood')],
  ['app/my-quotes', () => require('../app/my-quotes')],
  ['app/notifications', () => require('../app/notifications')],
  ['app/profile', () => require('../app/profile')],
  ['app/settings', () => require('../app/settings')],
  ['app/share', () => require('../app/share')],
  ['app/subscriptions', () => require('../app/subscriptions')],
  ['app/themes', () => require('../app/themes')],
  ['app/widget-open', () => require('../app/widget-open')],
  ['app/widgets', () => require('../app/widgets')],
] as const;

describe('iOS route module evaluation', () => {
  it('reports Platform.OS', () => {
    const { Platform } = require('react-native');
    expect(Platform.OS).toBe('ios');
  });

  for (const [name, load] of ROUTES) {
    it(`${name} evaluates and exports a default`, () => {
      let mod: any;
      try {
        mod = load();
      } catch (err: any) {
        throw new Error(
          `MODULE EVALUATION THREW for ${name}:\n${err?.message}\n${err?.stack}`,
        );
      }
      expect(mod).toBeDefined();
      expect(mod.default).toBeDefined();
    });
  }
});
