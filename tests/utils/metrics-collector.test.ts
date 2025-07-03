import { MetricsCollector } from '../../src/utils/metrics-collector';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;
  
  beforeEach(() => {
    collector = new MetricsCollector();
    jest.useFakeTimers({
      doNotFake: ['nextTick', 'setImmediate']
    });
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });
  
  describe('Basic Metric Recording', () => {
    it('should record cache hits and misses', () => {
      collector.recordCacheHit('hackernews', true);
      collector.recordCacheHit('hackernews', false);
      collector.recordCacheHit('reddit', true);
      
      const hits = collector.getMetrics('cache.hit');
      const misses = collector.getMetrics('cache.miss');
      
      expect(hits).toHaveLength(2);
      expect(misses).toHaveLength(1);
      expect(hits[0].labels?.api).toBe('hackernews');
      expect(hits[1].labels?.api).toBe('reddit');
    });
    
    it('should record cache latency', () => {
      collector.recordCacheHit('hackernews', true, 5.5);
      collector.recordCacheHit('reddit', false, 12.3);
      
      const latencies = collector.getMetrics('cache.latency');
      expect(latencies).toHaveLength(2);
      expect(latencies[0].value).toBe(5.5);
      expect(latencies[1].value).toBe(12.3);
    });
    
    it('should record rate limit events', () => {
      collector.recordRateLimit('hackernews', false);
      collector.recordRateLimit('hackernews', true, 1000);
      collector.recordRateLimit('reddit', false);
      
      const allowed = collector.getMetrics('ratelimit.allowed');
      const limited = collector.getMetrics('ratelimit.limited');
      const waitTimes = collector.getMetrics('ratelimit.wait_time');
      
      expect(allowed).toHaveLength(2);
      expect(limited).toHaveLength(1);
      expect(waitTimes).toHaveLength(1);
      expect(waitTimes[0].value).toBe(1000);
    });
    
    it('should record API latency and requests', () => {
      collector.recordLatency('hackernews', 'search', 150);
      collector.recordLatency('reddit', 'search', 200);
      
      const latencies = collector.getMetrics('api.latency');
      const requests = collector.getMetrics('api.request');
      
      expect(latencies).toHaveLength(2);
      expect(requests).toHaveLength(2);
      expect(latencies[0].value).toBe(150);
      expect(latencies[0].labels?.api).toBe('hackernews');
    });
    
    it('should record API errors', () => {
      collector.recordError('hackernews', 'search', 'RATE_LIMITED');
      collector.recordError('reddit', 'auth', 'INVALID_TOKEN');
      
      const errors = collector.getMetrics('api.error');
      expect(errors).toHaveLength(2);
      expect(errors[0].labels?.errorCode).toBe('RATE_LIMITED');
    });
    
    it('should record cache size metrics', () => {
      collector.recordCacheSize(1024 * 1024, 100, 5);
      
      const sizeBytes = collector.getMetrics('cache.size.bytes');
      const entries = collector.getMetrics('cache.size.entries');
      const evictions = collector.getMetrics('cache.evictions');
      
      expect(sizeBytes[0].value).toBe(1024 * 1024);
      expect(entries[0].value).toBe(100);
      expect(evictions[0].value).toBe(5);
    });
  });
  
  describe('Metric Point Management', () => {
    it('should limit stored points to maxPoints', () => {
      // Record more than maxPoints (1000)
      for (let i = 0; i < 1100; i++) {
        collector.record('test.metric', i);
      }
      
      const points = collector.getMetrics('test.metric');
      expect(points).toHaveLength(1000);
      expect(points[0].value).toBe(100); // First 100 should be dropped
      expect(points[999].value).toBe(1099);
    });
    
    it('should filter metrics by timestamp', () => {
      // Manually record at specific timestamps
      const time1 = 1000000;
      const time2 = 1001000;
      const time3 = 1002000;
      
      // Override Date.now for each recording
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(time1)
        .mockReturnValueOnce(time2)
        .mockReturnValueOnce(time3);
      
      collector.record('test.metric', 1);
      collector.record('test.metric', 2);
      collector.record('test.metric', 3);
      
      const allPoints = collector.getMetrics('test.metric');
      const recentPoints = collector.getMetrics('test.metric', time2); // Get metrics from time2 onwards
      
      expect(allPoints).toHaveLength(3);
      expect(recentPoints).toHaveLength(2); // Should include metrics 2 and 3
      expect(recentPoints[0].value).toBe(2);
      expect(recentPoints[1].value).toBe(3);
    });
  });
  
  describe('Summary Statistics', () => {
    it('should calculate correct summary stats', () => {
      const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      values.forEach(v => collector.record('test.metric', v));
      
      const summary = collector.getSummary('test.metric');
      
      expect(summary.count).toBe(10);
      expect(summary.sum).toBe(550);
      expect(summary.avg).toBe(55);
      expect(summary.min).toBe(10);
      expect(summary.max).toBe(100);
      expect(summary.p95).toBe(100); // 95th percentile of 10 values
    });
    
    it('should handle empty metrics', () => {
      const summary = collector.getSummary('nonexistent.metric');
      
      expect(summary.count).toBe(0);
      expect(summary.sum).toBe(0);
      expect(summary.avg).toBe(0);
      expect(summary.min).toBe(0);
      expect(summary.max).toBe(0);
      expect(summary.p95).toBe(0);
    });
    
    it('should respect time window', () => {
      // Old data
      collector.record('test.metric', 10);
      collector.record('test.metric', 20);
      
      // Advance time beyond window
      jest.advanceTimersByTime(3700000); // 61 minutes
      
      // Recent data
      collector.record('test.metric', 30);
      collector.record('test.metric', 40);
      
      const summary = collector.getSummary('test.metric', 3600000); // 1 hour window
      
      expect(summary.count).toBe(2);
      expect(summary.avg).toBe(35);
    });
  });
  
  describe('Cache Metrics', () => {
    it('should calculate cache hit rate correctly', () => {
      // 3 hits, 2 misses = 60% hit rate
      collector.recordCacheHit('hackernews', true);
      collector.recordCacheHit('hackernews', true);
      collector.recordCacheHit('hackernews', false);
      collector.recordCacheHit('reddit', true);
      collector.recordCacheHit('reddit', false);
      
      const metrics = collector.getCacheMetrics();
      
      expect(metrics.hitRate).toBeCloseTo(0.6);
      expect(metrics.totalHits).toBe(3);
      expect(metrics.totalMisses).toBe(2);
      expect(metrics.totalRequests).toBe(5);
    });
    
    it('should include latency stats', () => {
      collector.recordCacheHit('hackernews', true, 5);
      collector.recordCacheHit('hackernews', true, 10);
      collector.recordCacheHit('hackernews', false, 15);
      
      const metrics = collector.getCacheMetrics();
      
      expect(metrics.avgLatency).toBe(10);
      expect(metrics.p95Latency).toBe(15);
    });
  });
  
  describe('Rate Limit Metrics', () => {
    it('should track rate limits by API', () => {
      // HN: 2 allowed, 1 limited
      collector.recordRateLimit('hackernews', false);
      collector.recordRateLimit('hackernews', false);
      collector.recordRateLimit('hackernews', true);
      
      // Reddit: 1 allowed, 2 limited
      collector.recordRateLimit('reddit', false);
      collector.recordRateLimit('reddit', true);
      collector.recordRateLimit('reddit', true);
      
      const metrics = collector.getRateLimitMetrics();
      
      expect(metrics.totalAllowed).toBe(3);
      expect(metrics.totalLimited).toBe(3);
      expect(metrics.limitRate).toBeCloseTo(0.5);
      
      expect(metrics.byApi.hackernews.allowed).toBe(2);
      expect(metrics.byApi.hackernews.limited).toBe(1);
      expect(metrics.byApi.hackernews.rate).toBeCloseTo(0.333);
      
      expect(metrics.byApi.reddit.allowed).toBe(1);
      expect(metrics.byApi.reddit.limited).toBe(2);
      expect(metrics.byApi.reddit.rate).toBeCloseTo(0.667);
    });
  });
  
  describe('API Metrics', () => {
    it('should track API performance metrics', () => {
      // Record some requests with latencies
      collector.recordLatency('hackernews', 'search', 100);
      collector.recordLatency('hackernews', 'search', 150);
      collector.recordLatency('hackernews', 'search', 200);
      
      collector.recordLatency('reddit', 'search', 200);
      collector.recordLatency('reddit', 'search', 300);
      
      // Record some errors
      collector.recordError('hackernews', 'search');
      collector.recordError('reddit', 'search');
      
      const metrics = collector.getAPIMetrics();
      
      expect(metrics.totalRequests).toBe(5);
      expect(metrics.errorRate).toBeCloseTo(0.4); // 2 errors / 5 requests
      expect(metrics.avgLatency).toBe(190); // (100+150+200+200+300)/5
      
      expect(metrics.byApi.hackernews.requests).toBe(3);
      expect(metrics.byApi.hackernews.errors).toBe(1);
      expect(metrics.byApi.hackernews.avgLatency).toBe(150);
      
      expect(metrics.byApi.reddit.requests).toBe(2);
      expect(metrics.byApi.reddit.errors).toBe(1);
      expect(metrics.byApi.reddit.avgLatency).toBe(250);
    });
    
    it('should calculate p95 latency correctly', () => {
      // 20 requests to get meaningful p95
      const latencies = Array.from({ length: 20 }, (_, i) => (i + 1) * 10);
      latencies.forEach(latency => {
        collector.recordLatency('hackernews', 'search', latency);
      });
      
      const metrics = collector.getAPIMetrics();
      
      expect(metrics.p95Latency).toBe(200); // 95th percentile of 20 values
      expect(metrics.byApi.hackernews.p95Latency).toBe(200);
    });
  });
  
  describe('Report Generation', () => {
    it('should generate text report', () => {
      // Add some data
      collector.recordCacheHit('hackernews', true, 5);
      collector.recordCacheHit('hackernews', false, 10);
      collector.recordRateLimit('hackernews', false);
      collector.recordRateLimit('hackernews', true);
      collector.recordLatency('hackernews', 'search', 150);
      collector.recordError('hackernews', 'search');
      collector.recordCacheSize(5 * 1024 * 1024, 50, 2);
      
      const report = collector.exportReport();
      
      expect(report).toContain('# Metrics Report');
      expect(report).toContain('## Cache Performance');
      expect(report).toContain('Hit Rate: 50.00%');
      expect(report).toContain('## Rate Limiting');
      expect(report).toContain('Limit Rate: 50.00%');
      expect(report).toContain('## API Performance');
      expect(report).toContain('Error Rate: 100.00%');
      expect(report).toContain('## Cache Size');
      expect(report).toContain('Current Size: 5.00 MB');
    });
    
    it('should generate JSON export', () => {
      collector.recordCacheHit('hackernews', true);
      collector.recordRateLimit('reddit', false);
      collector.recordLatency('hackernews', 'search', 100);
      
      const json = collector.exportJSON();
      
      expect(json).toHaveProperty('timestamp');
      expect(json).toHaveProperty('window');
      expect(json).toHaveProperty('uptimeMs');
      expect(json).toHaveProperty('cache');
      expect(json).toHaveProperty('rateLimit');
      expect(json).toHaveProperty('api');
      expect(json).toHaveProperty('size');
      
      expect(json.cache.totalHits).toBe(1);
      expect(json.rateLimit.totalAllowed).toBe(1);
      expect(json.api.totalRequests).toBe(1);
    });
  });
  
  describe('Reset Functionality', () => {
    it('should reset all metrics', () => {
      // Add some metrics
      collector.recordCacheHit('hackernews', true);
      collector.recordRateLimit('reddit', false);
      collector.recordLatency('hackernews', 'search', 100);
      
      // Verify they exist
      expect(collector.getMetrics('cache.hit')).toHaveLength(1);
      expect(collector.getMetrics('ratelimit.allowed')).toHaveLength(1);
      expect(collector.getMetrics('api.latency')).toHaveLength(1);
      
      // Reset
      collector.reset();
      
      // Verify all cleared
      expect(collector.getMetrics('cache.hit')).toHaveLength(0);
      expect(collector.getMetrics('ratelimit.allowed')).toHaveLength(0);
      expect(collector.getMetrics('api.latency')).toHaveLength(0);
      
      // Verify can record new metrics
      collector.recordCacheHit('hackernews', false);
      expect(collector.getMetrics('cache.miss')).toHaveLength(1);
    });
  });
}); 