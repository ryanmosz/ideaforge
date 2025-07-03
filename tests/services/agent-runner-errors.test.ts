import { AgentRunner } from '../../src/services/agent-runner';
import { FileHandler } from '../../src/services/file-handler';
import * as fs from 'fs';

// Mock modules
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn()
  }
}));

jest.mock('../../src/agents/graph');
import * as graphModule from '../../src/agents/graph';
const mockBuildIdeaForgeGraph = graphModule.buildIdeaForgeGraph as jest.MockedFunction<typeof graphModule.buildIdeaForgeGraph>;

describe('AgentRunner Error Handling', () => {
  let agentRunner: AgentRunner;
  let mockFileHandler: FileHandler;
  let originalDebug: string | undefined;
  
  beforeAll(() => {
    // Save original DEBUG value and disable it for these tests
    originalDebug = process.env.DEBUG;
    delete process.env.DEBUG;
  });
  
  afterAll(() => {
    // Restore original DEBUG value
    if (originalDebug !== undefined) {
      process.env.DEBUG = originalDebug;
    }
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockFileHandler = {} as FileHandler;
    agentRunner = new AgentRunner(mockFileHandler);
  });
  
  describe('Error Classification', () => {
    it('should handle missing API key error', async () => {
      const apiKeyError = new Error('Missing OPENAI_API_KEY');
      (fs.promises.readFile as jest.Mock).mockRejectedValue(apiKeyError);
      
      await expect(agentRunner.analyze('test.org'))
        .rejects.toThrow('OpenAI API key not configured');
    });
    
    it('should handle rate limit errors', async () => {
      const rateLimitError = { 
        message: 'rate limit exceeded',
        response: { status: 429 } 
      };
      (fs.promises.readFile as jest.Mock).mockRejectedValue(rateLimitError);
      
      await expect(agentRunner.analyze('test.org'))
        .rejects.toThrow('OpenAI rate limit exceeded');
    });
    
    it('should handle file not found errors', async () => {
      const fileError = Object.assign(new Error('ENOENT'), {
        code: 'ENOENT',
        path: '/path/to/missing.org'
      });
      (fs.promises.readFile as jest.Mock).mockRejectedValue(fileError);
      
      await expect(agentRunner.analyze('test.org'))
        .rejects.toThrow('File not found: /path/to/missing.org');
    });
    
    it('should handle model errors', async () => {
      const modelError = new Error('Invalid model specified');
      (fs.promises.readFile as jest.Mock).mockRejectedValue(modelError);
      
      const error = await agentRunner.analyze('test.org').catch(e => e);
      expect(error.message).toContain('AI model error');
      expect(error.message).toContain('Try a different model with --model');
    });
    
    it('should handle network errors', async () => {
      const networkError = Object.assign(new Error('Connection refused'), {
        code: 'ECONNREFUSED'
      });
      (fs.promises.readFile as jest.Mock).mockRejectedValue(networkError);
      
      await expect(agentRunner.analyze('test.org'))
        .rejects.toThrow('Network connection failed');
    });
    
    it('should handle session/checkpoint errors', async () => {
      const sessionError = new Error('Failed to load checkpoint');
      (fs.promises.readFile as jest.Mock).mockRejectedValue(sessionError);
      
      const error = await agentRunner.analyze('test.org').catch(e => e);
      expect(error.message).toContain('Session error');
      expect(error.message).toContain('Try running with --fresh flag');
    });
    
    it('should handle generic errors with context', async () => {
      const genericError = new Error('Something went wrong');
      (fs.promises.readFile as jest.Mock).mockRejectedValue(genericError);
      
      await expect(agentRunner.analyze('test.org'))
        .rejects.toThrow('Document loading failed: Something went wrong');
    });
    
    it('should log debug info when DEBUG env is set', async () => {
      const originalDebug = process.env.DEBUG;
      process.env.DEBUG = '1';
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Test error');
      error.stack = 'Test stack trace';
      (fs.promises.readFile as jest.Mock).mockRejectedValue(error);
      
      await agentRunner.analyze('test.org').catch(() => {});
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[DEBUG] Full error:'), error);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[DEBUG] Stack trace:'), 'Test stack trace');
      
      consoleErrorSpy.mockRestore();
      process.env.DEBUG = originalDebug;
    });
  });
  
  describe('Retry Logic', () => {
    let mockGraph: any;
    let mockSessionManager: any;
    
    beforeEach(() => {
      // Mock successful file read
      (fs.promises.readFile as jest.Mock).mockResolvedValue('test content');
      
      // Mock session manager
      mockSessionManager = {
        getOrCreateSession: jest.fn().mockResolvedValue({
          threadId: 'test-thread',
          documentPath: 'test.org'
        }),
        getCheckpointer: jest.fn().mockReturnValue({
          get: jest.fn(),
          put: jest.fn()
        }),
        saveState: jest.fn()
      };
      (agentRunner as any).sessionManager = mockSessionManager;
      
      // Mock graph
      mockGraph = {
        stream: jest.fn()
      };
      mockBuildIdeaForgeGraph.mockReturnValue(mockGraph);
    });
    
    it('should retry on rate limit errors', async () => {
      let attempts = 0;
      const rateLimitError = { 
        message: 'rate limit',
        response: { status: 429 } 
      };
      
      mockGraph.stream.mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw rateLimitError;
        }
        // Return a stream that completes after one iteration
        let called = false;
        return {
          [Symbol.asyncIterator]: jest.fn().mockImplementation(() => ({
            async next() {
              if (!called) {
                called = true;
                return { 
                  value: { __end__: { 
                    requirements: [],
                    userStories: [],
                    brainstormIdeas: [],
                    questionsAnswers: [],
                    moscowAnalysis: { must: [], should: [], could: [], wont: [] },
                    kanoAnalysis: { basic: [], performance: [], excitement: [] }
                  }}, 
                  done: false 
                };
              }
              return { done: true };
            }
          }))
        };
      });
      
      const result = await agentRunner.analyze('test.org');
      
      expect(mockGraph.stream).toHaveBeenCalledTimes(3);
      expect(result).toBeDefined();
    });
    
    it('should not retry on non-retryable errors', async () => {
      const apiKeyError = new Error('Missing API key');
      mockGraph.stream.mockRejectedValue(apiKeyError);
      
      await expect(agentRunner.analyze('test.org'))
        .rejects.toThrow('Missing API key');
      
      expect(mockGraph.stream).toHaveBeenCalledTimes(1);
    });
    
    it('should apply exponential backoff', async () => {
      let attempts = 0;
      const timeoutError = Object.assign(new Error('Timeout'), {
        code: 'ETIMEDOUT'
      });
      
      mockGraph.stream.mockImplementation(() => {
        attempts++;
        throw timeoutError; // Always fail to test max retries
      });
      
      await expect(agentRunner.analyze('test.org'))
        .rejects.toThrow('Timeout');
      
      // Should have attempted exactly 3 times (initial + 2 retries)
      expect(mockGraph.stream).toHaveBeenCalledTimes(3);
    });
    
    it('should emit progress events for retries', async () => {
      const progressEvents: any[] = [];
      agentRunner.on('progress', event => progressEvents.push(event));
      
      let attempts = 0;
      const connectionError = Object.assign(new Error('Connection reset'), {
        code: 'ECONNRESET'
      });
      
      mockGraph.stream.mockImplementation(() => {
        attempts++;
        if (attempts < 2) {
          throw connectionError;
        }
        // Return a stream that completes after one iteration
        let called = false;
        return {
          [Symbol.asyncIterator]: jest.fn().mockImplementation(() => ({
            async next() {
              if (!called) {
                called = true;
                return { 
                  value: { __end__: { 
                    requirements: [],
                    userStories: [],
                    brainstormIdeas: [],
                    questionsAnswers: [],
                    moscowAnalysis: { must: [], should: [], could: [], wont: [] },
                    kanoAnalysis: { basic: [], performance: [], excitement: [] }
                  }}, 
                  done: false 
                };
              }
              return { done: true };
            }
          }))
        };
      });
      
      await agentRunner.analyze('test.org').catch(() => {});
      
      const retryEvents = progressEvents.filter(e => e.node === 'retry');
      expect(retryEvents).toHaveLength(1);
      expect(retryEvents[0].message).toContain('attempt 1/3');
      expect(retryEvents[0].level).toBe('warning');
    });
  });
}); 