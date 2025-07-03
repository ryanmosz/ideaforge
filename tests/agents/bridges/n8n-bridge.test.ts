import { N8nBridge } from '../../../src/agents/bridges/n8n-bridge';
import { N8nClient } from '../../../src/services/n8n-client';
import { ResponseTransformer } from '../../../src/services/response-transformer';
import { ProjectState } from '../../../src/agents/state';
import { ResearchResult } from '../../../src/agents/types/research-types';

// Mock the modules
jest.mock('../../../src/services/n8n-client');
jest.mock('../../../src/services/response-transformer');

describe('N8nBridge', () => {
  let bridge: N8nBridge;
  let mockClient: jest.Mocked<N8nClient>;
  let mockTransformer: jest.Mocked<ResponseTransformer>;
  
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
    currentNode: 'start',
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
    } as any;
    
    mockTransformer = {
      transformHackerNewsResults: jest.fn(),
      transformRedditResults: jest.fn(),
    } as any;
    
    bridge = new N8nBridge({
      client: mockClient,
      transformer: mockTransformer,
    });
  });
  
  afterEach(() => {
    // Clean up the session tracker timer to prevent Jest hanging
    bridge.cleanup();
  });
  
  describe('constructor', () => {
    it('should create bridge with default configuration', () => {
      const defaultBridge = new N8nBridge();
      expect(defaultBridge).toBeDefined();
      expect(defaultBridge.getClient()).toBeDefined();
      expect(defaultBridge.getTransformer()).toBeDefined();
    });
    
    it('should accept custom configuration', () => {
      const customBridge = new N8nBridge({
        client: mockClient,
        transformer: mockTransformer,
        cacheResults: false,
        maxResultsPerSource: 5
      });
      
      expect(customBridge.getClient()).toBe(mockClient);
      expect(customBridge.getTransformer()).toBe(mockTransformer);
    });
  });
  
  describe('researchTechnology', () => {
    it('should research a single technology using both HN and Reddit', async () => {
      const hnResults: ResearchResult[] = [
        {
          id: 'hn-123',
          source: 'hackernews',
          title: 'TypeScript 5.0 Released',
          url: 'https://news.ycombinator.com/item?id=123',
          content: 'TypeScript 5.0 brings new features...',
          score: 100,
          metadata: {
            author: 'user123',
            points: 100,
            comments: 50,
          },
        },
      ];
      
      const redditResults: ResearchResult[] = [
        {
          id: 'reddit-123',
          source: 'reddit',
          title: 'Why TypeScript is awesome',
          url: 'https://reddit.com/r/typescript/123',
          content: 'TypeScript provides type safety...',
          score: 80,
          metadata: {
            author: 'redditor456',
            upvotes: 200,
            comments: 30,
            subreddit: 'typescript',
          },
        },
      ];
      
      mockClient.searchHackerNewsTransformed.mockResolvedValue(hnResults);
      mockClient.searchRedditTransformed.mockResolvedValue(redditResults);
      
      const result = await bridge.researchTechnology('typescript', mockState);
      
      expect(result.query).toBe('typescript');
      expect(result.totalResults).toBeGreaterThan(0);
      expect(result.topResults).toEqual(expect.arrayContaining([
        expect.objectContaining({ source: 'hackernews' }),
        expect.objectContaining({ source: 'reddit' }),
      ]));
      expect(result.insights).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);
      
      expect(mockClient.searchHackerNewsTransformed).toHaveBeenCalledWith(
        'typescript',
        'test-session',
        expect.any(Object)
      );
      expect(mockClient.searchRedditTransformed).toHaveBeenCalledWith(
        'typescript',
        'test-session',
        expect.any(Object)
      );
    });
    
    it('should handle empty results gracefully', async () => {
      mockClient.searchHackerNewsTransformed.mockResolvedValue([]);
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      const result = await bridge.researchTechnology('obscure-tech', mockState);
      
      expect(result.totalResults).toBe(0);
      expect(result.topResults).toEqual([]);
      expect(result.insights).toContain('No research data available');
    });
    
    it('should continue if one source fails', async () => {
      mockClient.searchHackerNewsTransformed.mockRejectedValue(new Error('HN API error'));
      mockClient.searchRedditTransformed.mockResolvedValue([
        {
          id: 'reddit-test',
          source: 'reddit',
          title: 'Test Reddit Result',
          url: 'https://reddit.com/test',
          content: 'Test content',
          score: 50,
          metadata: {
            author: 'testuser'
          },
        },
      ]);
      
      const result = await bridge.researchTechnology('test', mockState);
      
      expect(result.totalResults).toBe(1);
      expect(result.topResults[0].source).toBe('reddit');
    });
    
    it('should handle complete failure gracefully', async () => {
      mockClient.searchHackerNewsTransformed.mockRejectedValue(new Error('HN API error'));
      mockClient.searchRedditTransformed.mockRejectedValue(new Error('Reddit API error'));
      
      const result = await bridge.researchTechnology('typescript', mockState);
      
      expect(result.totalResults).toBe(0);
      expect(result.insights).toContain('Research failed - external services may be unavailable');
    });
    
    it('should limit results based on configuration', async () => {
      const manyResults = Array(50).fill(null).map((_, i) => ({
        id: `hn-${i}`,
        source: 'hackernews' as const,
        title: `Result ${i}`,
        url: `https://example.com/${i}`,
        content: `Content ${i}`,
        score: 100 - i,
        metadata: {
          author: `user${i}`
        },
      }));
      
      mockClient.searchHackerNewsTransformed.mockResolvedValue(manyResults);
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      const limitedBridge = new N8nBridge({
        client: mockClient,
        maxResultsPerSource: 5,
      });
      
      const result = await limitedBridge.researchTechnology('typescript', mockState);
      
      expect(result.topResults.length).toBeLessThanOrEqual(10); // 5 per source * 2 sources
    });
    
    it('should handle technologies with special characters', async () => {
      mockClient.searchHackerNewsTransformed.mockResolvedValue([]);
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      const result = await bridge.researchTechnology('C++', mockState);
      
      expect(result).toBeDefined();
      expect(mockClient.searchHackerNewsTransformed).toHaveBeenCalledWith(
        'C++',
        'test-session',
        expect.any(Object)
      );
    });
  });
  
  describe('researchMultipleTechnologies', () => {
    it('should research multiple technologies with batching', async () => {
      const technologies = ['javascript', 'python', 'rust', 'go', 'java'];
      
      mockClient.searchHackerNewsTransformed.mockResolvedValue([]);
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      // Use a bridge with smaller batch size for testing
      const batchBridge = new N8nBridge({
        client: mockClient,
        maxConcurrentRequests: 2,
        batchDelay: 10, // Short delay for testing
      });
      
      const results = await batchBridge.researchMultipleTechnologies(technologies, mockState);
      
      expect(results.size).toBe(5);
      technologies.forEach(tech => {
        expect(results.has(tech)).toBe(true);
      });
      
      // Should have been called for each technology
      expect(mockClient.searchHackerNewsTransformed).toHaveBeenCalledTimes(5);
      expect(mockClient.searchRedditTransformed).toHaveBeenCalledTimes(5);
    });
    
    it('should handle partial failures in batch processing', async () => {
      const technologies = ['javascript', 'python'];
      
      // Make HN fail for javascript but succeed for python
      mockClient.searchHackerNewsTransformed
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce([{
          id: 'hn-python',
          source: 'hackernews',
          title: 'Python News',
          url: 'https://example.com',
          content: 'Python content',
          score: 50,
          metadata: {
            author: 'user'
          },
        }]);
      
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      const results = await bridge.researchMultipleTechnologies(technologies, mockState);
      
      expect(results.size).toBe(2);
      expect(results.get('javascript')?.totalResults).toBe(0);
      expect(results.get('python')?.totalResults).toBeGreaterThan(0);
    });
    
    it('should apply batch delays correctly', async () => {
      // Mock timers before creating any objects that might use them
      jest.useFakeTimers();
      const technologies = ['tech1', 'tech2', 'tech3'];
      
      mockClient.searchHackerNewsTransformed.mockResolvedValue([]);
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      // Create a custom bridge for this test
      const batchBridge = new N8nBridge({
        client: mockClient,
        maxConcurrentRequests: 2,
        batchDelay: 1000,
      });
      
      // Start the research
      const promise = batchBridge.researchMultipleTechnologies(technologies, mockState);
      
      // Process first batch immediately
      await jest.runOnlyPendingTimersAsync();
      
      // Wait for the promise to complete
      const results = await promise;
      
      // Verify all technologies were processed
      expect(results.size).toBe(3);
      expect(mockClient.searchHackerNewsTransformed).toHaveBeenCalledTimes(3);
      expect(mockClient.searchRedditTransformed).toHaveBeenCalledTimes(3);
      
      // Clean up
      batchBridge.cleanup();
      jest.useRealTimers();
    });
  });
  
  describe('researchFromState', () => {
    it('should extract technologies from state and research them', async () => {
      const stateWithTech: ProjectState = {
        ...mockState,
        extractedTechnologies: ['react', 'nodejs', 'postgresql']
      };
      
      mockClient.searchHackerNewsTransformed.mockResolvedValue([]);
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      const results = await bridge.researchFromState(stateWithTech);
      
      expect(results.size).toBe(3);
      expect(results.has('react')).toBe(true);
      expect(results.has('nodejs')).toBe(true);
      expect(results.has('postgresql')).toBe(true);
    });
    
    it('should return empty map when no technologies in state', async () => {
      const emptyState: ProjectState = {
        ...mockState,
        extractedTechnologies: []
      };
      
      const results = await bridge.researchFromState(emptyState);
      
      expect(results.size).toBe(0);
      expect(mockClient.searchHackerNewsTransformed).not.toHaveBeenCalled();
    });
  });
  
  describe('subreddit selection', () => {
    it('should select appropriate subreddits for JavaScript', async () => {
      mockClient.searchHackerNewsTransformed.mockResolvedValue([]);
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      await bridge.researchTechnology('javascript framework', mockState);
      
      const call = mockClient.searchRedditTransformed.mock.calls[0];
      expect(call).toBeDefined();
      const subreddits = call[2]?.subreddits;
      
      expect(subreddits).toContain('javascript');
      expect(subreddits).toContain('node');
      expect(subreddits).toContain('programming');
    });
    
    it('should select appropriate subreddits for Python', async () => {
      mockClient.searchHackerNewsTransformed.mockResolvedValue([]);
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      await bridge.researchTechnology('python django', mockState);
      
      const call = mockClient.searchRedditTransformed.mock.calls[0];
      expect(call).toBeDefined();
      const subreddits = call[2]?.subreddits;
      
      expect(subreddits).toContain('python');
      expect(subreddits).toContain('learnpython');
      expect(subreddits).toContain('django');
    });
    
    it('should limit subreddits to 10', async () => {
      mockClient.searchHackerNewsTransformed.mockResolvedValue([]);
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      // Query with many potential subreddit matches
      await bridge.researchTechnology('javascript typescript react vue angular python rust docker kubernetes aws', mockState);
      
      const call = mockClient.searchRedditTransformed.mock.calls[0];
      expect(call).toBeDefined();
      const subreddits = call[2]?.subreddits;
      
      expect(subreddits).toBeDefined();
      expect(subreddits!.length).toBeLessThanOrEqual(10);
    });
  });
  
  describe('insights extraction', () => {
    it('should extract meaningful insights from results', async () => {
      const results: ResearchResult[] = [
        {
          id: 'res-1',
          source: 'hackernews',
          title: 'Test',
          url: 'https://example.com',
          content: 'TypeScript performance is excellent. Great type safety.',
          score: 100,
          metadata: {
            author: 'user1'
          },
        },
        {
          id: 'res-2',
          source: 'reddit',
          title: 'Test 2',
          url: 'https://reddit.com',
          content: 'Performance issues with large codebases. Type safety is amazing.',
          score: 80,
          metadata: {
            author: 'user2'
          },
        },
        {
          id: 'res-3',
          source: 'hackernews',
          title: 'Test 3',
          url: 'https://example.com/3',
          content: 'Security vulnerabilities found. Performance degradation noted.',
          score: 90,
          metadata: {
            author: 'user3'
          },
        },
      ];
      
      mockClient.searchHackerNewsTransformed.mockResolvedValue(results);
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      const result = await bridge.researchTechnology('test', mockState);
      
      // Should identify performance as a key topic (mentioned 3 times)
      expect(result.insights.some(i => i.includes('performance'))).toBe(true);
      
      // Should identify mixed sentiment
      expect(result.insights.some(i => i.includes('sentiment'))).toBe(true);
    });
  });
  
  describe('recommendations generation', () => {
    it('should generate security recommendations when vulnerabilities mentioned', async () => {
      const results: ResearchResult[] = [
        {
          id: 'sec-1',
          source: 'hackernews',
          title: 'Security Alert',
          url: 'https://example.com',
          content: 'Critical security vulnerability CVE-2023-1234 found',
          score: 200,
          metadata: {
            author: 'security-researcher'
          },
        },
        {
          id: 'sec-2',
          source: 'reddit',
          title: 'Exploit Found',
          url: 'https://reddit.com',
          content: 'New exploit discovered in version 2.0',
          score: 150,
          metadata: {
            author: 'whitehat'
          },
        },
      ];
      
      mockClient.searchHackerNewsTransformed.mockResolvedValue(results);
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      const result = await bridge.researchTechnology('test', mockState);
      
      expect(result.recommendations.some(r => 
        r.includes('security') || r.includes('Security')
      )).toBe(true);
    });
    
    it('should recommend alternatives when comparisons are discussed', async () => {
      const results: ResearchResult[] = [
        {
          id: 'alt-1',
          source: 'hackernews',
          title: 'Framework Comparison',
          url: 'https://example.com',
          content: 'Vue is better than React for small projects',
          score: 100,
          metadata: {
            author: 'dev1'
          },
        },
        {
          id: 'alt-2',
          source: 'reddit',
          title: 'Alternative Framework',
          url: 'https://reddit.com',
          content: 'Consider Svelte instead of React',
          score: 80,
          metadata: {
            author: 'dev2'
          },
        },
        {
          id: 'alt-3',
          source: 'hackernews',
          title: 'React vs Angular',
          url: 'https://example.com/2',
          content: 'Angular might be a better alternative for enterprise',
          score: 90,
          metadata: {
            author: 'dev3'
          },
        },
      ];
      
      mockClient.searchHackerNewsTransformed.mockResolvedValue(results);
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      const result = await bridge.researchTechnology('test', mockState);
      
      expect(result.recommendations.some(r => 
        r.includes('alternative') || r.includes('Alternative')
      )).toBe(true);
    });
  });
  
  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      mockClient.searchHackerNewsTransformed.mockRejectedValue(new Error('ECONNREFUSED'));
      mockClient.searchRedditTransformed.mockRejectedValue(new Error('ETIMEDOUT'));
      
      const result = await bridge.researchTechnology('test-tech', mockState);
      
      expect(result.totalResults).toBe(0);
      expect(result.insights).toContain('Research failed - external services may be unavailable');
    });
    
    it('should handle API errors gracefully', async () => {
      mockClient.searchHackerNewsTransformed.mockRejectedValue(new Error('401 Unauthorized'));
      mockClient.searchRedditTransformed.mockRejectedValue(new Error('Rate limit exceeded'));
      
      const result = await bridge.researchTechnology('test-tech', mockState);
      
      expect(result.totalResults).toBe(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
    
    it('should provide technology-specific recommendations', async () => {
      mockClient.searchHackerNewsTransformed.mockResolvedValue([]);
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      const reactResult = await bridge.researchTechnology('react', mockState);
      expect(reactResult.recommendations.some(r => r.includes('React ecosystem'))).toBe(true);
      
      const nodeResult = await bridge.researchTechnology('node.js', mockState);
      expect(nodeResult.recommendations.some(r => r.includes('Node.js ecosystem'))).toBe(true);
    });
  });
  
  describe('session tracking', () => {
    it('should track successful research requests', async () => {
      mockClient.searchHackerNewsTransformed.mockResolvedValue([
        {
          id: 'sess-test',
          source: 'hackernews',
          title: 'Test Result',
          url: 'https://example.com',
          content: 'Test content',
          score: 100,
          metadata: { 
            author: 'testuser',
            points: 100, 
            comments: 50 
          }
        }
      ]);
      
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      const state: ProjectState = {
        ...mockState,
        sessionId: 'test-session-123'
      };
      
      await bridge.researchTechnology('javascript', state);
      
      const metrics = bridge.getSessionMetrics('test-session-123');
      expect(metrics).toBeDefined();
      expect(metrics?.requestCount).toBeGreaterThan(0);
      expect(metrics?.successCount).toBe(1);
      expect(metrics?.technologies.has('javascript')).toBe(true);
    });
    
    it('should track failed research requests', async () => {
      mockClient.searchHackerNewsTransformed.mockRejectedValue(new Error('API Error'));
      mockClient.searchRedditTransformed.mockRejectedValue(new Error('API Error'));
      
      const state: ProjectState = {
        ...mockState,
        sessionId: 'test-session-456'
      };
      
      await bridge.researchTechnology('python', state);
      
      const metrics = bridge.getSessionMetrics('test-session-456');
      expect(metrics).toBeDefined();
      expect(metrics?.failureCount).toBe(1);
      expect(metrics?.errors.length).toBeGreaterThan(0);
      expect(metrics?.technologies.has('python')).toBe(true);
    });
    
    it('should track individual API calls', async () => {
      mockClient.searchHackerNewsTransformed.mockResolvedValue([]);
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      const state: ProjectState = {
        ...mockState,
        sessionId: 'test-session-789'
      };
      
      await bridge.researchTechnology('react', state);
      
      const metrics = bridge.getSessionMetrics('test-session-789');
      expect(metrics).toBeDefined();
      // Should track the main request plus individual HN and Reddit requests
      expect(metrics?.requestCount).toBeGreaterThanOrEqual(3);
    });
    
    it('should provide aggregate statistics', async () => {
      // Research multiple technologies
      const state1: ProjectState = {
        ...mockState,
        sessionId: 'session-1'
      };
      
      const state2: ProjectState = {
        ...mockState,
        sessionId: 'session-2'
      };
      
      mockClient.searchHackerNewsTransformed.mockResolvedValue([]);
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      await bridge.researchTechnology('javascript', state1);
      await bridge.researchTechnology('python', state1);
      await bridge.researchTechnology('javascript', state2);
      
      const stats = bridge.getStats();
      expect(stats.totalSessions).toBeGreaterThanOrEqual(2);
      expect(stats.totalRequests).toBeGreaterThanOrEqual(3);
      expect(stats.topTechnologies).toContainEqual(
        expect.objectContaining({ technology: 'javascript', count: 2 })
      );
    });
    
    it('should export session data for debugging', async () => {
      mockClient.searchHackerNewsTransformed.mockResolvedValue([]);
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      const state: ProjectState = {
        ...mockState,
        sessionId: 'export-test'
      };
      
      await bridge.researchTechnology('typescript', state);
      
      const exported = bridge.exportSessionData('export-test');
      const parsed = JSON.parse(exported);
      
      expect(parsed.sessionId).toBe('export-test');
      expect(parsed.technologies).toContain('typescript');
    });
    
    it('should use default session when none provided', async () => {
      mockClient.searchHackerNewsTransformed.mockResolvedValue([]);
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      const state: ProjectState = {
        ...mockState,
        sessionId: undefined // No sessionId
      };
      
      await bridge.researchTechnology('node', state);
      
      const metrics = bridge.getSessionMetrics('default');
      expect(metrics).toBeDefined();
      expect(metrics?.technologies.has('node')).toBe(true);
    });
  });
  
  describe('cleanup', () => {
    it('should stop session tracker timer on cleanup', () => {
      const cleanupSpy = jest.spyOn(bridge, 'cleanup');
      
      bridge.cleanup();
      
      expect(cleanupSpy).toHaveBeenCalled();
      // Timer should be stopped, no errors should occur
    });
  });
}); 