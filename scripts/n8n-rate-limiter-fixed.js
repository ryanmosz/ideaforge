// Fixed rate limiter for n8n Function node
// This version doesn't use $getWorkflowStaticData which isn't available in Function nodes

// Initialize rate limiter with simple in-memory storage
const rateLimitData = {
  requests: [],
  windowSize: 60 * 1000, // 1 minute window
  maxRequests: 10 // 10 requests per minute
};

// Clean old requests
const now = Date.now();
rateLimitData.requests = rateLimitData.requests.filter(
  timestamp => now - timestamp < rateLimitData.windowSize
);

// Check if rate limit exceeded
if (rateLimitData.requests.length >= rateLimitData.maxRequests) {
  throw new Error('Rate limit exceeded. Please try again later.');
}

// Add current request
rateLimitData.requests.push(now);

// Continue with the workflow
return items; 