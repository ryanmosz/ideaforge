import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file - support custom path for testing
// Skip loading .env in test environment unless explicitly specified
if (process.env.NODE_ENV !== 'test' || process.env.DOTENV_CONFIG_PATH) {
  const envPath = process.env.DOTENV_CONFIG_PATH || path.resolve(process.cwd(), '.env');
  dotenv.config({ path: envPath });
}

// Available AI models
export type AIModel = 'o3-mini' | 'gpt-4.1' | 'gpt-4.5-preview';

export const AI_MODELS: Record<AIModel, string> = {
  'o3-mini': 'o3-mini',
  'gpt-4.1': 'gpt-4',
  'gpt-4.5-preview': 'gpt-4-turbo-preview'
};

interface Config {
  openaiApiKey: string;
  n8nWebhookUrl?: string; // Optional - only needed for research feature
  logLevel: string;
  nodeEnv: string;
  aiModel: AIModel;
}

export function loadConfig(): Config {
  // Only OpenAI API key is truly required
  const required = ['OPENAI_API_KEY'];
  
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  // Validate AI model if provided
  const aiModel = (process.env.AI_MODEL || 'o3-mini') as AIModel;
  if (!AI_MODELS[aiModel]) {
    throw new Error(`Invalid AI_MODEL: ${aiModel}. Valid options are: ${Object.keys(AI_MODELS).join(', ')}`);
  }

  return {
    openaiApiKey: process.env.OPENAI_API_KEY!,
    n8nWebhookUrl: process.env.N8N_WEBHOOK_URL, // Optional
    logLevel: process.env.LOG_LEVEL || 'info',
    nodeEnv: process.env.NODE_ENV || 'development',
    aiModel
  };
} 