/**
 * WidgetBridge — JS API for the native Android widget bridge module.
 *
 * All widget instances are identified by their numeric appWidgetId.
 * Config changes affect only the specified widgetId — never global state.
 *
 * In Expo Go: all calls are silent no-ops (native module absent).
 * Activate by building with EAS: `eas build --platform android`
 */

import { NativeModules } from 'react-native';
import type { WidgetType } from '../../store/useWidgetStore';

export interface WidgetUpdatePayload {
  widgetId: number;
  widgetType: WidgetType;
  quoteText: string;
  transparentBg: boolean;
  intervalMs: number;
  quoteType: string;
  textSize: string;
}

export interface ActiveWidget {
  widgetId: number;
  type: WidgetType;
}

export interface PendingWidgetConfig {
  widgetId: number;
  type: WidgetType;
}

const Native = NativeModules.WidgetBridge as
  | {
      updateWidget(jsonPayload: string): Promise<void>;
      updateAllWidgets(): Promise<void>;
      getPendingConfiguration(): Promise<PendingWidgetConfig | null>;
      finishConfiguration(widgetId: number): Promise<void>;
      getActiveWidgets(): Promise<ActiveWidget[]>;
      removeWidgetConfig(widgetId: number): Promise<void>;
    }
  | undefined;

class WidgetBridgeClass {
  /** True when the native module is available (EAS build, not Expo Go). */
  get isAvailable(): boolean {
    return !!Native;
  }

  /** Push quote + config for a specific widget instance to SharedPreferences. */
  async updateWidget(payload: WidgetUpdatePayload): Promise<void> {
    if (!Native) {
      console.warn('[WidgetBridge] Native module not available. Build with EAS to enable widgets.');
      return;
    }
    try {
      await Native.updateWidget(JSON.stringify(payload));
    } catch (err) {
      console.warn('[WidgetBridge] updateWidget error:', err);
    }
  }

  /** Trigger an immediate refresh of all placed widget instances. */
  async reloadTimelines(): Promise<void> {
    if (!Native) return;
    try {
      await Native.updateAllWidgets();
    } catch (err) {
      console.warn('[WidgetBridge] reloadTimelines error:', err);
    }
  }

  /**
   * Returns the pending configuration set by WidgetConfigActivity when a widget
   * was just placed, or null if there is nothing pending.
   */
  async getPendingConfiguration(): Promise<PendingWidgetConfig | null> {
    if (!Native) return null;
    try {
      return await Native.getPendingConfiguration();
    } catch (err) {
      console.warn('[WidgetBridge] getPendingConfiguration error:', err);
      return null;
    }
  }

  /**
   * Call after the user finishes configuring a newly placed widget.
   * Completes the Android placement flow (RESULT_OK) and triggers a widget render.
   */
  async finishConfiguration(widgetId: number): Promise<void> {
    if (!Native) return;
    try {
      await Native.finishConfiguration(widgetId);
    } catch (err) {
      console.warn('[WidgetBridge] finishConfiguration error:', err);
    }
  }

  /** Returns all currently placed widget instances with their types. */
  async getActiveWidgets(): Promise<ActiveWidget[]> {
    if (!Native) return [];
    try {
      return await Native.getActiveWidgets();
    } catch (err) {
      console.warn('[WidgetBridge] getActiveWidgets error:', err);
      return [];
    }
  }

  /**
   * Requests the system to pin the app widget to the home screen (Android 8+).
   * Triggers the native "Add Widget" picker sheet.
   * No-op in Expo Go (native module absent).
   */
  async requestPinWidget(): Promise<void> {
    if (!Native) {
      console.warn('[WidgetBridge] Native module not available. Build with EAS to enable widgets.');
      return;
    }
    try {
      await (Native as any).requestPinWidget?.();
    } catch (err) {
      console.warn('[WidgetBridge] requestPinWidget error:', err);
    }
  }

  /** Remove config data for a specific widget instance. */
  async removeWidgetConfig(widgetId: number): Promise<void> {
    if (!Native) return;
    try {
      await Native.removeWidgetConfig(widgetId);
    } catch (err) {
      console.warn('[WidgetBridge] removeWidgetConfig error:', err);
    }
  }
}

export const WidgetBridge = new WidgetBridgeClass();
