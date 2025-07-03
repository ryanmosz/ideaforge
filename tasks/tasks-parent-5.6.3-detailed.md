# Task 5.6 Detailed Implementation Part 3: API Configuration (5.6.6)

## Overview
This file covers documenting API configuration for the n8n integration system, including Hacker News and Reddit API setup.

## Implementation Details

### 5.6.6 Document API configuration

**Objective**: Create detailed API setup documentation covering both Hacker News and Reddit APIs, including authentication, rate limits, and configuration options.

**File to Create**: `docs/api-configuration.md`

**Step 1: Create Documentation Structure**

```bash
# Create documentation directory if needed
mkdir -p docs

# Create the API configuration file
touch docs/api-configuration.md
```

**Step 2: Document Hacker News API**

Add to `docs/api-configuration.md`:

```markdown
# API Configuration Guide

## Overview

IdeaForge integrates with external APIs through n8n workflows to gather technology insights and community discussions. This guide provides detailed configuration instructions for each API.

## Hacker News API (Algolia)

### Overview
The Hacker News integration uses Algolia's search API, which provides free access to the entire HN dataset without authentication.

### API Details
- **Provider**: Algolia
- **Base URL**: `https://hn.algolia.com/api/v1/`
- **Authentication**: None required
- **Rate Limit**: 10,000 requests per hour per IP
- **Documentation**: [HN Search API Docs](https://hn.algolia.com/api)

### Endpoint Configuration

Configure the following in your n8n HTTP Request node:

```json
{
  "method": "GET",
  "url": "https://hn.algolia.com/api/v1/search",
  "queryParameters": {
    "query": "={{$json.searchQuery}}",
    "tags": "story",
    "hitsPerPage": "20",
    "numericFilters": "created_at_i>{{$json.dateFilter}},points>10"
  },
  "options": {
    "timeout": 10000,
    "retry": {
      "maxRetries": 3,
      "waitBetweenRetries": 1000,
      "onFailedAttempt": "continue"
    }
  }
}
```

### Search Parameters

| Parameter | Type | Description | Example | Default |
|-----------|------|-------------|---------|---------|
| query | string | Search query text | "typescript performance" | - |
| tags | string | Filter by item type | "story", "comment", "poll", "job" | - |
| numericFilters | string | Numeric field constraints | "points>50,created_at_i>1609459200" | - |
| hitsPerPage | number | Results per page | 20 | 20 |
| page | number | Page number (0-indexed) | 0 | 0 |
| minWordSizefor1Typo | number | Min word length for typo tolerance | 4 | 4 |
| minWordSizefor2Typos | number | Min word length for 2 typos | 8 | 8 |
| getRankingInfo | boolean | Include ranking details | true | false |
| attributesToRetrieve | string | Fields to return | "title,url,points,num_comments" | all |
| attributesToHighlight | string | Fields to highlight | "title,story_text" | none |
| highlightPreTag | string | Highlight start tag | "<mark>" | "<em>" |
| highlightPostTag | string | Highlight end tag | "</mark>" | "</em>" |

### Advanced Filtering

```javascript
// Date range filtering
const lastMonth = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
const lastYear = Math.floor(Date.now() / 1000) - (365 * 24 * 60 * 60);

// Quality content filter
const qualityFilter = "points>50,num_comments>10";

// Time-based filters
const recentHighQuality = `created_at_i>${lastMonth},${qualityFilter}`;

// Author filtering
const authorFilter = "author_username:dang,author_username:pg";

// Combine multiple filters
const combinedFilter = `${recentHighQuality},${authorFilter}`;
```

### Response Structure

```json
{
  "hits": [
    {
      "created_at": "2024-01-15T10:30:00.000Z",
      "title": "TypeScript 5.0: New Features and Migration Guide",
      "url": "https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/",
      "author": "DanielRosenwasser",
      "points": 324,
      "story_text": null,
      "comment_text": null,
      "num_comments": 89,
      "story_id": null,
      "story_title": null,
      "story_url": null,
      "parent_id": null,
      "created_at_i": 1705318200,
      "relevancy_score": 9521,
      "_tags": ["story", "author_DanielRosenwasser", "story_38195844"],
      "objectID": "38195844",
      "_highlightResult": {
        "title": {
          "value": "<em>TypeScript</em> 5.0: New Features and Migration Guide",
          "matchLevel": "full",
          "fullyHighlighted": false,
          "matchedWords": ["typescript"]
        }
      }
    }
  ],
  "nbHits": 1543,
  "page": 0,
  "nbPages": 78,
  "hitsPerPage": 20,
  "exhaustiveNbHits": true,
  "exhaustiveTypo": true,
  "query": "typescript",
  "params": "query=typescript&tags=story&hitsPerPage=20",
  "processingTimeMS": 2,
  "serverTimeMS": 3
}
```

### Error Handling

```javascript
// n8n Function node for error handling
const response = $input.item.json;

if (!response || !response.hits) {
  throw new Error('Invalid response from Hacker News API');
}

if (response.hits.length === 0) {
  return {
    json: {
      message: 'No results found',
      query: response.query,
      suggestions: [
        'Try broader search terms',
        'Remove date filters',
        'Check spelling'
      ]
    }
  };
}

// Process successful response
return {
  json: {
    results: response.hits,
    totalResults: response.nbHits,
    query: response.query
  }
};
```

### Best Practices

1. **Query Optimization**
   - Use specific search terms for better relevance
   - Combine with tags for content type filtering
   - Apply numeric filters to reduce noise

2. **Rate Limit Management**
   - Implement caching for common queries
   - Batch similar searches when possible
   - Monitor request count per hour

3. **Result Processing**
   - Filter by minimum score threshold
   - Sort by relevance or recency
   - Extract key insights from comments
```

**Step 3: Document Reddit API**

Continue in `docs/api-configuration.md`:

```markdown
## Reddit API

### Overview
Reddit requires OAuth2 authentication for all API access. The integration uses the "script" app type for server-side authentication.

### Prerequisites
1. Reddit account (preferably dedicated for the bot)
2. Reddit app registration
3. Client credentials (ID and Secret)

### Creating a Reddit App

1. **Navigate to App Preferences**
   - Log into Reddit
   - Go to https://www.reddit.com/prefs/apps
   - Scroll to "Developed Applications"

2. **Create New App**
   - Click "Create App" or "Create Another App"
   - Fill in the following:
     - **Name**: IdeaForge Research Bot
     - **App Type**: Select "script" (for personal use)
     - **Description**: Automated research tool for project analysis
     - **About URL**: https://github.com/yourusername/ideaforge
     - **Redirect URI**: http://localhost:5678/webhook/reddit-callback
   - Click "Create App"

3. **Save Credentials**
   - **Client ID**: Found under "personal use script"
   - **Client Secret**: The secret string
   - **User Agent**: Format as "platform:app-name:version (by /u/username)"

### OAuth2 Setup in n8n

Create OAuth2 credentials in n8n:

1. **Add Credentials**
   - Go to Credentials in n8n
   - Add new OAuth2 API credentials
   - Configure as follows:

```json
{
  "name": "Reddit OAuth2 API",
  "type": "oAuth2Api",
  "data": {
    "grantType": "clientCredentials",
    "authUrl": "https://www.reddit.com/api/v1/authorize",
    "accessTokenUrl": "https://www.reddit.com/api/v1/access_token",
    "clientId": "YOUR_CLIENT_ID",
    "clientSecret": "YOUR_CLIENT_SECRET",
    "scope": "read",
    "authenticationMethod": "header",
    "authentication": "basicAuth"
  }
}
```

2. **HTTP Request Node Configuration**

```json
{
  "method": "GET",
  "url": "https://oauth.reddit.com/search.json",
  "authentication": {
    "type": "oAuth2",
    "oAuth2": {
      "name": "Reddit OAuth2 API"
    }
  },
  "headers": {
    "User-Agent": "nodejs:ideaforge:v1.0.0 (by /u/your_reddit_username)"
  },
  "queryParameters": {
    "q": "={{$json.searchQuery}}",
    "restrict_sr": "true",
    "sr": "programming+webdev+javascript+typescript+node",
    "sort": "relevance",
    "t": "all",
    "type": "link,self",
    "limit": "25",
    "raw_json": "1"
  }
}
```

### API Endpoints

| Endpoint | Method | Description | Rate Limit |
|----------|--------|-------------|------------|
| /api/v1/access_token | POST | Get OAuth token | - |
| /search.json | GET | Search posts/comments | 60/min |
| /r/{subreddit}/search.json | GET | Search within subreddit | 60/min |
| /r/{subreddit}/hot.json | GET | Hot posts in subreddit | 60/min |
| /r/{subreddit}/new.json | GET | New posts in subreddit | 60/min |
| /r/{subreddit}/top.json | GET | Top posts in subreddit | 60/min |

### Search Parameters

| Parameter | Type | Description | Values | Default |
|-----------|------|-------------|--------|---------|
| q | string | Search query | Any text | - |
| restrict_sr | boolean | Restrict to specified subreddits | true/false | false |
| sr | string | Comma-separated subreddit list | "python+django" | - |
| sort | string | Sort order | relevance, hot, top, new, comments | relevance |
| t | string | Time range | hour, day, week, month, year, all | all |
| type | string | Content type | link, self, image, video | - |
| limit | number | Results per request | 1-100 | 25 |
| after | string | Pagination token | fullname ID | - |
| before | string | Reverse pagination | fullname ID | - |
| include_over_18 | boolean | Include NSFW | true/false | false |

### Rate Limiting

Reddit enforces strict rate limits:

```javascript
// Response headers to monitor
{
  "X-Ratelimit-Remaining": "58",  // Requests remaining
  "X-Ratelimit-Reset": "1705318800", // Reset timestamp
  "X-Ratelimit-Used": "2"  // Requests used
}
```

**Rate Limit Strategy**:

```javascript
// n8n Function node for rate limit handling
const headers = $response.headers;
const remaining = parseInt(headers['x-ratelimit-remaining'] || '60');
const reset = parseInt(headers['x-ratelimit-reset'] || '0');
const now = Math.floor(Date.now() / 1000);

// Store rate limit info
$node.context.rateLimit = {
  remaining,
  reset,
  checked: now
};

// If running low on requests
if (remaining < 10) {
  const waitTime = (reset - now) * 1000;
  
  // Add delay before next request
  $node.context.delay = Math.max(waitTime / remaining, 1000);
  
  return {
    json: {
      ...items[0].json,
      rateLimitWarning: true,
      delayNextRequest: $node.context.delay
    }
  };
}
```

### Subreddit Selection

Target relevant programming subreddits:

```javascript
// Recommended subreddits by category
const subredditCategories = {
  general: ['programming', 'coding', 'learnprogramming', 'AskProgramming'],
  webdev: ['webdev', 'web_design', 'Frontend', 'backend'],
  javascript: ['javascript', 'node', 'reactjs', 'vuejs', 'angular', 'typescript'],
  python: ['Python', 'django', 'flask', 'learnpython'],
  devops: ['devops', 'kubernetes', 'docker', 'aws', 'sysadmin'],
  mobile: ['androiddev', 'iOSProgramming', 'reactnative', 'FlutterDev'],
  data: ['datascience', 'MachineLearning', 'dataengineering'],
  career: ['cscareerquestions', 'ExperiencedDevs', 'ITCareerQuestions']
};

// Build subreddit list based on technologies
function getRelevantSubreddits(technologies) {
  const subreddits = new Set(['programming']); // Always include
  
  technologies.forEach(tech => {
    const techLower = tech.toLowerCase();
    
    // Add specific subreddit if exists
    if (subredditCategories[techLower]) {
      subredditCategories[techLower].forEach(sr => subreddits.add(sr));
    }
    
    // Add related categories
    if (techLower.includes('react') || techLower.includes('vue')) {
      subredditCategories.javascript.forEach(sr => subreddits.add(sr));
    }
  });
  
  return Array.from(subreddits).join('+');
}
```

### Response Processing

```javascript
// Parse Reddit API response
function parseRedditResponse(response) {
  if (!response.data || !response.data.children) {
    throw new Error('Invalid Reddit response structure');
  }
  
  return response.data.children
    .filter(post => post.kind === 't3') // Links and self posts
    .map(post => ({
      id: post.data.id,
      title: post.data.title,
      url: post.data.url,
      selftext: post.data.selftext,
      subreddit: post.data.subreddit,
      author: post.data.author,
      score: post.data.score,
      upvoteRatio: post.data.upvote_ratio,
      numComments: post.data.num_comments,
      created: new Date(post.data.created_utc * 1000),
      permalink: `https://reddit.com${post.data.permalink}`,
      isVideo: post.data.is_video,
      isSelf: post.data.is_self,
      distinguished: post.data.distinguished,
      stickied: post.data.stickied
    }))
    .filter(post => !post.stickied); // Remove stickied posts
}
```
```

**Step 4: Environment Variables Documentation**

Add environment configuration section:

```markdown
## Environment Configuration

### Required Variables

Create a `.env` file in your project root with the following variables:

```bash
# n8n Configuration
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=your-secure-api-key-here
N8N_WEBHOOK_TIMEOUT=30000

# Reddit Configuration (required for Reddit search)
REDDIT_CLIENT_ID=your-reddit-client-id
REDDIT_CLIENT_SECRET=your-reddit-client-secret
REDDIT_USERNAME=your-reddit-username
REDDIT_USER_AGENT=nodejs:ideaforge:v1.0.0 (by /u/your-username)

# Optional Performance Tuning
CACHE_ENABLED=true
CACHE_TTL_MINUTES=60
CACHE_MAX_SIZE_MB=100
MAX_CONCURRENT_REQUESTS=3
RETRY_MAX_ATTEMPTS=3
RETRY_DELAY_MS=1000
RATE_LIMIT_DELAY_MS=1000
```

### Environment-Specific Configuration

#### Development (.env.development)
```bash
NODE_ENV=development
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=dev-test-key
DEBUG=ideaforge:*
LOG_LEVEL=debug
CACHE_ENABLED=true
CACHE_TTL_MINUTES=5  # Shorter cache for development
```

#### Production (.env.production)
```bash
NODE_ENV=production
N8N_BASE_URL=https://n8n.yourdomain.com
N8N_API_KEY=${N8N_API_KEY}  # From secrets manager
LOG_LEVEL=info
CACHE_ENABLED=true
CACHE_TTL_MINUTES=120
SENTRY_DSN=your-sentry-dsn
NEW_RELIC_LICENSE_KEY=your-new-relic-key
```

### Loading Environment Variables

```javascript
// config/env.js
const dotenv = require('dotenv');
const path = require('path');

// Load base .env file
dotenv.config();

// Load environment-specific file
const envFile = `.env.${process.env.NODE_ENV || 'development'}`;
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

// Validate required variables
const requiredVars = [
  'N8N_BASE_URL',
  'N8N_API_KEY'
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

module.exports = {
  n8n: {
    baseUrl: process.env.N8N_BASE_URL,
    apiKey: process.env.N8N_API_KEY,
    timeout: parseInt(process.env.N8N_WEBHOOK_TIMEOUT || '30000')
  },
  reddit: {
    clientId: process.env.REDDIT_CLIENT_ID,
    clientSecret: process.env.REDDIT_CLIENT_SECRET,
    username: process.env.REDDIT_USERNAME,
    userAgent: process.env.REDDIT_USER_AGENT
  },
  cache: {
    enabled: process.env.CACHE_ENABLED === 'true',
    ttlMinutes: parseInt(process.env.CACHE_TTL_MINUTES || '60'),
    maxSizeMB: parseInt(process.env.CACHE_MAX_SIZE_MB || '100')
  }
};
```
```

**Step 5: Testing Configuration**

Create test scripts section:

```markdown
## Testing Your Configuration

### Quick Test Script

Create `scripts/test-api-config.js`:

```javascript
const axios = require('axios');
const config = require('../config/env');

async function testN8nConnection() {
  console.log('Testing n8n connection...');
  try {
    const response = await axios.get(`${config.n8n.baseUrl}/webhook/ideaforge/health`);
    console.log('✅ n8n connection successful');
    return true;
  } catch (error) {
    console.error('❌ n8n connection failed:', error.message);
    return false;
  }
}

async function testHackerNewsAPI() {
  console.log('Testing Hacker News API...');
  try {
    const response = await axios.post(
      `${config.n8n.baseUrl}/webhook/ideaforge/hackernews-search`,
      { query: 'test', sessionId: 'test-' + Date.now() },
      { headers: { 'X-API-Key': config.n8n.apiKey } }
    );
    console.log('✅ Hacker News API working');
    return true;
  } catch (error) {
    console.error('❌ Hacker News API failed:', error.message);
    return false;
  }
}

async function testRedditAPI() {
  if (!config.reddit.clientId) {
    console.log('⚠️  Reddit API not configured (optional)');
    return true;
  }
  
  console.log('Testing Reddit API...');
  try {
    const response = await axios.post(
      `${config.n8n.baseUrl}/webhook/ideaforge/reddit-search`,
      { query: 'test', sessionId: 'test-' + Date.now() },
      { headers: { 'X-API-Key': config.n8n.apiKey } }
    );
    console.log('✅ Reddit API working');
    return true;
  } catch (error) {
    console.error('❌ Reddit API failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('Running API configuration tests...\n');
  
  const tests = [
    testN8nConnection(),
    testHackerNewsAPI(),
    testRedditAPI()
  ];
  
  const results = await Promise.all(tests);
  const allPassed = results.every(r => r === true);
  
  console.log('\n' + (allPassed ? '✅ All tests passed!' : '❌ Some tests failed'));
  process.exit(allPassed ? 0 : 1);
}

runAllTests();
```

Run with: `node scripts/test-api-config.js`
```

## Definition of Done

✅ Hacker News API fully documented with examples
✅ Reddit API setup process clearly explained
✅ OAuth2 configuration steps provided
✅ Rate limiting strategies documented
✅ Environment variables comprehensively listed
✅ Test scripts included for validation
✅ Error handling examples provided
✅ Best practices for each API included 