/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableErrors: ['ECONNREFUSED', 'ETIMEDOUT', 'ECONNABORTED', '429', '500', '502', '503', '504']
};

/**
 * Handles retry logic with exponential backoff
 */
export class RetryHandler {
  private config: RetryConfig;
  
  constructor(config?: Partial<RetryConfig>) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }
  
  /**
   * Execute an operation with retry logic
   * @param operation The async operation to execute
   * @param context Description of the operation for logging
   * @returns The result of the operation
   */
  async execute<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        // Log retry attempt if not the first attempt
        if (attempt > 0) {
          console.log(`[Retry] ${context} - Attempt ${attempt + 1}/${this.config.maxRetries + 1}`);
        }
        
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Check if we should retry
        if (!this.shouldRetry(error, attempt)) {
          throw error;
        }
        
        // Calculate delay with jitter
        const delay = this.calculateDelay(attempt);
        console.log(`[Retry] ${context} - Failed with error: ${lastError.message}. Retrying in ${delay}ms...`);
        
        // Wait before retrying
        await this.sleep(delay);
      }
    }
    
    // All retries exhausted
    throw new Error(`Operation failed after ${this.config.maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`);
  }
  
  /**
   * Determine if an error is retryable
   */
  private shouldRetry(error: any, attempt: number): boolean {
    // Don't retry if we've exhausted attempts
    if (attempt >= this.config.maxRetries) {
      return false;
    }
    
    // Check for specific error codes
    const errorCode = error.code || error.response?.status?.toString();
    if (errorCode && this.config.retryableErrors.includes(errorCode)) {
      return true;
    }
    
    // Check for axios timeout errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return true;
    }
    
    // Check for rate limiting
    if (error.response?.status === 429) {
      return true;
    }
    
    // Check for server errors (5xx)
    if (error.response?.status >= 500 && error.response?.status < 600) {
      return true;
    }
    
    // Don't retry client errors (4xx) except rate limiting
    if (error.response?.status >= 400 && error.response?.status < 500) {
      return false;
    }
    
    // Don't retry for other errors
    return false;
  }
  
  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number): number {
    // Calculate exponential delay
    const exponentialDelay = this.config.initialDelay * Math.pow(this.config.backoffMultiplier, attempt);
    
    // Add jitter (random factor between 0.5 and 1.5)
    const jitterFactor = 0.5 + Math.random();
    const jitteredDelay = exponentialDelay * jitterFactor;
    
    // Cap at maximum delay
    return Math.min(jitteredDelay, this.config.maxDelay);
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