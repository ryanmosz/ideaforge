import { ProjectState } from '../../state';
import { HumanMessage } from '@langchain/core/messages';
import axios from 'axios';

interface HNSearchResult {
  objectID: string;
  title: string;
  url?: string;
  points?: number;
  num_comments?: number;
  created_at?: string;
  author?: string;
  story_text?: string;
  comment_text?: string;
  _highlightResult?: {
    title?: { value: string };
    story_text?: { value: string };
    comment_text?: { value: string };
  };
}

interface HNSearchResponse {
  hits: HNSearchResult[];
  nbHits: number;
  page: number;
  nbPages: number;
}

interface ProcessedResult {
  title: string;
  url: string;
  summary: string;
  relevance: number;
  velocity?: number;
  isFrontPage?: boolean;
  isTrending?: boolean;
  category?: 'must-read' | 'trending' | 'influential' | 'relevant';
  selectionReason?: string;
  relationshipToTopic?: string;
}

export class HackerNewsSearchNode {
  private readonly endpoints = {
    search: 'https://hn.algolia.com/api/v1/search',
    searchByDate: 'https://hn.algolia.com/api/v1/search_by_date',
    frontPage: 'https://hn.algolia.com/api/v1/search?tags=front_page'
  };
  
  private readonly maxResultsPerStrategy = 5;
  private readonly maxTotalResults = 25;
  
  // Time windows in seconds
  private readonly last48Hours = Math.floor(Date.now() / 1000) - (48 * 3600);
  private readonly lastWeek = Math.floor(Date.now() / 1000) - (7 * 24 * 3600);

  async process(state: ProjectState): Promise<Partial<ProjectState>> {
    const messages = [...state.messages];
    
    if (!state.researchTopics || state.researchTopics.length === 0) {
      messages.push(new HumanMessage({
        content: "No research topics found for Hacker News search"
      }));
      
      return {
        messages,
        hackerNewsResults: [],
        currentNode: 'HackerNewsSearchNode',
        nextNode: 'RedditSearchNode'
      };
    }

    try {
      const allResults: ProcessedResult[] = [];
      
      // Search using multiple strategies for each topic
      for (const topic of state.researchTopics) {
        try {
          const [frontPageResults, trendingResults, relevantResults, influentialResults] = await Promise.all([
            this.searchFrontPageRecent(topic),
            this.searchTrending(topic),
            this.searchRecentRelevant(topic),
            this.searchInfluential(topic)
          ]);
          
          allResults.push(...frontPageResults, ...trendingResults, ...relevantResults, ...influentialResults);
        } catch (error) {
          messages.push(new HumanMessage({
            content: `Error searching HN for topic "${topic}": ${error instanceof Error ? error.message : 'Unknown error'}`
          }));
        }
      }

      // Deduplicate and sort by composite score
      const uniqueResults = this.deduplicateResults(allResults);
      const sortedResults = uniqueResults
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, this.maxTotalResults);

      // Categorize results for better summary
      const mustRead = sortedResults.filter(r => r.category === 'must-read').length;
      const trending = sortedResults.filter(r => r.category === 'trending').length;
      const influential = sortedResults.filter(r => r.category === 'influential').length;

      messages.push(new HumanMessage({
        content: `Found ${sortedResults.length} Hacker News discussions: ${mustRead} must-read (front page last 48h), ${trending} trending, ${influential} influential, and ${sortedResults.length - mustRead - trending - influential} relevant`
      }));

      return {
        messages,
        hackerNewsResults: sortedResults.map(({ 
          category, 
          velocity, 
          isFrontPage, 
          isTrending, 
          selectionReason,
          relationshipToTopic,
          ...result 
        }) => result),
        currentNode: 'HackerNewsSearchNode',
        nextNode: 'RedditSearchNode'
      };
    } catch (error) {
      messages.push(new HumanMessage({
        content: `HackerNewsSearchNode error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }));
      
      return {
        messages,
        hackerNewsResults: [],
        errors: [...state.errors, `HackerNewsSearchNode: ${error instanceof Error ? error.message : 'Unknown error'}`],
        currentNode: 'HackerNewsSearchNode',
        nextNode: 'RedditSearchNode'
      };
    }
  }

  // Strategy 1: Recent front page posts (even tangentially related)
  private async searchFrontPageRecent(topic: string): Promise<ProcessedResult[]> {
    try {
      // First, get recent high-scoring posts
      const response = await axios.get<HNSearchResponse>(this.endpoints.searchByDate, {
        params: {
          query: topic,
          tags: 'story',
          numericFilters: `created_at_i>${this.last48Hours},points>100`,
          hitsPerPage: this.maxResultsPerStrategy
        }
      });

      return this.processResults(response.data.hits, topic, 'must-read', 2.0); // 2x relevance boost
    } catch {
      return [];
    }
  }

  // Strategy 2: Trending posts (high velocity)
  private async searchTrending(topic: string): Promise<ProcessedResult[]> {
    try {
      const response = await axios.get<HNSearchResponse>(this.endpoints.searchByDate, {
        params: {
          query: topic,
          tags: 'story',
          numericFilters: `created_at_i>${this.lastWeek}`,
          hitsPerPage: this.maxResultsPerStrategy * 2 // Get more to filter by velocity
        }
      });

      // Calculate velocity and filter for trending
      const withVelocity = response.data.hits.map(hit => {
        const ageHours = (Date.now() - new Date(hit.created_at!).getTime()) / (1000 * 60 * 60);
        const velocity = (hit.points || 0) / Math.max(ageHours, 1);
        return { ...hit, velocity };
      });

      // Sort by velocity and take top results
      const trending = withVelocity
        .sort((a, b) => b.velocity - a.velocity)
        .slice(0, this.maxResultsPerStrategy)
        .filter(hit => hit.velocity > 5); // At least 5 points/hour

      return this.processResults(trending, topic, 'trending', 1.5); // 1.5x relevance boost
    } catch {
      return [];
    }
  }

  // Strategy 3: Highly relevant recent posts
  private async searchRecentRelevant(topic: string): Promise<ProcessedResult[]> {
    try {
      const response = await axios.get<HNSearchResponse>(this.endpoints.search, {
        params: {
          query: topic,
          tags: 'story',
          hitsPerPage: this.maxResultsPerStrategy
        }
      });

      return this.processResults(response.data.hits, topic, 'relevant', 1.0);
    } catch {
      return [];
    }
  }

  // Strategy 4: All-time influential discussions
  private async searchInfluential(topic: string): Promise<ProcessedResult[]> {
    try {
      const response = await axios.get<HNSearchResponse>(this.endpoints.search, {
        params: {
          query: topic,
          tags: 'story',
          numericFilters: 'points>500',
          hitsPerPage: this.maxResultsPerStrategy
        }
      });

      return this.processResults(response.data.hits, topic, 'influential', 1.3); // 1.3x relevance boost
    } catch {
      return [];
    }
  }

  private processResults(
    results: HNSearchResult[], 
    searchTopic: string,
    category: ProcessedResult['category'],
    relevanceBoost: number = 1.0
  ): ProcessedResult[] {
    return results.map(result => {
      // Calculate base relevance score
      const baseRelevance = this.calculateRelevance(result, searchTopic);
      
      // Calculate velocity for trending indication
      const ageHours = result.created_at 
        ? (Date.now() - new Date(result.created_at).getTime()) / (1000 * 60 * 60)
        : Infinity;
      const velocity = (result.points || 0) / Math.max(ageHours, 1);
      
      // Determine if it's front page worthy
      const isFrontPage = ageHours < 48 && (result.points || 0) > 100;
      const isTrending = velocity > 10 && ageHours < 168; // 10 points/hour in last week
      
      // Apply category-specific relevance boost
      const relevance = Math.min(Math.round(baseRelevance * relevanceBoost), 100);
      
      // Determine selection reason and relationship
      const { selectionReason, relationshipToTopic } = this.analyzeSelectionContext(
        result, 
        searchTopic, 
        category, 
        baseRelevance,
        velocity,
        isFrontPage
      );
      
      // Extract enhanced summary
      const summary = this.extractEnhancedSummary(
        result, 
        velocity, 
        isFrontPage, 
        isTrending,
        selectionReason,
        relationshipToTopic
      );
      
      return {
        title: result.title || 'Untitled',
        url: result.url || `https://news.ycombinator.com/item?id=${result.objectID}`,
        summary,
        relevance,
        velocity,
        isFrontPage,
        isTrending,
        category,
        selectionReason,
        relationshipToTopic
      };
    });
  }

  private analyzeSelectionContext(
    result: HNSearchResult,
    searchTopic: string,
    category: ProcessedResult['category'],
    _baseRelevance: number,
    velocity: number,
    _isFrontPage: boolean
  ): { selectionReason: string; relationshipToTopic: string } {
    const titleLower = (result.title || '').toLowerCase();
    const topicLower = searchTopic.toLowerCase();
    const topicWords = topicLower.split(' ').filter(w => w.length > 2);
    
    // Check for direct keyword matches
    const matchedKeywords = topicWords.filter(word => titleLower.includes(word));
    const hasDirectMatch = matchedKeywords.length > 0;
    
    // Analyze the relationship
    let relationshipToTopic = '';
    let selectionReason = '';
    
    if (category === 'must-read') {
      if (hasDirectMatch) {
        selectionReason = 'Front page discussion directly related to your topic';
        relationshipToTopic = `Matches keywords: ${matchedKeywords.join(', ')}`;
      } else {
        selectionReason = 'Highly influential recent discussion with potential relevance';
        relationshipToTopic = this.inferTangentialRelationship(result.title || '', searchTopic);
      }
    } else if (category === 'trending') {
      selectionReason = `Rapidly gaining traction (${Math.round(velocity)} points/hour)`;
      if (hasDirectMatch) {
        relationshipToTopic = 'Directly addresses your search topic';
      } else {
        relationshipToTopic = this.inferTangentialRelationship(result.title || '', searchTopic);
      }
    } else if (category === 'influential') {
      selectionReason = `Highly influential discussion (${result.points} points, ${result.num_comments} comments)`;
      relationshipToTopic = hasDirectMatch 
        ? 'Classic discussion on your exact topic'
        : this.inferTangentialRelationship(result.title || '', searchTopic);
    } else {
      selectionReason = 'Relevant based on keyword matching and engagement';
      relationshipToTopic = hasDirectMatch
        ? `Contains keywords: ${matchedKeywords.join(', ')}`
        : 'Related to broader topic area';
    }
    
    return { selectionReason, relationshipToTopic };
  }

  private inferTangentialRelationship(title: string, searchTopic: string): string {
    const titleLower = title.toLowerCase();
    const topicLower = searchTopic.toLowerCase();
    
    // Common technology relationships
    const techCategories = {
      frontend: ['react', 'vue', 'angular', 'svelte', 'javascript', 'typescript', 'css', 'html', 'webpack', 'vite'],
      backend: ['node', 'python', 'java', 'go', 'rust', 'ruby', 'php', 'api', 'server', 'database'],
      devops: ['docker', 'kubernetes', 'ci', 'cd', 'deploy', 'aws', 'azure', 'gcp', 'terraform'],
      data: ['data', 'ml', 'ai', 'analytics', 'etl', 'warehouse', 'pipeline', 'spark', 'hadoop'],
      mobile: ['ios', 'android', 'react native', 'flutter', 'swift', 'kotlin', 'mobile'],
      security: ['security', 'auth', 'encryption', 'vulnerability', 'hack', 'breach', 'crypto'],
      architecture: ['architecture', 'design', 'pattern', 'microservice', 'monolith', 'scale', 'distributed']
    };
    
    // Find which categories the title and topic belong to
    let titleCategories: string[] = [];
    let topicCategories: string[] = [];
    
    for (const [category, keywords] of Object.entries(techCategories)) {
      if (keywords.some(kw => titleLower.includes(kw))) {
        titleCategories.push(category);
      }
      if (keywords.some(kw => topicLower.includes(kw))) {
        topicCategories.push(category);
      }
    }
    
    // Determine relationship
    const sharedCategories = titleCategories.filter(c => topicCategories.includes(c));
    
    if (sharedCategories.length > 0) {
      return `Related ${sharedCategories[0]} technology`;
    } else if (titleCategories.length > 0 && topicCategories.length > 0) {
      return `Cross-domain insight: ${titleCategories[0]} perspective on ${topicCategories[0]}`;
    } else if (titleLower.includes('best practice') || titleLower.includes('lesson') || titleLower.includes('mistake')) {
      return 'General engineering wisdom applicable to your domain';
    } else if (titleLower.includes('performance') || titleLower.includes('optimization')) {
      return 'Performance insights that may apply to your use case';
    } else if (titleLower.includes('startup') || titleLower.includes('product') || titleLower.includes('launch')) {
      return 'Product/business context for technical decisions';
    } else {
      return 'Potentially relevant to broader technical landscape';
    }
  }

  private extractEnhancedSummary(
    result: HNSearchResult, 
    velocity: number, 
    isFrontPage: boolean, 
    isTrending: boolean,
    selectionReason: string,
    relationshipToTopic: string
  ): string {
    let prefix = '';
    
    // Add status indicators
    if (isFrontPage) {
      prefix = '🔥 Front Page: ';
    } else if (isTrending) {
      prefix = '📈 Trending: ';
    } else if ((result.points || 0) > 500) {
      prefix = '⭐ Influential: ';
    }
    
    // Build metadata line
    const points = result.points || 0;
    const comments = result.num_comments || 0;
    const age = result.created_at ? this.getRelativeTime(new Date(result.created_at)) : 'unknown time';
    
    let metadata = `Posted ${age} | ${points} points`;
    if (velocity > 5) {
      metadata += ` (${Math.round(velocity)}/hr)`;
    }
    metadata += ` | ${comments} comments`;
    
    // Add selection context
    const contextLine = `\n📎 ${selectionReason}\n🔗 ${relationshipToTopic}`;
    
    // Try to get content summary
    let contentSummary = '';
    if (result._highlightResult?.story_text?.value) {
      contentSummary = '\n' + this.cleanHighlightedText(result._highlightResult.story_text.value);
    } else if (result.story_text) {
      contentSummary = '\n' + this.truncateText(result.story_text, 150);
    }
    
    return prefix + metadata + contextLine + contentSummary;
  }

  private calculateRelevance(result: HNSearchResult, searchTopic: string): number {
    let score = 0;
    
    // Base score from points (0-40 scale, reduced from 100)
    if (result.points) {
      score += Math.min(result.points / 25, 40);
    }
    
    // Engagement score from comments (0-30 scale)
    if (result.num_comments) {
      score += Math.min(result.num_comments / 10, 30);
    }
    
    // Recency score (0-20 scale, more granular)
    if (result.created_at) {
      const ageInDays = (Date.now() - new Date(result.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (ageInDays < 2) {
        score += 20;
      } else if (ageInDays < 7) {
        score += 15;
      } else if (ageInDays < 30) {
        score += 10;
      } else if (ageInDays < 90) {
        score += 5;
      }
    }
    
    // Title relevance (0-30 scale)
    const titleLower = (result.title || '').toLowerCase();
    const topicLower = searchTopic.toLowerCase();
    const topicWords = topicLower.split(' ').filter(w => w.length > 2);
    
    let titleRelevance = 0;
    for (const word of topicWords) {
      if (titleLower.includes(word)) {
        titleRelevance += 10;
      }
    }
    score += Math.min(titleRelevance, 30);
    
    // Viral score bonus (high engagement relative to points)
    if (result.points && result.num_comments) {
      const viralRatio = result.num_comments / result.points;
      if (viralRatio > 0.5) {
        score += 10; // High discussion rate
      }
    }
    
    // Normalize to 0-100 scale
    return Math.round(Math.min(score, 100));
  }

  private deduplicateResults(results: ProcessedResult[]): ProcessedResult[] {
    const seen = new Set<string>();
    const unique: ProcessedResult[] = [];
    
    for (const result of results) {
      const id = result.url;
      if (!seen.has(id)) {
        seen.add(id);
        unique.push(result);
      } else {
        // If we've seen it, update with better category/relevance if applicable
        const existing = unique.find(r => r.url === id);
        if (existing && result.relevance > existing.relevance) {
          Object.assign(existing, result);
        }
      }
    }
    
    return unique;
  }

  private cleanHighlightedText(text: string): string {
    // Remove HTML highlighting tags
    const cleaned = text.replace(/<\/?em>/g, '');
    return this.truncateText(cleaned, 200);
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    
    // Try to cut at a word boundary
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace) + '...';
    }
    
    return truncated + '...';
  }

  private getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'today';
    } else if (diffDays === 1) {
      return 'yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} year${years > 1 ? 's' : ''} ago`;
    }
  }
} 