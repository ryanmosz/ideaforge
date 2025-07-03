import {
  N8nError,
  WebhookError,
  RateLimitError,
  TimeoutError,
  NetworkError,
  AuthenticationError,
  ServiceUnavailableError,
  isN8nError,
  isRateLimitError,
  isTimeoutError,
  isNetworkError,
  isWebhookError
} from '../../src/utils/error-types';

describe('Error Types', () => {
  describe('N8nError', () => {
    it('should create error with code and context', () => {
      const error = new N8nError('Test error', 'TEST_CODE', { foo: 'bar' });
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(N8nError);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.context).toEqual({ foo: 'bar' });
      expect(error.name).toBe('N8nError');
    });
    
    it('should maintain stack trace', () => {
      const error = new N8nError('Test error', 'TEST_CODE');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('N8nError');
    });
  });
  
  describe('WebhookError', () => {
    it('should create error with status code and response', () => {
      const response = { error: 'Not found' };
      const error = new WebhookError('Webhook failed', 404, response);
      
      expect(error).toBeInstanceOf(N8nError);
      expect(error.message).toBe('Webhook failed');
      expect(error.code).toBe('WEBHOOK_ERROR');
      expect(error.statusCode).toBe(404);
      expect(error.response).toEqual(response);
    });
  });
  
  describe('RateLimitError', () => {
    it('should create error with retry information', () => {
      const error = new RateLimitError('Rate limited', 60, 0);
      
      expect(error).toBeInstanceOf(N8nError);
      expect(error.message).toBe('Rate limited');
      expect(error.code).toBe('RATE_LIMIT');
      expect(error.retryAfter).toBe(60);
      expect(error.rateLimitRemaining).toBe(0);
    });
  });
  
  describe('TimeoutError', () => {
    it('should create error with timeout duration', () => {
      const error = new TimeoutError('Request timed out', 5000);
      
      expect(error).toBeInstanceOf(N8nError);
      expect(error.message).toBe('Request timed out');
      expect(error.code).toBe('TIMEOUT');
      expect(error.timeoutMs).toBe(5000);
    });
  });
  
  describe('NetworkError', () => {
    it('should create error with original error', () => {
      const originalError = new Error('Connection refused');
      const error = new NetworkError('Network failed', originalError);
      
      expect(error).toBeInstanceOf(N8nError);
      expect(error.message).toBe('Network failed');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.originalError).toBe(originalError);
    });
  });
  
  describe('AuthenticationError', () => {
    it('should create error for auth failures', () => {
      const error = new AuthenticationError('Invalid API key');
      
      expect(error).toBeInstanceOf(N8nError);
      expect(error.message).toBe('Invalid API key');
      expect(error.code).toBe('AUTH_ERROR');
    });
  });
  
  describe('ServiceUnavailableError', () => {
    it('should create error with service name', () => {
      const error = new ServiceUnavailableError('Service down', 'n8n-webhook');
      
      expect(error).toBeInstanceOf(N8nError);
      expect(error.message).toBe('Service down');
      expect(error.code).toBe('SERVICE_UNAVAILABLE');
      expect(error.service).toBe('n8n-webhook');
    });
  });
  
  describe('Type Guards', () => {
    it('should correctly identify N8nError', () => {
      const n8nError = new N8nError('Test', 'TEST');
      const regularError = new Error('Regular');
      
      expect(isN8nError(n8nError)).toBe(true);
      expect(isN8nError(regularError)).toBe(false);
    });
    
    it('should correctly identify RateLimitError', () => {
      const rateLimitError = new RateLimitError('Limited', 60);
      const otherError = new N8nError('Other', 'OTHER');
      
      expect(isRateLimitError(rateLimitError)).toBe(true);
      expect(isRateLimitError(otherError)).toBe(false);
    });
    
    it('should correctly identify TimeoutError', () => {
      const timeoutError = new TimeoutError('Timeout');
      const otherError = new N8nError('Other', 'OTHER');
      
      expect(isTimeoutError(timeoutError)).toBe(true);
      expect(isTimeoutError(otherError)).toBe(false);
    });
    
    it('should correctly identify NetworkError', () => {
      const networkError = new NetworkError('Network issue');
      const otherError = new N8nError('Other', 'OTHER');
      
      expect(isNetworkError(networkError)).toBe(true);
      expect(isNetworkError(otherError)).toBe(false);
    });
    
    it('should correctly identify WebhookError', () => {
      const webhookError = new WebhookError('Webhook failed', 500);
      const otherError = new N8nError('Other', 'OTHER');
      
      expect(isWebhookError(webhookError)).toBe(true);
      expect(isWebhookError(otherError)).toBe(false);
    });
  });
}); 