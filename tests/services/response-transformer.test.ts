import { ResponseTransformer } from '../../src/services/response-transformer';
import {
  HNSearchResults,
  RedditSearchResults,
  HNHit,
  RedditPost,
  RedditComment
} from '../../src/types/n8n-types';

describe('ResponseTransformer', () => {
  let transformer: ResponseTransformer;
  
  beforeEach(() => {
    transformer = new ResponseTransformer();
  });
  
  describe('transformHackerNewsResults', () => {
    it('should transform HN story results correctly', () => {
      const mockHNResults: HNSearchResults = {
        hits: [
          {
            objectID: '12345',
            title: 'TypeScript Best Practices',
            url: 'https://example.com/ts-best-practices',
            author: 'testuser',
            points: 150,
            num_comments: 25,
            created_at: new Date().toISOString(),
            _tags: ['story', 'author_testuser']
          }
        ],
        nbHits: 1,
        page: 0,
        nbPages: 1,
        hitsPerPage: 20,
        processingTimeMS: 100,
        query: 'typescript'
      };
      
      const results = transformer.transformHackerNewsResults(mockHNResults);
      
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        id: '12345',
        source: 'hackernews',
        title: 'TypeScript Best Practices',
        url: 'https://example.com/ts-best-practices',
        content: 'TypeScript Best Practices',
        metadata: {
          author: 'testuser',
          points: 150,
          numComments: 25,
          type: 'story'
        }
      });
      expect(results[0].score).toBeGreaterThan(0);
    });
    
    it('should transform HN comment results correctly', () => {
      const mockHNResults: HNSearchResults = {
        hits: [
          {
            objectID: '67890',
            comment_text: 'This is a great approach to TypeScript development.\nI particularly like the type safety aspects.',
            author: 'commenter',
            points: 10,
            created_at: new Date().toISOString(),
            _tags: ['comment', 'author_commenter']
          }
        ],
        nbHits: 1,
        page: 0,
        nbPages: 1,
        hitsPerPage: 20,
        processingTimeMS: 50,
        query: 'typescript'
      };
      
      const results = transformer.transformHackerNewsResults(mockHNResults);
      
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        id: '67890',
        source: 'hackernews',
        title: 'This is a great approach to TypeScript development.',
        url: 'https://news.ycombinator.com/item?id=67890',
        metadata: {
          author: 'commenter',
          points: 10,
          type: 'comment'
        }
      });
    });
    
    it('should handle missing fields gracefully', () => {
      const mockHNResults: HNSearchResults = {
        hits: [
          {
            objectID: '11111',
            author: 'author1',
            created_at: new Date().toISOString()
          } as HNHit
        ],
        nbHits: 1,
        page: 0,
        nbPages: 1,
        hitsPerPage: 20,
        processingTimeMS: 50,
        query: 'test'
      };
      
      const results = transformer.transformHackerNewsResults(mockHNResults);
      
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Untitled');
      expect(results[0].content).toBe('');
      expect(results[0].metadata.points).toBe(0);
      expect(results[0].metadata.numComments).toBe(0);
    });
    
    it('should calculate relevance score with recency penalty', () => {
      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 2); // 2 months old
      
      const mockHNResults: HNSearchResults = {
        hits: [
          {
            objectID: '22222',
            title: 'Old Post',
            author: 'oldauthor',
            points: 100,
            num_comments: 20,
            created_at: oldDate.toISOString()
          }
        ],
        nbHits: 1,
        page: 0,
        nbPages: 1,
        hitsPerPage: 20,
        processingTimeMS: 50,
        query: 'test'
      };
      
      const results = transformer.transformHackerNewsResults(mockHNResults);
      
      // Score should be reduced by recency penalty (2 months = -20 points)
      expect(results[0].score).toBe(100 + (20 * 2) - 20); // 120
    });
  });
  
  describe('transformRedditResults', () => {
    it('should transform Reddit posts correctly', () => {
      const mockRedditResults: RedditSearchResults = {
        posts: [
          {
            id: 'post123',
            title: 'React vs Vue comparison',
            selftext: 'Detailed comparison of React and Vue frameworks...',
            permalink: '/r/webdev/comments/post123/react_vs_vue_comparison/',
            author: 'webdev_user',
            subreddit: 'webdev',
            ups: 250,
            downs: 10,
            upvote_ratio: 0.96,
            num_comments: 45,
            created_utc: Math.floor(Date.now() / 1000),
            is_video: false,
            all_awardings: [{}, {}] // 2 awards
          }
        ],
        query: 'react vue',
        subreddits: ['webdev']
      };
      
      const results = transformer.transformRedditResults(mockRedditResults);
      
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        id: 'post123',
        source: 'reddit',
        title: 'React vs Vue comparison',
        url: 'https://reddit.com/r/webdev/comments/post123/react_vs_vue_comparison/',
        content: 'Detailed comparison of React and Vue frameworks...',
        metadata: {
          author: 'webdev_user',
          subreddit: 'webdev',
          upvotes: 250,
          downvotes: 10,
          upvoteRatio: 0.96,
          numComments: 45,
          awards: 2,
          type: 'post'
        }
      });
      expect(results[0].score).toBeGreaterThan(0);
    });
    
    it('should transform Reddit comments correctly', () => {
      const mockRedditResults: RedditSearchResults = {
        comments: [
          {
            id: 'comment456',
            body: 'I prefer TypeScript for large projects',
            permalink: '/r/typescript/comments/post789/discussion/comment456/',
            author: 'ts_fan',
            subreddit: 'typescript',
            ups: 50,
            downs: 2,
            created_utc: Math.floor(Date.now() / 1000),
            parent_id: 't3_post789',
            link_id: 't3_post789',
            link_title: 'TypeScript Discussion',
            depth: 0
          }
        ],
        query: 'typescript',
        subreddits: ['typescript']
      };
      
      const results = transformer.transformRedditResults(mockRedditResults);
      
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        id: 'comment456',
        source: 'reddit',
        title: 'Comment on: TypeScript Discussion',
        url: 'https://reddit.com/r/typescript/comments/post789/discussion/comment456/',
        content: 'I prefer TypeScript for large projects',
        metadata: {
          author: 'ts_fan',
          subreddit: 'typescript',
          upvotes: 50,
          downvotes: 2,
          isTopLevel: true,
          depth: 0,
          type: 'comment'
        }
      });
    });
    
    it('should handle both posts and comments', () => {
      const mockRedditResults: RedditSearchResults = {
        posts: [
          {
            id: 'post1',
            title: 'Post Title',
            permalink: '/r/test/post1/',
            author: 'author1',
            subreddit: 'test',
            ups: 100,
            downs: 5,
            num_comments: 10,
            created_utc: Math.floor(Date.now() / 1000)
          } as RedditPost
        ],
        comments: [
          {
            id: 'comment1',
            body: 'Comment body',
            permalink: '/r/test/comment1/',
            author: 'author2',
            subreddit: 'test',
            ups: 20,
            downs: 1,
            created_utc: Math.floor(Date.now() / 1000),
            parent_id: 't1_parent',
            link_id: 't3_post1'
          } as RedditComment
        ],
        query: 'test',
        subreddits: ['test']
      };
      
      const results = transformer.transformRedditResults(mockRedditResults);
      
      expect(results).toHaveLength(2);
      expect(results.find(r => r.metadata.type === 'post')).toBeDefined();
      expect(results.find(r => r.metadata.type === 'comment')).toBeDefined();
    });
    
    it('should handle empty results', () => {
      const mockRedditResults: RedditSearchResults = {
        posts: [],
        comments: [],
        query: 'test',
        subreddits: []
      };
      
      const results = transformer.transformRedditResults(mockRedditResults);
      
      expect(results).toHaveLength(0);
    });
    
    it('should calculate post relevance with awards', () => {
      const mockRedditResults: RedditSearchResults = {
        posts: [
          {
            id: 'awarded_post',
            title: 'Highly Awarded Post',
            permalink: '/r/test/awarded/',
            author: 'popular',
            subreddit: 'test',
            ups: 100,
            downs: 0,
            upvote_ratio: 1.0,
            num_comments: 10,
            created_utc: Math.floor(Date.now() / 1000),
            all_awardings: [{}, {}, {}] // 3 awards = 150 bonus points
          } as RedditPost
        ],
        query: 'test',
        subreddits: ['test']
      };
      
      const results = transformer.transformRedditResults(mockRedditResults);
      
      // Score: (100 * 1.0) + (10 * 3) + (3 * 50) = 100 + 30 + 150 = 280
      expect(results[0].score).toBe(280);
    });
    
    it('should apply depth penalty to nested comments', () => {
      const mockRedditResults: RedditSearchResults = {
        comments: [
          {
            id: 'deep_comment',
            body: 'Deeply nested comment',
            permalink: '/r/test/deep/',
            author: 'commenter',
            subreddit: 'test',
            ups: 50,
            downs: 0,
            created_utc: Math.floor(Date.now() / 1000),
            parent_id: 't1_parent',
            link_id: 't3_post',
            depth: 3 // Depth 3 = -30 penalty
          } as RedditComment
        ],
        query: 'test',
        subreddits: ['test']
      };
      
      const results = transformer.transformRedditResults(mockRedditResults);
      
      // Score: 50 - 30 = 20
      expect(results[0].score).toBe(20);
    });
  });
  
  describe('recency penalty', () => {
    it('should not penalize recent content', () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 3); // 3 days old
      
      const mockHNResults: HNSearchResults = {
        hits: [
          {
            objectID: '33333',
            title: 'Recent Post',
            author: 'recent',
            points: 50,
            created_at: recentDate.toISOString()
          } as HNHit
        ],
        nbHits: 1,
        page: 0,
        nbPages: 1,
        hitsPerPage: 20,
        processingTimeMS: 50,
        query: 'test'
      };
      
      const results = transformer.transformHackerNewsResults(mockHNResults);
      
      // No penalty for content less than 7 days old
      expect(results[0].score).toBe(50);
    });
    
    it('should apply gradual penalty for older content', () => {
      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 3); // 3 months old
      
      const mockHNResults: HNSearchResults = {
        hits: [
          {
            objectID: '44444',
            title: 'Older Post',
            author: 'old',
            points: 100,
            created_at: oldDate.toISOString()
          } as HNHit
        ],
        nbHits: 1,
        page: 0,
        nbPages: 1,
        hitsPerPage: 20,
        processingTimeMS: 50,
        query: 'test'
      };
      
      const results = transformer.transformHackerNewsResults(mockHNResults);
      
      // 3 months = -30 points penalty
      expect(results[0].score).toBe(70);
    });
  });
}); 