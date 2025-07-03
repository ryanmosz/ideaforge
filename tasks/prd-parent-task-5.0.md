# Parent Task 5.0: Develop n8n Integration for External APIs

## Task Overview

Parent task 5.0 implements the external API integration layer for IdeaForge using n8n as a workflow automation platform. This component acts as a bridge between the IdeaForge CLI/LangGraph agent and external data sources (Hacker News API, Reddit API) to enrich project analysis with real-world insights and discussions.

### What This Task Accomplishes
- Creates a scalable webhook-based API integration system
- Implements intelligent rate limiting and caching for external API calls
- Provides research data from Hacker News and Reddit to enhance project analysis
- Establishes a clean separation between the core application and external services
- Enables future expansion to additional data sources without modifying core code

### How It Fits Into IdeaForge Architecture
The n8n integration layer sits between the LangGraph agent (task 4.0) and external APIs:
```
CLI → LangGraph Agent → n8n Webhooks → External APIs (HN/Reddit)
                     ↓                           ↓
                  Response ← ← ← ← ← ← ← Cached Data
```

### Dependencies on Other Parent Tasks
- **Depends on Task 4.0**: LangGraph agent must be complete to define the communication interface
- **Depends on Task 3.0**: CLI framework needed to understand command flow
- **Depends on Task 2.0**: Org-mode parsing to extract technology keywords for research

### What Will Be Possible After Completion
- Automatic research of technologies mentioned in project documents
- Real-world validation of technical choices through community discussions
- Discovery of potential issues, alternatives, and best practices
- Enhanced risk assessment based on community experiences
- Cached research results for faster iterative refinement

## Technical Design

### Architecture Overview
The n8n integration uses a webhook-based architecture for loose coupling:

```typescript
// Communication Flow
interface N8nRequest {
  action: 'searchHackerNews' | 'searchReddit' | 'cacheCheck';
  payload: {
    query: string;
    options?: SearchOptions;
  };
  sessionId: string;
}

interface N8nResponse {
  status: 'success' | 'error' | 'rate_limited';
  data?: SearchResults;
  cached?: boolean;
  error?: string;
}
```

### Key Components

1. **n8n Workflow Structure**
   - Webhook triggers for each integration type
   - API authentication and rate limiting nodes
   - Response transformation and caching logic
   - Error handling and retry mechanisms

2. **CLI Integration Service** (`src/services/n8n-client.ts`)
   ```typescript
   class N8nClient {
     private webhookUrl: string;
     private timeout: number;
     
     async searchHackerNews(query: string): Promise<HNSearchResults>
     async searchReddit(query: string, subreddit?: string): Promise<RedditResults>
     async checkCache(key: string): Promise<CachedResult | null>
   }
   ```

3. **LangGraph Communication Bridge**
   - Asynchronous request handling
   - Result aggregation and formatting
   - State updates with research findings

### Integration Points
- **Environment Variables**: n8n webhook URLs and API keys
- **LangGraph State**: Research results stored in `ProjectState`
- **Error Handling**: Graceful degradation when external APIs are unavailable
- **Caching Layer**: Redis or file-based caching for API responses

### Technology-Specific Considerations
- **n8n**: Self-hosted or cloud instance configuration
- **Axios**: HTTP client for webhook communication
- **Rate Limiting**: Respect API limits (HN: 10k requests/hour, Reddit: 60/minute)
- **Async/Await**: Non-blocking API calls from LangGraph nodes

## Implementation Sequence

### Critical Path
1. **5.1** → **5.6** → **5.2** → **5.3** → **5.4** → **5.5**

### Rationale
1. Start with webhook endpoints (5.1) as the foundation
2. Build communication bridge (5.6) early to enable testing
3. Implement API integrations (5.2, 5.3) individually
4. Add rate limiting (5.4) before heavy testing
5. Implement caching (5.5) as an optimization

### Parallel Work Opportunities
- 5.2 and 5.3 can be developed in parallel after 5.1 is complete
- 5.4 and 5.5 can be worked on simultaneously

### Risk Points
- API authentication and rate limits need careful testing
- Network reliability issues may cause integration failures
- Caching strategy must balance freshness vs performance

## Detailed Subtask Breakdown

### 5.1 Create n8n webhook endpoints for CLI

**Description**: Set up n8n workflows with webhook triggers that the CLI can call for external API integrations.

**Implementation Steps**:
1. Create n8n workflow for Hacker News integration
2. Create n8n workflow for Reddit integration
3. Configure webhook authentication (API keys or tokens)
4. Set up CORS headers for local development
5. Create health check endpoints

**Code Example**:
```javascript
// n8n Webhook Node Configuration
{
  "name": "Webhook - HackerNews Search",
  "type": "n8n-nodes-base.webhook",
  "parameters": {
    "path": "hackernews-search",
    "responseMode": "lastNode",
    "authentication": "headerAuth",
    "httpMethod": "POST"
  }
}
```

**File Changes**:
- Create n8n workflow JSON exports in `n8n-workflows/`
- Update `.env.example` with webhook URL placeholders
- Create `docs/n8n-setup.md` for deployment instructions

**Testing Approach**:
- Use curl to test webhook endpoints directly
- Verify authentication is working
- Test with invalid payloads for error handling

**Definition of Done**:
- All webhook endpoints respond to POST requests
- Authentication prevents unauthorized access
- Endpoints return proper HTTP status codes
- Health checks confirm n8n connectivity

**Common Pitfalls**:
- Forgetting to handle CORS for local development
- Not setting proper timeout values
- Missing error status codes in responses

### 5.2 Implement Hacker News API integration workflow

**Description**: Build the n8n workflow that searches Hacker News for relevant discussions using the Algolia HN Search API.

**Implementation Steps**:
1. Add HTTP Request node for HN Algolia API
2. Configure search parameters (query, tags, date ranges)
3. Transform API response to standardized format
4. Filter results by relevance score
5. Extract key insights from comments

**Code Example**:
```javascript
// n8n HTTP Request Node for HN
{
  "name": "Search Hacker News",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "https://hn.algolia.com/api/v1/search",
    "qs": {
      "query": "={{$json.query}}",
      "tags": "story",
      "hitsPerPage": "20"
    }
  }
}
```

**File Changes**:
- Update n8n workflow with HN integration nodes
- Create `src/types/hn-types.ts` for response interfaces
- Add HN-specific methods to `n8n-client.ts`

**Testing Approach**:
- Test with various technology keywords
- Verify response transformation is correct
- Test with queries that return no results
- Measure API response times

**Definition of Done**:
- Successfully searches HN for technology topics
- Returns standardized results format
- Handles empty results gracefully
- Respects HN API rate limits

**Common Pitfalls**:
- Not handling HTML entities in HN responses
- Missing pagination for large result sets
- Forgetting to filter out low-quality results

### 5.3 Build Reddit API integration workflow

**Description**: Create n8n workflow for searching Reddit discussions in relevant programming subreddits.

**Implementation Steps**:
1. Configure OAuth2 authentication for Reddit API
2. Create subreddit search logic (r/programming, r/webdev, etc.)
3. Implement post and comment search
4. Transform Reddit JSON to standard format
5. Score results by upvotes and relevance

**Code Example**:
```javascript
// Reddit OAuth2 Configuration
{
  "name": "Reddit OAuth2 API",
  "type": "n8n-nodes-base.oAuth2Api",
  "credentials": {
    "oAuth2Api": {
      "id": "reddit-oauth",
      "name": "Reddit OAuth2"
    }
  }
}
```

**File Changes**:
- Add Reddit workflow to n8n
- Create `src/types/reddit-types.ts`
- Implement Reddit methods in `n8n-client.ts`
- Add Reddit-specific error handling

**Testing Approach**:
- Test OAuth2 token refresh mechanism
- Search multiple subreddits simultaneously
- Verify comment thread parsing
- Test with NSFW content filtering

**Definition of Done**:
- Authenticates with Reddit API successfully
- Searches specified subreddits for content
- Returns clean, formatted results
- Filters inappropriate content

**Common Pitfalls**:
- Reddit's complex OAuth2 flow
- Rate limiting is strict (60 requests/minute)
- Deleted/removed content handling
- NSFW content filtering

### 5.4 Set up rate limiting and retry logic

**Description**: Implement intelligent rate limiting to respect API limits and retry failed requests with exponential backoff.

**Implementation Steps**:
1. Create rate limiter nodes in n8n workflows
2. Implement request queuing system
3. Add exponential backoff for retries
4. Create rate limit status monitoring
5. Build overflow handling

**Code Example**:
```typescript
// Rate Limiter Implementation
class RateLimiter {
  private queue: Request[] = [];
  private tokens: number;
  private refillRate: number;
  
  async executeWithLimit(request: Request): Promise<Response> {
    await this.waitForToken();
    try {
      return await this.execute(request);
    } catch (error) {
      if (error.status === 429) {
        return this.retryWithBackoff(request);
      }
      throw error;
    }
  }
}
```

**File Changes**:
- Add rate limiting nodes to all n8n workflows
- Create `src/utils/rate-limiter.ts`
- Update error handling in `n8n-client.ts`
- Add rate limit status to responses

**Testing Approach**:
- Simulate hitting rate limits
- Verify backoff timing is correct
- Test queue overflow scenarios
- Monitor memory usage under load

**Definition of Done**:
- Never exceeds API rate limits
- Retries failed requests appropriately
- Provides clear feedback when rate limited
- Maintains request queue efficiently

**Common Pitfalls**:
- Memory leaks from growing queues
- Not implementing per-API limits
- Missing rate limit headers in responses
- Incorrect backoff calculations

### 5.5 Create response caching for API calls

**Description**: Build a caching layer to store API responses and reduce redundant external calls.

**Implementation Steps**:
1. Design cache key structure
2. Implement cache storage (Redis or file-based)
3. Create cache invalidation logic
4. Add cache hit/miss tracking
5. Build cache warming functionality

**Code Example**:
```typescript
// Cache Implementation
interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  ttl: number;
}

class ResponseCache {
  async get(key: string): Promise<CacheEntry | null> {
    const cached = await this.storage.get(key);
    if (cached && !this.isExpired(cached)) {
      return cached;
    }
    return null;
  }
  
  async set(key: string, data: any, ttl: number): Promise<void> {
    await this.storage.set(key, {
      key,
      data,
      timestamp: Date.now(),
      ttl
    });
  }
}
```

**File Changes**:
- Add caching nodes to n8n workflows
- Create `src/services/cache-manager.ts`
- Update `n8n-client.ts` with cache checks
- Add cache configuration to `.env`

**Testing Approach**:
- Verify cache hits return quickly
- Test cache expiration logic
- Check cache size limits
- Validate cache key uniqueness

**Definition of Done**:
- Caches all API responses appropriately
- Respects TTL for different data types
- Provides cache statistics
- Handles cache storage failures gracefully

**Common Pitfalls**:
- Cache key collisions
- Not considering cache size limits
- Missing cache warming for common queries
- Incorrect TTL values for different APIs

### 5.6 Build communication bridge to LangGraph

**Description**: Create the integration layer that allows LangGraph nodes to request data from n8n workflows seamlessly.

**Implementation Steps**:
1. Define communication interfaces
2. Create async request handlers
3. Implement response transformation
4. Add timeout and error handling
5. Build request correlation system

**Code Example**:
```typescript
// LangGraph-n8n Bridge
export class N8nBridge {
  constructor(private n8nClient: N8nClient) {}
  
  async requestResearch(
    type: 'hackernews' | 'reddit',
    query: string,
    context: ProjectState
  ): Promise<ResearchResults> {
    const sessionId = context.sessionId;
    
    try {
      const response = await this.n8nClient.search(type, {
        query,
        sessionId,
        options: this.buildOptions(context)
      });
      
      return this.transformResponse(response);
    } catch (error) {
      return this.handleError(error, type, query);
    }
  }
}
```

**File Changes**:
- Create `src/agents/bridges/n8n-bridge.ts`
- Update research nodes to use bridge
- Add bridge configuration to graph builder
- Create bridge-specific types

**Testing Approach**:
- Test with mock n8n responses
- Verify timeout handling
- Test concurrent requests
- Validate state updates

**Definition of Done**:
- LangGraph nodes can request external data
- Responses integrate into agent state
- Errors don't break agent flow
- Performance is acceptable (<3s per request)

**Common Pitfalls**:
- Not handling network timeouts
- Missing request correlation
- State mutation issues
- Blocking agent execution

## Testing Strategy

### Unit Tests Required
- `n8n-client.test.ts`: Test all client methods
- `rate-limiter.test.ts`: Verify rate limiting logic
- `cache-manager.test.ts`: Test caching behavior
- `n8n-bridge.test.ts`: Test LangGraph integration

### Integration Test Scenarios
1. Full research flow from LangGraph to external API
2. Rate limit handling during high load
3. Cache performance under concurrent requests
4. Network failure recovery
5. Authentication token refresh

### Manual Testing Procedures
1. Set up local n8n instance
2. Configure test API credentials
3. Run research queries through CLI
4. Monitor n8n execution logs
5. Verify cache hit rates

### Mock Data Requirements
- Sample HN API responses
- Reddit API response fixtures
- Error response examples
- Rate limit response headers

## Integration Plan

### How to Integrate with Existing Code
1. Add n8n configuration to environment setup
2. Inject n8n client into LangGraph nodes
3. Update research nodes to use external data
4. Add research results to state schema

### API Contracts
```typescript
// Research Node Interface
interface ResearchNodeConfig {
  n8nBridge: N8nBridge;
  maxRetries: number;
  timeout: number;
}

// State Updates
interface ProjectState {
  // existing fields...
  researchResults: {
    hackerNews: HNSearchResults[];
    reddit: RedditResults[];
    lastUpdated: string;
  };
}
```

### Configuration Requirements
```env
# n8n Configuration
N8N_WEBHOOK_URL=http://localhost:5678/webhook
N8N_API_KEY=your-api-key
N8N_TIMEOUT=30000

# API Configuration  
REDDIT_CLIENT_ID=your-client-id
REDDIT_CLIENT_SECRET=your-secret

# Cache Configuration
CACHE_TTL_MINUTES=60
CACHE_MAX_SIZE_MB=100
```

### Migration Steps
1. Deploy n8n workflows to instance
2. Configure API credentials
3. Update environment variables
4. Test webhook connectivity
5. Enable in research nodes

## Documentation Requirements

### Code Documentation Standards
- JSDoc comments for all public methods
- Interface documentation with examples
- Error code documentation
- Configuration option descriptions

### README Updates
- Add n8n setup section
- Include workflow import instructions
- Document environment variables
- Add troubleshooting guide

### API Documentation
- Webhook endpoint specifications
- Request/response formats
- Rate limit information
- Error code reference

### Usage Examples
```typescript
// Example: Using n8n for research
const client = new N8nClient(config);
const results = await client.searchHackerNews('langraph typescript');

// Example: Handling rate limits
try {
  const data = await client.searchReddit('project management');
} catch (error) {
  if (error.code === 'RATE_LIMITED') {
    console.log(`Retry after ${error.retryAfter} seconds`);
  }
}
```

## Functional Requirements

1. **FR-5.1**: System must provide webhook endpoints accepting JSON payloads for research requests
2. **FR-5.2**: System must search Hacker News API for technology discussions and return relevant results
3. **FR-5.3**: System must search Reddit API across programming subreddits for technical discussions
4. **FR-5.4**: System must enforce rate limits: HN (10k/hour), Reddit (60/minute)
5. **FR-5.5**: System must cache API responses with configurable TTL (default 60 minutes)
6. **FR-5.6**: System must provide async interface for LangGraph nodes to request external data
7. **FR-5.7**: System must handle API failures gracefully with exponential backoff retry
8. **FR-5.8**: System must transform all external API responses to standardized format
9. **FR-5.9**: System must support request correlation using session IDs
10. **FR-5.10**: System must provide health check endpoints for monitoring

## Success Metrics

### Quantitative Metrics
- API response time < 3 seconds (95th percentile)
- Cache hit rate > 40% after warm-up period
- Zero rate limit violations in production
- 99.9% webhook availability
- < 100ms cache lookup time

### Qualitative Metrics
- Research results improve project analysis quality
- External API failures don't break analysis flow
- Developers find the integration easy to extend
- Clear error messages for troubleshooting

### Performance Benchmarks
- Handle 100 concurrent research requests
- Process 1000 cached requests/second
- Webhook response time < 50ms
- Memory usage < 200MB for cache

## Next Steps

### What Becomes Possible
- Add more external data sources (GitHub, Stack Overflow)
- Implement ML-based relevance scoring
- Build recommendation engine using research data
- Create research report generation
- Enable real-time monitoring of technology trends

### Which Parent Tasks Should Follow
- **Task 6.0**: AI analysis can now use external research data
- **Task 8.0**: Refinement loop can incorporate community feedback
- **Task 9.0**: Enhanced intelligence features can build on this foundation

### Future Enhancement Opportunities
- GraphQL API for more flexible queries
- Webhook subscription model for real-time updates
- Advanced caching strategies (predictive warming)
- Multi-region deployment for global performance
- Integration with more specialized APIs (npm, PyPI, etc.) 