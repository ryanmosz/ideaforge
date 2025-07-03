import { N8nConfig } from '../types/n8n-types';

/**
 * Get n8n configuration from environment variables
 * @returns N8nConfig object with validated settings
 * @throws Error if required environment variables are missing
 */
export const getN8nConfig = (): N8nConfig => {
  const config: N8nConfig = {
    baseUrl: process.env.N8N_BASE_URL || 'http://localhost:5678',
    webhookPath: process.env.N8N_WEBHOOK_PATH || 'webhook',
    apiKey: process.env.N8N_API_KEY || '',
    timeout: parseInt(process.env.N8N_TIMEOUT || '30000'),
    retries: parseInt(process.env.N8N_RETRIES || '3')
  };
  
  // Validate required fields
  if (!config.apiKey) {
    throw new Error('N8N_API_KEY environment variable is required');
  }
  
  // Validate numeric fields
  if (isNaN(config.timeout) || config.timeout <= 0) {
    throw new Error('N8N_TIMEOUT must be a positive number');
  }
  
  if (isNaN(config.retries) || config.retries < 0) {
    throw new Error('N8N_RETRIES must be a non-negative number');
  }
  
  return config;
};

/**
 * Check if n8n integration is enabled
 * @returns true if n8n API key is configured
 */
export const isN8nEnabled = (): boolean => {
  return !!process.env.N8N_API_KEY;
}; 