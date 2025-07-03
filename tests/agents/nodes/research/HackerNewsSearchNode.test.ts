import { HackerNewsSearchNode } from '../../../../src/agents/nodes/research/HackerNewsSearchNode';
import { ProjectState } from '../../../../src/agents/state';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('HackerNewsSearchNode', () => {
  let node: HackerNewsSearchNode;
  let mockState: ProjectState;

  beforeEach(() => {
    node = new HackerNewsSearchNode();
    mockState = {
      filePath: 'test.org',
      fileContent: '',
      requirements: [],
      userStories: [],
      brainstormIdeas: [],
      questionsAnswers: [],
      moscowAnalysis: { must: [], should: [], could: [], wont: [] },
      kanoAnalysis: { basic: [], performance: [], excitement: [] },
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
    
    jest.clearAllMocks();
  });

  describe('process', () => {
    it('should handle empty research topics', async () => {
      const result = await node.process(mockState);

      expect(result.hackerNewsResults).toEqual([]);
      expect(result.messages?.[0]).toEqual(expect.objectContaining({
        content: "No research topics found for Hacker News search"
      }));
      expect(result.nextNode).toBe('RedditSearchNode');
    });

    it('should search using multiple strategies for each topic', async () => {
      mockState.researchTopics = ['Node.js best practices'];
      
      // Mock responses for all 4 strategies
      mockedAxios.get.mockImplementation((url: string, config) => {
        const params = config?.params;
        
        // Front page search (recent high-scoring)
        if (params?.numericFilters?.includes('points>100')) {
          return Promise.resolve({
            data: {
              hits: [{
                objectID: 'front1',
                title: 'Node.js Performance Tips',
                points: 250,
                num_comments: 45,
                created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString() // 12 hours ago
              }]
            }
          });
        }
        
        // Trending search (recent posts)
        if (url.includes('search_by_date') && !params?.numericFilters?.includes('points>100')) {
          return Promise.resolve({
            data: {
              hits: [{
                objectID: 'trend1',
                title: 'New Node.js Feature Released',
                points: 120,
                num_comments: 30,
                created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString() // 6 hours ago
              }]
            }
          });
        }
        
        // Influential search (500+ points)
        if (params?.numericFilters === 'points>500') {
          return Promise.resolve({
            data: {
              hits: [{
                objectID: 'influential1',
                title: 'The Definitive Node.js Guide',
                points: 1200,
                num_comments: 300,
                created_at: new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString() // 1 year ago
              }]
            }
          });
        }
        
        // Regular relevant search
        return Promise.resolve({
          data: {
            hits: [{
              objectID: 'relevant1',
              title: 'Node.js Tutorial for Beginners',
              points: 80,
              num_comments: 15,
              created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString() // 30 days ago
            }]
          }
        });
      });

      const result = await node.process(mockState);

      // Should make 4 API calls per topic (4 strategies)
      expect(mockedAxios.get).toHaveBeenCalledTimes(4);
      
      // Should return deduplicated results
      expect(result.hackerNewsResults).toBeDefined();
      expect(result.hackerNewsResults!.length).toBeGreaterThan(0);
      
      // Check for categorized summary
      expect(result.messages).toContainEqual(expect.objectContaining({
        content: expect.stringMatching(/Found \d+ Hacker News discussions: \d+ must-read/)
      }));
    });

    it('should calculate velocity and identify trending posts', async () => {
      mockState.researchTopics = ['JavaScript'];
      
      const trendingPost = {
        objectID: 'trending1',
        title: 'JavaScript Performance Breakthrough',
        points: 150,
        num_comments: 50,
        created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString() // 3 hours ago, 50 points/hour
      };
      
      mockedAxios.get.mockResolvedValue({
        data: { hits: [trendingPost] }
      });

      const result = await node.process(mockState);
      
      // Should identify high velocity posts in summary
      const summary = result.hackerNewsResults![0].summary;
      expect(summary).toMatch(/\d+\/hr/); // Should show velocity
    });

    it('should identify front page posts', async () => {
      mockState.researchTopics = ['React'];
      
      const frontPagePost = {
        objectID: 'fp1',
        title: 'React 19 Released',
        points: 450,
        num_comments: 120,
        created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString() // 24 hours ago
      };
      
      mockedAxios.get.mockResolvedValue({
        data: { hits: [frontPagePost] }
      });

      const result = await node.process(mockState);
      
      const summary = result.hackerNewsResults![0].summary;
      expect(summary).toContain('🔥 Front Page');
    });

    it('should boost relevance for different categories', async () => {
      mockState.researchTopics = ['testing'];
      
      // Mock different categories with same base metrics
      mockedAxios.get.mockImplementation((_, config) => {
        const params = config?.params;
        
        if (params?.numericFilters?.includes('points>100')) {
          // Must-read category gets 2x boost
          return Promise.resolve({
            data: {
              hits: [{
                objectID: 'mustread1',
                title: 'Testing Best Practices',
                points: 150,
                num_comments: 30,
                created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString()
              }]
            }
          });
        }
        
        // Regular search
        return Promise.resolve({
          data: {
            hits: [{
              objectID: 'regular1',
              title: 'Testing Tutorial',
              points: 150,
              num_comments: 30,
              created_at: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
              }]
            }
          });
      });

      const result = await node.process(mockState);
      
      // Front page post should rank higher due to boost
      expect(result.hackerNewsResults![0].url).toContain('mustread1');
    });

    it('should deduplicate results across strategies', async () => {
      mockState.researchTopics = ['Python'];
      
      const duplicatePost = {
        objectID: 'dup1',
        title: 'Python 4.0 Released',
        url: 'https://example.com/python4',
        points: 500,
        num_comments: 200,
        created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
      };
      
      // Return same post from multiple strategies
      mockedAxios.get.mockResolvedValue({
        data: { hits: [duplicatePost] }
      });

      const result = await node.process(mockState);
      
      // Should only have one instance of the post
      const pythonPosts = result.hackerNewsResults!.filter(r => r.url === duplicatePost.url);
      expect(pythonPosts).toHaveLength(1);
    });

    it('should handle API errors gracefully for individual strategies', async () => {
      mockState.researchTopics = ['error test'];
      
      let callCount = 0;
      mockedAxios.get.mockImplementation(() => {
        callCount++;
        // Fail first two strategies, succeed on others
        if (callCount <= 2) {
          return Promise.reject(new Error('API error'));
        }
        return Promise.resolve({
          data: {
            hits: [{
              objectID: 'success1',
              title: 'Successful Result',
              points: 100,
              num_comments: 20,
              created_at: new Date().toISOString()
            }]
          }
        });
      });

      const result = await node.process(mockState);
      
      // Should still return results from successful strategies
      expect(result.hackerNewsResults).toBeDefined();
      expect(result.hackerNewsResults!.length).toBeGreaterThan(0);
    });

    it('should identify influential posts correctly', async () => {
      mockState.researchTopics = ['AI'];
      
      const influentialPost = {
        objectID: 'inf1',
        title: 'The AI Revolution',
        points: 2500,
        num_comments: 800,
        created_at: new Date(Date.now() - 180 * 24 * 3600 * 1000).toISOString() // 6 months old
      };
      
      mockedAxios.get.mockResolvedValue({
        data: { hits: [influentialPost] }
      });

      const result = await node.process(mockState);
      
      const summary = result.hackerNewsResults![0].summary;
      expect(summary).toContain('⭐ Influential');
    });

    it('should calculate viral score for high engagement posts', async () => {
      mockState.researchTopics = ['discussion'];
      
      const viralPost = {
        objectID: 'viral1',
        title: 'Controversial Tech Opinion',
        points: 100,
        num_comments: 250, // 2.5 comments per point - very high engagement
        created_at: new Date().toISOString()
      };
      
      mockedAxios.get.mockResolvedValue({
        data: { hits: [viralPost] }
      });

      const result = await node.process(mockState);
      
      // High engagement should boost relevance
      expect(result.hackerNewsResults![0].relevance).toBeGreaterThan(50);
    });

    it('should provide enhanced summaries with status indicators', async () => {
      mockState.researchTopics = ['test'];
      
      mockedAxios.get.mockResolvedValue({
        data: {
          hits: [{
            objectID: 'test1',
            title: 'Test Post',
            points: 42,
            num_comments: 8,
            created_at: new Date().toISOString(),
            story_text: 'This is a test story about testing frameworks and methodologies.'
          }]
        }
      });

      const result = await node.process(mockState);
      
      const summary = result.hackerNewsResults![0].summary;
      // Should include metadata and content (with or without emoji prefix)
      expect(summary).toMatch(/Posted .* \| \d+ points.* \| \d+ comments/);
      // Should include selection reason with 📎
      expect(summary).toContain('📎');
      // Should include relationship with 🔗
      expect(summary).toContain('🔗');
      expect(summary).toContain('testing frameworks');
    });

    it('should limit total results even with multiple topics', async () => {
      mockState.researchTopics = ['topic1', 'topic2', 'topic3', 'topic4', 'topic5'];
      
      // Mock many results for each strategy and topic
      mockedAxios.get.mockResolvedValue({
        data: {
          hits: Array(10).fill(null).map((_, i) => ({
            objectID: String(i),
            title: `Result ${i}`,
            points: 100 + i,
            num_comments: 20,
            created_at: new Date().toISOString()
          }))
        }
      });

      const result = await node.process(mockState);
      
      // Should be limited to maxTotalResults (25)
      expect(result.hackerNewsResults!.length).toBeLessThanOrEqual(25);
    });

    it('should explain selection reasons for tangentially related content', async () => {
      mockState.researchTopics = ['Node.js performance'];
      
      // Mock a front page post that's tangentially related
      mockedAxios.get.mockImplementation((_, config) => {
        const params = config?.params;
        
        // Front page search returns a general performance post
        if (params?.numericFilters?.includes('points>100')) {
          return Promise.resolve({
            data: {
              hits: [{
                objectID: 'tangential1',
                title: 'How We Optimized Our Python Backend to Handle 1M Requests',
                points: 850,
                num_comments: 245,
                created_at: new Date(Date.now() - 20 * 3600 * 1000).toISOString() // 20 hours ago
              }]
            }
          });
        }
        
        return Promise.resolve({ data: { hits: [] } });
      });

      const result = await node.process(mockState);
      
      expect(result.hackerNewsResults).toHaveLength(1);
      const summary = result.hackerNewsResults![0].summary;
      
      // Should identify this as a front page post
      expect(summary).toContain('🔥 Front Page');
      // Should explain why it was selected
      expect(summary).toContain('Highly influential recent discussion');
      // Should explain the relationship - both are backend technologies
      expect(summary).toContain('Related backend technology');
    });

    it('should identify direct keyword matches in selection reason', async () => {
      mockState.researchTopics = ['React hooks'];
      
      mockedAxios.get.mockResolvedValue({
        data: {
          hits: [{
            objectID: 'direct1',
            title: 'Understanding React Hooks: A Deep Dive',
            points: 450,
            num_comments: 120,
            created_at: new Date(Date.now() - 30 * 3600 * 1000).toISOString()
          }]
        }
      });

      const result = await node.process(mockState);
      
      const summary = result.hackerNewsResults![0].summary;
      // Should note the direct relationship
      expect(summary).toMatch(/Matches keywords.*react.*hooks/i);
    });

    it('should categorize general engineering wisdom correctly', async () => {
      mockState.researchTopics = ['microservices architecture'];
      
      mockedAxios.get.mockResolvedValue({
        data: {
          hits: [{
            objectID: 'wisdom1',
            title: 'Lessons Learned from 10 Years of Building Software',
            points: 1200,
            num_comments: 350,
            created_at: new Date(Date.now() - 180 * 24 * 3600 * 1000).toISOString()
          }]
        }
      });

      const result = await node.process(mockState);
      
      const summary = result.hackerNewsResults![0].summary;
      // Should identify as general engineering wisdom
      expect(summary).toContain('General engineering wisdom');
    });
  });
}); 