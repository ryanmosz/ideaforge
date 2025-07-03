## Relevant Files

- `src/services/n8n-client.ts` - Main n8n webhook client implementation
- `tests/services/n8n-client.test.ts` - Unit tests for n8n client
- `src/types/n8n-types.ts` - TypeScript interfaces for n8n communication
- `src/agents/types/research-types.ts` - Research result types for agents
- `src/services/response-transformer.ts` - n8n response transformation service
- `tests/services/response-transformer.test.ts` - Response transformer tests
- `src/utils/retry-handler.ts` - Retry logic with exponential backoff
- `tests/utils/retry-handler.test.ts` - Retry handler tests
- `src/services/cache-manager.ts` - Response caching implementation (TODO)
- `src/utils/rate-limiter.ts` - Rate limiting utility (TODO)
- `src/agents/bridges/n8n-bridge.ts` - LangGraph to n8n communication bridge
- `tests/agents/bridges/n8n-bridge.test.ts` - Bridge unit tests
- `n8n-workflows/hackernews-search.json` - n8n workflow for HN integration
- `n8n-workflows/reddit-search.json` - n8n workflow for Reddit integration
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

- [ ] 5.2 Build communication bridge to LangGraph
  - [x] 5.2.1 Create n8n client service class
  - [x] 5.2.2 Implement webhook request methods
  - [x] 5.2.3 Add timeout and retry logic
  - [x] 5.2.4 Create response transformation layer
  - [x] 5.2.5 Build LangGraph bridge interface
  - [ ] 5.2.6 Implement session correlation
  - [ ] 5.2.7 Add error handling and fallbacks
  - [ ] 5.2.8 Write comprehensive unit tests

- [ ] 5.3 Implement Hacker News API integration
  - [ ] 5.3.1 Add HN search nodes to n8n workflow
  - [ ] 5.3.2 Configure Algolia API parameters
  - [ ] 5.3.3 Implement response parsing
  - [ ] 5.3.4 Add relevance scoring
  - [ ] 5.3.5 Create TypeScript types for HN data
  - [ ] 5.3.6 Test with various search queries
  - [ ] 5.3.7 Handle edge cases and errors

- [ ] 5.4 Implement Reddit API integration
  - [ ] 5.4.1 Set up Reddit OAuth2 in n8n
  - [ ] 5.4.2 Configure subreddit search logic
  - [ ] 5.4.3 Implement post and comment parsing
  - [ ] 5.4.4 Add content filtering (NSFW, deleted)
  - [ ] 5.4.5 Create TypeScript types for Reddit data
  - [ ] 5.4.6 Test OAuth token refresh
  - [ ] 5.4.7 Verify rate limit compliance

- [ ] 5.5 Add rate limiting and caching
  - [ ] 5.5.1 Implement rate limiter utility
  - [ ] 5.5.2 Add rate limiting to n8n workflows
  - [ ] 5.5.3 Create cache manager service
  - [ ] 5.5.4 Implement cache key generation
  - [ ] 5.5.5 Add TTL-based expiration
  - [ ] 5.5.6 Build cache warming logic
  - [ ] 5.5.7 Add monitoring and metrics
  - [ ] 5.5.8 Test under load conditions

- [ ] 5.6 Integration testing and documentation
  - [ ] 5.6.1 Create end-to-end integration tests (Details in: tasks-parent-5.6.1-detailed.md)
  - [ ] 5.6.2 Test complete research flow (Details in: tasks-parent-5.6.1-detailed.md)
  - [ ] 5.6.3 Verify error recovery scenarios (Details in: tasks-parent-5.6.1-detailed.md)
  - [ ] 5.6.4 Update project README (Details in: tasks-parent-5.6.2-detailed.md)
  - [ ] 5.6.5 Create n8n deployment guide (Details in: tasks-parent-5.6.2-detailed.md)
  - [ ] 5.6.6 Document API configuration (Details in: tasks-parent-5.6.3-detailed.md)
  - [ ] 5.6.7 Add usage examples (Details in: tasks-parent-5.6.4-detailed.md)
  - [ ] 5.6.8 Create troubleshooting guide (Details in: tasks-parent-5.6.5-detailed.md) 