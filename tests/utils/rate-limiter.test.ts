import { 
  RateLimiter, 
  APIRateLimitManager, 
  API_RATE_LIMITS,
  rateLimitManager 
} from '../../src/utils/rate-limiter';

describe('RateLimiter', () => {
  let limiter: RateLimiter;
  
  beforeEach(() => {
    limiter = new RateLimiter({
      maxRequests: 10,
      windowMs: 1000, // 1 second window for testing
      maxRequestsPerSecond: 3
    });
  });
  
  afterEach(() => {
    limiter.reset();
  });
  
  describe('checkLimit', () => {
    it('should allow requests within limit', async () => {
      const check = await limiter.checkLimit();
      expect(check.allowed).toBe(true);
      expect(check.remaining).toBe(10);
      expect(check.waitTime).toBe(0);
    });
    
    it('should track requests and update remaining count', async () => {
      limiter.recordRequest();
      limiter.recordRequest();
      
      const check = await limiter.checkLimit();
      expect(check.allowed).toBe(true);
      expect(check.remaining).toBe(8);
    });
    
    it('should deny requests when window limit is reached', async () => {
      // Fill up the limit
      for (let i = 0; i < 10; i++) {
        limiter.recordRequest();
      }
      
      const check = await limiter.checkLimit();
      expect(check.allowed).toBe(false);
      expect(check.remaining).toBe(0);
      expect(check.waitTime).toBeGreaterThan(0);
    });
    
    it('should enforce per-second limit', async () => {
      // Record 3 requests quickly
      limiter.recordRequest();
      limiter.recordRequest();
      limiter.recordRequest();
      
      const check = await limiter.checkLimit();
      expect(check.allowed).toBe(false);
      expect(check.remaining).toBe(7); // Still have window capacity
      expect(check.waitTime).toBeGreaterThan(0);
      expect(check.waitTime).toBeLessThanOrEqual(1000);
    });
    
    it('should clean old requests outside window', async () => {
      limiter.recordRequest();
      limiter.recordRequest();
      
      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const check = await limiter.checkLimit();
      expect(check.allowed).toBe(true);
      expect(check.remaining).toBe(10);
    });
    
    it('should handle different keys independently', async () => {
      limiter.recordRequest('api1');
      limiter.recordRequest('api1');
      limiter.recordRequest('api2');
      
      const check1 = await limiter.checkLimit('api1');
      const check2 = await limiter.checkLimit('api2');
      
      expect(check1.remaining).toBe(8);
      expect(check2.remaining).toBe(9);
    });
  });
  
  describe('recordRejection', () => {
    it('should block requests after rejection', async () => {
      limiter.recordRejection('default', 5000);
      
      const check = await limiter.checkLimit();
      expect(check.allowed).toBe(false);
      expect(check.waitTime).toBeGreaterThan(0);
      expect(check.waitTime).toBeLessThanOrEqual(5000);
    });
    
    it('should unblock after retry period', async () => {
      limiter.recordRejection('default', 100);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const check = await limiter.checkLimit();
      expect(check.allowed).toBe(true);
    });
  });
  
  describe('waitForSlot', () => {
    it('should wait until slot is available', async () => {
      // Fill up per-second limit
      limiter.recordRequest();
      limiter.recordRequest();
      limiter.recordRequest();
      
      const start = Date.now();
      await limiter.waitForSlot();
      const elapsed = Date.now() - start;
      
      // Should have waited some time
      expect(elapsed).toBeGreaterThan(0);
      
      // Should now be able to make request
      const check = await limiter.checkLimit();
      expect(check.allowed).toBe(true);
    });
  });
  
  describe('getStats', () => {
    it('should return accurate statistics', () => {
      limiter.recordRequest();
      limiter.recordRequest();
      
      const stats = limiter.getStats();
      expect(stats.currentRequests).toBe(2);
      expect(stats.isBlocked).toBe(false);
      expect(stats.oldestRequest).toBeDefined();
      expect(stats.newestRequest).toBeDefined();
    });
    
    it('should reflect blocked state in stats', () => {
      limiter.recordRejection('default', 5000);
      
      const stats = limiter.getStats();
      expect(stats.isBlocked).toBe(true);
    });
  });
  
  describe('reset', () => {
    it('should clear all state', () => {
      limiter.recordRequest();
      limiter.recordRequest();
      limiter.reset();
      
      const stats = limiter.getStats();
      expect(stats.currentRequests).toBe(0);
      expect(stats.isBlocked).toBe(false);
    });
    
    it('should reset specific keys', () => {
      limiter.recordRequest('key1');
      limiter.recordRequest('key2');
      
      limiter.reset('key1');
      
      const stats1 = limiter.getStats('key1');
      const stats2 = limiter.getStats('key2');
      
      expect(stats1.currentRequests).toBe(0);
      expect(stats2.currentRequests).toBe(1);
    });
  });
});

describe('APIRateLimitManager', () => {
  let manager: APIRateLimitManager;
  
  beforeEach(() => {
    manager = new APIRateLimitManager();
  });
  
  afterEach(() => {
    manager.resetAll();
  });
  
  describe('getLimiter', () => {
    it('should create limiters with correct config', () => {
      const hnLimiter = manager.getLimiter('hackerNews');
      const redditLimiter = manager.getLimiter('reddit');
      const defaultLimiter = manager.getLimiter('unknown');
      
      // Check they are created
      expect(hnLimiter).toBeDefined();
      expect(redditLimiter).toBeDefined();
      expect(defaultLimiter).toBeDefined();
    });
    
    it('should return same limiter instance for same API', () => {
      const limiter1 = manager.getLimiter('hackerNews');
      const limiter2 = manager.getLimiter('hackerNews');
      
      expect(limiter1).toBe(limiter2);
    });
  });
  
  describe('checkAndWait', () => {
    it('should check limit and record request', async () => {
      await manager.checkAndWait('hackerNews');
      
      const stats = manager.getAllStats();
      expect(stats.hackerNews.currentRequests).toBe(1);
    });
  });
  
  describe('handleRateLimitError', () => {
    it('should handle retry-after header in seconds', () => {
      const error = {
        response: {
          headers: {
            'retry-after': '60'
          }
        }
      };
      
      manager.handleRateLimitError('reddit', error);
      
      const stats = manager.getAllStats();
      expect(stats.reddit.isBlocked).toBe(true);
    });
    
    it('should handle retry-after header as date', () => {
      const futureDate = new Date(Date.now() + 30000);
      const error = {
        response: {
          headers: {
            'retry-after': futureDate.toUTCString()
          }
        }
      };
      
      manager.handleRateLimitError('reddit', error);
      
      const stats = manager.getAllStats();
      expect(stats.reddit.isBlocked).toBe(true);
    });
    
    it('should handle x-ratelimit-reset header', () => {
      const resetTime = Math.floor(Date.now() / 1000) + 60;
      const error = {
        response: {
          headers: {
            'x-ratelimit-reset': resetTime.toString()
          }
        }
      };
      
      manager.handleRateLimitError('reddit', error);
      
      const stats = manager.getAllStats();
      expect(stats.reddit.isBlocked).toBe(true);
    });
    
    it('should use default retry time when no headers', () => {
      const error = { response: {} };
      
      manager.handleRateLimitError('reddit', error);
      
      const stats = manager.getAllStats();
      expect(stats.reddit.isBlocked).toBe(true);
    });
  });
  
  describe('getAllStats', () => {
    it('should return stats for all limiters', async () => {
      await manager.checkAndWait('hackerNews');
      await manager.checkAndWait('reddit');
      
      const stats = manager.getAllStats();
      
      expect(stats).toHaveProperty('hackerNews');
      expect(stats).toHaveProperty('reddit');
      expect(stats.hackerNews.currentRequests).toBe(1);
      expect(stats.reddit.currentRequests).toBe(1);
    });
  });
  
  describe('resetAll', () => {
    it('should reset all limiters', async () => {
      await manager.checkAndWait('hackerNews');
      await manager.checkAndWait('reddit');
      
      manager.resetAll();
      
      const stats = manager.getAllStats();
      expect(stats.hackerNews.currentRequests).toBe(0);
      expect(stats.reddit.currentRequests).toBe(0);
    });
  });
});

describe('rateLimitManager singleton', () => {
  it('should export a singleton instance', () => {
    expect(rateLimitManager).toBeDefined();
    expect(rateLimitManager).toBeInstanceOf(APIRateLimitManager);
  });
});

describe('API_RATE_LIMITS', () => {
  it('should have correct HackerNews limits', () => {
    expect(API_RATE_LIMITS.hackerNews).toEqual({
      maxRequests: 10000,
      windowMs: 3600000,
      maxRequestsPerSecond: 10
    });
  });
  
  it('should have correct Reddit limits', () => {
    expect(API_RATE_LIMITS.reddit).toEqual({
      maxRequests: 60,
      windowMs: 600000,
      maxRequestsPerSecond: 1
    });
  });
  
  it('should have default limits', () => {
    expect(API_RATE_LIMITS.default).toEqual({
      maxRequests: 1000,
      windowMs: 3600000,
      maxRequestsPerSecond: 5
    });
  });
}); 