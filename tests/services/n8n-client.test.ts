import axios from 'axios';
import { N8nClient } from '../../src/services/n8n-client';
import { N8nConfig } from '../../src/types/n8n-types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('N8nClient', () => {
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
  
  describe('webhook methods', () => {
    let client: N8nClient;
    
    beforeEach(() => {
      client = new N8nClient();
    });
    
    describe('searchHackerNews', () => {
      it('should send correct request to HN webhook', async () => {
        const mockResponse = {
          data: {
            status: 'success' as const,
            data: {
              hits: [],
              nbHits: 0,
              page: 0,
              nbPages: 0,
              hitsPerPage: 20,
              processingTimeMS: 100,
              query: 'test query'
            }
          }
        };
        mockAxiosInstance.post.mockResolvedValue(mockResponse);
        
        const result = await client.searchHackerNews('test query', 'session-123');
        
        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          '/ideaforge/hackernews-search',
          {
            query: 'test query',
            sessionId: 'session-123'
          }
        );
        expect(result).toEqual(mockResponse.data);
      });
      
      it('should pass options when provided', async () => {
        const mockResponse = {
          data: { status: 'success' as const, data: {} as any }
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
            sessionId: 'session-123'
          }
        );
      });
      
      it('should handle errors', async () => {
        mockAxiosInstance.post.mockRejectedValue(new Error('Network error'));
        
        const result = await client.searchHackerNews('test', 'session-123');
        
        expect(result.status).toBe('error');
        expect(result.error).toBe('Network error');
      });
    });
    
    describe('searchReddit', () => {
      it('should send correct request to Reddit webhook', async () => {
        const mockResponse = {
          data: {
            status: 'success' as const,
            data: {
              posts: [],
              comments: [],
              query: 'test query',
              subreddits: []
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
            subreddits: []
          }
        );
        expect(result).toEqual(mockResponse.data);
      });
      
      it('should pass subreddits when provided', async () => {
        const mockResponse = {
          data: { status: 'success' as const, data: {} as any }
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
            subreddits: ['programming', 'typescript']
          }
        );
      });
      
      it('should handle errors', async () => {
        mockAxiosInstance.post.mockRejectedValue(new Error('API error'));
        
        const result = await client.searchReddit('test', 'session-123');
        
        expect(result.status).toBe('error');
        expect(result.error).toBe('API error');
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
}); 