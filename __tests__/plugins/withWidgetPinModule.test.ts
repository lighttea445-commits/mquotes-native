/**
 * The WidgetPin module lives in the app project rather than a linkable library,
 * so autolinking never sees it and this plugin is the only thing that registers
 * it. If the MainApplication edit silently stops matching, the failure is
 * invisible until runtime: NativeModules.WidgetPin is undefined, canPinWidget
 * reads false, and every "Add widget" press falls back to manual instructions
 * instead of raising the launcher's dialog.
 */

const withWidgetPinModule = require('../../plugins/withWidgetPinModule');

/** The getPackages() body the Expo bare template generates. */
const MAIN_APPLICATION = `package com.kovoapps.quotable

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactPackage

class MainApplication : Application(), ReactApplication {
  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here, for example:
              // add(MyReactNativePackage())
            }
      }
}
`;

/**
 * Runs the plugin's MainApplication mod without a real prebuild. The dangerous
 * mod (which copies the Kotlin sources) is not exercised — it only writes
 * files, and the interesting failure mode is the source edit below.
 */
async function runMainApplicationMod(
  contents: string,
  { androidPackage = 'com.kovoapps.quotable', language = 'kt' } = {},
): Promise<string> {
  const config = withWidgetPinModule({ android: { package: androidPackage } });

  const result = await config.mods.android.mainApplication({
    ...config,
    modResults: { language, contents, path: `MainApplication.${language}` },
    modRequest: { platformProjectRoot: '/tmp/android', projectRoot: '/tmp' },
  });

  return result.modResults.contents;
}

describe('withWidgetPinModule', () => {
  it('adds the package inside the template getPackages() body', async () => {
    const result = await runMainApplicationMod(MAIN_APPLICATION);

    expect(result).toContain('add(com.kovoapps.quotable.widgetpin.WidgetPinPackage())');
    // Inside apply { }, not appended after the block.
    expect(result.indexOf('WidgetPinPackage()')).toBeGreaterThan(result.indexOf('.packages.apply {'));
    expect(result.indexOf('WidgetPinPackage()')).toBeLessThan(result.indexOf('// Packages that cannot'));
  });

  it('uses the configured android package', async () => {
    const result = await runMainApplicationMod(
      MAIN_APPLICATION.split('com.kovoapps.quotable').join('com.example.other'),
      { androidPackage: 'com.example.other' },
    );

    expect(result).toContain('add(com.example.other.widgetpin.WidgetPinPackage())');
  });

  it('is idempotent, since prebuild reruns against an existing project', async () => {
    const once = await runMainApplicationMod(MAIN_APPLICATION);
    const twice = await runMainApplicationMod(once);

    expect(twice).toBe(once);
    expect(twice.match(/WidgetPinPackage\(\)/g)).toHaveLength(1);
  });

  it('throws rather than silently skipping when the anchor is gone', async () => {
    await expect(runMainApplicationMod('class MainApplication : Application()')).rejects.toThrow(
      /PackageList/,
    );
  });

  it('throws on a Java MainApplication, which this edit does not handle', async () => {
    await expect(
      runMainApplicationMod(MAIN_APPLICATION, { language: 'java' }),
    ).rejects.toThrow(/Kotlin/);
  });

  it('refuses a config with no android package', () => {
    expect(() => withWidgetPinModule({})).toThrow(/android\.package/);
  });
});
