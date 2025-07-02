import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file - support custom path for testing
const envPath = process.env.DOTENV_CONFIG_PATH || path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

interface Config {
  openaiApiKey: string;
  n8nWebhookUrl: string;
  logLevel: string;
  nodeEnv: string;
}

export function loadConfig(): Config {
  const required = ['OPENAI_API_KEY', 'N8N_WEBHOOK_URL'];
  
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  return {
    openaiApiKey: process.env.OPENAI_API_KEY!,
    n8nWebhookUrl: process.env.N8N_WEBHOOK_URL!,
    logLevel: process.env.LOG_LEVEL || 'info',
    nodeEnv: process.env.NODE_ENV || 'development',
  };
} 