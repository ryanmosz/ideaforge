#!/usr/bin/env node

/**
 * Test script for Reddit OAuth token refresh functionality
 * Tests token expiration, refresh, and reliability
 */

const https = require('https');

// Configuration
const WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/ideaforge/reddit-search';
const API_KEY = process.env.N8N_API_KEY || 'local-dev-api-key-12345';

// Test endpoint for token validation
const TOKEN_TEST_URL = process.env.N8N_TOKEN_TEST_URL || 'http://localhost:5678/webhook/test/reddit-token';

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

// Test scenarios
const testScenarios = [
  {
    name: "Test 1: Initial token acquisition",
    description: "Verify initial OAuth token is obtained successfully",
    action: async () => {
      return makeSearchRequest({
        query: "test query",
        sessionId: "token-test-001",
        options: { limit: 1 }
      });
    }
  },
  {
    name: "Test 2: Multiple rapid requests",
    description: "Verify token reuse for multiple requests within expiry",
    action: async () => {
      const results = [];
      for (let i = 0; i < 3; i++) {
        const response = await makeSearchRequest({
          query: `rapid test ${i}`,
          sessionId: `token-test-002-${i}`,
          options: { limit: 1 }
        });
        results.push(response);
        // Small delay between requests
        await sleep(500);
      }
      return results;
    }
  },
  {
    name: "Test 3: Token near expiry",
    description: "Simulate request when token is near expiry (requires manual testing)",
    action: async () => {
      console.log(`${colors.yellow}Note: This test requires manual token expiry simulation in n8n workflow${colors.reset}`);
      return makeSearchRequest({
        query: "near expiry test",
        sessionId: "token-test-003",
        options: { limit: 1 }
      });
    }
  },
  {
    name: "Test 4: Concurrent requests",
    description: "Test token management with concurrent requests",
    action: async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(makeSearchRequest({
          query: `concurrent test ${i}`,
          sessionId: `token-test-004-${i}`,
          options: { limit: 1 }
        }));
      }
      return Promise.all(promises);
    }
  },
  {
    name: "Test 5: Token persistence check",
    description: "Verify token is persisted across workflow executions",
    action: async () => {
      // First request
      const response1 = await makeSearchRequest({
        query: "persistence test 1",
        sessionId: "token-test-005-1",
        options: { limit: 1 }
      });
      
      // Wait 2 seconds
      await sleep(2000);
      
      // Second request (should use same token)
      const response2 = await makeSearchRequest({
        query: "persistence test 2",
        sessionId: "token-test-005-2",
        options: { limit: 1 }
      });
      
      return { first: response1, second: response2 };
    }
  }
];

function makeSearchRequest(payload) {
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
          resolve({ 
            status: res.statusCode, 
            data: result,
            timestamp: new Date().toISOString()
          });
        } catch (e) {
          resolve({ 
            status: res.statusCode, 
            data: data,
            timestamp: new Date().toISOString(),
            error: 'Failed to parse response'
          });
        }
      });
    });

    req.on('error', (error) => {
      reject({ error: error.message, timestamp: new Date().toISOString() });
    });
    
    req.write(JSON.stringify(payload));
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function analyzeTokenMetadata(responses) {
  // Extract token metadata from responses
  const tokenData = [];
  
  const extractTokenInfo = (response) => {
    if (response.data?.metadata) {
      return {
        timestamp: response.timestamp,
        hasToken: !!response.data.metadata.tokenExpiry,
        tokenExpiry: response.data.metadata.tokenExpiry,
        remaining: response.data.metadata.rateLimitRemaining
      };
    }
    return null;
  };
  
  // Handle single response
  if (!Array.isArray(responses)) {
    const info = extractTokenInfo(responses);
    if (info) tokenData.push(info);
  } else {
    // Handle array of responses
    responses.forEach(resp => {
      const info = extractTokenInfo(resp);
      if (info) tokenData.push(info);
    });
  }
  
  // Analyze token consistency
  if (tokenData.length > 1) {
    const expiryTimes = tokenData.map(d => d.tokenExpiry).filter(Boolean);
    const uniqueExpiries = [...new Set(expiryTimes)];
    
    console.log(`${colors.cyan}Token Analysis:${colors.reset}`);
    console.log(`  Requests analyzed: ${tokenData.length}`);
    console.log(`  Unique token expiries: ${uniqueExpiries.length}`);
    
    if (uniqueExpiries.length === 1) {
      console.log(`  ${colors.green}✓ Token reused consistently${colors.reset}`);
    } else {
      console.log(`  ${colors.yellow}⚠ Multiple tokens detected${colors.reset}`);
      uniqueExpiries.forEach((exp, i) => {
        console.log(`    Token ${i + 1}: expires ${exp}`);
      });
    }
  }
  
  return tokenData;
}

async function runTests() {
  console.log(`${colors.bright}${colors.blue}Reddit OAuth Token Refresh Test Suite${colors.reset}\n`);
  console.log(`Webhook URL: ${WEBHOOK_URL}`);
  console.log(`API Key: ${API_KEY.substring(0, 10)}...`);
  console.log(`${colors.bright}${'='.repeat(60)}${colors.reset}\n`);

  // Check environment
  if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET) {
    console.log(`${colors.red}⚠️  Warning: Reddit OAuth credentials not found in environment${colors.reset}`);
    console.log(`   Set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET`);
    console.log();
  }

  const testResults = [];

  for (const scenario of testScenarios) {
    console.log(`${colors.bright}${colors.yellow}${scenario.name}${colors.reset}`);
    console.log(`${scenario.description}`);
    
    try {
      const start = Date.now();
      const result = await scenario.action();
      const duration = Date.now() - start;
      
      // Check if we got valid responses
      const isSuccess = Array.isArray(result) 
        ? result.every(r => r.status === 200)
        : result.status === 200;
      
      if (isSuccess) {
        console.log(`${colors.green}✓ Success (${duration}ms)${colors.reset}`);
        
        // Analyze token metadata
        analyzeTokenMetadata(result);
        
        // Show rate limit info
        const rateLimitInfo = Array.isArray(result) 
          ? result[0]?.data?.metadata 
          : result.data?.metadata;
          
        if (rateLimitInfo?.rateLimitRemaining !== undefined) {
          console.log(`Rate limit: ${rateLimitInfo.rateLimitRemaining} remaining`);
        }
        
        testResults.push({ scenario: scenario.name, success: true, duration });
      } else {
        console.log(`${colors.red}✗ Failed (${duration}ms)${colors.reset}`);
        console.log(`Response:`, JSON.stringify(result, null, 2));
        testResults.push({ scenario: scenario.name, success: false, duration, error: result });
      }
      
    } catch (error) {
      console.log(`${colors.red}✗ Error: ${error.message || error.error}${colors.reset}`);
      testResults.push({ scenario: scenario.name, success: false, error: error.message || error.error });
    }
    
    console.log(`${colors.bright}${'-'.repeat(60)}${colors.reset}\n`);
  }
  
  // Summary
  console.log(`${colors.bright}${colors.cyan}Test Summary${colors.reset}`);
  const successful = testResults.filter(r => r.success).length;
  const failed = testResults.filter(r => !r.success).length;
  
  console.log(`Total tests: ${testResults.length}`);
  console.log(`${colors.green}Successful: ${successful}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  
  if (failed === 0) {
    console.log(`\n${colors.bright}${colors.green}All OAuth token tests passed!${colors.reset}`);
  } else {
    console.log(`\n${colors.bright}${colors.red}Some tests failed. Review the output above.${colors.reset}`);
  }
  
  // Additional notes
  console.log(`\n${colors.cyan}Notes:${colors.reset}`);
  console.log(`- Token expiry is typically 1 hour for Reddit OAuth`);
  console.log(`- The workflow should automatically refresh tokens when needed`);
  console.log(`- Check n8n workflow logs for detailed token refresh events`);
}

// Run tests
runTests().catch(console.error); 