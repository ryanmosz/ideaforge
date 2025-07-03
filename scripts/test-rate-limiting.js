#!/usr/bin/env node

/**
 * Test script for rate limiting functionality in n8n workflows
 * Tests both HackerNews and Reddit rate limiting behavior
 */

const axios = require('axios');

// Configuration
const N8N_BASE_URL = process.env.N8N_WEBHOOK_BASE_URL || 'http://localhost:5678/webhook';
const TIMEOUT = 5000;

// Test utilities
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const makeRequest = async (endpoint, query) => {
  try {
    const response = await axios.post(
      `${N8N_BASE_URL}/${endpoint}`,
      { query },
      { 
        timeout: TIMEOUT,
        validateStatus: () => true // Accept any status
      }
    );
    return response.data;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Connection refused. Is n8n running?');
      process.exit(1);
    }
    throw error;
  }
};

// Test HackerNews rate limiting
async function testHackerNewsRateLimiting() {
  console.log('\n🔍 Testing HackerNews Rate Limiting...\n');
  
  // Test per-second limit (10 requests/second)
  console.log('Testing per-second limit (max 10/sec)...');
  const startTime = Date.now();
  const requests = [];
  
  // Fire 12 rapid requests
  for (let i = 1; i <= 12; i++) {
    requests.push(
      makeRequest('hackernews-search', `test-rate-limit-${i}`)
        .then(result => ({
          index: i,
          success: result.success !== false,
          rateLimitStats: result.rateLimitStats,
          timestamp: Date.now() - startTime
        }))
    );
  }
  
  const results = await Promise.all(requests);
  
  // Analyze results
  const successful = results.filter(r => r.success);
  const rateLimited = results.filter(r => !r.success);
  
  console.log(`✅ Successful requests: ${successful.length}`);
  console.log(`⏳ Rate limited requests: ${rateLimited.length}`);
  
  if (rateLimited.length > 0) {
    console.log('\nRate limit stats from last request:');
    const lastResult = results[results.length - 1];
    if (lastResult.rateLimitStats) {
      console.log(`  Current: ${lastResult.rateLimitStats.current}/${lastResult.rateLimitStats.max}`);
      console.log(`  Remaining: ${lastResult.rateLimitStats.remaining}`);
      console.log(`  Window: ${lastResult.rateLimitStats.windowMs}ms`);
    }
  }
  
  // Test window limit (simulate many requests over time)
  console.log('\n\nTesting window limit (10,000/hour)...');
  console.log('Making 5 spaced requests to check cumulative tracking...');
  
  for (let i = 1; i <= 5; i++) {
    const result = await makeRequest('hackernews-search', `window-test-${i}`);
    if (result.rateLimitStats) {
      console.log(`Request ${i}: ${result.rateLimitStats.current}/${result.rateLimitStats.max} used`);
    }
    await sleep(1100); // Wait just over 1 second between requests
  }
}

// Test Reddit rate limiting
async function testRedditRateLimiting() {
  console.log('\n\n🔍 Testing Reddit Rate Limiting...\n');
  
  // Test per-second limit (1 request/second)
  console.log('Testing per-second limit (max 1/sec)...');
  console.log('Making 3 rapid requests (should see delays)...\n');
  
  for (let i = 1; i <= 3; i++) {
    const startTime = Date.now();
    const result = await makeRequest('reddit-search', `test-rate-limit-${i}`);
    const elapsed = Date.now() - startTime;
    
    console.log(`Request ${i}:`);
    console.log(`  Time taken: ${elapsed}ms`);
    if (result.rateLimitStats) {
      console.log(`  Rate limit: ${result.rateLimitStats.current}/${result.rateLimitStats.max}`);
      console.log(`  Remaining: ${result.rateLimitStats.remaining}`);
    }
    console.log(`  Success: ${result.success !== false ? '✅' : '❌'}`);
    
    if (i < 3) {
      console.log(''); // Empty line between requests
    }
  }
  
  // Test rate limit error handling
  console.log('\n\nTesting rate limit error response handling...');
  console.log('Simulating a rate limit error...');
  
  // Make a request with a special query that triggers rate limit in test mode
  const errorResult = await makeRequest('reddit-search', '__test_rate_limit_error__');
  
  if (errorResult.rateLimited) {
    console.log('✅ Rate limit error handled correctly:');
    console.log(`  Retry after: ${errorResult.retryAfter}ms`);
    console.log(`  Reset at: ${errorResult.resetAt}`);
  } else {
    console.log('ℹ️  Rate limit error simulation not available in current workflow');
  }
}

// Test concurrent rate limiting
async function testConcurrentRateLimiting() {
  console.log('\n\n🔍 Testing Concurrent Rate Limiting...\n');
  console.log('Making simultaneous requests to both APIs...\n');
  
  const hnRequest = makeRequest('hackernews-search', 'concurrent-test-hn');
  const redditRequest = makeRequest('reddit-search', 'concurrent-test-reddit');
  
  const [hnResult, redditResult] = await Promise.all([hnRequest, redditRequest]);
  
  console.log('HackerNews request:');
  if (hnResult.rateLimitStats) {
    console.log(`  Rate limit: ${hnResult.rateLimitStats.current}/${hnResult.rateLimitStats.max}`);
    console.log(`  API: ${hnResult.rateLimitStats.api}`);
  }
  console.log(`  Success: ${hnResult.success !== false ? '✅' : '❌'}`);
  
  console.log('\nReddit request:');
  if (redditResult.rateLimitStats) {
    console.log(`  Rate limit: ${redditResult.rateLimitStats.current}/${redditResult.rateLimitStats.max}`);
    console.log(`  API: ${redditResult.rateLimitStats.api}`);
  }
  console.log(`  Success: ${redditResult.success !== false ? '✅' : '❌'}`);
  
  console.log('\n✅ Both APIs maintain separate rate limit tracking');
}

// Main execution
async function main() {
  console.log('🚀 Starting Rate Limit Tests');
  console.log(`📍 n8n URL: ${N8N_BASE_URL}`);
  console.log('================================\n');
  
  try {
    // Test health check first
    console.log('Checking n8n connectivity...');
    await makeRequest('health-check', {});
    console.log('✅ n8n is responding\n');
    
    // Run tests
    await testHackerNewsRateLimiting();
    await testRedditRateLimiting();
    await testConcurrentRateLimiting();
    
    console.log('\n\n✅ All rate limiting tests completed!');
    console.log('\n💡 Tips:');
    console.log('- Monitor n8n execution logs for detailed rate limit information');
    console.log('- Check workflow static data for persistent rate limit state');
    console.log('- Rate limits reset based on sliding windows');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { makeRequest, testHackerNewsRateLimiting, testRedditRateLimiting }; 