/**
 * Smart cache manager with dynamic TTL strategies and popularity tracking
 */

import { CacheManager, CacheOptions } from './cache-manager';
import { TTLStrategy, TTLContext, TTLStrategyFactory } from '../utils/ttl-strategies';

export interface SmartCacheOptions extends CacheOptions {
  /** TTL strategy to use */
  ttlStrategy?: TTLStrategy;
  /** Threshold for considering a query popular */
  popularityThreshold?: number;
  /** Whether to track query popularity */
  trackPopularity?: boolean;
}

/**
 * Extended cache manager with intelligent TTL and popularity tracking
 */
export class SmartCacheManager extends CacheManager {
  private ttlStrategy: TTLStrategy;
  private popularQueries: Map<string, number> = new Map();
  private queryTimestamps: Map<string, number[]> = new Map();
  private popularityThreshold: number;
  private trackPopularity: boolean;
  private maxCacheSize: number;
  
  constructor(options: SmartCacheOptions = {}) {
    super(options);
    
    this.ttlStrategy = options.ttlStrategy || TTLStrategyFactory.createDefault();
    this.popularityThreshold = options.popularityThreshold || 10;
    this.trackPopularity = options.trackPopularity !== false;
    this.maxCacheSize = options.maxSize || 100 * 1024 * 1024; // Default 100MB
  }
  
  /**
   * Set a value with smart TTL based on context
   */
  async setWithSmartTTL<T>(
    key: string, 
    data: T, 
    context: TTLContext
  ): Promise<void> {
    // Track query popularity if enabled
    if (this.trackPopularity && context.query) {
      this.trackQueryPopularity(context.query);
      
      // Check if query is popular
      const count = this.popularQueries.get(context.query) || 0;
      if (count >= this.popularityThreshold) {
        context.isPopular = true;
      }
    }
    
    // Calculate TTL based on context
    const ttl = this.ttlStrategy.calculate(context);
    
    console.log(`[SmartCache] Setting key "${key}" with TTL: ${ttl}ms (${(ttl / 60000).toFixed(1)} minutes)`);
    
    await this.set(key, data, ttl);
  }
  
  /**
   * Set a search result with automatic context
   */
  async setSearchResult<T>(
    api: 'hackernews' | 'reddit',
    query: string,
    data: T,
    resultCount?: number
  ): Promise<void> {
    const key = this.generateKey(`${api}:search`, { q: query.toLowerCase().trim() });
    
    const context: TTLContext = {
      type: 'search',
      api,
      query,
      resultCount,
      timestamp: Date.now()
    };
    
    await this.setWithSmartTTL(key, data, context);
  }
  
  /**
   * Track query popularity
   */
  private trackQueryPopularity(query: string): void {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Increment query count
    const count = this.popularQueries.get(normalizedQuery) || 0;
    this.popularQueries.set(normalizedQuery, count + 1);
    
    // Track timestamps for trend analysis
    if (!this.queryTimestamps.has(normalizedQuery)) {
      this.queryTimestamps.set(normalizedQuery, []);
    }
    const timestamps = this.queryTimestamps.get(normalizedQuery)!;
    timestamps.push(Date.now());
    
    // Keep only last 100 timestamps
    if (timestamps.length > 100) {
      timestamps.shift();
    }
  }
  
  /**
   * Get popular queries sorted by frequency
   */
  getPopularQueries(threshold?: number): Array<{ query: string; count: number }> {
    const minCount = threshold || this.popularityThreshold;
    
    return Array.from(this.popularQueries.entries())
      .filter(([_, count]) => count >= minCount)
      .sort((a, b) => b[1] - a[1])
      .map(([query, count]) => ({ query, count }));
  }
  
  /**
   * Get trending queries (popular in recent time window)
   */
  getTrendingQueries(windowMs: number = 3600000): Array<{ query: string; recentCount: number }> {
    const cutoff = Date.now() - windowMs;
    const trendingQueries: Array<{ query: string; recentCount: number }> = [];
    
    this.queryTimestamps.forEach((timestamps, query) => {
      const recentCount = timestamps.filter(ts => ts > cutoff).length;
      if (recentCount >= 3) { // At least 3 queries in the window
        trendingQueries.push({ query, recentCount });
      }
    });
    
    return trendingQueries.sort((a, b) => b.recentCount - a.recentCount);
  }
  
  /**
   * Get cache effectiveness metrics
   */
  getCacheEffectiveness(): {
    hitRate: number;
    popularQueryHitRate: number;
    averageTTL: number;
    cacheUtilization: number;
  } {
    const stats = this.getStats();
    const entries = this.getAllEntries();
    
    // Calculate average TTL
    let totalTTL = 0;
    entries.forEach(entry => {
      const remainingTTL = entry.metadata.expiresAt - Date.now();
      if (remainingTTL > 0) {
        totalTTL += remainingTTL;
      }
    });
    const averageTTL = entries.length > 0 ? totalTTL / entries.length : 0;
    
    // Calculate popular query hit rate
    let popularHits = 0;
    let popularTotal = 0;
    
    this.getPopularQueries().forEach(({ query }) => {
      entries.forEach(entry => {
        if (entry.key.includes(query)) {
          popularHits += entry.metadata.accessCount;
          popularTotal += entry.metadata.accessCount + 1; // Include initial set
        }
      });
    });
    
    const popularQueryHitRate = popularTotal > 0 ? popularHits / popularTotal : 0;
    
    return {
      hitRate: stats.hitRate,
      popularQueryHitRate,
      averageTTL,
      cacheUtilization: stats.totalSize / this.maxCacheSize
    };
  }
  
  /**
   * Clear popularity tracking data
   */
  clearPopularityData(): void {
    this.popularQueries.clear();
    this.queryTimestamps.clear();
  }
  
  /**
   * Export popularity data for analysis
   */
  exportPopularityData(): {
    queries: Array<{ query: string; count: number; lastAccessed: number }>;
    trending: Array<{ query: string; recentCount: number }>;
  } {
    const queries = Array.from(this.popularQueries.entries()).map(([query, count]) => {
      const timestamps = this.queryTimestamps.get(query) || [];
      const lastAccessed = timestamps.length > 0 ? Math.max(...timestamps) : 0;
      
      return { query, count, lastAccessed };
    });
    
    return {
      queries: queries.sort((a, b) => b.count - a.count),
      trending: this.getTrendingQueries()
    };
  }
  
  /**
   * Set the TTL strategy
   */
  setTTLStrategy(strategy: TTLStrategy): void {
    this.ttlStrategy = strategy;
  }
  
  /**
   * Get the current TTL strategy
   */
  getTTLStrategy(): TTLStrategy {
    return this.ttlStrategy;
  }
}

// Export singleton instance with smart features
export const smartCacheManager = new SmartCacheManager(); 