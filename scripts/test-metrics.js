#!/usr/bin/env node

/**
 * Test script for metrics collection
 * 
 * This script demonstrates the metrics functionality by:
 * 1. Making several API calls with cache hits/misses
 * 2. Triggering rate limits
 * 3. Generating a metrics report
 */

const { N8nClient } = require('../dist/services/n8n-client');
const chalk = require('chalk');

const SESSION_ID = `metrics-test-${Date.now()}`;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testMetrics() {
  console.log(chalk.blue('\n🔍 Testing Metrics Collection\n'));
  
  const client = new N8nClient();
  
  // Reset metrics for clean test
  client.resetMetrics();
  
  try {
    // Test 1: Generate some cache misses and hits
    console.log(chalk.yellow('1. Testing cache behavior...'));
    
    // First search - cache miss
    await client.searchHackerNews('typescript', SESSION_ID);
    console.log('  ✓ First search completed (cache miss)');
    
    // Second search - cache hit
    await client.searchHackerNews('typescript', SESSION_ID);
    console.log('  ✓ Second search completed (cache hit)');
    
    // Different query - cache miss
    await client.searchHackerNews('react hooks', SESSION_ID);
    console.log('  ✓ Third search completed (cache miss)');
    
    // Reddit searches
    await client.searchReddit('nodejs', SESSION_ID);
    console.log('  ✓ Reddit search 1 completed (cache miss)');
    
    await client.searchReddit('nodejs', SESSION_ID);
    console.log('  ✓ Reddit search 2 completed (cache hit)');
    
    await sleep(1000);
    
    // Test 2: Generate some rate limit scenarios
    console.log(chalk.yellow('\n2. Testing rate limiting...'));
    
    // Make rapid requests to trigger rate limits
    const rapidRequests = [];
    for (let i = 0; i < 15; i++) {
      rapidRequests.push(
        client.searchHackerNews(`query-${i}`, SESSION_ID)
          .then(result => {
            if (result.error?.code === 'RATE_LIMIT_EXCEEDED') {
              console.log(`  ⚠️  Request ${i + 1} was rate limited`);
            } else {
              console.log(`  ✓ Request ${i + 1} succeeded`);
            }
          })
      );
    }
    
    await Promise.all(rapidRequests);
    
    await sleep(1000);
    
    // Test 3: Generate API errors
    console.log(chalk.yellow('\n3. Testing error scenarios...'));
    
    // Force an error by using invalid config
    const errorClient = new N8nClient({ 
      baseUrl: 'http://invalid-host:9999',
      timeout: 1000
    });
    
    try {
      await errorClient.searchHackerNews('test error', SESSION_ID);
    } catch (error) {
      console.log('  ✓ Error handled correctly');
    }
    
    // Get cache stats to trigger size metrics
    console.log(chalk.yellow('\n4. Recording cache size metrics...'));
    const cacheStats = client.getCacheStats();
    console.log(`  ✓ Cache entries: ${cacheStats.entries}`);
    console.log(`  ✓ Cache size: ${(cacheStats.totalSize / 1024).toFixed(2)} KB`);
    console.log(`  ✓ Hit rate: ${(cacheStats.hitRate * 100).toFixed(2)}%`);
    
    // Generate metrics report
    console.log(chalk.blue('\n📊 Metrics Report (1 hour window)\n'));
    
    const report = client.getMetricsReport();
    console.log(report);
    
    // Also show JSON format
    console.log(chalk.blue('\n📊 Metrics JSON\n'));
    const jsonMetrics = client.getMetricsJSON();
    console.log(JSON.stringify(jsonMetrics, null, 2));
    
    // Show summary
    console.log(chalk.blue('\n📊 Metrics Summary\n'));
    const summary = client.getMetricsSummary();
    
    console.log(chalk.green('Cache Metrics:'));
    console.log(`  Hit Rate: ${(summary.cache.hitRate * 100).toFixed(2)}%`);
    console.log(`  Total Hits: ${summary.cache.totalHits}`);
    console.log(`  Total Misses: ${summary.cache.totalMisses}`);
    console.log(`  Avg Latency: ${summary.cache.avgLatency.toFixed(2)}ms`);
    
    console.log(chalk.green('\nRate Limit Metrics:'));
    console.log(`  Total Allowed: ${summary.rateLimit.totalAllowed}`);
    console.log(`  Total Limited: ${summary.rateLimit.totalLimited}`);
    console.log(`  Limit Rate: ${(summary.rateLimit.limitRate * 100).toFixed(2)}%`);
    
    Object.entries(summary.rateLimit.byApi).forEach(([api, stats]) => {
      console.log(`  ${api}:`);
      console.log(`    Allowed: ${stats.allowed}`);
      console.log(`    Limited: ${stats.limited}`);
      console.log(`    Rate: ${(stats.rate * 100).toFixed(2)}%`);
    });
    
    console.log(chalk.green('\nAPI Performance:'));
    console.log(`  Total Requests: ${summary.api.totalRequests}`);
    console.log(`  Error Rate: ${(summary.api.errorRate * 100).toFixed(2)}%`);
    console.log(`  Avg Latency: ${summary.api.avgLatency.toFixed(0)}ms`);
    console.log(`  P95 Latency: ${summary.api.p95Latency.toFixed(0)}ms`);
    
    console.log(chalk.green('\n✅ Metrics test completed!\n'));
    
  } catch (error) {
    console.error(chalk.red('\n❌ Error during test:'), error);
  }
}

// Run the test
testMetrics(); 