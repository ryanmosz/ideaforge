// n8n client configuration and types

export interface N8nConfig {
  baseUrl: string;
  webhookPath: string;
  apiKey: string;
  timeout: number;
  retries: number;
}

export interface N8nRequest<T = any> {
  action: string;
  payload: T;
  sessionId: string;
  metadata?: {
    timestamp: number;
    version: string;
    source: string;
  };
}

export interface N8nResponse<T = any> {
  status: 'success' | 'error' | 'rate_limited' | 'cached';
  data?: T;
  error?: string;
  metadata?: {
    cached: boolean;
    cacheAge?: number;
    requestDuration: number;
    rateLimitRemaining?: number;
  };
}

// Health check types
export interface HealthCheckResponse {
  status: string;
  service: string;
  timestamp: string;
  webhooks: {
    hackernews: WebhookInfo;
    reddit: WebhookInfo;
    health: WebhookInfo;
  };
  message: string;
  version: string;
}

export interface WebhookInfo {
  url: string;
  method: string;
  authentication: string;
  active: boolean;
}

// Search option types
export interface HNSearchOptions {
  limit?: number;
  dateRange?: 'last_24h' | 'last_week' | 'last_month' | 'last_year' | 'all';
  sortBy?: 'relevance' | 'date' | 'points';
  tags?: string[];
}

export interface RedditSearchOptions {
  subreddits?: string[];
  sortBy?: 'relevance' | 'hot' | 'top' | 'new';
  timeframe?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  limit?: number;
  includeComments?: boolean;
}

// Payload types
export interface HNSearchPayload {
  query: string;
  options: Required<HNSearchOptions>;
}

export interface RedditSearchPayload {
  query: string;
  subreddits: string[];
  options: {
    sortBy: string;
    timeframe: string;
    limit: number;
    includeComments: boolean;
  };
}

// HackerNews result types
export interface HNHit {
  objectID: string;
  title?: string;
  story_title?: string;
  comment_text?: string;
  story_text?: string;
  url?: string;
  author: string;
  points?: number;
  num_comments?: number;
  created_at: string;
  _tags?: string[];
  _highlightResult?: any;
}

export interface HNSearchResults {
  hits: HNHit[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  processingTimeMS: number;
  query: string;
}

// Reddit result types
export interface RedditPost {
  id: string;
  title: string;
  selftext?: string;
  permalink: string;
  author: string;
  subreddit: string;
  ups: number;
  downs: number;
  upvote_ratio?: number;
  num_comments: number;
  created_utc: number;
  is_video?: boolean;
  all_awardings?: any[];
}

export interface RedditComment {
  id: string;
  body: string;
  permalink: string;
  author: string;
  subreddit: string;
  ups: number;
  downs: number;
  created_utc: number;
  parent_id: string;
  link_id: string;
  link_title?: string;
  depth?: number;
}

export interface RedditSearchResults {
  posts?: RedditPost[];
  comments?: RedditComment[];
  query: string;
  subreddits: string[];
} 