/**
 * TypeScript type definitions for Reddit API integration
 * @module reddit-types
 */

/**
 * Reddit post data structure from API
 */
export interface RedditPost {
  /** Unique identifier for the post */
  id: string;
  
  /** Full name identifier (t3_id format) */
  name: string;
  
  /** Subreddit name (without r/ prefix) */
  subreddit: string;
  
  /** Subreddit ID */
  subreddit_id: string;
  
  /** Post author username */
  author: string;
  
  /** Author's full ID */
  author_fullname?: string;
  
  /** Post title */
  title: string;
  
  /** Self-post text content */
  selftext?: string;
  
  /** HTML-formatted self-post content */
  selftext_html?: string;
  
  /** External URL or Reddit post URL */
  url: string;
  
  /** Reddit permalink */
  permalink: string;
  
  /** Domain for link posts */
  domain?: string;
  
  // Metrics
  /** Net score (upvotes - downvotes) */
  score: number;
  
  /** Ratio of upvotes to total votes */
  upvote_ratio: number;
  
  /** Number of upvotes */
  ups: number;
  
  /** Number of downvotes */
  downs: number;
  
  /** Number of comments */
  num_comments: number;
  
  // Status flags
  /** NSFW content flag */
  over_18: boolean;
  
  /** Spoiler tag */
  spoiler: boolean;
  
  /** Thread locked status */
  locked: boolean;
  
  /** Post archived (no new comments) */
  archived: boolean;
  
  /** Post removed by moderators */
  removed?: boolean;
  
  /** Post approved by moderators */
  approved?: boolean;
  
  /** Hidden from user's feed */
  hidden: boolean;
  
  /** Quarantined subreddit */
  quarantine: boolean;
  
  /** Stickied to top of subreddit */
  stickied: boolean;
  
  /** Is a text post (not link) */
  is_self: boolean;
  
  /** Contains video content */
  is_video: boolean;
  
  /** Hosted on Reddit */
  is_reddit_media_domain: boolean;
  
  // Timestamps
  /** Creation timestamp */
  created: number;
  
  /** UTC creation timestamp */
  created_utc: number;
  
  /** Edit timestamp or false if not edited */
  edited: boolean | number;
  
  // Awards and flair
  /** Array of awards received */
  all_awardings?: RedditAward[];
  
  /** Number of gold awards */
  gilded: number;
  
  /** Post flair text */
  link_flair_text?: string;
  
  /** Post flair CSS class */
  link_flair_css_class?: string;
  
  /** Author flair text */
  author_flair_text?: string;
  
  /** Author flair CSS class */
  author_flair_css_class?: string;
  
  // Media
  /** Thumbnail URL */
  thumbnail?: string;
  
  /** Thumbnail width */
  thumbnail_width?: number;
  
  /** Thumbnail height */
  thumbnail_height?: number;
  
  /** Media preview data */
  preview?: RedditPreview;
  
  /** Embedded media */
  media?: RedditMedia;
  
  // Additional metadata
  /** Suggested comment sort */
  suggested_sort?: string;
  
  /** Number of crossposts */
  num_crossposts: number;
  
  /** Parent posts if crossposted */
  crosspost_parent_list?: RedditPost[];
  
  /** Distinguished status (moderator/admin) */
  distinguished?: string;
  
  // Custom fields for IdeaForge
  /** Calculated quality score */
  qualityScore?: number;
  
  /** Calculated relevance score */
  relevanceScore?: number;
}

/**
 * Reddit comment data structure
 */
export interface RedditComment {
  /** Unique comment ID */
  id: string;
  
  /** Full name (t1_id format) */
  name: string;
  
  /** Subreddit name */
  subreddit: string;
  
  /** Subreddit ID */
  subreddit_id: string;
  
  /** Parent post ID (t3_xxx) */
  link_id: string;
  
  /** Parent comment or post ID */
  parent_id: string;
  
  /** Comment author */
  author: string;
  
  /** Author's full ID */
  author_fullname?: string;
  
  /** Comment text */
  body: string;
  
  /** HTML-formatted comment */
  body_html: string;
  
  // Metrics
  /** Comment score */
  score: number;
  
  /** Upvotes */
  ups: number;
  
  /** Downvotes */
  downs: number;
  
  // Status
  /** Comment archived */
  archived: boolean;
  
  /** Removed by moderators */
  removed?: boolean;
  
  /** Approved by moderators */
  approved?: boolean;
  
  /** Thread locked */
  locked: boolean;
  
  /** Comment collapsed */
  collapsed: boolean;
  
  /** Reason for collapse */
  collapsed_reason?: string;
  
  /** Score hidden */
  score_hidden: boolean;
  
  // Timestamps
  /** Creation timestamp */
  created: number;
  
  /** UTC creation timestamp */
  created_utc: number;
  
  /** Edit timestamp or false */
  edited: boolean | number;
  
  // Awards and flair
  /** Awards received */
  all_awardings?: RedditAward[];
  
  /** Gold awards count */
  gilded: number;
  
  /** Author flair text */
  author_flair_text?: string;
  
  /** Author flair CSS */
  author_flair_css_class?: string;
  
  // Thread context
  /** Comment depth in thread */
  depth: number;
  
  /** Comment permalink */
  permalink: string;
  
  /** Parent post title */
  link_title?: string;
  
  /** Parent post author */
  link_author?: string;
  
  /** Parent post permalink */
  link_permalink?: string;
  
  // Additional metadata
  /** Distinguished status */
  distinguished?: string;
  
  /** Stickied comment */
  stickied: boolean;
  
  /** Is post author */
  is_submitter: boolean;
  
  // Custom fields
  /** Quality score */
  qualityScore?: number;
  
  /** Relevance score */
  relevanceScore?: number;
}

/**
 * Reddit award structure
 */
export interface RedditAward {
  /** Award ID */
  id: string;
  
  /** Award name */
  name: string;
  
  /** Award description */
  description: string;
  
  /** Icon URL */
  icon_url: string;
  
  /** Icon width */
  icon_width: number;
  
  /** Icon height */
  icon_height: number;
  
  /** Number of this award given */
  count: number;
}

/**
 * Reddit media preview
 */
export interface RedditPreview {
  /** Image previews */
  images: Array<{
    /** Original source */
    source: RedditImage;
    
    /** Different resolutions */
    resolutions: RedditImage[];
    
    /** Preview ID */
    id: string;
  }>;
  
  /** Preview enabled */
  enabled: boolean;
}

/**
 * Reddit image data
 */
export interface RedditImage {
  /** Image URL */
  url: string;
  
  /** Image width */
  width: number;
  
  /** Image height */
  height: number;
}

/**
 * Reddit media information
 */
export interface RedditMedia {
  /** Media type */
  type?: string;
  
  /** OEmbed data */
  oembed?: {
    /** Provider name */
    provider_name: string;
    
    /** Media title */
    title: string;
    
    /** Media URL */
    url: string;
    
    /** Thumbnail URL */
    thumbnail_url?: string;
  };
  
  /** Reddit-hosted video */
  reddit_video?: {
    /** Video URL */
    fallback_url: string;
    
    /** Video height */
    height: number;
    
    /** Video width */
    width: number;
    
    /** Duration in seconds */
    duration: number;
  };
}

/**
 * Reddit API search response
 */
export interface RedditApiResponse {
  /** Response kind (always "Listing" for search) */
  kind: string;
  
  /** Response data */
  data: {
    /** Pagination token for next page */
    after: string | null;
    
    /** Pagination token for previous page */
    before: string | null;
    
    /** Array of result items */
    children: Array<{
      /** Item kind (t3 for posts, t1 for comments) */
      kind: string;
      
      /** Item data */
      data: RedditPost | RedditComment;
    }>;
    
    /** Distance for geo queries */
    dist: number | null;
    
    /** Modhash for requests */
    modhash: string;
  };
}

/**
 * OAuth2 token response
 */
export interface RedditOAuthResponse {
  /** Access token */
  access_token: string;
  
  /** Token type (always "bearer") */
  token_type: string;
  
  /** Expiration in seconds */
  expires_in: number;
  
  /** Granted scope */
  scope: string;
}

/**
 * Reddit search results for IdeaForge
 */
export interface RedditSearchResults {
  /** Array of posts */
  posts: RedditPost[];
  
  /** Array of comments */
  comments: RedditComment[];
  
  /** Search metadata */
  metadata?: {
    /** Searched subreddits */
    subreddits: string[];
    
    /** Total results found */
    totalResults: number;
    
    /** Number filtered out */
    filtered: number;
    
    /** Search duration in ms */
    searchTime: number;
  };
}

/**
 * Reddit webhook request format
 */
export interface RedditWebhookRequest {
  /** Search query */
  query: string;
  
  /** Target subreddits (optional) */
  subreddits?: string[];
  
  /** Search options */
  options?: {
    /** Sort method */
    sortBy?: 'relevance' | 'hot' | 'top' | 'new' | 'comments';
    
    /** Time filter */
    timeframe?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
    
    /** Result limit */
    limit?: number;
    
    /** Include comments in search */
    includeComments?: boolean;
    
    /** Include posts in search */
    includePosts?: boolean;
    
    /** Content filters */
    filters?: RedditContentFilters;
  };
}

/**
 * Content filtering options
 */
export interface RedditContentFilters {
  /** Remove NSFW content */
  removeNSFW?: boolean;
  
  /** Remove deleted content */
  removeDeleted?: boolean;
  
  /** Remove locked threads */
  removeLocked?: boolean;
  
  /** Remove controversial posts */
  removeControversial?: boolean;
  
  /** Minimum score threshold */
  minScore?: number;
  
  /** Minimum comments threshold */
  minComments?: number;
  
  /** Maximum age in days */
  maxAge?: number;
  
  /** Blacklisted authors */
  blacklistAuthors?: string[];
  
  /** Blacklisted domains */
  blacklistDomains?: string[];
  
  /** Require text content */
  requireText?: boolean;
}

/**
 * Reddit webhook response format
 */
export interface RedditWebhookResponse {
  /** Response status */
  status: 'success' | 'error' | 'rate_limited';
  
  /** Search results (if successful) */
  data?: {
    /** Found posts */
    posts: Array<{
      title: string;
      url: string;
      summary: string;
      subreddit: string;
      relevance: number;
    }>;
    
    /** Search metadata */
    metadata: {
      subreddits: string[];
      totalResults: number;
      filtered: number;
      searchTime: number;
    };
  };
  
  /** Error message (if failed) */
  error?: string;
  
  /** Error code */
  code?: string;
  
  /** Response metadata */
  metadata: {
    /** Results from cache */
    cached: boolean;
    
    /** Request duration */
    requestDuration: number;
    
    /** Response timestamp */
    timestamp: string;
    
    /** Session ID */
    sessionId: string;
    
    /** Rate limit used */
    rateLimitUsed?: number;
    
    /** Rate limit remaining */
    rateLimitRemaining?: number;
    
    /** Rate limit reset time */
    rateLimitReset?: number;
  };
}

/**
 * Rate limit information
 */
export interface RedditRateLimit {
  /** Requests used in current window */
  used: number;
  
  /** Requests remaining */
  remaining: number;
  
  /** Window reset timestamp (seconds) */
  reset: number;
  
  /** Reset as Date object */
  resetDate?: Date;
}

/**
 * Type guards for Reddit data
 */

/**
 * Check if object is a Reddit post
 */
export function isRedditPost(obj: any): obj is RedditPost {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.subreddit === 'string' &&
    typeof obj.author === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.score === 'number' &&
    obj.name?.startsWith('t3_')
  );
}

/**
 * Check if object is a Reddit comment
 */
export function isRedditComment(obj: any): obj is RedditComment {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.body === 'string' &&
    typeof obj.author === 'string' &&
    typeof obj.score === 'number' &&
    obj.name?.startsWith('t1_') &&
    obj.parent_id?.startsWith('t')
  );
}

/**
 * Validate Reddit webhook request
 */
export function validateRedditWebhookRequest(request: any): RedditWebhookRequest {
  if (!request.query || typeof request.query !== 'string') {
    throw new Error('Invalid query: must be a non-empty string');
  }
  
  const validated: RedditWebhookRequest = {
    query: request.query.trim()
  };
  
  if (request.subreddits) {
    if (!Array.isArray(request.subreddits)) {
      throw new Error('Subreddits must be an array');
    }
    validated.subreddits = request.subreddits
      .filter((s: any) => typeof s === 'string' && s.length > 0)
      .map((s: string) => s.trim());
  }
  
  if (request.options) {
    validated.options = {};
    
    // Validate sort
    const validSorts = ['relevance', 'hot', 'top', 'new', 'comments'];
    if (request.options.sortBy && validSorts.includes(request.options.sortBy)) {
      validated.options.sortBy = request.options.sortBy;
    }
    
    // Validate timeframe
    const validTimeframes = ['hour', 'day', 'week', 'month', 'year', 'all'];
    if (request.options.timeframe && validTimeframes.includes(request.options.timeframe)) {
      validated.options.timeframe = request.options.timeframe;
    }
    
    // Validate limit
    if (typeof request.options.limit === 'number') {
      validated.options.limit = Math.min(Math.max(1, request.options.limit), 100);
    }
    
    // Validate boolean options
    if (typeof request.options.includeComments === 'boolean') {
      validated.options.includeComments = request.options.includeComments;
    }
    
    if (typeof request.options.includePosts === 'boolean') {
      validated.options.includePosts = request.options.includePosts;
    }
    
    // Validate filters
    if (request.options.filters) {
      validated.options.filters = validateContentFilters(request.options.filters);
    }
  }
  
  return validated;
}

/**
 * Validate content filters
 */
function validateContentFilters(filters: any): RedditContentFilters {
  const validated: RedditContentFilters = {};
  
  // Boolean filters
  const booleanFilters = ['removeNSFW', 'removeDeleted', 'removeLocked', 'removeControversial', 'requireText'];
  booleanFilters.forEach(filter => {
    if (typeof filters[filter] === 'boolean') {
      validated[filter as keyof RedditContentFilters] = filters[filter];
    }
  });
  
  // Numeric filters
  if (typeof filters.minScore === 'number') {
    validated.minScore = Math.max(0, filters.minScore);
  }
  
  if (typeof filters.minComments === 'number') {
    validated.minComments = Math.max(0, filters.minComments);
  }
  
  if (typeof filters.maxAge === 'number') {
    validated.maxAge = Math.max(1, filters.maxAge);
  }
  
  // Array filters
  if (Array.isArray(filters.blacklistAuthors)) {
    validated.blacklistAuthors = filters.blacklistAuthors
      .filter((a: any) => typeof a === 'string');
  }
  
  if (Array.isArray(filters.blacklistDomains)) {
    validated.blacklistDomains = filters.blacklistDomains
      .filter((d: any) => typeof d === 'string');
  }
  
  return validated;
}

/**
 * Reddit error types
 */
export class RedditApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'RedditApiError';
  }
}

export class RedditAuthError extends RedditApiError {
  constructor(message: string) {
    super(message, 'REDDIT_AUTH_ERROR', 401);
    this.name = 'RedditAuthError';
  }
}

export class RedditRateLimitError extends RedditApiError {
  constructor(message: string, retryAfter?: number) {
    super(message, 'REDDIT_RATE_LIMIT', 429, retryAfter);
    this.name = 'RedditRateLimitError';
  }
} 