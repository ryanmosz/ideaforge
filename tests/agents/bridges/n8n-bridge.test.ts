import { N8nBridge } from '../../../src/agents/bridges/n8n-bridge';
import { N8nClient } from '../../../src/services/n8n-client';
import { ResponseTransformer } from '../../../src/services/response-transformer';
import { ProjectState } from '../../../src/agents/state';
import { ResearchResult } from '../../../src/agents/types/research-types';

// Mock the dependencies
jest.mock('../../../src/services/n8n-client');
jest.mock('../../../src/services/response-transformer');

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('N8nBridge', () => {
  let bridge: N8nBridge;
  let mockClient: jest.Mocked<N8nClient>;
  let mockTransformer: jest.Mocked<ResponseTransformer>;
  
  beforeEach(() => {
    // Mock console
    console.log = jest.fn();
    console.error = jest.fn();
    
    // Create mock instances
    mockClient = new N8nClient() as jest.Mocked<N8nClient>;
    mockTransformer = new ResponseTransformer() as jest.Mocked<ResponseTransformer>;
    
    // Setup default mock behaviors
    mockClient.searchHackerNewsTransformed = jest.fn().mockResolvedValue([]);
    mockClient.searchRedditTransformed = jest.fn().mockResolvedValue([]);
    
    bridge = new N8nBridge({
      client: mockClient,
      transformer: mockTransformer
    });
  });
  
  afterEach(() => {
    jest.clearAllMocks();
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
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
    const mockHNResults: ResearchResult[] = [
      {
        id: 'hn1',
        source: 'hackernews',
        title: 'TypeScript Best Practices',
        url: 'https://example.com/ts-best',
        content: 'Great article about TypeScript performance optimization techniques',
        score: 150,
        metadata: { author: 'user1' }
      },
      {
        id: 'hn2',
        source: 'hackernews',
        title: 'Why TypeScript is awesome',
        url: 'https://example.com/ts-awesome',
        content: 'TypeScript provides excellent type safety and performance benefits',
        score: 120,
        metadata: { author: 'user2' }
      }
    ];
    
    const mockRedditResults: ResearchResult[] = [
      {
        id: 'reddit1',
        source: 'reddit',
        title: 'Learning TypeScript',
        url: 'https://reddit.com/r/typescript/1',
        content: 'TypeScript has great community support and helps with performance',
        score: 100,
        metadata: { subreddit: 'typescript' }
      }
    ];
    
    beforeEach(() => {
      mockClient.searchHackerNewsTransformed.mockResolvedValue(mockHNResults);
      mockClient.searchRedditTransformed.mockResolvedValue(mockRedditResults);
    });
    
    it('should research technology from both sources', async () => {
      const result = await bridge.researchTechnology('typescript');
      
      expect(mockClient.searchHackerNewsTransformed).toHaveBeenCalledWith(
        'typescript',
        'default',
        {
          limit: 30,
          sortBy: 'relevance',
          dateRange: 'last_year'
        }
      );
      
      expect(mockClient.searchRedditTransformed).toHaveBeenCalledWith(
        'typescript',
        'default',
        {
          limit: 30,
          sortBy: 'relevance',
          timeframe: 'year',
          subreddits: expect.arrayContaining(['typescript'])
        }
      );
      
      expect(result.query).toBe('typescript');
      expect(result.totalResults).toBe(3);
      expect(result.topResults).toHaveLength(3);
      expect(result.topResults[0].score).toBe(150); // Sorted by score
    });
    
    it('should limit results per source', async () => {
      // Create many results
      const manyHNResults = Array(15).fill(null).map((_, i) => ({
        id: `hn${i}`,
        source: 'hackernews' as const,
        title: `Result ${i}`,
        url: `https://example.com/${i}`,
        content: `Content ${i}`,
        score: 100 - i,
        metadata: {}
      }));
      
      mockClient.searchHackerNewsTransformed.mockResolvedValue(manyHNResults);
      
      const result = await bridge.researchTechnology('test');
      
      // Should limit to maxResultsPerSource (10 by default)
      expect(result.topResults.filter(r => r.source === 'hackernews')).toHaveLength(10);
    });
    
    it('should handle search failures gracefully', async () => {
      mockClient.searchHackerNewsTransformed.mockRejectedValue(new Error('HN API error'));
      mockClient.searchRedditTransformed.mockRejectedValue(new Error('Reddit API error'));
      
      const result = await bridge.researchTechnology('typescript');
      
      expect(console.error).toHaveBeenCalledWith(
        '[N8n Bridge] HN search error:',
        expect.any(Error)
      );
      expect(console.error).toHaveBeenCalledWith(
        '[N8n Bridge] Reddit search error:',
        expect.any(Error)
      );
      
      expect(result.totalResults).toBe(0);
      expect(result.insights).toContain('No research data available');
    });
    
    it('should extract insights from results', async () => {
      const result = await bridge.researchTechnology('typescript');
      
      expect(result.insights).toEqual(expect.arrayContaining([
        expect.stringMatching(/Common themes:/),
        expect.stringMatching(/Community sentiment/)
      ]));
    });
    
    it('should generate recommendations', async () => {
      // Verify we get common recommendations from default results
      const result = await bridge.researchTechnology('typescript');
      
      // Should have at least one recommendation
      expect(result.recommendations.length).toBeGreaterThan(0);
      
      // Test specific learning recommendation separately with dedicated learning content
      const learningResults: ResearchResult[] = [
        {
          id: 'hn1',
          source: 'hackernews',
          title: 'TypeScript Tutorial',
          url: 'https://example.com/tutorial',
          content: 'Great tutorial for learning TypeScript beginners guide',
          score: 150,
          metadata: {}
        },
        {
          id: 'hn2',
          source: 'hackernews',
          title: 'TypeScript Course',
          url: 'https://example.com/course',
          content: 'Complete course documentation for learning TypeScript',
          score: 120,
          metadata: {}
        }
      ];
      
      mockClient.searchHackerNewsTransformed.mockResolvedValue(learningResults);
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      const learningResult = await bridge.researchTechnology('typescript');
      
      expect(learningResult.recommendations).toEqual(expect.arrayContaining([
        expect.stringMatching(/learning resources/)
      ]));
    });
  });
  
  describe('researchMultipleTechnologies', () => {
    it('should research multiple technologies in batches', async () => {
      const technologies = ['react', 'vue', 'angular', 'svelte'];
      
      mockClient.searchHackerNewsTransformed.mockResolvedValue([]);
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      const results = await bridge.researchMultipleTechnologies(technologies, 'session-123', 2);
      
      expect(results.size).toBe(4);
      technologies.forEach(tech => {
        expect(results.has(tech)).toBe(true);
      });
      
      // Should be called twice for each tech (HN and Reddit)
      expect(mockClient.searchHackerNewsTransformed).toHaveBeenCalledTimes(4);
      expect(mockClient.searchRedditTransformed).toHaveBeenCalledTimes(4);
    });
    
    it('should handle individual technology failures', async () => {
      const technologies = ['react', 'vue'];
      
      // Make first tech succeed, second fail
      mockClient.searchHackerNewsTransformed
        .mockResolvedValueOnce([{ 
          id: '1',
          source: 'hackernews' as const,
          title: 'React',
          url: 'https://example.com',
          content: 'React content',
          score: 100,
          metadata: {}
        }])
        .mockRejectedValueOnce(new Error('API error'));
      
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      const results = await bridge.researchMultipleTechnologies(technologies);
      
      expect(results.size).toBe(2);
      expect(results.get('react')?.totalResults).toBeGreaterThan(0);
      expect(results.get('vue')?.totalResults).toBe(0);
    });
    
    it('should add delay between batches', async () => {
      const technologies = ['tech1', 'tech2', 'tech3'];
      const startTime = Date.now();
      
      mockClient.searchHackerNewsTransformed.mockResolvedValue([]);
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      await bridge.researchMultipleTechnologies(technologies, 'session-123', 2);
      
      const endTime = Date.now();
      // Should have at least 1 second delay between batches
      expect(endTime - startTime).toBeGreaterThanOrEqual(1000);
    });
  });
  
  describe('researchFromState', () => {
    it('should research technologies from ProjectState', async () => {
      const mockState: Partial<ProjectState> = {
        filePath: '/test/project.org',
        extractedTechnologies: ['react', 'typescript'],
        researchTopics: ['webpack', 'testing']
      };
      
      mockClient.searchHackerNewsTransformed.mockResolvedValue([]);
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      const results = await bridge.researchFromState(mockState as ProjectState);
      
      expect(results.size).toBe(4);
      expect(results.has('react')).toBe(true);
      expect(results.has('typescript')).toBe(true);
      expect(results.has('webpack')).toBe(true);
      expect(results.has('testing')).toBe(true);
    });
    
    it('should handle empty technology lists', async () => {
      const mockState: Partial<ProjectState> = {
        filePath: '/test/project.org',
        extractedTechnologies: [],
        researchTopics: []
      };
      
      const results = await bridge.researchFromState(mockState as ProjectState);
      
      expect(results.size).toBe(0);
      expect(console.log).toHaveBeenCalledWith('[N8n Bridge] No technologies to research');
    });
    
    it('should deduplicate technologies', async () => {
      const mockState: Partial<ProjectState> = {
        filePath: '/test/project.org',
        extractedTechnologies: ['react', 'typescript', 'react'],
        researchTopics: ['typescript', 'jest']
      };
      
      mockClient.searchHackerNewsTransformed.mockResolvedValue([]);
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      const results = await bridge.researchFromState(mockState as ProjectState);
      
      expect(results.size).toBe(3); // react, typescript, jest (no duplicates)
    });
  });
  
  describe('getTechSubreddits', () => {
    it('should return appropriate subreddits for JavaScript', async () => {
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      await bridge.researchTechnology('javascript framework');
      
      expect(mockClient.searchRedditTransformed).toHaveBeenCalledWith(
        'javascript framework',
        'default',
        expect.objectContaining({
          subreddits: expect.arrayContaining(['javascript', 'node'])
        })
      );
    });
    
    it('should return appropriate subreddits for Python', async () => {
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      await bridge.researchTechnology('python django');
      
      expect(mockClient.searchRedditTransformed).toHaveBeenCalledWith(
        'python django',
        'default',
        expect.objectContaining({
          subreddits: expect.arrayContaining(['python', 'django'])
        })
      );
    });
    
    it('should limit subreddits to 10', async () => {
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      // Query that would match many subreddits
      await bridge.researchTechnology('javascript typescript react vue angular python rust docker kubernetes aws');
      
      const call = mockClient.searchRedditTransformed.mock.calls[0];
      expect(call[2]?.subreddits).toHaveLength(10);
    });
  });
  
  describe('insights extraction', () => {
    it('should identify positive sentiment', async () => {
      const positiveResults: ResearchResult[] = [
        {
          id: '1',
          source: 'hackernews',
          title: 'Title',
          url: 'https://example.com',
          content: 'This is excellent and amazing',
          score: 100,
          metadata: {}
        },
        {
          id: '2',
          source: 'reddit',
          title: 'Title',
          url: 'https://example.com',
          content: 'I love this, it\'s fantastic',
          score: 90,
          metadata: {}
        }
      ];
      
      mockClient.searchHackerNewsTransformed.mockResolvedValue(positiveResults);
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      const result = await bridge.researchTechnology('test');
      
      expect(result.insights).toContain('Community sentiment is generally positive');
    });
    
    it('should identify negative sentiment', async () => {
      const negativeResults: ResearchResult[] = [
        {
          id: '1',
          source: 'hackernews',
          title: 'Title',
          url: 'https://example.com',
          content: 'This is terrible and has many problems',
          score: 100,
          metadata: {}
        },
        {
          id: '2',
          source: 'reddit',
          title: 'Title',
          url: 'https://example.com',
          content: 'I hate this, it\'s awful and broken',
          score: 90,
          metadata: {}
        }
      ];
      
      mockClient.searchHackerNewsTransformed.mockResolvedValue(negativeResults);
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      const result = await bridge.researchTechnology('test');
      
      expect(result.insights).toContain('Community has raised significant concerns');
    });
    
    it('should identify discussion topics', async () => {
      const topicResults: ResearchResult[] = Array(5).fill(null).map((_, i) => ({
        id: `${i}`,
        source: 'hackernews' as const,
        title: 'Title',
        url: 'https://example.com',
        content: 'Performance optimization is critical',
        score: 100 - i,
        metadata: {}
      }));
      
      mockClient.searchHackerNewsTransformed.mockResolvedValue(topicResults);
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      const result = await bridge.researchTechnology('test');
      
      expect(result.insights).toEqual(expect.arrayContaining([
        expect.stringMatching(/Key discussion topics:.*performance/)
      ]));
    });
  });
  
  describe('recommendations generation', () => {
    it('should recommend security review when concerns exist', async () => {
      const securityResults: ResearchResult[] = [
        {
          id: '1',
          source: 'hackernews',
          title: 'Security vulnerability found',
          url: 'https://example.com',
          content: 'Critical security vulnerability discovered',
          score: 100,
          metadata: {}
        },
        {
          id: '2',
          source: 'reddit',
          title: 'CVE announced',
          url: 'https://example.com',
          content: 'New CVE affects this technology',
          score: 90,
          metadata: {}
        }
      ];
      
      mockClient.searchHackerNewsTransformed.mockResolvedValue(securityResults);
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      const result = await bridge.researchTechnology('test-tech');
      
      expect(result.recommendations).toContain('Review security considerations and best practices for test-tech');
    });
    
    it('should recommend alternatives research when mentioned', async () => {
      const alternativeResults: ResearchResult[] = Array(3).fill(null).map((_, i) => ({
        id: `${i}`,
        source: 'hackernews' as const,
        title: 'Title',
        url: 'https://example.com',
        content: 'You should use X instead of this',
        score: 100 - i,
        metadata: {}
      }));
      
      mockClient.searchHackerNewsTransformed.mockResolvedValue(alternativeResults);
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      const result = await bridge.researchTechnology('test-tech');
      
      expect(result.recommendations).toContain('Research alternatives to test-tech mentioned in community discussions');
    });
    
    it('should add technology-specific recommendations', async () => {
      mockClient.searchHackerNewsTransformed.mockResolvedValue([]);
      mockClient.searchRedditTransformed.mockResolvedValue([]);
      
      const reactResult = await bridge.researchTechnology('react');
      expect(reactResult.recommendations).toContain('Consider the React ecosystem including Next.js, Redux, or Zustand for state management');
      
      const nodeResult = await bridge.researchTechnology('node.js');
      expect(nodeResult.recommendations).toContain('Evaluate the Node.js ecosystem including Express, Fastify, or NestJS frameworks');
    });
  });
}); 