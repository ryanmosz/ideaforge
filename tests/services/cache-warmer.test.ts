import { CacheWarmer, WarmingConfig } from '../../src/services/cache-warmer';
import { SmartCacheManager } from '../../src/services/smart-cache-manager';
import { N8nClient } from '../../src/services/n8n-client';

// Mock dependencies
jest.mock('../../src/services/smart-cache-manager');
jest.mock('../../src/services/n8n-client');

describe('CacheWarmer', () => {
  let cacheWarmer: CacheWarmer;
  let mockCacheManager: jest.Mocked<SmartCacheManager>;
  let mockN8nClient: jest.Mocked<N8nClient>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Setup mocks
    mockCacheManager = new SmartCacheManager() as jest.Mocked<SmartCacheManager>;
    mockN8nClient = new N8nClient() as jest.Mocked<N8nClient>;
    
    // Default mock implementations
    mockCacheManager.getPopularQueries = jest.fn().mockReturnValue([]);
    mockCacheManager.getAllEntries = jest.fn().mockReturnValue([]);
    mockCacheManager.getStats = jest.fn().mockReturnValue({ entries: 0 });
    
    mockN8nClient.searchHackerNews = jest.fn().mockResolvedValue({ 
      success: true, 
      data: { items: [] },
      metadata: {
        source: 'hackernews',
        query: '',
        timestamp: new Date().toISOString(),
        cached: false,
        requestDuration: 100
      }
    });
    mockN8nClient.searchReddit = jest.fn().mockResolvedValue({ 
      success: true, 
      data: { items: [] },
      metadata: {
        source: 'reddit',
        query: '',
        timestamp: new Date().toISOString(),
        cached: false,
        requestDuration: 100
      }
    });
    
    cacheWarmer = new CacheWarmer(mockCacheManager, mockN8nClient);
  });
  
  afterEach(() => {
    cacheWarmer.stop();
    jest.useRealTimers();
  });
  
  describe('constructor', () => {
    it('should initialize with default config', () => {
      expect(cacheWarmer.isEnabled()).toBe(true);
      expect(cacheWarmer.getStats()).toEqual({
        totalWarmed: 0,
        totalRefreshed: 0,
        failedWarmings: 0,
        lastWarmingCycle: null,
        activeQueries: 0
      });
    });
    
    it('should accept custom config', () => {
      const customConfig: Partial<WarmingConfig> = {
        interval: 10000,
        enabled: false,
        maxQueriesPerCycle: 5
      };
      
      const customWarmer = new CacheWarmer(mockCacheManager, mockN8nClient, customConfig);
      expect(customWarmer.isEnabled()).toBe(false);
    });
  });
  
  describe('start/stop', () => {
    it('should start warming service', async () => {
      // Spy on runWarmingCycle to verify it's called
      const runWarmingCycleSpy = jest.spyOn(cacheWarmer, 'runWarmingCycle');
      
      cacheWarmer.start();
      
      // Verify runWarmingCycle was called
      expect(runWarmingCycleSpy).toHaveBeenCalled();
      
      // Wait for the warming cycle to complete
      await runWarmingCycleSpy.mock.results[0].value;
      
      expect(mockCacheManager.getPopularQueries).toHaveBeenCalled();
      expect(mockCacheManager.getAllEntries).toHaveBeenCalled();
    });
    
    it('should not start if already running', () => {
      cacheWarmer.start();
      jest.clearAllMocks();
      
      cacheWarmer.start();
      expect(mockCacheManager.getPopularQueries).not.toHaveBeenCalled();
    });
    
    it('should not start if disabled', () => {
      cacheWarmer.updateConfig({ enabled: false });
      cacheWarmer.start();
      
      expect(mockCacheManager.getPopularQueries).not.toHaveBeenCalled();
    });
    
    it('should schedule periodic warming', async () => {
      const runWarmingCycleSpy = jest.spyOn(cacheWarmer, 'runWarmingCycle');
      
      cacheWarmer.start();
      
      // Wait for initial cycle
      await runWarmingCycleSpy.mock.results[0].value;
      
      jest.clearAllMocks();
      
      // Fast forward 5 minutes
      jest.advanceTimersByTime(5 * 60 * 1000);
      
      expect(mockCacheManager.getPopularQueries).toHaveBeenCalled();
    });
    
    it('should stop warming service', () => {
      cacheWarmer.start();
      cacheWarmer.stop();
      jest.clearAllMocks();
      
      // Fast forward - should not trigger warming
      jest.advanceTimersByTime(10 * 60 * 1000);
      
      expect(mockCacheManager.getPopularQueries).not.toHaveBeenCalled();
    });
    
    it('should restart when interval changes', async () => {
      const runWarmingCycleSpy = jest.spyOn(cacheWarmer, 'runWarmingCycle');
      
      cacheWarmer.start();
      
      // Wait for initial cycle
      await runWarmingCycleSpy.mock.results[0].value;
      
      jest.clearAllMocks();
      
      cacheWarmer.updateConfig({ interval: 10000 });
      
      // Should have restarted
      expect(runWarmingCycleSpy).toHaveBeenCalled();
    });
  });
  
  describe('warming cycle', () => {
    it('should warm predefined queries', async () => {
      const predefinedQueries = [
        { api: 'hackernews' as const, query: 'typescript', priority: 100 },
        { api: 'reddit' as const, query: 'programming', priority: 90 }
      ];
      
      cacheWarmer.updateConfig({ predefinedQueries });
      await cacheWarmer.runWarmingCycle();
      
      expect(mockN8nClient.searchHackerNews).toHaveBeenCalledWith(
        'typescript',
        expect.stringContaining('cache-warmer-'),
        {}
      );
      expect(mockN8nClient.searchReddit).toHaveBeenCalledWith(
        'programming',
        expect.stringContaining('cache-warmer-'),
        {}
      );
      
      const stats = cacheWarmer.getStats();
      expect(stats.totalWarmed).toBe(2);
      expect(stats.lastWarmingCycle).toBeInstanceOf(Date);
    });
    
    it('should refresh expiring popular queries', async () => {
      const now = Date.now();
      const expiringEntry = {
        key: 'hackernews:search:q=typescript',
        metadata: {
          createdAt: now - 3600000, // 1 hour ago
          expiresAt: now + 900000, // 15 minutes remaining (25% of 1 hour)
          accessCount: 5,
          lastAccessed: now - 60000,
          size: 100
        }
      };
      
      mockCacheManager.getAllEntries.mockReturnValue([expiringEntry]);
      mockCacheManager.getPopularQueries.mockReturnValue([
        { query: 'typescript', count: 5 }
      ]);
      
      await cacheWarmer.runWarmingCycle();
      
      expect(mockN8nClient.searchHackerNews).toHaveBeenCalledWith(
        'typescript',
        expect.any(String),
        {}
      );
      
      const stats = cacheWarmer.getStats();
      expect(stats.totalWarmed).toBe(1);
      expect(stats.totalRefreshed).toBe(1);
    });
    
    it('should skip non-popular expiring queries', async () => {
      const now = Date.now();
      const expiringEntry = {
        key: 'hackernews:search:q=obscure',
        metadata: {
          createdAt: now - 3600000,
          expiresAt: now + 900000,
          accessCount: 1,
          lastAccessed: now - 60000,
          size: 100
        }
      };
      
      mockCacheManager.getAllEntries.mockReturnValue([expiringEntry]);
      mockCacheManager.getPopularQueries.mockReturnValue([
        { query: 'obscure', count: 1 } // Below threshold
      ]);
      
      await cacheWarmer.runWarmingCycle();
      
      expect(mockN8nClient.searchHackerNews).not.toHaveBeenCalled();
    });
    
    it('should respect maxQueriesPerCycle limit', async () => {
      const predefinedQueries = Array.from({ length: 20 }, (_, i) => ({
        api: 'hackernews' as const,
        query: `query${i}`,
        priority: 100 - i
      }));
      
      cacheWarmer.updateConfig({ 
        predefinedQueries,
        maxQueriesPerCycle: 5
      });
      
      await cacheWarmer.runWarmingCycle();
      
      expect(mockN8nClient.searchHackerNews).toHaveBeenCalledTimes(5);
    });
    
    it('should handle failed warmings', async () => {
      mockN8nClient.searchHackerNews.mockResolvedValue({
        success: false,
        data: { items: [] },
        error: { code: 'ERROR', message: 'Failed' },
        metadata: {
          source: 'hackernews',
          query: 'test',
          timestamp: new Date().toISOString(),
          cached: false,
          requestDuration: 0
        }
      });
      
      cacheWarmer.updateConfig({
        predefinedQueries: [
          { api: 'hackernews', query: 'test' }
        ]
      });
      
      await cacheWarmer.runWarmingCycle();
      
      const stats = cacheWarmer.getStats();
      expect(stats.failedWarmings).toBe(1);
      expect(stats.totalWarmed).toBe(0);
    });
    
    it('should skip concurrent warming cycles', async () => {
      // Start a warming cycle
      const firstCycle = cacheWarmer.runWarmingCycle();
      
      // Try to start another
      await cacheWarmer.runWarmingCycle();
      
      // Wait for first to complete
      await firstCycle;
      
      // Should only have called once
      expect(mockCacheManager.getPopularQueries).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('manual warming', () => {
    it('should warm specific queries manually', async () => {
      const queries = [
        { api: 'hackernews' as const, query: 'react' },
        { api: 'reddit' as const, query: 'webdev', options: { subreddits: ['webdev'] } }
      ];
      
      await cacheWarmer.warmQueries(queries);
      
      expect(mockN8nClient.searchHackerNews).toHaveBeenCalledWith(
        'react',
        expect.stringContaining('cache-warmer-'),
        {}
      );
      expect(mockN8nClient.searchReddit).toHaveBeenCalledWith(
        'webdev',
        expect.stringContaining('cache-warmer-'),
        { subreddits: ['webdev'] }
      );
    });
    
    it('should handle partial failures in manual warming', async () => {
      mockN8nClient.searchHackerNews.mockResolvedValueOnce({
        success: false,
        data: { items: [] },
        metadata: {
          source: 'hackernews',
          query: 'fail',
          timestamp: new Date().toISOString(),
          cached: false,
          requestDuration: 0
        }
      });
      mockN8nClient.searchReddit.mockResolvedValueOnce({
        success: true,
        data: { items: [] },
        metadata: {
          source: 'reddit',
          query: 'success',
          timestamp: new Date().toISOString(),
          cached: false,
          requestDuration: 100
        }
      });
      
      await cacheWarmer.warmQueries([
        { api: 'hackernews', query: 'fail' },
        { api: 'reddit', query: 'success' }
      ]);
      
      // Should complete without throwing
      expect(mockN8nClient.searchHackerNews).toHaveBeenCalled();
      expect(mockN8nClient.searchReddit).toHaveBeenCalled();
    });
  });
  
  describe('configuration', () => {
    it('should update configuration', () => {
      cacheWarmer.updateConfig({
        enabled: false,
        minPopularityScore: 5
      });
      
      expect(cacheWarmer.isEnabled()).toBe(false);
    });
  });
  
  describe('statistics', () => {
    it('should track warming statistics', async () => {
      cacheWarmer.updateConfig({
        predefinedQueries: [
          { api: 'hackernews', query: 'test1' },
          { api: 'reddit', query: 'test2' }
        ]
      });
      
      await cacheWarmer.runWarmingCycle();
      
      const stats = cacheWarmer.getStats();
      expect(stats.totalWarmed).toBe(2);
      expect(stats.failedWarmings).toBe(0);
      expect(stats.lastWarmingCycle).toBeInstanceOf(Date);
    });
    
    it('should reset statistics', async () => {
      cacheWarmer.updateConfig({
        predefinedQueries: [{ api: 'hackernews', query: 'test' }]
      });
      
      await cacheWarmer.runWarmingCycle();
      cacheWarmer.resetStats();
      
      const stats = cacheWarmer.getStats();
      expect(stats.totalWarmed).toBe(0);
      expect(stats.totalRefreshed).toBe(0);
      expect(stats.failedWarmings).toBe(0);
      expect(stats.lastWarmingCycle).toBeNull();
    });
    
    it('should include active queries count', () => {
      mockCacheManager.getStats.mockReturnValue({ 
        entries: 42,
        totalSize: 1000,
        hitRate: 0.75
      });
      
      const stats = cacheWarmer.getStats();
      expect(stats.activeQueries).toBe(42);
    });
  });
  
  describe('edge cases', () => {
    it('should handle malformed cache keys', async () => {
      mockCacheManager.getAllEntries.mockReturnValue([
        {
          key: 'invalid-key-format',
          metadata: {
            createdAt: Date.now() - 1000,
            expiresAt: Date.now() + 1000,
            accessCount: 1,
            lastAccessed: Date.now(),
            size: 100
          }
        }
      ]);
      
      // Should not throw
      await cacheWarmer.runWarmingCycle();
      
      expect(mockN8nClient.searchHackerNews).not.toHaveBeenCalled();
      expect(mockN8nClient.searchReddit).not.toHaveBeenCalled();
    });
    
    it('should handle API errors gracefully', async () => {
      mockN8nClient.searchHackerNews.mockRejectedValue(new Error('Network error'));
      
      cacheWarmer.updateConfig({
        predefinedQueries: [{ api: 'hackernews', query: 'test' }]
      });
      
      await cacheWarmer.runWarmingCycle();
      
      const stats = cacheWarmer.getStats();
      expect(stats.failedWarmings).toBe(1);
    });
    
    it('should skip already expired entries', async () => {
      const now = Date.now();
      mockCacheManager.getAllEntries.mockReturnValue([
        {
          key: 'hackernews:search:q=expired',
          metadata: {
            createdAt: now - 7200000, // 2 hours ago
            expiresAt: now - 1000, // Already expired
            accessCount: 10,
            lastAccessed: now - 3600000,
            size: 100
          }
        }
      ]);
      
      await cacheWarmer.runWarmingCycle();
      
      expect(mockN8nClient.searchHackerNews).not.toHaveBeenCalled();
    });
  });
}); 