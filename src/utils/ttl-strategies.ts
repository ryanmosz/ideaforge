/**
 * TTL (Time To Live) strategies for intelligent cache expiration
 */

export interface TTLContext {
  /** Type of content being cached */
  type: 'search' | 'metadata' | 'health';
  /** API source (hackernews, reddit, etc.) */
  api: string;
  /** Search query if applicable */
  query?: string;
  /** Number of results returned */
  resultCount?: number;
  /** Whether this is a popular query */
  isPopular?: boolean;
  /** Timestamp for time-based adjustments */
  timestamp?: number;
}

export interface TTLStrategy {
  /** Calculate TTL in milliseconds based on context */
  calculate(context: TTLContext): number;
}

/**
 * Dynamic TTL strategy that adjusts based on multiple factors
 */
export class DynamicTTLStrategy implements TTLStrategy {
  private baseTTLs = {
    search: {
      hackernews: 3600000,  // 1 hour
      reddit: 1800000,      // 30 minutes (more dynamic content)
      default: 3600000      // 1 hour
    },
    metadata: {
      default: 86400000     // 24 hours
    },
    health: {
      default: 60000        // 1 minute
    }
  };
  
  calculate(context: TTLContext): number {
    let ttl = this.getBaseTTL(context);
    
    // Adjust based on result count
    if (context.resultCount !== undefined) {
      if (context.resultCount === 0) {
        // Cache empty results for less time (might get results later)
        ttl *= 0.5;
      } else if (context.resultCount > 50) {
        // Cache large result sets longer (less likely to change dramatically)
        ttl *= 1.5;
      }
    }
    
    // Adjust for popular queries
    if (context.isPopular) {
      // Cache popular queries longer to reduce API load
      ttl *= 2;
    }
    
    // Adjust based on time of day
    if (context.timestamp) {
      const hour = new Date(context.timestamp).getHours();
      if (hour >= 9 && hour <= 17) {
        // Shorter cache during business hours (more activity)
        ttl *= 0.75;
      } else {
        // Longer cache during off hours
        ttl *= 1.25;
      }
    }
    
    // Apply limits
    const minTTL = 300000;    // 5 minutes minimum
    const maxTTL = 86400000;  // 24 hours maximum
    
    return Math.max(minTTL, Math.min(maxTTL, Math.round(ttl)));
  }
  
  private getBaseTTL(context: TTLContext): number {
    const typeConfig = this.baseTTLs[context.type];
    if (!typeConfig) {
      return 3600000; // Default 1 hour
    }
    
    if (typeof typeConfig === 'object' && context.api in typeConfig) {
      return (typeConfig as any)[context.api];
    }
    
    return (typeConfig as any).default || 3600000;
  }
}

/**
 * Query-based TTL strategy that uses query patterns to determine cache duration
 */
export class QueryBasedTTLStrategy implements TTLStrategy {
  private queryPatterns = [
    // Time-sensitive queries
    { pattern: /\b(latest|recent|today|now|current|breaking)\b/i, ttl: 300000 },      // 5 minutes
    { pattern: /\b(trending|hot|popular|viral)\b/i, ttl: 600000 },                    // 10 minutes
    { pattern: /\b(yesterday|week|weekly)\b/i, ttl: 3600000 },                        // 1 hour
    { pattern: /\b(month|monthly)\b/i, ttl: 21600000 },                               // 6 hours
    
    // Static content queries
    { pattern: /\b(tutorial|guide|documentation|docs|how.?to)\b/i, ttl: 86400000 },   // 24 hours
    { pattern: /\b(comparison|vs|versus|compare)\b/i, ttl: 43200000 },                // 12 hours
    { pattern: /\b(definition|what.?is|explain)\b/i, ttl: 86400000 },                 // 24 hours
    { pattern: /\b(history|historical|evolution)\b/i, ttl: 604800000 },               // 7 days
    
    // Dynamic content queries
    { pattern: /\b(bug|issue|error|problem|fix)\b/i, ttl: 1800000 },                  // 30 minutes
    { pattern: /\b(release|update|version|changelog)\b/i, ttl: 3600000 },             // 1 hour
    { pattern: /\b(news|announcement)\b/i, ttl: 1800000 },                            // 30 minutes
    
    // Quality/opinion queries
    { pattern: /\b(best|top|recommended|favorite)\b/i, ttl: 7200000 },                // 2 hours
    { pattern: /\b(review|opinion|thoughts|experience)\b/i, ttl: 10800000 },          // 3 hours
    
    // Technical queries
    { pattern: /\b(performance|optimization|speed)\b/i, ttl: 21600000 },              // 6 hours
    { pattern: /\b(security|vulnerability|cve)\b/i, ttl: 1800000 },                   // 30 minutes
    { pattern: /\b(api|endpoint|integration)\b/i, ttl: 43200000 },                    // 12 hours
  ];
  
  calculate(context: TTLContext): number {
    if (!context.query) {
      return 3600000; // Default 1 hour
    }
    
    // Check query patterns
    for (const { pattern, ttl } of this.queryPatterns) {
      if (pattern.test(context.query)) {
        return ttl;
      }
    }
    
    // Default based on query complexity
    const queryWords = context.query.split(/\s+/).length;
    
    if (queryWords === 1) {
      // Single word queries are often broad topics
      return 7200000; // 2 hours
    } else if (queryWords <= 3) {
      // Short queries
      return 3600000; // 1 hour
    } else if (queryWords > 6) {
      // Complex/specific queries change less frequently
      return 10800000; // 3 hours
    }
    
    return 3600000; // 1 hour default
  }
}

/**
 * Combined TTL strategy that uses multiple strategies
 */
export class CombinedTTLStrategy implements TTLStrategy {
  constructor(
    private strategies: TTLStrategy[] = [
      new QueryBasedTTLStrategy(),
      new DynamicTTLStrategy()
    ]
  ) {}
  
  calculate(context: TTLContext): number {
    const ttls = this.strategies.map(strategy => strategy.calculate(context));
    
    // Use the shortest TTL (most conservative approach)
    return Math.min(...ttls);
  }
}

/**
 * Time-aware TTL strategy for different times of day/week
 */
export class TimeAwareTTLStrategy implements TTLStrategy {
  calculate(context: TTLContext): number {
    const now = new Date(context.timestamp || Date.now());
    const hour = now.getHours();
    const day = now.getDay();
    
    let baseTTL = 3600000; // 1 hour default
    
    // Weekday vs weekend
    if (day === 0 || day === 6) {
      // Weekend - less activity, longer cache
      baseTTL *= 1.5;
    }
    
    // Time of day adjustments
    if (hour >= 22 || hour < 6) {
      // Night time - much less activity
      baseTTL *= 2;
    } else if (hour >= 9 && hour <= 11) {
      // Morning peak hours - high activity
      baseTTL *= 0.5;
    } else if (hour >= 13 && hour <= 15) {
      // After lunch peak - high activity
      baseTTL *= 0.75;
    }
    
    // API-specific adjustments
    if (context.api === 'reddit') {
      // Reddit is more active in evenings
      if (hour >= 18 && hour <= 22) {
        baseTTL *= 0.5;
      }
    } else if (context.api === 'hackernews') {
      // HN is more active during work hours
      if (hour >= 9 && hour <= 17 && day >= 1 && day <= 5) {
        baseTTL *= 0.75;
      }
    }
    
    // Apply limits
    const minTTL = 300000;    // 5 minutes
    const maxTTL = 86400000;  // 24 hours
    
    return Math.max(minTTL, Math.min(maxTTL, Math.round(baseTTL)));
  }
}

/**
 * Factory for creating TTL strategies
 */
export class TTLStrategyFactory {
  static createDefault(): TTLStrategy {
    return new CombinedTTLStrategy();
  }
  
  static createDynamic(): TTLStrategy {
    return new DynamicTTLStrategy();
  }
  
  static createQueryBased(): TTLStrategy {
    return new QueryBasedTTLStrategy();
  }
  
  static createTimeAware(): TTLStrategy {
    return new TimeAwareTTLStrategy();
  }
  
  static createCombined(strategies: TTLStrategy[]): TTLStrategy {
    return new CombinedTTLStrategy(strategies);
  }
} 