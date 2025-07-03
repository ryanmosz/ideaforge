import {
  DynamicTTLStrategy,
  QueryBasedTTLStrategy,
  CombinedTTLStrategy,
  TimeAwareTTLStrategy,
  TTLStrategyFactory,
  TTLContext
} from '../../src/utils/ttl-strategies';

describe('TTL Strategies', () => {
  describe('DynamicTTLStrategy', () => {
    let strategy: DynamicTTLStrategy;
    
    beforeEach(() => {
      strategy = new DynamicTTLStrategy();
    });
    
    it('should return base TTL for search queries', () => {
      const context: TTLContext = {
        type: 'search',
        api: 'hackernews'
      };
      
      const ttl = strategy.calculate(context);
      expect(ttl).toBe(3600000); // 1 hour
    });
    
    it('should return shorter TTL for Reddit', () => {
      const context: TTLContext = {
        type: 'search',
        api: 'reddit'
      };
      
      const ttl = strategy.calculate(context);
      expect(ttl).toBe(1800000); // 30 minutes
    });
    
    it('should reduce TTL for empty results', () => {
      const context: TTLContext = {
        type: 'search',
        api: 'hackernews',
        resultCount: 0
      };
      
      const ttl = strategy.calculate(context);
      expect(ttl).toBe(1800000); // 30 minutes (half of base)
    });
    
    it('should increase TTL for large result sets', () => {
      const context: TTLContext = {
        type: 'search',
        api: 'hackernews',
        resultCount: 100
      };
      
      const ttl = strategy.calculate(context);
      expect(ttl).toBe(5400000); // 1.5 hours
    });
    
    it('should double TTL for popular queries', () => {
      const context: TTLContext = {
        type: 'search',
        api: 'hackernews',
        isPopular: true
      };
      
      const ttl = strategy.calculate(context);
      expect(ttl).toBe(7200000); // 2 hours
    });
    
    it('should adjust TTL based on time of day', () => {
      // Business hours (10 AM)
      const businessHoursContext: TTLContext = {
        type: 'search',
        api: 'hackernews',
        timestamp: new Date('2025-01-09T10:00:00').getTime()
      };
      
      const businessTTL = strategy.calculate(businessHoursContext);
      expect(businessTTL).toBe(2700000); // 45 minutes (0.75x)
      
      // Off hours (10 PM)
      const offHoursContext: TTLContext = {
        type: 'search',
        api: 'hackernews',
        timestamp: new Date('2025-01-09T22:00:00').getTime()
      };
      
      const offTTL = strategy.calculate(offHoursContext);
      expect(offTTL).toBe(4500000); // 1.25 hours
    });
    
    it('should respect minimum TTL', () => {
      const context: TTLContext = {
        type: 'search',
        api: 'hackernews',
        resultCount: 0,
        timestamp: new Date('2025-01-09T10:00:00').getTime() // Business hours
      };
      
      const ttl = strategy.calculate(context);
      expect(ttl).toBe(1350000); // Result of 3600000 * 0.5 * 0.75 = 1350000
    });
    
    it('should respect maximum TTL', () => {
      const context: TTLContext = {
        type: 'search',
        api: 'hackernews',
        resultCount: 100,
        isPopular: true,
        timestamp: new Date('2025-01-09T22:00:00').getTime() // Off hours
      };
      
      const ttl = strategy.calculate(context);
      expect(ttl).toBe(13500000); // Result of 3600000 * 1.5 * 2 * 1.25 = 13500000
    });
    
    it('should handle metadata type', () => {
      const context: TTLContext = {
        type: 'metadata',
        api: 'any'
      };
      
      const ttl = strategy.calculate(context);
      expect(ttl).toBe(86400000); // 24 hours
    });
    
    it('should handle health type', () => {
      const context: TTLContext = {
        type: 'health',
        api: 'any'
      };
      
      const ttl = strategy.calculate(context);
      expect(ttl).toBe(300000); // 5 minutes (minimum TTL enforced)
    });
  });
  
  describe('QueryBasedTTLStrategy', () => {
    let strategy: QueryBasedTTLStrategy;
    
    beforeEach(() => {
      strategy = new QueryBasedTTLStrategy();
    });
    
    it('should return short TTL for time-sensitive queries', () => {
      const queries = ['latest news', 'recent updates', 'today javascript', 'current trends'];
      
      queries.forEach(query => {
        const ttl = strategy.calculate({ type: 'search', api: 'hackernews', query });
        expect(ttl).toBe(300000); // 5 minutes
      });
    });
    
    it('should return short TTL for trending queries', () => {
      const queries = ['trending topics', 'hot discussions', 'viral posts'];
      
      queries.forEach(query => {
        const ttl = strategy.calculate({ type: 'search', api: 'reddit', query });
        expect(ttl).toBe(600000); // 10 minutes
      });
      
      // 'popular now' matches 'popular' pattern first
      const ttl = strategy.calculate({ type: 'search', api: 'reddit', query: 'popular now' });
      expect(ttl).toBe(300000); // 5 minutes (matches 'now' pattern)
    });
    
    it('should return long TTL for tutorial queries', () => {
      const queries = ['javascript tutorial', 'react guide', 'how to docker', 'python documentation'];
      
      queries.forEach(query => {
        const ttl = strategy.calculate({ type: 'search', api: 'hackernews', query });
        expect(ttl).toBe(86400000); // 24 hours
      });
    });
    
    it('should return medium TTL for comparison queries', () => {
      const queries = ['react vs vue', 'python versus java', 'compare frameworks'];
      
      queries.forEach(query => {
        const ttl = strategy.calculate({ type: 'search', api: 'hackernews', query });
        expect(ttl).toBe(43200000); // 12 hours
      });
    });
    
    it('should return short TTL for bug/issue queries', () => {
      const queries = ['bug report', 'error message', 'issue tracker', 'fix problem'];
      
      queries.forEach(query => {
        const ttl = strategy.calculate({ type: 'search', api: 'reddit', query });
        expect(ttl).toBe(1800000); // 30 minutes
      });
    });
    
    it('should handle single word queries', () => {
      const ttl = strategy.calculate({ type: 'search', api: 'hackernews', query: 'javascript' });
      expect(ttl).toBe(7200000); // 2 hours
    });
    
    it('should handle short queries', () => {
      const ttl = strategy.calculate({ type: 'search', api: 'hackernews', query: 'react hooks' });
      expect(ttl).toBe(3600000); // 1 hour
    });
    
    it('should handle complex queries', () => {
      const ttl = strategy.calculate({ 
        type: 'search', 
        api: 'hackernews', 
        query: 'how to implement microservices architecture with docker and kubernetes' 
      });
      expect(ttl).toBe(86400000); // 24 hours (matches 'how to' pattern)
    });
    
    it('should return default TTL for queries without patterns', () => {
      const ttl = strategy.calculate({ 
        type: 'search', 
        api: 'hackernews', 
        query: 'random technical terms' 
      });
      expect(ttl).toBe(3600000); // 1 hour default
    });
    
    it('should return default TTL when no query provided', () => {
      const ttl = strategy.calculate({ type: 'search', api: 'hackernews' });
      expect(ttl).toBe(3600000); // 1 hour
    });
  });
  
  describe('CombinedTTLStrategy', () => {
    let strategy: CombinedTTLStrategy;
    
    beforeEach(() => {
      strategy = new CombinedTTLStrategy();
    });
    
    it('should use the shortest TTL from all strategies', () => {
      const context: TTLContext = {
        type: 'search',
        api: 'hackernews',
        query: 'latest tutorial', // 'latest' = 5 min, 'tutorial' = 24 hours
        timestamp: new Date('2025-01-09T10:00:00').getTime() // Business hours
      };
      
      const ttl = strategy.calculate(context);
      expect(ttl).toBe(300000); // 5 minutes (shortest)
    });
    
    it('should work with custom strategies', () => {
      const customStrategy1 = { calculate: () => 1000000 };
      const customStrategy2 = { calculate: () => 2000000 };
      
      const customCombined = new CombinedTTLStrategy([customStrategy1, customStrategy2]);
      const ttl = customCombined.calculate({ type: 'search', api: 'test' });
      
      expect(ttl).toBe(1000000); // Shortest
    });
  });
  
  describe('TimeAwareTTLStrategy', () => {
    let strategy: TimeAwareTTLStrategy;
    
    beforeEach(() => {
      strategy = new TimeAwareTTLStrategy();
    });
    
    it('should increase TTL on weekends', () => {
      // Saturday
      const weekendContext: TTLContext = {
        type: 'search',
        api: 'hackernews',
        timestamp: new Date('2025-01-11T14:00:00').getTime() // Saturday 2 PM
      };
      
      const ttl = strategy.calculate(weekendContext);
      // Base 3600000 * 1.5 (weekend) * 0.75 (after lunch peak) = 4050000
      expect(ttl).toBe(4050000); 
    });
    
    it('should increase TTL during night time', () => {
      // 3 AM
      const nightContext: TTLContext = {
        type: 'search',
        api: 'hackernews',
        timestamp: new Date('2025-01-09T03:00:00').getTime() // Thursday 3 AM
      };
      
      const ttl = strategy.calculate(nightContext);
      expect(ttl).toBe(7200000); // 2 hours
    });
    
    it('should decrease TTL during morning peak', () => {
      // 10 AM weekday
      const morningContext: TTLContext = {
        type: 'search',
        api: 'hackernews',
        timestamp: new Date('2025-01-09T10:00:00').getTime() // Thursday 10 AM
      };
      
      const ttl = strategy.calculate(morningContext);
      // Base 3600000 * 0.5 (morning peak) * 0.75 (HN work hours) = 1350000
      expect(ttl).toBe(1350000);
    });
    
    it('should adjust for Reddit evening activity', () => {
      // 8 PM
      const eveningContext: TTLContext = {
        type: 'search',
        api: 'reddit',
        timestamp: new Date('2025-01-09T20:00:00').getTime() // Thursday 8 PM
      };
      
      const ttl = strategy.calculate(eveningContext);
      expect(ttl).toBe(1800000); // 30 minutes (0.5x)
    });
    
    it('should adjust for HackerNews work hours', () => {
      // 2 PM weekday
      const workContext: TTLContext = {
        type: 'search',
        api: 'hackernews',
        timestamp: new Date('2025-01-09T14:00:00').getTime() // Thursday 2 PM
      };
      
      const ttl = strategy.calculate(workContext);
      expect(ttl).toBe(2025000); // 0.75x for after lunch peak, then 0.75x for HN work hours
    });
  });
  
  describe('TTLStrategyFactory', () => {
    it('should create default strategy', () => {
      const strategy = TTLStrategyFactory.createDefault();
      expect(strategy).toBeInstanceOf(CombinedTTLStrategy);
    });
    
    it('should create dynamic strategy', () => {
      const strategy = TTLStrategyFactory.createDynamic();
      expect(strategy).toBeInstanceOf(DynamicTTLStrategy);
    });
    
    it('should create query-based strategy', () => {
      const strategy = TTLStrategyFactory.createQueryBased();
      expect(strategy).toBeInstanceOf(QueryBasedTTLStrategy);
    });
    
    it('should create time-aware strategy', () => {
      const strategy = TTLStrategyFactory.createTimeAware();
      expect(strategy).toBeInstanceOf(TimeAwareTTLStrategy);
    });
    
    it('should create combined strategy with custom strategies', () => {
      const strategies = [
        TTLStrategyFactory.createDynamic(),
        TTLStrategyFactory.createQueryBased()
      ];
      
      const combined = TTLStrategyFactory.createCombined(strategies);
      expect(combined).toBeInstanceOf(CombinedTTLStrategy);
    });
  });
}); 