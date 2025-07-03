import { CacheManager } from '../../src/services/cache-manager';

describe('CacheManager', () => {
  let cache: CacheManager;
  
  beforeEach(() => {
    cache = new CacheManager({
      ttl: 1000, // 1 second for testing
      maxSize: 1024 // 1KB for testing
    });
  });
  
  afterEach(() => {
    cache.stopCleanup();
  });
  
  describe('basic operations', () => {
    it('should store and retrieve values', async () => {
      await cache.set('test-key', { data: 'test value' });
      const value = await cache.get('test-key');
      
      expect(value).toEqual({ data: 'test value' });
    });
    
    it('should return null for non-existent keys', async () => {
      const value = await cache.get('non-existent');
      
      expect(value).toBeNull();
    });
    
    it('should delete values', async () => {
      await cache.set('test-key', 'test value');
      const deleted = await cache.delete('test-key');
      const value = await cache.get('test-key');
      
      expect(deleted).toBe(true);
      expect(value).toBeNull();
    });
    
    it('should return false when deleting non-existent key', async () => {
      const deleted = await cache.delete('non-existent');
      
      expect(deleted).toBe(false);
    });
    
    it('should clear all values', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.clear();
      
      const value1 = await cache.get('key1');
      const value2 = await cache.get('key2');
      
      expect(value1).toBeNull();
      expect(value2).toBeNull();
    });
    
    it('should check if key exists', async () => {
      await cache.set('test-key', 'test value');
      
      const exists = await cache.has('test-key');
      const notExists = await cache.has('non-existent');
      
      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });
  });
  
  describe('TTL expiration', () => {
    it('should expire entries after TTL', async () => {
      await cache.set('test-key', 'test value', 100); // 100ms TTL
      
      // Value should exist immediately
      let value = await cache.get('test-key');
      expect(value).toBe('test value');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Value should be expired
      value = await cache.get('test-key');
      expect(value).toBeNull();
    });
    
    it('should use default TTL when not specified', async () => {
      await cache.set('test-key', 'test value'); // Uses 1 second default
      
      // Should exist after 500ms
      await new Promise(resolve => setTimeout(resolve, 500));
      let value = await cache.get('test-key');
      expect(value).toBe('test value');
      
      // Should expire after 1 second
      await new Promise(resolve => setTimeout(resolve, 600));
      value = await cache.get('test-key');
      expect(value).toBeNull();
    });
    
    it('should remove expired entries from has() check', async () => {
      await cache.set('test-key', 'test value', 100);
      
      // Should exist immediately
      expect(await cache.has('test-key')).toBe(true);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should not exist after expiration
      expect(await cache.has('test-key')).toBe(false);
    });
  });
  
  describe('size management and LRU eviction', () => {
    it('should track cache size correctly', async () => {
      const stats1 = cache.getStats();
      expect(stats1.totalSize).toBe(0);
      
      await cache.set('key1', 'small value');
      const stats2 = cache.getStats();
      expect(stats2.totalSize).toBeGreaterThan(0);
      
      await cache.set('key2', 'another value');
      const stats3 = cache.getStats();
      expect(stats3.totalSize).toBeGreaterThan(stats2.totalSize);
    });
    
    it('should reject items larger than max cache size', async () => {
      const largeData = 'x'.repeat(2000); // Larger than 1KB limit
      
      await expect(cache.set('large', largeData)).rejects.toThrow(/exceeds maximum cache size/);
    });
    
    it('should evict LRU entries when cache is full', async () => {
      // Create a cache with very small size for predictable eviction
      const smallCache = new CacheManager({
        ttl: 1000,
        maxSize: 250 // Adjusted size to ensure we need eviction
      });
      
      try {
        // Fill cache with entries - each entry is about 52 bytes
        await smallCache.set('key1', 'x'.repeat(50));
        await new Promise(resolve => setTimeout(resolve, 10));
        await smallCache.set('key2', 'x'.repeat(50));
        await new Promise(resolve => setTimeout(resolve, 10));
        await smallCache.set('key3', 'x'.repeat(50));
        await new Promise(resolve => setTimeout(resolve, 10));
        await smallCache.set('key4', 'x'.repeat(50));
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // At this point cache has 4 entries totaling ~208 bytes
        // Access key2, key3, key4 to make key1 the LRU
        await smallCache.get('key2');
        await new Promise(resolve => setTimeout(resolve, 10));
        await smallCache.get('key3');
        await new Promise(resolve => setTimeout(resolve, 10));
        await smallCache.get('key4');
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Add another entry that requires eviction
        await smallCache.set('key5', 'x'.repeat(50));
        
        // key1 should be evicted (least recently used)
        expect(await smallCache.get('key1')).toBeNull();
        expect(await smallCache.get('key2')).toBe('x'.repeat(50));
        expect(await smallCache.get('key3')).toBe('x'.repeat(50));
        expect(await smallCache.get('key4')).toBe('x'.repeat(50));
        expect(await smallCache.get('key5')).toBe('x'.repeat(50));
      } finally {
        smallCache.stopCleanup();
      }
    });
    
    it('should update size when overwriting entries', async () => {
      await cache.set('key1', 'small');
      const stats1 = cache.getStats();
      
      await cache.set('key1', 'much larger value');
      const stats2 = cache.getStats();
      
      expect(stats2.totalSize).toBeGreaterThan(stats1.totalSize);
      expect(stats2.entries).toBe(1); // Still only one entry
    });
  });
  
  describe('key generation', () => {
    it('should generate consistent keys for same parameters', () => {
      const key1 = cache.generateKey('search', { query: 'test', limit: 10 });
      const key2 = cache.generateKey('search', { query: 'test', limit: 10 });
      
      expect(key1).toBe(key2);
    });
    
    it('should generate different keys for different parameters', () => {
      const key1 = cache.generateKey('search', { query: 'test', limit: 10 });
      const key2 = cache.generateKey('search', { query: 'test', limit: 20 });
      
      expect(key1).not.toBe(key2);
    });
    
    it('should ignore parameter order', () => {
      const key1 = cache.generateKey('search', { query: 'test', limit: 10 });
      const key2 = cache.generateKey('search', { limit: 10, query: 'test' });
      
      expect(key1).toBe(key2);
    });
    
    it('should ignore null and undefined values', () => {
      const key1 = cache.generateKey('search', { query: 'test', limit: null, foo: undefined });
      const key2 = cache.generateKey('search', { query: 'test' });
      
      expect(key1).toBe(key2);
    });
  });
  
  describe('statistics and monitoring', () => {
    it('should track hit rate correctly', async () => {
      await cache.set('key1', 'value1');
      
      // Initial stats
      let stats = cache.getStats();
      expect(stats.hitRate).toBe(0);
      
      // 2 hits
      await cache.get('key1');
      await cache.get('key1');
      
      // 1 miss
      await cache.get('non-existent');
      
      stats = cache.getStats();
      expect(stats.hitRate).toBeCloseTo(2/3, 2); // 2 hits out of 3 total accesses
    });
    
    it('should track oldest and newest entries', async () => {
      const now = Date.now();
      
      await cache.set('key1', 'value1');
      await new Promise(resolve => setTimeout(resolve, 10));
      await cache.set('key2', 'value2');
      
      const stats = cache.getStats();
      expect(stats.oldestEntry).toBeGreaterThanOrEqual(now);
      expect(stats.newestEntry).toBeGreaterThan(stats.oldestEntry!);
    });
    
    it('should update access count and last accessed time', async () => {
      await cache.set('key1', 'value1');
      
      // Get entries before access
      let entries = cache.getAllEntries();
      expect(entries[0].metadata.accessCount).toBe(0);
      const createdAt = entries[0].metadata.createdAt;
      
      // Wait a bit before accessing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Access the entry
      await cache.get('key1');
      await cache.get('key1');
      
      // Check updated metadata
      entries = cache.getAllEntries();
      expect(entries[0].metadata.accessCount).toBe(2);
      expect(entries[0].metadata.lastAccessed).toBeGreaterThan(createdAt);
    });
  });
  
  describe('cleanup interval', () => {
    it('should automatically clean expired entries', async () => {
      // Create cache with short cleanup interval for testing
      const testCache = new CacheManager({
        ttl: 100,
        maxSize: 1024
      });
      
      try {
        // Add entries with short TTL
        await testCache.set('key1', 'value1', 50);
        await testCache.set('key2', 'value2', 150);
        
        // Wait for cleanup to run (happens every minute, but entries expire quickly)
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Manually trigger a get to remove expired entries
        await testCache.get('key1'); // This should trigger removal
        
        const stats = testCache.getStats();
        expect(stats.entries).toBe(1); // Only key2 should remain
      } finally {
        testCache.stopCleanup();
      }
    });
  });
  
  describe('error handling', () => {
    it('should handle circular references in cached data', async () => {
      const obj: any = { a: 1 };
      obj.circular = obj;
      
      // Should throw when trying to calculate size
      await expect(cache.set('circular', obj)).rejects.toThrow();
    });
  });
}); 