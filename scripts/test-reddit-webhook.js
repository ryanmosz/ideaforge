#!/usr/bin/env node

/**
 * Test script for Reddit webhook API
 * Tests the n8n Reddit search workflow with various queries
 */

const axios = require('axios');
const chalk = require('chalk');

// Configuration
const WEBHOOK_URL = process.env.N8N_REDDIT_WEBHOOK_URL || 'http://localhost:5678/webhook/ideaforge/reddit-search';
const API_KEY = process.env.N8N_API_KEY || 'local-dev-api-key-12345';

// Test data
const testQueries = [
  {
    name: 'Basic search',
    data: {
      query: 'typescript best practices',
      sessionId: `test-${Date.now()}`
    }
  },
  {
    name: 'With specific subreddits',
    data: {
      query: 'react vs vue',
      subreddits: ['reactjs', 'vuejs', 'javascript'],
      sessionId: `test-${Date.now()}-subs`
    }
  },
  {
    name: 'With search options',
    data: {
      query: 'node.js performance optimization',
      options: {
        sortBy: 'top',
        timeframe: 'month',
        limit: 10
      },
      sessionId: `test-${Date.now()}-opts`
    }
  },
  {
    name: 'With content filters',
    data: {
      query: 'machine learning beginner resources',
      options: {
        sortBy: 'relevance',
        limit: 15,
        filters: {
          removeNSFW: true,
          minScore: 10,
          minComments: 5,
          maxAge: 365
        }
      },
      sessionId: `test-${Date.now()}-filters`
    }
  },
  {
    name: 'Learning resources query',
    data: {
      query: 'learn golang from scratch',
      sessionId: `test-${Date.now()}-learn`
    }
  },
  {
    name: 'Career-related query',
    data: {
      query: 'junior developer interview tips',
      sessionId: `test-${Date.now()}-career`
    }
  }
];

// Helper functions
function formatResult(result) {
  return `
${chalk.cyan('Title:')} ${result.title}
${chalk.cyan('Subreddit:')} r/${result.subreddit}
${chalk.cyan('URL:')} ${result.url}
${chalk.cyan('Relevance:')} ${result.relevance}%
${chalk.cyan('Summary:')} ${result.summary}
`;
}

async function testRedditWebhook(testCase) {
  console.log(chalk.yellow(`\n=== ${testCase.name} ===`));
  console.log(chalk.gray('Request:'), JSON.stringify(testCase.data, null, 2));
  
  const startTime = Date.now();
  
  try {
    const response = await axios.post(WEBHOOK_URL, testCase.data, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      timeout: 30000
    });
    
    const duration = Date.now() - startTime;
    
    if (response.data.status === 'success') {
      console.log(chalk.green(`✓ Success (${duration}ms)`));
      
      const { data, metadata } = response.data;
      
      console.log(chalk.blue('\nMetadata:'));
      console.log(`- Subreddits searched: ${data.metadata.subreddits.join(', ')}`);
      console.log(`- Total results: ${data.metadata.totalResults}`);
      console.log(`- Filtered out: ${data.metadata.filtered}`);
      console.log(`- Search time: ${data.metadata.searchTime}ms`);
      
      if (metadata.rateLimitRemaining !== undefined) {
        console.log(chalk.yellow('\nRate Limit Info:'));
        console.log(`- Remaining: ${metadata.rateLimitRemaining}`);
        console.log(`- Used: ${metadata.rateLimitUsed}`);
        console.log(`- Resets: ${new Date(metadata.rateLimitReset * 1000).toLocaleTimeString()}`);
      }
      
      console.log(chalk.blue(`\nTop ${Math.min(3, data.posts.length)} Results:`));
      data.posts.slice(0, 3).forEach((result, index) => {
        console.log(chalk.gray(`\n--- Result ${index + 1} ---`));
        console.log(formatResult(result));
      });
      
    } else {
      console.log(chalk.red(`✗ Error: ${response.data.error}`));
      console.log(chalk.red(`Code: ${response.data.code}`));
    }
    
  } catch (error) {
    console.log(chalk.red(`✗ Request failed (${Date.now() - startTime}ms)`));
    
    if (error.response) {
      console.log(chalk.red(`Status: ${error.response.status}`));
      console.log(chalk.red(`Error: ${JSON.stringify(error.response.data, null, 2)}`));
    } else if (error.code === 'ECONNREFUSED') {
      console.log(chalk.red('Connection refused. Is n8n running?'));
      console.log(chalk.gray(`Tried to connect to: ${WEBHOOK_URL}`));
    } else {
      console.log(chalk.red(`Error: ${error.message}`));
    }
  }
}

async function runTests() {
  console.log(chalk.blue.bold('Reddit Webhook Test Suite'));
  console.log(chalk.gray(`Webhook URL: ${WEBHOOK_URL}`));
  console.log(chalk.gray(`API Key: ${API_KEY.substring(0, 10)}...`));
  
  // Check if custom query provided
  const customQuery = process.argv[2];
  if (customQuery) {
    await testRedditWebhook({
      name: 'Custom Query',
      data: {
        query: customQuery,
        sessionId: `custom-${Date.now()}`
      }
    });
    return;
  }
  
  // Run all test cases
  for (const testCase of testQueries) {
    await testRedditWebhook(testCase);
    
    // Small delay between tests to avoid rate limiting
    if (testCase !== testQueries[testQueries.length - 1]) {
      console.log(chalk.gray('\nWaiting 2 seconds before next test...'));
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(chalk.green.bold('\n✓ All tests completed'));
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('Unhandled error:'), error);
  process.exit(1);
});

// Run tests
runTests().catch(error => {
  console.error(chalk.red('Test suite failed:'), error);
  process.exit(1);
}); 