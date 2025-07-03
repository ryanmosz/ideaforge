#!/usr/bin/env node

/**
 * Test script for Phase 3 Reddit webhook functionality
 * Tests content filtering and quality scoring features
 */

const https = require('https');

// Configuration
const WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/ideaforge/reddit-search';
const API_KEY = process.env.N8N_API_KEY || 'local-dev-api-key-12345';

// Test data with different scenarios
const testScenarios = [
  {
    name: "Test 1: Basic filtering with default settings",
    payload: {
      query: "react performance optimization",
      sessionId: "test-phase3-001",
      options: {
        limit: 30,
        sortBy: "hot",
        timeframe: "month"
      }
    }
  },
  {
    name: "Test 2: Strict quality filtering",
    payload: {
      query: "typescript best practices",
      sessionId: "test-phase3-002",
      options: {
        limit: 20,
        sortBy: "top",
        timeframe: "year",
        filters: {
          removeNSFW: true,
          removeDeleted: true,
          removeLocked: true,
          removeControversial: true,
          minScore: 10,
          minComments: 5,
          maxAge: 90, // 3 months
          requireText: true
        }
      }
    }
  },
  {
    name: "Test 3: Include controversial content",
    payload: {
      query: "javascript vs typescript debate",
      sessionId: "test-phase3-003",
      options: {
        limit: 25,
        sortBy: "relevance",
        timeframe: "all",
        filters: {
          removeNSFW: true,
          removeDeleted: true,
          removeLocked: false,
          removeControversial: false, // Include controversial
          minScore: 0,
          minComments: 0
        }
      }
    }
  },
  {
    name: "Test 4: Recent high-quality content only",
    payload: {
      query: "web development trends 2024",
      sessionId: "test-phase3-004",
      options: {
        limit: 15,
        sortBy: "new",
        timeframe: "week",
        filters: {
          minScore: 50,
          minComments: 10,
          maxAge: 7, // 1 week
          removeControversial: true
        }
      }
    }
  },
  {
    name: "Test 5: Author blacklist test",
    payload: {
      query: "programming tutorials",
      sessionId: "test-phase3-005",
      options: {
        limit: 20,
        filters: {
          blacklistAuthors: ["AutoModerator", "[deleted]", "bot", "ModeratorBot"],
          blacklistDomains: ["spam-site.com", "low-quality.org"]
        }
      }
    }
  },
  {
    name: "Test 6: Quality scoring verification",
    payload: {
      query: "clean code principles",
      sessionId: "test-phase3-006",
      subreddits: ["programming", "cleancode", "softwarearchitecture"],
      options: {
        limit: 10,
        sortBy: "top",
        timeframe: "all",
        filters: {
          minScore: 100,
          minComments: 20,
          removeControversial: true
        }
      }
    }
  }
];

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function makeRequest(payload) {
  return new Promise((resolve, reject) => {
    const url = new URL(WEBHOOK_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      }
    };

    const req = (url.protocol === 'https:' ? https : require('http')).request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(payload));
    req.end();
  });
}

function analyzeQualityScores(results) {
  if (!results || !Array.isArray(results)) return;
  
  const scores = results.map(r => r.qualityScore || 0);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  
  console.log(`${colors.cyan}Quality Score Analysis:${colors.reset}`);
  console.log(`  Average: ${avgScore.toFixed(0)}`);
  console.log(`  Max: ${maxScore}`);
  console.log(`  Min: ${minScore}`);
  
  // Show quality distribution
  const highQuality = scores.filter(s => s > 1000).length;
  const mediumQuality = scores.filter(s => s > 500 && s <= 1000).length;
  const lowQuality = scores.filter(s => s <= 500).length;
  
  console.log(`  High Quality (>1000): ${highQuality}`);
  console.log(`  Medium Quality (501-1000): ${mediumQuality}`);
  console.log(`  Low Quality (≤500): ${lowQuality}`);
}

async function runTests() {
  console.log(`${colors.bright}${colors.blue}Reddit Content Filtering Test Suite (Phase 3)${colors.reset}\n`);
  console.log(`Webhook URL: ${WEBHOOK_URL}`);
  console.log(`API Key: ${API_KEY.substring(0, 10)}...`);
  console.log(`${colors.bright}${'='.repeat(60)}${colors.reset}\n`);

  for (const scenario of testScenarios) {
    console.log(`${colors.bright}${colors.yellow}${scenario.name}${colors.reset}`);
    console.log(`Query: "${scenario.payload.query}"`);
    
    if (scenario.payload.options?.filters) {
      console.log(`Filters:`, JSON.stringify(scenario.payload.options.filters, null, 2));
    }
    
    try {
      const start = Date.now();
      const response = await makeRequest(scenario.payload);
      const duration = Date.now() - start;

      if (response.status === 200) {
        console.log(`${colors.green}✓ Success (${duration}ms)${colors.reset}`);
        
        const data = response.data.data;
        if (data) {
          const metadata = data.metadata;
          console.log(`Found: ${metadata.totalResults} results (${metadata.postCount} posts, ${metadata.commentCount} comments)`);
          
          // Show filter statistics
          if (metadata.filtered) {
            console.log(`${colors.yellow}Filtered out:${colors.reset}`);
            console.log(`  Posts: ${metadata.filtered.posts || 0}`);
            console.log(`  Comments: ${metadata.filtered.comments || 0}`);
          }
          
          // Show quality score statistics
          if (metadata.qualityScores) {
            console.log(`${colors.cyan}Quality Scores:${colors.reset}`);
            console.log(`  Top Post Score: ${metadata.qualityScores.topPost}`);
            console.log(`  Top Comment Score: ${metadata.qualityScores.topComment}`);
            console.log(`  Avg Post Score: ${metadata.qualityScores.avgPost}`);
            console.log(`  Avg Comment Score: ${metadata.qualityScores.avgComment}`);
          }
          
          // Analyze individual results
          if (data.posts && data.posts.length > 0) {
            analyzeQualityScores(data.posts);
            
            // Show top 3 results with quality indicators
            console.log(`\n${colors.bright}Top Results:${colors.reset}`);
            data.posts.slice(0, 3).forEach((post, i) => {
              const qualityIndicator = post.qualityScore > 1000 ? '⭐' : 
                                     post.qualityScore > 500 ? '✨' : '📄';
              console.log(`${i + 1}. ${qualityIndicator} [${post.qualityScore}] ${post.title.substring(0, 60)}...`);
              console.log(`   r/${post.subreddit} • Relevance: ${post.relevance}`);
            });
          }
          
          // Show rate limit info
          if (response.data.metadata?.rateLimitRemaining !== undefined) {
            console.log(`\n${colors.cyan}Rate Limit: ${response.data.metadata.rateLimitRemaining} remaining${colors.reset}`);
          }
        }
      } else {
        console.log(`${colors.red}✗ Failed (${duration}ms)${colors.reset}`);
        console.log(`Status: ${response.status}`);
        console.log(`Error:`, response.data);
      }
    } catch (error) {
      console.log(`${colors.red}✗ Error: ${error.message}${colors.reset}`);
    }
    
    console.log(`${colors.bright}${'-'.repeat(60)}${colors.reset}\n`);
  }
  
  console.log(`${colors.bright}${colors.green}All tests completed!${colors.reset}`);
}

// Run tests
runTests().catch(console.error); 