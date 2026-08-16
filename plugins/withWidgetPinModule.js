/**
 * Expo config plugin — copies the hand-written WidgetPin native module
 * (native/android/WidgetPin/*) into the generated Android project and adds its
 * package to MainApplication's list.
 *
 * The module lives in the app project rather than a linkable library, so
 * autolinking never sees it and it has to be registered by hand. Without this,
 * NativeModules.WidgetPin is undefined, WidgetBridge.canPinWidget is false, and
 * every "Add widget" call falls back to manual instructions.
 */
const { withDangerousMod, withMainApplication } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '..', 'native', 'android', 'WidgetPin');
const FILES = ['WidgetPinModule.kt', 'WidgetPinPackage.kt'];

/** Where PackageList's builder opens, i.e. the point new packages are added after. */
const PACKAGE_LIST_ANCHOR = /PackageList\(this\)\.packages\s*\.?\s*apply\s*\{/;

module.exports = function withWidgetPinModule(config) {
  const appPackage = config.android?.package;
  if (!appPackage) {
    throw new Error('withWidgetPinModule: expo.android.package must be set in app.json');
  }

  config = withDangerousMod(config, [
    'android',
    (mod) => {
      const destDir = path.join(
        mod.modRequest.platformProjectRoot,
        'app/src/main/java',
        ...appPackage.split('.'),
        'widgetpin',
      );
      fs.mkdirSync(destDir, { recursive: true });

      for (const file of FILES) {
        const source = fs.readFileSync(path.join(SOURCE_DIR, file), 'utf8');
        fs.writeFileSync(path.join(destDir, file), source.split('__PACKAGE__').join(appPackage));
      }

      return mod;
    },
  ]);

  return withMainApplication(config, (mod) => {
    if (mod.modResults.language !== 'kt') {
      throw new Error('withWidgetPinModule: expected a Kotlin MainApplication');
    }

    let contents = mod.modResults.contents;
    const packageClass = `${appPackage}.widgetpin.WidgetPinPackage`;

    // Idempotent: prebuild runs this against an existing project too.
    if (contents.includes(packageClass) || contents.includes('WidgetPinPackage()')) {
      return mod;
    }

    const anchor = PACKAGE_LIST_ANCHOR.exec(contents);
    if (!anchor) {
      throw new Error(
        'withWidgetPinModule: could not find PackageList(this).packages.apply { } in MainApplication.kt',
      );
    }

    const insertAt = anchor.index + anchor[0].length;
    contents =
      contents.slice(0, insertAt) +
      `\n              add(${packageClass}())` +
      contents.slice(insertAt);

    mod.modResults.contents = contents;
    return mod;
  });
};
