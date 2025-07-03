/**
 * Rate limiter utility for managing API request rates
 * Implements sliding window algorithm with per-API configuration
 */

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the time window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Optional maximum requests per second */
  maxRequestsPerSecond?: number;
  /** Rate limiting strategy */
  strategy?: 'sliding' | 'fixed';
}

export interface RateLimitState {
  /** Timestamps of requests made */
  requests: number[];
  /** Whether the API is currently blocked due to rate limit */
  blocked: boolean;
  /** Time when requests can resume if blocked */
  nextAvailableTime: number;
}

export interface RateLimitCheck {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Number of requests remaining in the window */
  remaining: number;
  /** Time in ms until the rate limit resets */
  resetIn: number;
  /** Time in ms to wait before retrying */
  waitTime: number;
}

export interface RateLimitStats {
  /** Current number of requests in the window */
  currentRequests: number;
  /** Whether currently blocked */
  isBlocked: boolean;
  /** Timestamp of oldest request in window */
  oldestRequest?: number;
  /** Timestamp of newest request in window */
  newestRequest?: number;
}

/**
 * Rate limiter implementation with sliding window algorithm
 */
export class RateLimiter {
  private states: Map<string, RateLimitState> = new Map();
  private config: RateLimitConfig;
  
  constructor(config: RateLimitConfig) {
    // Create a copy to avoid mutating the original config
    this.config = {
      ...config,
      strategy: config.strategy || 'sliding'
    };
  }
  
  /**
   * Check if a request is allowed under the rate limit
   */
  async checkLimit(key: string = 'default'): Promise<RateLimitCheck> {
    const now = Date.now();
    const state = this.getState(key);
    
    // Clean old requests outside the window
    state.requests = state.requests.filter(
      timestamp => now - timestamp < this.config.windowMs
    );
    
    // Check if currently blocked
    if (state.blocked && now < state.nextAvailableTime) {
      return {
        allowed: false,
        remaining: 0,
        resetIn: state.nextAvailableTime - now,
        waitTime: state.nextAvailableTime - now
      };
    }
    
    // Reset blocked state if time has passed
    if (state.blocked && now >= state.nextAvailableTime) {
      state.blocked = false;
    }
    
    // Check window limit
    if (state.requests.length >= this.config.maxRequests) {
      const oldestRequest = Math.min(...state.requests);
      const resetIn = this.config.windowMs - (now - oldestRequest);
      
      return {
        allowed: false,
        remaining: 0,
        resetIn: resetIn,
        waitTime: resetIn
      };
    }
    
    // Check per-second limit if configured
    if (this.config.maxRequestsPerSecond) {
      const recentRequests = state.requests.filter(
        timestamp => now - timestamp < 1000
      );
      
      if (recentRequests.length >= this.config.maxRequestsPerSecond) {
        const waitTime = 1000 - (now - recentRequests[0]);
        return {
          allowed: false,
          remaining: this.config.maxRequests - state.requests.length,
          resetIn: this.config.windowMs,
          waitTime: waitTime
        };
      }
    }
    
    return {
      allowed: true,
      remaining: this.config.maxRequests - state.requests.length,
      resetIn: this.config.windowMs,
      waitTime: 0
    };
  }
  
  /**
   * Record a successful request
   */
  recordRequest(key: string = 'default'): void {
    const state = this.getState(key);
    state.requests.push(Date.now());
    state.blocked = false;
  }
  
  /**
   * Record a rate limit rejection from the API
   */
  recordRejection(key: string = 'default', retryAfter?: number): void {
    const state = this.getState(key);
    state.blocked = true;
    state.nextAvailableTime = Date.now() + (retryAfter || 60000);
  }
  
  /**
   * Wait until a request slot is available
   */
  async waitForSlot(key: string = 'default'): Promise<void> {
    const check = await this.checkLimit(key);
    
    if (!check.allowed && check.waitTime > 0) {
      await this.sleep(check.waitTime);
      // Recursive check after waiting
      return this.waitForSlot(key);
    }
  }
  
  /**
   * Reset rate limit state
   */
  reset(key?: string): void {
    if (key) {
      this.states.delete(key);
    } else {
      this.states.clear();
    }
  }
  
  /**
   * Get statistics for a rate limit key
   */
  getStats(key: string = 'default'): RateLimitStats {
    const state = this.getState(key);
    const now = Date.now();
    
    // Clean old requests for accurate stats
    state.requests = state.requests.filter(
      timestamp => now - timestamp < this.config.windowMs
    );
    
    return {
      currentRequests: state.requests.length,
      isBlocked: state.blocked && now < state.nextAvailableTime,
      oldestRequest: state.requests.length > 0 ? Math.min(...state.requests) : undefined,
      newestRequest: state.requests.length > 0 ? Math.max(...state.requests) : undefined
    };
  }
  
  /**
   * Get or create state for a key
   */
  private getState(key: string): RateLimitState {
    if (!this.states.has(key)) {
      this.states.set(key, {
        requests: [],
        blocked: false,
        nextAvailableTime: 0
      });
    }
    return this.states.get(key)!;
  }
  
  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Predefined rate limits for different APIs
 */
export const API_RATE_LIMITS: Record<string, RateLimitConfig> = {
  hackerNews: {
    maxRequests: 10000,
    windowMs: 3600000, // 1 hour
    maxRequestsPerSecond: 10
  },
  reddit: {
    maxRequests: 60,
    windowMs: 600000, // 10 minutes
    maxRequestsPerSecond: 1
  },
  default: {
    maxRequests: 1000,
    windowMs: 3600000, // 1 hour
    maxRequestsPerSecond: 5
  }
};

/**
 * Manager for multiple API rate limiters
 */
export class APIRateLimitManager {
  private limiters: Map<string, RateLimiter> = new Map();
  
  /**
   * Get or create a rate limiter for an API
   */
  getLimiter(api: string): RateLimiter {
    if (!this.limiters.has(api)) {
      const config = API_RATE_LIMITS[api] || API_RATE_LIMITS.default;
      this.limiters.set(api, new RateLimiter(config));
    }
    return this.limiters.get(api)!;
  }
  
  /**
   * Check rate limit and wait if necessary
   */
  async checkAndWait(api: string, key?: string): Promise<void> {
    const limiter = this.getLimiter(api);
    await limiter.waitForSlot(key);
    limiter.recordRequest(key);
  }
  
  /**
   * Handle rate limit error response from API
   */
  handleRateLimitError(api: string, error: any, key?: string): void {
    const limiter = this.getLimiter(api);
    
    // Extract retry-after from various sources
    let retryAfter = 60000; // Default 1 minute
    
    if (error.response?.headers?.['retry-after']) {
      const headerValue = error.response.headers['retry-after'];
      retryAfter = isNaN(headerValue as any)
        ? new Date(headerValue).getTime() - Date.now()
        : parseInt(headerValue) * 1000;
    } else if (error.response?.headers?.['x-ratelimit-reset']) {
      const resetTime = parseInt(error.response.headers['x-ratelimit-reset']);
      retryAfter = (resetTime * 1000) - Date.now();
    }
    
    // Ensure retryAfter is positive
    retryAfter = Math.max(retryAfter, 1000);
    
    limiter.recordRejection(key, retryAfter);
  }
  
  /**
   * Get statistics for all rate limiters
   */
  getAllStats(): Record<string, RateLimitStats> {
    const stats: Record<string, RateLimitStats> = {};
    
    this.limiters.forEach((limiter, api) => {
      stats[api] = limiter.getStats();
    });
    
    return stats;
  }
  
  /**
   * Reset all rate limiters
   */
  resetAll(): void {
    this.limiters.forEach(limiter => limiter.reset());
  }
}

// Export singleton instance for convenience
export const rateLimitManager = new APIRateLimitManager(); 