package com.mquotes.app.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import org.json.JSONObject

/**
 * WidgetBridgeModule — React Native ↔ AppWidget bridge.
 *
 * All config is stored per-widgetId under namespaced SharedPreferences keys so
 * multiple widget instances never share state.
 */
class WidgetBridgeModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "WidgetBridge"

  private val prefs get() =
    reactContext.getSharedPreferences(QuotesWidget.PREFS, Context.MODE_PRIVATE)

  // ── Widget update ─────────────────────────────────────────────────────────

  /**
   * Push quote + config for a specific widget instance to SharedPreferences,
   * then request an immediate refresh of that widget.
   *
   * payload JSON fields:
   *   widgetId       (int)
   *   widgetType     (string: basic)
   *   quoteText      (string)
   *   transparentBg  (bool)
   *   intervalMs     (long)
   *   quoteType      (string: general|favorites|wisdom|motivational|…)
   */
  @ReactMethod
  fun updateWidget(jsonPayload: String, promise: Promise) {
    try {
      val json        = JSONObject(jsonPayload)
      val widgetId    = json.getInt("widgetId")
      val quoteText   = json.optString("quoteText", "")
      val transparent = json.optBoolean("transparentBg", false)
      val intervalMs  = json.optLong("intervalMs", 3_600_000L)
      val quoteType   = json.optString("quoteType", "general")
      val textSize    = json.optString("textSize", "medium")

      prefs.edit()
        .putString(QuotesWidget.keyQuoteText(widgetId),      quoteText)
        .putBoolean(QuotesWidget.keyTransparentBg(widgetId), transparent)
        .putLong(QuotesWidget.keyIntervalMs(widgetId),        intervalMs)
        .putString(QuotesWidget.keyQuoteType(widgetId),       quoteType)
        .putString(QuotesWidget.keyTextSize(widgetId),        textSize)
        .putLong("mq_last_updated", System.currentTimeMillis())
        .apply()

      val widgetType = json.optString("widgetType", "basic")
      val manager    = AppWidgetManager.getInstance(reactContext)
      QuotesWidget.updateWidget(reactContext, manager, widgetId, widgetType)

      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("UPDATE_ERROR", e.message, e)
    }
  }

  /** Refresh all placed widget instances across all three provider classes. */
  @ReactMethod
  fun updateAllWidgets(promise: Promise) {
    try {
      updateAllWidgetsInternal()
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("UPDATE_ERROR", e.message, e)
    }
  }

  // ── Configuration flow ────────────────────────────────────────────────────

  /**
   * Returns the pending configuration (widgetId + type) written by WidgetConfigActivity
   * when a widget was just placed, or null if there is no pending configuration.
   */
  @ReactMethod
  fun getPendingConfiguration(promise: Promise) {
    try {
      val widgetId = prefs.getInt(WidgetConfigActivity.KEY_PENDING_ID, -1)
      if (widgetId == -1) {
        promise.resolve(null)
        return
      }
      val widgetType = prefs.getString(WidgetConfigActivity.KEY_PENDING_TYPE, "basic") ?: "basic"

      // Consume immediately — one-shot. If the user dismisses the editor without
      // saving, finishConfiguration is never called, so without this clear the
      // editor would re-open on every subsequent foreground event.
      prefs.edit()
        .remove(WidgetConfigActivity.KEY_PENDING_ID)
        .remove(WidgetConfigActivity.KEY_PENDING_TYPE)
        .apply()

      val map = Arguments.createMap().apply {
        putInt("widgetId", widgetId)
        putString("type", widgetType)
      }
      promise.resolve(map)
    } catch (e: Exception) {
      promise.reject("PREFS_ERROR", e.message, e)
    }
  }

  /**
   * Called by JS after the user finishes configuring a newly placed widget.
   * Clears the pending config from SharedPreferences and triggers an immediate widget render.
   *
   * Note: RESULT_OK is now set immediately by WidgetConfigActivity (no broadcast needed).
   * This method simply finalises the in-app side of the configuration.
   */
  @ReactMethod
  fun finishConfiguration(widgetId: Int, promise: Promise) {
    try {
      prefs.edit()
        .remove(WidgetConfigActivity.KEY_PENDING_ID)
        .remove(WidgetConfigActivity.KEY_PENDING_TYPE)
        .apply()

      updateAllWidgetsInternal()

      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("CONFIG_ERROR", e.message, e)
    }
  }

  /**
   * Returns an array of all currently placed widget instances with their types.
   * Each element: { widgetId: Int, type: String }
   */
  @ReactMethod
  fun getActiveWidgets(promise: Promise) {
    try {
      val manager = AppWidgetManager.getInstance(reactContext)
      val result  = Arguments.createArray()

      fun addIds(cls: Class<*>, type: String) {
        manager.getAppWidgetIds(ComponentName(reactContext, cls)).forEach { id ->
          result.pushMap(Arguments.createMap().apply {
            putInt("widgetId", id)
            putString("type", type)
          })
        }
      }

      addIds(BasicWidget::class.java, "basic")

      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("QUERY_ERROR", e.message, e)
    }
  }

  /**
   * Remove all SharedPreferences data for a widget instance.
   */
  @ReactMethod
  fun removeWidgetConfig(widgetId: Int, promise: Promise) {
    try {
      prefs.edit()
        .remove(QuotesWidget.keyQuoteText(widgetId))
        .remove(QuotesWidget.keyTransparentBg(widgetId))
        .remove(QuotesWidget.keyIntervalMs(widgetId))
        .remove(QuotesWidget.keyQuoteType(widgetId))
        .remove(QuotesWidget.keyTextSize(widgetId))
        .apply()
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("REMOVE_ERROR", e.message, e)
    }
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  private fun updateAllWidgetsInternal() {
    val manager = AppWidgetManager.getInstance(reactContext)

    fun updateAll(cls: Class<*>, type: String) {
      manager.getAppWidgetIds(ComponentName(reactContext, cls)).forEach { id ->
        QuotesWidget.updateWidget(reactContext, manager, id, type)
      }
    }

    updateAll(BasicWidget::class.java, "basic")
  }
}
