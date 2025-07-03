/**
 * Metrics collector for tracking cache and rate limit performance
 */

export interface MetricPoint {
  timestamp: number;
  value: number;
  labels?: Record<string, string>;
}

export interface MetricSummary {
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
  p95: number;
}

export interface CacheMetrics {
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  totalRequests: number;
  avgLatency: number;
  p95Latency: number;
}

export interface RateLimitMetrics {
  totalAllowed: number;
  totalLimited: number;
  limitRate: number;
  byApi: Record<string, {
    allowed: number;
    limited: number;
    rate: number;
  }>;
}

export interface APIMetrics {
  totalRequests: number;
  errorRate: number;
  avgLatency: number;
  p95Latency: number;
  byApi: Record<string, {
    requests: number;
    errors: number;
    avgLatency: number;
    p95Latency: number;
  }>;
}

export class MetricsCollector {
  private metrics: Map<string, MetricPoint[]> = new Map();
  private readonly maxPoints = 1000; // Keep last 1000 points per metric
  private startTime: number;
  
  constructor() {
    this.startTime = Date.now();
  }
  
  /**
   * Record a cache hit or miss
   */
  recordCacheHit(api: string, hit: boolean, latency?: number): void {
    this.record(`cache.${hit ? 'hit' : 'miss'}`, 1, { api });
    
    if (latency !== undefined) {
      this.record('cache.latency', latency, { api });
    }
  }
  
  /**
   * Record a rate limit event
   */
  recordRateLimit(api: string, limited: boolean, waitTime?: number): void {
    this.record(`ratelimit.${limited ? 'limited' : 'allowed'}`, 1, { api });
    
    if (limited && waitTime !== undefined) {
      this.record('ratelimit.wait_time', waitTime, { api });
    }
  }
  
  /**
   * Record API request latency
   */
  recordLatency(api: string, operation: string, duration: number): void {
    this.record('api.latency', duration, { api, operation });
    this.record('api.request', 1, { api, operation });
  }
  
  /**
   * Record API error
   */
  recordError(api: string, operation: string, errorCode?: string): void {
    const labels: Record<string, string> = { api, operation };
    if (errorCode) {
      labels.errorCode = errorCode;
    }
    this.record('api.error', 1, labels);
  }
  
  /**
   * Record cache size metrics
   */
  recordCacheSize(sizeBytes: number, entries: number, evictions?: number): void {
    this.record('cache.size.bytes', sizeBytes);
    this.record('cache.size.entries', entries);
    
    if (evictions !== undefined) {
      this.record('cache.evictions', evictions);
    }
  }
  
  /**
   * Record a generic metric
   */
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
  
  /**
   * Get raw metric points
   */
  getMetrics(metric: string, since?: number): MetricPoint[] {
    const points = this.metrics.get(metric) || [];
    
    if (since) {
      return points.filter(p => p.timestamp >= since);
    }
    
    return points;
  }
  
  /**
   * Get metric summary statistics
   */
  getSummary(metric: string, windowMs: number = 3600000): MetricSummary {
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
      p95: values[Math.floor(values.length * 0.95)] || values[values.length - 1]
    };
  }
  
  /**
   * Get cache metrics summary
   */
  getCacheMetrics(windowMs: number = 3600000): CacheMetrics {
    const hits = this.getSummary('cache.hit', windowMs);
    const misses = this.getSummary('cache.miss', windowMs);
    const latency = this.getSummary('cache.latency', windowMs);
    
    const totalRequests = hits.count + misses.count;
    
    return {
      hitRate: totalRequests > 0 ? hits.count / totalRequests : 0,
      totalHits: hits.count,
      totalMisses: misses.count,
      totalRequests,
      avgLatency: latency.avg,
      p95Latency: latency.p95
    };
  }
  
  /**
   * Get rate limit metrics by API
   */
  getRateLimitMetrics(windowMs: number = 3600000): RateLimitMetrics {
    const since = Date.now() - windowMs;
    const limited = this.getMetrics('ratelimit.limited', since);
    const allowed = this.getMetrics('ratelimit.allowed', since);
    
    const byApi: Record<string, { allowed: number; limited: number; rate: number }> = {};
    
    // Count by API
    [...limited, ...allowed].forEach(point => {
      const api = point.labels?.api || 'unknown';
      if (!byApi[api]) {
        byApi[api] = { allowed: 0, limited: 0, rate: 0 };
      }
      
      if (limited.includes(point)) {
        byApi[api].limited++;
      } else {
        byApi[api].allowed++;
      }
    });
    
    // Calculate rates
    let totalAllowed = 0;
    let totalLimited = 0;
    
    Object.values(byApi).forEach(stats => {
      const total = stats.allowed + stats.limited;
      stats.rate = total > 0 ? stats.limited / total : 0;
      totalAllowed += stats.allowed;
      totalLimited += stats.limited;
    });
    
    return {
      totalAllowed,
      totalLimited,
      limitRate: (totalAllowed + totalLimited) > 0 
        ? totalLimited / (totalAllowed + totalLimited) 
        : 0,
      byApi
    };
  }
  
  /**
   * Get API performance metrics
   */
  getAPIMetrics(windowMs: number = 3600000): APIMetrics {
    const since = Date.now() - windowMs;
    const requests = this.getMetrics('api.request', since);
    const errors = this.getMetrics('api.error', since);
    const latencies = this.getMetrics('api.latency', since);
    
    const byApi: Record<string, any> = {};
    
    // Organize by API
    requests.forEach(point => {
      const api = point.labels?.api || 'unknown';
      if (!byApi[api]) {
        byApi[api] = { 
          requests: 0, 
          errors: 0, 
          latencies: [] 
        };
      }
      byApi[api].requests++;
    });
    
    errors.forEach(point => {
      const api = point.labels?.api || 'unknown';
      if (!byApi[api]) {
        byApi[api] = { requests: 0, errors: 0, latencies: [] };
      }
      byApi[api].errors++;
    });
    
    latencies.forEach(point => {
      const api = point.labels?.api || 'unknown';
      if (!byApi[api]) {
        byApi[api] = { requests: 0, errors: 0, latencies: [] };
      }
      byApi[api].latencies.push(point.value);
    });
    
    // Calculate stats per API
    const result: APIMetrics = {
      totalRequests: requests.length,
      errorRate: requests.length > 0 ? errors.length / requests.length : 0,
      avgLatency: 0,
      p95Latency: 0,
      byApi: {}
    };
    
    let allLatencies: number[] = [];
    
    Object.entries(byApi).forEach(([api, stats]) => {
      const apiLatencies = stats.latencies.sort((a: number, b: number) => a - b);
      allLatencies = allLatencies.concat(apiLatencies);
      
      const avg = apiLatencies.length > 0 
        ? apiLatencies.reduce((a: number, b: number) => a + b, 0) / apiLatencies.length 
        : 0;
      
      const p95 = apiLatencies.length > 0 
        ? apiLatencies[Math.floor(apiLatencies.length * 0.95)] || apiLatencies[apiLatencies.length - 1]
        : 0;
      
      result.byApi[api] = {
        requests: stats.requests,
        errors: stats.errors,
        avgLatency: avg,
        p95Latency: p95
      };
    });
    
    // Calculate overall latency stats
    allLatencies.sort((a, b) => a - b);
    if (allLatencies.length > 0) {
      result.avgLatency = allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length;
      result.p95Latency = allLatencies[Math.floor(allLatencies.length * 0.95)] || allLatencies[allLatencies.length - 1];
    }
    
    return result;
  }
  
  /**
   * Export metrics report as formatted string
   */
  exportReport(windowMs: number = 3600000): string {
    const report: string[] = ['# Metrics Report'];
    report.push(`Generated at: ${new Date().toISOString()}`);
    report.push(`Window: ${windowMs / 60000} minutes`);
    report.push(`Collector uptime: ${((Date.now() - this.startTime) / 60000).toFixed(1)} minutes\n`);
    
    // Cache metrics
    const cache = this.getCacheMetrics(windowMs);
    report.push('## Cache Performance');
    report.push(`- Hit Rate: ${(cache.hitRate * 100).toFixed(2)}%`);
    report.push(`- Total Hits: ${cache.totalHits}`);
    report.push(`- Total Misses: ${cache.totalMisses}`);
    report.push(`- Total Requests: ${cache.totalRequests}`);
    if (cache.totalRequests > 0) {
      report.push(`- Avg Latency: ${cache.avgLatency.toFixed(2)}ms`);
      report.push(`- P95 Latency: ${cache.p95Latency.toFixed(2)}ms`);
    }
    
    // Rate limit metrics
    const rateLimit = this.getRateLimitMetrics(windowMs);
    report.push('\n## Rate Limiting');
    report.push(`- Total Allowed: ${rateLimit.totalAllowed}`);
    report.push(`- Total Limited: ${rateLimit.totalLimited}`);
    report.push(`- Limit Rate: ${(rateLimit.limitRate * 100).toFixed(2)}%`);
    
    if (Object.keys(rateLimit.byApi).length > 0) {
      report.push('\nBy API:');
      Object.entries(rateLimit.byApi).forEach(([api, stats]) => {
        report.push(`  ${api}:`);
        report.push(`    - Allowed: ${stats.allowed}`);
        report.push(`    - Limited: ${stats.limited}`);
        report.push(`    - Rate: ${(stats.rate * 100).toFixed(2)}%`);
      });
    }
    
    // API metrics
    const api = this.getAPIMetrics(windowMs);
    report.push('\n## API Performance');
    report.push(`- Total Requests: ${api.totalRequests}`);
    report.push(`- Error Rate: ${(api.errorRate * 100).toFixed(2)}%`);
    if (api.totalRequests > 0) {
      report.push(`- Avg Latency: ${api.avgLatency.toFixed(0)}ms`);
      report.push(`- P95 Latency: ${api.p95Latency.toFixed(0)}ms`);
    }
    
    if (Object.keys(api.byApi).length > 0) {
      report.push('\nBy API:');
      Object.entries(api.byApi).forEach(([apiName, stats]) => {
        report.push(`  ${apiName}:`);
        report.push(`    - Requests: ${stats.requests}`);
        report.push(`    - Errors: ${stats.errors}`);
        report.push(`    - Error Rate: ${stats.requests > 0 ? ((stats.errors / stats.requests) * 100).toFixed(2) : 0}%`);
        if (stats.requests > 0) {
          report.push(`    - Avg Latency: ${stats.avgLatency.toFixed(0)}ms`);
          report.push(`    - P95 Latency: ${stats.p95Latency.toFixed(0)}ms`);
        }
      });
    }
    
    // Cache size
    const sizeStats = this.getSummary('cache.size.bytes', windowMs);
    const entryStats = this.getSummary('cache.size.entries', windowMs);
    const evictionStats = this.getSummary('cache.evictions', windowMs);
    
    if (sizeStats.count > 0) {
      report.push('\n## Cache Size');
      report.push(`- Current Size: ${(sizeStats.max / 1024 / 1024).toFixed(2)} MB`);
      report.push(`- Current Entries: ${entryStats.max}`);
      report.push(`- Total Evictions: ${evictionStats.sum}`);
    }
    
    return report.join('\n');
  }
  
  /**
   * Export metrics as JSON
   */
  exportJSON(windowMs: number = 3600000): Record<string, any> {
    return {
      timestamp: new Date().toISOString(),
      window: windowMs,
      uptimeMs: Date.now() - this.startTime,
      cache: this.getCacheMetrics(windowMs),
      rateLimit: this.getRateLimitMetrics(windowMs),
      api: this.getAPIMetrics(windowMs),
      size: {
        bytes: this.getSummary('cache.size.bytes', windowMs),
        entries: this.getSummary('cache.size.entries', windowMs),
        evictions: this.getSummary('cache.evictions', windowMs)
      }
    };
  }
  
  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
    this.startTime = Date.now();
  }
} 