import { N8nErrorHandler } from '../services/n8n-error-handler';

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
  enableJitter?: boolean;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,      // 1 second
  maxDelay: 30000,         // 30 seconds
  backoffMultiplier: 2,    // Double delay each attempt
  retryableErrors: ['ECONNREFUSED', 'ETIMEDOUT', 'ECONNABORTED', '429', '500', '502', '503', '504'],
  enableJitter: true
};

/**
 * Handles retry logic with exponential backoff
 */
export class RetryHandler {
  private errorHandler: N8nErrorHandler;
  private config: RetryConfig;
  
  constructor(config?: Partial<RetryConfig>) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
    this.errorHandler = new N8nErrorHandler();
  }
  
  /**
   * Execute an operation with retry logic
   * @param operation The async operation to execute
   * @param context A description of the operation for logging
   * @returns The result of the operation
   */
  async execute<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (!this.shouldRetry(error, attempt)) {
          this.errorHandler.logError(lastError, context);
          throw error;
        }
        
        const delay = this.calculateDelay(attempt, error);
        console.log(`[Retry] ${context} - Attempt ${attempt + 1}/${this.config.maxRetries + 1} failed. Retrying in ${delay}ms...`);
        
        await this.sleep(delay);
      }
    }
    
    this.errorHandler.logError(lastError!, context);
    throw new Error(`Operation failed after ${this.config.maxRetries + 1} attempts: ${lastError!.message}`);
  }
  
  /**
   * Determine if an error should trigger a retry
   */
  private shouldRetry(error: any, attempt: number): boolean {
    if (attempt >= this.config.maxRetries) {
      return false;
    }
    
    // Use error handler to determine if retryable
    return this.errorHandler.isRetryableError(error);
  }
  
  /**
   * Calculate delay before next retry using error handler
   */
  private calculateDelay(attempt: number, error: any): number {
    // Get delay from error handler (handles rate limits, etc)
    const errorDelay = this.errorHandler.getRetryDelay(error, attempt);
    
    // Apply our own backoff if error handler returns default
    const exponentialDelay = this.config.initialDelay * Math.pow(this.config.backoffMultiplier, attempt);
    const baseDelay = Math.max(errorDelay, exponentialDelay);
    
    // Apply jitter if enabled
    if (this.config.enableJitter !== false) {
      const jitteredDelay = baseDelay * (0.5 + Math.random() * 0.5);
      return Math.min(jitteredDelay, this.config.maxDelay);
    }
    
    return Math.min(baseDelay, this.config.maxDelay);
  }
  
  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Get current configuration
   */
  getConfig(): Readonly<RetryConfig> {
    return { ...this.config };
  }
} 