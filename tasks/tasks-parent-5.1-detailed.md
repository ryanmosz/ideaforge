# Task 5.1 Detailed Implementation: Create n8n webhook endpoints for CLI

## Overview
This task establishes the foundation for all external API integrations by setting up n8n workflows with webhook triggers. These webhooks will serve as the primary communication channel between the IdeaForge CLI/LangGraph agent and external data sources.

## Implementation Details

### 5.1.1 Set up n8n instance (local or cloud)

**Objective**: Get n8n running and accessible for workflow development.

**Local Setup Steps**:
```bash
# Option 1: Docker (Recommended for development)
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  n8nio/n8n

# Option 2: npm global install
npm install -g n8n
n8n start
```

**Cloud Setup Alternative**:
- Sign up at https://n8n.cloud
- Create a new workspace
- Note the instance URL for webhook configuration

**Configuration**:
```typescript
// src/config/n8n-config.ts
export const n8nConfig = {
  baseUrl: process.env.N8N_BASE_URL || 'http://localhost:5678',
  webhookPath: process.env.N8N_WEBHOOK_PATH || 'webhook',
  apiKey: process.env.N8N_API_KEY,
  timeout: 30000 // 30 seconds
};
```

**Verification**:
- Access n8n UI at http://localhost:5678
- Create a test workflow
- Ensure webhook URLs are accessible

### 5.1.2 Create HackerNews search webhook workflow

**Objective**: Build a webhook-triggered workflow for HN searches.

**Workflow Structure**:
```json
{
  "name": "IdeaForge - HackerNews Search",
  "nodes": [
    {
      "parameters": {
        "path": "ideaforge/hackernews-search",
        "responseMode": "responseNode",
        "options": {
          "responseCode": 200,
          "responseHeaders": {
            "Content-Type": "application/json"
          }
        }
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300]
    }
  ]
}
```

**Request Validation Node**:
```javascript
// Function node to validate incoming requests
const requiredFields = ['query', 'sessionId'];
const body = $input.all()[0].json;

for (const field of requiredFields) {
  if (!body[field]) {
    throw new Error(`Missing required field: ${field}`);
  }
}

// Sanitize query
body.query = body.query.trim().substring(0, 200);

return [{
  json: body,
  pairedItem: 0
}];
```

**Export Location**: `n8n-workflows/hackernews-search.json`

### 5.1.3 Create Reddit search webhook workflow

**Objective**: Build a webhook-triggered workflow for Reddit searches.

**Workflow Structure**:
```json
{
  "name": "IdeaForge - Reddit Search",
  "nodes": [
    {
      "parameters": {
        "path": "ideaforge/reddit-search",
        "responseMode": "responseNode",
        "options": {
          "responseHeaders": {
            "Content-Type": "application/json",
            "X-Response-Time": "={{$execution.duration}}ms"
          }
        }
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook"
    }
  ]
}
```

**Subreddit Configuration**:
```javascript
// Set node for default subreddits
const defaultSubreddits = [
  'programming',
  'webdev',
  'javascript',
  'typescript',
  'node',
  'AskProgramming',
  'learnprogramming'
];

const customSubreddits = $json.subreddits || [];
const subreddits = [...new Set([...defaultSubreddits, ...customSubreddits])];

return [{
  json: {
    ...$json,
    subreddits: subreddits.slice(0, 10) // Limit to 10 subreddits
  }
}];
```

**Export Location**: `n8n-workflows/reddit-search.json`

### 5.1.4 Configure webhook authentication

**Objective**: Secure webhook endpoints against unauthorized access.

**Implementation Options**:

**Option 1: Header Authentication**:
```javascript
// In webhook node settings
{
  "authentication": "headerAuth",
  "headerAuth": {
    "name": "X-API-Key",
    "value": "={{$credentials.apiKey}}"
  }
}
```

**Option 2: Custom Validation Function**:
```javascript
// Function node after webhook
const apiKey = $headers['x-api-key'];
const validKeys = $env.VALID_API_KEYS.split(',');

if (!apiKey || !validKeys.includes(apiKey)) {
  throw new Error('Unauthorized: Invalid API key');
}

// Add rate limit check
const clientIp = $headers['x-forwarded-for'] || $headers['x-real-ip'];
const rateLimitKey = `rate_limit:${clientIp}`;

// Continue with request...
```

**Environment Setup**:
```bash
# .env
N8N_WEBHOOK_API_KEY=your-secure-api-key-here
VALID_API_KEYS=key1,key2,key3
```

### 5.1.5 Add CORS headers for local development

**Objective**: Enable cross-origin requests during development.

**CORS Configuration Node**:
```javascript
// Add as Set node before response
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000' 
    : process.env.ALLOWED_ORIGINS,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
  'Access-Control-Max-Age': '86400'
};

// Handle preflight
if ($input.context.httpMethod === 'OPTIONS') {
  return [{
    json: { message: 'OK' },
    headers: corsHeaders,
    statusCode: 200
  }];
}

// Add to normal response
return [{
  json: $json,
  headers: {
    ...$json.headers,
    ...corsHeaders
  }
}];
```

**Development vs Production**:
```typescript
// src/services/n8n-client.ts
private getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-Key': this.config.apiKey
  };
  
  if (process.env.NODE_ENV === 'development') {
    headers['Origin'] = 'http://localhost:3000';
  }
  
  return headers;
}
```

### 5.1.6 Create health check endpoints

**Objective**: Monitor n8n availability and workflow status.

**Health Check Workflow**:
```json
{
  "name": "IdeaForge - Health Check",
  "nodes": [
    {
      "parameters": {
        "path": "ideaforge/health",
        "responseMode": "lastNode",
        "options": {
          "responseCode": 200
        }
      },
      "name": "Health Check Webhook",
      "type": "n8n-nodes-base.webhook"
    },
    {
      "parameters": {
        "values": {
          "object": {
            "status": "healthy",
            "timestamp": "={{Date.now()}}",
            "workflows": {
              "hackernews": "active",
              "reddit": "active"
            },
            "version": "1.0.0"
          }
        }
      },
      "name": "Health Response",
      "type": "n8n-nodes-base.set"
    }
  ]
}
```

**Advanced Health Checks**:
```javascript
// Function node for detailed health status
const checks = {
  n8n: true,
  workflows: {},
  externalApis: {}
};

// Check workflow status
try {
  const workflows = ['hackernews-search', 'reddit-search'];
  for (const workflow of workflows) {
    checks.workflows[workflow] = await checkWorkflowActive(workflow);
  }
} catch (error) {
  checks.workflows.error = error.message;
}

// Check external API connectivity (lightweight)
checks.externalApis.hackerNews = await pingApi('https://hn.algolia.com/api/v1/search?query=test');
checks.externalApis.reddit = await pingApi('https://www.reddit.com/api/v1/me');

return [{
  json: {
    status: Object.values(checks).every(v => v === true) ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString()
  }
}];
```

### 5.1.7 Export and version control workflows

**Objective**: Save workflows for deployment and version control.

**Export Process**:
1. In n8n UI, open each workflow
2. Click menu → Download
3. Save to `n8n-workflows/` directory

**Directory Structure**:
```
n8n-workflows/
├── hackernews-search.json
├── reddit-search.json
├── health-check.json
├── README.md
└── deploy.sh
```

**Version Control Best Practices**:
```bash
# deploy.sh
#!/bin/bash
# Deploy n8n workflows

N8N_URL="${N8N_BASE_URL:-http://localhost:5678}"
API_KEY="${N8N_API_KEY}"

for workflow in *.json; do
  echo "Deploying $workflow..."
  curl -X POST \
    -H "X-N8N-API-KEY: $API_KEY" \
    -H "Content-Type: application/json" \
    -d @"$workflow" \
    "$N8N_URL/api/v1/workflows"
done
```

**Workflow Metadata**:
```json
{
  "name": "IdeaForge - HackerNews Search",
  "meta": {
    "version": "1.0.0",
    "author": "IdeaForge Team",
    "description": "Searches Hacker News for technology discussions",
    "lastModified": "2024-01-01T00:00:00Z"
  }
}
```

### 5.1.8 Document webhook URLs and setup

**Objective**: Create clear documentation for webhook configuration.

**Documentation Template** (`docs/n8n-setup.md`):
```markdown
# n8n Webhook Setup Guide

## Prerequisites
- n8n instance (local or cloud)
- API key for authentication
- Network access between CLI and n8n

## Webhook Endpoints

### Base URL
- Local: `http://localhost:5678/webhook`
- Cloud: `https://your-instance.n8n.cloud/webhook`

### Available Endpoints

#### 1. HackerNews Search
- **URL**: `{BASE_URL}/ideaforge/hackernews-search`
- **Method**: POST
- **Headers**: 
  - `X-API-Key: {YOUR_API_KEY}`
  - `Content-Type: application/json`
- **Body**:
  ```json
  {
    "query": "typescript performance",
    "sessionId": "unique-session-id",
    "options": {
      "limit": 20,
      "dateRange": "last_month"
    }
  }
  ```

#### 2. Reddit Search
- **URL**: `{BASE_URL}/ideaforge/reddit-search`
- **Method**: POST
- **Headers**: Same as above
- **Body**:
  ```json
  {
    "query": "react vs vue",
    "sessionId": "unique-session-id",
    "subreddits": ["reactjs", "vuejs"],
    "options": {
      "sortBy": "relevance",
      "timeframe": "all"
    }
  }
  ```

#### 3. Health Check
- **URL**: `{BASE_URL}/ideaforge/health`
- **Method**: GET
- **Headers**: None required
- **Response**:
  ```json
  {
    "status": "healthy",
    "workflows": {
      "hackernews": "active",
      "reddit": "active"
    },
    "timestamp": "2024-01-01T12:00:00Z"
  }
  ```

## Environment Configuration

Add to your `.env` file:
\```
N8N_BASE_URL=http://localhost:5678
N8N_WEBHOOK_PATH=webhook
N8N_API_KEY=your-secure-api-key-here
N8N_TIMEOUT=30000
\```

## Testing Webhooks

### Using curl:
\```bash
# Test health check
curl http://localhost:5678/webhook/ideaforge/health

# Test HN search
curl -X POST http://localhost:5678/webhook/ideaforge/hackernews-search \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "sessionId": "test-123"}'
\```

### Using the CLI:
\```bash
# Set environment
export N8N_BASE_URL=http://localhost:5678
export N8N_API_KEY=your-api-key

# Run analysis with external research
ideaforge analyze project.org --research
\```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check n8n is running: `docker ps` or `ps aux | grep n8n`
   - Verify port 5678 is not blocked
   - Check firewall settings

2. **401 Unauthorized**
   - Verify API key is correct
   - Check webhook authentication settings
   - Ensure API key is properly configured in n8n

3. **CORS Errors**
   - Verify CORS headers are set in webhook response
   - Check allowed origins match your development URL
   - Use OPTIONS preflight handling

4. **Timeout Errors**
   - Increase N8N_TIMEOUT value
   - Check network latency
   - Verify external APIs are responsive

## Deployment Checklist

- [ ] n8n instance is accessible
- [ ] All workflows imported and active
- [ ] API authentication configured
- [ ] Webhook URLs documented
- [ ] Health check endpoint responding
- [ ] CORS configured for environment
- [ ] Environment variables set
- [ ] Initial test requests successful
```

## Testing Checklist

### Unit Tests
```typescript
// tests/services/n8n-webhook-setup.test.ts
describe('n8n Webhook Setup', () => {
  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await axios.get(`${N8N_BASE_URL}/webhook/ideaforge/health`);
      expect(response.status).toBe(200);
      expect(response.data.status).toBe('healthy');
    });
  });
  
  describe('Authentication', () => {
    it('should reject requests without API key', async () => {
      await expect(
        axios.post(`${N8N_BASE_URL}/webhook/ideaforge/hackernews-search`, {
          query: 'test'
        })
      ).rejects.toThrow('401');
    });
    
    it('should accept requests with valid API key', async () => {
      const response = await axios.post(
        `${N8N_BASE_URL}/webhook/ideaforge/hackernews-search`,
        { query: 'test', sessionId: 'test-123' },
        { headers: { 'X-API-Key': VALID_API_KEY } }
      );
      expect(response.status).toBe(200);
    });
  });
});
```

### Integration Tests
```typescript
// tests/integration/n8n-webhooks.test.ts
describe('n8n Webhook Integration', () => {
  it('should handle concurrent webhook requests', async () => {
    const requests = Array(10).fill(null).map((_, i) => 
      n8nClient.searchHackerNews(`test-${i}`)
    );
    
    const results = await Promise.all(requests);
    expect(results).toHaveLength(10);
    results.forEach(result => {
      expect(result).toHaveProperty('status');
    });
  });
});
```

## Common Issues and Solutions

### Issue: Webhook URLs change between environments
**Solution**: Use environment-specific configuration
```typescript
const getWebhookUrl = (endpoint: string): string => {
  const baseUrl = process.env.N8N_BASE_URL;
  const path = process.env.N8N_WEBHOOK_PATH || 'webhook';
  return `${baseUrl}/${path}/ideaforge/${endpoint}`;
};
```

### Issue: n8n workflows lose state after restart
**Solution**: Use persistent volume for Docker
```bash
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  --restart unless-stopped \
  n8nio/n8n
```

### Issue: API key rotation
**Solution**: Implement key rotation support
```typescript
class N8nClient {
  private apiKeys: string[];
  private currentKeyIndex = 0;
  
  private rotateApiKey(): void {
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
  }
  
  private async requestWithRetry(config: AxiosRequestConfig): Promise<any> {
    try {
      return await axios(config);
    } catch (error) {
      if (error.response?.status === 401) {
        this.rotateApiKey();
        config.headers['X-API-Key'] = this.apiKeys[this.currentKeyIndex];
        return await axios(config);
      }
      throw error;
    }
  }
}
```

## Next Steps

After completing all subtasks in 5.1:
1. Test all webhook endpoints manually
2. Verify authentication is working
3. Confirm health checks are responsive
4. Document any environment-specific configurations
5. Prepare for API integration implementation (5.2, 5.3) 