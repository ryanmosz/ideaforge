import { N8nClient } from '../../services/n8n-client';
import { ResponseTransformer } from '../../services/response-transformer';
import { SessionTracker } from '../../services/session-tracker';
import { N8nErrorHandler } from '../../services/n8n-error-handler';
import { CircuitBreakerManager } from '../../utils/circuit-breaker';
import { ProjectState } from '../state';
import { ResearchResult, ResearchSummary } from '../types/research-types';

export interface N8nBridgeConfig {
  client?: N8nClient;
  transformer?: ResponseTransformer;
  cacheResults?: boolean;
  maxResultsPerSource?: number;
  maxConcurrentRequests?: number;
  batchDelay?: number;
  sessionTrackerMaxAge?: number;
  enableSessionAutoCleanup?: boolean; // For disabling cleanup timer in tests
  circuitBreakerConfig?: {
    failureThreshold?: number;
    resetTimeout?: number;
    successThreshold?: number;
  };
}

/**
 * Bridge between n8n webhooks and LangGraph agents
 * Handles research requests and transforms responses
 */
export class N8nBridge {
  private client: N8nClient;
  private transformer: ResponseTransformer;
  private sessionTracker: SessionTracker;
  private errorHandler: N8nErrorHandler;
  private circuitBreakerManager: CircuitBreakerManager;
  private config: Required<N8nBridgeConfig>;
  
  constructor(config?: N8nBridgeConfig) {
    this.config = {
      client: config?.client || new N8nClient(),
      transformer: config?.transformer || new ResponseTransformer(),
      cacheResults: config?.cacheResults ?? true,
      maxResultsPerSource: config?.maxResultsPerSource || 10,
      maxConcurrentRequests: config?.maxConcurrentRequests || 5,
      batchDelay: config?.batchDelay || 1000, // 1 second between batches
      sessionTrackerMaxAge: config?.sessionTrackerMaxAge || 300000, // 5 minutes
      enableSessionAutoCleanup: config?.enableSessionAutoCleanup ?? true, // Default to true for production
      circuitBreakerConfig: {
        failureThreshold: config?.circuitBreakerConfig?.failureThreshold || 5,
        resetTimeout: config?.circuitBreakerConfig?.resetTimeout || 30000,
        successThreshold: config?.circuitBreakerConfig?.successThreshold || 2
      }
    };
    
    this.client = this.config.client;
    this.transformer = this.config.transformer;
    this.sessionTracker = new SessionTracker(
      this.config.sessionTrackerMaxAge,
      this.config.enableSessionAutoCleanup
    );
    this.errorHandler = new N8nErrorHandler();
    this.circuitBreakerManager = new CircuitBreakerManager();
  }
  
  /**
   * Research a single technology using both HN and Reddit
   */
  async researchTechnology(
    technology: string,
    context: ProjectState
  ): Promise<ResearchSummary> {
    const sessionId = context.sessionId || 'default';
    const startTime = Date.now();
    
    try {
      console.log(`[N8n Bridge] Researching ${technology} for session ${sessionId}`);
      
      // Search both sources in parallel using allSettled to handle individual failures
      const [hnResult, redditResult] = await Promise.allSettled([
        this.searchHackerNews(technology, sessionId),
        this.searchReddit(technology, sessionId)
      ]);
      
      // Extract successful results
      const hnResults = hnResult.status === 'fulfilled' ? hnResult.value : [];
      const redditResults = redditResult.status === 'fulfilled' ? redditResult.value : [];
      
      // Track failures
      if (hnResult.status === 'rejected') {
        this.sessionTracker.trackError(
          sessionId,
          hnResult.reason,
          `HackerNews search failed for query: ${technology}`
        );
      }
      
      if (redditResult.status === 'rejected') {
        this.sessionTracker.trackError(
          sessionId,
          redditResult.reason,
          `Reddit search failed for query: ${technology}`
        );
      }
      
      // If both sources failed completely, try fallback
      if (hnResult.status === 'rejected' && redditResult.status === 'rejected') {
        // Track the overall failure
        this.sessionTracker.trackFailure(
          sessionId,
          technology,
          new Error('All research sources failed'),
          `All research sources failed for ${technology}`
        );
        return this.createFallbackSummary(technology);
      }
      
      // Combine and analyze results
      const allResults = [...hnResults, ...redditResults];
      const topResults = this.selectTopResults(allResults);
      const insights = this.extractInsights(allResults);
      const recommendations = this.generateRecommendations(allResults, technology);
      
      const responseTime = Date.now() - startTime;
      this.sessionTracker.trackSuccess(sessionId, technology, responseTime);
      
      return {
        query: technology,
        timestamp: Date.now(),
        totalResults: allResults.length,
        topResults,
        insights,
        recommendations
      };
    } catch (error) {
      this.errorHandler.logError(error as Error, `researchTechnology: ${technology}`);
      this.sessionTracker.trackFailure(
        sessionId, 
        technology, 
        error as Error,
        `researchTechnology failed for ${technology}`
      );
      
      // Return fallback data
      return this.createFallbackSummary(technology);
    }
  }
  
  /**
   * Research multiple technologies with concurrency control
   */
  async researchMultipleTechnologies(
    technologies: string[],
    context: ProjectState
  ): Promise<Map<string, ResearchSummary>> {
    const sessionId = context.sessionId || 'default';
    const results = new Map<string, ResearchSummary>();
    
    console.log(`[N8n Bridge] Researching ${technologies.length} technologies for session ${sessionId}`);
    
    // Process in batches to avoid overwhelming the API
    for (let i = 0; i < technologies.length; i += this.config.maxConcurrentRequests) {
      const batch = technologies.slice(i, i + this.config.maxConcurrentRequests);
      
      const batchResults = await Promise.all(
        batch.map(tech => this.researchTechnology(tech, context))
      );
      
      batch.forEach((tech, index) => {
        results.set(tech, batchResults[index]);
      });
      
      // Add delay between batches to avoid rate limiting
      if (i + this.config.maxConcurrentRequests < technologies.length) {
        console.log(`[N8n Bridge] Delaying ${this.config.batchDelay}ms before next batch`);
        await new Promise(resolve => setTimeout(resolve, this.config.batchDelay));
      }
    }
    
    return results;
  }
  
  /**
   * Research from state - convenience method for LangGraph nodes
   */
  async researchFromState(state: ProjectState): Promise<Map<string, ResearchSummary>> {
    const sessionId = state.sessionId || 'default';
    
    // Track overall research operation
    this.sessionTracker.trackRequest(sessionId, 'research_from_state');
    
    // Extract technologies from state
    const technologies = state.extractedTechnologies || [];
    
    if (technologies.length === 0) {
      console.log('[N8n Bridge] No technologies found in state to research');
      return new Map();
    }
    
    return this.researchMultipleTechnologies(technologies, state);
  }
  
  /**
   * Search HackerNews via n8n webhook with circuit breaker
   */
  private async searchHackerNews(
    query: string,
    sessionId: string
  ): Promise<ResearchResult[]> {
    const startTime = Date.now();
    const breaker = this.circuitBreakerManager.getBreaker('hackernews', {
      failureThreshold: this.config.circuitBreakerConfig.failureThreshold!,
      resetTimeout: this.config.circuitBreakerConfig.resetTimeout!,
      successThreshold: this.config.circuitBreakerConfig.successThreshold!,
      windowSize: 60000 // 1 minute window
    });
    
    try {
      const response = await breaker.execute(async () => {
        return await this.client.searchHackerNewsTransformed(query, sessionId, {
          limit: 30,
          sortBy: 'relevance',
          dateRange: 'last_year'
        });
      });
      
      // Track individual API call success
      const responseTime = Date.now() - startTime;
      this.sessionTracker.trackRequest(sessionId, `hackernews:${query}`, responseTime);
      
      return response;
    } catch (error) {
      this.errorHandler.logError(error as Error, 'HackerNews Search');
      
      // Check if it's a circuit breaker error
      if ((error as Error).message.includes('Circuit breaker is OPEN')) {
        console.log('[N8n Bridge] HackerNews circuit breaker is OPEN, skipping request');
      }
      
      // Re-throw the error to be handled by Promise.allSettled
      throw error;
    }
  }
  
  /**
   * Search Reddit via n8n webhook with circuit breaker
   */
  private async searchReddit(
    query: string,
    sessionId: string
  ): Promise<ResearchResult[]> {
    const startTime = Date.now();
    const breaker = this.circuitBreakerManager.getBreaker('reddit', {
      failureThreshold: this.config.circuitBreakerConfig.failureThreshold!,
      resetTimeout: this.config.circuitBreakerConfig.resetTimeout!,
      successThreshold: this.config.circuitBreakerConfig.successThreshold!,
      windowSize: 60000 // 1 minute window
    });
    
    try {
      const response = await breaker.execute(async () => {
        return await this.client.searchRedditTransformed(query, sessionId, {
          limit: 30,
          sortBy: 'relevance',
          timeframe: 'year',
          subreddits: this.getTechSubreddits(query)
        });
      });
      
      // Track individual API call success
      const responseTime = Date.now() - startTime;
      this.sessionTracker.trackRequest(sessionId, `reddit:${query}`, responseTime);
      
      return response;
    } catch (error) {
      this.errorHandler.logError(error as Error, 'Reddit Search');
      
      // Check if it's a circuit breaker error
      if ((error as Error).message.includes('Circuit breaker is OPEN')) {
        console.log('[N8n Bridge] Reddit circuit breaker is OPEN, skipping request');
      }
      
      // Re-throw the error to be handled by Promise.allSettled
      throw error;
    }
  }
  
  /**
   * Get relevant subreddits based on the query
   */
  private getTechSubreddits(query: string): string[] {
    const baseSubreddits = ['programming', 'webdev', 'learnprogramming'];
    
    // Add query-specific subreddits
    const queryLower = query.toLowerCase();
    
    // JavaScript ecosystem
    if (queryLower.includes('javascript') || queryLower.includes('js')) {
      baseSubreddits.push('javascript', 'node');
    }
    if (queryLower.includes('typescript') || queryLower.includes('ts')) {
      baseSubreddits.push('typescript');
    }
    if (queryLower.includes('react')) {
      baseSubreddits.push('reactjs', 'reactnative');
    }
    if (queryLower.includes('vue')) {
      baseSubreddits.push('vuejs');
    }
    if (queryLower.includes('angular')) {
      baseSubreddits.push('angular', 'angular2');
    }
    
    // Python ecosystem
    if (queryLower.includes('python')) {
      baseSubreddits.push('python', 'learnpython');
    }
    if (queryLower.includes('django')) {
      baseSubreddits.push('django');
    }
    if (queryLower.includes('flask')) {
      baseSubreddits.push('flask');
    }
    
    // Other languages
    if (queryLower.includes('rust')) {
      baseSubreddits.push('rust');
    }
    if (queryLower.includes('golang') || queryLower.includes(' go ')) {
      baseSubreddits.push('golang');
    }
    if (queryLower.includes('java')) {
      baseSubreddits.push('java', 'learnjava');
    }
    
    // DevOps and cloud
    if (queryLower.includes('docker')) {
      baseSubreddits.push('docker');
    }
    if (queryLower.includes('kubernetes') || queryLower.includes('k8s')) {
      baseSubreddits.push('kubernetes');
    }
    if (queryLower.includes('aws')) {
      baseSubreddits.push('aws');
    }
    
    // Databases
    if (queryLower.includes('sql') || queryLower.includes('database')) {
      baseSubreddits.push('Database', 'SQL');
    }
    if (queryLower.includes('mongodb')) {
      baseSubreddits.push('mongodb');
    }
    
    // Remove duplicates and limit to 10
    return [...new Set(baseSubreddits)].slice(0, 10);
  }
  
  /**
   * Select top results from combined sources
   */
  private selectTopResults(results: ResearchResult[]): ResearchResult[] {
    // Sort by relevance score descending
    const sorted = results.sort((a, b) => b.score - a.score);
    
    // Take top results up to configured limit
    const limit = this.config.maxResultsPerSource * 2; // Double since we have 2 sources
    return sorted.slice(0, limit);
  }
  
  /**
   * Extract insights from research results
   */
  private extractInsights(results: ResearchResult[]): string[] {
    const insights: string[] = [];
    
    if (results.length === 0) {
      return ['No research data available'];
    }
    
    // Analyze common themes
    const contentWords = results
      .map(r => r.content.toLowerCase())
      .join(' ')
      .split(/\s+/)
      .filter(word => word.length > 4 && !this.isCommonWord(word));
    
    const wordFreq = new Map<string, number>();
    contentWords.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });
    
    // Find top themes
    const topWords = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .filter(([, count]) => count > 2)
      .map(([word]) => word);
    
    if (topWords.length > 0) {
      insights.push(`Common themes: ${topWords.slice(0, 5).join(', ')}`);
    }
    
    // Analyze sentiment
    const positiveCount = results.filter(r => 
      /\b(great|excellent|amazing|love|awesome|fantastic|wonderful|best)\b/i.test(r.content)
    ).length;
    
    const negativeCount = results.filter(r => 
      /\b(bad|terrible|awful|hate|worst|problem|issue|bug|broken)\b/i.test(r.content)
    ).length;
    
    const sentimentRatio = positiveCount / (positiveCount + negativeCount + 1);
    
    if (sentimentRatio > 0.7) {
      insights.push('Community sentiment is overwhelmingly positive');
    } else if (sentimentRatio > 0.5) {
      insights.push('Community sentiment is generally positive');
    } else if (sentimentRatio < 0.3) {
      insights.push('Community has raised significant concerns');
    } else {
      insights.push('Community sentiment is mixed');
    }
    
    // Analyze discussion topics
    const discussionPatterns = [
      { pattern: /performance|speed|fast|slow|optimization/i, topic: 'performance' },
      { pattern: /security|vulnerability|CVE|exploit|auth/i, topic: 'security' },
      { pattern: /learning curve|difficult|easy|beginner/i, topic: 'learning curve' },
      { pattern: /community|support|documentation|docs/i, topic: 'community support' },
      { pattern: /alternative|instead|versus|vs\.|comparison/i, topic: 'alternatives' }
    ];
    
    const topics = discussionPatterns
      .filter(({ pattern }) => results.filter(r => pattern.test(r.content)).length >= 3)
      .map(({ topic }) => topic);
    
    if (topics.length > 0) {
      insights.push(`Key discussion topics: ${topics.join(', ')}`);
    }
    
    return insights;
  }
  
  /**
   * Generate recommendations based on research findings
   */
  private generateRecommendations(results: ResearchResult[], technology: string): string[] {
    const recommendations: string[] = [];
    
    if (results.length === 0) {
      recommendations.push('Consider searching for more specific information or alternative sources');
    }
    
    // Check for alternatives mentioned
    const alternativePattern = /\b(instead of|alternative|better than|vs\.|versus|compared to|replace)\b/i;
    const alternativeMentions = results.filter(r => alternativePattern.test(r.content));
    
    if (alternativeMentions.length >= 3) {
      recommendations.push(`Research alternatives to ${technology} mentioned in community discussions`);
    }
    
    // Check for security concerns
    const securityPattern = /\b(security|vulnerability|CVE|exploit|breach|attack|unsafe)\b/i;
    const securityConcerns = results.filter(r => securityPattern.test(r.content));
    
    if (securityConcerns.length >= 2) {
      recommendations.push(`Review security considerations and best practices for ${technology}`);
    }
    
    // Check for performance discussions
    const performancePattern = /\b(performance|slow|fast|optimization|bottleneck|memory|cpu)\b/i;
    const performanceDiscussions = results.filter(r => performancePattern.test(r.content));
    
    if (performanceDiscussions.length >= 3) {
      recommendations.push(`Consider performance implications and optimization strategies for ${technology}`);
    }
    
    // Check for learning resources
    const learningPattern = /\b(tutorial|guide|course|book|documentation|learn|beginner)\b/i;
    const learningResources = results.filter(r => learningPattern.test(r.content));
    
    if (learningResources.length >= 2) {
      recommendations.push(`Explore learning resources and documentation mentioned in discussions`);
    }
    
    // Check for version-specific issues
    const versionPattern = /\b(version|v\d+|upgrade|migration|breaking change|deprecated)\b/i;
    const versionDiscussions = results.filter(r => versionPattern.test(r.content));
    
    if (versionDiscussions.length >= 2) {
      recommendations.push(`Pay attention to version compatibility and migration considerations`);
    }
    
    // Technology-specific recommendations
    if (technology.toLowerCase().includes('react')) {
      recommendations.push('Consider the React ecosystem including Next.js, Redux, or Zustand for state management');
    }
    
    if (technology.toLowerCase().includes('node')) {
      recommendations.push('Evaluate the Node.js ecosystem including Express, Fastify, or NestJS frameworks');
    }
    
    return recommendations;
  }
  
  /**
   * Check if a word is common (stop word)
   */
  private isCommonWord(word: string): boolean {
    const commonWords = new Set([
      'the', 'be', 'to', 'of', 'and', 'in', 'that', 'have',
      'with', 'for', 'not', 'on', 'as', 'you', 'at', 'this',
      'but', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
      'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there',
      'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who',
      'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like',
      'just', 'him', 'know', 'take', 'into', 'your', 'some',
      'could', 'them', 'see', 'other', 'than', 'then', 'now',
      'after', 'back', 'also', 'well', 'way', 'even', 'want',
      'use', 'how', 'because', 'any', 'these', 'most', 'us'
    ]);
    
    return commonWords.has(word.toLowerCase());
  }
  
  /**
   * Get the n8n client instance
   */
  getClient(): N8nClient {
    return this.client;
  }
  
  /**
   * Get the response transformer instance
   */
  getTransformer(): ResponseTransformer {
    return this.transformer;
  }
  
  /**
   * Get session metrics for debugging and analytics
   */
  getSessionMetrics(sessionId: string) {
    return this.sessionTracker.getSessionMetrics(sessionId);
  }
  
  /**
   * Get aggregate statistics across all sessions
   */
  getStats() {
    return this.sessionTracker.getStats();
  }
  
  /**
   * Export session data for debugging
   */
  exportSessionData(sessionId?: string): string {
    return this.sessionTracker.exportSessionData(sessionId);
  }
  
  /**
   * Clean up resources (stop timers, etc.)
   */
  cleanup(): void {
    this.sessionTracker.stopCleanupTimer();
  }
  
  /**
   * Create a fallback summary when all sources fail
   */
  private createFallbackSummary(technology: string): ResearchSummary {
    console.log(`[N8n Bridge] Creating fallback summary for ${technology}`);
    
    return {
      query: technology,
      timestamp: Date.now(),
      totalResults: 0,
      topResults: [],
      insights: [
        'External research services are currently unavailable',
        'Consider checking service status or trying again later'
      ],
      recommendations: [
        `Manual research recommended for ${technology}`,
        'Check official documentation and community forums directly',
        'Service interruption may be temporary - retry in a few minutes'
      ]
    };
  }
  
  /**
   * Get circuit breaker statistics
   */
  getCircuitBreakerStats() {
    return this.circuitBreakerManager.getAllStats();
  }
  
  /**
   * Reset all circuit breakers (useful for testing)
   */
  resetCircuitBreakers(): void {
    this.circuitBreakerManager.resetAll();
  }
} 