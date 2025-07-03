#!/usr/bin/env node

/**
 * Test script for Phase 2 Reddit webhook functionality
 * Tests subreddit validation and comment search features
 */

const https = require('https');

// Configuration
const WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/ideaforge/reddit-search';
const API_KEY = process.env.N8N_API_KEY || 'local-dev-api-key-12345';

// Test data with different scenarios
const testScenarios = [
  {
    name: "Test 1: Basic search with subreddit validation",
    payload: {
      query: "typescript performance optimization",
      sessionId: "test-phase2-001",
      subreddits: ["typescript", "javascript", "webdev", "invalidsubreddit123"],
      options: {
        limit: 20,
        sortBy: "relevance",
        timeframe: "month",
        includeComments: true,
        includePosts: true
      }
    }
  },
  {
    name: "Test 2: Comment-only search",
    payload: {
      query: "react hooks useState",
      sessionId: "test-phase2-002",
      options: {
        limit: 30,
        sortBy: "top",
        timeframe: "year",
        includeComments: true,
        includePosts: false
      }
    }
  },
  {
    name: "Test 3: Search with NSFW subreddit filtering",
    payload: {
      query: "blockchain technology",
      sessionId: "test-phase2-003",
      subreddits: ["cryptocurrency", "blockchain", "nsfw", "programming"],
      options: {
        limit: 15,
        includeComments: true,
        includePosts: true
      }
    }
  },
  {
    name: "Test 4: Advanced query with boolean operators",
    payload: {
      query: "python machine learning -tensorflow +pytorch",
      sessionId: "test-phase2-004",
      options: {
        limit: 25,
        sortBy: "new",
        timeframe: "week",
        includeComments: true,
        includePosts: true
      }
    }
  },
  {
    name: "Test 5: Empty/invalid subreddit handling",
    payload: {
      query: "javascript frameworks",
      sessionId: "test-phase2-005",
      subreddits: ["doesnotexist999", "private123", "banned456"],
      options: {
        limit: 10,
        includeComments: true,
        includePosts: true
      }
    }
  }
];

// Helper function to make HTTPS requests
function makeRequest(data) {
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

    const protocol = url.protocol === 'https:' ? https : require('http');
    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

// Function to format and display results
function displayResults(scenario, response) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`${scenario.name}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Status: ${response.status}`);
  
  if (response.data.status === 'success') {
    const metadata = response.data.data.metadata;
    console.log(`\n📊 Search Results:`);
    console.log(`   Total Results: ${metadata.totalResults}`);
    console.log(`   Posts: ${metadata.postCount}`);
    console.log(`   Comments: ${metadata.commentCount}`);
    console.log(`   Filtered Out: ${metadata.filtered}`);
    console.log(`   Search Time: ${metadata.searchTime}ms`);
    
    if (metadata.subreddits) {
      console.log(`\n📁 Valid Subreddits: ${metadata.subreddits.join(', ')}`);
    }
    
    if (metadata.invalidSubreddits && metadata.invalidSubreddits.length > 0) {
      console.log(`\n❌ Invalid Subreddits:`);
      metadata.invalidSubreddits.forEach(sub => {
        console.log(`   - ${sub.name}: ${sub.reason}`);
      });
    }
    
    console.log(`\n📄 Top Results:`);
    const results = response.data.data.posts.slice(0, 5);
    results.forEach((result, i) => {
      console.log(`\n${i + 1}. ${result.type === 'comment' ? '💬' : '📄'} ${result.title}`);
      console.log(`   Relevance: ${result.relevance}/100`);
      console.log(`   Subreddit: r/${result.subreddit}`);
      console.log(`   URL: ${result.url}`);
    });
    
    // Rate limit info
    if (response.data.metadata.rateLimitRemaining !== undefined) {
      console.log(`\n⚡ Rate Limit:`);
      console.log(`   Used: ${response.data.metadata.rateLimitUsed}`);
      console.log(`   Remaining: ${response.data.metadata.rateLimitRemaining}`);
      console.log(`   Reset: ${new Date(response.data.metadata.rateLimitReset * 1000).toLocaleTimeString()}`);
    }
  } else {
    console.log(`\n❌ Error: ${response.data.error}`);
    console.log(`   Code: ${response.data.code}`);
  }
}

// Main execution
async function runTests() {
  console.log('🚀 Reddit Webhook Phase 2 Test Suite');
  console.log(`📍 Testing endpoint: ${WEBHOOK_URL}`);
  console.log(`🔑 Using API key: ${API_KEY.substring(0, 10)}...`);
  
  for (const scenario of testScenarios) {
    try {
      console.log(`\n⏳ Running: ${scenario.name}`);
      const response = await makeRequest(scenario.payload);
      displayResults(scenario, response);
      
      // Add delay between requests to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`\n❌ Test failed: ${error.message}`);
    }
  }
  
  console.log(`\n\n✅ Phase 2 test suite completed!`);
  console.log('\nKey features tested:');
  console.log('  - Subreddit validation (NSFW/private filtering)');
  console.log('  - Comment search functionality');
  console.log('  - Invalid subreddit handling');
  console.log('  - Mixed post and comment results');
  console.log('  - Advanced search operators');
}

// Execute tests
runTests().catch(console.error); 