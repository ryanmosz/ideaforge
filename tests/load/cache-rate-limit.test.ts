/**
 * Load testing for cache and rate limiting systems
 */

import { SmartCacheManager } from '../../src/services/smart-cache-manager';
import { APIRateLimitManager } from '../../src/utils/rate-limiter';
import { MetricsCollector } from '../../src/utils/metrics-collector';

// Increase test timeout for load tests
jest.setTimeout(60000);

describe('Load Testing', () => {
  let cacheManager: SmartCacheManager;
  let rateLimitManager: APIRateLimitManager;
  let metrics: MetricsCollector;
  
  beforeAll(() => {
    cacheManager = new SmartCacheManager({ 
      maxSize: 50 * 1024 * 1024 // 50MB for testing
    });
    rateLimitManager = new APIRateLimitManager();
    metrics = new MetricsCollector();
  });
  
  afterAll(() => {
    cacheManager.stopCleanup();
  });
  
  describe('Cache Performance', () => {
    it('should handle 1000 concurrent cache operations', async () => {
      const operations = Array(1000).fill(null).map((_, i) => ({
        key: `test-key-${i % 100}`, // 100 unique keys
        data: { index: i, timestamp: Date.now(), data: 'x'.repeat(1000) }
      }));
      
      const startTime = Date.now();
      
      const results = await Promise.all(
        operations.map(async (op) => {
          try {
            // 50% reads, 50% writes
            if (Math.random() > 0.5) {
              await cacheManager.set(op.key, op.data);
              return { type: 'write', success: true };
            } else {
              const data = await cacheManager.get(op.key);
              return { type: 'read', success: true, hit: data !== null };
            }
          } catch (error) {
            return { type: 'error', success: false, error };
          }
        })
      );
      
      const duration = Date.now() - startTime;
      
      const stats = {
        duration,
        opsPerSecond: 1000 / (duration / 1000),
        writes: results.filter(r => r.type === 'write').length,
        reads: results.filter(r => r.type === 'read').length,
        hits: results.filter(r => r.type === 'read' && (r as any).hit).length,
        errors: results.filter(r => !r.success).length
      };
      
      console.log('Cache Load Test Results:', stats);
      
      expect(stats.errors).toBe(0);
      expect(stats.opsPerSecond).toBeGreaterThan(100);
    });
    
    it('should maintain performance with cache eviction', async () => {
      // Fill cache to capacity
      const largeData = 'x'.repeat(1024 * 1024); // 1MB per entry
      
      for (let i = 0; i < 60; i++) {
        await cacheManager.set(`large-${i}`, { data: largeData });
      }
      
      const stats = cacheManager.getStats();
      expect(stats.entries).toBeLessThan(60); // Some entries evicted
      expect(stats.totalSize).toBeLessThanOrEqual(50 * 1024 * 1024);
    });
    
    it('should maintain high hit rate with popular queries', async () => {
      // Reset cache
      await cacheManager.clear();
      
      // Simulate realistic query pattern (Zipf distribution)
      const queries = ['typescript', 'react', 'nodejs', 'python', 'docker'];
      const weights = [0.4, 0.3, 0.15, 0.1, 0.05];
      
      let hits = 0;
      let misses = 0;
      
      for (let i = 0; i < 500; i++) {
        // Select query based on weight
        const rand = Math.random();
        let query = queries[0];
        let cumWeight = 0;
        for (let j = 0; j < weights.length; j++) {
          cumWeight += weights[j];
          if (rand < cumWeight) {
            query = queries[j];
            break;
          }
        }
        
        const key = `search:${query}`;
        const cached = await cacheManager.get(key);
        
        if (cached) {
          hits++;
        } else {
          misses++;
          await cacheManager.setSearchResult('hackernews', query, {
            success: true,
            data: { items: Array(10).fill({ title: query }) }
          }, 10);
        }
      }
      
      const hitRate = hits / (hits + misses);
      console.log(`Cache hit rate: ${(hitRate * 100).toFixed(2)}%`);
      
      expect(hitRate).toBeGreaterThan(0.6); // Expect > 60% hit rate
    });
  });
  
  describe('Rate Limiter Performance', () => {
    it('should handle burst traffic correctly', async () => {
      const requests = Array(50).fill(null);
      const sessionId = `load-test-${Date.now()}`;
      
      const startTime = Date.now();
      let allowed = 0;
      let blocked = 0;
      let totalWaitTime = 0;
      
      for (const _ of requests) {
        try {
          await rateLimitManager.checkAndWait('hackernews', sessionId);
          allowed++;
        } catch (error) {
          const waitTime = Date.now() - Date.now();
          totalWaitTime += waitTime;
          blocked++;
        }
      }
      
      const duration = Date.now() - startTime;
      
      console.log('Rate Limiter Burst Test:', {
        allowed,
        blocked,
        duration,
        avgWaitTime: blocked > 0 ? totalWaitTime / blocked : 0
      });
      
      // Should allow some requests but block others
      expect(allowed).toBeGreaterThan(0);
      expect(allowed).toBeLessThan(50);
    });
    
    it('should handle multi-API rate limiting', async () => {
      const apis = ['hackernews', 'reddit'] as const;
      const requestsPerApi = 30;
      const sessionId = `multi-api-${Date.now()}`;
      
      const results = await Promise.all(
        apis.map(async (api) => {
          const apiResults = [];
          let allowed = 0;
          let blocked = 0;
          
          for (let i = 0; i < requestsPerApi; i++) {
            try {
              await rateLimitManager.checkAndWait(api, sessionId);
              allowed++;
              apiResults.push({
                api,
                timestamp: Date.now(),
                index: i,
                allowed: true
              });
            } catch (error) {
              blocked++;
              apiResults.push({
                api,
                timestamp: Date.now(),
                index: i,
                allowed: false
              });
            }
            
            // Simulate API response time
            await new Promise(resolve => 
              setTimeout(resolve, Math.random() * 100)
            );
          }
          
          return { api, allowed, blocked, results: apiResults };
        })
      );
      
      // Verify rate limits were respected
      results.forEach((apiResult) => {
        console.log(`${apiResult.api} rate limiting:`, {
          allowed: apiResult.allowed,
          blocked: apiResult.blocked,
          rate: (apiResult.allowed / requestsPerApi * 100).toFixed(2) + '%'
        });
        
        // Should have some blocking
        expect(apiResult.blocked).toBeGreaterThan(0);
      });
    });
    
    it('should recover after rate limit window', async () => {
      const sessionId = `recovery-test-${Date.now()}`;
      
      // Hit rate limit
      let blocked = false;
      for (let i = 0; i < 20; i++) {
        try {
          await rateLimitManager.checkAndWait('hackernews', sessionId);
        } catch (error) {
          blocked = true;
          break;
        }
      }
      
      expect(blocked).toBe(true);
      
      // Wait for window to reset
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Should be able to make requests again
      let allowed = false;
      try {
        await rateLimitManager.checkAndWait('hackernews', sessionId);
        allowed = true;
      } catch (error) {
        allowed = false;
      }
      
      expect(allowed).toBe(true);
    });
  });
  
  describe('Combined Load Test', () => {
    it('should handle realistic mixed workload', async () => {
      const workloadDuration = 10000; // 10 seconds
      const endTime = Date.now() + workloadDuration;
      const sessionId = `mixed-load-${Date.now()}`;
      
      const stats = {
        cacheHits: 0,
        cacheMisses: 0,
        rateLimited: 0,
        apiCalls: 0,
        errors: 0,
        operations: 0
      };
      
      // Popular queries for realistic distribution
      const popularQueries = [
        'javascript', 'typescript', 'react', 'vue', 'angular',
        'nodejs', 'python', 'golang', 'rust', 'docker'
      ];
      
      // Run mixed workload
      const tasks: Promise<void>[] = [];
      
      while (Date.now() < endTime) {
        const operation = Math.random();
        stats.operations++;
        
        if (operation < 0.6) {
          // 60% cache operations
          tasks.push(
            (async () => {
              const query = popularQueries[Math.floor(Math.random() * popularQueries.length)];
              const key = cacheManager.generateKey('search', { q: query });
              
              const cached = await cacheManager.get(key);
              
              if (cached) {
                stats.cacheHits++;
                metrics.recordCacheHit('test', true);
              } else {
                stats.cacheMisses++;
                metrics.recordCacheHit('test', false);
                
                // Simulate API call
                try {
                  await rateLimitManager.checkAndWait('hackernews', sessionId);
                  stats.apiCalls++;
                  metrics.recordLatency('hackernews', 'search', Math.random() * 200 + 50);
                  
                  // Cache the result
                  await cacheManager.setSearchResult('hackernews', query, {
                    success: true,
                    data: { items: Array(10).fill({ title: query }) }
                  }, 10);
                } catch (error) {
                  stats.rateLimited++;
                  metrics.recordRateLimit('hackernews', true);
                }
              }
            })()
          );
        } else if (operation < 0.9) {
          // 30% new queries
          tasks.push(
            (async () => {
              try {
                await rateLimitManager.checkAndWait('reddit', sessionId);
                stats.apiCalls++;
                metrics.recordLatency('reddit', 'search', Math.random() * 300 + 100);
                
                const query = `new-query-${Date.now()}`;
                await cacheManager.setSearchResult('reddit', query, {
                  success: true,
                  data: { items: Array(5).fill({ title: query }) }
                }, 5);
              } catch (error) {
                stats.errors++;
                metrics.recordError('reddit', 'search', 'RATE_LIMITED');
              }
            })()
          );
        } else {
          // 10% metrics check
          tasks.push(
            (async () => {
              const cacheStats = cacheManager.getStats();
              
              // Record cache size
              metrics.recordCacheSize(
                cacheStats.totalSize, 
                cacheStats.entries, 
                cacheStats.evictions
              );
            })()
          );
        }
        
        // Add some delay between operations
        await new Promise(resolve => 
          setTimeout(resolve, Math.random() * 50)
        );
      }
      
      // Wait for all tasks to complete
      await Promise.all(tasks);
      
      console.log('Combined Load Test Results:', stats);
      
      // Generate metrics report
      const report = metrics.exportReport(workloadDuration);
      console.log('\nMetrics Report:\n', report);
      
      // Verify system remained stable
      expect(stats.errors).toBeLessThan(stats.operations * 0.05); // Less than 5% errors
      expect(stats.cacheHits).toBeGreaterThan(0);
      
      // Check cache effectiveness
      const hitRate = stats.cacheHits / (stats.cacheHits + stats.cacheMisses);
      console.log(`Final cache hit rate: ${(hitRate * 100).toFixed(2)}%`);
      expect(hitRate).toBeGreaterThan(0.3); // At least 30% hit rate
      
      // Check rate limiting effectiveness
      const rateLimitRate = stats.rateLimited / (stats.apiCalls + stats.rateLimited);
      console.log(`Rate limit rate: ${(rateLimitRate * 100).toFixed(2)}%`);
      
      // Verify memory usage is reasonable
      const memUsage = process.memoryUsage();
      console.log(`Memory usage: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      expect(memUsage.heapUsed).toBeLessThan(500 * 1024 * 1024); // Less than 500MB
    });
  });
  
  describe('Performance Benchmarks', () => {
    it('should meet performance targets', async () => {
      const benchmarks = {
        cacheGetLatency: [] as number[],
        cacheSetLatency: [] as number[],
        rateLimitCheckLatency: [] as number[]
      };
      
      // Benchmark cache operations
      for (let i = 0; i < 1000; i++) {
        const key = `bench-${i}`;
        const data = { value: i, timestamp: Date.now() };
        
        // Benchmark set
        const setStart = Date.now();
        await cacheManager.set(key, data);
        benchmarks.cacheSetLatency.push(Date.now() - setStart);
        
        // Benchmark get
        const getStart = Date.now();
        await cacheManager.get(key);
        benchmarks.cacheGetLatency.push(Date.now() - getStart);
      }
      
      // Benchmark rate limit checks
      const sessionId = `benchmark-${Date.now()}`;
      for (let i = 0; i < 100; i++) {
        const checkStart = Date.now();
        try {
          await rateLimitManager.checkAndWait('hackernews', sessionId);
        } catch (error) {
          // Expected when rate limited
        }
        benchmarks.rateLimitCheckLatency.push(Date.now() - checkStart);
      }
      
      // Calculate statistics
      const stats = {
        cacheGet: {
          avg: benchmarks.cacheGetLatency.reduce((a, b) => a + b, 0) / benchmarks.cacheGetLatency.length,
          p95: benchmarks.cacheGetLatency.sort((a, b) => a - b)[Math.floor(benchmarks.cacheGetLatency.length * 0.95)]
        },
        cacheSet: {
          avg: benchmarks.cacheSetLatency.reduce((a, b) => a + b, 0) / benchmarks.cacheSetLatency.length,
          p95: benchmarks.cacheSetLatency.sort((a, b) => a - b)[Math.floor(benchmarks.cacheSetLatency.length * 0.95)]
        },
        rateLimitCheck: {
          avg: benchmarks.rateLimitCheckLatency.reduce((a, b) => a + b, 0) / benchmarks.rateLimitCheckLatency.length,
          p95: benchmarks.rateLimitCheckLatency.sort((a, b) => a - b)[Math.floor(benchmarks.rateLimitCheckLatency.length * 0.95)]
        }
      };
      
      console.log('Performance Benchmarks:', stats);
      
      // Verify performance targets
      expect(stats.cacheGet.avg).toBeLessThan(5); // < 5ms average
      expect(stats.cacheGet.p95).toBeLessThan(10); // < 10ms p95
      expect(stats.cacheSet.avg).toBeLessThan(10); // < 10ms average
      expect(stats.cacheSet.p95).toBeLessThan(20); // < 20ms p95
      expect(stats.rateLimitCheck.avg).toBeLessThan(5); // < 5ms average
    });
  });
}); 