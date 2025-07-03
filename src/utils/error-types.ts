/**
 * Custom error types for n8n integration
 */

export class N8nError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: any
  ) {
    super(message);
    this.name = 'N8nError';
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, N8nError);
    }
  }
}

export class WebhookError extends N8nError {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message, 'WEBHOOK_ERROR', { statusCode, response });
  }
}

export class RateLimitError extends N8nError {
  constructor(
    message: string,
    public retryAfter?: number,
    public rateLimitRemaining?: number
  ) {
    super(message, 'RATE_LIMIT', { retryAfter, rateLimitRemaining });
  }
}

export class TimeoutError extends N8nError {
  constructor(
    message: string,
    public timeoutMs?: number
  ) {
    super(message, 'TIMEOUT', { timeoutMs });
  }
}

export class NetworkError extends N8nError {
  constructor(
    message: string,
    public originalError?: Error
  ) {
    super(message, 'NETWORK_ERROR', { originalError });
  }
}

export class AuthenticationError extends N8nError {
  constructor(message: string) {
    super(message, 'AUTH_ERROR');
  }
}

export class ServiceUnavailableError extends N8nError {
  constructor(
    message: string,
    public service: string
  ) {
    super(message, 'SERVICE_UNAVAILABLE', { service });
  }
}

/**
 * Type guard functions
 */
export function isN8nError(error: any): error is N8nError {
  return error instanceof N8nError;
}

export function isRateLimitError(error: any): error is RateLimitError {
  return error instanceof RateLimitError;
}

export function isTimeoutError(error: any): error is TimeoutError {
  return error instanceof TimeoutError;
}

export function isNetworkError(error: any): error is NetworkError {
  return error instanceof NetworkError;
}

export function isWebhookError(error: any): error is WebhookError {
  return error instanceof WebhookError;
} 