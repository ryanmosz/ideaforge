import axios, { AxiosInstance, AxiosError } from 'axios';
import { 
  N8nConfig, 
  N8nResponse,
  HNSearchOptions,
  HNSearchResults,
  RedditSearchOptions,
  RedditSearchResults,
  HealthCheckResponse
} from '../types/n8n-types';
import { getN8nConfig } from '../config/n8n-config';
import { RetryHandler, RetryConfig } from '../utils/retry-handler';
import { ResponseTransformer } from './response-transformer';
import { ResearchResult } from '../agents/types/research-types';

/**
 * Client for communicating with n8n webhooks
 */
export class N8nClient {
  private client: AxiosInstance;
  private config: N8nConfig;
  private retryHandler: RetryHandler;
  private transformer: ResponseTransformer;
  
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
   * Search Hacker News for relevant content
   */
  async searchHackerNews(
    query: string, 
    sessionId: string,
    _options?: HNSearchOptions  // TODO: Use when n8n webhooks support options
  ): Promise<N8nResponse<HNSearchResults>> {
    // TODO: When n8n webhooks support advanced options, use this:
    // const request: N8nRequest<HNSearchPayload> = {
    //   action: 'searchHackerNews',
    //   payload: {
    //     query,
    //     options: {
    //       limit: options?.limit || 20,
    //       dateRange: options?.dateRange || 'all',
    //       sortBy: options?.sortBy || 'relevance',
    //       tags: options?.tags || ['story', 'comment']
    //     }
    //   },
    //   sessionId,
    //   metadata: this.createMetadata()
    // };
    
    // For now, we just pass query and sessionId as the webhook expects
    const simplifiedRequest = {
      query,
      sessionId
    };
    
    return this.post<HNSearchResults>('/ideaforge/hackernews-search', simplifiedRequest);
  }
  
  /**
   * Search Reddit for relevant content
   */
  async searchReddit(
    query: string,
    sessionId: string,
    options?: RedditSearchOptions
  ): Promise<N8nResponse<RedditSearchResults>> {
    // TODO: When n8n webhooks support advanced options, use this:
    // const request: N8nRequest<RedditSearchPayload> = {
    //   action: 'searchReddit',
    //   payload: {
    //     query,
    //     subreddits: options?.subreddits || [],
    //     options: {
    //       sortBy: options?.sortBy || 'relevance',
    //       timeframe: options?.timeframe || 'all',
    //       limit: options?.limit || 25,
    //       includeComments: options?.includeComments ?? true
    //     }
    //   },
    //   sessionId,
    //   metadata: this.createMetadata()
    // };
    
    // For now, we pass query, sessionId, and subreddits as the webhook expects
    const simplifiedRequest = {
      query,
      sessionId,
      subreddits: options?.subreddits || []
    };
    
    return this.post<RedditSearchResults>('/ideaforge/reddit-search', simplifiedRequest);
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
    
    if (response.status === 'error' || !response.data) {
      console.error(`[N8n Client] HackerNews search failed: ${response.error}`);
      return [];
    }
    
    return this.transformer.transformHackerNewsResults(response.data);
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
    
    if (response.status === 'error' || !response.data) {
      console.error(`[N8n Client] Reddit search failed: ${response.error}`);
      return [];
    }
    
    return this.transformer.transformRedditResults(response.data);
  }
  
  // /**
  //  * Create metadata for requests
  //  */
  // private createMetadata() {
  //   return {
  //     timestamp: Date.now(),
  //     version: '1.0.0',
  //     source: 'langgraph-agent'
  //   };
  // }
  
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