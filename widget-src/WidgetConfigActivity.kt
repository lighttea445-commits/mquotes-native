package com.mquotes.app.widget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * WidgetConfigActivity — opened automatically by Android when the user places a widget.
 *
 * Flow:
 *   1. Android fires ACTION_APPWIDGET_CONFIGURE → this activity receives widgetId + provider.
 *   2. We determine the widget type from EXTRA_APPWIDGET_PROVIDER (not the component class).
 *   3. We write mq_pending_config_widget_id + type to SharedPreferences.
 *   4. We set RESULT_OK and call finish() immediately — widget appears on home screen.
 *
 * We do NOT launch the main app here. Doing so before the launcher commits widget
 * placement causes many launchers to lose the widget slot. Instead, the editor opens
 * automatically the next time the user opens the app (AppState listener in _layout.tsx
 * calls checkPendingWidget on foreground, which reads the pending config).
 */
class WidgetConfigActivity : Activity() {

  companion object {
    // Kept for WidgetBridgeModule to read/clear pending config
    const val PREFS            = "mq_widget_data"
    const val KEY_PENDING_ID   = "mq_pending_config_widget_id"
    const val KEY_PENDING_TYPE = "mq_pending_config_widget_type"

    // No longer used for broadcast — kept as a constant in case anything references it
    const val ACTION_CONFIG_DONE = "com.mquotes.WIDGET_CONFIG_DONE"
    const val EXTRA_WIDGET_ID    = "widget_id"

    /** Resolves which widget type string to use based on the provider's class name. */
    @Suppress("UNUSED_PARAMETER")
    fun typeForClass(className: String?) = "basic"
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    val widgetId = intent?.getIntExtra(
      AppWidgetManager.EXTRA_APPWIDGET_ID,
      AppWidgetManager.INVALID_APPWIDGET_ID,
    ) ?: AppWidgetManager.INVALID_APPWIDGET_ID

    if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
      setResult(RESULT_CANCELED)
      finish()
      return
    }

    // Determine widget type from EXTRA_APPWIDGET_PROVIDER (the provider that triggered config),
    // NOT from intent.component (which is always WidgetConfigActivity).
    val provider: ComponentName? =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        intent?.getParcelableExtra(AppWidgetManager.EXTRA_APPWIDGET_PROVIDER, ComponentName::class.java)
      } else {
        @Suppress("DEPRECATION")
        intent?.getParcelableExtra(AppWidgetManager.EXTRA_APPWIDGET_PROVIDER)
      }
    val widgetType = typeForClass(provider?.className)

    // Write pending config so RN can detect it and open the widget editor the
    // next time the user opens the app (by tapping the widget or manually).
    getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
      .putInt(KEY_PENDING_ID,     widgetId)
      .putString(KEY_PENDING_TYPE, widgetType)
      .apply()

    // Fetch a random quote in the background so the widget displays a real quote
    // the moment it lands on the home screen (not the hardcoded fallback).
    // We block this invisible activity's main thread for up to 3 s — no visible UI
    // means no ANR risk, and most fetches complete in well under 500 ms.
    val latch = CountDownLatch(1)
    var fetchedQuote: String? = null

    Thread {
      fetchedQuote = fetchRandomQuote()
      latch.countDown()
    }.start()

    latch.await(3, TimeUnit.SECONDS)

    if (!fetchedQuote.isNullOrBlank()) {
      getSharedPreferences(QuotesWidget.PREFS, Context.MODE_PRIVATE).edit()
        .putString(QuotesWidget.keyQuoteText(widgetId), fetchedQuote!!)
        .apply()
    }

    // Deliver RESULT_OK and finish — DO NOT launch the main app here.
    // The quote is now in SharedPreferences so onUpdate renders it immediately.
    // The next time the user opens the app the AppState listener in _layout.tsx
    // calls checkPendingWidget and opens the editor automatically.
    val resultIntent = Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
    setResult(RESULT_OK, resultIntent)
    finish()
  }

  /**
   * Fetches a single random quote from the Quotable API.
   * Returns the quote text, or null on any error (network, parse, timeout).
   */
  private fun fetchRandomQuote(): String? {
    return try {
      val url  = java.net.URL("https://api.quotable.kurokeita.dev/api/quotes/random?limit=25")
      val conn = (url.openConnection() as java.net.HttpURLConnection).apply {
        connectTimeout = 1_500
        readTimeout    = 1_500
      }
      val body   = conn.inputStream.bufferedReader().readText()
      val quotes = org.json.JSONObject(body).getJSONArray("quotes")
      if (quotes.length() > 0) {
        val idx = (0 until quotes.length()).random()
        quotes.getJSONObject(idx).getString("content")
      } else null
    } catch (e: Exception) {
      null
    }
  }
}
