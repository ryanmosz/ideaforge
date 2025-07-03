/**
 * HackerNews-specific type definitions
 * These types define the structure of data from the Algolia HN API
 */

// Raw API response types
export interface HNSearchResponse {
  hits: HNHit[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  exhaustiveNbHits: boolean;
  query: string;
  params: string;
  processingTimeMS: number;
}

export interface HNHit {
  objectID: string;
  title?: string;
  url?: string;
  author: string;
  points?: number;
  story_title?: string;
  comment_text?: string;
  story_text?: string;
  num_comments?: number;
  story_id?: string;
  parent_id?: string;
  created_at: string;
  created_at_i: number;
  _tags: string[];
  _highlightResult?: HNHighlightResult;
}

export interface HNHighlightResult {
  title?: HighlightField;
  story_title?: HighlightField;
  comment_text?: HighlightField;
  story_text?: HighlightField;
  author?: HighlightField;
}

export interface HighlightField {
  value: string;
  matchLevel: 'none' | 'partial' | 'full';
  fullyHighlighted?: boolean;
  matchedWords: string[];
}

// Processed types after transformation
export interface ProcessedHNHit {
  objectID: string;
  type: 'story' | 'comment' | 'poll' | 'job';
  title: string;
  content: string;
  extractedContent?: string;
  url: string;
  author: string;
  points: number;
  numComments: number;
  createdAt: string;
  createdAtTimestamp: number;
  tags: string[];
  highlights?: HNHighlightResult;
  
  // Additional metadata
  storyId: string;
  parentId?: string;
  age: number;
  engagement: number;
  relevanceScore: number;
  
  // Technology-specific metadata
  technologies?: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  isQuestion?: boolean;
  hasCodeExample?: boolean;
}

// Request types
export interface HNSearchRequest {
  query: string;
  sessionId: string;
  options?: HNSearchOptions;
}

export interface HNSearchOptions {
  limit?: number;
  dateRange?: 'last_24h' | 'last_week' | 'last_month' | 'last_year' | 'all';
  sortBy?: 'relevance' | 'date' | 'points';
  tags?: string[];
  minPoints?: number;
  includeComments?: boolean;
  includeStories?: boolean;
  page?: number;
}

// Webhook response format
export interface HNWebhookResponse {
  status: 'success' | 'error' | 'rate_limited';
  data?: ProcessedHNHit[];
  error?: string;
  metadata: {
    cached: boolean;
    requestDuration: number;
    timestamp: string;
    sessionId: string;
    query: string;
    totalHits: number;
    returnedHits: number;
    algoliaProcessingTime: number;
    rateLimitRemaining?: number;
    scoring?: {
      method: string;
      totalScored: number;
      filtered: number;
    };
  };
}

// Type guards
export function isHNHit(obj: any): obj is HNHit {
  return (
    typeof obj === 'object' &&
    typeof obj.objectID === 'string' &&
    typeof obj.author === 'string' &&
    typeof obj.created_at === 'string' &&
    typeof obj.created_at_i === 'number' &&
    Array.isArray(obj._tags)
  );
}

export function isHNSearchResponse(obj: any): obj is HNSearchResponse {
  return (
    typeof obj === 'object' &&
    Array.isArray(obj.hits) &&
    typeof obj.nbHits === 'number' &&
    typeof obj.query === 'string' &&
    typeof obj.processingTimeMS === 'number' &&
    obj.hits.every(isHNHit)
  );
}

export function isProcessedHNHit(obj: any): obj is ProcessedHNHit {
  return (
    typeof obj === 'object' &&
    typeof obj.objectID === 'string' &&
    ['story', 'comment', 'poll', 'job'].includes(obj.type) &&
    typeof obj.title === 'string' &&
    typeof obj.url === 'string' &&
    typeof obj.relevanceScore === 'number'
  );
}

// Validators
export function validateHNSearchRequest(request: any): HNSearchRequest {
  if (!request.query || typeof request.query !== 'string') {
    throw new Error('Invalid query: must be a non-empty string');
  }
  
  if (!request.sessionId || typeof request.sessionId !== 'string') {
    throw new Error('Invalid sessionId: must be a non-empty string');
  }
  
  const validated: HNSearchRequest = {
    query: request.query.trim().substring(0, 200), // Max 200 chars
    sessionId: request.sessionId
  };
  
  if (request.options) {
    validated.options = validateHNSearchOptions(request.options);
  }
  
  return validated;
}

export function validateHNSearchOptions(options: any): HNSearchOptions {
  const validated: HNSearchOptions = {};
  
  if (options.limit !== undefined) {
    validated.limit = Math.min(Math.max(1, Number(options.limit) || 30), 100);
  }
  
  if (options.dateRange) {
    const validRanges = ['last_24h', 'last_week', 'last_month', 'last_year', 'all'];
    if (validRanges.includes(options.dateRange)) {
      validated.dateRange = options.dateRange;
    }
  }
  
  if (options.sortBy) {
    const validSorts = ['relevance', 'date', 'points'];
    if (validSorts.includes(options.sortBy)) {
      validated.sortBy = options.sortBy;
    }
  }
  
  if (Array.isArray(options.tags)) {
    validated.tags = options.tags.filter((tag: any) => typeof tag === 'string');
  }
  
  if (options.minPoints !== undefined) {
    validated.minPoints = Math.max(0, Number(options.minPoints) || 0);
  }
  
  if (typeof options.includeComments === 'boolean') {
    validated.includeComments = options.includeComments;
  }
  
  if (typeof options.includeStories === 'boolean') {
    validated.includeStories = options.includeStories;
  }
  
  if (options.page !== undefined) {
    validated.page = Math.max(0, Number(options.page) || 0);
  }
  
  return validated;
}

// Utility types
export type HNItemType = 'story' | 'comment' | 'poll' | 'job';

export interface HNScoringMetrics {
  titleRelevance: number;
  contentRelevance: number;
  authorReputation: number;
  recencyBonus: number;
  engagementScore: number;
  technologyBonus: number;
  totalScore: number;
}

// Error types specific to HN
export class HNAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public apiError?: string
  ) {
    super(message);
    this.name = 'HNAPIError';
  }
}

export class HNRateLimitError extends Error {
  constructor(
    public retryAfter: number,
    message = 'HackerNews API rate limit exceeded'
  ) {
    super(message);
    this.name = 'HNRateLimitError';
  }
} 