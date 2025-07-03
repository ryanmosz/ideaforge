#!/usr/bin/env node

/**
 * Script to add rate limiting nodes to n8n workflows
 * This updates both HackerNews and Reddit workflows with rate limiting functionality
 */

const fs = require('fs');
const path = require('path');

// Rate limiter function node code
const rateLimiterNodeCode = `// Initialize or get rate limiter from workflow static data
const initRateLimiter = () => {
  let rateLimitManager = $getWorkflowStaticData('rateLimitManager');
  
  if (!rateLimitManager) {
    rateLimitManager = {
      limits: {
        hackerNews: {
          requests: [],
          maxRequests: 10000,
          windowMs: 3600000,
          maxPerSecond: 10,
          blocked: false,
          blockedUntil: 0
        },
        reddit: {
          requests: [],
          maxRequests: 600,
          windowMs: 600000,
          maxPerSecond: 1,
          blocked: false,
          blockedUntil: 0
        }
      },
      
      async checkLimit(api) {
        const now = Date.now();
        const limit = this.limits[api];
        
        if (!limit) {
          throw new Error(\`Unknown API: \${api}\`);
        }
        
        // Check if blocked
        if (limit.blocked && now < limit.blockedUntil) {
          return {
            allowed: false,
            waitTime: limit.blockedUntil - now,
            reason: 'API rate limit block in effect'
          };
        } else if (limit.blocked && now >= limit.blockedUntil) {
          // Unblock if time has passed
          limit.blocked = false;
        }
        
        // Clean old requests
        limit.requests = limit.requests.filter(
          timestamp => now - timestamp < limit.windowMs
        );
        
        // Check window limit
        if (limit.requests.length >= limit.maxRequests) {
          const oldestRequest = Math.min(...limit.requests);
          const waitTime = limit.windowMs - (now - oldestRequest);
          
          return {
            allowed: false,
            waitTime: waitTime,
            reason: 'Window limit exceeded'
          };
        }
        
        // Check per-second limit
        const recentRequests = limit.requests.filter(
          timestamp => now - timestamp < 1000
        );
        
        if (recentRequests.length >= limit.maxPerSecond) {
          return {
            allowed: false,
            waitTime: 1000 - (now - recentRequests[0]),
            reason: 'Per-second limit exceeded'
          };
        }
        
        return { allowed: true };
      },
      
      recordRequest(api) {
        const limit = this.limits[api];
        if (limit) {
          limit.requests.push(Date.now());
        }
      },
      
      recordRateLimitError(api, retryAfter = 60000) {
        const limit = this.limits[api];
        if (limit) {
          limit.blocked = true;
          limit.blockedUntil = Date.now() + retryAfter;
        }
      },
      
      async waitIfNeeded(api) {
        let check = await this.checkLimit(api);
        
        while (!check.allowed) {
          console.log(\`Rate limit wait for \${api}: \${check.waitTime}ms - \${check.reason}\`);
          await new Promise(resolve => setTimeout(resolve, check.waitTime));
          check = await this.checkLimit(api);
        }
        
        this.recordRequest(api);
      },
      
      getStats(api) {
        const now = Date.now();
        const limit = this.limits[api];
        
        if (!limit) return null;
        
        // Clean for accurate count
        limit.requests = limit.requests.filter(
          timestamp => now - timestamp < limit.windowMs
        );
        
        return {
          api,
          current: limit.requests.length,
          max: limit.maxRequests,
          windowMs: limit.windowMs,
          blocked: limit.blocked,
          blockedUntil: limit.blockedUntil,
          remaining: limit.maxRequests - limit.requests.length
        };
      }
    };
    
    $setWorkflowStaticData('rateLimitManager', rateLimitManager);
  }
  
  return rateLimitManager;
};

// Determine API based on webhook path
const api = $json.webhookPath?.includes('reddit') ? 'reddit' : 'hackerNews';
const rateLimiter = initRateLimiter();

// Wait if rate limited
await rateLimiter.waitIfNeeded(api);

// Add rate limit stats to output
const stats = rateLimiter.getStats(api);

return [{
  json: {
    ...$json,
    rateLimitChecked: true,
    rateLimitStats: stats,
    api: api,
    timestamp: Date.now()
  }
}];`;

// Rate limit response handler code
const rateLimitResponseHandlerCode = `// Handle rate limit responses from API
const api = $json.api || ($json.webhookPath?.includes('reddit') ? 'reddit' : 'hackerNews');
const response = $input.item.json;
const rateLimiter = $getWorkflowStaticData('rateLimitManager');

// Check if we hit a rate limit error
if (response.error && (response.error.includes('429') || response.error.includes('rate limit'))) {
  let retryAfter = 60000; // Default 1 minute
  
  // Try to extract retry-after from error message
  const retryMatch = response.error.match(/retry after (\\d+)/i);
  if (retryMatch) {
    retryAfter = parseInt(retryMatch[1]) * 1000;
  }
  
  // Record the rate limit error
  if (rateLimiter) {
    rateLimiter.recordRateLimitError(api, retryAfter);
  }
  
  // Return rate limited response
  return [{
    json: {
      success: false,
      cached: false,
      fromAPI: api,
      rateLimited: true,
      retryAfter: retryAfter,
      resetAt: new Date(Date.now() + retryAfter).toISOString(),
      data: {
        results: [],
        totalCount: 0,
        metadata: {
          rateLimited: true,
          retryAfterMs: retryAfter
        }
      }
    }
  }];
}

// If response has rate limit headers, check them
if (response.headers) {
  const remaining = response.headers['x-ratelimit-remaining'];
  const reset = response.headers['x-ratelimit-reset'];
  
  if (remaining !== undefined && parseInt(remaining) < 10) {
    console.warn(\`Low rate limit for \${api}: \${remaining} remaining\`);
  }
}

// Pass through the response
return [{
  json: response
}];`;

// Create rate limiter node
const createRateLimiterNode = (position) => ({
  parameters: {
    functionCode: rateLimiterNodeCode
  },
  name: "Check Rate Limits",
  type: "n8n-nodes-base.function",
  typeVersion: 1,
  position: position
});

// Create rate limit response handler node
const createResponseHandlerNode = (position) => ({
  parameters: {
    functionCode: rateLimitResponseHandlerCode
  },
  name: "Handle Rate Limit Response",
  type: "n8n-nodes-base.function",
  typeVersion: 1,
  position: position
});

// Update HackerNews workflow
console.log('Updating HackerNews workflow...');
const hnWorkflowPath = path.join(__dirname, '..', 'n8n-workflows', 'hackernews-search.json');
const hnWorkflow = JSON.parse(fs.readFileSync(hnWorkflowPath, 'utf8'));

// Find position after validation node
const hnValidationNode = hnWorkflow.nodes.find(n => n.name === 'Validate Request');
if (hnValidationNode) {
  // Insert rate limiter after validation
  const rateLimiterNode = createRateLimiterNode([
    hnValidationNode.position[0] + 200,
    hnValidationNode.position[1]
  ]);
  
  // Add node if it doesn't exist
  if (!hnWorkflow.nodes.find(n => n.name === 'Check Rate Limits')) {
    hnWorkflow.nodes.push(rateLimiterNode);
    
    // Update connections
    const validationConnections = hnWorkflow.connections['Validate Request'];
    if (validationConnections) {
      // Insert rate limiter between validation and next node
      hnWorkflow.connections['Check Rate Limits'] = validationConnections;
      hnWorkflow.connections['Validate Request'] = {
        main: [[{ node: 'Check Rate Limits', type: 'main', index: 0 }]]
      };
    }
  }
  
  // Add response handler after error handling
  const errorHandlerNode = hnWorkflow.nodes.find(n => n.name === 'Handle API Error');
  if (errorHandlerNode) {
    const responseHandlerNode = createResponseHandlerNode([
      errorHandlerNode.position[0],
      errorHandlerNode.position[1] + 150
    ]);
    
    if (!hnWorkflow.nodes.find(n => n.name === 'Handle Rate Limit Response')) {
      hnWorkflow.nodes.push(responseHandlerNode);
      
      // Connect error handler to rate limit handler
      if (hnWorkflow.connections['Handle API Error']) {
        const errorConnections = hnWorkflow.connections['Handle API Error'];
        hnWorkflow.connections['Handle Rate Limit Response'] = errorConnections;
        hnWorkflow.connections['Handle API Error'] = {
          main: [[{ node: 'Handle Rate Limit Response', type: 'main', index: 0 }]]
        };
      }
    }
  }
}

// Save updated HackerNews workflow
fs.writeFileSync(hnWorkflowPath, JSON.stringify(hnWorkflow, null, 2));
console.log('✅ HackerNews workflow updated with rate limiting');

// Update Reddit workflow
console.log('\nUpdating Reddit workflow...');
const redditWorkflowPath = path.join(__dirname, '..', 'n8n-workflows', 'reddit-search.json');
const redditWorkflow = JSON.parse(fs.readFileSync(redditWorkflowPath, 'utf8'));

// Reddit already has a rate limiter node, but we'll update it with our improved version
const existingRateLimiter = redditWorkflow.nodes.find(n => n.name === 'Rate Limiter');
if (existingRateLimiter) {
  // Update the existing rate limiter with our improved code
  existingRateLimiter.parameters.functionCode = rateLimiterNodeCode;
  console.log('✅ Updated existing Reddit rate limiter with improved code');
} else {
  // Find position after validation
  const redditValidationNode = redditWorkflow.nodes.find(n => n.name === 'Validate Request');
  if (redditValidationNode) {
    const rateLimiterNode = createRateLimiterNode([
      redditValidationNode.position[0] + 200,
      redditValidationNode.position[1]
    ]);
    rateLimiterNode.name = 'Rate Limiter'; // Use consistent name with Reddit workflow
    
    redditWorkflow.nodes.push(rateLimiterNode);
    
    // Update connections
    const validationConnections = redditWorkflow.connections['Validate Request'];
    if (validationConnections) {
      redditWorkflow.connections['Rate Limiter'] = validationConnections;
      redditWorkflow.connections['Validate Request'] = {
        main: [[{ node: 'Rate Limiter', type: 'main', index: 0 }]]
      };
    }
  }
}

// Add response handler if needed
if (!redditWorkflow.nodes.find(n => n.name === 'Handle Rate Limit Response')) {
  const errorHandlerNode = redditWorkflow.nodes.find(n => n.name === 'Handle Error');
  if (errorHandlerNode) {
    const responseHandlerNode = createResponseHandlerNode([
      errorHandlerNode.position[0],
      errorHandlerNode.position[1] + 150
    ]);
    
    redditWorkflow.nodes.push(responseHandlerNode);
    
    // Connect to error handler output
    if (redditWorkflow.connections['Handle Error']) {
      const errorConnections = redditWorkflow.connections['Handle Error'];
      redditWorkflow.connections['Handle Rate Limit Response'] = errorConnections;
      redditWorkflow.connections['Handle Error'] = {
        main: [[{ node: 'Handle Rate Limit Response', type: 'main', index: 0 }]]
      };
    }
  }
}

// Save updated Reddit workflow
fs.writeFileSync(redditWorkflowPath, JSON.stringify(redditWorkflow, null, 2));
console.log('✅ Reddit workflow updated with rate limiting');

console.log('\n✅ Both workflows have been updated with rate limiting functionality');
console.log('\nNext steps:');
console.log('1. Import the updated workflows in n8n');
console.log('2. Test rate limiting with: npm run test:rate-limits');
console.log('3. Monitor rate limit stats in workflow executions'); 