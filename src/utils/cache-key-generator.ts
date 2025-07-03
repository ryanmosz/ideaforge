/**
 * Cache key generator utility for creating consistent, collision-free cache keys
 */
import { createHash } from 'crypto';

export interface CacheKeyOptions {
  /** Maximum length for readable keys before switching to hash */
  maxReadableLength?: number;
  /** Hash algorithm to use */
  hashAlgorithm?: string;
  /** Hash output length */
  hashLength?: number;
}

/**
 * Generates consistent, collision-free cache keys for various use cases
 */
export class CacheKeyGenerator {
  private static defaultOptions: CacheKeyOptions = {
    maxReadableLength: 200,
    hashAlgorithm: 'sha256',
    hashLength: 16
  };
  
  /**
   * Generate a cache key with namespace and identifier
   */
  static generateKey(
    namespace: string,
    identifier: string,
    params: Record<string, any> = {},
    options: CacheKeyOptions = {}
  ): string {
    const opts = { ...this.defaultOptions, ...options };
    
    // Sort parameters for consistency
    const sortedParams = this.sortObject(params);
    
    // Create a deterministic string representation
    const paramString = JSON.stringify(sortedParams);
    
    // Generate hash for long keys
    if (paramString.length > opts.maxReadableLength!) {
      const hash = createHash(opts.hashAlgorithm!)
        .update(paramString)
        .digest('hex')
        .substring(0, opts.hashLength!);
      
      return `${namespace}:${identifier}:${hash}`;
    }
    
    // For short keys, use readable format
    const paramPairs = Object.entries(sortedParams)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${key}=${this.sanitizeValue(value)}`)
      .join(':');
    
    return `${namespace}:${identifier}${paramPairs ? ':' + paramPairs : ''}`;
  }
  
  /**
   * Generate a search-specific cache key
   */
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
  
  /**
   * Generate a session-specific cache key
   */
  static generateSessionKey(
    sessionId: string,
    operation: string,
    params: Record<string, any> = {}
  ): string {
    return this.generateKey('session', `${sessionId}:${operation}`, params);
  }
  
  /**
   * Generate a user-specific cache key
   */
  static generateUserKey(
    userId: string,
    resource: string,
    params: Record<string, any> = {}
  ): string {
    return this.generateKey('user', `${userId}:${resource}`, params);
  }
  
  /**
   * Generate a composite key from multiple parts
   */
  static generateCompositeKey(parts: string[]): string {
    const validParts = parts.filter(p => p && p.trim());
    if (validParts.length === 0) {
      throw new Error('At least one valid key part is required');
    }
    
    return validParts
      .map(part => this.sanitizeKeyPart(part))
      .join(':');
  }
  
  /**
   * Generate a time-based cache key (useful for time-series data)
   */
  static generateTimeBasedKey(
    namespace: string,
    identifier: string,
    granularity: 'minute' | 'hour' | 'day' = 'hour',
    timestamp: number = Date.now()
  ): string {
    const date = new Date(timestamp);
    let timePart: string;
    
    switch (granularity) {
      case 'minute':
        timePart = `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}_${String(date.getUTCHours()).padStart(2, '0')}${String(date.getUTCMinutes()).padStart(2, '0')}`;
        break;
      case 'hour':
        timePart = `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}_${String(date.getUTCHours()).padStart(2, '0')}`;
        break;
      case 'day':
        timePart = `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`;
        break;
    }
    
    return `${namespace}:${identifier}:${timePart}`;
  }
  
  /**
   * Parse a cache key back into its components
   */
  static parseKey(key: string): {
    namespace?: string;
    identifier?: string;
    params?: string;
  } {
    const parts = key.split(':');
    
    if (parts.length < 2) {
      return { params: key };
    }
    
    return {
      namespace: parts[0],
      identifier: parts[1],
      params: parts.slice(2).join(':')
    };
  }
  
  /**
   * Sort object recursively for consistent key generation
   */
  private static sortObject(obj: Record<string, any>): Record<string, any> {
    if (Array.isArray(obj)) {
      return obj.map(item => 
        typeof item === 'object' && item !== null ? this.sortObject(item) : item
      ).sort((a, b) => {
        // Sort arrays in a consistent way
        const aStr = typeof a === 'object' ? JSON.stringify(a) : String(a);
        const bStr = typeof b === 'object' ? JSON.stringify(b) : String(b);
        return aStr.localeCompare(bStr);
      });
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
  
  /**
   * Sanitize a value for use in a cache key
   */
  private static sanitizeValue(value: any): string {
    if (typeof value === 'string') {
      // Replace non-alphanumeric characters and limit length
      return value.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 50);
    }
    
    if (Array.isArray(value)) {
      // Join array values and limit length
      return value.map(v => this.sanitizeValue(v)).join(',').substring(0, 50);
    }
    
    if (typeof value === 'object' && value !== null) {
      // For objects, use a hash
      const str = JSON.stringify(this.sortObject(value));
      return createHash('md5').update(str).digest('hex').substring(0, 8);
    }
    
    // For other types, convert to string and limit length
    return String(value).substring(0, 50);
  }
  
  /**
   * Sanitize a key part (namespace, identifier, etc.)
   */
  private static sanitizeKeyPart(part: string): string {
    return part.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 100);
  }
}

/**
 * Convenience function for generating cache keys
 */
export function generateCacheKey(
  namespace: string,
  identifier: string,
  params?: Record<string, any>
): string {
  return CacheKeyGenerator.generateKey(namespace, identifier, params);
} 