# Task 5.5 Detailed Implementation: Add rate limiting and caching

## Overview
This task implements comprehensive rate limiting and caching mechanisms for the n8n integration. It ensures API compliance, optimizes performance through intelligent caching, and provides resilience against rate limit errors.

## Implementation Details

### 5.5.1 Implement rate limiter utility

**Objective**: Create a flexible, reusable rate limiting system that works across different APIs.

**Core Rate Limiter Implementation**:
```typescript
// src/utils/rate-limiter.ts
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  maxRequestsPerSecond?: number;
  strategy?: 'sliding' | 'fixed';
}

export interface RateLimitState {
  requests: number[];
  blocked: boolean;
  nextAvailableTime: number;
}

export class RateLimiter {
  private states: Map<string, RateLimitState> = new Map();
  
  constructor(private config: RateLimitConfig) {
    this.config.strategy = config.strategy || 'sliding';
  }
  
  async checkLimit(key: string = 'default'): Promise<{
    allowed: boolean;
    remaining: number;
    resetIn: number;
    waitTime: number;
  }> {
    const now = Date.now();
    const state = this.getState(key);
    
    // Clean old requests
    state.requests = state.requests.filter(
      timestamp => now - timestamp < this.config.windowMs
    );
    
    // Check if currently blocked
    if (state.blocked && now < state.nextAvailableTime) {
      return {
        allowed: false,
        remaining: 0,
        resetIn: state.nextAvailableTime - now,
        waitTime: state.nextAvailableTime - now
      };
    }
    
    // Check window limit
    if (state.requests.length >= this.config.maxRequests) {
      const oldestRequest = Math.min(...state.requests);
      const resetIn = this.config.windowMs - (now - oldestRequest);
      
      return {
        allowed: false,
        remaining: 0,
        resetIn: resetIn,
        waitTime: resetIn
      };
    }
    
    // Check per-second limit
    if (this.config.maxRequestsPerSecond) {
      const recentRequests = state.requests.filter(
        timestamp => now - timestamp < 1000
      );
      
      if (recentRequests.length >= this.config.maxRequestsPerSecond) {
        const waitTime = 1000 - (now - recentRequests[0]);
        return {
          allowed: false,
          remaining: this.config.maxRequests - state.requests.length,
          resetIn: this.config.windowMs,
          waitTime: waitTime
        };
      }
    }
    
    return {
      allowed: true,
      remaining: this.config.maxRequests - state.requests.length,
      resetIn: this.config.windowMs,
      waitTime: 0
    };
  }
  
  recordRequest(key: string = 'default'): void {
    const state = this.getState(key);
    state.requests.push(Date.now());
    state.blocked = false;
  }
  
  recordRejection(key: string = 'default', retryAfter?: number): void {
    const state = this.getState(key);
    state.blocked = true;
    state.nextAvailableTime = Date.now() + (retryAfter || 60000);
  }
  
  async waitForSlot(key: string = 'default'): Promise<void> {
    const check = await this.checkLimit(key);
    
    if (!check.allowed && check.waitTime > 0) {
      console.log(`Rate limit: waiting ${check.waitTime}ms for ${key}`);
      await this.sleep(check.waitTime);
      return this.waitForSlot(key); // Recursive check
    }
  }
  
  private getState(key: string): RateLimitState {
    if (!this.states.has(key)) {
      this.states.set(key, {
        requests: [],
        blocked: false,
        nextAvailableTime: 0
      });
    }
    return this.states.get(key)!;
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Utility methods
  reset(key?: string): void {
    if (key) {
      this.states.delete(key);
    } else {
      this.states.clear();
    }
  }
  
  getStats(key: string = 'default'): {
    currentRequests: number;
    isBlocked: boolean;
    oldestRequest?: number;
    newestRequest?: number;
  } {
    const state = this.getState(key);
    const now = Date.now();
    
    // Clean old requests for accurate stats
    state.requests = state.requests.filter(
      timestamp => now - timestamp < this.config.windowMs
    );
    
    return {
      currentRequests: state.requests.length,
      isBlocked: state.blocked && now < state.nextAvailableTime,
      oldestRequest: state.requests.length > 0 ? Math.min(...state.requests) : undefined,
      newestRequest: state.requests.length > 0 ? Math.max(...state.requests) : undefined
    };
  }
}
```

**API-Specific Rate Limiters**:
```typescript
// src/utils/api-rate-limiters.ts
export const API_RATE_LIMITS = {
  hackerNews: {
    maxRequests: 10000,
    windowMs: 3600000, // 1 hour
    maxRequestsPerSecond: 10
  },
  reddit: {
    maxRequests: 600,
    windowMs: 600000, // 10 minutes  
    maxRequestsPerSecond: 1
  },
  default: {
    maxRequests: 1000,
    windowMs: 3600000,
    maxRequestsPerSecond: 5
  }
};

export class APIRateLimitManager {
  private limiters: Map<string, RateLimiter> = new Map();
  
  getLimiter(api: string): RateLimiter {
    if (!this.limiters.has(api)) {
      const config = API_RATE_LIMITS[api] || API_RATE_LIMITS.default;
      this.limiters.set(api, new RateLimiter(config));
    }
    return this.limiters.get(api)!;
  }
  
  async checkAndWait(api: string, key?: string): Promise<void> {
    const limiter = this.getLimiter(api);
    await limiter.waitForSlot(key);
    limiter.recordRequest(key);
  }
  
  handleRateLimitError(api: string, error: any, key?: string): void {
    const limiter = this.getLimiter(api);
    
    // Extract retry-after from various sources
    let retryAfter = 60000; // Default 1 minute
    
    if (error.response?.headers?.['retry-after']) {
      const headerValue = error.response.headers['retry-after'];
      retryAfter = isNaN(headerValue) 
        ? new Date(headerValue).getTime() - Date.now()
        : parseInt(headerValue) * 1000;
    } else if (error.response?.headers?.['x-ratelimit-reset']) {
      const resetTime = parseInt(error.response.headers['x-ratelimit-reset']);
      retryAfter = (resetTime * 1000) - Date.now();
    }
    
    limiter.recordRejection(key, retryAfter);
  }
  
  getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    this.limiters.forEach((limiter, api) => {
      stats[api] = limiter.getStats();
    });
    
    return stats;
  }
}
```

### 5.5.2 Add rate limiting to n8n workflows

**Objective**: Integrate rate limiting into all n8n workflows.

**n8n Rate Limit Node**:
```javascript
// Function node for rate limiting in n8n
const initRateLimiter = () => {
  // Get or create rate limiter from workflow static data
  let rateLimitManager = $getWorkflowStaticData('rateLimitManager');
  
  if (!rateLimitManager) {
    rateLimitManager = {
      limits: {
        hackerNews: {
          requests: [],
          maxRequests: 10000,
          windowMs: 3600000,
          maxPerSecond: 10
        },
        reddit: {
          requests: [],
          maxRequests: 600,
          windowMs: 600000,
          maxPerSecond: 1
        }
      },
      
      async checkLimit(api) {
        const now = Date.now();
        const limit = this.limits[api];
        
        if (!limit) {
          throw new Error(`Unknown API: ${api}`);
        }
        
        // Clean old requests
        limit.requests = limit.requests.filter(
          timestamp => now - timestamp < limit.windowMs
        );
        
        // Check window limit
        if (limit.requests.length >= limit.maxRequests) {
          const oldestRequest = Math.min(...limit.requests);
          const waitTime = limit.windowMs - (now - oldestRequest);
          
          return {
            allowed: false,
            waitTime: waitTime,
            reason: 'Window limit exceeded'
          };
        }
        
        // Check per-second limit
        const recentRequests = limit.requests.filter(
          timestamp => now - timestamp < 1000
        );
        
        if (recentRequests.length >= limit.maxPerSecond) {
          return {
            allowed: false,
            waitTime: 1000 - (now - recentRequests[0]),
            reason: 'Per-second limit exceeded'
          };
        }
        
        return { allowed: true };
      },
      
      recordRequest(api) {
        const limit = this.limits[api];
        if (limit) {
          limit.requests.push(Date.now());
        }
      },
      
      async waitIfNeeded(api) {
        let check = await this.checkLimit(api);
        
        while (!check.allowed) {
          console.log(`Rate limit wait: ${check.waitTime}ms - ${check.reason}`);
          await new Promise(resolve => setTimeout(resolve, check.waitTime));
          check = await this.checkLimit(api);
        }
        
        this.recordRequest(api);
      }
    };
    
    $setWorkflowStaticData('rateLimitManager', rateLimitManager);
  }
  
  return rateLimitManager;
};

// Use in workflow
const rateLimiter = initRateLimiter();
const api = $json.api || 'hackerNews';

// Wait if rate limited
await rateLimiter.waitIfNeeded(api);

// Continue with request
return [{
  json: {
    ...$json,
    rateLimitChecked: true,
    timestamp: Date.now()
  }
}];
```

**Rate Limit Response Handler**:
```javascript
// Handle rate limit responses from APIs
const handleRateLimitResponse = (response, api) => {
  const rateLimiter = $getWorkflowStaticData('rateLimitManager');
  
  // Check if we hit a rate limit
  if (response.statusCode === 429) {
    let retryAfter = 60000; // Default 1 minute
    
    // Parse retry-after header
    if (response.headers['retry-after']) {
      const value = response.headers['retry-after'];
      if (isNaN(value)) {
        // HTTP date
        retryAfter = new Date(value).getTime() - Date.now();
      } else {
        // Seconds
        retryAfter = parseInt(value) * 1000;
      }
    }
    
    // Parse API-specific headers
    if (api === 'reddit' && response.headers['x-ratelimit-reset']) {
      const resetTime = parseInt(response.headers['x-ratelimit-reset']) * 1000;
      retryAfter = Math.max(retryAfter, resetTime - Date.now());
    }
    
    // Block further requests
    const limit = rateLimiter.limits[api];
    if (limit) {
      limit.blocked = true;
      limit.blockedUntil = Date.now() + retryAfter;
    }
    
    return {
      rateLimited: true,
      retryAfter: retryAfter,
      resetAt: new Date(Date.now() + retryAfter).toISOString()
    };
  }
  
  // Update rate limit info from headers
  if (response.headers['x-ratelimit-remaining']) {
    const remaining = parseInt(response.headers['x-ratelimit-remaining']);
    const limit = rateLimiter.limits[api];
    
    if (limit && remaining < 10) {
      console.warn(`Low rate limit for ${api}: ${remaining} remaining`);
    }
  }
  
  return { rateLimited: false };
};
```

### 5.5.3 Create cache manager service

**Objective**: Implement a flexible caching system for API responses.

**Cache Manager Implementation**:
```typescript
// src/services/cache-manager.ts
export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  keyPrefix?: string;
  maxSize?: number; // Maximum cache size in MB
  storage?: 'memory' | 'file' | 'redis';
}

export interface CacheEntry<T = any> {
  key: string;
  data: T;
  metadata: {
    createdAt: number;
    expiresAt: number;
    accessCount: number;
    lastAccessed: number;
    size: number; // Size in bytes
  };
}

export class CacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private totalSize: number = 0;
  
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
  
  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.buildKey(key);
    const entry = this.cache.get(fullKey);
    
    if (!entry) {
      return null;
    }
    
    // Check expiration
    if (Date.now() > entry.metadata.expiresAt) {
      this.delete(key);
      return null;
    }
    
    // Update access metadata
    entry.metadata.accessCount++;
    entry.metadata.lastAccessed = Date.now();
    
    return entry.data as T;
  }
  
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const fullKey = this.buildKey(key);
    const dataSize = this.calculateSize(data);
    
    // Check size limit
    if (dataSize > this.options.maxSize!) {
      throw new Error(`Data size (${dataSize} bytes) exceeds maximum cache size`);
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
  
  async delete(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);
    const entry = this.cache.get(fullKey);
    
    if (entry) {
      this.totalSize -= entry.metadata.size;
      return this.cache.delete(fullKey);
    }
    
    return false;
  }
  
  async clear(): Promise<void> {
    this.cache.clear();
    this.totalSize = 0;
  }
  
  async has(key: string): Promise<boolean> {
    const data = await this.get(key);
    return data !== null;
  }
  
  // Cache key generation
  generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {} as Record<string, any>);
    
    const paramString = JSON.stringify(sortedParams);
    const hash = this.simpleHash(paramString);
    
    return `${prefix}:${hash}`;
  }
  
  // Statistics
  getStats(): {
    entries: number;
    totalSize: number;
    hitRate: number;
    oldestEntry?: number;
    newestEntry?: number;
  } {
    let totalHits = 0;
    let totalAccess = 0;
    let oldest = Infinity;
    let newest = 0;
    
    this.cache.forEach(entry => {
      totalHits += entry.metadata.accessCount;
      totalAccess += entry.metadata.accessCount + 1; // Include initial set
      
      if (entry.metadata.createdAt < oldest) {
        oldest = entry.metadata.createdAt;
      }
      if (entry.metadata.createdAt > newest) {
        newest = entry.metadata.createdAt;
      }
    });
    
    return {
      entries: this.cache.size,
      totalSize: this.totalSize,
      hitRate: totalAccess > 0 ? totalHits / totalAccess : 0,
      oldestEntry: oldest === Infinity ? undefined : oldest,
      newestEntry: newest || undefined
    };
  }
  
  // Private methods
  private buildKey(key: string): string {
    return `${this.options.keyPrefix}:${key}`;
  }
  
  private calculateSize(data: any): number {
    const str = JSON.stringify(data);
    return new Blob([str]).size;
  }
  
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
  
  private async evictIfNeeded(requiredSpace: number): Promise<void> {
    if (this.totalSize + requiredSpace <= this.options.maxSize!) {
      return;
    }
    
    // LRU eviction strategy
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].metadata.lastAccessed - b[1].metadata.lastAccessed);
    
    let freedSpace = 0;
    for (const [key, entry] of entries) {
      if (this.totalSize + requiredSpace - freedSpace <= this.options.maxSize!) {
        break;
      }
      
      freedSpace += entry.metadata.size;
      this.cache.delete(key);
    }
    
    this.totalSize -= freedSpace;
  }
  
  private startCleanupInterval(): void {
    setInterval(() => {
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
    }, 60000); // Run every minute
  }
}
```

**File-Based Cache Storage**:
```typescript
// src/services/file-cache-storage.ts
import * as fs from 'fs/promises';
import * as path from 'path';

export class FileCacheStorage {
  private cacheDir: string;
  
  constructor(cacheDir: string = '.cache/ideaforge') {
    this.cacheDir = cacheDir;
    this.ensureCacheDir();
  }
  
  async get<T>(key: string): Promise<T | null> {
    try {
      const filePath = this.getFilePath(key);
      const data = await fs.readFile(filePath, 'utf-8');
      const entry = JSON.parse(data);
      
      // Check expiration
      if (Date.now() > entry.metadata.expiresAt) {
        await this.delete(key);
        return null;
      }
      
      return entry.data as T;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }
  
  async set<T>(key: string, data: T, metadata: any): Promise<void> {
    const filePath = this.getFilePath(key);
    const entry = { data, metadata };
    
    await fs.writeFile(filePath, JSON.stringify(entry, null, 2));
  }
  
  async delete(key: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(key);
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }
  
  async clear(): Promise<void> {
    const files = await fs.readdir(this.cacheDir);
    await Promise.all(
      files.map(file => fs.unlink(path.join(this.cacheDir, file)))
    );
  }
  
  private getFilePath(key: string): string {
    // Sanitize key for filesystem
    const safeKey = key.replace(/[^a-zA-Z0-9-_]/g, '_');
    return path.join(this.cacheDir, `${safeKey}.json`);
  }
  
  private async ensureCacheDir(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create cache directory:', error);
    }
  }
}
```

### 5.5.4 Implement cache key generation

**Objective**: Create consistent, collision-free cache keys.

**Cache Key Generator**:
```typescript
// src/utils/cache-key-generator.ts
import { createHash } from 'crypto';

export class CacheKeyGenerator {
  static generateKey(
    namespace: string,
    identifier: string,
    params: Record<string, any> = {}
  ): string {
    // Sort parameters for consistency
    const sortedParams = this.sortObject(params);
    
    // Create a deterministic string representation
    const paramString = JSON.stringify(sortedParams);
    
    // Generate hash for long keys
    if (paramString.length > 200) {
      const hash = createHash('sha256')
        .update(paramString)
        .digest('hex')
        .substring(0, 16);
      
      return `${namespace}:${identifier}:${hash}`;
    }
    
    // For short keys, use readable format
    const paramPairs = Object.entries(sortedParams)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${key}=${this.sanitizeValue(value)}`)
      .join(':');
    
    return `${namespace}:${identifier}${paramPairs ? ':' + paramPairs : ''}`;
  }
  
  static generateSearchKey(
    api: 'hackernews' | 'reddit',
    query: string,
    options: Record<string, any> = {}
  ): string {
    const normalizedQuery = query.toLowerCase().trim();
    
    return this.generateKey(api, 'search', {
      q: normalizedQuery,
      ...options
    });
  }
  
  static generateSessionKey(
    sessionId: string,
    operation: string
  ): string {
    return `session:${sessionId}:${operation}`;
  }
  
  private static sortObject(obj: Record<string, any>): Record<string, any> {
    if (Array.isArray(obj)) {
      return obj.map(item => 
        typeof item === 'object' ? this.sortObject(item) : item
      ).sort();
    }
    
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    return Object.keys(obj)
      .sort()
      .reduce((sorted, key) => {
        sorted[key] = typeof obj[key] === 'object' 
          ? this.sortObject(obj[key]) 
          : obj[key];
        return sorted;
      }, {} as Record<string, any>);
  }
  
  private static sanitizeValue(value: any): string {
    if (typeof value === 'string') {
      return value.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 50);
    }
    
    if (Array.isArray(value)) {
      return value.join(',').substring(0, 50);
    }
    
    return String(value).substring(0, 50);
  }
}
```

**n8n Cache Key Implementation**:
```javascript
// n8n function node for cache key generation
const generateCacheKey = (api, operation, params) => {
  // Normalize parameters
  const normalized = {
    api: api.toLowerCase(),
    op: operation,
    ...params
  };
  
  // Remove undefined/null values
  Object.keys(normalized).forEach(key => {
    if (normalized[key] === undefined || normalized[key] === null) {
      delete normalized[key];
    }
  });
  
  // Sort object keys
  const sorted = Object.keys(normalized)
    .sort()
    .reduce((acc, key) => {
      acc[key] = normalized[key];
      return acc;
    }, {});
  
  // Create key components
  const components = [api, operation];
  
  // Add sorted parameters
  Object.entries(sorted).forEach(([key, value]) => {
    if (key !== 'api' && key !== 'op') {
      components.push(`${key}:${value}`);
    }
  });
  
  return components.join(':');
};

// Example usage
const cacheKey = generateCacheKey('hackernews', 'search', {
  query: $json.query,
  limit: $json.options?.limit || 30,
  sort: $json.options?.sortBy || 'relevance'
});

console.log(`Generated cache key: ${cacheKey}`);
```

### 5.5.5 Add TTL-based expiration

**Objective**: Implement intelligent TTL strategies based on content type.

**TTL Strategy Implementation**:
```typescript
// src/utils/ttl-strategies.ts
export interface TTLStrategy {
  calculate(context: TTLContext): number;
}

export interface TTLContext {
  type: 'search' | 'metadata' | 'health';
  api: string;
  query?: string;
  resultCount?: number;
  isPopular?: boolean;
  timestamp?: number;
}

export class DynamicTTLStrategy implements TTLStrategy {
  private baseTTLs = {
    search: {
      hackernews: 3600000,  // 1 hour
      reddit: 1800000,      // 30 minutes
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
        ttl *= 0.5; // Cache empty results for less time
      } else if (context.resultCount > 50) {
        ttl *= 1.5; // Cache large result sets longer
      }
    }
    
    // Adjust for popular queries
    if (context.isPopular) {
      ttl *= 2; // Cache popular queries longer
    }
    
    // Adjust based on time of day
    if (context.timestamp) {
      const hour = new Date(context.timestamp).getHours();
      if (hour >= 9 && hour <= 17) {
        ttl *= 0.75; // Shorter cache during business hours
      } else {
        ttl *= 1.25; // Longer cache during off hours
      }
    }
    
    // Apply limits
    const minTTL = 300000;    // 5 minutes
    const maxTTL = 86400000;  // 24 hours
    
    return Math.max(minTTL, Math.min(maxTTL, Math.round(ttl)));
  }
  
  private getBaseTTL(context: TTLContext): number {
    const typeConfig = this.baseTTLs[context.type];
    if (!typeConfig) {
      return 3600000; // Default 1 hour
    }
    
    return typeConfig[context.api] || typeConfig.default || 3600000;
  }
}

export class QueryBasedTTLStrategy implements TTLStrategy {
  private queryPatterns = [
    { pattern: /latest|recent|today/i, ttl: 300000 },     // 5 minutes
    { pattern: /trending|hot/i, ttl: 600000 },             // 10 minutes
    { pattern: /tutorial|guide|documentation/i, ttl: 86400000 }, // 24 hours
    { pattern: /comparison|vs|versus/i, ttl: 43200000 },   // 12 hours
    { pattern: /bug|issue|error/i, ttl: 1800000 },         // 30 minutes
    { pattern: /best|top|popular/i, ttl: 7200000 }         // 2 hours
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
    
    // Default based on query length
    if (context.query.length < 10) {
      return 7200000; // 2 hours for short queries
    } else if (context.query.length > 50) {
      return 1800000; // 30 minutes for complex queries
    }
    
    return 3600000; // 1 hour default
  }
}
```

**TTL Configuration in Cache Manager**:
```typescript
// Extension to CacheManager
export class SmartCacheManager extends CacheManager {
  private ttlStrategy: TTLStrategy;
  private popularQueries: Map<string, number> = new Map();
  
  constructor(options: CacheOptions = {}, ttlStrategy?: TTLStrategy) {
    super(options);
    this.ttlStrategy = ttlStrategy || new DynamicTTLStrategy();
  }
  
  async setWithSmartTTL<T>(
    key: string, 
    data: T, 
    context: TTLContext
  ): Promise<void> {
    // Track query popularity
    if (context.query) {
      const count = this.popularQueries.get(context.query) || 0;
      this.popularQueries.set(context.query, count + 1);
      
      if (count > 10) {
        context.isPopular = true;
      }
    }
    
    const ttl = this.ttlStrategy.calculate(context);
    console.log(`Setting cache with TTL: ${ttl}ms (${ttl / 60000} minutes)`);
    
    await this.set(key, data, ttl);
  }
  
  getPopularQueries(threshold: number = 10): string[] {
    return Array.from(this.popularQueries.entries())
      .filter(([_, count]) => count >= threshold)
      .sort((a, b) => b[1] - a[1])
      .map(([query]) => query);
  }
}
```

### 5.5.6 Build cache warming logic

**Objective**: Proactively cache popular queries and refresh expiring cache entries.

**Cache Warmer Implementation**:
```typescript
// src/services/cache-warmer.ts
export interface WarmingStrategy {
  queries: string[];
  apis: string[];
  schedule: string; // Cron expression
  priority: number;
}

export class CacheWarmer {
  private warmingQueue: Array<{
    api: string;
    query: string;
    priority: number;
  }> = [];
  
  private popularQueries: string[] = [
    'javascript',
    'typescript',
    'react',
    'node.js',
    'python',
    'machine learning',
    'web development',
    'api design',
    'microservices',
    'docker',
    'kubernetes',
    'devops'
  ];
  
  constructor(
    private cacheManager: SmartCacheManager,
    private apiClient: any // N8nClient instance
  ) {}
  
  async warmCache(strategies: WarmingStrategy[]): Promise<{
    warmed: number;
    failed: number;
    duration: number;
  }> {
    const startTime = Date.now();
    let warmed = 0;
    let failed = 0;
    
    // Build warming queue
    this.buildWarmingQueue(strategies);
    
    // Process queue with concurrency control
    const concurrency = 3;
    const chunks = this.chunkArray(this.warmingQueue, concurrency);
    
    for (const chunk of chunks) {
      const promises = chunk.map(async (item) => {
        try {
          await this.warmQuery(item.api, item.query);
          warmed++;
        } catch (error) {
          console.error(`Failed to warm ${item.api}:${item.query}`, error);
          failed++;
        }
      });
      
      await Promise.all(promises);
      
      // Rate limit between chunks
      await this.sleep(1000);
    }
    
    return {
      warmed,
      failed,
      duration: Date.now() - startTime
    };
  }
  
  async refreshExpiringCache(hoursBeforeExpiry: number = 1): Promise<{
    refreshed: number;
    failed: number;
  }> {
    const stats = { refreshed: 0, failed: 0 };
    const expiryThreshold = Date.now() + (hoursBeforeExpiry * 3600000);
    
    // Get all cache entries
    const cacheStats = this.cacheManager.getStats();
    
    // In real implementation, would need to iterate through cache entries
    // For now, simulate with popular queries
    for (const query of this.popularQueries.slice(0, 5)) {
      try {
        const cacheKey = CacheKeyGenerator.generateSearchKey('hackernews', query);
        const cached = await this.cacheManager.get(cacheKey);
        
        if (cached) {
          // Refresh the cache
          await this.warmQuery('hackernews', query);
          stats.refreshed++;
        }
      } catch (error) {
        stats.failed++;
      }
    }
    
    return stats;
  }
  
  private buildWarmingQueue(strategies: WarmingStrategy[]): void {
    this.warmingQueue = [];
    
    strategies.forEach(strategy => {
      strategy.queries.forEach(query => {
        strategy.apis.forEach(api => {
          this.warmingQueue.push({
            api,
            query,
            priority: strategy.priority
          });
        });
      });
    });
    
    // Sort by priority
    this.warmingQueue.sort((a, b) => b.priority - a.priority);
  }
  
  private async warmQuery(api: string, query: string): Promise<void> {
    console.log(`Warming cache: ${api} - "${query}"`);
    
    const sessionId = `cache-warmer-${Date.now()}`;
    
    if (api === 'hackernews') {
      await this.apiClient.searchHackerNews(query, sessionId);
    } else if (api === 'reddit') {
      await this.apiClient.searchReddit(query, sessionId);
    }
  }
  
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

**n8n Cache Warming Workflow**:
```javascript
// Scheduled n8n workflow for cache warming
const warmCacheWorkflow = async () => {
  const cacheManager = $getWorkflowStaticData('cacheManager');
  const warmingConfig = {
    strategies: [
      {
        queries: ['javascript', 'typescript', 'react', 'vue', 'angular'],
        apis: ['hackernews', 'reddit'],
        priority: 10
      },
      {
        queries: ['python', 'django', 'flask', 'fastapi'],
        apis: ['hackernews', 'reddit'],
        priority: 8
      },
      {
        queries: ['devops', 'docker', 'kubernetes', 'aws'],
        apis: ['hackernews'],
        priority: 6
      }
    ]
  };
  
  const results = {
    started: new Date().toISOString(),
    warmed: [],
    failed: [],
    duration: 0
  };
  
  const startTime = Date.now();
  
  for (const strategy of warmingConfig.strategies) {
    for (const query of strategy.queries) {
      for (const api of strategy.apis) {
        try {
          // Check if already cached
          const cacheKey = `${api}:search:${query}`;
          const existing = await cacheManager.get(cacheKey);
          
          if (!existing) {
            // Trigger search to populate cache
            if (api === 'hackernews') {
              await $node["HN Search"].execute({ query });
            } else if (api === 'reddit') {
              await $node["Reddit Search"].execute({ query });
            }
            
            results.warmed.push({ api, query });
          }
        } catch (error) {
          results.failed.push({ api, query, error: error.message });
        }
        
        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  results.duration = Date.now() - startTime;
  
  return results;
};
```

### 5.5.7 Add monitoring and metrics

**Objective**: Track cache and rate limit performance metrics.

**Metrics Collector**:
```typescript
// src/utils/metrics-collector.ts
export interface MetricPoint {
  timestamp: number;
  value: number;
  labels?: Record<string, string>;
}

export class MetricsCollector {
  private metrics: Map<string, MetricPoint[]> = new Map();
  private readonly maxPoints = 1000; // Keep last 1000 points per metric
  
  recordCacheHit(api: string, hit: boolean): void {
    this.record(`cache.${hit ? 'hit' : 'miss'}`, 1, { api });
  }
  
  recordRateLimit(api: string, limited: boolean): void {
    this.record(`ratelimit.${limited ? 'limited' : 'allowed'}`, 1, { api });
  }
  
  recordLatency(api: string, operation: string, duration: number): void {
    this.record('api.latency', duration, { api, operation });
  }
  
  recordCacheSize(size: number, entries: number): void {
    this.record('cache.size.bytes', size);
    this.record('cache.size.entries', entries);
  }
  
  record(metric: string, value: number, labels?: Record<string, string>): void {
    if (!this.metrics.has(metric)) {
      this.metrics.set(metric, []);
    }
    
    const points = this.metrics.get(metric)!;
    points.push({
      timestamp: Date.now(),
      value,
      labels
    });
    
    // Keep only recent points
    if (points.length > this.maxPoints) {
      points.shift();
    }
  }
  
  getMetrics(metric: string, since?: number): MetricPoint[] {
    const points = this.metrics.get(metric) || [];
    
    if (since) {
      return points.filter(p => p.timestamp >= since);
    }
    
    return points;
  }
  
  getSummary(metric: string, windowMs: number = 3600000): {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
    p95: number;
  } {
    const since = Date.now() - windowMs;
    const points = this.getMetrics(metric, since);
    
    if (points.length === 0) {
      return { count: 0, sum: 0, avg: 0, min: 0, max: 0, p95: 0 };
    }
    
    const values = points.map(p => p.value).sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      count: values.length,
      sum,
      avg: sum / values.length,
      min: values[0],
      max: values[values.length - 1],
      p95: values[Math.floor(values.length * 0.95)]
    };
  }
  
  getCacheHitRate(windowMs: number = 3600000): number {
    const hits = this.getSummary('cache.hit', windowMs);
    const misses = this.getSummary('cache.miss', windowMs);
    
    const total = hits.count + misses.count;
    return total > 0 ? hits.count / total : 0;
  }
  
  getRateLimitRate(windowMs: number = 3600000): Record<string, number> {
    const limited = this.getMetrics('ratelimit.limited', Date.now() - windowMs);
    const allowed = this.getMetrics('ratelimit.allowed', Date.now() - windowMs);
    
    const apiCounts: Record<string, { limited: number; total: number }> = {};
    
    [...limited, ...allowed].forEach(point => {
      const api = point.labels?.api || 'unknown';
      if (!apiCounts[api]) {
        apiCounts[api] = { limited: 0, total: 0 };
      }
      apiCounts[api].total++;
      if (limited.includes(point)) {
        apiCounts[api].limited++;
      }
    });
    
    const rates: Record<string, number> = {};
    Object.entries(apiCounts).forEach(([api, counts]) => {
      rates[api] = counts.total > 0 ? counts.limited / counts.total : 0;
    });
    
    return rates;
  }
  
  exportMetrics(): string {
    const report: string[] = ['# Metrics Report'];
    report.push(`Generated at: ${new Date().toISOString()}\n`);
    
    // Cache metrics
    const cacheHitRate = this.getCacheHitRate();
    report.push(`## Cache Performance`);
    report.push(`Hit Rate (1h): ${(cacheHitRate * 100).toFixed(2)}%`);
    
    const cacheLatency = this.getSummary('cache.latency');
    report.push(`Cache Latency - Avg: ${cacheLatency.avg.toFixed(2)}ms, P95: ${cacheLatency.p95.toFixed(2)}ms`);
    
    // Rate limit metrics
    const rateLimitRates = this.getRateLimitRate();
    report.push(`\n## Rate Limiting`);
    Object.entries(rateLimitRates).forEach(([api, rate]) => {
      report.push(`${api}: ${(rate * 100).toFixed(2)}% limited`);
    });
    
    // API latency
    report.push(`\n## API Latency`);
    ['hackernews', 'reddit'].forEach(api => {
      const latency = this.getSummary(`api.latency`, 3600000);
      if (latency.count > 0) {
        report.push(`${api}: Avg ${latency.avg.toFixed(0)}ms, P95 ${latency.p95.toFixed(0)}ms`);
      }
    });
    
    return report.join('\n');
  }
}
```

**Metrics Integration**:
```javascript
// n8n function node for metrics collection
const collectMetrics = () => {
  let metrics = $getWorkflowStaticData('metrics');
  
  if (!metrics) {
    metrics = {
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0
      },
      rateLimit: {
        allowed: 0,
        limited: 0,
        limitRate: 0
      },
      api: {
        requests: {},
        errors: {},
        latency: {}
      },
      lastReset: Date.now()
    };
    
    $setWorkflowStaticData('metrics', metrics);
  }
  
  // Reset hourly
  if (Date.now() - metrics.lastReset > 3600000) {
    metrics = {
      cache: { hits: 0, misses: 0, hitRate: 0 },
      rateLimit: { allowed: 0, limited: 0, limitRate: 0 },
      api: { requests: {}, errors: {}, latency: {} },
      lastReset: Date.now()
    };
    $setWorkflowStaticData('metrics', metrics);
  }
  
  return metrics;
};

// Record cache hit/miss
const recordCacheMetric = (hit) => {
  const metrics = collectMetrics();
  
  if (hit) {
    metrics.cache.hits++;
  } else {
    metrics.cache.misses++;
  }
  
  const total = metrics.cache.hits + metrics.cache.misses;
  metrics.cache.hitRate = total > 0 ? metrics.cache.hits / total : 0;
  
  $setWorkflowStaticData('metrics', metrics);
};

// Record API metrics
const recordAPIMetric = (api, duration, error = null) => {
  const metrics = collectMetrics();
  
  if (!metrics.api.requests[api]) {
    metrics.api.requests[api] = 0;
    metrics.api.errors[api] = 0;
    metrics.api.latency[api] = [];
  }
  
  metrics.api.requests[api]++;
  
  if (error) {
    metrics.api.errors[api]++;
  } else {
    metrics.api.latency[api].push(duration);
    
    // Keep only last 100 latency measurements
    if (metrics.api.latency[api].length > 100) {
      metrics.api.latency[api].shift();
    }
  }
  
  $setWorkflowStaticData('metrics', metrics);
};
```

### 5.5.8 Test under load conditions

**Objective**: Verify system performance under high load.

**Load Testing Suite**:
```typescript
// tests/load/cache-rate-limit.test.ts
describe('Load Testing', () => {
  let cacheManager: SmartCacheManager;
  let rateLimiter: APIRateLimitManager;
  let metrics: MetricsCollector;
  
  beforeAll(() => {
    cacheManager = new SmartCacheManager({ maxSize: 50 * 1024 * 1024 });
    rateLimiter = new APIRateLimitManager();
    metrics = new MetricsCollector();
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
        hits: results.filter(r => r.type === 'read' && r.hit).length,
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
        await cacheManager.set(`large-${i}`, largeData);
      }
      
      const stats = cacheManager.getStats();
      expect(stats.entries).toBeLessThan(60); // Some entries evicted
      expect(stats.totalSize).toBeLessThanOrEqual(50 * 1024 * 1024);
    });
  });
  
  describe('Rate Limiter Performance', () => {
    it('should handle burst traffic correctly', async () => {
      const limiter = rateLimiter.getLimiter('hackernews');
      const requests = Array(50).fill(null);
      
      const startTime = Date.now();
      let blocked = 0;
      
      for (const _ of requests) {
        const check = await limiter.checkLimit();
        if (!check.allowed) {
          blocked++;
          await limiter.waitForSlot();
        }
        limiter.recordRequest();
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      const duration = Date.now() - startTime;
      
      expect(blocked).toBeGreaterThan(0); // Some requests should be rate limited
      expect(duration).toBeGreaterThan(5000); // Should take time due to rate limiting
    });
    
    it('should handle multi-API rate limiting', async () => {
      const apis = ['hackernews', 'reddit'];
      const requestsPerApi = 100;
      
      const results = await Promise.all(
        apis.map(async (api) => {
          const results = [];
          
          for (let i = 0; i < requestsPerApi; i++) {
            await rateLimiter.checkAndWait(api);
            results.push({
              api,
              timestamp: Date.now(),
              index: i
            });
            
            // Simulate API response time
            await new Promise(resolve => 
              setTimeout(resolve, Math.random() * 100)
            );
          }
          
          return results;
        })
      );
      
      // Verify rate limits were respected
      results.forEach((apiResults, idx) => {
        const api = apis[idx];
        const limit = API_RATE_LIMITS[api];
        
        // Check per-second limit
        if (limit.maxRequestsPerSecond) {
          const windows = {};
          apiResults.forEach(r => {
            const second = Math.floor(r.timestamp / 1000);
            windows[second] = (windows[second] || 0) + 1;
          });
          
          Object.values(windows).forEach(count => {
            expect(count).toBeLessThanOrEqual(limit.maxRequestsPerSecond);
          });
        }
      });
    });
  });
  
  describe('Combined Load Test', () => {
    it('should handle realistic mixed workload', async () => {
      const workloadDuration = 10000; // 10 seconds
      const endTime = Date.now() + workloadDuration;
      
      const stats = {
        cacheHits: 0,
        cacheMisses: 0,
        rateLimited: 0,
        apiCalls: 0,
        errors: 0
      };
      
      // Simulate realistic workload
      const tasks = [];
      
      while (Date.now() < endTime) {
        // Random operation
        const operation = Math.random();
        
        if (operation < 0.6) {
          // 60% cache check
          tasks.push(
            (async () => {
              const key = `query-${Math.floor(Math.random() * 20)}`;
              const cached = await cacheManager.get(key);
              
              if (cached) {
                stats.cacheHits++;
                metrics.recordCacheHit('test', true);
              } else {
                stats.cacheMisses++;
                metrics.recordCacheHit('test', false);
                
                // Simulate API call
                try {
                  await rateLimiter.checkAndWait('hackernews');
                  stats.apiCalls++;
                  
                  // Cache the result
                  await cacheManager.set(key, { data: 'result' }, 300000);
                } catch (error) {
                  stats.rateLimited++;
                }
              }
            })()
          );
        } else if (operation < 0.9) {
          // 30% new queries
          tasks.push(
            (async () => {
              try {
                await rateLimiter.checkAndWait('reddit');
                stats.apiCalls++;
                
                const key = `new-query-${Date.now()}`;
                await cacheManager.set(key, { data: 'new-result' }, 600000);
              } catch (error) {
                stats.errors++;
              }
            })()
          );
        } else {
          // 10% metrics check
          tasks.push(
            (async () => {
              const cacheStats = cacheManager.getStats();
              const hitRate = metrics.getCacheHitRate(60000);
              console.log(`Cache hit rate: ${(hitRate * 100).toFixed(2)}%`);
            })()
          );
        }
        
        // Add some delay between operations
        await new Promise(resolve => 
          setTimeout(resolve, Math.random() * 100)
        );
      }
      
      // Wait for all tasks to complete
      await Promise.all(tasks);
      
      console.log('Combined Load Test Results:', stats);
      
      // Verify system remained stable
      expect(stats.errors).toBeLessThan(stats.apiCalls * 0.01); // Less than 1% errors
      expect(stats.cacheHits).toBeGreaterThan(0);
      
      // Check final metrics
      const finalHitRate = metrics.getCacheHitRate();
      expect(finalHitRate).toBeGreaterThan(0.3); // At least 30% hit rate
    });
  });
});
```

**Performance Monitoring Dashboard**:
```javascript
// n8n monitoring workflow
const generatePerformanceReport = () => {
  const metrics = $getWorkflowStaticData('metrics') || {};
  const cacheManager = $getWorkflowStaticData('cacheManager');
  const rateLimiter = $getWorkflowStaticData('rateLimitManager');
  
  const report = {
    timestamp: new Date().toISOString(),
    cache: {
      hitRate: metrics.cache?.hitRate || 0,
      totalHits: metrics.cache?.hits || 0,
      totalMisses: metrics.cache?.misses || 0,
      size: cacheManager?.getStats() || { entries: 0, totalSize: 0 }
    },
    rateLimit: {
      limitRate: metrics.rateLimit?.limitRate || 0,
      totalAllowed: metrics.rateLimit?.allowed || 0,
      totalLimited: metrics.rateLimit?.limited || 0,
      currentStatus: {}
    },
    api: {
      totalRequests: 0,
      errorRate: 0,
      avgLatency: {},
      p95Latency: {}
    }
  };
  
  // Calculate API metrics
  if (metrics.api) {
    Object.entries(metrics.api.requests || {}).forEach(([api, count]) => {
      report.api.totalRequests += count;
      
      const errors = metrics.api.errors[api] || 0;
      const latencies = metrics.api.latency[api] || [];
      
      if (count > 0) {
        report.api.errorRate = errors / count;
      }
      
      if (latencies.length > 0) {
        const sorted = latencies.sort((a, b) => a - b);
        report.api.avgLatency[api] = 
          latencies.reduce((a, b) => a + b, 0) / latencies.length;
        report.api.p95Latency[api] = 
          sorted[Math.floor(sorted.length * 0.95)];
      }
    });
  }
  
  // Check rate limit status
  if (rateLimiter) {
    ['hackernews', 'reddit'].forEach(api => {
      const limit = rateLimiter.limits[api];
      if (limit) {
        const now = Date.now();
        const recentRequests = limit.requests.filter(
          t => now - t < limit.windowMs
        ).length;
        
        report.rateLimit.currentStatus[api] = {
          used: recentRequests,
          limit: limit.maxRequests,
          percentage: (recentRequests / limit.maxRequests) * 100
        };
      }
    });
  }
  
  return report;
};

// Generate and log report
const performanceReport = generatePerformanceReport();
console.log('Performance Report:', JSON.stringify(performanceReport, null, 2));

// Alert if issues detected
if (performanceReport.cache.hitRate < 0.2) {
  console.warn('Low cache hit rate detected!');
}

if (performanceReport.api.errorRate > 0.05) {
  console.warn('High API error rate detected!');
}

Object.entries(performanceReport.rateLimit.currentStatus).forEach(([api, status]) => {
  if (status.percentage > 80) {
    console.warn(`${api} approaching rate limit: ${status.percentage.toFixed(1)}%`);
  }
});

return [{
  json: performanceReport
}];
```

## Testing Checklist

### Unit Tests
```typescript
// tests/utils/rate-limiter.test.ts
describe('RateLimiter', () => {
  it('should enforce window limits', async () => {
    const limiter = new RateLimiter({
      maxRequests: 10,
      windowMs: 1000
    });
    
    // Make 10 requests
    for (let i = 0; i < 10; i++) {
      const check = await limiter.checkLimit();
      expect(check.allowed).toBe(true);
      limiter.recordRequest();
    }
    
    // 11th request should be blocked
    const check = await limiter.checkLimit();
    expect(check.allowed).toBe(false);
    expect(check.waitTime).toBeGreaterThan(0);
  });
  
  it('should enforce per-second limits', async () => {
    const limiter = new RateLimiter({
      maxRequests: 100,
      windowMs: 60000,
      maxRequestsPerSecond: 2
    });
    
    // Make 2 quick requests
    limiter.recordRequest();
    limiter.recordRequest();
    
    // 3rd request within same second should be blocked
    const check = await limiter.checkLimit();
    expect(check.allowed).toBe(false);
    expect(check.waitTime).toBeLessThanOrEqual(1000);
  });
});

// tests/services/cache-manager.test.ts
describe('CacheManager', () => {
  it('should evict LRU entries when full', async () => {
    const cache = new CacheManager({ maxSize: 1024 }); // 1KB limit
    
    // Add entries that exceed limit
    await cache.set('old', 'x'.repeat(500));
    await cache.set('newer', 'x'.repeat(500));
    await cache.set('newest', 'x'.repeat(500));
    
    // Old entry should be evicted
    expect(await cache.get('old')).toBeNull();
    expect(await cache.get('newer')).toBeTruthy();
    expect(await cache.get('newest')).toBeTruthy();
  });
  
  it('should respect TTL', async () => {
    const cache = new CacheManager();
    
    await cache.set('temp', 'data', 100); // 100ms TTL
    expect(await cache.get('temp')).toBe('data');
    
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(await cache.get('temp')).toBeNull();
  });
});
```

### Integration Tests
```typescript
// tests/integration/cache-rate-limit.test.ts
describe('Cache and Rate Limit Integration', () => {
  it('should cache API responses correctly', async () => {
    const response1 = await makeAPIRequest('hackernews', 'javascript');
    const response2 = await makeAPIRequest('hackernews', 'javascript');
    
    expect(response1.metadata.cached).toBe(false);
    expect(response2.metadata.cached).toBe(true);
    expect(response1.data).toEqual(response2.data);
  });
  
  it('should handle rate limits gracefully', async () => {
    const requests = Array(20).fill(null).map((_, i) => 
      makeAPIRequest('reddit', `test-${i}`)
    );
    
    const results = await Promise.allSettled(requests);
    const successful = results.filter(r => r.status === 'fulfilled');
    const rateLimited = results.filter(r => 
      r.status === 'fulfilled' && r.value.status === 'rate_limited'
    );
    
    expect(successful.length).toBeGreaterThan(0);
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
```

### Manual Testing Scenarios

1. **Cache Effectiveness**:
   - [ ] Run same query multiple times
   - [ ] Verify cache hits increase
   - [ ] Check cache size limits
   - [ ] Test cache expiration

2. **Rate Limiting**:
   - [ ] Trigger rate limits
   - [ ] Verify wait times
   - [ ] Test recovery after limits
   - [ ] Check multi-API limiting

3. **Performance**:
   - [ ] Monitor response times
   - [ ] Check memory usage
   - [ ] Test under high load
   - [ ] Verify metrics accuracy

4. **Edge Cases**:
   - [ ] Network failures
   - [ ] Cache corruption
   - [ ] Clock skew
   - [ ] Concurrent access

## Common Issues and Solutions

### Issue: Cache memory leak
**Solution**: Implement strict size limits and cleanup
```typitten
// Add memory monitoring
setInterval(() => {
  const usage = process.memoryUsage();
  if (usage.heapUsed > 500 * 1024 * 1024) { // 500MB
    console.warn('High memory usage detected, clearing cache');
    cacheManager.clear();
  }
}, 60000);
```

### Issue: Rate limit synchronization across instances
**Solution**: Use shared storage for rate limit state
```typescript
// Redis-based rate limiter
class RedisRateLimiter extends RateLimiter {
  async checkLimit(key: string): Promise<any> {
    const count = await redis.incr(`ratelimit:${key}`);
    await redis.expire(`ratelimit:${key}`, this.config.windowMs / 1000);
    
    return {
      allowed: count <= this.config.maxRequests,
      remaining: Math.max(0, this.config.maxRequests - count)
    };
  }
}
```

### Issue: Cache stampede on popular queries
**Solution**: Implement request coalescing
```typescript
class CoalescingCache extends CacheManager {
  private pendingRequests = new Map<string, Promise<any>>();
  
  async getOrFetch<T>(
    key: string, 
    fetcher: () => Promise<T>
  ): Promise<T> {
    // Check cache first
    const cached = await this.get<T>(key);
    if (cached) return cached;
    
    // Check if request is already pending
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }
    
    // Start new request
    const promise = fetcher().then(async (data) => {
      await this.set(key, data);
      this.pendingRequests.delete(key);
      return data;
    });
    
    this.pendingRequests.set(key, promise);
    return promise;
  }
}
```

## Next Steps

After completing task 5.5:
1. Monitor cache hit rates in production
2. Fine-tune TTL strategies based on usage
3. Implement distributed caching if needed
4. Add cache warming for trending topics
5. Prepare for final integration testing (task 5.6) 