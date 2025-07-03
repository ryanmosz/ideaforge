import { AxiosError } from 'axios';
import {
  N8nError,
  WebhookError,
  RateLimitError,
  TimeoutError,
  NetworkError,
  AuthenticationError,
  ServiceUnavailableError
} from '../utils/error-types';
import { N8nResponse } from '../types/n8n-types';

/**
 * Centralized error handler for n8n integration
 * Converts various error types into standardized N8nError instances
 */
export class N8nErrorHandler {
  /**
   * Convert any error into a standardized N8nError
   */
  normalizeError(error: any): N8nError {
    // Already an N8nError
    if (error instanceof N8nError) {
      return error;
    }
    
    // Axios errors
    if (this.isAxiosError(error)) {
      return this.handleAxiosError(error);
    }
    
    // Node.js system errors
    if (error.code) {
      return this.handleSystemError(error);
    }
    
    // Generic errors
    return new N8nError(
      error.message || 'Unknown error occurred',
      'UNKNOWN_ERROR',
      { originalError: error }
    );
  }
  
  /**
   * Handle Axios-specific errors
   */
  private handleAxiosError(error: AxiosError): N8nError {
    const status = error.response?.status;
    const responseData = error.response?.data as any;
    const message = responseData?.error || error.message;
    
    // Timeout
    if (error.code === 'ECONNABORTED') {
      return new TimeoutError(
        'Request timed out',
        error.config?.timeout
      );
    }
    
    // Network errors
    if (error.code === 'ECONNREFUSED') {
      return new NetworkError(
        'Cannot connect to n8n service - is it running?',
        error
      );
    }
    
    if (error.code === 'ENOTFOUND') {
      return new NetworkError(
        'n8n service hostname could not be resolved',
        error
      );
    }
    
    // HTTP status errors
    if (status === 401) {
      return new AuthenticationError(
        'Authentication failed - check your API key'
      );
    }
    
    if (status === 429) {
      const retryAfter = parseInt(error.response?.headers['retry-after'] || '60');
      const remaining = parseInt(error.response?.headers['x-ratelimit-remaining'] || '0');
      return new RateLimitError(
        `Rate limit exceeded. Retry after ${retryAfter} seconds`,
        retryAfter,
        remaining
      );
    }
    
    if (status && status >= 500) {
      return new ServiceUnavailableError(
        `n8n service error (${status}): ${message}`,
        'n8n-webhook'
      );
    }
    
    // Other HTTP errors
    if (status) {
      return new WebhookError(
        `HTTP ${status}: ${message}`,
        status,
        error.response?.data
      );
    }
    
    // Generic Axios error
    return new NetworkError(
      `Network request failed: ${message}`,
      error
    );
  }
  
  /**
   * Handle Node.js system errors
   */
  private handleSystemError(error: any): N8nError {
    switch (error.code) {
      case 'ETIMEDOUT':
        return new TimeoutError('Connection timed out');
      
      case 'ECONNRESET':
        return new NetworkError('Connection reset by server', error);
      
      case 'EPIPE':
        return new NetworkError('Connection closed unexpectedly', error);
      
      default:
        return new N8nError(
          `System error: ${error.message}`,
          error.code,
          { originalError: error }
        );
    }
  }
  
  /**
   * Create an error response object
   */
  createErrorResponse<T = any>(error: Error): N8nResponse<T> {
    const n8nError = this.normalizeError(error);
    
    return {
      status: 'error',
      error: n8nError.message,
      metadata: {
        cached: false,
        requestDuration: -1,
        errorCode: n8nError.code,
        errorContext: n8nError.context
      }
    };
  }
  
  /**
   * Create a fallback response with error info
   */
  createFallbackResponse<T>(error: Error, fallbackData: T): N8nResponse<T> {
    const errorResponse = this.createErrorResponse<T>(error);
    
    return {
      ...errorResponse,
      status: 'success', // Mark as success since we have fallback data
      data: fallbackData,
      metadata: {
        cached: false,
        requestDuration: -1,
        errorCode: errorResponse.metadata?.errorCode,
        errorContext: errorResponse.metadata?.errorContext,
        fallback: true,
        fallbackReason: error.message
      }
    };
  }
  
  /**
   * Determine if an error is retryable
   */
  isRetryableError(error: Error): boolean {
    const n8nError = this.normalizeError(error);
    
    // Don't retry auth errors
    if (n8nError instanceof AuthenticationError) {
      return false;
    }
    
    // Retry network errors
    if (n8nError instanceof NetworkError) {
      return true;
    }
    
    // Retry timeouts
    if (n8nError instanceof TimeoutError) {
      return true;
    }
    
    // Retry service unavailable
    if (n8nError instanceof ServiceUnavailableError) {
      return true;
    }
    
    // Retry rate limits (with delay)
    if (n8nError instanceof RateLimitError) {
      return true;
    }
    
    // Don't retry webhook errors unless 5xx
    if (n8nError instanceof WebhookError) {
      return n8nError.statusCode ? n8nError.statusCode >= 500 : false;
    }
    
    return false;
  }
  
  /**
   * Get retry delay for an error
   */
  getRetryDelay(error: Error, attempt: number): number {
    const n8nError = this.normalizeError(error);
    
    // Use retry-after header for rate limits
    if (n8nError instanceof RateLimitError && n8nError.retryAfter) {
      return n8nError.retryAfter * 1000; // Convert to milliseconds
    }
    
    // Exponential backoff for other errors
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }
  
  /**
   * Type guard for Axios errors
   */
  private isAxiosError(error: any): error is AxiosError {
    return error.isAxiosError === true;
  }
  
  /**
   * Log error with appropriate level
   */
  logError(error: Error, context?: string): void {
    const n8nError = this.normalizeError(error);
    const prefix = context ? `[${context}]` : '[N8nErrorHandler]';
    
    if (n8nError instanceof AuthenticationError) {
      console.error(`${prefix} Authentication Error:`, n8nError.message);
    } else if (n8nError instanceof RateLimitError) {
      console.warn(`${prefix} Rate Limit:`, n8nError.message);
    } else if (n8nError instanceof TimeoutError) {
      console.warn(`${prefix} Timeout:`, n8nError.message);
    } else if (n8nError instanceof NetworkError) {
      console.error(`${prefix} Network Error:`, n8nError.message);
    } else {
      console.error(`${prefix} Error:`, n8nError.message, n8nError.code);
    }
  }
} 