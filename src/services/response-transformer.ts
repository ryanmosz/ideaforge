import {
  HNSearchResults,
  HNHit,
  RedditSearchResults,
  RedditPost,
  RedditComment
} from '../types/n8n-types';
import {
  ResearchResult,
  ResearchSource
} from '../agents/types/research-types';

/**
 * Transforms n8n webhook responses into formats suitable for LangGraph agents
 */
export class ResponseTransformer {
  /**
   * Transform HackerNews search results
   */
  transformHackerNewsResults(raw: HNSearchResults): ResearchResult[] {
    return raw.hits.map(hit => ({
      id: hit.objectID,
      source: 'hackernews' as ResearchSource,
      title: this.extractHNTitle(hit),
      url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      content: this.extractHNContent(hit),
      score: this.calculateHNRelevance(hit),
      metadata: {
        author: hit.author,
        points: hit.points || 0,
        numComments: hit.num_comments || 0,
        createdAt: hit.created_at,
        tags: hit._tags || [],
        highlights: hit._highlightResult,
        type: hit.comment_text ? 'comment' : 'story'
      }
    }));
  }
  
  /**
   * Transform Reddit search results
   */
  transformRedditResults(raw: RedditSearchResults): ResearchResult[] {
    const results: ResearchResult[] = [];
    
    // Transform posts
    if (raw.posts && raw.posts.length > 0) {
      results.push(...raw.posts.map(post => ({
        id: post.id,
        source: 'reddit' as ResearchSource,
        title: post.title,
        url: `https://reddit.com${post.permalink}`,
        content: post.selftext || post.title,
        score: this.calculateRedditPostRelevance(post),
        metadata: {
          author: post.author,
          subreddit: post.subreddit,
          upvotes: post.ups,
          downvotes: post.downs,
          upvoteRatio: post.upvote_ratio || 0,
          numComments: post.num_comments,
          createdAt: new Date(post.created_utc * 1000).toISOString(),
          isVideo: post.is_video || false,
          awards: post.all_awardings?.length || 0,
          type: 'post'
        }
      })));
    }
    
    // Transform comments
    if (raw.comments && raw.comments.length > 0) {
      results.push(...raw.comments.map(comment => ({
        id: comment.id,
        source: 'reddit' as ResearchSource,
        title: `Comment on: ${comment.link_title || 'Unknown Post'}`,
        url: `https://reddit.com${comment.permalink}`,
        content: comment.body,
        score: this.calculateRedditCommentRelevance(comment),
        metadata: {
          author: comment.author,
          subreddit: comment.subreddit,
          upvotes: comment.ups,
          downvotes: comment.downs,
          createdAt: new Date(comment.created_utc * 1000).toISOString(),
          isTopLevel: !comment.parent_id.startsWith('t1_'),
          postId: comment.link_id,
          depth: comment.depth || 0,
          type: 'comment'
        }
      })));
    }
    
    return results;
  }
  
  /**
   * Extract title from HackerNews hit
   */
  private extractHNTitle(hit: HNHit): string {
    if (hit.title) return hit.title;
    if (hit.story_title) return hit.story_title;
    if (hit.comment_text) {
      // For comments, create a title from the first line
      const firstLine = hit.comment_text.split('\n')[0];
      return firstLine.length > 100 
        ? firstLine.substring(0, 97) + '...'
        : firstLine;
    }
    return 'Untitled';
  }
  
  /**
   * Extract content from HackerNews hit
   */
  private extractHNContent(hit: HNHit): string {
    // Prefer comment text, then story text, then title
    return hit.comment_text || hit.story_text || hit.title || '';
  }
  
  /**
   * Calculate relevance score for HackerNews hit
   */
  private calculateHNRelevance(hit: HNHit): number {
    const baseScore = hit.points || 0;
    const commentBoost = (hit.num_comments || 0) * 2;
    const recencyPenalty = this.getRecencyPenalty(hit.created_at);
    
    // Comments get a slight penalty as they're usually less comprehensive
    const typeModifier = hit.comment_text ? 0.8 : 1.0;
    
    return Math.max(0, (baseScore + commentBoost - recencyPenalty) * typeModifier);
  }
  
  /**
   * Calculate relevance score for Reddit post
   */
  private calculateRedditPostRelevance(post: RedditPost): number {
    const upvotes = post.ups || 0;
    const ratio = post.upvote_ratio || 0.5;
    const comments = post.num_comments || 0;
    const awards = post.all_awardings?.length || 0;
    
    // Calculate engagement score
    const engagementScore = upvotes * ratio + (comments * 3) + (awards * 50);
    
    // Apply recency penalty
    const recencyPenalty = this.getRecencyPenalty(
      new Date(post.created_utc * 1000).toISOString()
    );
    
    return Math.max(0, engagementScore - recencyPenalty);
  }
  
  /**
   * Calculate relevance score for Reddit comment
   */
  private calculateRedditCommentRelevance(comment: RedditComment): number {
    const upvotes = comment.ups || 0;
    const depth = comment.depth || 0;
    
    // Deeper comments are usually less relevant
    const depthPenalty = depth * 10;
    
    // Apply recency penalty
    const recencyPenalty = this.getRecencyPenalty(
      new Date(comment.created_utc * 1000).toISOString()
    );
    
    return Math.max(0, upvotes - depthPenalty - recencyPenalty);
  }
  
  /**
   * Calculate penalty based on age of content
   */
  private getRecencyPenalty(createdAt: string): number {
    const ageInDays = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
    
    // No penalty for content less than a week old
    if (ageInDays < 7) return 0;
    
    // Gradual penalty: -10 points per month old
    return Math.floor(ageInDays / 30) * 10;
  }
} 