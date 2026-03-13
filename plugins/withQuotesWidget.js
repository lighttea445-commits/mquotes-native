/**
 * Expo config plugin — Quotes Widget
 *
 * Runs during `expo prebuild` (and EAS Build) to:
 *   1. Register ONE AppWidget receiver (BasicWidget) + WidgetConfigActivity in AndroidManifest.xml
 *   2. Copy Kotlin widget source files from widget-src/ into the generated Android project
 *   3. Write XML resource files inline (layout, drawables, widget provider info)
 *   4. Register WidgetBridgeModule in MainApplication.kt
 *
 * IMPORTANT: Source files live in widget-src/ (not android/) so that
 * `expo prebuild --clean` cannot delete them.
 */

const { withAndroidManifest, withDangerousMod, withGradleProperties } = require('@expo/config-plugins');
const fs   = require('fs');
const path = require('path');

// ── 1. AndroidManifest — three receivers + config activity ───────────────────

function withWidgetManifest(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application[0];
    if (!application.receiver) application.receiver = [];
    if (!application.activity) application.activity = [];

    const CONFIGURE_ACTIVITY = '.widget.WidgetConfigActivity';

    const widgetReceivers = [
      { name: '.widget.BasicWidget', infoXml: '@xml/basic_widget_info', label: 'Basic' },
    ];

    widgetReceivers.forEach(({ name, infoXml, label }) => {
      const alreadyAdded = application.receiver.some((r) => r.$?.['android:name'] === name);
      if (!alreadyAdded) {
        application.receiver.push({
          $: { 'android:name': name, 'android:exported': 'true', 'android:label': label },
          'intent-filter': [
            { action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }] },
          ],
          'meta-data': [
            { $: { 'android:name': 'android.appwidget.provider', 'android:resource': infoXml } },
          ],
        });
      }
    });

    // WidgetConfigActivity (transparent, no taskAffinity so it doesn't appear in recents)
    const alreadyAddedActivity = application.activity.some(
      (a) => a.$?.['android:name'] === CONFIGURE_ACTIVITY,
    );
    if (!alreadyAddedActivity) {
      application.activity.push({
        $: {
          'android:name':          CONFIGURE_ACTIVITY,
          'android:exported':      'true',
          'android:theme':         '@android:style/Theme.Translucent.NoTitleBar',
          'android:taskAffinity':  '',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_CONFIGURE' } }],
          },
        ],
      });
    }

    return config;
  });
}

// ── 2. Copy Kotlin files + write XML resources + patch MainApplication ────────

function withWidgetFiles(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidRoot = config.modRequest.platformProjectRoot;
      const pkg         = (config.android?.package ?? 'com.eriksen.quotable');
      const pkgPath     = pkg.replace(/\./g, '/');

      const write = (dest, content) => {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, content, 'utf8');
        console.log(`[withQuotesWidget] Written: ${path.basename(dest)}`);
      };

      const copy = (src, dest) => {
        if (!fs.existsSync(src)) {
          console.warn(`[withQuotesWidget] Source not found, skipping: ${src}`);
          return;
        }
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        // Rewrite the old placeholder package to the actual app package
        const content = fs.readFileSync(src, 'utf8')
          .replace(/com\.mquotes\.app/g, pkg);
        fs.writeFileSync(dest, content, 'utf8');
        console.log(`[withQuotesWidget] Copied: ${path.basename(dest)}`);
      };

      const kotlinDest = path.join(androidRoot, `app/src/main/java/${pkgPath}/widget`);
      const widgetSrc  = path.join(projectRoot, 'widget-src');

      // ── Kotlin sources ────────────────────────────────────────────────────
      const kotlinFiles = [
        'QuotesWidget.kt',
        'BasicWidget.kt',
        'WidgetConfigActivity.kt',
        'WidgetBridgeModule.kt',
      ];
      kotlinFiles.forEach((f) => copy(path.join(widgetSrc, f), path.join(kotlinDest, f)));

      // ── WidgetBridgePackage (ReactPackage wrapper) ────────────────────────
      write(
        path.join(kotlinDest, 'WidgetBridgePackage.kt'),
        `package ${pkg}.widget

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class WidgetBridgePackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> =
    listOf(WidgetBridgeModule(context))
  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()
}
`,
      );

      // ── XML resources ─────────────────────────────────────────────────────
      const resDest = path.join(androidRoot, 'app/src/main/res');

      // appwidget-provider XML — 4×1 banner default, fully resizable
      const widgetInfoXml = (previewLayout) => `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider
  xmlns:android="http://schemas.android.com/apk/res/android"
  android:minWidth="100dp"
  android:minHeight="50dp"
  android:minResizeWidth="100dp"
  android:minResizeHeight="50dp"
  android:targetCellWidth="4"
  android:targetCellHeight="1"
  android:maxResizeWidth="800dp"
  android:maxResizeHeight="800dp"
  android:updatePeriodMillis="1800000"
  android:initialLayout="@layout/quotes_widget"
  android:configure="${pkg}.widget.WidgetConfigActivity"
  android:widgetCategory="home_screen"
  android:widgetFeatures="reconfigurable"
  android:resizeMode="horizontal|vertical"
  android:previewLayout="@layout/${previewLayout}" />
`;

      write(path.join(resDest, 'xml/basic_widget_info.xml'), widgetInfoXml('widget_preview_basic'));

      // ── Banner layout helper (4×1) ────────────────────────────────────────
      // Shared structure for the runtime layout and the picker preview.
      // quoteText: string — sample/placeholder quote text
      const bannerLayout = (quoteText) => `<?xml version="1.0" encoding="utf-8"?>
<RelativeLayout
  xmlns:android="http://schemas.android.com/apk/res/android"
  android:id="@+id/widget_root"
  android:layout_width="match_parent"
  android:layout_height="match_parent"
  android:background="@drawable/widget_background"
  android:paddingStart="14dp"
  android:paddingEnd="14dp"
  android:paddingTop="8dp"
  android:paddingBottom="8dp">

  <!-- Hidden: quote mark (kept for RemoteViews ID compatibility) -->
  <TextView
    android:id="@+id/widget_quote_mark"
    android:layout_width="0dp"
    android:layout_height="0dp"
    android:visibility="gone" />

  <!-- Hidden: author (kept for ID compatibility) -->
  <TextView
    android:id="@+id/widget_author_text"
    android:layout_width="0dp"
    android:layout_height="0dp"
    android:visibility="gone" />

  <!-- Quote text — fills full width, centered -->
  <TextView
    android:id="@+id/widget_quote_text"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:gravity="center"
    android:textAlignment="center"
    android:text="${quoteText}"
    android:textColor="#FFFFFF"
    android:textSize="16sp"
    android:lineSpacingMultiplier="1.3"
    android:ellipsize="end"
    android:maxLines="8"
    android:fontFamily="serif"
    android:shadowColor="#AA000000"
    android:shadowDx="0"
    android:shadowDy="1"
    android:shadowRadius="4" />

</RelativeLayout>`;

      // Runtime layout
      write(
        path.join(resDest, 'layout/quotes_widget.xml'),
        bannerLayout('The journey of a thousand miles begins with a single step.'),
      );

      // Picker preview layout
      write(
        path.join(resDest, 'layout/widget_preview_basic.xml'),
        bannerLayout('The journey of a thousand miles begins with a single step.'),
      );

      // drawable/widget_background.xml — dark rounded
      write(
        path.join(resDest, 'drawable/widget_background.xml'),
        `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
  android:shape="rectangle">
  <solid android:color="#0D0D0D" />
  <corners android:radius="20dp" />
</shape>
`,
      );

      // drawable/widget_bg_transparent.xml — fully transparent, rounded
      write(
        path.join(resDest, 'drawable/widget_bg_transparent.xml'),
        `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
  android:shape="rectangle">
  <solid android:color="#00000000" />
  <corners android:radius="20dp" />
</shape>
`,
      );

      // drawable/ic_flame_gold.xml — gold flame for streak widget
      write(
        path.join(resDest, 'drawable/ic_flame_gold.xml'),
        `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
  android:width="24dp"
  android:height="24dp"
  android:viewportWidth="24"
  android:viewportHeight="24">
  <path
    android:fillColor="#B8975A"
    android:pathData="M12,2C12,2 7,8 7,13C7,15.76 9.24,18 12,18C14.76,18 17,15.76 17,13C17,10 15,7 14,6C14,8 13,9 12,9C11,9 10,8 10,6C10,6 12,4 12,2ZM12,20C9.34,20 7,18.34 7,16C7,14.66 7.6,13.46 8.5,12.5C9,14 10.34,15 12,15C13.66,15 15,14 15.5,12.5C16.4,13.46 17,14.66 17,16C17,18.34 14.66,20 12,20Z" />
</vector>
`,
      );

      // Keep old ic_flame.xml for any legacy references (purple)
      write(
        path.join(resDest, 'drawable/ic_flame.xml'),
        `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
  android:width="24dp"
  android:height="24dp"
  android:viewportWidth="24"
  android:viewportHeight="24">
  <path
    android:fillColor="#A855F7"
    android:pathData="M12,2C12,2 7,8 7,13C7,15.76 9.24,18 12,18C14.76,18 17,15.76 17,13C17,10 15,7 14,6C14,8 13,9 12,9C11,9 10,8 10,6C10,6 12,4 12,2ZM12,20C9.34,20 7,18.34 7,16C7,14.66 7.6,13.46 8.5,12.5C9,14 10.34,15 12,15C13.66,15 15,14 15.5,12.5C16.4,13.46 17,14.66 17,16C17,18.34 14.66,20 12,20Z" />
</vector>
`,
      );

      // ── Patch MainApplication.kt ──────────────────────────────────────────
      const mainAppPath = path.join(
        androidRoot,
        `app/src/main/java/${pkgPath}/MainApplication.kt`,
      );

      if (fs.existsSync(mainAppPath)) {
        let mainApp = fs.readFileSync(mainAppPath, 'utf8');

        const importLine = `import ${pkg}.widget.WidgetBridgePackage`;
        if (!mainApp.includes(importLine)) {
          mainApp = mainApp.replace(/^(package .+)/m, `$1\n\n${importLine}`);
        }

        if (!mainApp.includes('WidgetBridgePackage()')) {
          // Handle both common MainApplication.kt patterns:
          //   Pattern A: PackageList(this).packages.apply { ... }
          //   Pattern B: val packages = PackageList(this).packages
          const patternA = /PackageList\(this\)\.packages\.apply\s*\{/;
          const patternB = /(val packages = PackageList\(this\)\.packages)/;
          if (patternA.test(mainApp)) {
            mainApp = mainApp.replace(
              patternA,
              'PackageList(this).packages.apply {\n              add(WidgetBridgePackage())',
            );
          } else if (patternB.test(mainApp)) {
            mainApp = mainApp.replace(
              patternB,
              `$1\n          packages.add(WidgetBridgePackage())`,
            );
          } else {
            console.warn('[withQuotesWidget] Could not find getPackages() pattern — register WidgetBridgePackage() manually.');
          }
        }

        fs.writeFileSync(mainAppPath, mainApp);
        console.log('[withQuotesWidget] Patched MainApplication.kt');
      } else {
        console.warn(
          '[withQuotesWidget] MainApplication.kt not found. Register WidgetBridgePackage manually.',
        );
      }

      return config;
    },
  ]);
}

// ── Ensure newArchEnabled=true in gradle.properties ──────────────────────────
// react-native-reanimated@4.x and react-native-worklets@0.5.x require this
// to be explicitly present — they don't accept the default RN 0.74+ behaviour.

function withNewArch(config) {
  return withGradleProperties(config, (config) => {
    config.modResults = config.modResults.filter(
      (prop) => !(prop.type === 'property' && prop.key === 'newArchEnabled'),
    );
    config.modResults.push({ type: 'property', key: 'newArchEnabled', value: 'true' });
    return config;
  });
}

// ── Export ────────────────────────────────────────────────────────────────────

module.exports = function withQuotesWidget(config) {
  config = withWidgetManifest(config);
  config = withWidgetFiles(config);
  config = withNewArch(config);
  return config;
};
