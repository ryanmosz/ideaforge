#!/usr/bin/env node

/**
 * Test script for Reddit API rate limit compliance
 * Tests rate limiting behavior and header parsing
 */

const https = require('https');

// Configuration
const WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/ideaforge/reddit-search';
const API_KEY = process.env.N8N_API_KEY || 'local-dev-api-key-12345';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Rate limit tracking
const rateLimitTracker = {
  requests: [],
  limits: {
    authenticated: {
      requests: 600,      // 600 requests
      window: 600000,     // per 10 minutes
      perSecond: 1        // max 1 request per second
    }
  }
};

// Test scenarios
const testScenarios = [
  {
    name: "Test 1: Baseline rate limit check",
    description: "Single request to check current rate limit status",
    requests: 1,
    delay: 0,
    action: async () => {
      const response = await makeSearchRequest({
        query: "rate limit baseline test",
        sessionId: "rate-test-001",
        options: { limit: 1 }
      });
      return [response];
    }
  },
  {
    name: "Test 2: Sequential requests (respecting 1/sec limit)",
    description: "Multiple requests with proper spacing",
    requests: 5,
    delay: 1100, // 1.1 seconds between requests
    action: async function() {
      const results = [];
      for (let i = 0; i < this.requests; i++) {
        const response = await makeSearchRequest({
          query: `sequential test ${i}`,
          sessionId: `rate-test-002-${i}`,
          options: { limit: 1 }
        });
        results.push(response);
        
        if (i < this.requests - 1) {
          await sleep(this.delay);
        }
      }
      return results;
    }
  },
  {
    name: "Test 3: Rapid fire requests (testing per-second limit)",
    description: "Multiple requests without delay to test rate limiting",
    requests: 3,
    delay: 0,
    action: async function() {
      const results = [];
      console.log(`${colors.yellow}Note: This test may trigger rate limiting${colors.reset}`);
      
      for (let i = 0; i < this.requests; i++) {
        try {
          const response = await makeSearchRequest({
            query: `rapid test ${i}`,
            sessionId: `rate-test-003-${i}`,
            options: { limit: 1 }
          });
          results.push(response);
        } catch (error) {
          results.push({ error: error.message, index: i });
        }
        
        // Minimal delay to avoid overwhelming
        if (i < this.requests - 1) {
          await sleep(100);
        }
      }
      return results;
    }
  },
  {
    name: "Test 4: Burst requests with recovery",
    description: "Burst of requests, then wait for rate limit recovery",
    requests: 2,
    burstSize: 2,
    action: async function() {
      const results = [];
      
      // First burst
      console.log("First burst...");
      for (let i = 0; i < this.burstSize; i++) {
        const response = await makeSearchRequest({
          query: `burst test 1-${i}`,
          sessionId: `rate-test-004-1-${i}`,
          options: { limit: 1 }
        });
        results.push({ phase: 'burst1', ...response });
        await sleep(100);
      }
      
      // Wait for rate limit to reset
      console.log("Waiting 2 seconds for rate limit recovery...");
      await sleep(2000);
      
      // Second burst
      console.log("Second burst...");
      for (let i = 0; i < this.burstSize; i++) {
        const response = await makeSearchRequest({
          query: `burst test 2-${i}`,
          sessionId: `rate-test-004-2-${i}`,
          options: { limit: 1 }
        });
        results.push({ phase: 'burst2', ...response });
        await sleep(100);
      }
      
      return results;
    }
  },
  {
    name: "Test 5: Rate limit header tracking",
    description: "Track rate limit headers across multiple requests",
    requests: 3,
    delay: 1500,
    action: async function() {
      const results = [];
      for (let i = 0; i < this.requests; i++) {
        const response = await makeSearchRequest({
          query: `header tracking ${i}`,
          sessionId: `rate-test-005-${i}`,
          options: { limit: 1 }
        });
        
        // Extract rate limit info
        if (response.data?.metadata) {
          response.rateLimitInfo = {
            used: response.data.metadata.rateLimitUsed,
            remaining: response.data.metadata.rateLimitRemaining,
            reset: response.data.metadata.rateLimitReset,
            resetDate: response.data.metadata.rateLimitReset 
              ? new Date(response.data.metadata.rateLimitReset * 1000).toISOString()
              : null
          };
        }
        
        results.push(response);
        
        if (i < this.requests - 1) {
          await sleep(this.delay);
        }
      }
      return results;
    }
  }
];

function makeSearchRequest(payload) {
  const startTime = Date.now();
  
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
        const endTime = Date.now();
        try {
          const result = JSON.parse(data);
          resolve({ 
            status: res.statusCode, 
            data: result,
            timestamp: new Date().toISOString(),
            duration: endTime - startTime
          });
        } catch (e) {
          resolve({ 
            status: res.statusCode, 
            data: data,
            timestamp: new Date().toISOString(),
            duration: endTime - startTime,
            error: 'Failed to parse response'
          });
        }
      });
    });

    req.on('error', (error) => {
      reject({ 
        error: error.message, 
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      });
    });
    
    req.write(JSON.stringify(payload));
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function analyzeRateLimits(results) {
  console.log(`\n${colors.cyan}Rate Limit Analysis:${colors.reset}`);
  
  const rateLimitData = results
    .filter(r => r.rateLimitInfo)
    .map(r => ({
      timestamp: r.timestamp,
      used: r.rateLimitInfo.used,
      remaining: r.rateLimitInfo.remaining,
      reset: r.rateLimitInfo.resetDate
    }));
  
  if (rateLimitData.length === 0) {
    console.log("  No rate limit data available");
    return;
  }
  
  // Show progression
  console.log("  Request progression:");
  rateLimitData.forEach((data, i) => {
    console.log(`    ${i + 1}. Used: ${data.used}, Remaining: ${data.remaining}`);
  });
  
  // Check for rate limit compliance
  const minRemaining = Math.min(...rateLimitData.map(d => d.remaining || 600));
  const maxUsed = Math.max(...rateLimitData.map(d => d.used || 0));
  
  console.log(`\n  Summary:`);
  console.log(`    Max requests used: ${maxUsed}`);
  console.log(`    Min requests remaining: ${minRemaining}`);
  console.log(`    Reset time: ${rateLimitData[0]?.reset || 'Unknown'}`);
  
  if (minRemaining < 100) {
    console.log(`  ${colors.yellow}⚠️  Warning: Low rate limit remaining${colors.reset}`);
  }
}

function checkRequestTiming(results) {
  console.log(`\n${colors.cyan}Request Timing Analysis:${colors.reset}`);
  
  const timings = results.map((r, i) => ({
    index: i + 1,
    duration: r.duration || 0,
    timestamp: new Date(r.timestamp).getTime()
  }));
  
  // Calculate time between requests
  for (let i = 1; i < timings.length; i++) {
    const timeBetween = timings[i].timestamp - timings[i-1].timestamp;
    timings[i].timeSinceLast = timeBetween;
    
    if (timeBetween < 1000) {
      timings[i].warning = "Less than 1 second since last request";
    }
  }
  
  // Display timing analysis
  timings.forEach(t => {
    let output = `  Request ${t.index}: ${t.duration}ms`;
    if (t.timeSinceLast) {
      output += ` (${t.timeSinceLast}ms since last)`;
    }
    if (t.warning) {
      output += ` ${colors.yellow}⚠️  ${t.warning}${colors.reset}`;
    }
    console.log(output);
  });
}

async function runTests() {
  console.log(`${colors.bright}${colors.blue}Reddit API Rate Limit Compliance Test Suite${colors.reset}\n`);
  console.log(`Webhook URL: ${WEBHOOK_URL}`);
  console.log(`API Key: ${API_KEY.substring(0, 10)}...`);
  console.log(`${colors.bright}${'='.repeat(60)}${colors.reset}\n`);
  
  console.log(`${colors.cyan}Reddit API Rate Limits:${colors.reset}`);
  console.log(`  - 600 requests per 10 minutes (authenticated)`);
  console.log(`  - Maximum 1 request per second`);
  console.log(`  - Rate limits are per OAuth2 access token\n`);

  const allResults = [];

  for (const scenario of testScenarios) {
    console.log(`${colors.bright}${colors.yellow}${scenario.name}${colors.reset}`);
    console.log(`${scenario.description}`);
    if (scenario.requests) {
      console.log(`Requests to make: ${scenario.requests}`);
    }
    
    try {
      const start = Date.now();
      const results = await scenario.action.call(scenario);
      const totalDuration = Date.now() - start;
      
      // Check success
      const failures = results.filter(r => r.status !== 200 || r.error);
      
      if (failures.length === 0) {
        console.log(`${colors.green}✓ All requests successful (${totalDuration}ms total)${colors.reset}`);
      } else {
        console.log(`${colors.red}✗ ${failures.length}/${results.length} requests failed${colors.reset}`);
        failures.forEach((f, i) => {
          console.log(`  Failed request: ${f.error || `Status ${f.status}`}`);
        });
      }
      
      // Analyze results
      if (results.length > 1) {
        checkRequestTiming(results);
      }
      
      if (scenario.name.includes("header tracking")) {
        analyzeRateLimits(results);
      }
      
      allResults.push({ scenario: scenario.name, results, success: failures.length === 0 });
      
    } catch (error) {
      console.log(`${colors.red}✗ Test error: ${error.message}${colors.reset}`);
      allResults.push({ scenario: scenario.name, success: false, error: error.message });
    }
    
    console.log(`${colors.bright}${'-'.repeat(60)}${colors.reset}\n`);
  }
  
  // Final summary
  console.log(`${colors.bright}${colors.cyan}Test Summary${colors.reset}`);
  const successful = allResults.filter(r => r.success).length;
  const failed = allResults.filter(r => !r.success).length;
  
  console.log(`Total scenarios: ${allResults.length}`);
  console.log(`${colors.green}Successful: ${successful}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  
  // Rate limit recommendations
  console.log(`\n${colors.cyan}Rate Limit Best Practices:${colors.reset}`);
  console.log(`- Always respect the 1 request/second limit`);
  console.log(`- Monitor rate limit headers in responses`);
  console.log(`- Implement exponential backoff for 429 errors`);
  console.log(`- Cache responses when possible to reduce API calls`);
  console.log(`- Use the 'remaining' header to prevent hitting limits`);
}

// Run tests
runTests().catch(console.error); 