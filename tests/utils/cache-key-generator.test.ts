import { CacheKeyGenerator, generateCacheKey } from '../../src/utils/cache-key-generator';

describe('CacheKeyGenerator', () => {
  describe('generateKey', () => {
    it('should generate consistent keys for the same parameters', () => {
      const key1 = CacheKeyGenerator.generateKey('api', 'search', { query: 'test', limit: 10 });
      const key2 = CacheKeyGenerator.generateKey('api', 'search', { query: 'test', limit: 10 });
      
      expect(key1).toBe(key2);
    });
    
    it('should generate different keys for different parameters', () => {
      const key1 = CacheKeyGenerator.generateKey('api', 'search', { query: 'test1' });
      const key2 = CacheKeyGenerator.generateKey('api', 'search', { query: 'test2' });
      
      expect(key1).not.toBe(key2);
    });
    
    it('should ignore parameter order', () => {
      const key1 = CacheKeyGenerator.generateKey('api', 'search', { 
        query: 'test', 
        limit: 10, 
        sort: 'date' 
      });
      const key2 = CacheKeyGenerator.generateKey('api', 'search', { 
        sort: 'date', 
        query: 'test', 
        limit: 10 
      });
      
      expect(key1).toBe(key2);
    });
    
    it('should ignore null and undefined values', () => {
      const key1 = CacheKeyGenerator.generateKey('api', 'search', { 
        query: 'test', 
        nullValue: null, 
        undefinedValue: undefined 
      });
      const key2 = CacheKeyGenerator.generateKey('api', 'search', { query: 'test' });
      
      expect(key1).toBe(key2);
    });
    
    it('should use hash for long parameter strings', () => {
      const longParams = {
        query: 'a'.repeat(100),
        description: 'b'.repeat(100),
        metadata: { data: 'c'.repeat(50) }
      };
      
      const key = CacheKeyGenerator.generateKey('api', 'search', longParams);
      
      // Should contain a hash instead of full parameters
      expect(key).toMatch(/^api:search:[a-f0-9]{16}$/);
    });
    
    it('should handle nested objects consistently', () => {
      const key1 = CacheKeyGenerator.generateKey('api', 'search', {
        filters: { category: 'tech', tags: ['javascript', 'typescript'] }
      });
      const key2 = CacheKeyGenerator.generateKey('api', 'search', {
        filters: { tags: ['typescript', 'javascript'], category: 'tech' }
      });
      
      expect(key1).toBe(key2);
    });
    
    it('should sanitize special characters in values', () => {
      const key = CacheKeyGenerator.generateKey('api', 'search', {
        query: 'test@#$%^&*()'
      });
      
      expect(key).toBe('api:search:query=test_________');
    });
    
    it('should handle empty parameters', () => {
      const key = CacheKeyGenerator.generateKey('api', 'search');
      
      expect(key).toBe('api:search');
    });
  });
  
  describe('generateSearchKey', () => {
    it('should normalize query to lowercase', () => {
      const key1 = CacheKeyGenerator.generateSearchKey('hackernews', 'JavaScript');
      const key2 = CacheKeyGenerator.generateSearchKey('hackernews', 'javascript');
      
      expect(key1).toBe(key2);
    });
    
    it('should trim whitespace from query', () => {
      const key1 = CacheKeyGenerator.generateSearchKey('reddit', '  test  ');
      const key2 = CacheKeyGenerator.generateSearchKey('reddit', 'test');
      
      expect(key1).toBe(key2);
    });
    
    it('should include additional options', () => {
      const key1 = CacheKeyGenerator.generateSearchKey('hackernews', 'test', { limit: 50 });
      const key2 = CacheKeyGenerator.generateSearchKey('hackernews', 'test', { limit: 100 });
      
      expect(key1).not.toBe(key2);
    });
    
    it('should handle different APIs', () => {
      const key1 = CacheKeyGenerator.generateSearchKey('hackernews', 'test');
      const key2 = CacheKeyGenerator.generateSearchKey('reddit', 'test');
      
      expect(key1).not.toBe(key2);
      expect(key1).toContain('hackernews');
      expect(key2).toContain('reddit');
    });
  });
  
  describe('generateSessionKey', () => {
    it('should create session-specific keys', () => {
      const key = CacheKeyGenerator.generateSessionKey('session123', 'search');
      
      expect(key).toBe('session:session123:search');
    });
    
    it('should include parameters', () => {
      const key = CacheKeyGenerator.generateSessionKey('session123', 'search', {
        page: 2,
        limit: 20
      });
      
      expect(key).toContain('page=2');
      expect(key).toContain('limit=20');
    });
  });
  
  describe('generateUserKey', () => {
    it('should create user-specific keys', () => {
      const key = CacheKeyGenerator.generateUserKey('user456', 'preferences');
      
      expect(key).toBe('user:user456:preferences');
    });
    
    it('should handle user resources with parameters', () => {
      const key = CacheKeyGenerator.generateUserKey('user456', 'searches', {
        filter: 'recent'
      });
      
      expect(key).toContain('filter=recent');
    });
  });
  
  describe('generateCompositeKey', () => {
    it('should combine multiple parts', () => {
      const key = CacheKeyGenerator.generateCompositeKey(['api', 'v2', 'users', '123']);
      
      expect(key).toBe('api:v2:users:123');
    });
    
    it('should filter empty parts', () => {
      const key = CacheKeyGenerator.generateCompositeKey(['api', '', 'users', null as any, '123']);
      
      expect(key).toBe('api:users:123');
    });
    
    it('should sanitize parts', () => {
      const key = CacheKeyGenerator.generateCompositeKey(['api/v2', 'users@123']);
      
      expect(key).toBe('api_v2:users_123');
    });
    
    it('should throw on empty parts array', () => {
      expect(() => CacheKeyGenerator.generateCompositeKey([])).toThrow();
      expect(() => CacheKeyGenerator.generateCompositeKey(['', null as any])).toThrow();
    });
  });
  
  describe('generateTimeBasedKey', () => {
    const fixedDate = new Date('2025-01-09T14:30:45.000Z');
    const timestamp = fixedDate.getTime();
    
    it('should generate minute-based keys', () => {
      const key = CacheKeyGenerator.generateTimeBasedKey('stats', 'views', 'minute', timestamp);
      
      expect(key).toBe('stats:views:20250109_1430');
    });
    
    it('should generate hour-based keys', () => {
      const key = CacheKeyGenerator.generateTimeBasedKey('stats', 'views', 'hour', timestamp);
      
      expect(key).toBe('stats:views:20250109_14');
    });
    
    it('should generate day-based keys', () => {
      const key = CacheKeyGenerator.generateTimeBasedKey('stats', 'views', 'day', timestamp);
      
      expect(key).toBe('stats:views:20250109');
    });
    
    it('should default to hour granularity', () => {
      const key = CacheKeyGenerator.generateTimeBasedKey('stats', 'views', undefined, timestamp);
      
      expect(key).toBe('stats:views:20250109_14');
    });
    
    it('should use current time if not specified', () => {
      const key = CacheKeyGenerator.generateTimeBasedKey('stats', 'views', 'day');
      
      expect(key).toMatch(/^stats:views:\d{8}$/);
    });
  });
  
  describe('parseKey', () => {
    it('should parse standard keys', () => {
      const parsed = CacheKeyGenerator.parseKey('api:search:query=test:limit=10');
      
      expect(parsed).toEqual({
        namespace: 'api',
        identifier: 'search',
        params: 'query=test:limit=10'
      });
    });
    
    it('should handle keys without parameters', () => {
      const parsed = CacheKeyGenerator.parseKey('api:health');
      
      expect(parsed).toEqual({
        namespace: 'api',
        identifier: 'health',
        params: ''
      });
    });
    
    it('should handle malformed keys', () => {
      const parsed = CacheKeyGenerator.parseKey('simplekey');
      
      expect(parsed).toEqual({
        params: 'simplekey'
      });
    });
    
    it('should handle keys with colons in parameters', () => {
      const parsed = CacheKeyGenerator.parseKey('session:abc123:search:time=10:30:00');
      
      expect(parsed).toEqual({
        namespace: 'session',
        identifier: 'abc123',
        params: 'search:time=10:30:00'
      });
    });
  });
  
  describe('convenience function', () => {
    it('should work the same as the class method', () => {
      const key1 = generateCacheKey('api', 'search', { query: 'test' });
      const key2 = CacheKeyGenerator.generateKey('api', 'search', { query: 'test' });
      
      expect(key1).toBe(key2);
    });
  });
  
  describe('edge cases', () => {
    it('should handle very long strings', () => {
      const longString = 'x'.repeat(1000);
      const key = CacheKeyGenerator.generateKey('api', 'search', { query: longString });
      
      // Should use hash
      expect(key).toMatch(/^api:search:[a-f0-9]{16}$/);
    });
    
    it('should handle circular references', () => {
      const obj: any = { a: 1 };
      obj.circular = obj;
      
      // Should throw when trying to stringify
      expect(() => CacheKeyGenerator.generateKey('api', 'search', obj)).toThrow();
    });
    
    it('should handle arrays consistently', () => {
      const key1 = CacheKeyGenerator.generateKey('api', 'search', {
        tags: ['b', 'a', 'c']
      });
      const key2 = CacheKeyGenerator.generateKey('api', 'search', {
        tags: ['c', 'b', 'a']
      });
      
      expect(key1).toBe(key2); // Arrays are sorted
    });
    
    it('should handle different data types', () => {
      const key = CacheKeyGenerator.generateKey('api', 'search', {
        string: 'test',
        number: 123,
        boolean: true,
        date: new Date('2025-01-09').toISOString(),
        array: [1, 2, 3],
        object: { nested: 'value' }
      });
      
      expect(key).toContain('string=test');
      expect(key).toContain('number=123');
      expect(key).toContain('boolean=true');
    });
  });
}); 