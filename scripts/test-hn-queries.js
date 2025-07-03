#!/usr/bin/env node

/**
 * Comprehensive test suite for HackerNews webhook
 * Tests various query types and edge cases
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const N8N_URL = process.env.N8N_URL || 'http://localhost:5678';
const WEBHOOK_PATH = '/webhook/ideaforge/hackernews-search';
const API_KEY = 'local-dev-api-key-12345';

// Test query sets
const testQueries = [
  // Technology queries
  { query: 'typescript performance', description: 'Specific technology + aspect', expectedTech: 'typescript' },
  { query: 'react vs vue', description: 'Comparison query', expectedComparison: true },
  { query: 'python web framework', description: 'General technology area', expectedTech: 'python' },
  { query: 'rust memory safety', description: 'Technology + feature', expectedTech: 'rust' },
  { query: 'golang concurrency', description: 'Language + concept', expectedTech: 'golang' },
  
  // Question queries
  { query: 'how to scale nodejs', description: 'How-to question', expectedQuestion: true },
  { query: 'what is rust used for', description: 'What-is question', expectedQuestion: true },
  { query: 'why golang', description: 'Why question', expectedQuestion: true },
  { query: 'when to use microservices', description: 'When question', expectedQuestion: true },
  
  // Problem queries
  { query: 'javascript memory leak', description: 'Problem/issue query', expectedProblem: true },
  { query: 'react performance optimization', description: 'Optimization query', expectedOptimization: true },
  { query: 'python async await', description: 'Feature query', expectedFeature: true },
  { query: 'typescript error handling', description: 'Error handling query', expectedTech: 'typescript' },
  
  // Edge cases with special characters
  { query: 'c++', description: 'Special characters (++)', expectedSpecial: true },
  { query: 'node.js', description: 'Dots in query', expectedTech: 'javascript' },
  { query: '.NET Core', description: 'Leading dot', expectedSpecial: true },
  { query: 'C#', description: 'Hash character', expectedSpecial: true },
  { query: 'F#', description: 'F sharp language', expectedSpecial: true },
  
  // Multi-word queries
  { query: 'machine learning tensorflow keras', description: 'Multiple technologies', expectedMulti: true },
  { query: 'docker kubernetes deployment', description: 'DevOps stack', expectedMulti: true },
  { query: 'react redux typescript nextjs', description: 'Frontend stack', expectedMulti: true },
  
  // Version-specific
  { query: 'react 18', description: 'Version number', expectedVersion: true },
  { query: 'python 3.11', description: 'Decimal version', expectedVersion: true },
  { query: 'vue 3 composition api', description: 'Version + feature', expectedVersion: true },
  
  // Empty/invalid
  { query: '', description: 'Empty query', expectedError: true },
  { query: '   ', description: 'Whitespace only', expectedError: true },
  { query: '!!!', description: 'Special chars only', expectedError: true },
  { query: '🚀', description: 'Emoji only', expectedError: true },
  
  // Long queries
  { 
    query: 'how to build a scalable microservices architecture with kubernetes docker and golang for high performance applications',
    description: 'Very long query',
    expectedLong: true
  },
  
  // Date-sensitive queries
  { query: 'latest javascript features', description: 'Time-sensitive query', options: { dateRange: 'last_month' } },
  { query: 'new react hooks', description: 'Recent features', options: { dateRange: 'last_week' } },
  
  // High-quality filter
  { query: 'typescript', description: 'With min points filter', options: { minPoints: 100 } },
  { query: 'react', description: 'Popular discussions only', options: { minPoints: 50, limit: 5 } }
];

// Performance tracking
const performanceStats = {
  totalQueries: 0,
  successfulQueries: 0,
  failedQueries: 0,
  totalTime: 0,
  avgTime: 0,
  minTime: Infinity,
  maxTime: 0,
  errors: []
};

// Test a single query
async function testQuery(testCase, index) {
  const { query, description, options = {}, ...expectations } = testCase;
  
  console.log(`\n[${index + 1}/${testQueries.length}] Testing: ${description}`);
  console.log(`Query: "${query}"`);
  
  if (options && Object.keys(options).length > 0) {
    console.log(`Options: ${JSON.stringify(options)}`);
  }

  const payload = {
    query: query,
    sessionId: `test-comprehensive-${Date.now()}-${index}`,
    options: {
      limit: 10,
      dateRange: 'last_year',
      sortBy: 'relevance',
      ...options
    }
  };

  const startTime = Date.now();
  
  try {
    const response = await axios.post(
      `${N8N_URL}${WEBHOOK_PATH}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        timeout: 30000,
        validateStatus: () => true // Don't throw on any status
      }
    );

    const duration = Date.now() - startTime;
    performanceStats.totalTime += duration;
    performanceStats.totalQueries++;
    
    // Update performance stats
    performanceStats.minTime = Math.min(performanceStats.minTime, duration);
    performanceStats.maxTime = Math.max(performanceStats.maxTime, duration);
    
    // Check response
    if (response.data.status === 'success') {
      performanceStats.successfulQueries++;
      const results = response.data.data || [];
      
      console.log(`✅ Success | Time: ${duration}ms | Results: ${results.length}`);
      
      // Validate expectations
      if (expectations.expectedError) {
        console.log(`⚠️  Expected error but got success`);
      }
      
      // Show top result if any
      if (results.length > 0) {
        const topResult = results[0];
        console.log(`   Top result: "${topResult.title}" (score: ${topResult.score})`);
        
        // Check relevance scoring
        if (topResult.metadata) {
          console.log(`   Engagement: ${topResult.metadata.engagement} | Author: ${topResult.metadata.author}`);
        }
      }
      
      // Performance analysis
      if (response.data.metadata) {
        const meta = response.data.metadata;
        console.log(`   Algolia time: ${meta.algoliaProcessingTime}ms | Total hits: ${meta.totalHits}`);
        
        if (meta.scoring) {
          console.log(`   Scoring: ${meta.scoring.method} | Filtered: ${meta.scoring.filtered}`);
        }
      }
      
    } else {
      performanceStats.failedQueries++;
      const error = response.data.error || 'Unknown error';
      
      if (expectations.expectedError) {
        console.log(`✅ Expected error: ${error}`);
      } else {
        console.log(`❌ Error: ${error} | Status: ${response.status}`);
        performanceStats.errors.push({
          query,
          error,
          status: response.status
        });
      }
    }

  } catch (error) {
    performanceStats.failedQueries++;
    performanceStats.totalQueries++;
    
    console.error(`❌ Request failed: ${error.message}`);
    performanceStats.errors.push({
      query,
      error: error.message,
      type: 'network'
    });
  }
}

// Run all tests
async function runAllTests() {
  console.log('🧪 HackerNews Webhook Comprehensive Test Suite');
  console.log('=============================================');
  console.log(`📍 URL: ${N8N_URL}${WEBHOOK_PATH}`);
  console.log(`🔢 Total test cases: ${testQueries.length}`);
  console.log('');
  
  // Check if n8n is accessible
  try {
    await axios.get(N8N_URL, { timeout: 5000 });
  } catch (error) {
    console.error('❌ Cannot reach n8n. Is it running?');
    console.error('   Run: npm run n8n:local');
    process.exit(1);
  }
  
  const startTime = Date.now();
  
  // Run tests sequentially to avoid rate limiting
  for (let i = 0; i < testQueries.length; i++) {
    await testQuery(testQueries[i], i);
    
    // Small delay between tests
    if (i < testQueries.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  const totalDuration = Date.now() - startTime;
  
  // Calculate final stats
  performanceStats.avgTime = performanceStats.totalTime / performanceStats.totalQueries;
  
  // Print summary
  console.log('\n📊 Test Summary');
  console.log('===============');
  console.log(`Total queries: ${performanceStats.totalQueries}`);
  console.log(`Successful: ${performanceStats.successfulQueries} (${(performanceStats.successfulQueries / performanceStats.totalQueries * 100).toFixed(1)}%)`);
  console.log(`Failed: ${performanceStats.failedQueries} (${(performanceStats.failedQueries / performanceStats.totalQueries * 100).toFixed(1)}%)`);
  console.log('');
  console.log('⏱️  Performance Stats');
  console.log(`Total time: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log(`Average response: ${performanceStats.avgTime.toFixed(0)}ms`);
  console.log(`Fastest response: ${performanceStats.minTime}ms`);
  console.log(`Slowest response: ${performanceStats.maxTime}ms`);
  
  if (performanceStats.errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    performanceStats.errors.forEach((err, i) => {
      console.log(`${i + 1}. Query: "${err.query}" - ${err.error}`);
    });
  }
  
  // Save results to file
  const resultsPath = path.join(__dirname, 'test-results-hn.json');
  fs.writeFileSync(resultsPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    stats: performanceStats,
    queries: testQueries,
    duration: totalDuration
  }, null, 2));
  
  console.log(`\n💾 Results saved to: ${resultsPath}`);
  
  // Exit code based on failures
  if (performanceStats.failedQueries > testQueries.filter(q => q.expectedError).length) {
    process.exit(1);
  }
}

// Run the tests
runAllTests().catch(console.error); 