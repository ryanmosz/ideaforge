/**
 * Cache warming service for proactive caching and refresh
 */
import { SmartCacheManager } from './smart-cache-manager';
import { N8nClient } from './n8n-client';
import { CacheKeyGenerator } from '../utils/cache-key-generator';

export interface WarmingConfig {
  /** Interval between warming cycles in milliseconds */
  interval: number;
  /** Percentage of TTL remaining before refreshing (0-1) */
  refreshThreshold: number;
  /** Maximum number of queries to warm per cycle */
  maxQueriesPerCycle: number;
  /** Minimum popularity score to consider for warming */
  minPopularityScore: number;
  /** Enable/disable cache warming */
  enabled: boolean;
  /** Predefined queries to always keep warm */
  predefinedQueries?: PredefinedQuery[];
}

export interface PredefinedQuery {
  api: 'hackernews' | 'reddit';
  query: string;
  options?: Record<string, any>;
  priority?: number;
}

export interface WarmingStats {
  totalWarmed: number;
  totalRefreshed: number;
  failedWarmings: number;
  lastWarmingCycle: Date | null;
  activeQueries: number;
}

export class CacheWarmer {
  private config: WarmingConfig;
  private cacheManager: SmartCacheManager;
  private n8nClient: N8nClient;
  private warmingTimer: NodeJS.Timeout | null = null;
  private stats: WarmingStats = {
    totalWarmed: 0,
    totalRefreshed: 0,
    failedWarmings: 0,
    lastWarmingCycle: null,
    activeQueries: 0
  };
  private isWarming = false;
  private sessionId: string;
  
  constructor(
    cacheManager: SmartCacheManager,
    n8nClient: N8nClient,
    config: Partial<WarmingConfig> = {}
  ) {
    this.cacheManager = cacheManager;
    this.n8nClient = n8nClient;
    this.sessionId = `cache-warmer-${Date.now()}`;
    
    this.config = {
      interval: 5 * 60 * 1000, // 5 minutes
      refreshThreshold: 0.25, // Refresh when 25% TTL remains
      maxQueriesPerCycle: 10,
      minPopularityScore: 3,
      enabled: true,
      ...config
    };
  }
  
  /**
   * Start the cache warming service
   */
  start(): void {
    if (!this.config.enabled || this.warmingTimer) {
      return;
    }
    
    console.log('[CacheWarmer] Starting cache warming service');
    
    // Run initial warming cycle
    this.runWarmingCycle();
    
    // Schedule periodic warming
    this.warmingTimer = setInterval(() => {
      this.runWarmingCycle();
    }, this.config.interval);
  }
  
  /**
   * Stop the cache warming service
   */
  stop(): void {
    if (this.warmingTimer) {
      clearInterval(this.warmingTimer);
      this.warmingTimer = null;
      console.log('[CacheWarmer] Stopped cache warming service');
    }
  }
  
  /**
   * Run a single warming cycle
   */
  async runWarmingCycle(): Promise<void> {
    if (this.isWarming) {
      console.log('[CacheWarmer] Warming cycle already in progress, skipping');
      return;
    }
    
    this.isWarming = true;
    this.stats.lastWarmingCycle = new Date();
    
    try {
      console.log('[CacheWarmer] Starting warming cycle');
      
      // Get queries that need warming
      const queriesToWarm = await this.getQueriesToWarm();
      
      // Warm each query
      const results = await Promise.allSettled(
        queriesToWarm.map(query => this.warmQuery(query))
      );
      
      // Update statistics
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          this.stats.totalWarmed++;
        } else {
          this.stats.failedWarmings++;
        }
      });
      
      console.log(`[CacheWarmer] Warming cycle completed: ${results.length} queries processed`);
    } catch (error) {
      console.error('[CacheWarmer] Error during warming cycle:', error);
    } finally {
      this.isWarming = false;
    }
  }
  
  /**
   * Get list of queries that need warming
   */
  private async getQueriesToWarm(): Promise<WarmingQuery[]> {
    const queries: WarmingQuery[] = [];
    
    // Add predefined queries with highest priority
    if (this.config.predefinedQueries) {
      this.config.predefinedQueries.forEach(pq => {
        queries.push({
          api: pq.api,
          query: pq.query,
          options: pq.options || {},
          priority: pq.priority || 100,
          reason: 'predefined'
        });
      });
    }
    
    // Get popular queries
    const popularQueries = this.cacheManager.getPopularQueries(20);
    
    // Get all cache entries to check for expiring ones
    const allEntries = this.cacheManager.getAllEntries();
    const now = Date.now();
    
    // Check each entry for warming needs
    allEntries.forEach(entry => {
      const remainingTTL = entry.metadata.expiresAt - now;
      const totalTTL = entry.metadata.expiresAt - entry.metadata.createdAt;
      const remainingPercentage = remainingTTL / totalTTL;
      
      // Parse cache key to get query details
      const keyParts = CacheKeyGenerator.parseKey(entry.key);
      if (!keyParts.namespace || !keyParts.identifier) {
        return;
      }
      
      // Check if this is a search key
      if (keyParts.identifier !== 'search') {
        return;
      }
      
      // Extract API from namespace
      const api = keyParts.namespace;
      if (api !== 'hackernews' && api !== 'reddit') {
        return;
      }
      
      // Try to extract query from params
      let query: string | undefined;
      try {
        // Parse the params section to extract the query
        if (keyParts.params) {
          // Try to parse as JSON first (for keys with JSON params)
          if (keyParts.params.startsWith('{')) {
            const params = JSON.parse(keyParts.params);
            query = params.q;
          } else if (keyParts.params.includes('q=')) {
            // Parse key-value pairs
            const paramPairs = keyParts.params.split(':');
            const qParam = paramPairs.find(p => p.startsWith('q='));
            if (qParam) {
              query = qParam.substring(2);
            }
          }
        }
      } catch (e) {
        // Skip malformed keys
        return;
      }
      
      if (!query) {
        return;
      }
      
      // Check if needs refresh
      if (remainingPercentage <= this.config.refreshThreshold && remainingTTL > 0) {
        // Find popularity score
        const popularity = popularQueries.find(pq => 
          pq.query === query
        );
        
        if (popularity && popularity.count >= this.config.minPopularityScore) {
          queries.push({
            api: api as 'hackernews' | 'reddit',
            query: query,
            options: {},
            priority: popularity.count,
            reason: 'expiring',
            cacheKey: entry.key
          });
        }
      }
    });
    
    // Sort by priority and limit to max queries per cycle
    queries.sort((a, b) => b.priority - a.priority);
    return queries.slice(0, this.config.maxQueriesPerCycle);
  }
  
  /**
   * Warm a single query
   */
  private async warmQuery(warmingQuery: WarmingQuery): Promise<boolean> {
    try {
      console.log(`[CacheWarmer] Warming ${warmingQuery.api} query: "${warmingQuery.query}" (${warmingQuery.reason})`);
      
      if (warmingQuery.api === 'hackernews') {
        const result = await this.n8nClient.searchHackerNews(
          warmingQuery.query,
          this.sessionId,
          warmingQuery.options
        );
        
        if (warmingQuery.reason === 'expiring') {
          this.stats.totalRefreshed++;
        }
        
        return result.success || false;
      } else if (warmingQuery.api === 'reddit') {
        const result = await this.n8nClient.searchReddit(
          warmingQuery.query,
          this.sessionId,
          warmingQuery.options
        );
        
        if (warmingQuery.reason === 'expiring') {
          this.stats.totalRefreshed++;
        }
        
        return result.success || false;
      }
      
      return false;
    } catch (error) {
      console.error(`[CacheWarmer] Failed to warm query "${warmingQuery.query}":`, error);
      return false;
    }
  }
  
  /**
   * Manually warm specific queries
   */
  async warmQueries(queries: PredefinedQuery[]): Promise<void> {
    console.log(`[CacheWarmer] Manually warming ${queries.length} queries`);
    
    const warmingQueries = queries.map(q => ({
      ...q,
      options: q.options || {},
      priority: q.priority || 50,
      reason: 'manual' as const
    }));
    
    const results = await Promise.allSettled(
      warmingQueries.map(query => this.warmQuery(query))
    );
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
    console.log(`[CacheWarmer] Manual warming completed: ${successful}/${queries.length} successful`);
  }
  
  /**
   * Get warming statistics
   */
  getStats(): Readonly<WarmingStats> {
    return {
      ...this.stats,
      activeQueries: this.cacheManager.getStats().entries
    };
  }
  
  /**
   * Reset warming statistics
   */
  resetStats(): void {
    this.stats = {
      totalWarmed: 0,
      totalRefreshed: 0,
      failedWarmings: 0,
      lastWarmingCycle: null,
      activeQueries: 0
    };
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<WarmingConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart if interval changed
    if (config.interval && this.warmingTimer) {
      this.stop();
      this.start();
    }
  }
  
  /**
   * Check if warming is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }
}

interface WarmingQuery {
  api: 'hackernews' | 'reddit';
  query: string;
  options: Record<string, any>;
  priority: number;
  reason: 'predefined' | 'expiring' | 'manual';
  cacheKey?: string;
} 