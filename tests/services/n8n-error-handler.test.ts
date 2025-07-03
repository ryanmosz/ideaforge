import { AxiosError } from 'axios';
import { N8nErrorHandler } from '../../src/services/n8n-error-handler';
import {
  N8nError,
  WebhookError,
  RateLimitError,
  TimeoutError,
  NetworkError,
  AuthenticationError,
  ServiceUnavailableError
} from '../../src/utils/error-types';

describe('N8nErrorHandler', () => {
  let errorHandler: N8nErrorHandler;
  
  beforeEach(() => {
    errorHandler = new N8nErrorHandler();
  });
  
  describe('normalizeError', () => {
    it('should return N8nError as-is', () => {
      const n8nError = new N8nError('Test error', 'TEST_CODE');
      const result = errorHandler.normalizeError(n8nError);
      
      expect(result).toBe(n8nError);
    });
    
    describe('Axios errors', () => {
      it('should handle timeout errors', () => {
        const axiosError = {
          code: 'ECONNABORTED',
          config: { timeout: 5000 },
          isAxiosError: true
        } as AxiosError;
        
        const result = errorHandler.normalizeError(axiosError);
        
        expect(result).toBeInstanceOf(TimeoutError);
        expect(result.message).toBe('Request timed out');
        expect((result as TimeoutError).timeoutMs).toBe(5000);
      });
      
      it('should handle connection refused errors', () => {
        const axiosError = {
          code: 'ECONNREFUSED',
          message: 'connect ECONNREFUSED',
          isAxiosError: true
        } as AxiosError;
        
        const result = errorHandler.normalizeError(axiosError);
        
        expect(result).toBeInstanceOf(NetworkError);
        expect(result.message).toContain('Cannot connect to n8n service');
      });
      
      it('should handle 401 authentication errors', () => {
        const axiosError = {
          response: { status: 401, data: { error: 'Invalid key' } },
          isAxiosError: true
        } as any;
        
        const result = errorHandler.normalizeError(axiosError);
        
        expect(result).toBeInstanceOf(AuthenticationError);
        expect(result.message).toContain('Authentication failed');
      });
      
      it('should handle 429 rate limit errors', () => {
        const axiosError = {
          response: {
            status: 429,
            headers: {
              'retry-after': '120',
              'x-ratelimit-remaining': '0'
            },
            data: { error: 'Too many requests' }
          },
          isAxiosError: true
        } as any;
        
        const result = errorHandler.normalizeError(axiosError);
        
        expect(result).toBeInstanceOf(RateLimitError);
        expect(result.message).toContain('Rate limit exceeded');
        expect((result as RateLimitError).retryAfter).toBe(120);
        expect((result as RateLimitError).rateLimitRemaining).toBe(0);
      });
      
      it('should handle 5xx server errors', () => {
        const axiosError = {
          response: { status: 503, data: { error: 'Service unavailable' } },
          isAxiosError: true
        } as any;
        
        const result = errorHandler.normalizeError(axiosError);
        
        expect(result).toBeInstanceOf(ServiceUnavailableError);
        expect(result.message).toContain('n8n service error (503)');
        expect((result as ServiceUnavailableError).service).toBe('n8n-webhook');
      });
      
      it('should handle other HTTP errors', () => {
        const axiosError = {
          response: { status: 404, data: { error: 'Not found' } },
          isAxiosError: true
        } as any;
        
        const result = errorHandler.normalizeError(axiosError);
        
        expect(result).toBeInstanceOf(WebhookError);
        expect(result.message).toBe('HTTP 404: Not found');
        expect((result as WebhookError).statusCode).toBe(404);
      });
    });
    
    describe('System errors', () => {
      it('should handle ETIMEDOUT', () => {
        const error = { code: 'ETIMEDOUT', message: 'Connection timed out' };
        const result = errorHandler.normalizeError(error);
        
        expect(result).toBeInstanceOf(TimeoutError);
        expect(result.message).toBe('Connection timed out');
      });
      
      it('should handle ECONNRESET', () => {
        const error = { code: 'ECONNRESET', message: 'Connection reset' };
        const result = errorHandler.normalizeError(error);
        
        expect(result).toBeInstanceOf(NetworkError);
        expect(result.message).toBe('Connection reset by server');
      });
      
      it('should handle generic system errors', () => {
        const error = { code: 'UNKNOWN_CODE', message: 'Unknown error' };
        const result = errorHandler.normalizeError(error);
        
        expect(result).toBeInstanceOf(N8nError);
        expect(result.code).toBe('UNKNOWN_CODE');
      });
    });
    
    it('should handle generic errors', () => {
      const error = new Error('Generic error');
      const result = errorHandler.normalizeError(error);
      
      expect(result).toBeInstanceOf(N8nError);
      expect(result.message).toBe('Generic error');
      expect(result.code).toBe('UNKNOWN_ERROR');
    });
  });
  
  describe('createErrorResponse', () => {
    it('should create error response from error', () => {
      const error = new N8nError('Test error', 'TEST_CODE', { foo: 'bar' });
      const response = errorHandler.createErrorResponse(error);
      
      expect(response).toEqual({
        status: 'error',
        error: 'Test error',
        metadata: {
          cached: false,
          requestDuration: -1,
          errorCode: 'TEST_CODE',
          errorContext: { foo: 'bar' }
        }
      });
    });
  });
  
  describe('createFallbackResponse', () => {
    it('should create fallback response with data', () => {
      const error = new Error('Service down');
      const fallbackData = { results: [] };
      const response = errorHandler.createFallbackResponse(error, fallbackData);
      
      expect(response).toEqual({
        status: 'success',
        data: fallbackData,
        error: 'Service down',
        metadata: {
          cached: false,
          requestDuration: -1,
          errorCode: 'UNKNOWN_ERROR',
          errorContext: expect.any(Object),
          fallback: true,
          fallbackReason: 'Service down'
        }
      });
    });
  });
  
  describe('isRetryableError', () => {
    it('should not retry auth errors', () => {
      const error = new AuthenticationError('Invalid key');
      expect(errorHandler.isRetryableError(error)).toBe(false);
    });
    
    it('should retry network errors', () => {
      const error = new NetworkError('Connection failed');
      expect(errorHandler.isRetryableError(error)).toBe(true);
    });
    
    it('should retry timeout errors', () => {
      const error = new TimeoutError('Timed out');
      expect(errorHandler.isRetryableError(error)).toBe(true);
    });
    
    it('should retry service unavailable errors', () => {
      const error = new ServiceUnavailableError('Service down', 'test');
      expect(errorHandler.isRetryableError(error)).toBe(true);
    });
    
    it('should retry rate limit errors', () => {
      const error = new RateLimitError('Too many requests', 60);
      expect(errorHandler.isRetryableError(error)).toBe(true);
    });
    
    it('should retry 5xx webhook errors', () => {
      const error = new WebhookError('Server error', 503);
      expect(errorHandler.isRetryableError(error)).toBe(true);
    });
    
    it('should not retry 4xx webhook errors', () => {
      const error = new WebhookError('Not found', 404);
      expect(errorHandler.isRetryableError(error)).toBe(false);
    });
  });
  
  describe('getRetryDelay', () => {
    it('should use retry-after header for rate limits', () => {
      const error = new RateLimitError('Rate limited', 120);
      const delay = errorHandler.getRetryDelay(error, 0);
      
      expect(delay).toBe(120000); // 120 seconds in ms
    });
    
    it('should use exponential backoff for other errors', () => {
      const error = new NetworkError('Network error');
      const delay1 = errorHandler.getRetryDelay(error, 0);
      const delay2 = errorHandler.getRetryDelay(error, 1);
      const delay3 = errorHandler.getRetryDelay(error, 2);
      
      // Check exponential growth with jitter
      expect(delay1).toBeGreaterThanOrEqual(1000);
      expect(delay1).toBeLessThanOrEqual(2000);
      expect(delay2).toBeGreaterThanOrEqual(2000);
      expect(delay2).toBeLessThanOrEqual(3000);
      expect(delay3).toBeGreaterThanOrEqual(4000);
      expect(delay3).toBeLessThanOrEqual(5000);
    });
    
    it('should cap delay at maximum', () => {
      const error = new NetworkError('Network error');
      const delay = errorHandler.getRetryDelay(error, 10); // High attempt number
      
      expect(delay).toBeLessThanOrEqual(31000); // 30s max + 1s jitter
    });
  });
  
  describe('logError', () => {
    let consoleErrorSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;
    
    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    });
    
    afterEach(() => {
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });
    
    it('should log authentication errors as error level', () => {
      const error = new AuthenticationError('Invalid key');
      errorHandler.logError(error, 'TestContext');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[TestContext] Authentication Error:',
        'Invalid key'
      );
    });
    
    it('should log rate limit errors as warning', () => {
      const error = new RateLimitError('Too many requests', 60);
      errorHandler.logError(error);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[N8nErrorHandler] Rate Limit:',
        'Too many requests'
      );
    });
    
    it('should log timeout errors as warning', () => {
      const error = new TimeoutError('Request timed out');
      errorHandler.logError(error);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[N8nErrorHandler] Timeout:',
        'Request timed out'
      );
    });
    
    it('should log network errors as error level', () => {
      const error = new NetworkError('Connection failed');
      errorHandler.logError(error);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[N8nErrorHandler] Network Error:',
        'Connection failed'
      );
    });
  });
}); 