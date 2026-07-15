/**
 * Subscription error handling utilities
 * Provides human-readable error messages and recovery strategies
 */

export type SubscriptionErrorType =
  | 'NETWORK_ERROR'
  | 'USER_CANCELLED'
  | 'INVALID_PACKAGE'
  | 'PAYMENT_FAILED'
  | 'ALREADY_SUBSCRIBED'
  | 'NOT_AVAILABLE'
  | 'UNKNOWN_ERROR';

export interface SubscriptionError {
  type: SubscriptionErrorType;
  message: string;
  suggestedAction: string;
  originalError?: Error;
}

/**
 * Parse raw error into a friendly SubscriptionError
 */
export function parseSubscriptionError(error: any): SubscriptionError {
  const originalError = error instanceof Error ? error : new Error(String(error));
  const errorMessage = originalError.message.toLowerCase();

  // Network errors
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('offline') ||
    errorMessage.includes('timeout')
  ) {
    return {
      type: 'NETWORK_ERROR',
      message: 'Unable to connect. Please check your internet connection.',
      suggestedAction: 'Ensure you have a stable connection and try again.',
      originalError,
    };
  }

  // User cancelled
  if (
    errorMessage.includes('cancelled') ||
    errorMessage.includes('user cancelled') ||
    errorMessage.includes('user_cancelled')
  ) {
    return {
      type: 'USER_CANCELLED',
      message: 'Purchase cancelled.',
      suggestedAction: 'No charge was made. Try again whenever you\'re ready.',
      originalError,
    };
  }

  // Already subscribed
  if (errorMessage.includes('already') || errorMessage.includes('duplicate')) {
    return {
      type: 'ALREADY_SUBSCRIBED',
      message: 'You already have an active subscription.',
      suggestedAction: 'Visit your account settings to manage your subscription.',
      originalError,
    };
  }

  // Payment failed
  if (
    errorMessage.includes('payment') ||
    errorMessage.includes('billing') ||
    errorMessage.includes('declined')
  ) {
    return {
      type: 'PAYMENT_FAILED',
      message: 'Payment failed. Please check your payment method.',
      suggestedAction: 'Verify your card details and try again. Contact your bank if the issue persists.',
      originalError,
    };
  }

  // Not available in region
  if (
    errorMessage.includes('not available') ||
    errorMessage.includes('unavailable') ||
    errorMessage.includes('country')
  ) {
    return {
      type: 'NOT_AVAILABLE',
      message: 'Subscriptions are not available in your region.',
      suggestedAction: 'Check back later or contact support for more information.',
      originalError,
    };
  }

  // Invalid package
  if (errorMessage.includes('package') || errorMessage.includes('product')) {
    return {
      type: 'INVALID_PACKAGE',
      message: 'Unable to process this product.',
      suggestedAction: 'Please try a different subscription option or contact support.',
      originalError,
    };
  }

  // Unknown error
  return {
    type: 'UNKNOWN_ERROR',
    message: 'Something went wrong with your purchase.',
    suggestedAction: 'Please try again. If the issue persists, contact support.',
    originalError,
  };
}

/**
 * Get retry strategy for each error type
 */
export function getRetryStrategy(
  errorType: SubscriptionErrorType
): {
  shouldRetry: boolean;
  delayMs: number;
  maxAttempts: number;
} {
  switch (errorType) {
    case 'NETWORK_ERROR':
      return { shouldRetry: true, delayMs: 2000, maxAttempts: 3 };
    case 'PAYMENT_FAILED':
      return { shouldRetry: true, delayMs: 1000, maxAttempts: 1 };
    case 'USER_CANCELLED':
      return { shouldRetry: false, delayMs: 0, maxAttempts: 0 };
    case 'ALREADY_SUBSCRIBED':
      return { shouldRetry: false, delayMs: 0, maxAttempts: 0 };
    case 'NOT_AVAILABLE':
      return { shouldRetry: false, delayMs: 0, maxAttempts: 0 };
    case 'INVALID_PACKAGE':
      return { shouldRetry: false, delayMs: 0, maxAttempts: 0 };
    case 'UNKNOWN_ERROR':
    default:
      return { shouldRetry: true, delayMs: 1500, maxAttempts: 2 };
  }
}

/**
 * Format error message for display in UI
 */
export function formatErrorForUI(error: SubscriptionError): {
  title: string;
  message: string;
  actionText: string;
} {
  switch (error.type) {
    case 'NETWORK_ERROR':
      return {
        title: 'Connection Error',
        message: error.message,
        actionText: 'Retry',
      };
    case 'USER_CANCELLED':
      return {
        title: 'Purchase Cancelled',
        message: error.message,
        actionText: 'Back',
      };
    case 'PAYMENT_FAILED':
      return {
        title: 'Payment Failed',
        message: error.message,
        actionText: 'Try Again',
      };
    case 'ALREADY_SUBSCRIBED':
      return {
        title: 'Already Subscribed',
        message: error.message,
        actionText: 'Manage',
      };
    case 'NOT_AVAILABLE':
      return {
        title: 'Not Available',
        message: error.message,
        actionText: 'Close',
      };
    default:
      return {
        title: 'Something Went Wrong',
        message: error.message,
        actionText: 'Retry',
      };
  }
}

/**
 * Log error for debugging/analytics
 */
export function logSubscriptionError(
  error: SubscriptionError,
  context?: Record<string, any>
) {
  console.error('❌ Subscription Error:', {
    type: error.type,
    message: error.message,
    originalError: error.originalError?.message,
    context,
    timestamp: new Date().toISOString(),
  });

  // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
  // if (process.env.NODE_ENV === 'production') {
  //   captureException(error.originalError, { tags: { type: error.type, context } });
  // }
}
