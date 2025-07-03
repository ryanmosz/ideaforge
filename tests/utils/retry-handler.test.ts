import { RetryHandler, DEFAULT_RETRY_CONFIG } from '../../src/utils/retry-handler';
import { N8nErrorHandler } from '../../src/services/n8n-error-handler';

// Mock the N8nErrorHandler module
jest.mock('../../src/services/n8n-error-handler');

// Mock console methods
const originalConsoleLog = console.log;

describe('RetryHandler', () => {
  let handler: RetryHandler;
  let mockErrorHandler: jest.Mocked<N8nErrorHandler>;
  
  beforeEach(() => {
    // Mock console.log
    console.log = jest.fn();
    
    // Use fake timers for testing delays
    jest.useFakeTimers();
    
    // Setup mock error handler
    mockErrorHandler = {
      isRetryableError: jest.fn(),
      getRetryDelay: jest.fn(),
      logError: jest.fn(),
      normalizeError: jest.fn(),
      createErrorResponse: jest.fn(),
      createFallbackResponse: jest.fn()
    } as any;
    
    // Mock the constructor
    (N8nErrorHandler as jest.MockedClass<typeof N8nErrorHandler>).mockImplementation(() => mockErrorHandler);
    
    // Create default handler
    handler = new RetryHandler();
  });
  
  afterEach(() => {
    console.log = originalConsoleLog;
    jest.clearAllMocks();
    jest.useRealTimers();
  });
  
  describe('constructor', () => {
    it('should use default configuration', () => {
      const config = handler.getConfig();
      expect(config).toEqual(DEFAULT_RETRY_CONFIG);
    });
    
    it('should allow partial configuration override', () => {
      const customHandler = new RetryHandler({
        maxRetries: 5,
        initialDelay: 2000
      });
      
      const config = customHandler.getConfig();
      expect(config.maxRetries).toBe(5);
      expect(config.initialDelay).toBe(2000);
      expect(config.backoffMultiplier).toBe(DEFAULT_RETRY_CONFIG.backoffMultiplier);
    });
  });
  
  describe('execute', () => {
    it('should return result on successful operation', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await handler.execute(operation, 'test operation');
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
      expect(console.log).not.toHaveBeenCalled();
    });
    
    it('should retry on retryable error', async () => {
      const error: any = new Error('Connection failed');
      error.code = 'ECONNREFUSED';
      
      const operation = jest.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');
      
      // Mock error handler behavior
      mockErrorHandler.isRetryableError.mockReturnValue(true);
      mockErrorHandler.getRetryDelay.mockReturnValue(1000);
      
      const promise = handler.execute(operation, 'test operation');
      
      // Fast-forward through the retry delay
      await jest.runOnlyPendingTimersAsync();
      
      const result = await promise;
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[Retry] test operation - Attempt 1/4 failed. Retrying in'));
    });
    
    it('should throw immediately on non-retryable error', async () => {
      const error: any = new Error('Bad request');
      error.response = { status: 400 };
      const operation = jest.fn().mockRejectedValue(error);
      
      // Mock error handler behavior - not retryable
      mockErrorHandler.isRetryableError.mockReturnValue(false);
      
      await expect(handler.execute(operation, 'test operation')).rejects.toThrow('Bad request');
      expect(operation).toHaveBeenCalledTimes(1);
      expect(mockErrorHandler.logError).toHaveBeenCalledWith(error, 'test operation');
    });
    
    it('should exhaust retries and throw', async () => {
      jest.useRealTimers(); // Use real timers for this test
      
      // Create a handler with very short delays for faster testing
      const fastHandler = new RetryHandler({
        maxRetries: 3,
        initialDelay: 10,
        maxDelay: 50,
        backoffMultiplier: 2
      });
      
      const error: any = new Error('Server error');
      error.response = { status: 500 };
      const operation = jest.fn().mockRejectedValue(error);
      
      // Mock error handler behavior - always retryable
      mockErrorHandler.isRetryableError.mockReturnValue(true);
      mockErrorHandler.getRetryDelay.mockReturnValue(10);
      
      await expect(fastHandler.execute(operation, 'test operation')).rejects.toThrow('Server error');
      expect(operation).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
      expect(mockErrorHandler.logError).toHaveBeenCalledWith(error, 'test operation');
      
      jest.useFakeTimers(); // Restore fake timers
    });
    
    it('should handle timeout errors', async () => {
      const timeoutError: any = new Error('Request timeout');
      timeoutError.code = 'ECONNABORTED';
      
      const operation = jest.fn()
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce('success');
      
      // Mock error handler behavior
      mockErrorHandler.isRetryableError.mockReturnValue(true);
      mockErrorHandler.getRetryDelay.mockReturnValue(1000);
      
      const promise = handler.execute(operation, 'test operation');
      
      // Fast-forward through the retry delay
      await jest.runOnlyPendingTimersAsync();
      
      const result = await promise;
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });
    
    it('should handle rate limiting (429)', async () => {
      const rateLimitError: any = new Error('Too many requests');
      rateLimitError.response = { status: 429 };
      
      const operation = jest.fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce('success');
      
      // Mock error handler behavior - rate limit with delay
      mockErrorHandler.isRetryableError.mockReturnValue(true);
      mockErrorHandler.getRetryDelay.mockReturnValue(5000); // Rate limit delay
      
      const promise = handler.execute(operation, 'test operation');
      
      // Fast-forward through the retry delay
      await jest.runOnlyPendingTimersAsync();
      
      const result = await promise;
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('calculateDelay', () => {
    it('should apply exponential backoff', async () => {
      // Use a handler with no retries to test delay calculation
      const testHandler = new RetryHandler({ 
        maxRetries: 0,
        initialDelay: 1000,
        backoffMultiplier: 2 
      });
      
      // Mock error handler to return a base delay
      mockErrorHandler.getRetryDelay.mockReturnValue(0); // Let retry handler calculate
      
      // Access private method through any type casting for testing
      const calculateDelay = (testHandler as any).calculateDelay.bind(testHandler);
      
      // Test exponential growth
      const delay0 = calculateDelay(0, new Error());
      const delay1 = calculateDelay(1, new Error());
      const delay2 = calculateDelay(2, new Error());
      
      // With jitter, delays should be approximately:
      // Attempt 0: 1000 * (0.5 to 1.5) = 500 to 1500
      // Attempt 1: 2000 * (0.5 to 1.5) = 1000 to 3000
      // Attempt 2: 4000 * (0.5 to 1.5) = 2000 to 6000
      
      expect(delay0).toBeGreaterThanOrEqual(500);
      expect(delay0).toBeLessThanOrEqual(1500);
      
      expect(delay1).toBeGreaterThanOrEqual(1000);
      expect(delay1).toBeLessThanOrEqual(3000);
      
      expect(delay2).toBeGreaterThanOrEqual(2000);
      expect(delay2).toBeLessThanOrEqual(6000);
    });
    
    it('should cap delay at maxDelay', async () => {
      const testHandler = new RetryHandler({ 
        maxRetries: 0,
        initialDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 10 
      });
      
      // Mock error handler to return a base delay
      mockErrorHandler.getRetryDelay.mockReturnValue(0); // Let retry handler calculate
      
      const calculateDelay = (testHandler as any).calculateDelay.bind(testHandler);
      
      // Attempt 3 would be 1000 * 10^3 = 1,000,000 without cap
      const delay = calculateDelay(3, new Error());
      
      // Should be capped at maxDelay
      expect(delay).toBeLessThanOrEqual(5000);
    });
  });
  
  describe('shouldRetry', () => {
    it('should retry on configured error codes', () => {
      const shouldRetry = (handler as any).shouldRetry.bind(handler);
      
      // Test various retryable errors
      const econnrefused: any = new Error();
      econnrefused.code = 'ECONNREFUSED';
      mockErrorHandler.isRetryableError.mockReturnValue(true);
      expect(shouldRetry(econnrefused, 0)).toBe(true);
      
      const timeout: any = new Error();
      timeout.code = 'ETIMEDOUT';
      mockErrorHandler.isRetryableError.mockReturnValue(true);
      expect(shouldRetry(timeout, 0)).toBe(true);
      
      const serverError: any = new Error();
      serverError.response = { status: 503 };
      mockErrorHandler.isRetryableError.mockReturnValue(true);
      expect(shouldRetry(serverError, 0)).toBe(true);
    });
    
    it('should not retry on client errors (except 429)', () => {
      const shouldRetry = (handler as any).shouldRetry.bind(handler);
      
      const badRequest: any = new Error();
      badRequest.response = { status: 400 };
      mockErrorHandler.isRetryableError.mockReturnValue(false);
      expect(shouldRetry(badRequest, 0)).toBe(false);
      
      const unauthorized: any = new Error();
      unauthorized.response = { status: 401 };
      mockErrorHandler.isRetryableError.mockReturnValue(false);
      expect(shouldRetry(unauthorized, 0)).toBe(false);
      
      const notFound: any = new Error();
      notFound.response = { status: 404 };
      mockErrorHandler.isRetryableError.mockReturnValue(false);
      expect(shouldRetry(notFound, 0)).toBe(false);
    });
    
    it('should not retry when attempts exhausted', () => {
      const shouldRetry = (handler as any).shouldRetry.bind(handler);
      
      const error: any = new Error();
      error.code = 'ECONNREFUSED'; // Normally retryable
      mockErrorHandler.isRetryableError.mockReturnValue(true); // Would be retryable
      
      // At max retries (3), should not retry
      expect(shouldRetry(error, 3)).toBe(false);
    });
  });
  
  describe('sleep', () => {
    it('should delay for specified time', async () => {
      // Use real timers for this test
      jest.useRealTimers();
      
      const start = Date.now();
      const sleep = (handler as any).sleep.bind(handler);
      
      await sleep(100);
      
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow some tolerance
      expect(elapsed).toBeLessThan(150);
      
      // Restore fake timers
      jest.useFakeTimers();
    });
  });
}); 