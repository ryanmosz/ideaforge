import { N8nBridge } from '../../../src/agents/bridges/n8n-bridge';
import { N8nClient } from '../../../src/services/n8n-client';
import { ResponseTransformer } from '../../../src/services/response-transformer';
import { ProjectState } from '../../../src/agents/state';

// Mock the modules
jest.mock('../../../src/services/n8n-client');
jest.mock('../../../src/services/response-transformer');

describe('N8nBridge - Edge Cases and Comprehensive Tests', () => {
  let bridge: N8nBridge;
  let mockClient: jest.Mocked<N8nClient>;
  let mockTransformer: jest.Mocked<ResponseTransformer>;
  const createdBridges: N8nBridge[] = [];
  
  const mockState: ProjectState = {
    filePath: 'test.org',
    fileContent: '',
    sessionId: 'test-session',
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
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockClient = {
      searchHackerNewsTransformed: jest.fn(),
      searchRedditTransformed: jest.fn(),
      checkHealth: jest.fn(),
      getConfig: jest.fn().mockReturnValue({ timeout: 10000 }),
    } as any;
    
    mockTransformer = {
      transformHackerNewsResults: jest.fn(),
      transformRedditResults: jest.fn(),
    } as any;
    
    bridge = new N8nBridge({
      client: mockClient,
      transformer: mockTransformer,
      enableSessionAutoCleanup: false,
    });
    createdBridges.push(bridge);
  });
  
  afterEach(() => {
    createdBridges.forEach(b => b.cleanup());
    createdBridges.length = 0;
  });
  
  describe('Unicode and Special Characters', () => {
    it('should handle Unicode technology names', async () => {
      const unicodeTech = 'Python🐍';
      mockClient.searchHackerNewsTransformed.mockResolvedValue([]);
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      const result = await bridge.researchTechnology(unicodeTech, mockState);
      
      expect(result.query).toBe(unicodeTech);
      expect(mockClient.searchHackerNewsTransformed).toHaveBeenCalledWith(
        unicodeTech,
        'test-session',
        expect.any(Object)
      );
    });
    
    it('should handle empty technology string', async () => {
      const result = await bridge.researchTechnology('', mockState);
      
      expect(result.query).toBe('');
      expect(result.insights).toContain('No research data available');
    });
    
    it('should handle technology names with line breaks', async () => {
      const multilineTech = 'React\nNative';
      mockClient.searchHackerNewsTransformed.mockResolvedValue([]);
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      const result = await bridge.researchTechnology(multilineTech, mockState);
      
      expect(result.query).toBe(multilineTech);
    });
  });
  
  describe('Concurrent Request Edge Cases', () => {
    it('should handle concurrent requests to same technology', async () => {
      mockClient.searchHackerNewsTransformed.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([]), 100))
      );
      mockClient.searchRedditTransformed.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([]), 100))
      );
      
      // Start multiple concurrent requests
      const promises = [
        bridge.researchTechnology('react', mockState),
        bridge.researchTechnology('react', mockState),
        bridge.researchTechnology('react', mockState)
      ];
      
      const results = await Promise.all(promises);
      
      // All should complete successfully
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.query).toBe('react');
      });
    });
    
    it('should handle mixed success/failure in concurrent batch', async () => {
      const technologies = ['tech1', 'tech2', 'tech3'];
      
      // Make middle technology fail
      mockClient.searchHackerNewsTransformed
        .mockResolvedValueOnce([])
        .mockRejectedValueOnce(new Error('Service error'))
        .mockResolvedValueOnce([]);
      
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      const results = await bridge.researchMultipleTechnologies(technologies, mockState);
      
      expect(results.size).toBe(3);
      expect(results.get('tech1')?.totalResults).toBe(0);
      expect(results.get('tech2')?.insights).toContain('External research services are currently unavailable');
      expect(results.get('tech3')?.totalResults).toBe(0);
    });
  });
  
  describe('Memory and Performance Edge Cases', () => {
    it('should handle very large result sets', async () => {
      const largeResults = Array(1000).fill(null).map((_, i) => ({
        id: `result-${i}`,
        source: 'hackernews' as const,
        title: `Result ${i}`,
        url: `https://example.com/${i}`,
        content: 'A'.repeat(1000), // Large content
        score: Math.random() * 100,
        metadata: { author: `user${i}` }
      }));
      
      mockClient.searchHackerNewsTransformed.mockResolvedValue(largeResults);
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      const result = await bridge.researchTechnology('bigdata', mockState);
      
      // Should limit results
      expect(result.topResults.length).toBeLessThanOrEqual(20);
      expect(result.totalResults).toBe(1000);
    });
    
    it('should handle very long technology lists', async () => {
      const manyTechnologies = Array(100).fill(null).map((_, i) => `tech${i}`);
      
      mockClient.searchHackerNewsTransformed.mockResolvedValue([]);
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      const startTime = Date.now();
      const results = await bridge.researchMultipleTechnologies(manyTechnologies, mockState);
      const duration = Date.now() - startTime;
      
      expect(results.size).toBe(100);
      // Should batch properly with delays
      expect(duration).toBeGreaterThan(1000); // At least some batching delays
    });
  });
  
  describe('State Corruption and Recovery', () => {
    it('should handle malformed research results', async () => {
      const malformedResult = {
        id: null,
        source: 'invalid-source',
        title: undefined,
        url: '',
        content: null,
        score: NaN,
        metadata: 'not-an-object'
      } as any;
      
      mockClient.searchHackerNewsTransformed.mockResolvedValue([malformedResult]);
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      const result = await bridge.researchTechnology('malformed', mockState);
      
      // Should handle gracefully
      expect(result.totalResults).toBe(1);
      expect(result.topResults[0]).toBeDefined();
    });
    
    it('should recover from circuit breaker in HALF_OPEN state', async () => {
      const breaker = bridge['circuitBreakerManager'].getBreaker('hackernews');
      
      // Force circuit to OPEN then wait for HALF_OPEN
      for (let i = 0; i < 5; i++) {
        await breaker.execute(async () => {
          throw new Error('Forced failure');
        }).catch(() => {});
      }
      
      const stats = breaker.getStats();
      expect(stats.state).toBe('OPEN');
      
      // Wait a moment and check if it transitions to HALF_OPEN
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // First request should attempt
      mockClient.searchHackerNewsTransformed.mockResolvedValue([]);
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      const result = await bridge.researchTechnology('recovery-test', mockState);
      
      expect(result.totalResults).toBe(0);
    });
  });
  
  describe('Timeout and Cancellation Scenarios', () => {
    it('should handle very slow HN response', async () => {
      // HN takes longer than expected
      mockClient.searchHackerNewsTransformed.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([]), 15000))
      );
      
      // Reddit responds quickly
      mockClient.searchRedditTransformed.mockResolvedValue([{
        id: 'reddit-1',
        source: 'reddit',
        title: 'Quick Reddit Response',
        url: 'https://reddit.com/1',
        content: 'Content',
        score: 100,
        metadata: {}
      }]);
      
      // Use shorter timeout for test
      const timeoutBridge = new N8nBridge({
        client: mockClient,
        transformer: mockTransformer,
        enableSessionAutoCleanup: false
      });
      createdBridges.push(timeoutBridge);
      
      const result = await timeoutBridge.researchTechnology('slow-test', mockState);
      
      // Should get Reddit results even if HN is slow
      expect(result.topResults).toHaveLength(1);
      expect(result.topResults[0].source).toBe('reddit');
    }, 20000);
  });
  
  describe('Session Edge Cases', () => {
    it('should handle session with special characters', async () => {
      const specialSessionState = {
        ...mockState,
        sessionId: 'session-!@#$%^&*()_+'
      };
      
      mockClient.searchHackerNewsTransformed.mockResolvedValue([]);
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      await bridge.researchTechnology('test', specialSessionState);
      
      const metrics = bridge.getSessionMetrics('session-!@#$%^&*()_+');
      expect(metrics).toBeDefined();
    });
    
    it('should handle very long session IDs', async () => {
      const longSessionId = 'session-' + 'a'.repeat(1000);
      const longSessionState = {
        ...mockState,
        sessionId: longSessionId
      };
      
      mockClient.searchHackerNewsTransformed.mockResolvedValue([]);
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      await bridge.researchTechnology('test', longSessionState);
      
      const metrics = bridge.getSessionMetrics(longSessionId);
      expect(metrics).toBeDefined();
    });
  });
  
  describe('Research Content Analysis Edge Cases', () => {
    it('should handle results with no meaningful content', async () => {
      const emptyContentResults = [
        {
          id: '1',
          source: 'hackernews' as const,
          title: 'Title Only',
          url: 'https://example.com',
          content: '',
          score: 100,
          metadata: {}
        },
        {
          id: '2',
          source: 'reddit' as const,
          title: 'Another Title',
          url: 'https://reddit.com',
          content: '   \n\t   ',
          score: 90,
          metadata: {}
        }
      ];
      
      mockClient.searchHackerNewsTransformed.mockResolvedValue([emptyContentResults[0]]);
      mockClient.searchRedditTransformed.mockResolvedValue([emptyContentResults[1]]);
      
      const result = await bridge.researchTechnology('empty-content', mockState);
      
      expect(result.totalResults).toBe(2);
      expect(result.insights).toContain('No research data available');
    });
    
    it('should handle extremely polarized sentiment', async () => {
      const polarizedResults = Array(50).fill(null).map((_, i) => ({
        id: `result-${i}`,
        source: 'hackernews' as const,
        title: `Title ${i}`,
        url: `https://example.com/${i}`,
        content: i < 25 
          ? 'This is absolutely terrible, worst thing ever, completely broken'
          : 'This is amazing, best thing ever, absolutely perfect',
        score: 100,
        metadata: { author: `user${i}` }
      }));
      
      mockClient.searchHackerNewsTransformed.mockResolvedValue(polarizedResults);
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      const result = await bridge.researchTechnology('polarized', mockState);
      
      expect(result.insights.some(i => i.includes('sentiment'))).toBe(true);
    });
  });
  
  describe('Circuit Breaker Advanced Scenarios', () => {
    it('should handle rapid circuit state transitions', async () => {
      const breaker = bridge['circuitBreakerManager'].getBreaker('reddit');
      
      // Rapid failures
      for (let i = 0; i < 10; i++) {
        await breaker.execute(async () => {
          throw new Error('Forced failure');
        }).catch(() => {});
      }
      
      const stats = breaker.getStats();
      expect(stats.state).toBe('OPEN');
    });
    
    it('should maintain separate circuit breakers per service', async () => {
      // Fail HackerNews multiple times
      mockClient.searchHackerNewsTransformed.mockRejectedValue(new Error('HN Down'));
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      // Trigger HN circuit breaker
      for (let i = 0; i < 5; i++) {
        await bridge.researchTechnology(`hn-fail-${i}`, mockState);
      }
      
      const stats = bridge.getCircuitBreakerStats();
      expect(stats.hackernews.state).toBe('OPEN');
      expect(stats.reddit.state).toBe('CLOSED');
      
      // Reddit should still work
      mockClient.searchRedditTransformed.mockResolvedValue([{
        id: 'reddit-works',
        source: 'reddit',
        title: 'Reddit Still Works',
        url: 'https://reddit.com',
        content: 'Content',
        score: 100,
        metadata: {}
      }]);
      
      const result = await bridge.researchTechnology('test', mockState);
      expect(result.topResults).toHaveLength(1);
      expect(result.topResults[0].source).toBe('reddit');
    });
  });
}); 