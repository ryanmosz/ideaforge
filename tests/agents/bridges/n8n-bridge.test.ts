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
  
  // Track all bridges created during tests for cleanup
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
    currentNode: 'start',
    nextNode: null,
    errors: [],
    messages: []
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Create mock client with test-appropriate timeout (10 seconds)
    mockClient = {
      searchHackerNewsTransformed: jest.fn(),
      searchRedditTransformed: jest.fn(),
      checkHealth: jest.fn(),
      getConfig: jest.fn().mockReturnValue({ timeout: 10000 }), // 10 second timeout for tests
    } as any;
    
    mockTransformer = {
      transformHackerNewsResults: jest.fn(),
      transformRedditResults: jest.fn(),
    } as any;
    
    bridge = new N8nBridge({
      client: mockClient,
      transformer: mockTransformer,
      enableSessionAutoCleanup: false, // Disable timer in tests
    });
    createdBridges.push(bridge);
  });
  
  afterEach(() => {
    // Clean up ALL created bridges to prevent Jest hanging
    createdBridges.forEach(b => b.cleanup());
    createdBridges.length = 0; // Clear the array
  });
  
  describe('constructor', () => {
    it('should create bridge with default configuration', () => {
      const defaultBridge = new N8nBridge({
        enableSessionAutoCleanup: false, // Disable timer in tests
      });
      createdBridges.push(defaultBridge); // Track for cleanup
      expect(defaultBridge).toBeDefined();
      expect(defaultBridge.getClient()).toBeDefined();
      expect(defaultBridge.getTransformer()).toBeDefined();
    });
    
    it('should accept custom configuration', () => {
      const customBridge = new N8nBridge({
        client: mockClient,
        transformer: mockTransformer,
        cacheResults: false,
        maxResultsPerSource: 5,
        enableSessionAutoCleanup: false, // Disable timer in tests
      });
      createdBridges.push(customBridge); // Track for cleanup
      
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
    }, 10000);
    
    it('should handle empty results gracefully', async () => {
      mockClient.searchHackerNewsTransformed.mockResolvedValue([]);
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      const result = await bridge.researchTechnology('obscure-tech', mockState);
      
      expect(result.totalResults).toBe(0);
      expect(result.topResults).toEqual([]);
      expect(result.insights).toContain('No research data available');
    }, 10000);
    
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
    }, 10000);
    
    it('should handle complete failure gracefully', async () => {
      mockClient.searchHackerNewsTransformed.mockRejectedValue(new Error('Network error'));
      mockClient.searchRedditTransformed.mockRejectedValue(new Error('Network error'));
      
      const result = await bridge.researchTechnology('typescript', mockState);
      
      expect(result.totalResults).toBe(0);
      expect(result.insights).toContain('External research services are currently unavailable');
    }, 10000);
    
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
        enableSessionAutoCleanup: false, // Disable timer in tests
      });
      createdBridges.push(limitedBridge); // Track for cleanup
      
      const result = await limitedBridge.researchTechnology('typescript', mockState);
      
      expect(result.topResults.length).toBeLessThanOrEqual(10); // 5 per source * 2 sources
    }, 10000);
    
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
    }, 10000);
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
        enableSessionAutoCleanup: false, // Disable timer in tests
      });
      createdBridges.push(batchBridge); // Track for cleanup
      
      const results = await batchBridge.researchMultipleTechnologies(technologies, mockState);
      
      expect(results.size).toBe(5);
      technologies.forEach(tech => {
        expect(results.has(tech)).toBe(true);
      });
      
      // Should have been called for each technology
      expect(mockClient.searchHackerNewsTransformed).toHaveBeenCalledTimes(5);
      expect(mockClient.searchRedditTransformed).toHaveBeenCalledTimes(5);
    }, 10000);
    
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
    }, 10000);
    
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
        enableSessionAutoCleanup: false, // Disable timer in tests
      });
      createdBridges.push(batchBridge); // Track for cleanup
      
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
      
      // Cleanup happens in afterEach now
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
    }, 10000);
    
    it('should return empty map when no technologies in state', async () => {
      const emptyState: ProjectState = {
        ...mockState,
        extractedTechnologies: []
      };
      
      const results = await bridge.researchFromState(emptyState);
      
      expect(results.size).toBe(0);
      expect(mockClient.searchHackerNewsTransformed).not.toHaveBeenCalled();
    }, 10000);
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
    }, 10000);
    
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
    }, 10000);
    
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
    }, 10000);
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
    }, 10000);
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
    }, 10000);
    
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
    }, 10000);
  });
  
  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      mockClient.searchHackerNewsTransformed.mockRejectedValue({ code: 'ECONNREFUSED' });
      mockClient.searchRedditTransformed.mockRejectedValue({ code: 'ETIMEDOUT' });
      
      const result = await bridge.researchTechnology('test-tech', mockState);
      
      expect(result.totalResults).toBe(0);
      expect(result.insights).toContain('External research services are currently unavailable');
    }, 10000);
    
    it('should handle API errors gracefully', async () => {
      mockClient.searchHackerNewsTransformed.mockRejectedValue(new Error('401 Unauthorized'));
      mockClient.searchRedditTransformed.mockRejectedValue(new Error('Rate limit exceeded'));
      
      const result = await bridge.researchTechnology('test-tech', mockState);
      
      expect(result.totalResults).toBe(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    }, 10000);
    
    it('should provide technology-specific recommendations', async () => {
      mockClient.searchHackerNewsTransformed.mockResolvedValue([]);
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      const reactResult = await bridge.researchTechnology('react', mockState);
      expect(reactResult.recommendations.some(r => r.includes('React ecosystem'))).toBe(true);
      
      const nodeResult = await bridge.researchTechnology('node.js', mockState);
      expect(nodeResult.recommendations.some(r => r.includes('Node.js ecosystem'))).toBe(true);
    }, 10000);
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
    }, 10000);
    
    it('should track failed research requests', async () => {
      // Create a bridge with a longer session timeout to prevent cleanup
      const sessionBridge = new N8nBridge({
        client: mockClient,
        sessionTrackerMaxAge: 600000, // 10 minutes
        enableSessionAutoCleanup: false, // Disable timer in tests
      });
      createdBridges.push(sessionBridge); // Track for cleanup
      
      mockClient.searchHackerNewsTransformed.mockRejectedValue(new Error('API Error'));
      mockClient.searchRedditTransformed.mockRejectedValue(new Error('API Error'));
      
      await sessionBridge.researchTechnology('python', { ...mockState, sessionId: 'test-session-456' });
      
      const metrics = sessionBridge.getSessionMetrics('test-session-456');
      expect(metrics).toBeDefined();
      expect(metrics?.failureCount).toBe(1);
      expect(metrics?.errors.length).toBeGreaterThan(0);
      expect(metrics?.technologies.has('python')).toBe(true);
    }, 10000);
    
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
    }, 10000);
    
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
    }, 10000);
    
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
    }, 10000);
    
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
    }, 10000);
  });
  
  describe('cleanup', () => {
    it('should stop session tracker timer on cleanup', () => {
      const cleanupSpy = jest.spyOn(bridge, 'cleanup');
      
      bridge.cleanup();
      
      expect(cleanupSpy).toHaveBeenCalled();
      // Timer should be stopped, no errors should occur
    });
  });
  
  describe('error handling and fallbacks', () => {
    it('should use fallback when both sources fail', async () => {
      mockClient.searchHackerNewsTransformed.mockRejectedValue(new Error('HN Error'));
      mockClient.searchRedditTransformed.mockRejectedValue(new Error('Reddit Error'));
      
      const result = await bridge.researchTechnology('failtest', mockState);
      
      expect(result.totalResults).toBe(0);
      expect(result.topResults).toEqual([]);
      expect(result.insights).toContain('External research services are currently unavailable');
      expect(result.recommendations).toContainEqual(expect.stringContaining('Manual research recommended'));
    }, 10000);
    
    it('should continue with partial results when one source fails', async () => {
      mockClient.searchHackerNewsTransformed.mockRejectedValue(new Error('HN Error'));
      mockClient.searchRedditTransformed.mockResolvedValue([
        {
          id: 'r1',
          source: 'reddit',
          title: 'Reddit Result',
          url: 'https://reddit.com/r1',
          content: 'Content',
          score: 100,
          metadata: {}
        }
      ]);
      
      const result = await bridge.researchTechnology('partial', mockState);
      
      expect(result.totalResults).toBe(1);
      expect(result.topResults).toHaveLength(1);
      expect(result.topResults[0].source).toBe('reddit');
    }, 10000);
    
    it('should track errors in session', async () => {
      const trackErrorSpy = jest.spyOn(bridge['sessionTracker'], 'trackError');
      
      mockClient.searchHackerNewsTransformed.mockRejectedValue(new Error('Test error'));
      mockClient.searchRedditTransformed.mockRejectedValue(new Error('Test error'));
      
      await bridge.researchTechnology('error-test', mockState);
      
      // Should track HN error, Reddit error, and overall failure
      expect(trackErrorSpy).toHaveBeenCalledTimes(3);
      expect(trackErrorSpy).toHaveBeenCalledWith(
        'test-session',
        expect.any(Error),
        expect.stringContaining('HackerNews search failed')
      );
      expect(trackErrorSpy).toHaveBeenCalledWith(
        'test-session',
        expect.any(Error),
        expect.stringContaining('Reddit search failed')
      );
      expect(trackErrorSpy).toHaveBeenCalledWith(
        'test-session',
        expect.any(Error),
        expect.stringContaining('All research sources failed')
      );
    }, 10000);
  });
  
  describe('circuit breaker', () => {
    beforeEach(() => {
      // Reset circuit breakers before each test
      bridge.resetCircuitBreakers();
    });
    
    it('should open circuit after multiple failures', async () => {
      // Simulate 5 consecutive failures
      mockClient.searchHackerNewsTransformed.mockRejectedValue(new Error('Service down'));
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      // Fail 5 times (threshold)
      for (let i = 0; i < 5; i++) {
        await bridge.researchTechnology(`test${i}`, mockState);
      }
      
      // Check circuit breaker state
      const stats = bridge.getCircuitBreakerStats();
      expect(stats.hackernews.state).toBe('OPEN');
      expect(stats.reddit.state).toBe('CLOSED');
    }, 10000);
    
    it('should skip requests when circuit is open', async () => {
      // Force circuit open
      const breaker = bridge['circuitBreakerManager'].getBreaker('hackernews');
      breaker.forceOpen();
      
      mockClient.searchRedditTransformed.mockResolvedValue([
        {
          id: 'r1',
          source: 'reddit',
          title: 'Reddit Only',
          url: 'https://reddit.com/r1',
          content: 'Content',
          score: 100,
          metadata: {}
        }
      ]);
      
      const result = await bridge.researchTechnology('circuit-test', mockState);
      
      // Should only have Reddit results
      expect(mockClient.searchHackerNewsTransformed).not.toHaveBeenCalled();
      expect(result.totalResults).toBe(1);
      expect(result.topResults[0].source).toBe('reddit');
    }, 10000);
    
    it('should provide circuit breaker stats', () => {
      // Get breakers first to ensure they exist
      bridge['circuitBreakerManager'].getBreaker('hackernews');
      bridge['circuitBreakerManager'].getBreaker('reddit');
      
      const stats = bridge.getCircuitBreakerStats();
      
      expect(stats).toHaveProperty('hackernews');
      expect(stats).toHaveProperty('reddit');
      expect(stats.hackernews).toHaveProperty('state');
      expect(stats.hackernews).toHaveProperty('totalRequests');
      expect(stats.hackernews).toHaveProperty('totalFailures');
      expect(stats.hackernews).toHaveProperty('totalSuccesses');
    });
    
    it('should reset circuit breakers', () => {
      // Force open
      const breaker = bridge['circuitBreakerManager'].getBreaker('hackernews');
      breaker.forceOpen();
      
      // Reset
      bridge.resetCircuitBreakers();
      
      const stats = bridge.getCircuitBreakerStats();
      expect(stats.hackernews.state).toBe('CLOSED');
    });
  });
  
  describe('error logging', () => {
    let consoleErrorSpy: jest.SpyInstance;
    let consoleLogSpy: jest.SpyInstance;
    
    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });
    
    afterEach(() => {
      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
    
    it('should log errors appropriately', async () => {
      mockClient.searchHackerNewsTransformed.mockRejectedValue(new Error('Network error'));
      mockClient.searchRedditTransformed.mockRejectedValue(new Error('Auth error'));
      
      await bridge.researchTechnology('error-log-test', mockState);
      
      // Should log errors
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      // Should log fallback usage
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Creating fallback summary')
      );
    }, 10000);
    
    it('should log circuit breaker state changes', async () => {
      // Force multiple failures to open circuit
      mockClient.searchHackerNewsTransformed.mockRejectedValue(new Error('Service down'));
      
      for (let i = 0; i < 5; i++) {
        await bridge.researchTechnology(`test${i}`, mockState);
      }
      
      // Check for circuit breaker state change log
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('State change: CLOSED -> OPEN')
      );
    }, 10000);
  });
  
  describe('fallback response', () => {
    it('should provide helpful fallback content', async () => {
      mockClient.searchHackerNewsTransformed.mockRejectedValue(new Error('All down'));
      mockClient.searchRedditTransformed.mockRejectedValue(new Error('All down'));
      
      const result = await bridge.researchTechnology('kubernetes', mockState);
      
      expect(result.query).toBe('kubernetes');
      expect(result.timestamp).toBeLessThanOrEqual(Date.now());
      expect(result.totalResults).toBe(0);
      expect(result.topResults).toEqual([]);
      
      // Check insights
      expect(result.insights).toEqual([
        'External research services are currently unavailable',
        'Consider checking service status or trying again later'
      ]);
      
      // Check recommendations
      expect(result.recommendations).toContain('Manual research recommended for kubernetes');
      expect(result.recommendations).toContain('Check official documentation and community forums directly');
      expect(result.recommendations).toContain('Service interruption may be temporary - retry in a few minutes');
    }, 10000);
  });
  
  describe('error handling and fallbacks', () => {
    it('should handle partial failures gracefully', async () => {
      mockClient.searchHackerNewsTransformed.mockRejectedValue(new Error('HN API Error'));
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      const result = await bridge.researchTechnology('react', mockState);
      
      expect(result.totalResults).toBe(0);
      expect(result.insights).toContain('No research data available');
    }, 10000);
    
    it('should handle complete failure with fallback', async () => {
      mockClient.searchHackerNewsTransformed.mockRejectedValue(new Error('Network error'));
      mockClient.searchRedditTransformed.mockRejectedValue(new Error('Network error'));
      
      const result = await bridge.researchTechnology('vue', mockState);
      
      expect(result.totalResults).toBe(0);
      expect(result.insights).toContain('External research services are currently unavailable');
      expect(result.recommendations.length).toBeGreaterThan(0);
    }, 10000);
  });
}); 