# Task 5.6 Detailed Implementation Part 1: Integration Testing (5.6.1-5.6.3)

## Overview
This file covers the testing portion of task 5.6, focusing on creating comprehensive integration tests for the n8n webhook system. These tests ensure the entire research flow works correctly from LangGraph nodes through n8n workflows to external APIs.

## Implementation Details

### 5.6.1 Create end-to-end integration tests

**Objective**: Build comprehensive tests that verify the complete flow from CLI command to research results.

**Test File Structure**:
```typescript
// tests/integration/n8n-research-flow.test.ts
import { N8nClient } from '../../src/services/n8n-client';
import { N8nBridge } from '../../src/agents/bridges/n8n-bridge';
import { createMockN8nServer } from '../mocks/n8n-server';
import { ProjectState } from '../../src/agents/state';

describe('N8n Research Integration', () => {
  let mockServer: MockN8nServer;
  let client: N8nClient;
  let bridge: N8nBridge;
  
  beforeAll(async () => {
    mockServer = await createMockN8nServer();
    client = new N8nClient({
      baseUrl: mockServer.url,
      apiKey: 'test-key'
    });
    bridge = new N8nBridge(client);
  });
  
  afterAll(async () => {
    await mockServer.close();
  });
});
```

**Core Integration Test Suite**:
```typescript
// tests/integration/e2e-research.test.ts
describe('End-to-End Research Flow', () => {
  it('should complete full research cycle for a project', async () => {
    // 1. Parse project document
    const projectContent = fs.readFileSync('tests/fixtures/sample-project.org', 'utf-8');
    const parsedDoc = await parser.parse(projectContent);
    
    // 2. Extract technologies
    const technologies = await technologyExtractor.extract(parsedDoc);
    expect(technologies).toContain('typescript');
    expect(technologies).toContain('react');
    
    // 3. Trigger research through n8n
    const researchResults = await bridge.requestResearch(
      'hackernews',
      technologies.join(' '),
      { sessionId: 'test-session' }
    );
    
    // 4. Verify results structure
    expect(researchResults).toMatchObject({
      source: 'hackernews',
      query: expect.any(String),
      results: expect.arrayContaining([
        expect.objectContaining({
          title: expect.any(String),
          url: expect.any(String),
          score: expect.any(Number),
          relevance: expect.any(Number)
        })
      ]),
      metadata: {
        timestamp: expect.any(String),
        cached: expect.any(Boolean)
      }
    });
    
    // 5. Verify state updates
    const updatedState = await graph.getState(config.configurable.sessionId);
    expect(updatedState.researchResults.hackerNews).toHaveLength(
      researchResults.results.length
    );
  });
});
```

**Mock Server Implementation**:
```typescript
// tests/mocks/n8n-server.ts
import express from 'express';
import { Server } from 'http';

export class MockN8nServer {
  private app: express.Application;
  private server: Server;
  public url: string;
  
  constructor() {
    this.app = express();
    this.setupRoutes();
  }
  
  private setupRoutes() {
    // Health check
    this.app.get('/webhook/ideaforge/health', (req, res) => {
      res.json({
        status: 'healthy',
        workflows: { hackernews: 'active', reddit: 'active' }
      });
    });
    
    // HackerNews search
    this.app.post('/webhook/ideaforge/hackernews-search', (req, res) => {
      const { query, sessionId } = req.body;
      
      // Return mock HN results
      res.json({
        source: 'hackernews',
        query,
        results: [
          {
            title: 'TypeScript 5.0 Released',
            url: 'https://news.ycombinator.com/item?id=123',
            score: 245,
            relevance: 0.95,
            comments: 89
          }
        ],
        metadata: {
          timestamp: new Date().toISOString(),
          cached: false
        }
      });
    });
  }
  
  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(0, () => {
        const port = (this.server.address() as any).port;
        this.url = `http://localhost:${port}`;
        resolve();
      });
    });
  }
  
  async close(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => resolve());
    });
  }
}
```

**CLI Integration Test**:
```typescript
// tests/integration/cli-research.test.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('CLI Research Integration', () => {
  it('should analyze project with research enabled', async () => {
    const { stdout, stderr } = await execAsync(
      'npm run build && node bin/ideaforge analyze tests/fixtures/sample.org --research',
      { env: { ...process.env, N8N_BASE_URL: mockServer.url } }
    );
    
    expect(stderr).toBe('');
    expect(stdout).toContain('Extracting technologies...');
    expect(stdout).toContain('Searching Hacker News...');
    expect(stdout).toContain('Research complete');
    
    // Verify output file contains research
    const output = JSON.parse(
      fs.readFileSync('sample-analysis.json', 'utf-8')
    );
    expect(output.research).toBeDefined();
    expect(output.research.hackerNews).toBeInstanceOf(Array);
  });
});
```

### 5.6.2 Test complete research flow

**Objective**: Verify the entire research pipeline works correctly with all components.

**Research Flow Test Scenarios**:
```typescript
// tests/integration/research-flow-scenarios.test.ts
describe('Research Flow Scenarios', () => {
  describe('Happy Path', () => {
    it('should search both HN and Reddit successfully', async () => {
      const state: ProjectState = {
        sessionId: 'test-happy-path',
        document: { requirements: ['Build a React dashboard'] },
        technologies: ['react', 'typescript', 'dashboard']
      };
      
      // Execute research nodes
      const result = await graph.invoke(
        { state },
        { configurable: { sessionId: state.sessionId } }
      );
      
      // Verify both sources were searched
      expect(result.researchResults).toMatchObject({
        hackerNews: expect.arrayContaining([
          expect.objectContaining({ source: 'hackernews' })
        ]),
        reddit: expect.arrayContaining([
          expect.objectContaining({ source: 'reddit' })
        ])
      });
    });
    
    it('should handle technology extraction edge cases', async () => {
      const testCases = [
        {
          input: 'Build a Node.js API',
          expected: ['nodejs', 'api', 'javascript']
        },
        {
          input: 'Create React Native mobile app',
          expected: ['react-native', 'mobile', 'javascript']
        },
        {
          input: 'Python ML pipeline with TensorFlow',
          expected: ['python', 'machine-learning', 'tensorflow']
        }
      ];
      
      for (const testCase of testCases) {
        const technologies = await technologyExtractor.extract(testCase.input);
        expect(technologies).toEqual(expect.arrayContaining(testCase.expected));
      }
    });
  });
  
  describe('Cache Behavior', () => {
    it('should use cached results on repeated queries', async () => {
      const query = 'typescript performance optimization';
      
      // First request - should hit API
      const result1 = await client.searchHackerNews(query, 'session-1');
      expect(result1.metadata.cached).toBe(false);
      
      // Second request - should hit cache
      const result2 = await client.searchHackerNews(query, 'session-2');
      expect(result2.metadata.cached).toBe(true);
      expect(result2.results).toEqual(result1.results);
    });
    
    it('should respect cache TTL', async () => {
      jest.useFakeTimers();
      
      const query = 'react hooks best practices';
      await client.searchReddit(query, 'session-1');
      
      // Advance time past TTL (60 minutes)
      jest.advanceTimersByTime(61 * 60 * 1000);
      
      const result = await client.searchReddit(query, 'session-2');
      expect(result.metadata.cached).toBe(false);
      
      jest.useRealTimers();
    });
  });
  
  describe('Parallel Research', () => {
    it('should execute HN and Reddit searches in parallel', async () => {
      const startTime = Date.now();
      
      // Mock delays
      mockServer.setDelay('hackernews', 1000);
      mockServer.setDelay('reddit', 1000);
      
      const results = await Promise.all([
        client.searchHackerNews('query', 'session'),
        client.searchReddit('query', 'session')
      ]);
      
      const duration = Date.now() - startTime;
      
      // Should take ~1 second, not 2 seconds
      expect(duration).toBeLessThan(1500);
      expect(results).toHaveLength(2);
    });
  });
});
```

**State Management Tests**:
```typescript
// tests/integration/research-state.test.ts
describe('Research State Management', () => {
  it('should persist research results in graph state', async () => {
    const sessionId = 'test-persistence';
    
    // Initial state
    const initialState = {
      sessionId,
      document: { title: 'Test Project' },
      technologies: ['react']
    };
    
    // Run research
    await graph.invoke(
      { state: initialState },
      { configurable: { sessionId } }
    );
    
    // Retrieve state
    const savedState = await graph.getState({ configurable: { sessionId } });
    
    expect(savedState.values.researchResults).toBeDefined();
    expect(savedState.values.researchResults.hackerNews).toBeInstanceOf(Array);
    expect(savedState.values.researchResults.lastUpdated).toBeDefined();
  });
  
  it('should merge new research with existing results', async () => {
    const sessionId = 'test-merge';
    
    // First research
    await graph.invoke(
      { 
        state: { 
          sessionId, 
          technologies: ['typescript'] 
        } 
      },
      { configurable: { sessionId } }
    );
    
    // Additional research
    await graph.invoke(
      { 
        state: { 
          sessionId, 
          additionalResearchTopics: ['performance'] 
        } 
      },
      { configurable: { sessionId } }
    );
    
    const finalState = await graph.getState({ configurable: { sessionId } });
    
    // Should have results from both searches
    const allQueries = finalState.values.researchResults.hackerNews
      .map(r => r.query);
    expect(allQueries).toContain('typescript');
    expect(allQueries).toContain('performance');
  });
});
```

### 5.6.3 Verify error recovery scenarios

**Objective**: Ensure the system handles failures gracefully and recovers appropriately.

**Network Failure Tests**:
```typescript
// tests/integration/error-recovery.test.ts
describe('Error Recovery Scenarios', () => {
  describe('Network Failures', () => {
    it('should retry on temporary network failure', async () => {
      let attemptCount = 0;
      mockServer.use((req, res, next) => {
        attemptCount++;
        if (attemptCount === 1) {
          res.status(503).send('Service Unavailable');
        } else {
          next();
        }
      });
      
      const result = await client.searchHackerNews('test', 'session');
      
      expect(attemptCount).toBe(2);
      expect(result).toBeDefined();
      expect(result.results).toBeInstanceOf(Array);
    });
    
    it('should fail after max retries', async () => {
      mockServer.use((req, res) => {
        res.status(500).send('Internal Server Error');
      });
      
      await expect(
        client.searchReddit('test', 'session')
      ).rejects.toThrow('Max retries exceeded');
    });
    
    it('should handle n8n webhook timeout', async () => {
      mockServer.setDelay('hackernews', 35000); // Longer than timeout
      
      await expect(
        client.searchHackerNews('test', 'session', { timeout: 1000 })
      ).rejects.toThrow('Request timeout');
    });
  });
  
  describe('API Rate Limiting', () => {
    it('should handle rate limit responses', async () => {
      mockServer.use((req, res) => {
        res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: 60
        });
      });
      
      const result = await client.searchHackerNews('test', 'session');
      
      // Should return empty results with rate limit info
      expect(result.results).toEqual([]);
      expect(result.metadata.rateLimited).toBe(true);
      expect(result.metadata.retryAfter).toBe(60);
    });
    
    it('should queue requests when rate limited', async () => {
      const limiter = new RateLimiter({
        maxRequests: 2,
        windowMs: 1000
      });
      
      const requests = Array(5).fill(null).map((_, i) => 
        limiter.execute(() => client.searchReddit(`query-${i}`, 'session'))
      );
      
      const results = await Promise.all(requests);
      
      // All requests should complete
      expect(results).toHaveLength(5);
      expect(results.every(r => r.results)).toBe(true);
    });
  });
  
  describe('Invalid Responses', () => {
    it('should handle malformed JSON responses', async () => {
      mockServer.use((req, res) => {
        res.type('json').send('{ invalid json }');
      });
      
      await expect(
        client.searchHackerNews('test', 'session')
      ).rejects.toThrow('Invalid response format');
    });
    
    it('should handle missing required fields', async () => {
      mockServer.use((req, res) => {
        res.json({ 
          // Missing 'results' field
          source: 'hackernews' 
        });
      });
      
      const result = await client.searchHackerNews('test', 'session');
      
      // Should return empty results
      expect(result.results).toEqual([]);
      expect(result.metadata.error).toBe('Missing results field');
    });
  });
  
  describe('Authentication Failures', () => {
    it('should handle invalid API key', async () => {
      const invalidClient = new N8nClient({
        baseUrl: mockServer.url,
        apiKey: 'invalid-key'
      });
      
      await expect(
        invalidClient.searchHackerNews('test', 'session')
      ).rejects.toThrow('Unauthorized');
    });
    
    it('should refresh expired tokens for Reddit', async () => {
      let tokenRefreshed = false;
      mockServer.use('/webhook/ideaforge/reddit-search', (req, res) => {
        if (!tokenRefreshed && req.headers.authorization === 'Bearer expired') {
          tokenRefreshed = true;
          res.status(401).json({ error: 'Token expired' });
        } else {
          res.json({ results: [] });
        }
      });
      
      const result = await client.searchReddit('test', 'session');
      
      expect(tokenRefreshed).toBe(true);
      expect(result).toBeDefined();
    });
  });
});
```

**Testing Helper Utilities**:
```typescript
// tests/helpers/n8n-test-utils.ts
export class N8nTestUtils {
  static async waitForWebhook(
    mockServer: MockN8nServer,
    path: string,
    timeout = 5000
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Webhook ${path} not called within ${timeout}ms`));
      }, timeout);
      
      mockServer.on('webhook', (webhookPath, data) => {
        if (webhookPath === path) {
          clearTimeout(timer);
          resolve(data);
        }
      });
    });
  }
  
  static createMockResearchResults(
    source: 'hackernews' | 'reddit',
    count = 5
  ): ResearchResult[] {
    return Array(count).fill(null).map((_, i) => ({
      id: `${source}-${i}`,
      title: `Mock ${source} result ${i}`,
      url: `https://example.com/${source}/${i}`,
      score: Math.floor(Math.random() * 500),
      relevance: Math.random(),
      source
    }));
  }
  
  static async simulateNetworkConditions(
    mockServer: MockN8nServer,
    conditions: NetworkConditions
  ) {
    if (conditions.offline) {
      mockServer.disconnect();
    } else if (conditions.latency) {
      mockServer.setLatency(conditions.latency);
    } else if (conditions.packetLoss) {
      mockServer.setPacketLoss(conditions.packetLoss);
    }
  }
}
```

## Test Execution Strategy

### Running Integration Tests
```bash
# Run all integration tests
npm run test:integration

# Run specific test suite
npm run test:integration -- research-flow

# Run with coverage
npm run test:integration:coverage

# Run with debug output
DEBUG=ideaforge:* npm run test:integration
```

### CI/CD Integration
```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      n8n:
        image: n8nio/n8n
        ports:
          - 5678:5678
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:integration
      - uses: codecov/codecov-action@v3
```

## Definition of Done

✅ All integration tests pass consistently
✅ Test coverage > 80% for n8n integration code
✅ Mock server supports all webhook endpoints
✅ Error scenarios are comprehensively tested
✅ Tests run in under 2 minutes
✅ No flaky tests in CI/CD pipeline 