package com.mquotes.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.util.TypedValue
import android.view.View
import android.widget.RemoteViews
import com.mquotes.app.R

/**
 * QuotesWidget — abstract base AppWidget provider.
 *
 * Subclasses (BasicWidget) override getWidgetType() to identify themselves.
 * The widget type is intrinsic to the class — NOT stored in prefs.
 *
 * Per-widget config is isolated under namespaced SharedPreferences keys:
 *   mq_widget_{widgetId}_quote_text
 *   mq_widget_{widgetId}_transparent_bg
 *
 * Adaptive font sizing reads the widget's current height via AppWidgetManager.getAppWidgetOptions().
 */
abstract class QuotesWidget : AppWidgetProvider() {

  /** Returns the widget type string. Implemented by each subclass. */
  abstract fun getWidgetType(): String

  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray,
  ) {
    // Fetch fresh quotes in a background thread (network not allowed on main thread).
    // goAsync() gives us extra time beyond the BroadcastReceiver deadline.
    val pending = goAsync()
    Thread {
      try {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        appWidgetIds.forEach { id ->
          val quoteType = prefs.getString(keyQuoteType(id), "general") ?: "general"
          val newQuote  = fetchNewQuote(quoteType)
          if (!newQuote.isNullOrBlank()) {
            prefs.edit().putString(keyQuoteText(id), newQuote).apply()
          }
          updateWidget(context, appWidgetManager, id, getWidgetType())
        }
      } finally {
        pending.finish()
      }
    }.start()
  }

  override fun onAppWidgetOptionsChanged(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int,
    newOptions: android.os.Bundle,
  ) {
    // Re-render with adaptive font when widget is resized
    updateWidget(context, appWidgetManager, appWidgetId, getWidgetType())
  }

  override fun onDeleted(context: Context, appWidgetIds: IntArray) {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val editor = prefs.edit()
    appWidgetIds.forEach { id -> clearWidgetPrefs(editor, id) }
    editor.apply()
  }

  companion object {
    const val PREFS = "mq_widget_data"

    // ── Per-widget key helpers ────────────────────────────────────────────────

    fun keyQuoteText(id: Int)     = "mq_widget_${id}_quote_text"
    fun keyTransparentBg(id: Int) = "mq_widget_${id}_transparent_bg"
    fun keyIntervalMs(id: Int)    = "mq_widget_${id}_interval_ms"
    fun keyQuoteType(id: Int)     = "mq_widget_${id}_quote_type"
    fun keyTextSize(id: Int)      = "mq_widget_${id}_text_size"

    private fun clearWidgetPrefs(editor: android.content.SharedPreferences.Editor, id: Int) {
      editor.remove(keyQuoteText(id))
      editor.remove(keyTransparentBg(id))
      editor.remove(keyIntervalMs(id))
      editor.remove(keyQuoteType(id))
      editor.remove(keyTextSize(id))
    }

    /**
     * Fetches a random quote from the Quotable API.
     * For category widgets (quoteType != "general" / "favorites") a tag filter is applied.
     * Returns null on any error (network, parse, timeout).
     */
    fun fetchNewQuote(quoteType: String): String? {
      val tag = when (quoteType) {
        "general", "favorites" -> null
        else -> quoteType.replaceFirstChar { it.uppercaseChar() }
      }
      val url = buildString {
        append("https://api.quotable.kurokeita.dev/api/quotes/random?limit=25")
        if (tag != null) append("&tags=$tag")
      }
      val conn = java.net.URL(url).openConnection() as java.net.HttpURLConnection
      conn.connectTimeout = 3_000
      conn.readTimeout    = 3_000
      return try {
        val body   = conn.inputStream.bufferedReader().readText()
        val quotes = org.json.JSONObject(body).getJSONArray("quotes")
        if (quotes.length() > 0) {
          val idx = (0 until quotes.length()).random()
          quotes.getJSONObject(idx).getString("content")
        } else null
      } catch (e: Exception) {
        null
      } finally {
        conn.disconnect()
      }
    }

    // ── Adaptive font size ────────────────────────────────────────────────────

    private fun adaptiveSp(heightDp: Int, quoteLength: Int): Float {
      return when {
        quoteLength > 200 -> (heightDp / 11f).coerceIn(10f, 18f)
        quoteLength > 120 -> (heightDp / 9f).coerceIn(12f, 22f)
        quoteLength > 60  -> (heightDp / 7f).coerceIn(14f, 28f)
        else              -> (heightDp / 6f).coerceIn(16f, 34f)
      }
    }

    // ── Core render ───────────────────────────────────────────────────────────

    fun updateWidget(
      context: Context,
      appWidgetManager: AppWidgetManager,
      widgetId: Int,
      @Suppress("UNUSED_PARAMETER") widgetType: String,
    ) {
      val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

      val quoteText     = prefs.getString(keyQuoteText(widgetId),
                            "The journey of a thousand miles begins with a single step.") ?: ""
      val transparentBg = prefs.getBoolean(keyTransparentBg(widgetId), false)
      val textSize      = prefs.getString(keyTextSize(widgetId), "medium") ?: "medium"

      // Adaptive font sizing from widget dimensions
      val opts       = appWidgetManager.getAppWidgetOptions(widgetId)
      val heightDp   = opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 110)
      val sizeMultiplier = when (textSize) {
        "small" -> 0.75f
        "large" -> 1.3f
        else    -> 1.0f
      }
      val sp = adaptiveSp(heightDp, quoteText.length) * sizeMultiplier

      val views = RemoteViews(context.packageName, R.layout.quotes_widget)

      // Background: transparent or dark rounded
      views.setInt(
        R.id.widget_root,
        "setBackgroundResource",
        if (transparentBg) R.drawable.widget_bg_transparent else R.drawable.widget_background,
      )

      // Quote text (fills widget — no author, no quote mark)
      views.setTextViewText(R.id.widget_quote_text, quoteText)
      views.setTextViewTextSize(R.id.widget_quote_text, TypedValue.COMPLEX_UNIT_SP, sp)
      // Center text horizontally and vertically
      views.setInt(R.id.widget_quote_text, "setGravity", android.view.Gravity.CENTER)

      // Author always hidden
      views.setViewVisibility(R.id.widget_author_text, View.GONE)

      // Quote mark always hidden
      views.setViewVisibility(R.id.widget_quote_mark, View.GONE)

      // Tap → deep-link into app (Expo Router handles quotable:// via scheme in app.json)
      val deepLinkIntent = Intent(Intent.ACTION_VIEW, android.net.Uri.parse("quotable://")).apply {
        setPackage(context.packageName)
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      }
      val pendingIntent = PendingIntent.getActivity(
        context, widgetId, deepLinkIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
      views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)

      appWidgetManager.updateAppWidget(widgetId, views)
    }
  }
}
