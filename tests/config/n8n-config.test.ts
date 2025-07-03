import { getN8nConfig, isN8nEnabled } from '../../src/config/n8n-config';

describe('n8n-config', () => {
  // Store original env
  const originalEnv = process.env;
  
  beforeEach(() => {
    // Reset env before each test
    process.env = { ...originalEnv };
  });
  
  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });
  
  describe('getN8nConfig', () => {
    it('should return config with default values', () => {
      process.env.N8N_API_KEY = 'test-key';
      // Clear any test environment overrides
      delete process.env.N8N_TIMEOUT;
      delete process.env.N8N_RETRIES;
      
      const config = getN8nConfig();
      
      expect(config).toEqual({
        baseUrl: 'http://localhost:5678',
        webhookPath: 'webhook',
        apiKey: 'test-key',
        timeout: 30000,
        retries: 3
      });
    });
    
    it('should use environment variables when provided', () => {
      process.env.N8N_BASE_URL = 'https://custom.n8n.cloud';
      process.env.N8N_WEBHOOK_PATH = 'custom-webhook';
      process.env.N8N_API_KEY = 'custom-api-key';
      process.env.N8N_TIMEOUT = '60000';
      process.env.N8N_RETRIES = '5';
      
      const config = getN8nConfig();
      
      expect(config).toEqual({
        baseUrl: 'https://custom.n8n.cloud',
        webhookPath: 'custom-webhook',
        apiKey: 'custom-api-key',
        timeout: 60000,
        retries: 5
      });
    });
    
    it('should throw error when API key is missing', () => {
      delete process.env.N8N_API_KEY;
      
      expect(() => getN8nConfig()).toThrow('N8N_API_KEY environment variable is required');
    });
    
    it('should throw error when timeout is invalid', () => {
      process.env.N8N_API_KEY = 'test-key';
      process.env.N8N_TIMEOUT = 'invalid';
      
      expect(() => getN8nConfig()).toThrow('N8N_TIMEOUT must be a positive number');
    });
    
    it('should throw error when timeout is zero', () => {
      process.env.N8N_API_KEY = 'test-key';
      process.env.N8N_TIMEOUT = '0';
      
      expect(() => getN8nConfig()).toThrow('N8N_TIMEOUT must be a positive number');
    });
    
    it('should throw error when timeout is negative', () => {
      process.env.N8N_API_KEY = 'test-key';
      process.env.N8N_TIMEOUT = '-1000';
      
      expect(() => getN8nConfig()).toThrow('N8N_TIMEOUT must be a positive number');
    });
    
    it('should throw error when retries is invalid', () => {
      process.env.N8N_API_KEY = 'test-key';
      process.env.N8N_RETRIES = 'invalid';
      
      expect(() => getN8nConfig()).toThrow('N8N_RETRIES must be a non-negative number');
    });
    
    it('should throw error when retries is negative', () => {
      process.env.N8N_API_KEY = 'test-key';
      process.env.N8N_RETRIES = '-1';
      
      expect(() => getN8nConfig()).toThrow('N8N_RETRIES must be a non-negative number');
    });
    
    it('should allow zero retries', () => {
      process.env.N8N_API_KEY = 'test-key';
      process.env.N8N_RETRIES = '0';
      
      const config = getN8nConfig();
      
      expect(config.retries).toBe(0);
    });
  });
  
  describe('isN8nEnabled', () => {
    it('should return true when API key is set', () => {
      process.env.N8N_API_KEY = 'any-key';
      
      expect(isN8nEnabled()).toBe(true);
    });
    
    it('should return false when API key is not set', () => {
      delete process.env.N8N_API_KEY;
      
      expect(isN8nEnabled()).toBe(false);
    });
    
    it('should return false when API key is empty string', () => {
      process.env.N8N_API_KEY = '';
      
      expect(isN8nEnabled()).toBe(false);
    });
  });
}); 