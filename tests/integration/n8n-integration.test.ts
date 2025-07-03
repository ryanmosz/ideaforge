import { N8nBridge } from '../../src/agents/bridges/n8n-bridge';
import { ProjectState } from '../../src/agents/state';
import axios from 'axios';

// Mock axios at the module level
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('n8n Integration Tests', () => {
  let mockAxiosInstance: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };
    
    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    
    // Set up environment
    process.env.N8N_BASE_URL = 'http://localhost:5678';
    process.env.N8N_API_KEY = 'test-api-key';
    process.env.N8N_TIMEOUT = '5000';
    process.env.N8N_RETRIES = '2';
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });
  
  describe('Full Research Flow Integration', () => {
    it('should complete full research flow with real components', async () => {
      // Mock successful API responses
      const hnResponse = {
        data: {
          status: 'success' as const,
          data: {
            query: 'typescript',
            results: [
              {
                id: 'hn-1',
                title: 'TypeScript 5.0 Released',
                url: 'https://news.ycombinator.com/item?id=123',
                content: 'Major new features in TypeScript 5.0',
                author: 'user123',
                points: 150,
                comments: 50,
                created_at: '2024-01-01T00:00:00Z'
              }
            ],
            total: 1,
            source: 'hackernews' as const
          },
          metadata: {
            cached: false,
            requestDuration: 250
          }
        }
      };
      
      const redditResponse = {
        data: {
          status: 'success' as const,
          data: {
            query: 'typescript',
            results: [
              {
                id: 'reddit-1',
                title: 'Why I love TypeScript',
                url: 'https://reddit.com/r/typescript/123',
                content: 'TypeScript has transformed how I write code',
                author: 'redditor456',
                subreddit: 'typescript',
                upvotes: 200,
                comments: 30,
                created_utc: 1704067200
              }
            ],
            total: 1,
            source: 'reddit' as const
          },
          metadata: {
            cached: false,
            requestDuration: 300
          }
        }
      };
      
      mockAxiosInstance.post
        .mockImplementationOnce((url: string) => {
          if (url.includes('hackernews')) return Promise.resolve(hnResponse);
          throw new Error('Unexpected URL');
        })
        .mockImplementationOnce((url: string) => {
          if (url.includes('reddit')) return Promise.resolve(redditResponse);
          throw new Error('Unexpected URL');
        });
      
      // Create real bridge with all components
      const bridge = new N8nBridge({
        enableSessionAutoCleanup: false
      });
      
      const state: ProjectState = {
        filePath: 'test.org',
        fileContent: '',
        sessionId: 'integration-test-session',
        requirements: [],
        userStories: [],
        brainstormIdeas: [],
        questionsAnswers: [],
        moscowAnalysis: {
          must: [],
          should: [],
          could: [],
          wont: []
        },
        kanoAnalysis: {
          basic: [],
          performance: [],
          excitement: []
        },
        dependencies: [],
        extractedTechnologies: ['typescript'],
        researchTopics: [],
        hackerNewsResults: [],
        redditResults: [],
        additionalResearchResults: [],
        researchSynthesis: '',
        userResponses: [],
        refinementIteration: 0,
        changelog: [],
        projectSuggestions: [],
        alternativeIdeas: [],
        techStackRecommendations: [],
        riskAssessment: [],
        currentNode: '',
        nextNode: null,
        errors: [],
        messages: []
      };
      
      // Research from state
      const results = await bridge.researchFromState(state);
      
      expect(results.size).toBe(1);
      expect(results.has('typescript')).toBe(true);
      
      const tsResult = results.get('typescript')!;
      expect(tsResult.totalResults).toBe(2);
      expect(tsResult.topResults).toHaveLength(2);
      expect(tsResult.insights.length).toBeGreaterThan(0);
      expect(tsResult.recommendations.length).toBeGreaterThan(0);
      
      // Check session metrics
      const metrics = bridge.getSessionMetrics('integration-test-session');
      expect(metrics).toBeDefined();
      expect(metrics?.requestCount).toBeGreaterThanOrEqual(3); // Main + HN + Reddit
      expect(metrics?.technologies.has('typescript')).toBe(true);
      
      // Cleanup
      bridge.cleanup();
    });
  });
  
  describe('Error Recovery Integration', () => {
    it('should recover from temporary failures with retry', async () => {
      jest.useFakeTimers();
      
      // First attempt fails, second succeeds
      mockAxiosInstance.post
        .mockRejectedValueOnce({ code: 'ECONNREFUSED' })
        .mockResolvedValueOnce({
          data: {
            status: 'success' as const,
            data: { query: 'react', results: [], total: 0, source: 'hackernews' as const },
            metadata: { cached: false, requestDuration: 100 }
          }
        })
        .mockRejectedValueOnce({ code: 'ETIMEDOUT' })
        .mockResolvedValueOnce({
          data: {
            status: 'success' as const,
            data: { query: 'react', results: [], total: 0, source: 'reddit' as const },
            metadata: { cached: false, requestDuration: 150 }
          }
        });
      
      const bridge = new N8nBridge({
        enableSessionAutoCleanup: false
      });
      
      const state: ProjectState = {
        filePath: 'test.org',
        fileContent: '',
        sessionId: 'retry-test',
        requirements: [],
        userStories: [],
        brainstormIdeas: [],
        questionsAnswers: [],
        moscowAnalysis: {
          must: [],
          should: [],
          could: [],
          wont: []
        },
        kanoAnalysis: {
          basic: [],
          performance: [],
          excitement: []
        },
        dependencies: [],
        extractedTechnologies: [],
        researchTopics: [],
        hackerNewsResults: [],
        redditResults: [],
        additionalResearchResults: [],
        researchSynthesis: '',
        userResponses: [],
        refinementIteration: 0,
        changelog: [],
        projectSuggestions: [],
        alternativeIdeas: [],
        techStackRecommendations: [],
        riskAssessment: [],
        currentNode: '',
        nextNode: null,
        errors: [],
        messages: []
      };
      
      // Start research
      const promise = bridge.researchTechnology('react', state);
      
      // Advance timers for retries
      await jest.runOnlyPendingTimersAsync();
      await jest.runOnlyPendingTimersAsync();
      
      const result = await promise;
      
      expect(result.totalResults).toBe(0);
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(4); // 2 attempts each
      
      bridge.cleanup();
      jest.useRealTimers();
    });
    
    it('should handle circuit breaker opening and provide fallback', async () => {
      // Simulate service being down
      mockAxiosInstance.post.mockRejectedValue({
        response: { status: 503, statusText: 'Service Unavailable' }
      });
      
      const bridge = new N8nBridge({
        enableSessionAutoCleanup: false,
        circuitBreakerConfig: {
          failureThreshold: 3,
          resetTimeout: 1000
        }
      });
      
      const state: ProjectState = {
        filePath: 'test.org',
        fileContent: '',
        sessionId: 'circuit-test',
        requirements: [],
        userStories: [],
        brainstormIdeas: [],
        questionsAnswers: [],
        moscowAnalysis: {
          must: [],
          should: [],
          could: [],
          wont: []
        },
        kanoAnalysis: {
          basic: [],
          performance: [],
          excitement: []
        },
        dependencies: [],
        extractedTechnologies: [],
        researchTopics: [],
        hackerNewsResults: [],
        redditResults: [],
        additionalResearchResults: [],
        researchSynthesis: '',
        userResponses: [],
        refinementIteration: 0,
        changelog: [],
        projectSuggestions: [],
        alternativeIdeas: [],
        techStackRecommendations: [],
        riskAssessment: [],
        currentNode: '',
        nextNode: null,
        errors: [],
        messages: []
      };
      
      // Make multiple requests to trigger circuit breaker
      const technologies = ['tech1', 'tech2', 'tech3', 'tech4'];
      const results = await bridge.researchMultipleTechnologies(technologies, state);
      
      expect(results.size).toBe(4);
      
      // Check circuit breaker state
      const stats = bridge.getCircuitBreakerStats();
      expect(stats.hackernews.state).toBe('OPEN');
      expect(stats.reddit.state).toBe('OPEN');
      
      // All results should be fallbacks
      technologies.forEach(tech => {
        const result = results.get(tech)!;
        expect(result.insights).toContain('External research services are currently unavailable');
      });
      
      bridge.cleanup();
    });
  });
  
  describe('Session Management Integration', () => {
    it('should track sessions across multiple operations', async () => {
      // Mock varied responses
      mockAxiosInstance.post
        .mockResolvedValueOnce({
          data: {
            status: 'success' as const,
            data: { 
              query: 'python', 
              results: [
                {
                  id: 'hn-py-1',
                  title: 'Python 3.12 Released',
                  url: 'https://news.ycombinator.com/item?id=456',
                  content: 'New features in Python 3.12',
                  author: 'pythonista',
                  points: 200,
                  comments: 75,
                  created_at: '2024-01-02T00:00:00Z'
                }
              ], 
              total: 1, 
              source: 'hackernews' as const 
            },
            metadata: { cached: false, requestDuration: 200 }
          }
        })
        .mockRejectedValueOnce(new Error('Reddit temporarily down'))
        .mockResolvedValueOnce({
          data: {
            status: 'success' as const,
            data: { query: 'javascript', results: [], total: 0, source: 'hackernews' as const },
            metadata: { cached: true, requestDuration: 50 }
          }
        })
        .mockResolvedValueOnce({
          data: {
            status: 'success' as const,
            data: { query: 'javascript', results: [], total: 0, source: 'reddit' as const },
            metadata: { cached: false, requestDuration: 250 }
          }
        });
      
      const bridge = new N8nBridge({
        enableSessionAutoCleanup: false,
        sessionTrackerMaxAge: 5 * 60 * 1000 // 5 minutes
      });
      
      const sessionId = 'multi-op-session';
      const state: ProjectState = {
        filePath: 'test.org',
        fileContent: '',
        sessionId,
        requirements: [],
        userStories: [],
        brainstormIdeas: [],
        questionsAnswers: [],
        moscowAnalysis: {
          must: [],
          should: [],
          could: [],
          wont: []
        },
        kanoAnalysis: {
          basic: [],
          performance: [],
          excitement: []
        },
        dependencies: [],
        extractedTechnologies: ['python', 'javascript'],
        researchTopics: [],
        hackerNewsResults: [],
        redditResults: [],
        additionalResearchResults: [],
        researchSynthesis: '',
        userResponses: [],
        refinementIteration: 0,
        changelog: [],
        projectSuggestions: [],
        alternativeIdeas: [],
        techStackRecommendations: [],
        riskAssessment: [],
        currentNode: '',
        nextNode: null,
        errors: [],
        messages: []
      };
      
      // Perform multiple operations
      const results = await bridge.researchFromState(state);
      
      expect(results.size).toBe(2);
      
      // Get comprehensive session data
      const metrics = bridge.getSessionMetrics(sessionId);
      expect(metrics).toBeDefined();
      expect(metrics?.technologies.size).toBe(2);
      expect(metrics?.technologies.has('python')).toBe(true);
      expect(metrics?.technologies.has('javascript')).toBe(true);
      expect(metrics?.errors.length).toBeGreaterThan(0); // Reddit error
      
      // Get aggregate stats
      const stats = bridge.getStats();
      expect(stats.totalSessions).toBeGreaterThanOrEqual(1);
      expect(stats.totalRequests).toBeGreaterThanOrEqual(2);
      
      // Export session for debugging
      const exported = bridge.exportSessionData(sessionId);
      const parsed = JSON.parse(exported);
      expect(parsed.sessionId).toBe(sessionId);
      expect(parsed.technologies).toContain('python');
      expect(parsed.technologies).toContain('javascript');
      
      bridge.cleanup();
    });
  });
  
  describe('Performance and Caching Integration', () => {
    it('should handle rapid successive requests efficiently', async () => {
      let callCount = 0;
      mockAxiosInstance.post.mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          data: {
            status: 'success' as const,
            data: { 
              query: 'performance-test', 
              results: [], 
              total: 0, 
              source: callCount % 2 === 0 ? 'reddit' as const : 'hackernews' as const
            },
            metadata: { 
              cached: callCount > 2, 
              requestDuration: 100 
            }
          }
        });
      });
      
      const bridge = new N8nBridge({
        enableSessionAutoCleanup: false,
        maxConcurrentRequests: 10
      });
      
      const state: ProjectState = {
        filePath: 'test.org',
        fileContent: '',
        sessionId: 'perf-test',
        requirements: [],
        userStories: [],
        brainstormIdeas: [],
        questionsAnswers: [],
        moscowAnalysis: {
          must: [],
          should: [],
          could: [],
          wont: []
        },
        kanoAnalysis: {
          basic: [],
          performance: [],
          excitement: []
        },
        dependencies: [],
        extractedTechnologies: [],
        researchTopics: [],
        hackerNewsResults: [],
        redditResults: [],
        additionalResearchResults: [],
        researchSynthesis: '',
        userResponses: [],
        refinementIteration: 0,
        changelog: [],
        projectSuggestions: [],
        alternativeIdeas: [],
        techStackRecommendations: [],
        riskAssessment: [],
        currentNode: '',
        nextNode: null,
        errors: [],
        messages: []
      };
      
      // Make 10 rapid requests
      const startTime = Date.now();
      const promises = Array(10).fill(null).map(() => 
        bridge.researchTechnology(`performance-test`, state)
      );
      
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      expect(results).toHaveLength(10);
      expect(callCount).toBe(20); // 2 calls per research (HN + Reddit)
      
      // Should complete reasonably quickly despite 20 API calls
      expect(duration).toBeLessThan(5000);
      
      bridge.cleanup();
    });
  });
  
  describe('Complex Error Scenarios Integration', () => {
    it('should handle mixed error types in single session', async () => {
      // Set up various error scenarios
      mockAxiosInstance.post
        .mockRejectedValueOnce({ code: 'ECONNREFUSED' }) // Network error
        .mockRejectedValueOnce({ response: { status: 429, headers: { 'retry-after': '60' } } }) // Rate limit
        .mockRejectedValueOnce({ response: { status: 401 } }) // Auth error
        .mockResolvedValueOnce({
          data: {
            status: 'success' as const,
            data: { query: 'test', results: [], total: 0, source: 'reddit' as const },
            metadata: { cached: false, requestDuration: 200 }
          }
        });
      
      const bridge = new N8nBridge({
        enableSessionAutoCleanup: false
      });
      
      const state: ProjectState = {
        filePath: 'test.org',
        fileContent: '',
        sessionId: 'error-mix-test',
        requirements: [],
        userStories: [],
        brainstormIdeas: [],
        questionsAnswers: [],
        moscowAnalysis: {
          must: [],
          should: [],
          could: [],
          wont: []
        },
        kanoAnalysis: {
          basic: [],
          performance: [],
          excitement: []
        },
        dependencies: [],
        extractedTechnologies: [],
        researchTopics: [],
        hackerNewsResults: [],
        redditResults: [],
        additionalResearchResults: [],
        researchSynthesis: '',
        userResponses: [],
        refinementIteration: 0,
        changelog: [],
        projectSuggestions: [],
        alternativeIdeas: [],
        techStackRecommendations: [],
        riskAssessment: [],
        currentNode: '',
        nextNode: null,
        errors: [],
        messages: []
      };
      
      // This should handle various errors gracefully
      const result = await bridge.researchTechnology('test', state);
      
      expect(result).toBeDefined();
      expect(result.totalResults).toBe(0); // Only Reddit succeeded
      
      // Check error tracking
      const metrics = bridge.getSessionMetrics('error-mix-test');
      expect(metrics?.errors.length).toBeGreaterThan(0);
      
      bridge.cleanup();
    });
  });
}); 