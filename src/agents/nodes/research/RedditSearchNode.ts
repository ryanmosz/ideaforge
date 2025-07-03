import { ProjectState } from '../../state';
import { HumanMessage } from '@langchain/core/messages';
import axios from 'axios';

interface RedditPost {
  id: string;
  title: string;
  subreddit: string;
  score: number;
  num_comments: number;
  created_utc: number;
  selftext?: string;
  url: string;
  author: string;
  upvote_ratio?: number;
  link_flair_text?: string;
}

interface RedditSearchResponse {
  data: {
    children: Array<{
      data: RedditPost;
    }>;
  };
}

interface ProcessedResult {
  title: string;
  url: string;
  summary: string;
  subreddit: string;
  relevance: number;
  type?: 'post' | 'comment';
  velocity?: number;
  isHot?: boolean;
  isTrending?: boolean;
  category?: 'hot-discussion' | 'technical-insight' | 'community-wisdom' | 'relevant';
  selectionReason?: string;
  relationshipToTopic?: string;
}

export class RedditSearchNode {
  private readonly searchUrl = 'https://www.reddit.com/search.json';
  private readonly subredditUrls = {
    programming: 'https://www.reddit.com/r/programming',
    webdev: 'https://www.reddit.com/r/webdev',
    javascript: 'https://www.reddit.com/r/javascript',
    node: 'https://www.reddit.com/r/node',
    reactjs: 'https://www.reddit.com/r/reactjs',
    typescript: 'https://www.reddit.com/r/typescript',
    python: 'https://www.reddit.com/r/Python',
    golang: 'https://www.reddit.com/r/golang',
    rust: 'https://www.reddit.com/r/rust',
    devops: 'https://www.reddit.com/r/devops',
    aws: 'https://www.reddit.com/r/aws',
    kubernetes: 'https://www.reddit.com/r/kubernetes',
    machinelearning: 'https://www.reddit.com/r/MachineLearning',
    datascience: 'https://www.reddit.com/r/datascience',
    cscareerquestions: 'https://www.reddit.com/r/cscareerquestions',
    experienced_devs: 'https://www.reddit.com/r/ExperiencedDevs',
    learnprogramming: 'https://www.reddit.com/r/learnprogramming'
  };
  
  private readonly maxResultsPerStrategy = 5;
  private readonly maxTotalResults = 20;

  async process(state: ProjectState): Promise<Partial<ProjectState>> {
    const messages = [...state.messages];
    
    if (!state.researchTopics || state.researchTopics.length === 0) {
      messages.push(new HumanMessage({
        content: "No research topics found for Reddit search"
      }));
      
      return {
        messages,
        redditResults: [],
        currentNode: 'RedditSearchNode',
        nextNode: 'AdditionalResearchNode'
      };
    }

    try {
      const allResults: ProcessedResult[] = [];
      
      // Determine relevant subreddits based on topics
      const relevantSubreddits = this.identifyRelevantSubreddits(state.researchTopics);
      
      // Search using multiple strategies for each topic
      for (const topic of state.researchTopics) {
        try {
          const [hotResults, technicalResults, generalResults] = await Promise.all([
            this.searchHotDiscussions(topic, relevantSubreddits),
            this.searchTechnicalSubreddits(topic, relevantSubreddits),
            this.searchGeneralProgramming(topic)
          ]);
          
          allResults.push(...hotResults, ...technicalResults, ...generalResults);
        } catch (error) {
          messages.push(new HumanMessage({
            content: `Error searching Reddit for topic "${topic}": ${error instanceof Error ? error.message : 'Unknown error'}`
          }));
        }
      }

      // Deduplicate and sort by composite score
      const uniqueResults = this.deduplicateResults(allResults);
      const sortedResults = uniqueResults
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, this.maxTotalResults);

      // Categorize results for summary
      const hotDiscussions = sortedResults.filter(r => r.category === 'hot-discussion').length;
      const technicalInsights = sortedResults.filter(r => r.category === 'technical-insight').length;
      const communityWisdom = sortedResults.filter(r => r.category === 'community-wisdom').length;

      messages.push(new HumanMessage({
        content: `Found ${sortedResults.length} Reddit discussions: ${hotDiscussions} hot discussions, ${technicalInsights} technical insights, ${communityWisdom} community wisdom, and ${sortedResults.length - hotDiscussions - technicalInsights - communityWisdom} relevant posts`
      }));

      return {
        messages,
        redditResults: sortedResults.map(({ 
          category, 
          velocity, 
          isHot, 
          isTrending, 
          selectionReason,
          relationshipToTopic,
          ...result 
        }) => result),
        currentNode: 'RedditSearchNode',
        nextNode: 'AdditionalResearchNode'
      };
    } catch (error) {
      messages.push(new HumanMessage({
        content: `RedditSearchNode error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }));
      
      return {
        messages,
        redditResults: [],
        errors: [...state.errors, `RedditSearchNode: ${error instanceof Error ? error.message : 'Unknown error'}`],
        currentNode: 'RedditSearchNode',
        nextNode: 'AdditionalResearchNode'
      };
    }
  }

  private identifyRelevantSubreddits(topics: string[]): string[] {
    const subreddits = new Set<string>(['programming']); // Always include general programming
    
    const topicsLower = topics.map(t => t.toLowerCase());
    
    // Map topics to relevant subreddits
    for (const topic of topicsLower) {
      if (topic.includes('javascript') || topic.includes('js')) {
        subreddits.add('javascript');
        subreddits.add('webdev');
      }
      if (topic.includes('react')) {
        subreddits.add('reactjs');
        subreddits.add('javascript');
      }
      if (topic.includes('node')) {
        subreddits.add('node');
        subreddits.add('javascript');
      }
      if (topic.includes('typescript') || topic.includes('ts')) {
        subreddits.add('typescript');
      }
      if (topic.includes('python')) {
        subreddits.add('python');
      }
      if (topic.includes('go') || topic.includes('golang')) {
        subreddits.add('golang');
      }
      if (topic.includes('rust')) {
        subreddits.add('rust');
      }
      if (topic.includes('devops') || topic.includes('ci') || topic.includes('cd')) {
        subreddits.add('devops');
      }
      if (topic.includes('aws') || topic.includes('cloud')) {
        subreddits.add('aws');
        subreddits.add('devops');
      }
      if (topic.includes('kubernetes') || topic.includes('k8s')) {
        subreddits.add('kubernetes');
        subreddits.add('devops');
      }
      if (topic.includes('machine learning') || topic.includes('ml') || topic.includes('ai')) {
        subreddits.add('machinelearning');
        subreddits.add('datascience');
      }
      if (topic.includes('career') || topic.includes('job')) {
        subreddits.add('cscareerquestions');
        subreddits.add('experienced_devs');
      }
      if (topic.includes('learn') || topic.includes('beginner')) {
        subreddits.add('learnprogramming');
      }
    }
    
    return Array.from(subreddits);
  }

  // Strategy 1: Hot discussions in relevant subreddits
  private async searchHotDiscussions(topic: string, subreddits: string[]): Promise<ProcessedResult[]> {
    try {
      const subredditList = subreddits.slice(0, 3).join('+'); // Limit to top 3 subreddits
      const response = await axios.get<RedditSearchResponse>(this.searchUrl, {
        params: {
          q: `${topic} subreddit:${subredditList}`,
          sort: 'hot',
          limit: this.maxResultsPerStrategy,
          t: 'week', // Time filter: past week
          raw_json: 1
        },
        headers: {
          'User-Agent': 'IdeaForge/1.0'
        }
      });

      return this.processResults(response.data.data.children, topic, 'hot-discussion', 1.8);
    } catch {
      return [];
    }
  }

  // Strategy 2: Technical discussions in specialized subreddits
  private async searchTechnicalSubreddits(topic: string, subreddits: string[]): Promise<ProcessedResult[]> {
    try {
      // Focus on technical subreddits
      const technicalSubs = subreddits.filter(sub => 
        !['cscareerquestions', 'learnprogramming', 'experienced_devs'].includes(sub)
      );
      const subredditList = technicalSubs.join('+');
      
      const response = await axios.get<RedditSearchResponse>(this.searchUrl, {
        params: {
          q: `${topic} subreddit:${subredditList}`,
          sort: 'relevance',
          limit: this.maxResultsPerStrategy,
          raw_json: 1
        },
        headers: {
          'User-Agent': 'IdeaForge/1.0'
        }
      });

      return this.processResults(response.data.data.children, topic, 'technical-insight', 1.5);
    } catch {
      return [];
    }
  }

  // Strategy 3: General programming wisdom
  private async searchGeneralProgramming(topic: string): Promise<ProcessedResult[]> {
    try {
      const response = await axios.get<RedditSearchResponse>(this.searchUrl, {
        params: {
          q: topic,
          sort: 'top',
          limit: this.maxResultsPerStrategy,
          t: 'year', // Top posts from past year
          raw_json: 1
        },
        headers: {
          'User-Agent': 'IdeaForge/1.0'
        }
      });

      // Filter for programming-related subreddits
      const programmingPosts = response.data.data.children.filter(post => {
        const subreddit = post.data.subreddit.toLowerCase();
        return Object.keys(this.subredditUrls).some(key => 
          subreddit.includes(key) || key.includes(subreddit)
        );
      });

      return this.processResults(programmingPosts, topic, 'community-wisdom', 1.3);
    } catch {
      return [];
    }
  }

  private processResults(
    posts: Array<{ data: RedditPost }>, 
    searchTopic: string,
    category: ProcessedResult['category'],
    relevanceBoost: number = 1.0
  ): ProcessedResult[] {
    return posts.map(({ data: post }) => {
      // Calculate base relevance score
      const baseRelevance = this.calculateRelevance(post, searchTopic);
      
      // Calculate velocity for trending indication
      const ageHours = (Date.now() / 1000 - post.created_utc) / 3600;
      const velocity = post.score / Math.max(ageHours, 1);
      
      // Determine if it's hot or trending
      const isHot = ageHours < 48 && post.score > 100;
      const isTrending = velocity > 10 && ageHours < 168;
      
      // Apply category-specific relevance boost
      const relevance = Math.min(Math.round(baseRelevance * relevanceBoost), 100);
      
      // Determine selection reason and relationship
      const { selectionReason, relationshipToTopic } = this.analyzeSelectionContext(
        post, 
        searchTopic, 
        category,
        velocity,
        isHot
      );
      
      // Extract enhanced summary
      const summary = this.extractEnhancedSummary(
        post,
        velocity,
        isHot,
        isTrending,
        selectionReason,
        relationshipToTopic
      );
      
      return {
        title: post.title,
        url: `https://reddit.com${post.url.startsWith('/r/') ? post.url : `/r/${post.subreddit}/comments/${post.id}`}`,
        summary,
        subreddit: post.subreddit,
        relevance,
        velocity,
        isHot,
        isTrending,
        category,
        selectionReason,
        relationshipToTopic
      };
    });
  }

  private calculateRelevance(post: RedditPost, searchTopic: string): number {
    let score = 0;
    
    // Base score from upvotes (0-40 scale)
    score += Math.min(post.score / 50, 40);
    
    // Engagement score from comments (0-30 scale)
    score += Math.min(post.num_comments / 20, 30);
    
    // Upvote ratio bonus (0-10 scale)
    if (post.upvote_ratio) {
      score += post.upvote_ratio * 10;
    }
    
    // Recency score (0-20 scale)
    const ageInDays = (Date.now() / 1000 - post.created_utc) / (60 * 60 * 24);
    if (ageInDays < 2) {
      score += 20;
    } else if (ageInDays < 7) {
      score += 15;
    } else if (ageInDays < 30) {
      score += 10;
    } else if (ageInDays < 90) {
      score += 5;
    }
    
    // Title relevance (0-20 scale)
    const titleLower = post.title.toLowerCase();
    const topicLower = searchTopic.toLowerCase();
    const topicWords = topicLower.split(' ').filter(w => w.length > 2);
    
    let titleRelevance = 0;
    for (const word of topicWords) {
      if (titleLower.includes(word)) {
        titleRelevance += 7;
      }
    }
    score += Math.min(titleRelevance, 20);
    
    // Subreddit specificity bonus
    const subredditLower = post.subreddit.toLowerCase();
    if (topicWords.some(word => subredditLower.includes(word))) {
      score += 10;
    }
    
    return Math.round(Math.min(score, 100));
  }

  private analyzeSelectionContext(
    post: RedditPost,
    searchTopic: string,
    category: ProcessedResult['category'],
    velocity: number,
    isHot: boolean
  ): { selectionReason: string; relationshipToTopic: string } {
    const titleLower = post.title.toLowerCase();
    const topicLower = searchTopic.toLowerCase();
    const topicWords = topicLower.split(' ').filter(w => w.length > 2);
    
    // Check for direct keyword matches
    const matchedKeywords = topicWords.filter(word => titleLower.includes(word));
    const hasDirectMatch = matchedKeywords.length > 0;
    
    let selectionReason = '';
    let relationshipToTopic = '';
    
    // Check for special patterns in title
    const inferredRelationship = this.inferRedditRelationship(post, searchTopic);
    const hasSpecialPattern = inferredRelationship !== `Insights from r/${post.subreddit} community`;
    
    if (category === 'hot-discussion') {
      if (isHot) {
        selectionReason = `Hot discussion in r/${post.subreddit} (${post.score} upvotes, ${post.num_comments} comments)`;
      } else {
        selectionReason = `Active discussion gaining traction (${Math.round(velocity)} upvotes/hour)`;
      }
      relationshipToTopic = hasSpecialPattern ? inferredRelationship : (hasDirectMatch
        ? `Direct discussion about ${matchedKeywords.join(', ')}`
        : inferredRelationship);
    } else if (category === 'technical-insight') {
      selectionReason = `Technical discussion in r/${post.subreddit}`;
      relationshipToTopic = hasSpecialPattern ? inferredRelationship : (hasDirectMatch
        ? `Specific implementation details for ${matchedKeywords.join(', ')}`
        : `Related technical concepts in ${post.subreddit} community`);
    } else if (category === 'community-wisdom') {
      selectionReason = `Popular community insight (${post.score} upvotes${post.upvote_ratio ? `, ${Math.round(post.upvote_ratio * 100)}% upvoted` : ''})`;
      relationshipToTopic = hasSpecialPattern ? inferredRelationship : (hasDirectMatch
        ? `Community experience with ${matchedKeywords.join(', ')}`
        : inferredRelationship);
    } else {
      selectionReason = 'Relevant discussion based on content matching';
      relationshipToTopic = hasSpecialPattern ? inferredRelationship : (hasDirectMatch
        ? `Contains keywords: ${matchedKeywords.join(', ')}`
        : 'Related to broader topic area');
    }
    
    return { selectionReason, relationshipToTopic };
  }

  private inferRedditRelationship(post: RedditPost, _searchTopic: string): string {
    const titleLower = post.title.toLowerCase();
    const subredditLower = post.subreddit.toLowerCase();
    
    // Check for common patterns in Reddit posts
    if (titleLower.includes('vs') || titleLower.includes('versus') || titleLower.includes('comparison')) {
      return 'Comparative analysis relevant to your technology choices';
    } else if (titleLower.includes('why') || titleLower.includes('when')) {
      return 'Decision-making insights applicable to your use case';
    } else if (titleLower.includes('mistake') || titleLower.includes('wrong') || titleLower.includes('avoid')) {
      return 'Common pitfalls and lessons learned';
    } else if (titleLower.includes('guide') || titleLower.includes('tutorial') || titleLower.includes('how to')) {
      return 'Implementation guidance that may apply';
    } else if (subredditLower.includes('career') || subredditLower.includes('experienced')) {
      return 'Professional perspective on technology decisions';
    } else if (post.link_flair_text?.toLowerCase().includes('discussion')) {
      return 'Community discussion with diverse viewpoints';
    } else {
      return `Insights from r/${post.subreddit} community`;
    }
  }

  private extractEnhancedSummary(
    post: RedditPost,
    velocity: number,
    isHot: boolean,
    isTrending: boolean,
    selectionReason: string,
    relationshipToTopic: string
  ): string {
    let prefix = '';
    
    // Add status indicators
    if (isHot) {
      prefix = '🔥 Hot: ';
    } else if (isTrending) {
      prefix = '🚀 Trending: ';
    } else if (post.score > 1000) {
      prefix = '⭐ Popular: ';
    }
    
    // Build metadata line
    const ageHours = (Date.now() / 1000 - post.created_utc) / 3600;
    const age = this.getRelativeTime(ageHours);
    
    let metadata = `r/${post.subreddit} • Posted ${age} • ${post.score} upvotes`;
    if (velocity > 5) {
      metadata += ` (${Math.round(velocity)}/hr)`;
    }
    metadata += ` • ${post.num_comments} comments`;
    
    // Add selection context
    const contextLine = `\n📎 ${selectionReason}\n🔗 ${relationshipToTopic}`;
    
    // Add content preview if available
    let contentPreview = '';
    if (post.selftext && post.selftext.length > 0) {
      contentPreview = '\n' + this.truncateText(post.selftext, 150);
    }
    
    return prefix + metadata + contextLine + contentPreview;
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

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace) + '...';
    }
    
    return truncated + '...';
  }

  private getRelativeTime(hours: number): string {
    if (hours < 1) {
      return 'just now';
    } else if (hours < 24) {
      return `${Math.floor(hours)} hour${Math.floor(hours) > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(hours / 24);
      if (days === 1) {
        return 'yesterday';
      } else if (days < 7) {
        return `${days} days ago`;
      } else if (days < 30) {
        const weeks = Math.floor(days / 7);
        return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
      } else if (days < 365) {
        const months = Math.floor(days / 30);
        return `${months} month${months > 1 ? 's' : ''} ago`;
      } else {
        const years = Math.floor(days / 365);
        return `${years} year${years > 1 ? 's' : ''} ago`;
      }
    }
  }
} 