import { RedditSearchNode } from '../../../../src/agents/nodes/research/RedditSearchNode';
import { ProjectState } from '../../../../src/agents/state';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('RedditSearchNode', () => {
  let node: RedditSearchNode;
  let mockState: ProjectState;

  beforeEach(() => {
    node = new RedditSearchNode();
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

      expect(result.redditResults).toEqual([]);
      expect(result.messages?.[0]).toEqual(expect.objectContaining({
        content: "No research topics found for Reddit search"
      }));
      expect(result.nextNode).toBe('AdditionalResearchNode');
    });

    it('should identify relevant subreddits based on topics', async () => {
      mockState.researchTopics = ['React hooks', 'Node.js performance'];
      
      // Mock empty responses to test subreddit identification
      mockedAxios.get.mockResolvedValue({
        data: { data: { children: [] } }
      });

      await node.process(mockState);

      // Should search in React and Node.js related subreddits
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            q: expect.stringContaining('subreddit:')
          })
        })
      );
    });

    it('should search using multiple strategies', async () => {
      mockState.researchTopics = ['JavaScript testing'];
      
      mockedAxios.get.mockResolvedValue({
        data: {
          data: {
            children: [{
              data: {
                id: 'test1',
                title: 'Best JavaScript Testing Practices',
                subreddit: 'javascript',
                score: 250,
                num_comments: 45,
                created_utc: Math.floor(Date.now() / 1000) - 12 * 3600,
                url: '/r/javascript/comments/test1/best_javascript_testing_practices/',
                author: 'testuser',
                upvote_ratio: 0.95
              }
            }]
          }
        }
      });

      const result = await node.process(mockState);

      // Should make 3 API calls (hot, technical, general)
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
      expect(result.redditResults).toBeDefined();
      expect(result.redditResults!.length).toBeGreaterThan(0);
    });

    it('should calculate velocity and identify hot posts', async () => {
      mockState.researchTopics = ['Python'];
      
      const hotPost = {
        id: 'hot1',
        title: 'Python 4.0 Released!',
        subreddit: 'Python',
        score: 2500,
        num_comments: 450,
        created_utc: Math.floor(Date.now() / 1000) - 3 * 3600, // 3 hours ago
        url: '/r/Python/comments/hot1/python_40_released/',
        author: 'pythondev',
        upvote_ratio: 0.98
      };
      
      mockedAxios.get.mockResolvedValue({
        data: { data: { children: [{ data: hotPost }] } }
      });

      const result = await node.process(mockState);
      
      const summary = result.redditResults![0].summary;
      expect(summary).toContain('🔥 Hot');
      expect(summary).toMatch(/\d+\/hr/); // Should show velocity
    });

    it('should provide enhanced summaries with selection context', async () => {
      mockState.researchTopics = ['microservices'];
      
      mockedAxios.get.mockResolvedValue({
        data: {
          data: {
            children: [{
              data: {
                id: 'test1',
                title: 'Microservices Best Practices Guide',
                subreddit: 'programming',
                score: 850,
                num_comments: 120,
                created_utc: Math.floor(Date.now() / 1000) - 24 * 3600,
                url: '/r/programming/comments/test1/',
                author: 'developer',
                upvote_ratio: 0.92,
                selftext: 'This is a comprehensive guide to microservices architecture...'
              }
            }]
          }
        }
      });

      const result = await node.process(mockState);
      
      const summary = result.redditResults![0].summary;
      // Should include metadata
      expect(summary).toMatch(/r\/programming.*Posted.*upvotes.*comments/);
      // Should include selection reason
      expect(summary).toContain('📎');
      // Should include relationship
      expect(summary).toContain('🔗');
      // Should include content preview
      expect(summary).toContain('comprehensive guide');
    });

    it('should handle API errors gracefully', async () => {
      mockState.researchTopics = ['error test'];
      
      // Mock all requests to fail
      mockedAxios.get.mockRejectedValue(new Error('Reddit API error'));

      const result = await node.process(mockState);
      
      // When all strategies fail, we should get zero results but no crash
      expect(result.redditResults).toBeDefined();
      expect(result.redditResults).toHaveLength(0);
      // Should show summary of found results (0 in this case)
      expect(result.messages?.some(msg => {
        const content = typeof msg.content === 'string' ? msg.content : '';
        return content.includes('Found 0 Reddit discussions');
      })).toBe(true);
    });

    it('should categorize posts correctly', async () => {
      mockState.researchTopics = ['React'];
      
      mockedAxios.get.mockImplementation((_, config) => {
        const params = config?.params;
        
        if (params?.sort === 'hot') {
          return Promise.resolve({
            data: {
              data: {
                children: [{
                  data: {
                    id: 'hot1',
                    title: 'React 19 Released',
                    subreddit: 'reactjs',
                    score: 1500,
                    num_comments: 200,
                    created_utc: Math.floor(Date.now() / 1000) - 6 * 3600,
                    url: '/r/reactjs/comments/hot1/',
                    author: 'reactdev'
                  }
                }]
              }
            }
          });
        } else if (params?.sort === 'top') {
          return Promise.resolve({
            data: {
              data: {
                children: [{
                  data: {
                    id: 'wisdom1',
                    title: 'Lessons from 5 Years of React Development',
                    subreddit: 'programming',
                    score: 3000,
                    num_comments: 500,
                    created_utc: Math.floor(Date.now() / 1000) - 180 * 24 * 3600,
                    url: '/r/programming/comments/wisdom1/',
                    author: 'veteran'
                  }
                }]
              }
            }
          });
        }
        
        return Promise.resolve({
          data: { data: { children: [] } }
        });
      });

      const result = await node.process(mockState);
      
      // Should have both hot discussion and community wisdom
      expect(result.messages?.[0]).toEqual(expect.objectContaining({
        content: expect.stringMatching(/hot discussions.*community wisdom/)
      }));
    });

    it('should identify comparison posts correctly', async () => {
      mockState.researchTopics = ['frontend frameworks'];
      
      mockedAxios.get.mockResolvedValue({
        data: {
          data: {
            children: [{
              data: {
                id: 'compare1',
                title: 'React vs Vue vs Angular in 2024',
                subreddit: 'webdev',
                score: 450,
                num_comments: 180,
                created_utc: Math.floor(Date.now() / 1000) - 48 * 3600,
                url: '/r/webdev/comments/compare1/',
                author: 'webdevguru'
              }
            }]
          }
        }
      });

      const result = await node.process(mockState);
      
      const summary = result.redditResults![0].summary;
      expect(summary).toContain('Comparative analysis relevant to your technology choices');
    });

    it('should handle posts without selftext', async () => {
      mockState.researchTopics = ['testing'];
      
      mockedAxios.get.mockResolvedValue({
        data: {
          data: {
            children: [{
              data: {
                id: 'link1',
                title: 'Great Testing Article',
                subreddit: 'programming',
                score: 200,
                num_comments: 30,
                created_utc: Math.floor(Date.now() / 1000) - 12 * 3600,
                url: 'https://example.com/testing-article',
                author: 'tester'
                // No selftext - this is a link post
              }
            }]
          }
        }
      });

      const result = await node.process(mockState);
      
      // Should handle posts without selftext gracefully
      expect(result.redditResults).toHaveLength(1);
      expect(result.redditResults![0].summary).not.toContain('undefined');
    });

    it('should detect mistakes/pitfalls posts', async () => {
      mockState.researchTopics = ['Node.js'];
      
      mockedAxios.get.mockResolvedValue({
        data: {
          data: {
            children: [{
              data: {
                id: 'mistake1',
                title: 'Common Node.js Mistakes to Avoid',
                subreddit: 'node',
                score: 650,
                num_comments: 95,
                created_utc: Math.floor(Date.now() / 1000) - 72 * 3600,
                url: '/r/node/comments/mistake1/',
                author: 'nodeexpert',
                link_flair_text: 'Discussion'
              }
            }]
          }
        }
      });

      const result = await node.process(mockState);
      
      const summary = result.redditResults![0].summary;
      expect(summary).toContain('Common pitfalls and lessons learned');
    });

    it('should calculate relevance with subreddit specificity bonus', async () => {
      mockState.researchTopics = ['TypeScript'];
      
      mockedAxios.get.mockResolvedValue({
        data: {
          data: {
            children: [
              {
                data: {
                  id: 'ts1',
                  title: 'TypeScript Tips',
                  subreddit: 'typescript', // Matches topic
                  score: 100,
                  num_comments: 20,
                  created_utc: Math.floor(Date.now() / 1000) - 24 * 3600,
                  url: '/r/typescript/comments/ts1/',
                  author: 'tsdev'
                }
              },
              {
                data: {
                  id: 'general1',
                  title: 'TypeScript Discussion',
                  subreddit: 'programming', // General subreddit
                  score: 100,
                  num_comments: 20,
                  created_utc: Math.floor(Date.now() / 1000) - 24 * 3600,
                  url: '/r/programming/comments/general1/',
                  author: 'dev'
                }
              }
            ]
          }
        }
      });

      const result = await node.process(mockState);
      
      // Post in TypeScript subreddit should rank higher
      const tsPost = result.redditResults!.find(r => r.url.includes('ts1'));
      const generalPost = result.redditResults!.find(r => r.url.includes('general1'));
      
      expect(tsPost!.relevance).toBeGreaterThan(generalPost!.relevance);
    });

    it('should handle relative time display correctly', async () => {
      mockState.researchTopics = ['test'];
      
      const now = Math.floor(Date.now() / 1000);
      
      mockedAxios.get.mockResolvedValue({
        data: {
          data: {
            children: [{
              data: {
                id: 'time1',
                title: 'Test Post',
                subreddit: 'programming',
                score: 50,
                num_comments: 10,
                created_utc: now - 30 * 60, // 30 minutes ago
                url: '/r/programming/comments/time1/',
                author: 'user'
              }
            }]
          }
        }
      });

      const result = await node.process(mockState);
      
      const summary = result.redditResults![0].summary;
      expect(summary).toContain('just now');
    });

    it('should limit total results across all topics', async () => {
      mockState.researchTopics = ['topic1', 'topic2', 'topic3'];
      
      // Mock many results
      mockedAxios.get.mockResolvedValue({
        data: {
          data: {
            children: Array(10).fill(null).map((_, i) => ({
              data: {
                id: `post${i}`,
                title: `Post ${i}`,
                subreddit: 'programming',
                score: 100 + i,
                num_comments: 20,
                created_utc: Math.floor(Date.now() / 1000) - i * 3600,
                url: `/r/programming/comments/post${i}/`,
                author: `user${i}`
              }
            }))
          }
        }
      });

      const result = await node.process(mockState);
      
      // Should be limited to maxTotalResults (20)
      expect(result.redditResults!.length).toBeLessThanOrEqual(20);
    });

    it('should deduplicate results across strategies', async () => {
      mockState.researchTopics = ['JavaScript'];
      
      const duplicatePost = {
        id: 'dup1',
        title: 'JavaScript Best Practices',
        subreddit: 'javascript',
        score: 500,
        num_comments: 100,
        created_utc: Math.floor(Date.now() / 1000) - 12 * 3600,
        url: '/r/javascript/comments/dup1/',
        author: 'jsdev'
      };
      
      // Return same post from multiple strategies
      mockedAxios.get.mockResolvedValue({
        data: { data: { children: [{ data: duplicatePost }] } }
      });

      const result = await node.process(mockState);
      
      // Should only have one instance
      const dupPosts = result.redditResults!.filter(r => r.url.includes('dup1'));
      expect(dupPosts).toHaveLength(1);
    });
  });
}); 