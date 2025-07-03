/**
 * Cache manager service for storing API responses
 * Implements memory-based caching with TTL and LRU eviction
 */

export interface CacheOptions {
  /** Time to live in milliseconds */
  ttl?: number;
  /** Prefix for all cache keys */
  keyPrefix?: string;
  /** Maximum cache size in bytes */
  maxSize?: number;
  /** Storage type (only memory supported for now) */
  storage?: 'memory' | 'file' | 'redis';
}

export interface CacheEntry<T = any> {
  /** Cache key */
  key: string;
  /** Cached data */
  data: T;
  /** Metadata about the cache entry */
  metadata: {
    /** Timestamp when entry was created */
    createdAt: number;
    /** Timestamp when entry expires */
    expiresAt: number;
    /** Number of times entry has been accessed */
    accessCount: number;
    /** Timestamp of last access */
    lastAccessed: number;
    /** Size of entry in bytes */
    size: number;
  };
}

export interface CacheStats {
  /** Number of entries in cache */
  entries: number;
  /** Total size of cache in bytes */
  totalSize: number;
  /** Cache hit rate (hits / total accesses) */
  hitRate: number;
  /** Timestamp of oldest entry */
  oldestEntry?: number;
  /** Timestamp of newest entry */
  newestEntry?: number;
}

/**
 * Cache manager implementation with memory storage
 */
export class CacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private totalSize: number = 0;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private hits: number = 0;
  private misses: number = 0;
  
  constructor(private options: CacheOptions = {}) {
    this.options = {
      ttl: 3600000, // 1 hour default
      keyPrefix: 'ideaforge',
      maxSize: 100 * 1024 * 1024, // 100MB default
      storage: 'memory',
      ...options
    };
    
    // Start cleanup interval
    this.startCleanupInterval();
  }
  
  /**
   * Get a value from the cache
   */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.buildKey(key);
    const entry = this.cache.get(fullKey);
    
    if (!entry) {
      this.misses++;
      return null;
    }
    
    // Check expiration
    if (Date.now() > entry.metadata.expiresAt) {
      await this.delete(key);
      this.misses++;
      return null;
    }
    
    // Update access metadata
    entry.metadata.accessCount++;
    entry.metadata.lastAccessed = Date.now();
    this.hits++;
    
    return entry.data as T;
  }
  
  /**
   * Set a value in the cache
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const fullKey = this.buildKey(key);
    const dataSize = this.calculateSize(data);
    
    // Check if single item exceeds max size
    if (dataSize > this.options.maxSize!) {
      throw new Error(`Data size (${dataSize} bytes) exceeds maximum cache size (${this.options.maxSize} bytes)`);
    }
    
    // Evict old entries if needed
    await this.evictIfNeeded(dataSize);
    
    const entry: CacheEntry<T> = {
      key: fullKey,
      data,
      metadata: {
        createdAt: Date.now(),
        expiresAt: Date.now() + (ttl || this.options.ttl!),
        accessCount: 0,
        lastAccessed: Date.now(),
        size: dataSize
      }
    };
    
    // Remove old entry size if updating
    const oldEntry = this.cache.get(fullKey);
    if (oldEntry) {
      this.totalSize -= oldEntry.metadata.size;
    }
    
    this.cache.set(fullKey, entry);
    this.totalSize += dataSize;
  }
  
  /**
   * Delete a value from the cache
   */
  async delete(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);
    const entry = this.cache.get(fullKey);
    
    if (entry) {
      this.totalSize -= entry.metadata.size;
      return this.cache.delete(fullKey);
    }
    
    return false;
  }
  
  /**
   * Clear all entries from the cache
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.totalSize = 0;
    this.hits = 0;
    this.misses = 0;
  }
  
  /**
   * Check if a key exists in the cache
   */
  async has(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);
    const entry = this.cache.get(fullKey);
    
    if (!entry) {
      return false;
    }
    
    // Check if expired
    if (Date.now() > entry.metadata.expiresAt) {
      await this.delete(key);
      return false;
    }
    
    return true;
  }
  
  /**
   * Generate a cache key from parameters
   */
  generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        if (params[key] !== undefined && params[key] !== null) {
          acc[key] = params[key];
        }
        return acc;
      }, {} as Record<string, any>);
    
    const paramString = JSON.stringify(sortedParams);
    const hash = this.simpleHash(paramString);
    
    return `${prefix}:${hash}`;
  }
  
  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    let oldest = Infinity;
    let newest = 0;
    
    this.cache.forEach(entry => {
      if (entry.metadata.createdAt < oldest) {
        oldest = entry.metadata.createdAt;
      }
      if (entry.metadata.createdAt > newest) {
        newest = entry.metadata.createdAt;
      }
    });
    
    const totalAccesses = this.hits + this.misses;
    
    return {
      entries: this.cache.size,
      totalSize: this.totalSize,
      hitRate: totalAccesses > 0 ? this.hits / totalAccesses : 0,
      oldestEntry: oldest === Infinity ? undefined : oldest,
      newestEntry: newest || undefined
    };
  }
  
  /**
   * Get all cache entries (for debugging)
   */
  getAllEntries(): Array<{ key: string; metadata: CacheEntry['metadata'] }> {
    return Array.from(this.cache.entries()).map(([key, entry]) => ({
      key: key.replace(this.options.keyPrefix + ':', ''),
      metadata: entry.metadata
    }));
  }
  
  /**
   * Stop the cleanup interval (for testing)
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
  
  /**
   * Build a full cache key with prefix
   */
  private buildKey(key: string): string {
    return `${this.options.keyPrefix}:${key}`;
  }
  
  /**
   * Calculate the size of data in bytes
   */
  private calculateSize(data: any): number {
    const str = JSON.stringify(data);
    // Use Buffer.byteLength for Node.js compatibility
    return Buffer.byteLength(str, 'utf8');
  }
  
  /**
   * Simple hash function for key generation
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
  
  /**
   * Evict entries if needed to make space
   */
  private async evictIfNeeded(requiredSpace: number): Promise<void> {
    if (this.totalSize + requiredSpace <= this.options.maxSize!) {
      return;
    }
    
    // LRU eviction strategy - sort by last accessed time
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].metadata.lastAccessed - b[1].metadata.lastAccessed);
    
    let freedSpace = 0;
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of entries) {
      if (this.totalSize + requiredSpace - freedSpace <= this.options.maxSize!) {
        break;
      }
      
      freedSpace += entry.metadata.size;
      keysToDelete.push(key);
    }
    
    // Delete the entries
    for (const key of keysToDelete) {
      const entry = this.cache.get(key);
      if (entry) {
        this.totalSize -= entry.metadata.size;
        this.cache.delete(key);
      }
    }
    
    if (keysToDelete.length > 0) {
      console.log(`Cache eviction: removed ${keysToDelete.length} entries to free ${freedSpace} bytes`);
    }
  }
  
  /**
   * Start the cleanup interval for expired entries
   */
  private startCleanupInterval(): void {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];
      
      this.cache.forEach((entry, key) => {
        if (now > entry.metadata.expiresAt) {
          keysToDelete.push(key);
        }
      });
      
      keysToDelete.forEach(key => {
        const entry = this.cache.get(key);
        if (entry) {
          this.totalSize -= entry.metadata.size;
          this.cache.delete(key);
        }
      });
      
      if (keysToDelete.length > 0) {
        console.log(`Cache cleanup: removed ${keysToDelete.length} expired entries`);
      }
    }, 60000); // Every minute
    
    // Don't prevent process from exiting
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }
}

// Export singleton instance for convenience
export const cacheManager = new CacheManager(); 