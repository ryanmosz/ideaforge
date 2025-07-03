/**
 * n8n function node for cache key generation
 * This script can be used in n8n workflows to generate consistent cache keys
 */

// Main cache key generation function
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
  
  // Sort object keys recursively
  const sortObject = (obj) => {
    if (Array.isArray(obj)) {
      return obj.map(item => 
        typeof item === 'object' && item !== null ? sortObject(item) : item
      ).sort();
    }
    
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    return Object.keys(obj)
      .sort()
      .reduce((sorted, key) => {
        sorted[key] = typeof obj[key] === 'object' 
          ? sortObject(obj[key]) 
          : obj[key];
        return sorted;
      }, {});
  };
  
  const sorted = sortObject(normalized);
  
  // Create key components
  const components = [api, operation];
  
  // Add sorted parameters
  Object.entries(sorted).forEach(([key, value]) => {
    if (key !== 'api' && key !== 'op') {
      // Sanitize value
      let sanitized = value;
      if (typeof value === 'string') {
        sanitized = value.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 50);
      } else if (Array.isArray(value)) {
        sanitized = value.join(',').substring(0, 50);
      } else {
        sanitized = String(value).substring(0, 50);
      }
      components.push(`${key}:${sanitized}`);
    }
  });
  
  return components.join(':');
};

// Specific functions for different cache key types
const generateSearchKey = (api, query, options = {}) => {
  const normalizedQuery = query.toLowerCase().trim();
  return generateCacheKey(api, 'search', {
    q: normalizedQuery,
    ...options
  });
};

const generateSessionKey = (sessionId, operation, params = {}) => {
  return generateCacheKey('session', `${sessionId}:${operation}`, params);
};

const generateTimeBasedKey = (namespace, identifier, granularity = 'hour') => {
  const date = new Date();
  let timePart;
  
  switch (granularity) {
    case 'minute':
      timePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`;
      break;
    case 'hour':
      timePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}`;
      break;
    case 'day':
      timePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
      break;
    default:
      timePart = Date.now();
  }
  
  return `${namespace}:${identifier}:${timePart}`;
};

// Example usage in n8n Function node:
if (typeof $input !== 'undefined' && $input.json) {
  const data = $input.json;
  
  // Generate search cache key
  if (data.type === 'search') {
    const cacheKey = generateSearchKey(
      data.api || 'hackernews',
      data.query || '',
      {
        limit: data.options?.limit || 30,
        sort: data.options?.sortBy || 'relevance',
        subreddits: data.options?.subreddits?.sort().join(',') || ''
      }
    );
    
    console.log(`Generated cache key: ${cacheKey}`);
    
    // Return the key in the output
    return {
      json: {
        ...data,
        cacheKey
      }
    };
  }
  
  // Generate session cache key
  if (data.type === 'session') {
    const cacheKey = generateSessionKey(
      data.sessionId,
      data.operation || 'search',
      data.params || {}
    );
    
    return {
      json: {
        ...data,
        cacheKey
      }
    };
  }
  
  // Generate time-based cache key
  if (data.type === 'timebased') {
    const cacheKey = generateTimeBasedKey(
      data.namespace || 'stats',
      data.identifier || 'views',
      data.granularity || 'hour'
    );
    
    return {
      json: {
        ...data,
        cacheKey
      }
    };
  }
  
  // Default: pass through
  return {
    json: data
  };
} else {
  // Standalone test
  console.log('Testing cache key generation...');
  
  const testKey1 = generateSearchKey('hackernews', 'JavaScript', { limit: 50 });
  console.log('Search key 1:', testKey1);
  
  const testKey2 = generateSearchKey('reddit', 'typescript', { 
    subreddits: ['programming', 'typescript'] 
  });
  console.log('Search key 2:', testKey2);
  
  const testKey3 = generateSessionKey('session-123', 'search', { page: 2 });
  console.log('Session key:', testKey3);
  
  const testKey4 = generateTimeBasedKey('analytics', 'pageviews', 'hour');
  console.log('Time-based key:', testKey4);
  
  // Test consistency
  const key1a = generateSearchKey('hackernews', 'JavaScript', { limit: 50, sort: 'date' });
  const key1b = generateSearchKey('hackernews', 'JavaScript', { sort: 'date', limit: 50 });
  console.log('Keys are consistent:', key1a === key1b);
} 