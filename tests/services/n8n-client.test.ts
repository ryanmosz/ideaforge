import axios from 'axios';
import { N8nClient } from '../../src/services/n8n-client';
import { N8nConfig } from '../../src/types/n8n-types';
import { RetryHandler } from '../../src/utils/retry-handler';
import { rateLimitManager } from '../../src/utils/rate-limiter';
import { CacheKeyGenerator } from '../../src/utils/cache-key-generator';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock RetryHandler
jest.mock('../../src/utils/retry-handler', () => ({
  RetryHandler: jest.fn().mockImplementation(() => ({
    execute: jest.fn((operation) => operation()),
    getConfig: jest.fn()
  }))
}));

// Mock rateLimitManager
jest.mock('../../src/utils/rate-limiter', () => ({
  rateLimitManager: {
    checkAndWait: jest.fn(),
    handleRateLimitError: jest.fn(),
    getAllStats: jest.fn().mockReturnValue({
      hackerNews: { 
        currentRequests: 5, 
        isBlocked: false,
        oldestRequest: Date.now() - 300000,
        newestRequest: Date.now() - 1000
      },
      reddit: { 
        currentRequests: 2, 
        isBlocked: false,
        oldestRequest: Date.now() - 60000,
        newestRequest: Date.now() - 5000
      }
    })
  }
}));

// Mock cacheManager and SmartCacheManager
jest.mock('../../src/services/cache-manager', () => {
  class MockCacheManager {
    constructor(_options: any = {}) {}
    async get(_key: string): Promise<any> { return null; }
    async set(_key: string, _data: any, _ttl?: number): Promise<void> {}
    generateKey(prefix: string, params: any): string { return `${prefix}:${JSON.stringify(params)}`; }
    getStats() { return { entries: 0, totalSize: 0, hitRate: 0 }; }
    getAllEntries() { return []; }
  }
  
  return {
    CacheManager: MockCacheManager,
    cacheManager: {
      get: jest.fn().mockResolvedValue(null), // Default to cache miss
      set: jest.fn().mockResolvedValue(undefined),
      generateKey: jest.fn((prefix, params) => `${prefix}:${JSON.stringify(params)}`)
    }
  };
});

// Mock SmartCacheManager
jest.mock('../../src/services/smart-cache-manager', () => {
  const mockSmartCacheManager = jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    setSearchResult: jest.fn().mockResolvedValue(undefined),
    generateKey: jest.fn((prefix, params) => `${prefix}:${JSON.stringify(params)}`),
    getStats: jest.fn().mockReturnValue({ entries: 0, totalSize: 0, hitRate: 0 }),
    getAllEntries: jest.fn().mockReturnValue([]),
    getPopularQueries: jest.fn().mockReturnValue([]),
    getTrendingQueries: jest.fn().mockReturnValue([]),
    getCacheEffectiveness: jest.fn().mockReturnValue({ averageHitRate: 0, popularityBenefit: 0 })
  }));
  
  return {
    SmartCacheManager: mockSmartCacheManager
  };
});

// Mock CacheKeyGenerator
jest.mock('../../src/utils/cache-key-generator', () => ({
  CacheKeyGenerator: {
    generateSearchKey: jest.fn((api, query, options = {}) => {
      // Don't modify the options, just pass them through
      const params = { q: query.toLowerCase().trim(), ...options };
      return `${api}:search:${JSON.stringify(params)}`;
    })
  }
}));

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('N8nClient', () => {
  let client: N8nClient;
  let mockAxiosInstance: any;
  let mockCacheManager: any;
  
  beforeEach(() => {
    // Reset environment variables
    process.env.N8N_BASE_URL = 'http://localhost:5678';
    process.env.N8N_API_KEY = 'test-api-key';
    process.env.N8N_TIMEOUT = '5000';
    process.env.N8N_RETRIES = '3';
    
    // Mock console
    console.log = jest.fn();
    console.error = jest.fn();
    
    // Create mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };
    
    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    
    // Create mock cache manager
    mockCacheManager = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      setSearchResult: jest.fn().mockResolvedValue(undefined),
      getStats: jest.fn().mockReturnValue({ entries: 0, totalSize: 0, hitRate: 0 }),
      getPopularQueries: jest.fn().mockReturnValue([]),
      getTrendingQueries: jest.fn().mockReturnValue([]),
      getCacheEffectiveness: jest.fn().mockReturnValue({ averageHitRate: 0, popularityBenefit: 0 })
    };
    
    // Update SmartCacheManager mock to return our mock instance
    const { SmartCacheManager } = jest.requireMock('../../src/services/smart-cache-manager');
    SmartCacheManager.mockReturnValue(mockCacheManager);
  });
  
  afterEach(() => {
    jest.clearAllMocks();
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });
  
  describe('constructor', () => {
    it('should create client with default configuration', () => {
      client = new N8nClient();
      
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:5678/webhook',
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key'
        }
      });
    });
    
    it('should allow overriding configuration', () => {
      const customConfig: Partial<N8nConfig> = {
        baseUrl: 'http://custom.n8n.com',
        timeout: 10000
      };
      
      client = new N8nClient(customConfig);
      
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://custom.n8n.com/webhook',
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key'
        }
      });
    });
    
    it('should throw error if API key is missing', () => {
      delete process.env.N8N_API_KEY;
      
      expect(() => new N8nClient()).toThrow('N8N_API_KEY environment variable is required');
    });
  });
  
  describe('interceptors', () => {
    beforeEach(() => {
      client = new N8nClient();
    });
    
    it('should set up request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
    
    it('should log requests', () => {
      const requestInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][0];
      const config = { method: 'get', url: '/test' };
      
      requestInterceptor(config);
      
      expect(console.log).toHaveBeenCalledWith('[N8n Client] GET /test');
    });
    
    it('should handle timeout errors', async () => {
      const responseInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][1];
      const timeoutError = { code: 'ECONNABORTED' };
      
      await expect(responseInterceptor(timeoutError)).rejects.toThrow('Request timeout - n8n webhook did not respond');
    });
    
    it('should handle 401 errors', async () => {
      const responseInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][1];
      const authError = { response: { status: 401, statusText: 'Unauthorized' } };
      
      await expect(responseInterceptor(authError)).rejects.toThrow('Unauthorized - check your N8N_API_KEY');
    });
    
    it('should handle 404 errors', async () => {
      const responseInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][1];
      const notFoundError = { response: { status: 404, statusText: 'Not Found' } };
      
      await expect(responseInterceptor(notFoundError)).rejects.toThrow('Webhook not found - ensure n8n workflows are activated');
    });
    
    it('should handle no response errors', async () => {
      const responseInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][1];
      const noResponseError = { request: {} };
      
      await expect(responseInterceptor(noResponseError)).rejects.toThrow('No response from n8n - check if n8n is running');
    });
  });
  
  describe('getConfig', () => {
    it('should return readonly configuration', () => {
      client = new N8nClient();
      const config = client.getConfig();
      
      expect(config).toEqual({
        baseUrl: 'http://localhost:5678',
        webhookPath: 'webhook',
        apiKey: 'test-api-key',
        timeout: 5000,
        retries: 3
      });
      
      // Verify it's a copy, not the original
      expect(config).not.toBe((client as any).config);
    });
  });
  
  describe('testConnection', () => {
    beforeEach(() => {
      client = new N8nClient();
    });
    
    it('should return true when health check succeeds', async () => {
      mockAxiosInstance.get.mockResolvedValue({ status: 200 });
      
      const result = await client.testConnection();
      
      expect(result).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/ideaforge/health');
    });
    
    it('should return false when health check fails', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Connection failed'));
      
      const result = await client.testConnection();
      
      expect(result).toBe(false);
    });
  });
  
  describe('protected methods', () => {
    class TestableN8nClient extends N8nClient {
      public async testPost<T>(endpoint: string, data: any) {
        return this.post<T>(endpoint, data);
      }
      
      public async testGet<T>(endpoint: string) {
        return this.get<T>(endpoint);
      }
    }
    
    let testClient: TestableN8nClient;
    
    beforeEach(() => {
      testClient = new TestableN8nClient();
    });
    
    describe('post', () => {
      it('should make POST request and return response data', async () => {
        const mockResponse = { 
          data: { 
            status: 'success' as const, 
            data: { result: 'test' } 
          } 
        };
        mockAxiosInstance.post.mockResolvedValue(mockResponse);
        
        const result = await testClient.testPost('/test', { query: 'test' });
        
        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', { query: 'test' });
        expect(result).toEqual(mockResponse.data);
      });
      
      it('should handle POST errors', async () => {
        mockAxiosInstance.post.mockRejectedValue(new Error('Network error'));
        
        const result = await testClient.testPost('/test', { query: 'test' });
        
        expect(result).toEqual({
          status: 'error',
          error: 'Network error',
          metadata: {
            cached: false,
            requestDuration: 0
          }
        });
      });
    });
    
    describe('get', () => {
      it('should make GET request and return response data', async () => {
        const mockResponse = { 
          data: { 
            status: 'success' as const, 
            data: { health: 'ok' } 
          } 
        };
        mockAxiosInstance.get.mockResolvedValue(mockResponse);
        
        const result = await testClient.testGet('/health');
        
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/health');
        expect(result).toEqual(mockResponse.data);
      });
      
      it('should handle GET errors', async () => {
        mockAxiosInstance.get.mockRejectedValue(new Error('Connection refused'));
        
        const result = await testClient.testGet('/health');
        
        expect(result).toEqual({
          status: 'error',
          error: 'Connection refused',
          metadata: {
            cached: false,
            requestDuration: 0
          }
        });
      });
    });
  });
  
  describe('retry functionality', () => {
    let client: N8nClient;
    let mockRetryHandler: any;
    
    beforeEach(() => {
      // Get the mock retry handler instance
      mockRetryHandler = {
        execute: jest.fn((operation) => operation()),
        getConfig: jest.fn().mockReturnValue({
          maxRetries: 3,
          initialDelay: 1000,
          maxDelay: 30000,
          backoffMultiplier: 2,
          retryableErrors: ['ECONNREFUSED', 'ETIMEDOUT', '429', '500', '502', '503', '504']
        })
      };
      
      (RetryHandler as jest.Mock).mockImplementation(() => mockRetryHandler);
      
      client = new N8nClient();
    });
    
    it('should use retry handler for POST requests', async () => {
      const mockResponse = { data: { status: 'success' as const, data: { items: [] } } };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);
      
      await client.searchHackerNews('test', 'session-123');
      
      expect(mockRetryHandler.execute).toHaveBeenCalledWith(
        expect.any(Function),
        'HackerNews search: test'
      );
    });
    
    it('should use retry handler for GET requests', async () => {
      const mockResponse = { data: { status: 'success' as const, data: {} } };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);
      
      await client.checkHealth();
      
      expect(mockRetryHandler.execute).toHaveBeenCalledWith(
        expect.any(Function),
        'GET /ideaforge/health'
      );
    });
    
    it('should configure retry handler with n8n config retries', () => {
      process.env.N8N_RETRIES = '5';
      
      new N8nClient();
      
      expect(RetryHandler).toHaveBeenCalledWith({
        maxRetries: 5
      });
    });
    
    it('should allow custom retry configuration', () => {
      new N8nClient({}, { initialDelay: 2000, backoffMultiplier: 3 });
      
      expect(RetryHandler).toHaveBeenCalledWith({
        maxRetries: 3,
        initialDelay: 2000,
        backoffMultiplier: 3
      });
    });
    
    it('should expose retry handler', () => {
      const retryHandler = client.getRetryHandler();
      
      expect(retryHandler).toBe(mockRetryHandler);
    });
  });
  
  describe('webhook methods', () => {
    let client: N8nClient;
    
    beforeEach(() => {
      client = new N8nClient();
      // Reset cache manager mocks
      mockCacheManager.get.mockResolvedValue(null); // Default to cache miss
      mockCacheManager.set.mockClear();
      mockCacheManager.setSearchResult.mockClear();
      // Reset CacheKeyGenerator mocks
      (CacheKeyGenerator.generateSearchKey as jest.Mock).mockClear();
    });
    
    describe('searchHackerNews', () => {
      it('should send correct request to HN webhook', async () => {
        const mockResponse = {
          data: {
            status: 'success' as const,
            data: {
              items: []
            }
          }
        };
        mockAxiosInstance.post.mockResolvedValue(mockResponse);
        
        const result = await client.searchHackerNews('test query', 'session-123');
        
        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          '/ideaforge/hackernews-search',
          {
            query: 'test query',
            sessionId: 'session-123',
            timestamp: expect.any(String)
          }
        );
        expect(result).toEqual(mockResponse.data);
      });
      
      it('should pass options when provided', async () => {
        const mockResponse = {
          data: { status: 'success' as const, data: { items: [] } }
        };
        mockAxiosInstance.post.mockResolvedValue(mockResponse);
        
        await client.searchHackerNews('test', 'session-123', {
          limit: 50,
          dateRange: 'last_week',
          sortBy: 'date',
          tags: ['story']
        });
        
        // Currently we don't pass options to webhook, but the method accepts them
        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          '/ideaforge/hackernews-search',
          {
            query: 'test',
            sessionId: 'session-123',
            timestamp: expect.any(String)
          }
        );
      });
      
      it('should handle errors', async () => {
        mockAxiosInstance.post.mockRejectedValue(new Error('Network error'));
        
        const result = await client.searchHackerNews('test', 'session-123');
        
        expect(result.success).toBe(false);
        expect(result.error?.message).toBe('Network error');
      });
      
      it('should check cache before making request', async () => {
        const cachedData = {
          status: 'success' as const,
          data: {
            items: [
              {
                id: '123',
                title: 'Cached Result',
                url: 'https://example.com/cached',
                text: 'Cached content',
                author: 'cacheduser',
                score: 100,
                num_comments: 20,
                created_at: new Date().toISOString(),
                subreddit: '',
                permalink: '',
                is_comment: false
              }
            ]
          },
          metadata: {
            cached: false,
            requestDuration: 100
          }
        };
        
        mockCacheManager.get.mockResolvedValueOnce(cachedData);
        
        const result = await client.searchHackerNews('test', 'session-123');
        
        expect(CacheKeyGenerator.generateSearchKey).toHaveBeenCalledWith('hackernews', 'test', {
          limit: undefined,
          sortBy: undefined,
          dateRange: undefined
        });
        expect(mockCacheManager.get).toHaveBeenCalled();
        expect(mockAxiosInstance.post).not.toHaveBeenCalled(); // Should not make API call
        expect(result).toEqual({
          ...cachedData,
          metadata: {
            ...cachedData.metadata,
            cached: true,
            cacheKey: expect.any(String)
          }
        });
      });
      
      it('should cache successful responses', async () => {
        const responseData = {
          status: 'success' as const,
          success: true,
          data: {
            items: [
              {
                id: '123',
                title: 'Fresh Result',
                url: 'https://example.com/fresh',
                text: 'Fresh content',
                author: 'freshuser',
                score: 100,
                num_comments: 20,
                created_at: new Date().toISOString(),
                subreddit: '',
                permalink: '',
                is_comment: false
              }
            ]
          }
        };
        
        mockAxiosInstance.post.mockResolvedValue({ data: responseData });
        
        await client.searchHackerNews('test', 'session-123');
        
        expect(mockCacheManager.setSearchResult).toHaveBeenCalledWith(
          'hackernews',
          'test',
          responseData,
          1
        );
      });
      
      it('should not cache error responses', async () => {
        mockAxiosInstance.post.mockResolvedValue({
          data: {
            success: false,
            error: {
              code: 'API_ERROR',
              message: 'API error'
            }
          }
        });
        
        await client.searchHackerNews('test', 'session-123');
        
        expect(mockCacheManager.setSearchResult).not.toHaveBeenCalled();
      });
    });
    
    describe('searchReddit', () => {
      it('should send correct request to Reddit webhook', async () => {
        const mockResponse = {
          data: {
            status: 'success' as const,
            data: {
              items: []
            }
          }
        };
        mockAxiosInstance.post.mockResolvedValue(mockResponse);
        
        const result = await client.searchReddit('test query', 'session-123');
        
        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          '/ideaforge/reddit-search',
          {
            query: 'test query',
            sessionId: 'session-123',
            subreddits: [],
            timestamp: expect.any(String)
          }
        );
        expect(result).toEqual(mockResponse.data);
      });
      
      it('should pass subreddits when provided', async () => {
        const mockResponse = {
          data: { status: 'success' as const, data: { items: [] } }
        };
        mockAxiosInstance.post.mockResolvedValue(mockResponse);
        
        await client.searchReddit('test', 'session-123', {
          subreddits: ['programming', 'typescript']
        });
        
        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          '/ideaforge/reddit-search',
          {
            query: 'test',
            sessionId: 'session-123',
            subreddits: ['programming', 'typescript'],
            timestamp: expect.any(String)
          }
        );
      });
      
      it('should handle errors', async () => {
        mockAxiosInstance.post.mockRejectedValue(new Error('API error'));
        
        const result = await client.searchReddit('test', 'session-123');
        
        expect(result.success).toBe(false);
        expect(result.error?.message).toBe('API error');
      });
      
      it('should check cache before making request', async () => {
        const cachedData = {
          status: 'success' as const,
          data: {
            items: [
              {
                id: 'cached123',
                title: 'Cached Reddit Post',
                text: 'Cached content',
                url: 'https://reddit.com/r/test/cached123/',
                author: 'testuser',
                score: 100,
                num_comments: 25,
                created_at: new Date().toISOString(),
                subreddit: 'test',
                permalink: '/r/test/cached123/',
                is_comment: false
              }
            ]
          },
          metadata: {
            cached: false,
            requestDuration: 100
          }
        };
        
        mockCacheManager.get.mockResolvedValueOnce(cachedData);
        
        const result = await client.searchReddit('test', 'session-123');
        
        expect(CacheKeyGenerator.generateSearchKey).toHaveBeenCalledWith('reddit', 'test', {
          subreddits: undefined,
          limit: undefined,
          sortBy: undefined,
          timeframe: undefined
        });
        expect(mockCacheManager.get).toHaveBeenCalled();
        expect(mockAxiosInstance.post).not.toHaveBeenCalled(); // Should not make API call
        expect(result).toEqual({
          ...cachedData,
          metadata: {
            ...cachedData.metadata,
            cached: true,
            cacheKey: expect.any(String)
          }
        });
      });
      
      it('should cache successful responses', async () => {
        const responseData = {
          status: 'success' as const,
          success: true,
          data: {
            items: [
              {
                id: 'fresh123',
                title: 'Fresh Reddit Post',
                text: 'Fresh content',
                url: 'https://reddit.com/r/programming/fresh123/',
                author: 'freshuser',
                score: 50,
                num_comments: 10,
                created_at: new Date().toISOString(),
                subreddit: 'programming',
                permalink: '/r/programming/fresh123/',
                is_comment: false
              }
            ]
          }
        };
        
        mockAxiosInstance.post.mockResolvedValue({ data: responseData });
        
        await client.searchReddit('test', 'session-123', {
          subreddits: ['programming']
        });
        
        expect(mockCacheManager.setSearchResult).toHaveBeenCalledWith(
          'reddit',
          'test',
          responseData,
          1
        );
      });
      
      it('should generate cache key with subreddits', async () => {
        mockAxiosInstance.post.mockResolvedValue({
          data: { 
            status: 'success' as const,
            success: true,
            data: { items: [] } 
          }
        });
        
        await client.searchReddit('test', 'session-123', {
          subreddits: ['typescript', 'programming']
        });
        
        expect(CacheKeyGenerator.generateSearchKey).toHaveBeenCalledWith('reddit', 'test', {
          subreddits: ['typescript', 'programming'],
          limit: undefined,
          sortBy: undefined,
          timeframe: undefined
        });
      });
    });
    
    describe('checkHealth', () => {
      it('should call health endpoint', async () => {
        const mockResponse = {
          data: {
            status: 'success' as const,
            data: {
              status: 'healthy',
              service: 'ideaforge-n8n',
              timestamp: '2025-01-01T12:00:00.000Z',
              webhooks: {} as any,
              message: 'All webhooks operational',
              version: '1.0.0'
            }
          }
        };
        mockAxiosInstance.get.mockResolvedValue(mockResponse);
        
        const result = await client.checkHealth();
        
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/ideaforge/health');
        expect(result).toEqual(mockResponse.data);
      });
      
      it('should handle errors', async () => {
        mockAxiosInstance.get.mockRejectedValue(new Error('Service unavailable'));
        
        const result = await client.checkHealth();
        
        expect(result.status).toBe('error');
        expect(result.error).toBe('Service unavailable');
      });
    });
  });
  
  describe('response transformation', () => {
    let client: N8nClient;
    
    beforeEach(() => {
      client = new N8nClient();
    });
    
    it('should transform HackerNews results', async () => {
      const mockHNData = {
        items: [
          {
            id: '12345',
            title: 'Test Article',
            url: 'https://example.com',
            author: 'testuser',
            score: 100,
            num_comments: 20,
            created_at: new Date().toISOString(),
            subreddit: '',
            permalink: '',
            is_comment: false,
            text: 'Test Article content'
          }
        ]
      };
      
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          status: 'success' as const,
          success: true,
          data: mockHNData,
          metadata: { cached: false, requestDuration: 100 }
        }
      });
      
      const results = await client.searchHackerNewsTransformed('test', 'session-123');
      
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        id: '12345',
        source: 'hackernews',
        title: 'Test Article',
        url: 'https://example.com',
        content: 'Test Article',
        metadata: {
          author: 'testuser',
          points: 100,
          numComments: 20,
          type: 'story'
        }
      });
      expect(results[0].score).toBeGreaterThan(0);
    });
    
    it('should transform Reddit results', async () => {
      const mockRedditData = {
        items: [
          {
            id: 'post123',
            title: 'Test Post',
            text: 'Test content',
            permalink: '/r/test/post123/',
            url: 'https://reddit.com/r/test/post123/',
            author: 'testuser',
            subreddit: 'test',
            score: 50,
            num_comments: 10,
            created_at: new Date().toISOString(),
            is_comment: false,
            upvote_ratio: 0.91
          }
        ]
      };
      
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          status: 'success' as const,
          success: true,
          data: mockRedditData,
          metadata: { cached: false, requestDuration: 100 }
        }
      });
      
      const results = await client.searchRedditTransformed('test', 'session-123');
      
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        id: 'post123',
        source: 'reddit',
        title: 'Test Post',
        url: 'https://reddit.com/r/test/post123/',
        content: 'Test content',
        metadata: {
          author: 'testuser',
          subreddit: 'test',
          upvotes: 50,
          type: 'post'
        }
      });
    });
    
    it('should handle error responses gracefully', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          status: 'error',
          error: 'Search failed',
          metadata: { cached: false, requestDuration: 0 }
        }
      });
      
      const results = await client.searchHackerNewsTransformed('test', 'session-123');
      
      expect(results).toEqual([]);
    });
    
    it('should handle missing data gracefully', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          status: 'success',
          data: null,
          metadata: { cached: false, requestDuration: 100 }
        }
      });
      
      const results = await client.searchRedditTransformed('test', 'session-123');
      
      expect(results).toEqual([]);
    });
    
    it('should provide access to transformer', () => {
      const transformer = client.getTransformer();
      
      expect(transformer).toBeDefined();
      expect(transformer.transformHackerNewsResults).toBeDefined();
      expect(transformer.transformRedditResults).toBeDefined();
    });
  });
  
  describe('rate limiting functionality', () => {
    let client: N8nClient;
    const mockedRateLimitManager = rateLimitManager as jest.Mocked<typeof rateLimitManager>;
    
    beforeEach(() => {
      client = new N8nClient();
      jest.clearAllMocks();
      // Reset checkAndWait to default behavior (resolve)
      mockedRateLimitManager.checkAndWait.mockResolvedValue(undefined);
    });
    
    describe('searchHackerNews with rate limiting', () => {
      it('should check rate limit before making request', async () => {
        const mockResponse = {
          data: { status: 'success' as const, data: {} as any }
        };
        mockAxiosInstance.post.mockResolvedValue(mockResponse);
        
        await client.searchHackerNews('test', 'session-123');
        
        expect(mockedRateLimitManager.checkAndWait).toHaveBeenCalledWith('hackernews', 'session-123');
        expect(mockedRateLimitManager.checkAndWait).toHaveBeenCalled();
      });
      
      it('should prevent requests when rate limited', async () => {
        // Simulate rate limiter blocking the request
        mockedRateLimitManager.checkAndWait.mockRejectedValue(
          new Error('Rate limit exceeded - please wait')
        );
        
        const result = await client.searchHackerNews('test', 'session-123');
        
        expect(result.success).toBe(false);
        expect(result.error?.message).toBe('HackerNews API rate limit exceeded. Please try again later.');
        expect(mockAxiosInstance.post).not.toHaveBeenCalled();
      });
    });
    
    describe('searchReddit with rate limiting', () => {
      it('should check rate limit before making request', async () => {
        const mockResponse = {
          data: { status: 'success' as const, data: {} as any }
        };
        mockAxiosInstance.post.mockResolvedValue(mockResponse);
        
        await client.searchReddit('test', 'session-123');
        
        expect(mockedRateLimitManager.checkAndWait).toHaveBeenCalledWith('reddit', 'session-123');
        expect(mockedRateLimitManager.checkAndWait).toHaveBeenCalled();
      });
      
      it('should prevent requests when rate limited', async () => {
        // Simulate rate limiter blocking the request
        mockedRateLimitManager.checkAndWait.mockRejectedValue(
          new Error('Rate limit exceeded - please wait')
        );
        
        const result = await client.searchReddit('test', 'session-123');
        
        expect(result.success).toBe(false);
        expect(result.error?.message).toBe('Reddit API rate limit exceeded. Please try again later.');
        expect(mockAxiosInstance.post).not.toHaveBeenCalled();
      });
    });
    
    describe('getRateLimitStats', () => {
      it('should return rate limit statistics', () => {
        const stats = client.getRateLimitStats();
        
        expect(mockedRateLimitManager.getAllStats).toHaveBeenCalled();
        expect(stats).toHaveProperty('hackerNews');
        expect(stats).toHaveProperty('reddit');
        expect(stats.hackerNews.currentRequests).toBe(5);
        expect(stats.hackerNews.isBlocked).toBe(false);
        expect(stats.reddit.currentRequests).toBe(2);
        expect(stats.reddit.isBlocked).toBe(false);
      });
      
      it('should return current stats on each call', () => {
        // First call
        let stats = client.getRateLimitStats();
        expect(stats.hackerNews.currentRequests).toBe(5);
        
        // Update mock to return different stats
        mockedRateLimitManager.getAllStats.mockReturnValue({
          hackerNews: { 
            currentRequests: 10, 
            isBlocked: false,
            oldestRequest: Date.now() - 300000,
            newestRequest: Date.now() - 1000
          },
          reddit: { 
            currentRequests: 5, 
            isBlocked: false,
            oldestRequest: Date.now() - 60000,
            newestRequest: Date.now() - 5000
          }
        });
        
        // Second call should return updated stats
        stats = client.getRateLimitStats();
        expect(stats.hackerNews.currentRequests).toBe(10);
      });
    });
  });
}); 