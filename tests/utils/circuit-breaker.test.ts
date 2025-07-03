import {
  CircuitBreaker,
  CircuitBreakerManager,
  CircuitState,
  CircuitBreakerConfig
} from '../../src/utils/circuit-breaker';

// Set a global test timeout to prevent hanging
jest.setTimeout(10000); // 10 seconds max per test

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;
  const defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 3,
    resetTimeout: 1000, // 1 second for faster tests
    successThreshold: 2,
    windowSize: 5000   // 5 seconds
  };
  
  beforeEach(() => {
    breaker = new CircuitBreaker('test-service', defaultConfig);
    jest.clearAllTimers();
  });
  
  describe('Initial state', () => {
    it('should start in CLOSED state', () => {
      const stats = breaker.getStats();
      expect(stats.state).toBe(CircuitState.CLOSED);
      expect(stats.failures).toBe(0);
      expect(stats.successes).toBe(0);
      expect(stats.totalRequests).toBe(0);
    });
  });
  
  describe('Success handling', () => {
    it('should execute successful operations normally', async () => {
      const result = await breaker.execute(() => Promise.resolve('success'));
      
      expect(result).toBe('success');
      const stats = breaker.getStats();
      expect(stats.state).toBe(CircuitState.CLOSED);
      expect(stats.totalRequests).toBe(1);
      expect(stats.totalSuccesses).toBe(1);
      expect(stats.totalFailures).toBe(0);
    });
    
    it('should remain closed with successful operations', async () => {
      // Execute multiple successful operations
      for (let i = 0; i < 5; i++) {
        await breaker.execute(() => Promise.resolve(i));
      }
      
      const stats = breaker.getStats();
      expect(stats.state).toBe(CircuitState.CLOSED);
      expect(stats.totalSuccesses).toBe(5);
    });
  });
  
  describe('Failure handling', () => {
    it('should count failures', async () => {
      try {
        await breaker.execute(() => Promise.reject(new Error('test error')));
      } catch (e) {
        // Expected
      }
      
      const stats = breaker.getStats();
      expect(stats.failures).toBe(1);
      expect(stats.totalFailures).toBe(1);
      expect(stats.state).toBe(CircuitState.CLOSED);
    });
    
    it('should open after threshold failures', async () => {
      // Fail 3 times (threshold)
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('test error')));
        } catch (e) {
          // Expected
        }
      }
      
      const stats = breaker.getStats();
      expect(stats.state).toBe(CircuitState.OPEN);
      expect(stats.failures).toBe(3);
    });
    
    it('should throw immediately when OPEN', async () => {
      // Force open
      breaker.forceOpen();
      
      await expect(
        breaker.execute(() => Promise.resolve('should not execute'))
      ).rejects.toThrow('Circuit breaker is OPEN for test-service');
      
      const stats = breaker.getStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.totalSuccesses).toBe(0);
    });
  });
  
  describe('Half-open state', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    
    afterEach(() => {
      jest.useRealTimers();
    });
    
    it('should transition to HALF_OPEN after reset timeout', async () => {
      // Open the circuit
      breaker.forceOpen();
      expect(breaker.getStats().state).toBe(CircuitState.OPEN);
      
      // Wait for reset timeout
      jest.advanceTimersByTime(1100); // 1.1 seconds
      
      // Should be able to execute now (half-open)
      const promise = breaker.execute(() => Promise.resolve('success'));
      
      // The state changes to HALF_OPEN when we check if it's open
      expect(breaker.isOpen()).toBe(false);
      expect(breaker.getStats().state).toBe(CircuitState.HALF_OPEN);
      
      await promise;
    });
    
    it('should close after success threshold in HALF_OPEN', async () => {
      // Open then wait for half-open
      breaker.forceOpen();
      jest.advanceTimersByTime(1100);
      
      // Need 2 successes to close
      await breaker.execute(() => Promise.resolve('success1'));
      expect(breaker.getStats().state).toBe(CircuitState.HALF_OPEN);
      
      await breaker.execute(() => Promise.resolve('success2'));
      expect(breaker.getStats().state).toBe(CircuitState.CLOSED);
    });
    
    it('should reopen on failure in HALF_OPEN', async () => {
      // Open then wait for half-open
      breaker.forceOpen();
      jest.advanceTimersByTime(1100);
      
      // First request should work (half-open)
      expect(breaker.isOpen()).toBe(false);
      
      // Failure should reopen
      try {
        await breaker.execute(() => Promise.reject(new Error('fail')));
      } catch (e) {
        // Expected
      }
      
      expect(breaker.getStats().state).toBe(CircuitState.OPEN);
    });
  });
  
  describe('Window-based failure tracking', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    
    afterEach(() => {
      jest.useRealTimers();
    });
    
    it('should forget old failures outside window', async () => {
      // Add 2 failures
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch (e) {
          // Expected
        }
      }
      
      expect(breaker.getStats().failures).toBe(2);
      
      // Wait past the window
      jest.advanceTimersByTime(5100); // 5.1 seconds
      
      // Add one more failure - should only count this one
      try {
        await breaker.execute(() => Promise.reject(new Error('fail')));
      } catch (e) {
        // Expected
      }
      
      // Should still be closed (only 1 failure in window)
      expect(breaker.getStats().state).toBe(CircuitState.CLOSED);
      expect(breaker.getStats().failures).toBe(1);
    });
  });
  
  describe('Manual controls', () => {
    it('should allow manual reset', () => {
      // Add some state
      breaker.forceOpen();
      const beforeStats = breaker.getStats();
      expect(beforeStats.state).toBe(CircuitState.OPEN);
      
      // Reset
      breaker.reset();
      
      const afterStats = breaker.getStats();
      expect(afterStats.state).toBe(CircuitState.CLOSED);
      expect(afterStats.failures).toBe(0);
      expect(afterStats.successes).toBe(0);
      expect(afterStats.lastFailureTime).toBeUndefined();
    });
    
    it('should allow forcing closed', () => {
      breaker.forceOpen();
      expect(breaker.getStats().state).toBe(CircuitState.OPEN);
      
      breaker.forceClosed();
      expect(breaker.getStats().state).toBe(CircuitState.CLOSED);
    });
  });
  
  describe('Statistics', () => {
    it('should track all metrics', async () => {
      // Use a circuit breaker with a longer window to ensure failures are counted
      const testBreaker = new CircuitBreaker('stats-test', {
        failureThreshold: 10,
        resetTimeout: 1000,
        successThreshold: 2,
        windowSize: 60000 // 1 minute window to ensure failures stay in window
      });
      
      // Mix of successes and failures
      await testBreaker.execute(() => Promise.resolve('s1'));
      
      try {
        await testBreaker.execute(() => Promise.reject(new Error('f1')));
      } catch (e) {
        // Expected
      }
      
      // Check stats immediately after failure
      let stats = testBreaker.getStats();
      expect(stats.failures).toBe(1);
      expect(stats.lastFailureTime).toBeDefined();
      
      // Execute another success
      await testBreaker.execute(() => Promise.resolve('s2'));
      
      // After a success, failures counter is reset (standard circuit breaker behavior)
      stats = testBreaker.getStats();
      expect(stats.totalRequests).toBe(3);
      expect(stats.totalSuccesses).toBe(2);
      expect(stats.totalFailures).toBe(1);
      expect(stats.failures).toBe(0); // Reset after success
      expect(stats.lastFailureTime).toBeDefined(); // But lastFailureTime is preserved
    });
  });
});

describe('CircuitBreakerManager', () => {
  let manager: CircuitBreakerManager;
  
  beforeEach(() => {
    manager = new CircuitBreakerManager();
  });
  
  describe('Breaker management', () => {
    it('should create and return breakers', () => {
      const breaker1 = manager.getBreaker('service1');
      const breaker2 = manager.getBreaker('service2');
      
      expect(breaker1).toBeDefined();
      expect(breaker2).toBeDefined();
      expect(breaker1).not.toBe(breaker2);
    });
    
    it('should return same breaker for same name', () => {
      const breaker1 = manager.getBreaker('service1');
      const breaker2 = manager.getBreaker('service1');
      
      expect(breaker1).toBe(breaker2);
    });
    
    it('should accept custom config', async () => {
      const config: CircuitBreakerConfig = {
        failureThreshold: 10,
        resetTimeout: 5000,
        successThreshold: 3,
        windowSize: 10000
      };
      
      const breaker = manager.getBreaker('custom', config);
      
      // Open the breaker with less than 10 failures (should stay closed)
      for (let i = 0; i < 5; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch (e) {
          // Expected
        }
      }
      
      expect(breaker.getStats().state).toBe(CircuitState.CLOSED);
    });
  });
  
  describe('Aggregate operations', () => {
    it('should get all breakers', () => {
      manager.getBreaker('service1');
      manager.getBreaker('service2');
      manager.getBreaker('service3');
      
      const allBreakers = manager.getAllBreakers();
      expect(allBreakers.size).toBe(3);
      expect(allBreakers.has('service1')).toBe(true);
      expect(allBreakers.has('service2')).toBe(true);
      expect(allBreakers.has('service3')).toBe(true);
    });
    
    it('should get all stats', () => {
      const breaker1 = manager.getBreaker('service1');
      const breaker2 = manager.getBreaker('service2');
      
      // Add some state
      breaker1.forceOpen();
      
      // Execute and catch the promise to avoid unhandled rejection
      breaker2.execute(() => Promise.resolve('ok')).catch(() => {});
      
      const allStats = manager.getAllStats();
      
      expect(allStats.service1.state).toBe(CircuitState.OPEN);
      expect(allStats.service2.state).toBe(CircuitState.CLOSED);
      expect(allStats.service2.totalRequests).toBe(1);
    });
    
    it('should reset all breakers', () => {
      const breaker1 = manager.getBreaker('service1');
      const breaker2 = manager.getBreaker('service2');
      
      // Open both
      breaker1.forceOpen();
      breaker2.forceOpen();
      
      // Reset all
      manager.resetAll();
      
      const allStats = manager.getAllStats();
      expect(allStats.service1.state).toBe(CircuitState.CLOSED);
      expect(allStats.service2.state).toBe(CircuitState.CLOSED);
    });
  });
}); 