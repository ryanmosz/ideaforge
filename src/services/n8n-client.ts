import axios, { AxiosInstance, AxiosError } from 'axios';
import { 
  N8nConfig, 
  N8nResponse,
  HNSearchOptions,
  HNSearchResults,
  RedditSearchOptions,
  RedditSearchResults,
  HealthCheckResponse,
  SearchResponse
} from '../types/n8n-types';
import { getN8nConfig } from '../config/n8n-config';
import { RetryHandler, RetryConfig } from '../utils/retry-handler';
import { ResponseTransformer } from './response-transformer';
import { ResearchResult } from '../agents/types/research-types';
import { rateLimitManager } from '../utils/rate-limiter';
import { CacheKeyGenerator } from '../utils/cache-key-generator';
import { CircuitBreaker } from '../utils/circuit-breaker';
import { SmartCacheManager } from './smart-cache-manager';

/**
 * Client for communicating with n8n webhooks
 */
export class N8nClient {
  private client: AxiosInstance;
  private config: N8nConfig;
  private retryHandler: RetryHandler;
  private transformer: ResponseTransformer;
  private circuitBreaker: CircuitBreaker;
  private cacheManager: SmartCacheManager;
  
  constructor(config?: Partial<N8nConfig>, retryConfig?: Partial<RetryConfig>) {
    // Merge provided config with environment config
    this.config = {
      ...getN8nConfig(),
      ...config
    };
    
    // Create axios instance with base configuration
    this.client = axios.create({
      baseURL: `${this.config.baseUrl}/${this.config.webhookPath}`,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey
      }
    });
    
    // Create retry handler with custom config if provided
    this.retryHandler = new RetryHandler({
      maxRetries: this.config.retries,
      ...retryConfig
    });
    
    // Create response transformer
    this.transformer = new ResponseTransformer();
    
    // Initialize dependencies
    this.circuitBreaker = new CircuitBreaker('n8n-api', {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      successThreshold: 2,
      windowSize: 120000 // 2 minutes
    });
    
    this.cacheManager = new SmartCacheManager({
      maxSize: 100 * 1024 * 1024, // 100MB
      popularityThreshold: 10
    });
    
    this.setupInterceptors();
  }
  
  /**
   * Set up request and response interceptors for logging and error handling
   */
  private setupInterceptors(): void {
    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[N8n Client] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[N8n Client] Request error:', error.message);
        return Promise.reject(error);
      }
    );
    
    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log(`[N8n Client] Response from ${response.config.url}: ${response.status}`);
        return response;
      },
      async (error: AxiosError) => {
        if (error.code === 'ECONNABORTED') {
          console.error('[N8n Client] Request timeout');
          throw new Error('Request timeout - n8n webhook did not respond');
        }
        
        if (error.response) {
          console.error(`[N8n Client] Error response: ${error.response.status} - ${error.response.statusText}`);
          if (error.response.status === 401) {
            throw new Error('Unauthorized - check your N8N_API_KEY');
          }
          if (error.response.status === 404) {
            throw new Error('Webhook not found - ensure n8n workflows are activated');
          }
        } else if (error.request) {
          console.error('[N8n Client] No response received');
          throw new Error('No response from n8n - check if n8n is running');
        } else {
          console.error('[N8n Client] Error:', error.message);
        }
        
        throw error;
      }
    );
  }
  
  /**
   * Get the current configuration
   */
  getConfig(): Readonly<N8nConfig> {
    return { ...this.config };
  }
  
  /**
   * Get the retry handler for configuration inspection
   */
  getRetryHandler(): RetryHandler {
    return this.retryHandler;
  }
  
  /**
   * Get the response transformer for external use
   */
  getTransformer(): ResponseTransformer {
    return this.transformer;
  }
  
  /**
   * Get rate limit statistics for all APIs
   */
  getRateLimitStats(): Record<string, any> {
    return rateLimitManager.getAllStats();
  }
  
  /**
   * Test connectivity to n8n
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/ideaforge/health');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Search HackerNews via n8n webhook
   */
  async searchHackerNews(
    query: string, 
    sessionId: string,
    options?: HNSearchOptions
  ): Promise<SearchResponse> {
    const endpoint = '/ideaforge/hackernews-search';
    
    // Generate cache key
    const cacheKey = CacheKeyGenerator.generateSearchKey('hackernews', query, {
      limit: options?.limit,
      sortBy: options?.sortBy,
      dateRange: options?.dateRange
    });
    
    // Check cache first
    const cached = await this.cacheManager.get<SearchResponse>(cacheKey);
    if (cached) {
      console.log(`[N8nClient] Cache hit for HackerNews query: "${query}"`);
      return {
        ...cached,
        metadata: {
          ...cached.metadata,
          cached: true,
          cacheKey
        }
      };
    }
    
    // Check rate limits
    try {
      await rateLimitManager.checkAndWait('hackernews', sessionId);
    } catch (error) {
      console.warn('[N8nClient] Rate limit exceeded for HackerNews API');
      return {
        success: false,
        data: { items: [] },
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'HackerNews API rate limit exceeded. Please try again later.'
        },
        metadata: {
          source: 'hackernews',
          query,
          timestamp: new Date().toISOString(),
          cached: false
        }
      };
    }
    
    const request = {
      query,
      sessionId,
      timestamp: new Date().toISOString()
    };
    
    try {
      const response = await this.executeRequest<SearchResponse>(
        endpoint, 
        request,
        `HackerNews search: ${query}`
      );
      
      if (response.success && response.data) {
        // Cache the successful response with smart TTL
        const resultCount = response.data.items?.length || 0;
        await this.cacheManager.setSearchResult(
          'hackernews',
          query,
          response,
          resultCount
        );
        
        console.log(`[N8nClient] Cached HackerNews results for query: "${query}" (${resultCount} items)`);
      }
      
      return response;
    } catch (error) {
      // Return error response instead of throwing
      return this.createErrorResponse(error, 'hackernews', query);
    }
  }
  
  /**
   * Search Reddit via n8n webhook
   */
  async searchReddit(
    query: string,
    sessionId: string,
    options?: RedditSearchOptions
  ): Promise<SearchResponse> {
    const endpoint = '/ideaforge/reddit-search';
    
    // Generate cache key
    const cacheKey = CacheKeyGenerator.generateSearchKey('reddit', query, {
      subreddits: options?.subreddits,
      limit: options?.limit,
      sortBy: options?.sortBy,
      timeframe: options?.timeframe
    });
    
    // Check cache first
    const cached = await this.cacheManager.get<SearchResponse>(cacheKey);
    if (cached) {
      console.log(`[N8nClient] Cache hit for Reddit query: "${query}"`);
      return {
        ...cached,
        metadata: {
          ...cached.metadata,
          cached: true,
          cacheKey
        }
      };
    }
    
    // Check rate limits
    try {
      await rateLimitManager.checkAndWait('reddit', sessionId);
    } catch (error) {
      console.warn('[N8nClient] Rate limit exceeded for Reddit API');
      return {
        success: false,
        data: { items: [] },
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Reddit API rate limit exceeded. Please try again later.'
        },
        metadata: {
          source: 'reddit',
          query,
          timestamp: new Date().toISOString(),
          cached: false
        }
      };
    }
    
    const request = {
      query,
      sessionId,
      subreddits: options?.subreddits || [],
      timestamp: new Date().toISOString()
    };
    
    try {
      const response = await this.executeRequest<SearchResponse>(
        endpoint,
        request,
        `Reddit search: ${query}`
      );
      
      if (response.success && response.data) {
        // Cache the successful response with smart TTL
        const resultCount = response.data.items?.length || 0;
        await this.cacheManager.setSearchResult(
          'reddit',
          query,
          response,
          resultCount
        );
        
        console.log(`[N8nClient] Cached Reddit results for query: "${query}" (${resultCount} items)`);
      }
      
      return response;
    } catch (error) {
      // Return error response instead of throwing
      return this.createErrorResponse(error, 'reddit', query);
    }
  }
  
  /**
   * Check health status of n8n webhooks
   */
  async checkHealth(): Promise<N8nResponse<HealthCheckResponse>> {
    return this.get<HealthCheckResponse>('/ideaforge/health');
  }
  
  /**
   * Search Hacker News and return transformed results
   */
  async searchHackerNewsTransformed(
    query: string, 
    sessionId: string,
    options?: HNSearchOptions
  ): Promise<ResearchResult[]> {
    const response = await this.searchHackerNews(query, sessionId, options);
    
    if (!response.success || !response.data) {
      console.error(`[N8n Client] HackerNews search failed: ${response.error?.message}`);
      return [];
    }
    
    // Transform the unified response to HNSearchResults format for the transformer
    const hnResults: HNSearchResults = {
      hits: response.data.items.map(item => ({
        objectID: item.id,
        title: item.title || '',
        url: item.url,
        author: item.author || '',
        created_at: item.created_at || '',
        points: item.score || 0,
        num_comments: item.num_comments || 0,
        _highlightResult: {
          title: { value: item.title || '' }
        }
      })),
      nbHits: response.data.items.length,
      page: 0,
      nbPages: 1,
      hitsPerPage: response.data.items.length,
      processingTimeMS: 0,
      query: query
    };
    
    return this.transformer.transformHackerNewsResults(hnResults);
  }
  
  /**
   * Search Reddit and return transformed results
   */
  async searchRedditTransformed(
    query: string,
    sessionId: string,
    options?: RedditSearchOptions
  ): Promise<ResearchResult[]> {
    const response = await this.searchReddit(query, sessionId, options);
    
    if (!response.success || !response.data) {
      console.error(`[N8n Client] Reddit search failed: ${response.error?.message}`);
      return [];
    }
    
    // Transform the unified response to RedditSearchResults format for the transformer
    const redditResults: RedditSearchResults = {
      posts: response.data.items.filter(item => !item.is_comment).map(item => ({
        id: item.id,
        title: item.title || '',
        selftext: item.text || '',
        permalink: item.permalink || `/r/${item.subreddit || 'unknown'}/comments/${item.id}/`,
        url: item.url || '',
        author: item.author || '[deleted]',
        created_utc: Math.floor(new Date(item.created_at || '').getTime() / 1000),
        score: item.score || 0,
        ups: item.score || 0,
        downs: 0,
        num_comments: item.num_comments || 0,
        subreddit: item.subreddit || '',
        upvote_ratio: item.upvote_ratio || 1
      })),
      comments: response.data.items.filter(item => item.is_comment).map(item => ({
        id: item.id,
        body: item.text || '',
        permalink: item.permalink || `/r/${item.subreddit || 'unknown'}/comments/${item.link_id}/comment/${item.id}/`,
        author: item.author || '[deleted]',
        created_utc: Math.floor(new Date(item.created_at || '').getTime() / 1000),
        score: item.score || 0,
        ups: item.score || 0,
        downs: 0,
        subreddit: item.subreddit || '',
        link_title: item.link_title || '',
        link_id: item.link_id || '',
        parent_id: item.parent_id || ''
      })),
      query: query,
      subreddits: options?.subreddits || []
    };
    
    return this.transformer.transformRedditResults(redditResults);
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats() {
    const stats = this.cacheManager.getStats();
    const effectiveness = this.cacheManager.getCacheEffectiveness();
    const popularQueries = this.cacheManager.getPopularQueries();
    const trendingQueries = this.cacheManager.getTrendingQueries();
    
    return {
      ...stats,
      effectiveness,
      popularQueries,
      trendingQueries
    };
  }
  
  /**
   * Execute a request with circuit breaker and retry logic
   */
  private async executeRequest<T>(
    endpoint: string,
    data: any,
    operation: string
  ): Promise<T> {
    return this.circuitBreaker.execute(
      async () => {
        return this.retryHandler.execute(
          async () => {
            const response = await this.client.post<T>(endpoint, data);
            return response.data;
          },
          operation
        );
      }
    );
  }
  
  /**
   * Create an error response
   */
  private createErrorResponse(
    error: any,
    source: string,
    query: string
  ): SearchResponse {
    return {
      success: false,
      data: { items: [] },
      error: {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message || 'An unknown error occurred'
      },
      metadata: {
        source,
        query,
        timestamp: new Date().toISOString(),
        cached: false
      }
    };
  }
  
  /**
   * Make a POST request to an n8n webhook
   */
  protected async post<T>(endpoint: string, data: any): Promise<N8nResponse<T>> {
    try {
      return await this.retryHandler.execute(
        async () => {
          const response = await this.client.post<N8nResponse<T>>(endpoint, data);
          return response.data;
        },
        `POST ${endpoint}`
      );
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  /**
   * Make a GET request to an n8n webhook
   */
  protected async get<T>(endpoint: string): Promise<N8nResponse<T>> {
    try {
      return await this.retryHandler.execute(
        async () => {
          const response = await this.client.get<N8nResponse<T>>(endpoint);
          return response.data;
        },
        `GET ${endpoint}`
      );
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  /**
   * Handle errors and return a consistent error response
   */
  private handleError(error: any): N8nResponse<any> {
    console.error('[N8n Client] Error:', error);
    
    return {
      status: 'error',
      error: error.message || 'Unknown error occurred',
      metadata: {
        cached: false,
        requestDuration: 0
      }
    };
  }
}
   