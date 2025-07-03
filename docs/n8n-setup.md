# n8n Setup Guide for IdeaForge

This guide covers the complete setup process for n8n webhooks that IdeaForge uses for external API integrations.

## Overview

IdeaForge uses n8n as a middleware layer to handle:
- External API calls (Hacker News, Reddit)
- Rate limiting and retry logic
- Response caching
- Webhook authentication

## Prerequisites

- Node.js 16+ (for IdeaForge CLI)
- Docker (recommended for n8n) or npm
- API keys configured in `.env`

## Quick Start

### 1. Start n8n Locally

Using Docker (recommended):
```bash
docker run -d --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  n8nio/n8n
```

Or use the helper script:
```bash
./scripts/n8n-local.sh start
```

### 2. Access n8n Interface

1. Open http://localhost:5678
2. Create your n8n account (local only)
3. You'll see the workflow canvas

### 3. Import Workflows

1. Download workflow files from `n8n-workflows/` directory
2. In n8n: Workflows → Import from File
3. Import each workflow:
   - `hackernews-search.json`
   - `reddit-search.json`
   - `health-check.json`
4. Activate each workflow after import

### 4. Configure Environment

Add to your `.env` file:
```bash
# n8n Configuration
N8N_BASE_URL=http://localhost:5678
N8N_WEBHOOK_PATH=webhook
N8N_API_KEY=local-dev-api-key-12345
N8N_TIMEOUT=30000
N8N_RETRIES=3

# Legacy webhook URL (for compatibility)
N8N_WEBHOOK_URL=http://localhost:5678/webhook/ideaforge
```

## Available Webhooks

### 1. HackerNews Search
- **URL**: `{N8N_BASE_URL}/webhook/ideaforge/hackernews-search`
- **Method**: POST
- **Headers**: 
  - `Content-Type: application/json`
  - `X-API-Key: {N8N_API_KEY}`
- **Body**:
  ```json
  {
    "query": "search terms",
    "sessionId": "unique-session-id"
  }
  ```
- **Response**:
  ```json
  {
    "query": "search terms",
    "sessionId": "unique-session-id",
    "processedAt": "2025-01-01T12:00:00.000Z",
    "authenticated": true
  }
  ```

### 2. Reddit Search
- **URL**: `{N8N_BASE_URL}/webhook/ideaforge/reddit-search`
- **Method**: POST
- **Headers**: Same as HackerNews
- **Body**:
  ```json
  {
    "query": "search terms",
    "sessionId": "unique-session-id",
    "subreddits": ["optional", "array", "of", "subreddits"]
  }
  ```
- **Response**:
  ```json
  {
    "query": "search terms",
    "sessionId": "unique-session-id",
    "subreddits": ["programming", "webdev", ...],
    "processedAt": "2025-01-01T12:00:00.000Z",
    "webhookType": "reddit-search",
    "authenticated": true
  }
  ```

### 3. Health Check
- **URL**: `{N8N_BASE_URL}/webhook/ideaforge/health`
- **Method**: GET
- **Headers**: None required
- **Response**:
  ```json
  {
    "status": "healthy",
    "service": "ideaforge-n8n",
    "timestamp": "2025-01-01T12:00:00.000Z",
    "webhooks": {
      "hackernews": { ... },
      "reddit": { ... },
      "health": { ... }
    },
    "message": "All webhooks operational",
    "version": "1.0.0"
  }
  ```

## Testing Webhooks

### Test Health Check
```bash
curl http://localhost:5678/webhook/ideaforge/health
```

### Test HackerNews Search
```bash
curl -X POST http://localhost:5678/webhook/ideaforge/hackernews-search \
  -H "Content-Type: application/json" \
  -H "X-API-Key: local-dev-api-key-12345" \
  -d '{
    "query": "typescript performance",
    "sessionId": "test-123"
  }'
```

### Test Reddit Search
```bash
curl -X POST http://localhost:5678/webhook/ideaforge/reddit-search \
  -H "Content-Type: application/json" \
  -H "X-API-Key: local-dev-api-key-12345" \
  -d '{
    "query": "react hooks",
    "sessionId": "test-456",
    "subreddits": ["reactjs"]
  }'
```

## Production Deployment

### Using Elestio

1. **Update Environment Variables**:
   ```bash
   # Production configuration
   N8N_BASE_URL=https://your-n8n.elest.io
   N8N_API_KEY=your-production-api-key
   ```

2. **Import Workflows**:
   - Access your Elestio n8n instance
   - Import the same workflow JSON files
   - Update API keys in Code nodes

3. **Security Considerations**:
   - Change the default API key
   - Restrict CORS origins
   - Enable HTTPS
   - Add rate limiting

### Using Custom Server

1. **Docker Compose** (`docker-compose.yml`):
   ```yaml
   version: '3'
   services:
     n8n:
       image: n8nio/n8n
       ports:
         - "5678:5678"
       environment:
         - N8N_BASIC_AUTH_ACTIVE=true
         - N8N_BASIC_AUTH_USER=admin
         - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
       volumes:
         - n8n_data:/home/node/.n8n
   volumes:
     n8n_data:
   ```

2. **Nginx Reverse Proxy**:
   ```nginx
   server {
       listen 443 ssl;
       server_name n8n.yourdomain.com;
       
       location / {
           proxy_pass http://localhost:5678;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
       }
   }
   ```

## Troubleshooting

### Common Issues

1. **"Webhook not registered" Error**
   - Ensure workflow is activated
   - Check webhook path matches exactly
   - Verify n8n is running

2. **Authentication Failures**
   - Check X-API-Key header is present
   - Verify API key matches configuration
   - Ensure header name is lowercase: `x-api-key`

3. **CORS Errors**
   - Verify origin is allowed in workflow
   - Check OPTIONS preflight is handled
   - Ensure Respond node has CORS headers

4. **Connection Refused**
   - Check n8n is running: `docker ps`
   - Verify port 5678 is accessible
   - Check firewall settings

### Debug Commands

```bash
# Check n8n status
./scripts/n8n-local.sh status

# View n8n logs
./scripts/n8n-local.sh logs

# Restart n8n
./scripts/n8n-local.sh restart

# Test connectivity
curl http://localhost:5678/webhook/ideaforge/health
```

## Integration with IdeaForge

The n8n webhooks will be called by IdeaForge when:
1. User runs `ideaforge analyze` with research enabled
2. LangGraph nodes need external data
3. Research synthesis requires API data

The integration flow:
```
IdeaForge CLI → LangGraph → n8n Webhook → External API
                    ↓           ↓             ↓
                    ← ← ← ← ← ← ← ← ← ← ← ← ←
```

## Monitoring

### Health Checks
Set up monitoring to check:
```bash
curl http://your-n8n-url/webhook/ideaforge/health
```

Expected response code: 200
Expected response body contains: `"status": "healthy"`

### Uptime Monitoring Services
- Configure services like UptimeRobot or Pingdom
- Monitor the health endpoint every 5 minutes
- Alert on failures

## Maintenance

### Updating Workflows
1. Export updated workflow from n8n
2. Save to `n8n-workflows/` directory
3. Commit to version control
4. Deploy to production

### Backup Strategy
- Workflows are version controlled in git
- n8n data volume should be backed up regularly
- Keep workflow exports updated with changes

## Support

For issues:
1. Check n8n logs for errors
2. Verify webhook configuration
3. Test with curl commands
4. Review this documentation

For n8n specific help:
- [n8n Documentation](https://docs.n8n.io)
- [n8n Community](https://community.n8n.io) 