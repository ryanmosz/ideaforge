import { ChatOpenAI } from '@langchain/openai';
import { loadConfig, AI_MODELS } from '../../config';

/**
 * Creates a ChatOpenAI instance with the configured AI model
 * @param temperature - Temperature setting for the model (0-1)
 * @param maxTokens - Maximum tokens for the response
 * @returns Configured ChatOpenAI instance
 */
export function createLLM(temperature: number = 0.2, maxTokens: number = 2000): ChatOpenAI {
  // In test environment, we'll use mocked instances
  if (process.env.NODE_ENV === 'test') {
    return new ChatOpenAI({
      modelName: 'o3-mini',
      temperature,
      maxTokens,
      openAIApiKey: 'test-key' // Dummy key for tests
    });
  }
  
  const config = loadConfig();
  const modelName = AI_MODELS[config.aiModel];
  
  return new ChatOpenAI({
    modelName,
    temperature,
    maxTokens,
    openAIApiKey: config.openaiApiKey
  });
}

/**
 * Gets the current AI model being used
 * @returns The current AI model name
 */
export function getCurrentModel(): string {
  if (process.env.NODE_ENV === 'test') {
    return 'o3-mini';
  }
  const config = loadConfig();
  return config.aiModel;
} 