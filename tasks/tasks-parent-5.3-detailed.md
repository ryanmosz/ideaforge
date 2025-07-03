# Task 5.3 Detailed Implementation: Implement Hacker News API integration

## Overview
This task implements the n8n workflow and supporting code for searching Hacker News discussions via the Algolia HN Search API. The integration will provide valuable insights from the developer community about technologies mentioned in project documents.

## Implementation Details

### 5.3.1 Add HN search nodes to n8n workflow

**Objective**: Build the complete n8n workflow for Hacker News search functionality.

**Workflow Structure**:
```json
{
  "name": "IdeaForge - HackerNews Search",
  "nodes": [
    {
      "parameters": {
        "path": "ideaforge/hackernews-search",
        "responseMode": "responseNode",
        "options": {
          "responseCode": 200
        }
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300]
    },
    {
      "parameters": {
        "jsCode": "// Validate and extract request data\nconst body = $input.all()[0].json;\n\nif (!body.query || !body.sessionId) {\n  throw new Error('Missing required fields: query and sessionId');\n}\n\nreturn [{\n  json: {\n    query: body.query.trim(),\n    sessionId: body.sessionId,\n    options: body.options || {}\n  }\n}];"
      },
      "name": "Validate Request",
      "type": "n8n-nodes-base.code",
      "position": [450, 300]
    },
    {
      "parameters": {
        "url": "https://hn.algolia.com/api/v1/search",
        "method": "GET",
        "queryParametersUi": {
          "parameter": [
            {
              "name": "query",
              "value": "={{$json.query}}"
            },
            {
              "name": "tags",
              "value": "={{$json.options.tags || 'story,comment'}}"
            },
            {
              "name": "hitsPerPage",
              "value": "={{$json.options.limit || 30}}"
            }
          ]
        },
        "options": {
          "response": {
            "response": {
              "fullResponse": true
            }
          }
        }
      },
      "name": "Search HN API",
      "type": "n8n-nodes-base.httpRequest",
      "position": [650, 300]
    }
  ]
}
```

**Error Handling Node**:
```javascript
// Function node after HTTP request
const response = $input.all()[0].json;

if (response.statusCode !== 200) {
  return [{
    json: {
      status: 'error',
      error: `HN API returned status ${response.statusCode}`,
      metadata: {
        cached: false,
        requestDuration: Date.now() - $json.startTime
      }
    }
  }];
}

// Continue with successful response
return [{
  json: {
    ...response.body,
    metadata: {
      requestDuration: Date.now() - $json.startTime,
      resultsCount: response.body.hits?.length || 0
    }
  }
}];
```

**Response Formatting Node**:
```javascript
// Final transformation before webhook response
const hits = $json.hits || [];
const sessionId = $json.sessionId;

return [{
  json: {
    status: 'success',
    data: {
      hits: hits,
      nbHits: $json.nbHits,
      page: $json.page,
      nbPages: $json.nbPages,
      query: $json.query,
      params: $json.params
    },
    metadata: {
      cached: false,
      requestDuration: $json.metadata.requestDuration,
      timestamp: new Date().toISOString(),
      sessionId: sessionId
    }
  }
}];
```

### 5.3.2 Configure Algolia API parameters

**Objective**: Implement comprehensive search parameter handling for optimal results.

**Parameter Configuration Node**:
```javascript
// Function node to build Algolia search parameters
const query = $json.query;
const options = $json.options || {};

// Date range handling
const dateRanges = {
  'last_24h': Math.floor(Date.now() / 1000) - 86400,
  'last_week': Math.floor(Date.now() / 1000) - 604800,
  'last_month': Math.floor(Date.now() / 1000) - 2592000,
  'last_year': Math.floor(Date.now() / 1000) - 31536000,
  'all': 0
};

const numericFilters = [];
if (options.dateRange && dateRanges[options.dateRange]) {
  numericFilters.push(`created_at_i>${dateRanges[options.dateRange]}`);
}

// Points threshold for quality filtering
if (options.minPoints) {
  numericFilters.push(`points>=${options.minPoints}`);
}

// Build final parameters
const searchParams = {
  query: query,
  tags: options.tags || 'story,comment',
  hitsPerPage: Math.min(options.limit || 30, 100),
  page: options.page || 0,
  numericFilters: numericFilters.join(','),
  attributesToRetrieve: [
    'title',
    'url',
    'author',
    'points',
    'story_title',
    'comment_text',
    'story_text',
    'num_comments',
    'created_at',
    'objectID',
    '_tags'
  ],
  attributesToHighlight: ['title', 'story_title', 'comment_text'],
  highlightPreTag: '<mark>',
  highlightPostTag: '</mark>'
};

// Add sorting
if (options.sortBy === 'date') {
  searchParams.tags = `${searchParams.tags},sort_by_date`;
} else if (options.sortBy === 'points') {
  // Algolia doesn't support direct points sorting, we'll handle in post-processing
  searchParams.hitsPerPage = Math.min(options.limit * 2, 100); // Get more results to sort
}

return [{
  json: {
    ...searchParams,
    originalQuery: query,
    startTime: Date.now()
  }
}];
```

**Advanced Query Building**:
```javascript
// Function to enhance search queries with synonyms and variations
const enhanceQuery = (originalQuery) => {
  const synonyms = {
    'javascript': ['js', 'node.js', 'nodejs'],
    'typescript': ['ts', 'types'],
    'react': ['reactjs', 'react.js'],
    'vue': ['vuejs', 'vue.js'],
    'python': ['py', 'python3'],
    'golang': ['go', 'go-lang'],
    'rust': ['rust-lang'],
    'csharp': ['c#', '.net', 'dotnet'],
    'cpp': ['c++', 'cplusplus']
  };
  
  const queryLower = originalQuery.toLowerCase();
  const relatedTerms = [];
  
  for (const [key, values] of Object.entries(synonyms)) {
    if (queryLower.includes(key)) {
      relatedTerms.push(...values);
    } else if (values.some(v => queryLower.includes(v))) {
      relatedTerms.push(key);
    }
  }
  
  if (relatedTerms.length > 0) {
    return `${originalQuery} OR ${relatedTerms.join(' OR ')}`;
  }
  
  return originalQuery;
};

// Apply enhancement
const enhancedQuery = enhanceQuery($json.query);
return [{
  json: {
    ...$json,
    query: enhancedQuery,
    originalQuery: $json.query
  }
}];
```

### 5.3.3 Implement response parsing

**Objective**: Transform raw Algolia API responses into structured data.

**Response Parser Node**:
```javascript
// Function node for parsing HN API response
const hits = $json.data?.hits || [];
const processedHits = [];

for (const hit of hits) {
  // Extract content based on hit type
  let content = '';
  let title = '';
  let type = 'unknown';
  
  if (hit._tags.includes('story')) {
    type = 'story';
    title = hit.title;
    content = hit.story_text || hit.title || '';
  } else if (hit._tags.includes('comment')) {
    type = 'comment';
    title = hit.story_title || 'Comment';
    content = hit.comment_text || '';
  } else if (hit._tags.includes('poll')) {
    type = 'poll';
    title = hit.title;
    content = hit.title;
  }
  
  // Clean HTML from content
  content = content
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  
  // Build structured hit
  const processedHit = {
    objectID: hit.objectID,
    type: type,
    title: title,
    content: content,
    url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
    author: hit.author,
    points: hit.points || 0,
    numComments: hit.num_comments || 0,
    createdAt: hit.created_at,
    createdAtI: hit.created_at_i,
    tags: hit._tags,
    highlights: hit._highlightResult,
    
    // Additional metadata
    storyId: hit.story_id || hit.objectID,
    parentId: hit.parent_id,
    
    // Calculated fields
    age: Math.floor((Date.now() - new Date(hit.created_at).getTime()) / 1000),
    engagement: (hit.points || 0) + (hit.num_comments || 0) * 2
  };
  
  processedHits.push(processedHit);
}

// Sort by engagement if requested
if ($json.options?.sortBy === 'points') {
  processedHits.sort((a, b) => b.engagement - a.engagement);
}

return [{
  json: {
    hits: processedHits.slice(0, $json.options?.limit || 30),
    totalHits: $json.data.nbHits,
    processingTime: $json.data.processingTimeMS,
    query: $json.originalQuery || $json.query,
    enhancedQuery: $json.query,
    page: $json.data.page,
    totalPages: $json.data.nbPages
  }
}];
```

**Content Extraction Helper**:
```javascript
// Helper function for extracting meaningful content
const extractRelevantContent = (hit, maxLength = 500) => {
  let content = hit.content || '';
  
  // If we have highlights, prefer those
  if (hit.highlights?.comment_text?.value) {
    content = hit.highlights.comment_text.value;
  } else if (hit.highlights?.story_text?.value) {
    content = hit.highlights.story_text.value;
  }
  
  // Extract sentences containing keywords
  const sentences = content.split(/[.!?]+/);
  const query = $json.originalQuery.toLowerCase();
  const keywords = query.split(/\s+/);
  
  const relevantSentences = sentences.filter(sentence => {
    const sentenceLower = sentence.toLowerCase();
    return keywords.some(keyword => sentenceLower.includes(keyword));
  });
  
  // If we found relevant sentences, use those
  if (relevantSentences.length > 0) {
    content = relevantSentences.join('. ').trim();
  }
  
  // Truncate if needed
  if (content.length > maxLength) {
    content = content.substring(0, maxLength) + '...';
  }
  
  return content;
};

// Apply to each hit
hit.extractedContent = extractRelevantContent(hit);
```

### 5.3.4 Add relevance scoring

**Objective**: Implement sophisticated relevance scoring beyond basic API ranking.

**Relevance Scoring Implementation**:
```javascript
// Function node for custom relevance scoring
const calculateRelevanceScore = (hit, query) => {
  let score = 0;
  const queryLower = query.toLowerCase();
  const queryTerms = queryLower.split(/\s+/);
  
  // Base score from HN metrics
  score += hit.points || 0;
  score += (hit.numComments || 0) * 2; // Comments weighted higher
  
  // Title relevance (highest weight)
  const titleLower = (hit.title || '').toLowerCase();
  queryTerms.forEach(term => {
    if (titleLower.includes(term)) {
      score += 50; // Exact match in title
      if (titleLower.startsWith(term)) {
        score += 25; // Bonus for starting with term
      }
    }
  });
  
  // Content relevance
  const contentLower = (hit.content || '').toLowerCase();
  queryTerms.forEach(term => {
    const occurrences = (contentLower.match(new RegExp(term, 'g')) || []).length;
    score += occurrences * 5; // 5 points per occurrence
  });
  
  // Author reputation (if available)
  const trustedAuthors = ['pg', 'dang', 'patio11', 'tptacek', 'jedberg'];
  if (trustedAuthors.includes(hit.author)) {
    score += 100;
  }
  
  // Recency factor (decay over time)
  const ageInDays = hit.age / 86400;
  if (ageInDays < 7) {
    score += 20;
  } else if (ageInDays < 30) {
    score += 10;
  } else if (ageInDays < 365) {
    score += 5;
  } else {
    score -= Math.floor(ageInDays / 365) * 10; // Penalty for very old content
  }
  
  // Type bonuses
  if (hit.type === 'story' && hit.numComments > 50) {
    score += 30; // Popular discussion
  }
  if (hit.type === 'comment' && hit.points > 50) {
    score += 40; // Highly valued comment
  }
  
  // Negative factors
  if (hit.dead || hit.deleted) {
    score = -1000; // Filter out
  }
  
  return score;
};

// Apply scoring to all hits
const scoredHits = $json.hits.map(hit => ({
  ...hit,
  relevanceScore: calculateRelevanceScore(hit, $json.query)
}));

// Sort by relevance score
scoredHits.sort((a, b) => b.relevanceScore - a.relevanceScore);

// Filter out negative scores
const filteredHits = scoredHits.filter(hit => hit.relevanceScore > 0);

return [{
  json: {
    ...$json,
    hits: filteredHits,
    scoring: {
      method: 'custom',
      query: $json.query,
      totalScored: scoredHits.length,
      filtered: scoredHits.length - filteredHits.length
    }
  }
}];
```

**Topic-Specific Scoring**:
```javascript
// Additional scoring based on technology-specific signals
const technologySpecificScoring = (hit, technology) => {
  let bonus = 0;
  const content = `${hit.title} ${hit.content}`.toLowerCase();
  
  const techPatterns = {
    javascript: {
      positive: ['performance', 'typescript', 'node', 'npm', 'webpack', 'babel'],
      negative: ['deprecated', 'outdated', 'legacy', 'jquery'],
      weight: 10
    },
    python: {
      positive: ['pandas', 'numpy', 'django', 'flask', 'fastapi', 'poetry'],
      negative: ['python2', 'deprecated', 'legacy'],
      weight: 10
    },
    react: {
      positive: ['hooks', 'nextjs', 'gatsby', 'component', 'state', 'redux'],
      negative: ['class component', 'deprecated', 'angular', 'vue'],
      weight: 15
    },
    // Add more technology patterns
  };
  
  const techLower = technology.toLowerCase();
  if (techPatterns[techLower]) {
    const patterns = techPatterns[techLower];
    
    patterns.positive.forEach(term => {
      if (content.includes(term)) {
        bonus += patterns.weight;
      }
    });
    
    patterns.negative.forEach(term => {
      if (content.includes(term)) {
        bonus -= patterns.weight;
      }
    });
  }
  
  return bonus;
};

// Apply technology-specific scoring
hit.relevanceScore += technologySpecificScoring(hit, $json.originalQuery);
```

### 5.3.5 Create TypeScript types for HN data

**Objective**: Define comprehensive TypeScript interfaces for type safety.

**Type Definitions**:
```typescript
// src/types/hn-types.ts
export interface HNSearchResults {
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
  extractedContent: string;
  url: string;
  author: string;
  points: number;
  numComments: number;
  createdAt: string;
  createdAtI: number;
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

export interface HNSearchRequest {
  query: string;
  options?: {
    limit?: number;
    dateRange?: 'last_24h' | 'last_week' | 'last_month' | 'last_year' | 'all';
    sortBy?: 'relevance' | 'date' | 'points';
    tags?: string[];
    minPoints?: number;
    includeComments?: boolean;
    includeStories?: boolean;
  };
}

export interface HNWebhookResponse {
  status: 'success' | 'error' | 'rate_limited';
  data?: {
    hits: ProcessedHNHit[];
    totalHits: number;
    processingTime: number;
    query: string;
    enhancedQuery: string;
    page: number;
    totalPages: number;
    scoring?: {
      method: string;
      totalScored: number;
      filtered: number;
    };
  };
  error?: string;
  metadata: {
    cached: boolean;
    requestDuration: number;
    timestamp: string;
    sessionId: string;
    rateLimitRemaining?: number;
  };
}
```

**Type Guards and Validators**:
```typescript
// src/utils/hn-validators.ts
export function isHNHit(obj: any): obj is HNHit {
  return (
    typeof obj === 'object' &&
    typeof obj.objectID === 'string' &&
    typeof obj.author === 'string' &&
    typeof obj.created_at === 'string' &&
    Array.isArray(obj._tags)
  );
}

export function isHNSearchResults(obj: any): obj is HNSearchResults {
  return (
    typeof obj === 'object' &&
    Array.isArray(obj.hits) &&
    typeof obj.nbHits === 'number' &&
    typeof obj.query === 'string' &&
    obj.hits.every(isHNHit)
  );
}

export function validateHNSearchRequest(request: any): HNSearchRequest {
  if (!request.query || typeof request.query !== 'string') {
    throw new Error('Invalid query: must be a non-empty string');
  }
  
  const validated: HNSearchRequest = {
    query: request.query.trim()
  };
  
  if (request.options) {
    validated.options = {};
    
    if (request.options.limit) {
      validated.options.limit = Math.min(Math.max(1, request.options.limit), 100);
    }
    
    if (request.options.dateRange) {
      const validRanges = ['last_24h', 'last_week', 'last_month', 'last_year', 'all'];
      if (validRanges.includes(request.options.dateRange)) {
        validated.options.dateRange = request.options.dateRange;
      }
    }
    
    // Validate other options...
  }
  
  return validated;
}
```

### 5.3.6 Test with various search queries

**Objective**: Ensure robust handling of different query types and edge cases.

**Test Query Set**:
```javascript
// n8n Function node for testing various queries
const testQueries = [
  // Technology queries
  { query: 'typescript performance', description: 'Specific technology + aspect' },
  { query: 'react vs vue', description: 'Comparison query' },
  { query: 'python web framework', description: 'General technology area' },
  
  // Question queries
  { query: 'how to scale nodejs', description: 'How-to question' },
  { query: 'what is rust used for', description: 'What-is question' },
  { query: 'why golang', description: 'Why question' },
  
  // Problem queries
  { query: 'javascript memory leak', description: 'Problem/issue query' },
  { query: 'react performance optimization', description: 'Optimization query' },
  { query: 'python async await', description: 'Feature query' },
  
  // Edge cases
  { query: 'c++', description: 'Special characters' },
  { query: 'node.js', description: 'Dots in query' },
  { query: '.NET Core', description: 'Leading dot' },
  { query: 'C#', description: 'Hash character' },
  
  // Multi-word queries
  { query: 'machine learning tensorflow keras', description: 'Multiple technologies' },
  { query: 'docker kubernetes deployment', description: 'DevOps stack' },
  
  // Version-specific
  { query: 'react 18', description: 'Version number' },
  { query: 'python 3.11', description: 'Decimal version' },
  
  // Empty/invalid
  { query: '', description: 'Empty query' },
  { query: '   ', description: 'Whitespace only' },
  { query: '!!!', description: 'Special chars only' }
];

// Run test for current query
const currentTest = testQueries[$itemIndex];
console.log(`Testing: ${currentTest.description} - "${currentTest.query}"`);

return [{
  json: {
    query: currentTest.query,
    testDescription: currentTest.description,
    sessionId: `test-${Date.now()}-${$itemIndex}`
  }
}];
```

**Query Performance Monitoring**:
```javascript
// Function node to track query performance
const startTime = Date.now();
const query = $json.query;

// Track in workflow static data
const queryStats = $getWorkflowStaticData('queryStats') || {};
if (!queryStats[query]) {
  queryStats[query] = {
    count: 0,
    totalTime: 0,
    avgTime: 0,
    minTime: Infinity,
    maxTime: 0,
    errors: 0,
    lastRun: null
  };
}

// Update after execution
const executionTime = Date.now() - startTime;
const stats = queryStats[query];
stats.count++;
stats.totalTime += executionTime;
stats.avgTime = stats.totalTime / stats.count;
stats.minTime = Math.min(stats.minTime, executionTime);
stats.maxTime = Math.max(stats.maxTime, executionTime);
stats.lastRun = new Date().toISOString();

if ($json.status === 'error') {
  stats.errors++;
}

$setWorkflowStaticData('queryStats', queryStats);

// Log performance
console.log(`Query "${query}" completed in ${executionTime}ms (avg: ${stats.avgTime.toFixed(0)}ms)`);
```

### 5.3.7 Handle edge cases and errors

**Objective**: Implement comprehensive error handling for all failure scenarios.

**Error Handling Workflow**:
```javascript
// Comprehensive error handling node
try {
  const response = $input.all()[0].json;
  
  // Check for various error conditions
  if (!response) {
    throw new Error('No response received from HN API');
  }
  
  if (response.error) {
    // API returned an error
    return [{
      json: {
        status: 'error',
        error: response.error,
        code: 'HN_API_ERROR',
        metadata: {
          cached: false,
          requestDuration: Date.now() - $json.startTime,
          query: $json.originalQuery
        }
      }
    }];
  }
  
  if (response.statusCode === 429) {
    // Rate limited
    const retryAfter = response.headers['retry-after'] || 60;
    return [{
      json: {
        status: 'rate_limited',
        error: 'Hacker News API rate limit exceeded',
        code: 'RATE_LIMIT',
        retryAfter: retryAfter,
        metadata: {
          cached: false,
          requestDuration: Date.now() - $json.startTime
        }
      }
    }];
  }
  
  if (response.statusCode >= 500) {
    // Server error - should retry
    return [{
      json: {
        status: 'error',
        error: 'Hacker News API server error',
        code: 'SERVER_ERROR',
        statusCode: response.statusCode,
        retryable: true,
        metadata: {
          cached: false,
          requestDuration: Date.now() - $json.startTime
        }
      }
    }];
  }
  
  if (!response.body || !response.body.hits) {
    // Invalid response format
    throw new Error('Invalid response format from HN API');
  }
  
  // Success - continue processing
  return [{
    json: {
      ...response.body,
      statusCode: response.statusCode,
      startTime: $json.startTime
    }
  }];
  
} catch (error) {
  // Catch-all error handler
  console.error('HN Search Error:', error);
  
  return [{
    json: {
      status: 'error',
      error: error.message || 'Unknown error occurred',
      code: 'UNKNOWN_ERROR',
      stack: error.stack,
      metadata: {
        cached: false,
        requestDuration: Date.now() - ($json.startTime || 0),
        query: $json.originalQuery || $json.query
      }
    }
  }];
}
```

**Edge Case Handlers**:
```javascript
// Handle special characters in queries
const sanitizeQuery = (query) => {
  // Map of special chars to their encoded equivalents
  const specialChars = {
    '#': '%23',
    '&': '%26',
    '+': '%2B',
    '=': '%3D',
    '?': '%3F',
    '/': '%2F',
    '\\': '%5C'
  };
  
  let sanitized = query;
  
  // Handle C# specifically
  sanitized = sanitized.replace(/C#/gi, 'CSharp');
  
  // Handle .NET
  sanitized = sanitized.replace(/\.NET/gi, 'dotnet');
  
  // Remove or encode other special chars
  Object.entries(specialChars).forEach(([char, encoded]) => {
    sanitized = sanitized.replace(new RegExp(`\\${char}`, 'g'), encoded);
  });
  
  // Collapse multiple spaces
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  // Ensure minimum query length
  if (sanitized.length < 2) {
    throw new Error('Query too short after sanitization');
  }
  
  return sanitized;
};

// Handle empty results
const handleEmptyResults = (query) => {
  // Suggest query modifications
  const suggestions = [];
  
  if (query.includes(' ')) {
    suggestions.push(`Try searching for each term separately: ${query.split(' ').join(', ')}`);
  }
  
  if (query.length > 20) {
    suggestions.push('Try a shorter, more specific query');
  }
  
  if (/[^a-zA-Z0-9\s]/.test(query)) {
    suggestions.push('Try removing special characters from your query');
  }
  
  return {
    status: 'success',
    data: {
      hits: [],
      totalHits: 0,
      query: query,
      suggestions: suggestions
    },
    metadata: {
      cached: false,
      emptyResult: true
    }
  };
};

// Handle timeout scenarios
const handleTimeout = async (promise, timeoutMs = 30000) => {
  const timeout = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
  );
  
  try {
    return await Promise.race([promise, timeout]);
  } catch (error) {
    if (error.message === 'Request timeout') {
      return {
        status: 'error',
        error: 'HN API request timed out',
        code: 'TIMEOUT',
        timeout: timeoutMs,
        metadata: {
          cached: false,
          requestDuration: timeoutMs
        }
      };
    }
    throw error;
  }
};
```

## Testing Checklist

### Unit Tests
```typescript
// tests/services/hn-search.test.ts
describe('HN Search Integration', () => {
  describe('Query Sanitization', () => {
    it('should handle C# correctly', () => {
      const result = sanitizeQuery('C# programming');
      expect(result).toBe('CSharp programming');
    });
    
    it('should handle .NET correctly', () => {
      const result = sanitizeQuery('.NET Core');
      expect(result).toBe('dotnet Core');
    });
    
    it('should remove special characters', () => {
      const result = sanitizeQuery('react/vue comparison');
      expect(result).toBe('react%2Fvue comparison');
    });
    
    it('should throw on empty query after sanitization', () => {
      expect(() => sanitizeQuery('!!!')).toThrow('Query too short');
    });
  });
  
  describe('Relevance Scoring', () => {
    it('should score exact title matches highest', () => {
      const hit = {
        title: 'TypeScript Performance Guide',
        content: 'Some content',
        points: 10,
        numComments: 5,
        age: 86400 // 1 day
      };
      
      const score = calculateRelevanceScore(hit, 'typescript performance');
      expect(score).toBeGreaterThan(100);
    });
    
    it('should penalize old content', () => {
      const recentHit = { ...baseHit, age: 86400 };
      const oldHit = { ...baseHit, age: 31536000 * 2 }; // 2 years
      
      const recentScore = calculateRelevanceScore(recentHit, 'test');
      const oldScore = calculateRelevanceScore(oldHit, 'test');
      
      expect(recentScore).toBeGreaterThan(oldScore);
    });
  });
  
  describe('Response Parsing', () => {
    it('should extract comment text correctly', () => {
      const hit = {
        _tags: ['comment'],
        comment_text: '<p>This is <b>formatted</b> text</p>',
        story_title: 'Test Story'
      };
      
      const processed = parseHNHit(hit);
      expect(processed.content).toBe('This is formatted text');
      expect(processed.type).toBe('comment');
    });
    
    it('should handle missing fields gracefully', () => {
      const hit = {
        _tags: ['story'],
        objectID: '123',
        author: 'test'
      };
      
      const processed = parseHNHit(hit);
      expect(processed.title).toBe('Untitled');
      expect(processed.content).toBe('');
      expect(processed.points).toBe(0);
    });
  });
});
```

### Integration Tests
```typescript
// tests/integration/hn-workflow.test.ts
describe('HN Workflow Integration', () => {
  it('should handle real API requests', async () => {
    const response = await testWorkflow({
      query: 'javascript',
      sessionId: 'test-integration'
    });
    
    expect(response.status).toBe('success');
    expect(response.data.hits).toBeDefined();
    expect(Array.isArray(response.data.hits)).toBe(true);
  }, 30000);
  
  it('should handle rate limiting gracefully', async () => {
    // Simulate many requests
    const requests = Array(100).fill(null).map((_, i) => 
      testWorkflow({
        query: `test-${i}`,
        sessionId: 'rate-limit-test'
      })
    );
    
    const results = await Promise.allSettled(requests);
    const rateLimited = results.filter(r => 
      r.status === 'fulfilled' && r.value.status === 'rate_limited'
    );
    
    // Should handle rate limiting without crashing
    expect(rateLimited.length).toBeGreaterThanOrEqual(0);
  });
});
```

### Manual Testing Scenarios
1. **Query Variations**:
   - Single word: "javascript"
   - Multi-word: "react hooks performance"
   - Comparison: "golang vs rust"
   - Question: "how to optimize webpack"
   - Special chars: "C++", "F#", ".NET"

2. **Options Testing**:
   - Date ranges: last_24h, last_week, last_month
   - Sort options: relevance, date, points
   - Limit values: 1, 10, 50, 100
   - Tag combinations: story only, comment only, both

3. **Error Scenarios**:
   - Network disconnection
   - Invalid API responses
   - Timeout scenarios
   - Empty results
   - Malformed queries

4. **Performance Testing**:
   - Measure response times for different queries
   - Monitor memory usage with large result sets
   - Test concurrent request handling
   - Verify caching effectiveness

## Common Issues and Solutions

### Issue: Special characters break search
**Solution**: Implement comprehensive query sanitization
```javascript
// Already implemented in sanitizeQuery function
// Additional handling for edge cases
query = query
  .replace(/[^\w\s.-]/g, ' ')  // Keep only alphanumeric, space, dot, dash
  .replace(/\s+/g, ' ')         // Collapse spaces
  .trim();
```

### Issue: Timeout on complex queries
**Solution**: Implement query simplification
```javascript
// If query is too complex, simplify it
if (query.split(' ').length > 5) {
  // Extract most important terms
  const terms = query.split(' ')
    .filter(term => term.length > 3)
    .slice(0, 3);
  query = terms.join(' ');
}
```

### Issue: Inconsistent result quality
**Solution**: Implement quality filters
```javascript
// Filter low-quality results
const qualityThreshold = {
  minPoints: 5,
  minComments: 1,
  maxAge: 365 * 2, // 2 years
  minContentLength: 50
};

hits = hits.filter(hit => 
  hit.points >= qualityThreshold.minPoints ||
  hit.numComments >= qualityThreshold.minComments
);
```

## Next Steps

After completing task 5.3:
1. Test all query types thoroughly
2. Monitor API rate limits in production
3. Fine-tune relevance scoring based on user feedback
4. Document query syntax for end users
5. Prepare for Reddit integration (task 5.4) 