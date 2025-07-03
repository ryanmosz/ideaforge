# Task 5.4 Detailed Implementation: Implement Reddit API integration

## Overview
This task implements the n8n workflow and supporting code for searching Reddit discussions. The integration will search relevant programming subreddits to gather community insights, opinions, and real-world experiences about technologies.

## Implementation Details

### 5.4.1 Set up Reddit OAuth2 in n8n

**Objective**: Configure Reddit API authentication using OAuth2 flow.

**Reddit App Registration**:
1. Go to https://www.reddit.com/prefs/apps
2. Create a new app:
   - Name: "IdeaForge Research Bot"
   - Type: "script" (for server-side applications)
   - Description: "Research tool for gathering tech discussions"
   - Redirect URI: `http://localhost:5678/webhook/reddit-oauth-callback`
3. Note the client ID and secret

**n8n OAuth2 Credentials Setup**:
```json
{
  "name": "Reddit OAuth2 API",
  "type": "n8n-nodes-base.oAuth2Api",
  "credentials": {
    "oAuth2Api": {
      "grantType": "clientCredentials",
      "accessTokenUrl": "https://www.reddit.com/api/v1/access_token",
      "clientId": "{{$credentials.clientId}}",
      "clientSecret": "{{$credentials.clientSecret}}",
      "scope": "read",
      "authentication": "header",
      "authenticationMethod": "basic"
    }
  }
}
```

**OAuth2 Token Management Node**:
```javascript
// Function node to handle OAuth2 token
const tokenManager = {
  token: null,
  expiresAt: null,
  
  async getToken() {
    const now = Date.now();
    
    // Check if token is still valid
    if (this.token && this.expiresAt && now < this.expiresAt) {
      return this.token;
    }
    
    // Request new token
    const credentials = $getCredentials('redditOAuth2');
    const authString = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64');
    
    const response = await $http.request({
      method: 'POST',
      url: 'https://www.reddit.com/api/v1/access_token',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'IdeaForge/1.0'
      },
      body: 'grant_type=client_credentials&scope=read'
    });
    
    if (response.data.access_token) {
      this.token = response.data.access_token;
      this.expiresAt = now + (response.data.expires_in * 1000) - 60000; // 1 minute buffer
      return this.token;
    }
    
    throw new Error('Failed to obtain Reddit access token');
  }
};

// Store in workflow static data
$setWorkflowStaticData('redditTokenManager', tokenManager);

// Get token for use
const token = await tokenManager.getToken();
return [{
  json: {
    ...$json,
    accessToken: token
  }
}];
```

**Environment Configuration**:
```typescript
// .env additions
REDDIT_CLIENT_ID=your_client_id_here
REDDIT_CLIENT_SECRET=your_client_secret_here
REDDIT_USER_AGENT=IdeaForge/1.0 (by /u/your_username)
REDDIT_RATE_LIMIT=60  # requests per minute
```

### 5.4.2 Configure subreddit search logic

**Objective**: Implement intelligent subreddit selection based on query context.

**Subreddit Configuration Node**:
```javascript
// Function node for dynamic subreddit selection
const getRelevantSubreddits = (query) => {
  const queryLower = query.toLowerCase();
  
  // Base technical subreddits
  const baseSubreddits = [
    'programming',
    'learnprogramming',
    'AskProgramming',
    'webdev',
    'cscareerquestions'
  ];
  
  // Technology-specific mappings
  const techSubreddits = {
    // Languages
    javascript: ['javascript', 'node', 'learnjavascript', 'typescript'],
    typescript: ['typescript', 'javascript', 'node'],
    python: ['python', 'learnpython', 'django', 'flask'],
    java: ['java', 'learnjava', 'javahelp'],
    cpp: ['cpp', 'cpp_questions', 'cplusplus'],
    csharp: ['csharp', 'dotnet', 'learncsharp'],
    rust: ['rust', 'learnrust'],
    go: ['golang', 'golang_infosec'],
    ruby: ['ruby', 'rails', 'learnruby'],
    php: ['PHP', 'laravel', 'symfony'],
    swift: ['swift', 'iOSProgramming'],
    kotlin: ['Kotlin', 'androiddev'],
    
    // Frameworks/Libraries
    react: ['reactjs', 'reactnative', 'learnreactjs'],
    vue: ['vuejs', 'vuetifyjs'],
    angular: ['angular', 'angularjs'],
    django: ['django', 'djangolearning'],
    spring: ['springframework', 'java'],
    express: ['node', 'expressjs'],
    
    // Topics
    'machine learning': ['MachineLearning', 'learnmachinelearning', 'deeplearning'],
    'data science': ['datascience', 'learnpython', 'dataengineering'],
    blockchain: ['blockchain', 'ethereum', 'CryptoCurrency'],
    gamedev: ['gamedev', 'unity3d', 'unrealengine', 'godot'],
    mobile: ['androiddev', 'iOSProgramming', 'reactnative', 'FlutterDev'],
    devops: ['devops', 'kubernetes', 'docker', 'aws', 'sysadmin'],
    security: ['netsec', 'AskNetsec', 'cybersecurity', 'hacking'],
    
    // Databases
    sql: ['SQL', 'Database', 'PostgreSQL', 'mysql'],
    mongodb: ['mongodb', 'node'],
    redis: ['redis', 'caching']
  };
  
  // Collect relevant subreddits
  const relevantSubs = new Set(baseSubreddits);
  
  // Check each tech keyword
  Object.entries(techSubreddits).forEach(([tech, subs]) => {
    if (queryLower.includes(tech)) {
      subs.forEach(sub => relevantSubs.add(sub));
    }
  });
  
  // Add career/job related if query contains certain keywords
  if (queryLower.match(/job|career|interview|salary|hire|freelance/)) {
    relevantSubs.add('cscareerquestions');
    relevantSubs.add('ITCareerQuestions');
    relevantSubs.add('freelance');
  }
  
  // Add learning subreddits if query is educational
  if (queryLower.match(/learn|tutorial|beginner|start|how to/)) {
    relevantSubs.add('learnprogramming');
    relevantSubs.add('coding');
    relevantSubs.add('AskProgramming');
  }
  
  // Limit to prevent API overload
  return Array.from(relevantSubs).slice(0, 15);
};

// Apply subreddit selection
const subreddits = getRelevantSubreddits($json.query);
console.log(`Selected subreddits for "${$json.query}": ${subreddits.join(', ')}`);

return [{
  json: {
    ...$json,
    subreddits: subreddits,
    subredditCount: subreddits.length
  }
}];
```

**Subreddit Validation Node**:
```javascript
// Validate subreddits exist and are accessible
const validateSubreddits = async (subreddits, token) => {
  const validSubs = [];
  const invalidSubs = [];
  
  for (const sub of subreddits) {
    try {
      const response = await $http.request({
        method: 'GET',
        url: `https://oauth.reddit.com/r/${sub}/about.json`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'IdeaForge/1.0'
        },
        timeout: 5000
      });
      
      const data = response.data?.data;
      if (data && !data.over_18 && data.subreddit_type === 'public') {
        validSubs.push({
          name: sub,
          subscribers: data.subscribers,
          active: data.accounts_active || 0
        });
      }
    } catch (error) {
      console.log(`Subreddit ${sub} validation failed:`, error.message);
      invalidSubs.push(sub);
    }
  }
  
  // Sort by subscriber count
  validSubs.sort((a, b) => b.subscribers - a.subscribers);
  
  return {
    valid: validSubs.map(s => s.name),
    invalid: invalidSubs,
    metadata: validSubs
  };
};
```

### 5.4.3 Implement post and comment search

**Objective**: Search both posts and comments for comprehensive coverage.

**Reddit Search Implementation**:
```javascript
// Main search node
const searchReddit = async (query, subreddits, token, options = {}) => {
  const results = {
    posts: [],
    comments: []
  };
  
  // Default options
  const searchOptions = {
    limit: options.limit || 25,
    sort: options.sort || 'relevance',
    time: options.time || 'all',
    includeComments: options.includeComments !== false,
    includePosts: options.includePosts !== false
  };
  
  // Build search query
  const searchQuery = encodeURIComponent(query);
  const subredditList = subreddits.join('+');
  
  try {
    // Search posts
    if (searchOptions.includePosts) {
      const postUrl = `https://oauth.reddit.com/r/${subredditList}/search.json?` +
        `q=${searchQuery}&restrict_sr=on&sort=${searchOptions.sort}&` +
        `t=${searchOptions.time}&limit=${searchOptions.limit}&type=link`;
      
      const postResponse = await $http.request({
        method: 'GET',
        url: postUrl,
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'IdeaForge/1.0'
        }
      });
      
      if (postResponse.data?.data?.children) {
        results.posts = postResponse.data.data.children
          .map(child => child.data)
          .filter(post => !post.over_18 && !post.removed && !post.locked);
      }
    }
    
    // Search comments (if enabled)
    if (searchOptions.includeComments) {
      // Reddit doesn't have direct comment search, so we search in comments subreddit
      const commentUrl = `https://oauth.reddit.com/search.json?` +
        `q=${searchQuery}&type=comment&sort=${searchOptions.sort}&` +
        `t=${searchOptions.time}&limit=${Math.floor(searchOptions.limit / 2)}`;
      
      const commentResponse = await $http.request({
        method: 'GET',
        url: commentUrl,
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'IdeaForge/1.0'
        }
      });
      
      if (commentResponse.data?.data?.children) {
        results.comments = commentResponse.data.data.children
          .map(child => child.data)
          .filter(comment => 
            subreddits.includes(comment.subreddit) &&
            !comment.removed &&
            comment.body !== '[deleted]'
          );
      }
    }
    
  } catch (error) {
    console.error('Reddit search error:', error);
    throw error;
  }
  
  return results;
};

// Execute search
const results = await searchReddit(
  $json.query,
  $json.subreddits,
  $json.accessToken,
  $json.options
);

return [{
  json: {
    query: $json.query,
    results: results,
    metadata: {
      searchTime: Date.now() - $json.startTime,
      postCount: results.posts.length,
      commentCount: results.comments.length,
      subreddits: $json.subreddits
    }
  }
}];
```

**Advanced Search Features**:
```javascript
// Enhanced search with filters and operators
const buildAdvancedQuery = (baseQuery, filters = {}) => {
  let query = baseQuery;
  
  // Add boolean operators
  if (filters.must) {
    query += ` ${filters.must.map(term => `+${term}`).join(' ')}`;
  }
  
  if (filters.exclude) {
    query += ` ${filters.exclude.map(term => `-${term}`).join(' ')}`;
  }
  
  // Add field-specific searches
  if (filters.author) {
    query += ` author:${filters.author}`;
  }
  
  if (filters.site) {
    query += ` site:${filters.site}`;
  }
  
  if (filters.selftext) {
    query += ` selftext:"${filters.selftext}"`;
  }
  
  // Add flair filter
  if (filters.flair) {
    query += ` flair:"${filters.flair}"`;
  }
  
  return query;
};

// Example usage
const advancedQuery = buildAdvancedQuery($json.query, {
  must: ['performance', 'optimization'],
  exclude: ['slow', 'bug'],
  flair: 'Discussion'
});
```

### 5.4.4 Add content filtering (NSFW, deleted)

**Objective**: Implement comprehensive content filtering for quality and safety.

**Content Filter Implementation**:
```javascript
// Content filtering node
const filterRedditContent = (posts, comments, options = {}) => {
  const filters = {
    removeNSFW: options.removeNSFW !== false,
    removeDeleted: options.removeDeleted !== false,
    removeLocked: options.removeLocked !== false,
    removeControversial: options.removeControversial || false,
    minScore: options.minScore || 0,
    minComments: options.minComments || 0,
    blacklistAuthors: options.blacklistAuthors || ['AutoModerator', '[deleted]'],
    blacklistDomains: options.blacklistDomains || [],
    maxAge: options.maxAge || null, // in days
    requireText: options.requireText || false
  };
  
  // Filter posts
  const filteredPosts = posts.filter(post => {
    // NSFW check
    if (filters.removeNSFW && (post.over_18 || post.spoiler)) {
      return false;
    }
    
    // Deleted/removed check
    if (filters.removeDeleted && (post.removed || post.selftext === '[removed]')) {
      return false;
    }
    
    // Locked check
    if (filters.removeLocked && post.locked) {
      return false;
    }
    
    // Score threshold
    if (post.score < filters.minScore) {
      return false;
    }
    
    // Comment threshold
    if (post.num_comments < filters.minComments) {
      return false;
    }
    
    // Author blacklist
    if (filters.blacklistAuthors.includes(post.author)) {
      return false;
    }
    
    // Domain blacklist
    if (post.domain && filters.blacklistDomains.includes(post.domain)) {
      return false;
    }
    
    // Age filter
    if (filters.maxAge) {
      const ageInDays = (Date.now() / 1000 - post.created_utc) / 86400;
      if (ageInDays > filters.maxAge) {
        return false;
      }
    }
    
    // Text requirement (for self posts)
    if (filters.requireText && post.is_self && (!post.selftext || post.selftext.length < 50)) {
      return false;
    }
    
    // Controversial filter (low upvote ratio)
    if (filters.removeControversial && post.upvote_ratio < 0.6) {
      return false;
    }
    
    return true;
  });
  
  // Filter comments
  const filteredComments = comments.filter(comment => {
    // Deleted check
    if (filters.removeDeleted && (comment.body === '[deleted]' || comment.body === '[removed]')) {
      return false;
    }
    
    // Score threshold
    if (comment.score < filters.minScore) {
      return false;
    }
    
    // Author blacklist
    if (filters.blacklistAuthors.includes(comment.author)) {
      return false;
    }
    
    // Age filter
    if (filters.maxAge) {
      const ageInDays = (Date.now() / 1000 - comment.created_utc) / 86400;
      if (ageInDays > filters.maxAge) {
        return false;
      }
    }
    
    // Minimum content length
    if (comment.body.length < 20) {
      return false;
    }
    
    // Filter low-effort comments
    const lowEffortPatterns = [
      /^(this|yes|no|lol|lmao|same|agreed|disagree)\.?$/i,
      /^\^+$/,
      /^[!?.]+$/
    ];
    
    if (lowEffortPatterns.some(pattern => pattern.test(comment.body.trim()))) {
      return false;
    }
    
    return true;
  });
  
  return {
    posts: filteredPosts,
    comments: filteredComments,
    filtered: {
      posts: posts.length - filteredPosts.length,
      comments: comments.length - filteredComments.length
    }
  };
};

// Apply filtering
const filtered = filterRedditContent(
  $json.results.posts,
  $json.results.comments,
  {
    minScore: 5,
    minComments: 2,
    maxAge: 365, // 1 year
    removeControversial: true
  }
);

return [{
  json: {
    ...$json,
    results: filtered,
    filteringMetadata: filtered.filtered
  }
}];
```

**Quality Scoring**:
```javascript
// Add quality scores to filtered content
const scoreRedditContent = (item, type = 'post') => {
  let qualityScore = 0;
  
  if (type === 'post') {
    // Base score from Reddit metrics
    qualityScore += item.score || 0;
    qualityScore += (item.num_comments || 0) * 3;
    qualityScore += (item.upvote_ratio || 0.5) * 100;
    
    // Awards boost
    if (item.all_awardings && item.all_awardings.length > 0) {
      qualityScore += item.all_awardings.length * 50;
    }
    
    // Content quality indicators
    if (item.is_self && item.selftext) {
      // Longer self posts are often more valuable
      qualityScore += Math.min(item.selftext.length / 100, 50);
      
      // Code blocks indicate technical content
      const codeBlocks = (item.selftext.match(/```/g) || []).length / 2;
      qualityScore += codeBlocks * 20;
      
      // Links to documentation/resources
      const links = (item.selftext.match(/https?:\/\//g) || []).length;
      qualityScore += links * 5;
    }
    
    // Engagement ratio
    if (item.num_comments > 0 && item.score > 0) {
      const engagementRatio = item.num_comments / item.score;
      if (engagementRatio > 0.1) {
        qualityScore += 30; // High engagement relative to upvotes
      }
    }
    
  } else if (type === 'comment') {
    // Base score
    qualityScore += item.score || 0;
    
    // Depth penalty (deeper comments often less relevant)
    qualityScore -= (item.depth || 0) * 5;
    
    // Length bonus
    qualityScore += Math.min(item.body.length / 50, 20);
    
    // Awards
    if (item.all_awardings && item.all_awardings.length > 0) {
      qualityScore += item.all_awardings.length * 30;
    }
    
    // Gilded bonus
    if (item.gilded > 0) {
      qualityScore += item.gilded * 100;
    }
    
    // Author reputation (simplified)
    if (item.author_flair_css_class === 'expert' || 
        item.author_flair_text?.includes('Expert')) {
      qualityScore += 50;
    }
  }
  
  // Time decay
  const ageInDays = (Date.now() / 1000 - item.created_utc) / 86400;
  const timeDecay = Math.max(0, 1 - (ageInDays / 365));
  qualityScore *= (0.5 + timeDecay * 0.5);
  
  return Math.round(qualityScore);
};

// Apply scoring
item.qualityScore = scoreRedditContent(item, type);
```

### 5.4.5 Create TypeScript types for Reddit data

**Objective**: Define comprehensive types for Reddit API responses.

**Type Definitions**:
```typescript
// src/types/reddit-types.ts
export interface RedditPost {
  id: string;
  name: string; // fullname (t3_id)
  subreddit: string;
  subreddit_id: string;
  author: string;
  author_fullname?: string;
  title: string;
  selftext?: string;
  selftext_html?: string;
  url: string;
  permalink: string;
  domain?: string;
  
  // Metrics
  score: number;
  upvote_ratio: number;
  ups: number;
  downs: number;
  num_comments: number;
  
  // Status flags
  over_18: boolean;
  spoiler: boolean;
  locked: boolean;
  archived: boolean;
  removed?: boolean;
  approved?: boolean;
  hidden: boolean;
  quarantine: boolean;
  stickied: boolean;
  is_self: boolean;
  is_video: boolean;
  is_reddit_media_domain: boolean;
  
  // Timestamps
  created: number;
  created_utc: number;
  edited: boolean | number;
  
  // Awards and flair
  all_awardings?: RedditAward[];
  gilded: number;
  link_flair_text?: string;
  link_flair_css_class?: string;
  author_flair_text?: string;
  author_flair_css_class?: string;
  
  // Media
  thumbnail?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
  preview?: RedditPreview;
  media?: RedditMedia;
  
  // Additional metadata
  suggested_sort?: string;
  num_crossposts: number;
  crosspost_parent_list?: RedditPost[];
  distinguished?: string;
  
  // Custom fields
  qualityScore?: number;
  relevanceScore?: number;
}

export interface RedditComment {
  id: string;
  name: string; // fullname (t1_id)
  subreddit: string;
  subreddit_id: string;
  link_id: string; // parent post id (t3_xxx)
  parent_id: string; // parent comment or post (t1_xxx or t3_xxx)
  author: string;
  author_fullname?: string;
  body: string;
  body_html: string;
  
  // Metrics
  score: number;
  ups: number;
  downs: number;
  
  // Status
  archived: boolean;
  removed?: boolean;
  approved?: boolean;
  locked: boolean;
  collapsed: boolean;
  collapsed_reason?: string;
  score_hidden: boolean;
  
  // Timestamps
  created: number;
  created_utc: number;
  edited: boolean | number;
  
  // Awards and flair
  all_awardings?: RedditAward[];
  gilded: number;
  author_flair_text?: string;
  author_flair_css_class?: string;
  
  // Thread context
  depth: number;
  permalink: string;
  link_title?: string;
  link_author?: string;
  link_permalink?: string;
  
  // Additional metadata
  distinguished?: string;
  stickied: boolean;
  is_submitter: boolean;
  
  // Custom fields
  qualityScore?: number;
  relevanceScore?: number;
}

export interface RedditAward {
  id: string;
  name: string;
  description: string;
  icon_url: string;
  icon_width: number;
  icon_height: number;
  count: number;
}

export interface RedditPreview {
  images: Array<{
    source: RedditImage;
    resolutions: RedditImage[];
    id: string;
  }>;
  enabled: boolean;
}

export interface RedditImage {
  url: string;
  width: number;
  height: number;
}

export interface RedditMedia {
  type?: string;
  oembed?: {
    provider_name: string;
    title: string;
    url: string;
    thumbnail_url?: string;
  };
  reddit_video?: {
    fallback_url: string;
    height: number;
    width: number;
    duration: number;
  };
}

export interface RedditSearchResults {
  posts: RedditPost[];
  comments: RedditComment[];
  metadata?: {
    subreddits: string[];
    totalResults: number;
    filtered: number;
    searchTime: number;
  };
}

export interface RedditWebhookRequest {
  query: string;
  subreddits?: string[];
  options?: {
    sortBy?: 'relevance' | 'hot' | 'top' | 'new' | 'comments';
    timeframe?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
    limit?: number;
    includeComments?: boolean;
    includePosts?: boolean;
    filters?: RedditContentFilters;
  };
}

export interface RedditContentFilters {
  removeNSFW?: boolean;
  removeDeleted?: boolean;
  removeLocked?: boolean;
  removeControversial?: boolean;
  minScore?: number;
  minComments?: number;
  maxAge?: number; // in days
  blacklistAuthors?: string[];
  blacklistDomains?: string[];
}

export interface RedditWebhookResponse {
  status: 'success' | 'error' | 'rate_limited';
  data?: RedditSearchResults;
  error?: string;
  metadata: {
    cached: boolean;
    requestDuration: number;
    timestamp: string;
    sessionId: string;
    rateLimitUsed?: number;
    rateLimitRemaining?: number;
    rateLimitReset?: number;
  };
}
```

**Type Guards**:
```typescript
// src/utils/reddit-validators.ts
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

export function validateRedditSearchRequest(request: any): RedditWebhookRequest {
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
      .filter(s => typeof s === 'string' && s.length > 0)
      .map(s => s.trim());
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

function validateContentFilters(filters: any): RedditContentFilters {
  const validated: RedditContentFilters = {};
  
  // Boolean filters
  const booleanFilters = ['removeNSFW', 'removeDeleted', 'removeLocked', 'removeControversial'];
  booleanFilters.forEach(filter => {
    if (typeof filters[filter] === 'boolean') {
      validated[filter] = filters[filter];
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
      .filter(a => typeof a === 'string');
  }
  
  if (Array.isArray(filters.blacklistDomains)) {
    validated.blacklistDomains = filters.blacklistDomains
      .filter(d => typeof d === 'string');
  }
  
  return validated;
}
```

### 5.4.6 Test OAuth token refresh

**Objective**: Ensure reliable token management and refresh.

**Token Refresh Testing**:
```javascript
// Token refresh test node
const testTokenRefresh = async () => {
  const tokenManager = $getWorkflowStaticData('redditTokenManager');
  const results = {
    initialToken: null,
    refreshedToken: null,
    testRequests: [],
    errors: []
  };
  
  try {
    // Get initial token
    results.initialToken = await tokenManager.getToken();
    console.log('Initial token obtained');
    
    // Make a test request
    const testResponse1 = await $http.request({
      method: 'GET',
      url: 'https://oauth.reddit.com/api/v1/me',
      headers: {
        'Authorization': `Bearer ${results.initialToken}`,
        'User-Agent': 'IdeaForge/1.0'
      }
    });
    
    results.testRequests.push({
      endpoint: '/api/v1/me',
      status: testResponse1.status,
      success: true
    });
    
    // Force token expiration for testing
    tokenManager.expiresAt = Date.now() - 1000;
    
    // Get new token (should trigger refresh)
    results.refreshedToken = await tokenManager.getToken();
    console.log('Token refreshed');
    
    // Verify new token works
    const testResponse2 = await $http.request({
      method: 'GET',
      url: 'https://oauth.reddit.com/r/programming/about.json',
      headers: {
        'Authorization': `Bearer ${results.refreshedToken}`,
        'User-Agent': 'IdeaForge/1.0'
      }
    });
    
    results.testRequests.push({
      endpoint: '/r/programming/about',
      status: testResponse2.status,
      success: true
    });
    
    // Verify tokens are different
    results.tokenChanged = results.initialToken !== results.refreshedToken;
    
  } catch (error) {
    results.errors.push({
      message: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    });
  }
  
  return results;
};

// Run token refresh test
const testResults = await testTokenRefresh();

return [{
  json: {
    test: 'OAuth Token Refresh',
    results: testResults,
    success: testResults.errors.length === 0 && testResults.tokenChanged
  }
}];
```

**Automated Token Monitoring**:
```javascript
// Monitor token health and preemptively refresh
const monitorTokenHealth = () => {
  const tokenManager = $getWorkflowStaticData('redditTokenManager');
  
  // Check token expiration
  const now = Date.now();
  const timeUntilExpiry = tokenManager.expiresAt ? tokenManager.expiresAt - now : 0;
  
  const health = {
    hasToken: !!tokenManager.token,
    expiresIn: timeUntilExpiry,
    isExpired: timeUntilExpiry <= 0,
    shouldRefresh: timeUntilExpiry < 300000, // Refresh if less than 5 minutes
    lastRefresh: tokenManager.lastRefresh || null
  };
  
  // Preemptive refresh
  if (health.shouldRefresh && !health.isExpired) {
    console.log('Preemptively refreshing token');
    tokenManager.expiresAt = 0; // Force refresh on next request
  }
  
  return health;
};

// Add to workflow execution
const tokenHealth = monitorTokenHealth();
if (!tokenHealth.hasToken || tokenHealth.isExpired) {
  throw new Error('Reddit token is invalid or expired');
}
```

### 5.4.7 Verify rate limit compliance

**Objective**: Implement and test Reddit API rate limiting.

**Rate Limiter Implementation**:
```javascript
// Reddit-specific rate limiter
class RedditRateLimiter {
  constructor() {
    this.limits = {
      authenticated: {
        requests: 600,
        window: 600000, // 10 minutes
        perSecond: 1 // Max 1 request per second
      }
    };
    
    this.usage = {
      requests: [],
      lastRequest: 0
    };
  }
  
  async checkLimit() {
    const now = Date.now();
    const window = this.limits.authenticated.window;
    
    // Remove old requests outside window
    this.usage.requests = this.usage.requests.filter(
      timestamp => now - timestamp < window
    );
    
    // Check window limit
    if (this.usage.requests.length >= this.limits.authenticated.requests) {
      const oldestRequest = Math.min(...this.usage.requests);
      const waitTime = window - (now - oldestRequest);
      
      return {
        allowed: false,
        waitTime: waitTime,
        reason: 'Rate limit exceeded for window'
      };
    }
    
    // Check per-second limit
    const timeSinceLastRequest = now - this.usage.lastRequest;
    if (timeSinceLastRequest < 1000) {
      return {
        allowed: false,
        waitTime: 1000 - timeSinceLastRequest,
        reason: 'Too many requests per second'
      };
    }
    
    return {
      allowed: true,
      remaining: this.limits.authenticated.requests - this.usage.requests.length,
      resetsIn: window
    };
  }
  
  recordRequest() {
    const now = Date.now();
    this.usage.requests.push(now);
    this.usage.lastRequest = now;
  }
  
  async waitIfNeeded() {
    const limit = await this.checkLimit();
    
    if (!limit.allowed) {
      console.log(`Rate limit: waiting ${limit.waitTime}ms - ${limit.reason}`);
      await new Promise(resolve => setTimeout(resolve, limit.waitTime));
      
      // Recheck after waiting
      return this.waitIfNeeded();
    }
    
    this.recordRequest();
    return limit;
  }
}

// Initialize rate limiter in workflow
const rateLimiter = new RedditRateLimiter();
$setWorkflowStaticData('redditRateLimiter', rateLimiter);

// Use before each API request
await rateLimiter.waitIfNeeded();
```

**Rate Limit Response Headers**:
```javascript
// Parse and track Reddit rate limit headers
const parseRateLimitHeaders = (headers) => {
  const rateLimitInfo = {
    used: parseInt(headers['x-ratelimit-used'] || '0'),
    remaining: parseInt(headers['x-ratelimit-remaining'] || '0'),
    reset: parseInt(headers['x-ratelimit-reset'] || '0'),
    resetDate: null
  };
  
  if (rateLimitInfo.reset) {
    rateLimitInfo.resetDate = new Date(rateLimitInfo.reset * 1000);
  }
  
  // Update rate limiter with actual API feedback
  const rateLimiter = $getWorkflowStaticData('redditRateLimiter');
  if (rateLimiter && rateLimitInfo.remaining !== null) {
    // Sync internal tracking with API response
    rateLimiter.usage.requests = Array(rateLimitInfo.used).fill(Date.now());
  }
  
  return rateLimitInfo;
};

// Add to response handling
const rateLimitInfo = parseRateLimitHeaders(response.headers);
console.log(`Reddit API: ${rateLimitInfo.remaining} requests remaining, resets at ${rateLimitInfo.resetDate}`);
```

**Rate Limit Testing**:
```javascript
// Comprehensive rate limit test
const testRateLimiting = async () => {
  const results = {
    testName: 'Reddit Rate Limiting',
    requests: [],
    rateLimitHit: false,
    errors: []
  };
  
  const rateLimiter = $getWorkflowStaticData('redditRateLimiter');
  const token = await $getWorkflowStaticData('redditTokenManager').getToken();
  
  // Attempt rapid requests
  for (let i = 0; i < 5; i++) {
    const startTime = Date.now();
    
    try {
      // Check rate limit
      const limitCheck = await rateLimiter.checkLimit();
      
      if (!limitCheck.allowed) {
        results.rateLimitHit = true;
        results.requests.push({
          index: i,
          blocked: true,
          waitTime: limitCheck.waitTime,
          reason: limitCheck.reason
        });
        
        // Wait as required
        await new Promise(resolve => setTimeout(resolve, limitCheck.waitTime));
      }
      
      // Make request
      await rateLimiter.waitIfNeeded();
      
      const response = await $http.request({
        method: 'GET',
        url: `https://oauth.reddit.com/r/programming/hot.json?limit=1`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'IdeaForge/1.0'
        }
      });
      
      const rateLimitInfo = parseRateLimitHeaders(response.headers);
      
      results.requests.push({
        index: i,
        success: true,
        duration: Date.now() - startTime,
        remaining: rateLimitInfo.remaining,
        used: rateLimitInfo.used
      });
      
    } catch (error) {
      results.errors.push({
        index: i,
        error: error.message,
        status: error.response?.status
      });
    }
  }
  
  return results;
};

// Run test
const rateLimitTest = await testRateLimiting();
return [{
  json: rateLimitTest
}];
```

## Testing Checklist

### Unit Tests
```typescript
// tests/services/reddit-search.test.ts
describe('Reddit Search Integration', () => {
  describe('Subreddit Selection', () => {
    it('should select appropriate subreddits for technology queries', () => {
      const subreddits = getRelevantSubreddits('javascript react');
      expect(subreddits).toContain('javascript');
      expect(subreddits).toContain('reactjs');
      expect(subreddits).toContain('webdev');
    });
    
    it('should limit subreddit count', () => {
      const subreddits = getRelevantSubreddits('programming web mobile data science machine learning ai cloud devops security database frontend backend');
      expect(subreddits.length).toBeLessThanOrEqual(15);
    });
  });
  
  describe('Content Filtering', () => {
    it('should filter NSFW content', () => {
      const posts = [
        { id: '1', over_18: true, score: 100 },
        { id: '2', over_18: false, score: 50 }
      ];
      
      const filtered = filterRedditContent(posts, [], { removeNSFW: true });
      expect(filtered.posts).toHaveLength(1);
      expect(filtered.posts[0].id).toBe('2');
    });
    
    it('should filter by minimum score', () => {
      const comments = [
        { id: '1', score: 10, body: 'Great point!' },
        { id: '2', score: 2, body: 'I agree' },
        { id: '3', score: -5, body: 'Disagree' }
      ];
      
      const filtered = filterRedditContent([], comments, { minScore: 5 });
      expect(filtered.comments).toHaveLength(1);
      expect(filtered.comments[0].id).toBe('1');
    });
    
    it('should filter low-effort comments', () => {
      const comments = [
        { id: '1', body: 'This', score: 10 },
        { id: '2', body: '^^^^^', score: 5 },
        { id: '3', body: 'This is a detailed explanation...', score: 3 }
      ];
      
      const filtered = filterRedditContent([], comments, {});
      expect(filtered.comments).toHaveLength(1);
      expect(filtered.comments[0].id).toBe('3');
    });
  });
  
  describe('OAuth Token Management', () => {
    it('should refresh expired tokens', async () => {
      const tokenManager = createTokenManager();
      
      // Set expired token
      tokenManager.token = 'old-token';
      tokenManager.expiresAt = Date.now() - 1000;
      
      const newToken = await tokenManager.getToken();
      expect(newToken).not.toBe('old-token');
      expect(tokenManager.expiresAt).toBeGreaterThan(Date.now());
    });
  });
  
  describe('Rate Limiting', () => {
    it('should enforce per-second limits', async () => {
      const limiter = new RedditRateLimiter();
      
      await limiter.waitIfNeeded();
      const immediate = await limiter.checkLimit();
      
      expect(immediate.allowed).toBe(false);
      expect(immediate.waitTime).toBeGreaterThan(0);
      expect(immediate.waitTime).toBeLessThanOrEqual(1000);
    });
    
    it('should track request window', async () => {
      const limiter = new RedditRateLimiter();
      
      // Simulate many requests
      for (let i = 0; i < 600; i++) {
        limiter.recordRequest();
      }
      
      const check = await limiter.checkLimit();
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('window');
    });
  });
});
```

### Integration Tests
```typescript
// tests/integration/reddit-workflow.test.ts
describe('Reddit Workflow Integration', () => {
  let token: string;
  
  beforeAll(async () => {
    // Get real token for integration tests
    token = await getRedditToken();
  });
  
  it('should search posts successfully', async () => {
    const response = await testWorkflow({
      query: 'typescript',
      subreddits: ['typescript'],
      options: {
        limit: 5,
        includePosts: true,
        includeComments: false
      }
    });
    
    expect(response.status).toBe('success');
    expect(response.data.posts).toBeDefined();
    expect(response.data.posts.length).toBeGreaterThan(0);
    expect(response.data.posts[0].subreddit).toBe('typescript');
  }, 30000);
  
  it('should handle invalid subreddits', async () => {
    const response = await testWorkflow({
      query: 'test',
      subreddits: ['this_subreddit_does_not_exist_12345'],
      options: { limit: 5 }
    });
    
    expect(response.status).toBe('success');
    expect(response.data.posts).toHaveLength(0);
  });
  
  it('should respect rate limits', async () => {
    const requests = [];
    
    // Make 5 rapid requests
    for (let i = 0; i < 5; i++) {
      requests.push(testWorkflow({
        query: `test-${i}`,
        subreddits: ['programming'],
        options: { limit: 1 }
      }));
    }
    
    const results = await Promise.all(requests);
    
    // All should succeed (rate limiter should handle delays)
    results.forEach(result => {
      expect(result.status).not.toBe('rate_limited');
    });
  }, 60000);
});
```

### Manual Testing Checklist

1. **OAuth Flow**:
   - [ ] Initial token acquisition
   - [ ] Token refresh after expiry
   - [ ] Invalid credentials handling
   - [ ] Network failure during auth

2. **Search Functionality**:
   - [ ] Single subreddit search
   - [ ] Multi-subreddit search
   - [ ] Comment search
   - [ ] Various sort options
   - [ ] Time-based filtering

3. **Content Filtering**:
   - [ ] NSFW content removal
   - [ ] Deleted content handling
   - [ ] Score thresholds
   - [ ] Author blacklisting

4. **Rate Limiting**:
   - [ ] Sequential request delays
   - [ ] Window limit enforcement
   - [ ] Header parsing accuracy
   - [ ] Recovery after limit hit

5. **Error Scenarios**:
   - [ ] Invalid subreddit names
   - [ ] Network timeouts
   - [ ] Malformed responses
   - [ ] Token expiration mid-request

## Common Issues and Solutions

### Issue: OAuth token expires during long workflows
**Solution**: Implement token refresh check before each request batch
```javascript
// Check token validity before batch operations
const ensureValidToken = async () => {
  const tokenManager = $getWorkflowStaticData('redditTokenManager');
  const timeUntilExpiry = tokenManager.expiresAt - Date.now();
  
  if (timeUntilExpiry < 60000) { // Less than 1 minute
    console.log('Proactively refreshing token');
    tokenManager.expiresAt = 0; // Force refresh
    await tokenManager.getToken();
  }
};
```

### Issue: Subreddit validation slows down searches
**Solution**: Cache subreddit validation results
```javascript
const subredditCache = $getWorkflowStaticData('subredditCache') || {};
const cacheKey = subreddit.toLowerCase();

if (subredditCache[cacheKey]) {
  return subredditCache[cacheKey];
}

// Validate and cache result
const isValid = await validateSubreddit(subreddit);
subredditCache[cacheKey] = isValid;
$setWorkflowStaticData('subredditCache', subredditCache);
```

### Issue: Comment search returns unrelated results
**Solution**: Filter comments by parent post relevance
```javascript
// Only include comments from posts that match the query
const relevantPosts = posts.filter(post => 
  post.title.toLowerCase().includes(query.toLowerCase()) ||
  post.selftext?.toLowerCase().includes(query.toLowerCase())
);

const relevantPostIds = relevantPosts.map(p => `t3_${p.id}`);

comments = comments.filter(comment => 
  relevantPostIds.includes(comment.link_id)
);
```

## Next Steps

After completing task 5.4:
1. Test OAuth flow with various network conditions
2. Optimize subreddit selection algorithm
3. Fine-tune content quality scoring
4. Monitor rate limit usage patterns
5. Prepare for caching implementation (task 5.5) 