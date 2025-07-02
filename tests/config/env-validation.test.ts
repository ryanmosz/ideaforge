/**
 * Environment Configuration Validation Tests
 * Verifies that environment configuration is properly validated and loaded
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Environment Configuration Validation', () => {
  const originalEnv = process.env;
  const configPath = path.join(process.cwd(), 'src', 'config', 'index.ts');

  beforeEach(() => {
    // Reset modules to ensure fresh config loading
    jest.resetModules();
    // Clear environment
    process.env = {};
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Required Variables', () => {
    it('should throw error when OPENAI_API_KEY is missing', () => {
      process.env.N8N_WEBHOOK_URL = 'https://test.webhook.url';
      
      const { loadConfig } = require('../../src/config');
      
      expect(() => loadConfig()).toThrow('Missing required environment variable: OPENAI_API_KEY');
    });

    it('should throw error when N8N_WEBHOOK_URL is missing', () => {
      process.env.OPENAI_API_KEY = 'test-key-123';
      
      const { loadConfig } = require('../../src/config');
      
      expect(() => loadConfig()).toThrow('Missing required environment variable: N8N_WEBHOOK_URL');
    });

    it('should throw error when both required variables are missing', () => {
      const { loadConfig } = require('../../src/config');
      
      expect(() => loadConfig()).toThrow('Missing required environment variable');
    });
  });

  describe('Valid Configuration', () => {
    it('should load config successfully with all required variables', () => {
      process.env.OPENAI_API_KEY = 'test-api-key-123';
      process.env.N8N_WEBHOOK_URL = 'https://webhook.example.com/hook';
      
      const { loadConfig } = require('../../src/config');
      const config = loadConfig();
      
      expect(config).toBeDefined();
      expect(config.openaiApiKey).toBe('test-api-key-123');
      expect(config.n8nWebhookUrl).toBe('https://webhook.example.com/hook');
    });

    it('should load config with custom optional values', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.N8N_WEBHOOK_URL = 'https://webhook.url';
      process.env.LOG_LEVEL = 'debug';
      process.env.NODE_ENV = 'production';
      
      const { loadConfig } = require('../../src/config');
      const config = loadConfig();
      
      expect(config.logLevel).toBe('debug');
      expect(config.nodeEnv).toBe('production');
    });
  });

  describe('Default Values', () => {
    it('should use default LOG_LEVEL when not provided', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.N8N_WEBHOOK_URL = 'https://webhook.url';
      
      const { loadConfig } = require('../../src/config');
      const config = loadConfig();
      
      expect(config.logLevel).toBe('info');
    });

    it('should use default NODE_ENV when not provided', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.N8N_WEBHOOK_URL = 'https://webhook.url';
      
      const { loadConfig } = require('../../src/config');
      const config = loadConfig();
      
      expect(config.nodeEnv).toBe('development');
    });
  });

  describe('Configuration Type Safety', () => {
    it('should return config object with correct types', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.N8N_WEBHOOK_URL = 'https://webhook.url';
      
      const { loadConfig } = require('../../src/config');
      const config = loadConfig();
      
      expect(typeof config.openaiApiKey).toBe('string');
      expect(typeof config.n8nWebhookUrl).toBe('string');
      expect(typeof config.logLevel).toBe('string');
      expect(typeof config.nodeEnv).toBe('string');
    });

    it('should have all expected properties', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.N8N_WEBHOOK_URL = 'https://webhook.url';
      
      const { loadConfig } = require('../../src/config');
      const config = loadConfig();
      
      expect(config).toHaveProperty('openaiApiKey');
      expect(config).toHaveProperty('n8nWebhookUrl');
      expect(config).toHaveProperty('logLevel');
      expect(config).toHaveProperty('nodeEnv');
    });
  });

  describe('Edge Cases', () => {
    it('should treat empty string values as invalid for required variables', () => {
      process.env.OPENAI_API_KEY = '';
      process.env.N8N_WEBHOOK_URL = '';
      
      const { loadConfig } = require('../../src/config');
      
      expect(() => loadConfig()).toThrow('Missing required environment variable');
    });

    it('should treat whitespace-only values as valid (non-empty)', () => {
      process.env.OPENAI_API_KEY = '   ';
      process.env.N8N_WEBHOOK_URL = '\t\n';
      
      const { loadConfig } = require('../../src/config');
      const config = loadConfig();
      
      expect(config.openaiApiKey).toBe('   ');
      expect(config.n8nWebhookUrl).toBe('\t\n');
    });

    it('should handle special characters in values', () => {
      process.env.OPENAI_API_KEY = 'sk-1234!@#$%^&*()_+';
      process.env.N8N_WEBHOOK_URL = 'https://webhook.com/path?param=value&other=123';
      
      const { loadConfig } = require('../../src/config');
      const config = loadConfig();
      
      expect(config.openaiApiKey).toBe('sk-1234!@#$%^&*()_+');
      expect(config.n8nWebhookUrl).toBe('https://webhook.com/path?param=value&other=123');
    });

    it('should handle very long values', () => {
      const longKey = 'sk-' + 'a'.repeat(500);
      const longUrl = 'https://webhook.com/' + 'path/'.repeat(100);
      
      process.env.OPENAI_API_KEY = longKey;
      process.env.N8N_WEBHOOK_URL = longUrl;
      
      const { loadConfig } = require('../../src/config');
      const config = loadConfig();
      
      expect(config.openaiApiKey).toBe(longKey);
      expect(config.n8nWebhookUrl).toBe(longUrl);
    });
  });

  describe('Dotenv Integration', () => {
    const testEnvPath = path.join(process.cwd(), '.env.config-test');

    afterEach(() => {
      if (fs.existsSync(testEnvPath)) {
        fs.unlinkSync(testEnvPath);
      }
    });

    it('should load from .env file when DOTENV_CONFIG_PATH is set', () => {
      // Create test .env file
      fs.writeFileSync(testEnvPath, `
OPENAI_API_KEY=env-file-key
N8N_WEBHOOK_URL=https://env-file.webhook.url
LOG_LEVEL=warn
NODE_ENV=staging
`);
      
      process.env.DOTENV_CONFIG_PATH = testEnvPath;
      
      // Clear require cache and reload
      delete require.cache[configPath];
      const { loadConfig } = require('../../src/config');
      const config = loadConfig();
      
      expect(config.openaiApiKey).toBe('env-file-key');
      expect(config.n8nWebhookUrl).toBe('https://env-file.webhook.url');
      expect(config.logLevel).toBe('warn');
      expect(config.nodeEnv).toBe('staging');
    });

    it('should prefer process.env over .env file values', () => {
      // Create test .env file
      fs.writeFileSync(testEnvPath, `
OPENAI_API_KEY=env-file-key
N8N_WEBHOOK_URL=https://env-file.webhook.url
`);
      
      // Set process.env values (should take precedence)
      process.env.DOTENV_CONFIG_PATH = testEnvPath;
      process.env.OPENAI_API_KEY = 'process-env-key';
      
      // Clear require cache and reload
      delete require.cache[configPath];
      const { loadConfig } = require('../../src/config');
      const config = loadConfig();
      
      expect(config.openaiApiKey).toBe('process-env-key');
      expect(config.n8nWebhookUrl).toBe('https://env-file.webhook.url');
    });
  });

  describe('Error Messages', () => {
    it('should provide clear error message for missing variables', () => {
      const { loadConfig } = require('../../src/config');
      
      try {
        loadConfig();
      } catch (error: any) {
        expect(error.message).toMatch(/Missing required environment variable/);
        expect(error.message).toMatch(/OPENAI_API_KEY|N8N_WEBHOOK_URL/);
      }
    });

    it('should handle multiple missing variables', () => {
      const { loadConfig } = require('../../src/config');
      let error: Error | null = null;
      
      try {
        loadConfig();
      } catch (e: any) {
        error = e;
      }
      
      expect(error).toBeTruthy();
      expect(error).toBeInstanceOf(Error);
    });
  });
}); 