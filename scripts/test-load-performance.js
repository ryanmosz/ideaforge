#!/usr/bin/env node

/**
 * Load performance testing script
 * 
 * This script simulates real-world load on the cache and rate limiting systems
 */

const { N8nClient } = require('../dist/services/n8n-client');
const { SmartCacheManager } = require('../dist/services/smart-cache-manager');
const { APIRateLimitManager } = require('../dist/utils/rate-limiter');
const { MetricsCollector } = require('../dist/utils/metrics-collector');
const chalk = require('chalk');
const ora = require('ora');

// Test configuration
const TEST_DURATION = 30000; // 30 seconds
const CONCURRENT_USERS = 10;
const POPULAR_QUERIES = [
  'javascript', 'typescript', 'react', 'nodejs', 'python',
  'docker', 'kubernetes', 'microservices', 'api design', 'testing'
];

class LoadTester {
  constructor() {
    this.client = new N8nClient();
    this.cacheManager = new SmartCacheManager({ maxSize: 50 * 1024 * 1024 });
    this.rateLimiter = new APIRateLimitManager();
    this.metrics = new MetricsCollector();
    
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      rateLimited: 0,
      errors: []
    };
  }
  
  async runLoadTest() {
    console.log(chalk.blue('\n🚀 Starting Load Performance Test\n'));
    console.log(chalk.gray(`Duration: ${TEST_DURATION / 1000}s`));
    console.log(chalk.gray(`Concurrent Users: ${CONCURRENT_USERS}`));
    console.log(chalk.gray(`Popular Queries: ${POPULAR_QUERIES.length}\n`));
    
    const startTime = Date.now();
    const endTime = startTime + TEST_DURATION;
    
    // Reset metrics
    this.client.resetMetrics();
    
    // Start progress spinner
    const spinner = ora('Running load test...').start();
    
    // Create user simulation tasks
    const userTasks = [];
    for (let i = 0; i < CONCURRENT_USERS; i++) {
      userTasks.push(this.simulateUser(i, endTime));
    }
    
    // Update progress
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = (elapsed / TEST_DURATION * 100).toFixed(1);
      const rps = (this.stats.totalRequests / (elapsed / 1000)).toFixed(2);
      spinner.text = `Running load test... ${progress}% (${rps} req/s)`;
    }, 1000);
    
    // Wait for all users to complete
    await Promise.all(userTasks);
    
    clearInterval(progressInterval);
    spinner.succeed('Load test completed');
    
    // Display results
    this.displayResults(Date.now() - startTime);
  }
  
  async simulateUser(userId, endTime) {
    const sessionId = `load-test-user-${userId}`;
    
    while (Date.now() < endTime) {
      // Random delay between requests (50-500ms)
      await this.sleep(50 + Math.random() * 450);
      
      // Choose operation type
      const operation = Math.random();
      
      if (operation < 0.7) {
        // 70% - Search popular queries
        await this.performSearch(sessionId, true);
      } else if (operation < 0.9) {
        // 20% - Search new queries
        await this.performSearch(sessionId, false);
      } else {
        // 10% - Check metrics
        await this.checkMetrics();
      }
    }
  }
  
  async performSearch(sessionId, usePopular) {
    this.stats.totalRequests++;
    
    const query = usePopular 
      ? POPULAR_QUERIES[Math.floor(Math.random() * POPULAR_QUERIES.length)]
      : `unique-query-${Date.now()}-${Math.random()}`;
    
    const api = Math.random() > 0.5 ? 'hackernews' : 'reddit';
    
    try {
      const startTime = Date.now();
      
      let result;
      if (api === 'hackernews') {
        result = await this.client.searchHackerNews(query, sessionId);
      } else {
        result = await this.client.searchReddit(query, sessionId);
      }
      
      const latency = Date.now() - startTime;
      
      if (result.success) {
        this.stats.successfulRequests++;
        
        if (result.metadata?.cached) {
          this.stats.cacheHits++;
        } else {
          this.stats.cacheMisses++;
        }
      } else if (result.error?.code === 'RATE_LIMIT_EXCEEDED') {
        this.stats.rateLimited++;
      } else {
        this.stats.failedRequests++;
        this.stats.errors.push(result.error?.message || 'Unknown error');
      }
      
    } catch (error) {
      this.stats.failedRequests++;
      this.stats.errors.push(error.message);
    }
  }
  
  async checkMetrics() {
    try {
      const cacheStats = this.client.getCacheStats();
      const rateLimitStats = this.client.getRateLimitStats();
      
      // Just reading metrics, no action needed
    } catch (error) {
      // Ignore metrics errors
    }
  }
  
  displayResults(duration) {
    console.log(chalk.blue('\n📊 Load Test Results\n'));
    
    const durationSec = duration / 1000;
    const rps = this.stats.totalRequests / durationSec;
    const successRate = this.stats.successfulRequests / this.stats.totalRequests * 100;
    const cacheHitRate = this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) * 100;
    const rateLimitRate = this.stats.rateLimited / this.stats.totalRequests * 100;
    
    console.log(chalk.green('Performance Metrics:'));
    console.log(`  Total Requests: ${this.stats.totalRequests}`);
    console.log(`  Requests/Second: ${rps.toFixed(2)}`);
    console.log(`  Success Rate: ${successRate.toFixed(2)}%`);
    console.log(`  Failed Requests: ${this.stats.failedRequests}`);
    
    console.log(chalk.green('\nCache Performance:'));
    console.log(`  Cache Hits: ${this.stats.cacheHits}`);
    console.log(`  Cache Misses: ${this.stats.cacheMisses}`);
    console.log(`  Hit Rate: ${cacheHitRate.toFixed(2)}%`);
    
    console.log(chalk.green('\nRate Limiting:'));
    console.log(`  Rate Limited: ${this.stats.rateLimited}`);
    console.log(`  Rate Limit %: ${rateLimitRate.toFixed(2)}%`);
    
    // Get detailed metrics from the client
    const metricsReport = this.client.getMetricsSummary(duration);
    
    console.log(chalk.green('\nSystem Metrics:'));
    console.log(`  Cache Size: ${(metricsReport.cache.totalHits + metricsReport.cache.totalMisses > 0 
      ? (metricsReport.cache.hitRate * 100).toFixed(2) 
      : 0)}% hit rate`);
    console.log(`  API Latency Avg: ${metricsReport.api.avgLatency.toFixed(0)}ms`);
    console.log(`  API Latency P95: ${metricsReport.api.p95Latency.toFixed(0)}ms`);
    
    // Memory usage
    const memUsage = process.memoryUsage();
    console.log(chalk.green('\nResource Usage:'));
    console.log(`  Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`);
    
    // Performance assessment
    console.log(chalk.blue('\n📈 Performance Assessment:\n'));
    
    if (rps > 50 && successRate > 95 && cacheHitRate > 40) {
      console.log(chalk.green('✅ Excellent Performance!'));
      console.log('   The system is handling load very well.');
    } else if (rps > 20 && successRate > 90 && cacheHitRate > 30) {
      console.log(chalk.yellow('⚠️  Good Performance'));
      console.log('   The system is performing adequately but could be optimized.');
    } else {
      console.log(chalk.red('❌ Performance Issues Detected'));
      console.log('   The system may need optimization for production load.');
    }
    
    // Recommendations
    console.log(chalk.blue('\n💡 Recommendations:\n'));
    
    if (cacheHitRate < 50) {
      console.log('- Consider increasing cache TTL for popular queries');
      console.log('- Implement cache warming for frequently accessed data');
    }
    
    if (rateLimitRate > 10) {
      console.log('- Rate limiting is frequently triggered');
      console.log('- Consider implementing request queuing or backoff strategies');
    }
    
    if (memUsage.heapUsed > 200 * 1024 * 1024) {
      console.log('- Memory usage is high');
      console.log('- Monitor for memory leaks and optimize cache size');
    }
    
    // Save detailed report
    const detailedReport = this.client.getMetricsReport(duration);
    const fs = require('fs');
    const reportFile = `load-test-report-${new Date().toISOString().replace(/:/g, '-')}.txt`;
    fs.writeFileSync(reportFile, detailedReport);
    console.log(chalk.gray(`\nDetailed report saved to: ${reportFile}`));
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('\n❌ Unhandled error:'), error);
  process.exit(1);
});

// Check if n8n is running
async function checkN8nConnection() {
  const client = new N8nClient();
  const isConnected = await client.testConnection();
  
  if (!isConnected) {
    console.error(chalk.red('\n❌ Cannot connect to n8n. Please ensure n8n is running.'));
    console.log(chalk.yellow('\nTry running: npm run n8n:local'));
    process.exit(1);
  }
}

// Run the load test
async function main() {
  // Check n8n connection first
  await checkN8nConnection();
  
  // Run load test
  const tester = new LoadTester();
  await tester.runLoadTest();
}

main(); 