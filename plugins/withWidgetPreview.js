/**
 * Expo config plugin — adds android:previewLayout and android:previewImage
 * to the BasicWidget provider XML after react-native-android-widget generates
 * it, AND writes the resources those references point to. Without writing the
 * files, EAS cloud builds (where prebuild --clean wipes android/) fail at
 * processReleaseResources because the layout/drawable can't be found.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PREVIEW_LAYOUT_XML = `<?xml version="1.0" encoding="utf-8"?>
<!-- Widget picker preview — shown on Android 12+ (previewLayout) -->
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/widget_preview_bg">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:orientation="vertical"
        android:gravity="center"
        android:padding="16dp">

        <TextView
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:text="&#8220;The only way to do great work is to love what you do.&#8221;"
            android:textColor="#FFFFFF"
            android:textSize="13sp"
            android:gravity="center"
            android:fontFamily="serif"
            android:lineSpacingMultiplier="1.3"
            android:maxLines="3"
            android:ellipsize="end" />

        <TextView
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:text="&#8212; Steve Jobs"
            android:textColor="#A6A6A6"
            android:textSize="11sp"
            android:gravity="end"
            android:fontFamily="sans-serif"
            android:layout_marginTop="8dp" />

    </LinearLayout>

</FrameLayout>
`;

const PREVIEW_BG_XML = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#080808" />
    <corners android:radius="16dp" />
</shape>
`;

function ensureFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
}

module.exports = function withWidgetPreview(config) {
  return withDangerousMod(config, [
    'android',
    (mod) => {
      const resRoot = path.join(mod.modRequest.platformProjectRoot, 'app/src/main/res');

      // 1. Write the preview resources so the widget provider XML's references resolve.
      ensureFile(path.join(resRoot, 'layout/widget_preview.xml'), PREVIEW_LAYOUT_XML);
      ensureFile(path.join(resRoot, 'drawable/widget_preview_bg.xml'), PREVIEW_BG_XML);

      // 2. Patch the widget provider XML to reference them (idempotent).
      const xmlPath = path.join(resRoot, 'xml/widgetprovider_basicwidget.xml');
      if (fs.existsSync(xmlPath)) {
        let xml = fs.readFileSync(xmlPath, 'utf8');
        if (!xml.includes('android:previewLayout')) {
          xml = xml.replace(
            'android:initialLayout="@layout/rn_widget"',
            'android:initialLayout="@layout/rn_widget"\n    android:previewImage="@drawable/widget_preview_bg"\n    android:previewLayout="@layout/widget_preview"',
          );
          fs.writeFileSync(xmlPath, xml, 'utf8');
        }
      }

      return mod;
    },
  ]);
};
