# n8n Workflows for IdeaForge

This directory contains the n8n workflows that provide webhook endpoints for the IdeaForge CLI tool.

## Workflows

### 1. hackernews-search.json
- **Webhook Path**: `/webhook/ideaforge/hackernews-search`
- **Method**: POST
- **Authentication**: Required (X-API-Key header)
- **Purpose**: Receives search queries for Hacker News content

### 2. reddit-search.json
- **Webhook Path**: `/webhook/ideaforge/reddit-search`
- **Method**: POST
- **Authentication**: Required (X-API-Key header)
- **Purpose**: Receives search queries for Reddit content with optional subreddit filtering

### 3. health-check.json
- **Webhook Path**: `/webhook/ideaforge/health`
- **Method**: GET
- **Authentication**: None
- **Purpose**: Health check endpoint for monitoring

## Importing Workflows

### Option 1: Via n8n UI
1. Open your n8n instance
2. Go to Workflows → Add Workflow → Import from File
3. Select each JSON file to import
4. Activate each workflow after import

### Option 2: Via n8n CLI
```bash
# If you have n8n CLI installed
n8n import:workflow --input=./hackernews-search.json
n8n import:workflow --input=./reddit-search.json
n8n import:workflow --input=./health-check.json
```

## Configuration

### API Key
All authenticated endpoints expect the API key in the `X-API-Key` header.
Default development key: `local-dev-api-key-12345`

To change the API key:
1. Open each workflow
2. Edit the Code node
3. Update the `validApiKey` variable
4. Save and reactivate the workflow

### Webhook URLs

**Local Development**:
- Base URL: `http://localhost:5678`
- Example: `http://localhost:5678/webhook/ideaforge/hackernews-search`

**Production (Elestio or other hosting)**:
- Base URL: `https://your-n8n-instance.com`
- Example: `https://your-n8n-instance.com/webhook/ideaforge/hackernews-search`

## Testing Webhooks

### Health Check
```bash
curl http://localhost:5678/webhook/ideaforge/health
```

### HackerNews Search
```bash
curl -X POST http://localhost:5678/webhook/ideaforge/hackernews-search \
  -H "Content-Type: application/json" \
  -H "X-API-Key: local-dev-api-key-12345" \
  -d '{
    "query": "typescript performance",
    "sessionId": "test-123"
  }'
```

### Reddit Search
```bash
curl -X POST http://localhost:5678/webhook/ideaforge/reddit-search \
  -H "Content-Type: application/json" \
  -H "X-API-Key: local-dev-api-key-12345" \
  -d '{
    "query": "react best practices",
    "sessionId": "test-456",
    "subreddits": ["reactjs", "webdev"]
  }'
```

## CORS Support

All webhooks include CORS headers for browser-based access:
- `Access-Control-Allow-Origin: *` (configure for specific domains in production)
- `Access-Control-Allow-Methods: POST, OPTIONS` (or GET for health check)
- `Access-Control-Allow-Headers: Content-Type, X-API-Key`

## Deployment Notes

1. **Environment Variables**: Update the API key to use environment variables in production
2. **CORS Origins**: Restrict `Access-Control-Allow-Origin` to specific domains
3. **Rate Limiting**: Consider adding rate limiting in n8n or at the proxy level
4. **Monitoring**: Use the health check endpoint for uptime monitoring
5. **Backup**: Keep these JSON files in version control

## Workflow Features

Each workflow includes:
- Request validation
- Error handling
- CORS support
- OPTIONS preflight handling
- Response formatting
- Authentication (except health check) 