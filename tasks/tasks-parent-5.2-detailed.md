# Task 5.2 Detailed Implementation: Build communication bridge to LangGraph

## Overview
This task creates the crucial integration layer between the LangGraph agent and n8n webhooks. The bridge enables seamless communication, allowing LangGraph nodes to request external data through n8n workflows while maintaining clean separation of concerns.

## Implementation Details

### 5.2.1 Create n8n client service class

**Objective**: Build a TypeScript client that encapsulates all n8n webhook communication.

**File Structure**:
```typescript
// src/services/n8n-client.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { N8nConfig, N8nRequest, N8nResponse } from '../types/n8n-types';

export class N8nClient {
  private client: AxiosInstance;
  private config: N8nConfig;
  
  constructor(config?: Partial<N8nConfig>) {
    this.config = {
      baseUrl: process.env.N8N_BASE_URL || 'http://localhost:5678',
      webhookPath: process.env.N8N_WEBHOOK_PATH || 'webhook',
      apiKey: process.env.N8N_API_KEY || '',
      timeout: parseInt(process.env.N8N_TIMEOUT || '30000'),
      retries: parseInt(process.env.N8N_RETRIES || '3'),
      ...config
    };
    
    this.client = axios.create({
      baseURL: `${this.config.baseUrl}/${this.config.webhookPath}`,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey
      }
    });
    
    this.setupInterceptors();
  }
  
  private setupInterceptors(): void {
    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[N8n Client] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[N8n Client] Request error:', error);
        return Promise.reject(error);
      }
    );
    
    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.code === 'ECONNABORTED') {
          throw new Error('Request timeout - n8n webhook did not respond');
        }
        throw error;
      }
    );
  }
}
```

**Type Definitions**:
```typescript
// src/types/n8n-types.ts
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
```

**Environment Configuration**:
```typescript
// src/config/n8n-config.ts
import { N8nConfig } from '../types/n8n-types';

export const getN8nConfig = (): N8nConfig => {
  const config: N8nConfig = {
    baseUrl: process.env.N8N_BASE_URL || 'http://localhost:5678',
    webhookPath: process.env.N8N_WEBHOOK_PATH || 'webhook',
    apiKey: process.env.N8N_API_KEY || '',
    timeout: parseInt(process.env.N8N_TIMEOUT || '30000'),
    retries: parseInt(process.env.N8N_RETRIES || '3')
  };
  
  // Validate required fields
  if (!config.apiKey) {
    throw new Error('N8N_API_KEY environment variable is required');
  }
  
  return config;
};
```

### 5.2.2 Implement webhook request methods

**Objective**: Create specific methods for each n8n webhook endpoint.

**Implementation**:
```typescript
// src/services/n8n-client.ts (continued)
export class N8nClient {
  // ... previous code ...
  
  async searchHackerNews(
    query: string, 
    sessionId: string,
    options?: HNSearchOptions
  ): Promise<HNSearchResults> {
    const request: N8nRequest<HNSearchPayload> = {
      action: 'searchHackerNews',
      payload: {
        query,
        options: {
          limit: options?.limit || 20,
          dateRange: options?.dateRange || 'all',
          sortBy: options?.sortBy || 'relevance',
          tags: options?.tags || ['story', 'comment']
        }
      },
      sessionId,
      metadata: this.createMetadata()
    };
    
    const response = await this.post<HNSearchResults>('/ideaforge/hackernews-search', request);
    return response.data;
  }
  
  async searchReddit(
    query: string,
    sessionId: string,
    options?: RedditSearchOptions
  ): Promise<RedditSearchResults> {
    const request: N8nRequest<RedditSearchPayload> = {
      action: 'searchReddit',
      payload: {
        query,
        subreddits: options?.subreddits || [],
        options: {
          sortBy: options?.sortBy || 'relevance',
          timeframe: options?.timeframe || 'all',
          limit: options?.limit || 25,
          includeComments: options?.includeComments ?? true
        }
      },
      sessionId,
      metadata: this.createMetadata()
    };
    
    const response = await this.post<RedditSearchResults>('/ideaforge/reddit-search', request);
    return response.data;
  }
  
  async checkHealth(): Promise<HealthCheckResponse> {
    const response = await this.get<HealthCheckResponse>('/ideaforge/health');
    return response.data;
  }
  
  private createMetadata() {
    return {
      timestamp: Date.now(),
      version: '1.0.0',
      source: 'langgraph-agent'
    };
  }
  
  private async post<T>(endpoint: string, data: any): Promise<N8nResponse<T>> {
    try {
      const response = await this.client.post<N8nResponse<T>>(endpoint, data);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  private async get<T>(endpoint: string): Promise<N8nResponse<T>> {
    try {
      const response = await this.client.get<N8nResponse<T>>(endpoint);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }
}
```

**Search Option Types**:
```typescript
// src/types/n8n-types.ts (continued)
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
```

### 5.2.3 Add timeout and retry logic

**Objective**: Implement robust error handling with configurable retry behavior.

**Implementation**:
```typescript
// src/utils/retry-handler.ts
export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export class RetryHandler {
  constructor(private config: RetryConfig) {}
  
  async execute<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (!this.shouldRetry(error, attempt)) {
          throw error;
        }
        
        const delay = this.calculateDelay(attempt);
        console.log(`[Retry] ${context} - Attempt ${attempt + 1}/${this.config.maxRetries + 1} failed. Retrying in ${delay}ms...`);
        
        await this.sleep(delay);
      }
    }
    
    throw new Error(`Operation failed after ${this.config.maxRetries + 1} attempts: ${lastError.message}`);
  }
  
  private shouldRetry(error: any, attempt: number): boolean {
    if (attempt >= this.config.maxRetries) {
      return false;
    }
    
    // Check if error is retryable
    const errorCode = error.code || error.response?.status?.toString();
    return this.config.retryableErrors.includes(errorCode) ||
           error.code === 'ECONNREFUSED' ||
           error.code === 'ETIMEDOUT' ||
           error.response?.status === 429 || // Rate limited
           error.response?.status >= 500;    // Server errors
  }
  
  private calculateDelay(attempt: number): number {
    const exponentialDelay = this.config.initialDelay * Math.pow(this.config.backoffMultiplier, attempt);
    const jitteredDelay = exponentialDelay * (0.5 + Math.random() * 0.5); // Add jitter
    return Math.min(jitteredDelay, this.config.maxDelay);
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

**Integration with N8nClient**:
```typescript
// src/services/n8n-client.ts (updated)
import { RetryHandler, RetryConfig } from '../utils/retry-handler';

export class N8nClient {
  private retryHandler: RetryHandler;
  
  constructor(config?: Partial<N8nConfig>) {
    // ... previous constructor code ...
    
    const retryConfig: RetryConfig = {
      maxRetries: this.config.retries,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      retryableErrors: ['ECONNREFUSED', 'ETIMEDOUT', '429', '500', '502', '503', '504']
    };
    
    this.retryHandler = new RetryHandler(retryConfig);
  }
  
  private async post<T>(endpoint: string, data: any): Promise<N8nResponse<T>> {
    return this.retryHandler.execute(
      async () => {
        const response = await this.client.post<N8nResponse<T>>(endpoint, data);
        return response.data;
      },
      `POST ${endpoint}`
    );
  }
}
```

### 5.2.4 Create response transformation layer

**Objective**: Transform n8n webhook responses into formats expected by LangGraph nodes.

**Implementation**:
```typescript
// src/services/response-transformer.ts
import { HNSearchResults, RedditSearchResults } from '../types/n8n-types';
import { ResearchResult, ResearchSource } from '../agents/types';

export class ResponseTransformer {
  transformHackerNewsResults(raw: HNSearchResults): ResearchResult[] {
    return raw.hits.map(hit => ({
      id: hit.objectID,
      source: 'hackernews' as ResearchSource,
      title: hit.title || hit.story_title || 'Untitled',
      url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      content: this.extractHNContent(hit),
      score: this.calculateHNRelevance(hit),
      metadata: {
        author: hit.author,
        points: hit.points || 0,
        numComments: hit.num_comments || 0,
        createdAt: hit.created_at,
        tags: hit._tags || [],
        highlights: hit._highlightResult
      }
    }));
  }
  
  transformRedditResults(raw: RedditSearchResults): ResearchResult[] {
    const results: ResearchResult[] = [];
    
    // Transform posts
    if (raw.posts) {
      results.push(...raw.posts.map(post => ({
        id: post.id,
        source: 'reddit' as ResearchSource,
        title: post.title,
        url: `https://reddit.com${post.permalink}`,
        content: post.selftext || post.title,
        score: this.calculateRedditRelevance(post),
        metadata: {
          author: post.author,
          subreddit: post.subreddit,
          upvotes: post.ups,
          upvoteRatio: post.upvote_ratio,
          numComments: post.num_comments,
          createdAt: new Date(post.created_utc * 1000).toISOString(),
          isVideo: post.is_video,
          awards: post.all_awardings?.length || 0
        }
      })));
    }
    
    // Transform comments
    if (raw.comments) {
      results.push(...raw.comments.map(comment => ({
        id: comment.id,
        source: 'reddit' as ResearchSource,
        title: `Comment on: ${comment.link_title}`,
        url: `https://reddit.com${comment.permalink}`,
        content: comment.body,
        score: this.calculateRedditCommentRelevance(comment),
        metadata: {
          author: comment.author,
          subreddit: comment.subreddit,
          upvotes: comment.ups,
          createdAt: new Date(comment.created_utc * 1000).toISOString(),
          isTopLevel: !comment.parent_id.startsWith('t1_'),
          postId: comment.link_id
        }
      })));
    }
    
    return results;
  }
  
  private extractHNContent(hit: any): string {
    // Prefer comment text, then story text, then title
    return hit.comment_text || hit.story_text || hit.title || '';
  }
  
  private calculateHNRelevance(hit: any): number {
    const baseScore = hit.points || 0;
    const commentBoost = (hit.num_comments || 0) * 2;
    const recencyPenalty = this.getRecencyPenalty(hit.created_at);
    
    return Math.max(0, baseScore + commentBoost - recencyPenalty);
  }
  
  private calculateRedditRelevance(post: any): number {
    const upvotes = post.ups || 0;
    const ratio = post.upvote_ratio || 0.5;
    const comments = post.num_comments || 0;
    const awards = post.all_awardings?.length || 0;
    
    return upvotes * ratio + (comments * 3) + (awards * 50);
  }
  
  private calculateRedditCommentRelevance(comment: any): number {
    const upvotes = comment.ups || 0;
    const depth = comment.depth || 0;
    const depthPenalty = depth * 10;
    
    return Math.max(0, upvotes - depthPenalty);
  }
  
  private getRecencyPenalty(createdAt: string): number {
    const ageInDays = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return Math.floor(ageInDays / 30) * 10; // -10 points per month old
  }
}
```

**Result Type Definitions**:
```typescript
// src/agents/types.ts (additions)
export type ResearchSource = 'hackernews' | 'reddit' | 'documentation' | 'other';

export interface ResearchResult {
  id: string;
  source: ResearchSource;
  title: string;
  url: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
}

export interface ResearchSummary {
  query: string;
  timestamp: number;
  totalResults: number;
  topResults: ResearchResult[];
  insights: string[];
  recommendations: string[];
}
```

### 5.2.5 Build LangGraph bridge interface

**Objective**: Create the interface that LangGraph nodes use to access n8n functionality.

**Implementation**:
```typescript
// src/agents/bridges/n8n-bridge.ts
import { N8nClient } from '../../services/n8n-client';
import { ResponseTransformer } from '../../services/response-transformer';
import { ProjectState } from '../state';
import { ResearchResult, ResearchSummary } from '../types';

export interface N8nBridgeConfig {
  client?: N8nClient;
  transformer?: ResponseTransformer;
  cacheResults?: boolean;
  maxResultsPerSource?: number;
}

export class N8nBridge {
  private client: N8nClient;
  private transformer: ResponseTransformer;
  private config: Required<N8nBridgeConfig>;
  
  constructor(config?: N8nBridgeConfig) {
    this.config = {
      client: config?.client || new N8nClient(),
      transformer: config?.transformer || new ResponseTransformer(),
      cacheResults: config?.cacheResults ?? true,
      maxResultsPerSource: config?.maxResultsPerSource || 10
    };
    
    this.client = this.config.client;
    this.transformer = this.config.transformer;
  }
  
  async researchTechnology(
    technology: string,
    context: ProjectState
  ): Promise<ResearchSummary> {
    console.log(`[N8n Bridge] Researching technology: ${technology}`);
    
    const sessionId = context.sessionId || 'default';
    const results: ResearchResult[] = [];
    
    // Parallel research across sources
    const [hnResults, redditResults] = await Promise.allSettled([
      this.searchHackerNews(technology, sessionId),
      this.searchReddit(technology, sessionId)
    ]);
    
    // Process HN results
    if (hnResults.status === 'fulfilled') {
      results.push(...hnResults.value.slice(0, this.config.maxResultsPerSource));
    } else {
      console.error('[N8n Bridge] HackerNews search failed:', hnResults.reason);
    }
    
    // Process Reddit results
    if (redditResults.status === 'fulfilled') {
      results.push(...redditResults.value.slice(0, this.config.maxResultsPerSource));
    } else {
      console.error('[N8n Bridge] Reddit search failed:', redditResults.reason);
    }
    
    // Sort by relevance score
    results.sort((a, b) => b.score - a.score);
    
    return {
      query: technology,
      timestamp: Date.now(),
      totalResults: results.length,
      topResults: results.slice(0, 20),
      insights: this.extractInsights(results),
      recommendations: this.generateRecommendations(results, technology)
    };
  }
  
  async researchMultipleTechnologies(
    technologies: string[],
    context: ProjectState
  ): Promise<Map<string, ResearchSummary>> {
    console.log(`[N8n Bridge] Researching ${technologies.length} technologies`);
    
    const results = new Map<string, ResearchSummary>();
    
    // Batch research with concurrency limit
    const batchSize = 3;
    for (let i = 0; i < technologies.length; i += batchSize) {
      const batch = technologies.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(tech => this.researchTechnology(tech, context))
      );
      
      batch.forEach((tech, index) => {
        const result = batchResults[index];
        if (result.status === 'fulfilled') {
          results.set(tech, result.value);
        } else {
          console.error(`[N8n Bridge] Failed to research ${tech}:`, result.reason);
          results.set(tech, this.createEmptyResearchSummary(tech));
        }
      });
    }
    
    return results;
  }
  
  private async searchHackerNews(
    query: string,
    sessionId: string
  ): Promise<ResearchResult[]> {
    try {
      const response = await this.client.searchHackerNews(query, sessionId, {
        limit: 30,
        sortBy: 'relevance',
        dateRange: 'last_year'
      });
      
      return this.transformer.transformHackerNewsResults(response);
    } catch (error) {
      console.error('[N8n Bridge] HN search error:', error);
      return [];
    }
  }
  
  private async searchReddit(
    query: string,
    sessionId: string
  ): Promise<ResearchResult[]> {
    try {
      const response = await this.client.searchReddit(query, sessionId, {
        limit: 30,
        sortBy: 'relevance',
        timeframe: 'year',
        subreddits: this.getTechSubreddits(query)
      });
      
      return this.transformer.transformRedditResults(response);
    } catch (error) {
      console.error('[N8n Bridge] Reddit search error:', error);
      return [];
    }
  }
  
  private getTechSubreddits(query: string): string[] {
    const baseSubreddits = ['programming', 'webdev', 'learnprogramming'];
    
    // Add query-specific subreddits
    const queryLower = query.toLowerCase();
    if (queryLower.includes('javascript') || queryLower.includes('typescript')) {
      baseSubreddits.push('javascript', 'typescript', 'node');
    }
    if (queryLower.includes('python')) {
      baseSubreddits.push('python', 'learnpython');
    }
    if (queryLower.includes('react')) {
      baseSubreddits.push('reactjs', 'reactnative');
    }
    // Add more query-specific subreddit logic as needed
    
    return [...new Set(baseSubreddits)];
  }
  
  private extractInsights(results: ResearchResult[]): string[] {
    const insights: string[] = [];
    
    // Analyze common themes
    const contentWords = results
      .map(r => r.content.toLowerCase().split(/\s+/))
      .flat()
      .filter(word => word.length > 4);
    
    const wordFreq = new Map<string, number>();
    contentWords.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });
    
    // Find top themes
    const topWords = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
    
    if (topWords.length > 0) {
      insights.push(`Common themes: ${topWords.slice(0, 5).join(', ')}`);
    }
    
    // Analyze sentiment
    const positiveCount = results.filter(r => 
      r.content.match(/great|excellent|amazing|love|awesome/i)
    ).length;
    
    const negativeCount = results.filter(r => 
      r.content.match(/bad|terrible|awful|hate|problem/i)
    ).length;
    
    if (positiveCount > negativeCount * 2) {
      insights.push('Community sentiment is largely positive');
    } else if (negativeCount > positiveCount * 2) {
      insights.push('Community has raised significant concerns');
    }
    
    return insights;
  }
  
  private generateRecommendations(results: ResearchResult[], technology: string): string[] {
    const recommendations: string[] = [];
    
    // Check for alternatives mentioned
    const alternativePattern = /instead of|alternative|better than|vs\.|versus/i;
    const alternativeMentions = results.filter(r => 
      alternativePattern.test(r.content)
    );
    
    if (alternativeMentions.length > 0) {
      recommendations.push(`Consider exploring alternatives to ${technology} mentioned in discussions`);
    }
    
    // Check for security concerns
    const securityPattern = /security|vulnerability|CVE|exploit/i;
    const securityConcerns = results.filter(r => 
      securityPattern.test(r.content)
    );
    
    if (securityConcerns.length > 0) {
      recommendations.push(`Review security considerations for ${technology}`);
    }
    
    // Check for performance discussions
    const performancePattern = /performance|slow|fast|optimization|bottleneck/i;
    const performanceDiscussions = results.filter(r => 
      performancePattern.test(r.content)
    );
    
    if (performanceDiscussions.length > 3) {
      recommendations.push(`Performance is a key consideration for ${technology}`);
    }
    
    return recommendations;
  }
  
  private createEmptyResearchSummary(query: string): ResearchSummary {
    return {
      query,
      timestamp: Date.now(),
      totalResults: 0,
      topResults: [],
      insights: ['No research data available'],
      recommendations: ['Try searching manually for more information']
    };
  }
}
```

### 5.2.6 Implement session correlation

**Objective**: Track requests across sessions for debugging and analytics.

**Implementation**:
```typescript
// src/services/session-tracker.ts
export interface SessionMetadata {
  sessionId: string;
  startTime: number;
  lastActivity: number;
  requestCount: number;
  technologies: Set<string>;
  errors: Array<{
    timestamp: number;
    error: string;
    context: string;
  }>;
}

export class SessionTracker {
  private sessions: Map<string, SessionMetadata> = new Map();
  private readonly maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours
  
  trackRequest(sessionId: string, technology: string): void {
    const now = Date.now();
    
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        sessionId,
        startTime: now,
        lastActivity: now,
        requestCount: 0,
        technologies: new Set(),
        errors: []
      });
    }
    
    const session = this.sessions.get(sessionId)!;
    session.lastActivity = now;
    session.requestCount++;
    session.technologies.add(technology);
    
    // Clean up old sessions
    this.cleanupSessions();
  }
  
  trackError(sessionId: string, error: string, context: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.errors.push({
        timestamp: Date.now(),
        error,
        context
      });
    }
  }
  
  getSessionMetrics(sessionId: string): SessionMetadata | undefined {
    return this.sessions.get(sessionId);
  }
  
  getAllSessionMetrics(): SessionMetadata[] {
    return Array.from(this.sessions.values());
  }
  
  private cleanupSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions) {
      if (now - session.lastActivity > this.maxSessionAge) {
        this.sessions.delete(sessionId);
      }
    }
  }
}
```

**Integration with N8nBridge**:
```typescript
// src/agents/bridges/n8n-bridge.ts (updated)
export class N8nBridge {
  private sessionTracker: SessionTracker;
  
  constructor(config?: N8nBridgeConfig) {
    // ... previous constructor code ...
    this.sessionTracker = new SessionTracker();
  }
  
  async researchTechnology(
    technology: string,
    context: ProjectState
  ): Promise<ResearchSummary> {
    const sessionId = context.sessionId || 'default';
    
    // Track the request
    this.sessionTracker.trackRequest(sessionId, technology);
    
    try {
      // ... existing research code ...
    } catch (error) {
      this.sessionTracker.trackError(
        sessionId,
        error.message,
        `researchTechnology: ${technology}`
      );
      throw error;
    }
  }
}
```

### 5.2.7 Add error handling and fallbacks

**Objective**: Implement comprehensive error handling to ensure the agent continues functioning even when external services fail.

**Implementation**:
```typescript
// src/utils/error-types.ts
export class N8nError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: any
  ) {
    super(message);
    this.name = 'N8nError';
  }
}

export class WebhookError extends N8nError {
  constructor(message: string, public statusCode?: number) {
    super(message, 'WEBHOOK_ERROR');
  }
}

export class RateLimitError extends N8nError {
  constructor(
    message: string,
    public retryAfter?: number
  ) {
    super(message, 'RATE_LIMIT');
  }
}

export class TimeoutError extends N8nError {
  constructor(message: string) {
    super(message, 'TIMEOUT');
  }
}
```

**Error Handler**:
```typescript
// src/services/n8n-error-handler.ts
export class N8nErrorHandler {
  handleError(error: any): N8nResponse<any> {
    console.error('[N8n Error Handler]', error);
    
    // Timeout errors
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return {
        status: 'error',
        error: 'Request timed out',
        metadata: {
          cached: false,
          requestDuration: -1
        }
      };
    }
    
    // Rate limit errors
    if (error.response?.status === 429) {
      const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
      return {
        status: 'rate_limited',
        error: `Rate limited. Retry after ${retryAfter} seconds`,
        metadata: {
          cached: false,
          requestDuration: -1,
          rateLimitRemaining: 0
        }
      };
    }
    
    // Network errors
    if (error.code === 'ECONNREFUSED') {
      return {
        status: 'error',
        error: 'Cannot connect to n8n service',
        metadata: {
          cached: false,
          requestDuration: -1
        }
      };
    }
    
    // Authentication errors
    if (error.response?.status === 401) {
      return {
        status: 'error',
        error: 'Authentication failed - check API key',
        metadata: {
          cached: false,
          requestDuration: -1
        }
      };
    }
    
    // Default error
    return {
      status: 'error',
      error: error.message || 'Unknown error occurred',
      metadata: {
        cached: false,
        requestDuration: -1
      }
    };
  }
  
  createFallbackResponse<T>(error: any, fallbackData: T): N8nResponse<T> {
    const errorResponse = this.handleError(error);
    return {
      ...errorResponse,
      data: fallbackData,
      metadata: {
        ...errorResponse.metadata,
        fallback: true
      }
    };
  }
}
```

**Fallback Strategies**:
```typescript
// src/agents/bridges/n8n-bridge.ts (updated)
export class N8nBridge {
  private errorHandler: N8nErrorHandler;
  
  constructor(config?: N8nBridgeConfig) {
    // ... previous constructor code ...
    this.errorHandler = new N8nErrorHandler();
  }
  
  async researchTechnology(
    technology: string,
    context: ProjectState
  ): Promise<ResearchSummary> {
    try {
      // ... existing research code ...
    } catch (error) {
      console.error(`[N8n Bridge] Research failed for ${technology}:`, error);
      
      // Try to use cached data if available
      const cachedResults = await this.getCachedResults(technology);
      if (cachedResults) {
        console.log(`[N8n Bridge] Using cached results for ${technology}`);
        return cachedResults;
      }
      
      // Return minimal fallback data
      return {
        query: technology,
        timestamp: Date.now(),
        totalResults: 0,
        topResults: [],
        insights: ['External research unavailable - using fallback'],
        recommendations: [
          `Consider manual research for ${technology}`,
          'External API services may be temporarily unavailable'
        ]
      };
    }
  }
  
  private async getCachedResults(technology: string): Promise<ResearchSummary | null> {
    // This would integrate with the caching system from task 5.5
    // For now, return null
    return null;
  }
}
```

### 5.2.8 Write comprehensive unit tests

**Objective**: Ensure reliability through thorough testing of all bridge components.

**Test Suite**:
```typescript
// tests/agents/bridges/n8n-bridge.test.ts
import { N8nBridge } from '../../../src/agents/bridges/n8n-bridge';
import { N8nClient } from '../../../src/services/n8n-client';
import { ProjectState } from '../../../src/agents/state';

jest.mock('../../../src/services/n8n-client');

describe('N8nBridge', () => {
  let bridge: N8nBridge;
  let mockClient: jest.Mocked<N8nClient>;
  let mockState: ProjectState;
  
  beforeEach(() => {
    mockClient = new N8nClient() as jest.Mocked<N8nClient>;
    bridge = new N8nBridge({ client: mockClient });
    mockState = {
      sessionId: 'test-session',
      documents: [],
      analysis: {},
      research: {},
      refinements: []
    } as ProjectState;
  });
  
  describe('researchTechnology', () => {
    it('should combine results from HN and Reddit', async () => {
      mockClient.searchHackerNews.mockResolvedValue({
        hits: [
          {
            objectID: '1',
            title: 'Test HN Result',
            url: 'https://example.com',
            author: 'testuser',
            points: 100,
            num_comments: 50,
            created_at: '2024-01-01T00:00:00Z'
          }
        ]
      });
      
      mockClient.searchReddit.mockResolvedValue({
        posts: [
          {
            id: 'r1',
            title: 'Test Reddit Post',
            selftext: 'Test content',
            author: 'redditor',
            subreddit: 'programming',
            ups: 200,
            upvote_ratio: 0.95,
            num_comments: 30,
            created_utc: 1704067200,
            permalink: '/r/programming/test'
          }
        ],
        comments: []
      });
      
      const result = await bridge.researchTechnology('typescript', mockState);
      
      expect(result.query).toBe('typescript');
      expect(result.totalResults).toBe(2);
      expect(result.topResults).toHaveLength(2);
      expect(result.topResults[0].source).toBe('reddit'); // Higher score
      expect(result.topResults[1].source).toBe('hackernews');
    });
    
    it('should handle partial failures gracefully', async () => {
      mockClient.searchHackerNews.mockRejectedValue(new Error('HN API Error'));
      mockClient.searchReddit.mockResolvedValue({
        posts: [{
          id: 'r1',
          title: 'Reddit works',
          selftext: 'Content',
          author: 'user',
          subreddit: 'test',
          ups: 10,
          created_utc: 1704067200,
          permalink: '/r/test/post'
        }],
        comments: []
      });
      
      const result = await bridge.researchTechnology('react', mockState);
      
      expect(result.totalResults).toBe(1);
      expect(result.topResults[0].source).toBe('reddit');
      expect(result.insights).toContain('No research data available');
    });
    
    it('should handle complete failure with fallback', async () => {
      mockClient.searchHackerNews.mockRejectedValue(new Error('Network error'));
      mockClient.searchReddit.mockRejectedValue(new Error('Network error'));
      
      const result = await bridge.researchTechnology('vue', mockState);
      
      expect(result.totalResults).toBe(0);
      expect(result.insights).toContain('External research unavailable - using fallback');
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });
  
  describe('researchMultipleTechnologies', () => {
    it('should batch requests efficiently', async () => {
      mockClient.searchHackerNews.mockResolvedValue({ hits: [] });
      mockClient.searchReddit.mockResolvedValue({ posts: [], comments: [] });
      
      const technologies = ['react', 'vue', 'angular', 'svelte', 'solid'];
      const results = await bridge.researchMultipleTechnologies(technologies, mockState);
      
      expect(results.size).toBe(5);
      technologies.forEach(tech => {
        expect(results.has(tech)).toBe(true);
      });
      
      // Verify batching (3 concurrent max)
      expect(mockClient.searchHackerNews).toHaveBeenCalledTimes(5);
      expect(mockClient.searchReddit).toHaveBeenCalledTimes(5);
    });
  });
  
  describe('error handling', () => {
    it('should track errors in session', async () => {
      const errorTracking = jest.spyOn(bridge['sessionTracker'], 'trackError');
      
      mockClient.searchHackerNews.mockRejectedValue(new Error('Test error'));
      mockClient.searchReddit.mockRejectedValue(new Error('Test error'));
      
      await bridge.researchTechnology('error-test', mockState);
      
      expect(errorTracking).toHaveBeenCalled();
    });
  });
});
```

**Integration Tests**:
```typescript
// tests/integration/n8n-bridge-integration.test.ts
describe('N8nBridge Integration', () => {
  let bridge: N8nBridge;
  
  beforeAll(() => {
    // Use real n8n client for integration tests
    bridge = new N8nBridge();
  });
  
  it('should perform real research with timeout', async () => {
    const mockState: ProjectState = {
      sessionId: 'integration-test',
      documents: [],
      analysis: {},
      research: {},
      refinements: []
    } as ProjectState;
    
    const result = await bridge.researchTechnology('javascript', mockState);
    
    expect(result.query).toBe('javascript');
    expect(result.timestamp).toBeLessThanOrEqual(Date.now());
    // Don't assert on specific results as they change
    // Just verify structure
    expect(result).toHaveProperty('totalResults');
    expect(result).toHaveProperty('topResults');
    expect(result).toHaveProperty('insights');
    expect(result).toHaveProperty('recommendations');
  }, 60000); // 60 second timeout for real API calls
});
```

## Testing Checklist

### Unit Tests
- [ ] N8nClient constructor and configuration
- [ ] All webhook request methods
- [ ] Retry logic with various error types
- [ ] Response transformation for HN and Reddit
- [ ] Session tracking functionality
- [ ] Error handling for all failure modes
- [ ] Fallback strategies

### Integration Tests
- [ ] Real n8n webhook communication
- [ ] Timeout handling with actual delays
- [ ] Concurrent request handling
- [ ] Session correlation across requests
- [ ] Error recovery scenarios

### Manual Tests
- [ ] Test with n8n instance down
- [ ] Test with invalid API keys
- [ ] Test with rate limiting active
- [ ] Monitor memory usage during batch operations
- [ ] Verify logs are helpful for debugging

## Common Issues and Solutions

### Issue: TypeScript types don't match n8n responses
**Solution**: Use validation and type guards
```typescript
function isHNSearchResult(data: any): data is HNSearchResults {
  return data && Array.isArray(data.hits);
}

// Use in transformer
if (!isHNSearchResult(rawData)) {
  throw new Error('Invalid HN search response format');
}
```

### Issue: Memory leak from session tracking
**Solution**: Implement automatic cleanup
```typescript
// Add to N8nBridge constructor
setInterval(() => {
  this.sessionTracker.cleanupSessions();
}, 60 * 60 * 1000); // Every hour
```

### Issue: Slow response times
**Solution**: Implement request caching (see task 5.5)
```typescript
// Quick cache check before making request
const cacheKey = `research:${technology}:${Date.now() / 3600000 | 0}`;
const cached = await this.cache.get(cacheKey);
if (cached) return cached;
```

## Next Steps

After completing task 5.2:
1. Verify bridge can communicate with n8n webhooks
2. Test error handling with various failure scenarios
3. Ensure LangGraph nodes can use the bridge
4. Document the integration interface
5. Prepare for specific API implementations (5.3, 5.4) 