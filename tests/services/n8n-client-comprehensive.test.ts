import axios from 'axios';
import { N8nClient } from '../../src/services/n8n-client';
import { N8nConfig } from '../../src/types/n8n-types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('N8nClient - Comprehensive Tests', () => {
  let client: N8nClient;
  let mockAxiosInstance: any;
  
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
  });
  
  afterEach(() => {
    jest.clearAllMocks();
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });
  
  describe('Configuration Edge Cases', () => {
    it('should handle missing optional config values', () => {
      delete process.env.N8N_WEBHOOK_PATH;
      delete process.env.N8N_TIMEOUT;
      delete process.env.N8N_RETRIES;
      
      client = new N8nClient();
      const config = client.getConfig();
      
      expect(config.webhookPath).toBe('webhook'); // default
      expect(config.timeout).toBe(30000); // default
      expect(config.retries).toBe(3); // default
    });
    
    it('should handle extreme timeout values', () => {
      process.env.N8N_TIMEOUT = '999999999';
      client = new N8nClient();
      const config = client.getConfig();
      
      expect(config.timeout).toBe(999999999);
    });
    
    it('should handle base URL with trailing slash', () => {
      const customConfig: Partial<N8nConfig> = {
        baseUrl: 'http://localhost:5678/',
        webhookPath: '/webhook/'
      };
      
      client = new N8nClient(customConfig);
      
      // Should normalize URLs
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'http://localhost:5678/webhook' // No double slashes
        })
      );
    });
  });
  
  describe('Request/Response Edge Cases', () => {
    beforeEach(() => {
      client = new N8nClient();
    });
    
    it('should handle empty search query', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          status: 'success' as const,
          data: { query: '', results: [], total: 0, source: 'hackernews' as const },
          metadata: { cached: false, requestDuration: 50 }
        }
      });
      
      const result = await client.searchHackerNews('', 'session-123');
      
      expect(result.status).toBe('success');
      if (result.status === 'success' && result.data) {
        expect(result.data.query).toBe('');
      }
    });
    
    it('should handle very long search query', async () => {
      const longQuery = 'a'.repeat(10000);
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          status: 'success' as const,
          data: { query: longQuery, results: [], total: 0, source: 'hackernews' as const },
          metadata: { cached: false, requestDuration: 100 }
        }
      });
      
      const result = await client.searchHackerNews(longQuery, 'session-123');
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/ideaforge/hackernews-search',
        { query: longQuery, sessionId: 'session-123' }
      );
      expect(result.status).toBe('success');
    });
    
    it('should handle Unicode in search queries', async () => {
      const unicodeQuery = 'Python 🐍 развитие 开发';
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          status: 'success' as const,
          data: { query: unicodeQuery, results: [], total: 0, source: 'reddit' as const },
          metadata: { cached: false, requestDuration: 100 }
        }
      });
      
      const result = await client.searchReddit(unicodeQuery, 'session-123');
      
      if (result.status === 'success' && result.data) {
        expect(result.data.query).toBe(unicodeQuery);
      }
    });
    
    it('should handle malformed response data', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: null // Malformed response
      });
      
      const result = await client.searchHackerNews('test', 'session-123');
      
      expect(result.status).toBe('error');
      expect(result.error).toBeDefined();
    });
    
    it('should handle response with missing fields', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          status: 'success' as const,
          // Missing data field
          metadata: { cached: false, requestDuration: 100 }
        }
      });
      
      const result = await client.searchReddit('test', 'session-123');
      
      expect(result.status).toBe('error');
    });
  });
  
  describe('Error Response Edge Cases', () => {
    beforeEach(() => {
      client = new N8nClient();
    });
    
    it('should handle non-standard error responses', async () => {
      mockAxiosInstance.post.mockRejectedValue({
        response: {
          status: 418, // I'm a teapot
          statusText: "I'm a teapot",
          data: { error: 'Brewing coffee instead' }
        }
      });
      
      const result = await client.searchHackerNews('coffee', 'session-123');
      
      expect(result.status).toBe('error');
      expect(result.error).toContain('418');
    });
    
    it('should handle network errors with custom codes', async () => {
      mockAxiosInstance.post.mockRejectedValue({
        code: 'ENETUNREACH',
        message: 'Network is unreachable'
      });
      
      const result = await client.searchReddit('test', 'session-123');
      
      expect(result.status).toBe('error');
      expect(result.error).toContain('Network is unreachable');
    });
    
    it('should handle circular reference in error object', async () => {
      const circularError: any = { message: 'Error' };
      circularError.cause = circularError; // Circular reference
      
      mockAxiosInstance.post.mockRejectedValue(circularError);
      
      const result = await client.searchHackerNews('test', 'session-123');
      
      expect(result.status).toBe('error');
      expect(result.error).toContain('Error');
    });
  });
  
  describe('Session ID Edge Cases', () => {
    beforeEach(() => {
      client = new N8nClient();
    });
    
    it('should handle missing session ID', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          status: 'success' as const,
          data: { query: 'test', results: [], total: 0, source: 'hackernews' as const },
          metadata: { cached: false, requestDuration: 100 }
        }
      });
      
      const result = await client.searchHackerNews('test', undefined as any);
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/ideaforge/hackernews-search',
        { query: 'test', sessionId: undefined }
      );
      expect(result.status).toBe('success');
    });
    
    it('should handle session ID with special characters', async () => {
      const specialSessionId = 'session!@#$%^&*()_+-=[]{}|;:"<>,.?/~`';
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          status: 'success' as const,
          data: { query: 'test', results: [], total: 0, source: 'reddit' as const },
          metadata: { cached: false, requestDuration: 100 }
        }
      });
      
      await client.searchReddit('test', specialSessionId);
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/ideaforge/reddit-search',
        { query: 'test', sessionId: specialSessionId }
      );
    });
  });
  
  describe('Concurrent Request Handling', () => {
    beforeEach(() => {
      client = new N8nClient();
    });
    
    it('should handle multiple concurrent requests', async () => {
      let requestCount = 0;
      mockAxiosInstance.post.mockImplementation(() => {
        requestCount++;
        return Promise.resolve({
          data: {
            status: 'success' as const,
            data: { 
              query: `test${requestCount}`, 
              results: [], 
              total: 0, 
              source: 'hackernews' as const 
            },
            metadata: { cached: false, requestDuration: 100 }
          }
        });
      });
      
      // Fire 10 concurrent requests
      const promises = Array(10).fill(null).map((_, i) => 
        client.searchHackerNews(`test${i}`, `session${i}`)
      );
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(10);
      expect(requestCount).toBe(10);
      results.forEach((result) => {
        expect(result.status).toBe('success');
      });
    });
    
    it('should handle mixed success/failure in concurrent requests', async () => {
      let callCount = 0;
      mockAxiosInstance.post.mockImplementation(() => {
        callCount++;
        if (callCount % 3 === 0) {
          return Promise.reject(new Error(`Failed request ${callCount}`));
        }
        return Promise.resolve({
          data: {
            status: 'success' as const,
            data: { query: 'test', results: [], total: 0, source: 'reddit' as const },
            metadata: { cached: false, requestDuration: 100 }
          }
        });
      });
      
      const promises = Array(9).fill(null).map((_, i) => 
        client.searchReddit('test', `session${i}`)
      );
      
      const results = await Promise.all(promises);
      
      const successes = results.filter(r => r.status === 'success');
      const failures = results.filter(r => r.status === 'error');
      
      expect(successes).toHaveLength(6);
      expect(failures).toHaveLength(3);
    });
  });
  
  describe('Interceptor Edge Cases', () => {
    it('should handle request interceptor errors', async () => {
      client = new N8nClient();
      
      // Get the request interceptor
      const errorHandler = mockAxiosInstance.interceptors.request.use.mock.calls[0][1];
      
      // Test error in request interceptor
      const error = new Error('Request interceptor error');
      expect(() => errorHandler(error)).toThrow(error);
    });
    
    it('should handle malformed request config', () => {
      client = new N8nClient();
      
      const requestInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][0];
      const config = { url: null, method: undefined };
      
      // Should not throw
      const result = requestInterceptor(config);
      expect(result).toBe(config);
      expect(console.log).toHaveBeenCalledWith('[N8n Client] undefined null');
    });
  });
  
  describe('Health Check Edge Cases', () => {
    beforeEach(() => {
      client = new N8nClient();
    });
    
    it('should handle health check with non-200 success status', async () => {
      mockAxiosInstance.get.mockResolvedValue({ 
        status: 204 // No content but still success
      });
      
      const result = await client.testConnection();
      
      expect(result).toBe(true);
    });
    
    it('should handle health check timeout', async () => {
      mockAxiosInstance.get.mockRejectedValue({ code: 'ECONNABORTED' });
      
      const result = await client.testConnection();
      
      expect(result).toBe(false);
    });
    
    it('should handle health check with redirect', async () => {
      mockAxiosInstance.get.mockResolvedValue({ 
        status: 302,
        headers: { location: 'http://new-location.com' }
      });
      
      const result = await client.testConnection();
      
      expect(result).toBe(true); // Still considers redirects as success
    });
  });
  
  describe('Memory and Performance', () => {
    beforeEach(() => {
      client = new N8nClient();
    });
    
    it('should handle very large response data', async () => {
      const largeResults = Array(10000).fill(null).map((_, i) => ({
        id: `item-${i}`,
        title: `Title ${i}`,
        content: 'A'.repeat(1000),
        url: `https://example.com/${i}`,
        metadata: { index: i }
      }));
      
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          status: 'success' as const,
          data: { 
            query: 'large', 
            results: largeResults, 
            total: 10000, 
            source: 'hackernews' as const 
          },
          metadata: { cached: false, requestDuration: 500 }
        }
      });
      
      const result = await client.searchHackerNews('large', 'session-123');
      
      expect(result.status).toBe('success');
      if (result.status === 'success' && result.data && 'results' in result.data) {
        expect((result.data as any).results).toHaveLength(10000);
      }
    });
  });
}); 