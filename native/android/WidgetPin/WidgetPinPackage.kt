package __PACKAGE__.widgetpin

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * Registers WidgetPinModule. Added to MainApplication's package list by
 * plugins/withWidgetPinModule.js — the module lives in the app project rather
 * than a linkable library, so autolinking never sees it.
 */
class WidgetPinPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    listOf(WidgetPinModule(reactContext))

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()
}
