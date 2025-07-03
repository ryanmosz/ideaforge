/**
 * Circuit breaker pattern implementation
 * Prevents cascading failures by temporarily blocking requests to failing services
 */

export enum CircuitState {
  CLOSED = 'CLOSED',   // Normal operation
  OPEN = 'OPEN',       // Blocking requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening
  resetTimeout: number;          // Time before trying half-open (ms)
  successThreshold: number;      // Successes needed to close from half-open
  windowSize: number;            // Time window for counting failures (ms)
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime?: number;
  lastStateChange: number;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime?: number;
  private lastStateChange: number = Date.now();
  private failureTimestamps: number[] = [];
  
  // Statistics
  private totalRequests: number = 0;
  private totalFailures: number = 0;
  private totalSuccesses: number = 0;
  
  constructor(
    private name: string,
    private config: CircuitBreakerConfig = {
      failureThreshold: 5,
      resetTimeout: 30000, // 30 seconds
      successThreshold: 2,
      windowSize: 60000    // 1 minute
    }
  ) {}
  
  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;
    
    // Check if circuit is open
    if (this.isOpen()) {
      throw new Error(`Circuit breaker is OPEN for ${this.name}`);
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  /**
   * Check if circuit should block requests
   */
  isOpen(): boolean {
    this.updateState();
    return this.state === CircuitState.OPEN;
  }
  
  /**
   * Record a successful request
   */
  private onSuccess(): void {
    this.totalSuccesses++;
    this.failures = 0;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.changeState(CircuitState.CLOSED);
        this.successes = 0;
      }
    }
  }
  
  /**
   * Record a failed request
   */
  private onFailure(): void {
    this.totalFailures++;
    this.lastFailureTime = Date.now();
    this.failureTimestamps.push(this.lastFailureTime);
    
    // Clean old timestamps outside the window
    const windowStart = Date.now() - this.config.windowSize;
    this.failureTimestamps = this.failureTimestamps.filter(ts => ts > windowStart);
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.changeState(CircuitState.OPEN);
    } else if (this.state === CircuitState.CLOSED) {
      this.failures = this.failureTimestamps.length;
      if (this.failures >= this.config.failureThreshold) {
        this.changeState(CircuitState.OPEN);
      }
    }
  }
  
  /**
   * Update circuit state based on timeouts
   */
  private updateState(): void {
    if (this.state === CircuitState.OPEN && this.lastFailureTime) {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure >= this.config.resetTimeout) {
        this.changeState(CircuitState.HALF_OPEN);
        this.successes = 0;
      }
    }
  }
  
  /**
   * Change circuit state
   */
  private changeState(newState: CircuitState): void {
    if (this.state !== newState) {
      console.log(`[CircuitBreaker ${this.name}] State change: ${this.state} -> ${newState}`);
      this.state = newState;
      this.lastStateChange = Date.now();
      
      if (newState === CircuitState.CLOSED) {
        this.failures = 0;
        this.failureTimestamps = [];
      }
    }
  }
  
  /**
   * Get current statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastStateChange: this.lastStateChange,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses
    };
  }
  
  /**
   * Reset the circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = undefined;
    this.lastStateChange = Date.now();
    this.failureTimestamps = [];
  }
  
  /**
   * Force circuit to open state (for testing)
   */
  forceOpen(): void {
    this.changeState(CircuitState.OPEN);
    this.lastFailureTime = Date.now();
  }
  
  /**
   * Force circuit to closed state (for testing)
   */
  forceClosed(): void {
    this.changeState(CircuitState.CLOSED);
  }
}

/**
 * Circuit breaker manager for multiple services
 */
export class CircuitBreakerManager {
  private breakers: Map<string, CircuitBreaker> = new Map();
  
  /**
   * Get or create a circuit breaker for a service
   */
  getBreaker(name: string, config?: CircuitBreakerConfig): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, config));
    }
    return this.breakers.get(name)!;
  }
  
  /**
   * Get all circuit breakers
   */
  getAllBreakers(): Map<string, CircuitBreaker> {
    return new Map(this.breakers);
  }
  
  /**
   * Get statistics for all breakers
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    for (const [name, breaker] of this.breakers) {
      stats[name] = breaker.getStats();
    }
    return stats;
  }
  
  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
} 