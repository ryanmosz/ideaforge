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

// Result types (placeholders for now)
export interface HNSearchResults {
  hits: any[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  processingTimeMS: number;
  query: string;
}

export interface RedditSearchResults {
  posts?: any[];
  comments?: any[];
  query: string;
  subreddits: string[];
} 