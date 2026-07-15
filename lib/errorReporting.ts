/**
 * Error reporting abstraction layer.
 * In development: errors are logged to console.
 * In production: replace the TODO sections with Sentry or Firebase Crashlytics.
 *
 * Setup (Sentry):
 *   npx expo install @sentry/react-native
 *   https://docs.sentry.io/platforms/react-native/
 */

export type ErrorContext = Record<string, unknown>;
export type Severity = 'info' | 'warning' | 'error' | 'fatal';

function captureError(error: unknown, context?: ErrorContext): void {
  const err = error instanceof Error ? error : new Error(String(error));
  if (__DEV__) {
    console.error('[ErrorReporting]', err.message, context ?? '');
  }
  // TODO: Sentry.withScope((scope) => {
  //   if (context) scope.setExtras(context);
  //   Sentry.captureException(err);
  // });
}

function captureMessage(message: string, severity: Severity = 'info', context?: ErrorContext): void {
  if (__DEV__) {
    const fn = severity === 'error' || severity === 'fatal' ? console.error : console.warn;
    fn(`[ErrorReporting:${severity}] ${message}`, context ?? '');
  }
  // TODO: Sentry.captureMessage(message, severity);
}

export const errorReporting = { captureError, captureMessage };
