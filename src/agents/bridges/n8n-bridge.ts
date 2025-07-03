import { N8nClient } from '../../services/n8n-client';
import { ResponseTransformer } from '../../services/response-transformer';
import { ProjectState } from '../state';
import { ResearchResult, ResearchSummary } from '../types/research-types';

export interface N8nBridgeConfig {
  client?: N8nClient;
  transformer?: ResponseTransformer;
  cacheResults?: boolean;
  maxResultsPerSource?: number;
}

/**
 * Bridge between n8n webhooks and LangGraph agents
 * Handles research requests and transforms responses
 */
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
  
  /**
   * Research a single technology using HackerNews and Reddit
   */
  async researchTechnology(
    technology: string,
    sessionId: string = 'default'
  ): Promise<ResearchSummary> {
    console.log(`[N8n Bridge] Researching technology: ${technology}`);
    
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
  
  /**
   * Research multiple technologies with batching and concurrency control
   */
  async researchMultipleTechnologies(
    technologies: string[],
    sessionId: string = 'default',
    batchSize: number = 3
  ): Promise<Map<string, ResearchSummary>> {
    console.log(`[N8n Bridge] Researching ${technologies.length} technologies`);
    
    const results = new Map<string, ResearchSummary>();
    
    // Batch research with concurrency limit
    for (let i = 0; i < technologies.length; i += batchSize) {
      const batch = technologies.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(tech => this.researchTechnology(tech, sessionId))
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
      
      // Add a small delay between batches to avoid overwhelming the API
      if (i + batchSize < technologies.length) {
        await this.delay(1000);
      }
    }
    
    return results;
  }
  
  /**
   * Integration method for LangGraph nodes
   */
  async researchFromState(context: ProjectState): Promise<Map<string, ResearchSummary>> {
    const technologies = context.extractedTechnologies || [];
    const additionalTopics = context.researchTopics || [];
    
    // Combine technologies and additional topics
    const allTopics = [...new Set([...technologies, ...additionalTopics])];
    
    if (allTopics.length === 0) {
      console.log('[N8n Bridge] No technologies to research');
      return new Map();
    }
    
    // Use file path as session identifier for consistency
    const sessionId = this.generateSessionId(context.filePath);
    
    return this.researchMultipleTechnologies(allTopics, sessionId);
  }
  
  /**
   * Search HackerNews via n8n webhook
   */
  private async searchHackerNews(
    query: string,
    sessionId: string
  ): Promise<ResearchResult[]> {
    try {
      const results = await this.client.searchHackerNewsTransformed(
        query,
        sessionId,
        {
          limit: 30,
          sortBy: 'relevance',
          dateRange: 'last_year'
        }
      );
      
      return results;
    } catch (error) {
      console.error('[N8n Bridge] HN search error:', error);
      return [];
    }
  }
  
  /**
   * Search Reddit via n8n webhook
   */
  private async searchReddit(
    query: string,
    sessionId: string
  ): Promise<ResearchResult[]> {
    try {
      const results = await this.client.searchRedditTransformed(
        query,
        sessionId,
        {
          limit: 30,
          sortBy: 'relevance',
          timeframe: 'year',
          subreddits: this.getTechSubreddits(query)
        }
      );
      
      return results;
    } catch (error) {
      console.error('[N8n Bridge] Reddit search error:', error);
      return [];
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
   * Create an empty research summary for failed searches
   */
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
  
  /**
   * Generate a session ID from file path
   */
  private generateSessionId(filePath: string): string {
    // Simple hash of file path for session tracking
    let hash = 0;
    for (let i = 0; i < filePath.length; i++) {
      const char = filePath.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `session-${Math.abs(hash).toString(16)}`;
  }
  
  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
} 