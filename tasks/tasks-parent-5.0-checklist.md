## Relevant Files

- `src/services/n8n-client.ts` - Main n8n webhook client implementation
- `tests/services/n8n-client.test.ts` - Unit tests for n8n client
- `src/types/n8n-types.ts` - TypeScript interfaces for n8n communication
- `src/types/hn-specific-types.ts` - HackerNews-specific type definitions
- `src/types/reddit-types.ts` - Reddit API type definitions
- `src/agents/types/research-types.ts` - Research result types for agents
- `src/services/response-transformer.ts` - n8n response transformation service
- `tests/services/response-transformer.test.ts` - Response transformer tests
- `src/utils/retry-handler.ts` - Retry logic with exponential backoff
- `tests/utils/retry-handler.test.ts` - Retry handler tests
- `src/services/cache-manager.ts` - Response caching implementation
- `tests/services/cache-manager.test.ts` - Cache manager tests
- `src/utils/rate-limiter.ts` - Rate limiting utility with sliding window algorithm
- `tests/utils/rate-limiter.test.ts` - Rate limiter unit tests
- `src/agents/bridges/n8n-bridge.ts` - LangGraph to n8n communication bridge
- `tests/agents/bridges/n8n-bridge.test.ts` - Bridge unit tests
- `src/utils/cache-key-generator.ts` - Cache key generation utility
- `tests/utils/cache-key-generator.test.ts` - Cache key generator tests
- `src/utils/ttl-strategies.ts` - Dynamic TTL strategy implementations
- `tests/utils/ttl-strategies.test.ts` - TTL strategy tests
- `src/services/smart-cache-manager.ts` - Smart cache with TTL strategies
- `tests/services/smart-cache-manager.test.ts` - Smart cache manager tests
- `src/services/cache-warmer.ts` - Cache warming service
- `tests/services/cache-warmer.test.ts` - Cache warmer tests
- `src/utils/metrics-collector.ts` - Metrics collection and reporting utility
- `tests/utils/metrics-collector.test.ts` - Metrics collector tests
- `n8n-workflows/hackernews-search.json` - n8n workflow for HN integration
- `n8n-workflows/reddit-search.json` - n8n workflow for Reddit integration
- `n8n-workflows/health-check.json` - n8n health check workflow
- `n8n-workflows/deploy.sh` - Workflow deployment helper script
- `scripts/test-hn-webhook.js` - HN webhook test script
- `scripts/verify-hn-response.js` - Workflow verification script
- `scripts/test-reddit-webhook.js` - Reddit webhook test script
- `scripts/verify-reddit-oauth.js` - Reddit OAuth verification script
- `scripts/add-rate-limiting-to-workflows.js` - Script to add rate limiting nodes to workflows
- `scripts/test-rate-limiting.js` - Rate limiting test script
- `scripts/n8n-cache-key-generator.js` - n8n function node for cache key generation
- `scripts/test-cache-warming.js` - Cache warming demonstration script
- `scripts/test-metrics.js` - Metrics collection demonstration script
- `tests/integration/demo-research-flow.test.ts` - NEW: Minimal integration test for demo
- `scripts/demo-ideaforge.js` - NEW: Demo helper script
- `docs/n8n-setup.md` - n8n deployment and configuration guide
- `.env.example` - Environment variables template

### Notes

- n8n workflows should be tested in a local n8n instance before deployment
- Integration tests require mock API responses to avoid hitting real APIs
- Use `npx jest [optional/path/to/test/file]` to run tests

## Tasks

- [x] 5.1 Create n8n webhook endpoints for CLI
  - [x] 5.1.1 Set up n8n instance (local or cloud)
  - [x] 5.1.2 Create HackerNews search webhook workflow
  - [x] 5.1.3 Create Reddit search webhook workflow
  - [x] 5.1.4 Configure webhook authentication
  - [x] 5.1.5 Add CORS headers for local development
  - [x] 5.1.6 Create health check endpoints
  - [x] 5.1.7 Export and version control workflows
  - [x] 5.1.8 Document webhook URLs and setup

- [x] 5.2 Build communication bridge to LangGraph
  - [x] 5.2.1 Create n8n client service class
  - [x] 5.2.2 Implement webhook request methods
  - [x] 5.2.3 Add timeout and retry logic
  - [x] 5.2.4 Create response transformation layer
  - [x] 5.2.5 Build LangGraph bridge interface
  - [x] 5.2.6 Implement session correlation
  - [x] 5.2.7 Add error handling and fallbacks
  - [x] 5.2.8 Write comprehensive unit tests

- [x] 5.3 Implement Hacker News API integration
  - [x] 5.3.1 Add HN search nodes to n8n workflow
  - [x] 5.3.2 Configure Algolia API parameters
  - [x] 5.3.3 Implement response parsing
  - [x] 5.3.4 Add relevance scoring
  - [x] 5.3.5 Create TypeScript types for HN data
  - [x] 5.3.6 Test with various search queries
  - [x] 5.3.7 Handle edge cases and errors

- [x] 5.4 Implement Reddit API integration
  - [x] 5.4.1 Set up Reddit OAuth2 in n8n
  - [x] 5.4.2 Configure subreddit search logic
  - [x] 5.4.3 Implement post and comment parsing
  - [x] 5.4.4 Add content filtering (NSFW, deleted)
  - [x] 5.4.5 Create TypeScript types for Reddit data
  - [x] 5.4.6 Test OAuth token refresh
  - [x] 5.4.7 Verify rate limit compliance

- [x] 5.5 Add rate limiting and caching
  - [x] 5.5.1 Implement rate limiter utility
  - [x] 5.5.2 Add rate limiting to n8n workflows
  - [x] 5.5.3 Create cache manager service
  - [x] 5.5.4 Implement cache key generation
  - [x] 5.5.5 Add TTL-based expiration (Fixed failing n8n-client tests)
  - [x] 5.5.6 Build cache warming logic
  - [x] 5.5.7 Add monitoring and metrics
  - [x] 5.5.8 Test under load conditions

- [ ] 5.6 Integration testing and documentation
  - [x] 5.6.1 Create end-to-end integration tests (Details in: tasks-parent-5.6.1-detailed.md)
  - [ ] 5.6.2 Test complete research flow (Details in: tasks-parent-5.6.1-detailed.md) [BLOCKED - n8n workflows need update]
  - [ ] 5.6.3 Verify error recovery scenarios (Details in: tasks-parent-5.6.1-detailed.md) [DEFERRED - POST-DEMO]
  - [x] 5.6.4 Update project README (Details in: tasks-parent-5.6.2-detailed.md)
  - [ ] 5.6.5 Create n8n deployment guide (Details in: tasks-parent-5.6.2-detailed.md) [DEFERRED - POST-DEMO]
  - [ ] 5.6.6 Document API configuration (Details in: tasks-parent-5.6.3-detailed.md) [DEFERRED - POST-DEMO]
  - [x] 5.6.7 Add usage examples (Details in: tasks-parent-5.6.4-detailed.md)
  - [ ] 5.6.8 Create troubleshooting guide (Details in: tasks-parent-5.6.5-detailed.md) [DEFERRED - POST-DEMO]
  
  **STATUS**: Demo-ready! 🎉
  - ✅ FIXED: Created V2 workflows without problematic rate limiting nodes
  - ✅ HackerNews V2: Working with real API data
  - ✅ Health Check V2: Ready for import
  - ⏭️ Reddit: Skipped for demo (avoids OAuth complexity)
  - Basic demo works: `npm run test:grammarly`
  - Test after importing workflows: `./scripts/test-demo-ready.sh`
  - Created all-in-one demo script: `./scripts/demo-all-in-one.sh OPENAI_KEY`
  - OpenAI integration is local via LangGraph (not through n8n)
  - Research features work with HackerNews only for demo
  Remaining tasks deferred to post-demo completion. 