#!/usr/bin/env node

/**
 * Test script for cache warming functionality
 * 
 * This script demonstrates:
 * 1. Setting up cache warming with predefined queries
 * 2. Manually warming specific queries
 * 3. Monitoring warming statistics
 * 4. Testing expiring cache refresh
 */

const { N8nClient } = require('../dist/services/n8n-client');
const { SmartCacheManager } = require('../dist/services/smart-cache-manager');
const { CacheWarmer } = require('../dist/services/cache-warmer');

// Load environment variables
require('dotenv').config();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log();
  log(`========== ${title} ==========`, colors.bright + colors.blue);
}

function formatStats(stats) {
  return `
  Total Warmed: ${stats.totalWarmed}
  Total Refreshed: ${stats.totalRefreshed}
  Failed Warmings: ${stats.failedWarmings}
  Active Queries: ${stats.activeQueries}
  Last Cycle: ${stats.lastWarmingCycle ? new Date(stats.lastWarmingCycle).toLocaleString() : 'Never'}
  `;
}

async function runCacheWarmingDemo() {
  logSection('Cache Warming Demo');
  
  try {
    // Initialize components
    const cacheManager = new SmartCacheManager({
      maxSize: 100 * 1024 * 1024, // 100MB
      popularityThreshold: 2
    });
    
    const n8nClient = new N8nClient();
    
    // Test connection first
    log('Testing n8n connection...', colors.yellow);
    const isConnected = await n8nClient.testConnection();
    if (!isConnected) {
      log('❌ Cannot connect to n8n. Make sure n8n is running.', colors.red);
      process.exit(1);
    }
    log('✅ Connected to n8n', colors.green);
    
    // Initialize cache warmer with configuration
    const cacheWarmer = new CacheWarmer(cacheManager, n8nClient, {
      interval: 60000, // 1 minute for demo (normally would be 5+ minutes)
      refreshThreshold: 0.5, // Refresh when 50% TTL remains (aggressive for demo)
      maxQueriesPerCycle: 5,
      minPopularityScore: 1, // Low threshold for demo
      enabled: true,
      predefinedQueries: [
        { api: 'hackernews', query: 'typescript', priority: 100 },
        { api: 'hackernews', query: 'react', priority: 90 },
        { api: 'reddit', query: 'javascript', priority: 80 },
        { api: 'reddit', query: 'programming', options: { subreddits: ['programming'] }, priority: 70 }
      ]
    });
    
    // Step 1: Manual warming of predefined queries
    logSection('Step 1: Initial Cache Warming');
    log('Warming predefined queries...', colors.yellow);
    
    await cacheWarmer.runWarmingCycle();
    
    let stats = cacheWarmer.getStats();
    log('✅ Initial warming complete', colors.green);
    log(formatStats(stats), colors.cyan);
    
    // Step 2: Show cache contents
    logSection('Step 2: Cache Contents');
    const cacheStats = cacheManager.getStats();
    log(`Cache has ${cacheStats.entries} entries using ${(cacheStats.totalSize / 1024).toFixed(2)}KB`, colors.cyan);
    
    const popularQueries = cacheManager.getPopularQueries(5);
    if (popularQueries.length > 0) {
      log('\nPopular queries:', colors.yellow);
      popularQueries.forEach(pq => {
        log(`  - ${pq.queries.join(', ')} (accessed ${pq.count} times)`, colors.cyan);
      });
    }
    
    // Step 3: Simulate some cache usage to build popularity
    logSection('Step 3: Simulating Cache Usage');
    log('Making queries to build popularity...', colors.yellow);
    
    // Make some queries multiple times to build popularity
    const testQueries = [
      { api: 'hackernews', query: 'vue' },
      { api: 'hackernews', query: 'nodejs' },
      { api: 'reddit', query: 'webdev' }
    ];
    
    for (const tq of testQueries) {
      for (let i = 0; i < 3; i++) {
        if (tq.api === 'hackernews') {
          await n8nClient.searchHackerNews(tq.query, 'demo-session');
        } else {
          await n8nClient.searchReddit(tq.query, 'demo-session');
        }
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
      }
    }
    
    log('✅ Queries completed', colors.green);
    
    // Step 4: Manual warming of specific queries
    logSection('Step 4: Manual Cache Warming');
    log('Manually warming additional queries...', colors.yellow);
    
    await cacheWarmer.warmQueries([
      { api: 'hackernews', query: 'rust' },
      { api: 'hackernews', query: 'golang' },
      { api: 'reddit', query: 'rust', options: { subreddits: ['rust'] } }
    ]);
    
    stats = cacheWarmer.getStats();
    log('✅ Manual warming complete', colors.green);
    log(formatStats(stats), colors.cyan);
    
    // Step 5: Start automatic warming
    logSection('Step 5: Automatic Cache Warming');
    log('Starting automatic cache warming service...', colors.yellow);
    
    cacheWarmer.start();
    log('✅ Cache warming service started (runs every minute)', colors.green);
    
    // Step 6: Monitor for a short period
    logSection('Step 6: Monitoring Cache Warming');
    log('Monitoring cache warming for 15 seconds...', colors.yellow);
    
    const monitorInterval = setInterval(() => {
      const currentStats = cacheWarmer.getStats();
      const cacheInfo = cacheManager.getStats();
      log(`Active: ${currentStats.activeQueries} queries, Hit rate: ${(cacheInfo.hitRate * 100).toFixed(1)}%`, colors.cyan);
    }, 3000);
    
    // Wait 15 seconds
    await new Promise(resolve => setTimeout(resolve, 15000));
    clearInterval(monitorInterval);
    
    // Final statistics
    logSection('Final Statistics');
    const finalStats = cacheWarmer.getStats();
    log(formatStats(finalStats), colors.cyan);
    
    const finalCacheStats = cacheManager.getStats();
    log(`\nCache Performance:`, colors.yellow);
    log(`  Entries: ${finalCacheStats.entries}`, colors.cyan);
    log(`  Size: ${(finalCacheStats.totalSize / 1024).toFixed(2)}KB`, colors.cyan);
    log(`  Hit Rate: ${(finalCacheStats.hitRate * 100).toFixed(1)}%`, colors.cyan);
    
    const effectiveness = cacheManager.getCacheEffectiveness();
    log(`\nCache Effectiveness:`, colors.yellow);
    log(`  Average Hit Rate: ${(effectiveness.averageHitRate * 100).toFixed(1)}%`, colors.cyan);
    log(`  Popularity Benefit: ${(effectiveness.popularityBenefit * 100).toFixed(1)}%`, colors.cyan);
    
    // Stop the warmer
    cacheWarmer.stop();
    log('\n✅ Cache warming service stopped', colors.green);
    
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
  }
}

// Run the demo
runCacheWarmingDemo().catch(console.error); 