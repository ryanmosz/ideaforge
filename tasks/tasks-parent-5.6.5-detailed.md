# Task 5.6 Detailed Implementation Part 5: Troubleshooting Guide (5.6.8)

## Overview
This file covers creating a comprehensive troubleshooting guide for the n8n integration system.

## Implementation Details

### 5.6.8 Create troubleshooting guide

**Objective**: Build a comprehensive troubleshooting guide covering common issues and solutions.

**File to Create**: `docs/troubleshooting-n8n.md`

**Step 1: Create Guide Structure**

```markdown
# n8n Integration Troubleshooting Guide

## Quick Diagnostics

```bash
# Run diagnostic script
npm run diagnose:n8n

# Manual checks
curl -I http://localhost:5678/webhook/ideaforge/health
echo $N8N_BASE_URL
echo $N8N_API_KEY | head -c 10
```

## Common Issues and Solutions

### 1. Connection Refused

**Symptom**: `ECONNREFUSED` when running analysis

**Solutions**:

a) Check n8n is running:
```bash
# Docker
docker ps | grep n8n

# Process
ps aux | grep n8n

# Start if needed
docker-compose up -d n8n
```

b) Verify URL configuration:
```bash
# Check environment
echo $N8N_BASE_URL
# Should NOT have trailing slash
# Correct: http://localhost:5678
# Wrong: http://localhost:5678/
```

c) Check firewall:
```bash
# macOS
sudo pfctl -s rules | grep 5678

# Linux
sudo iptables -L | grep 5678
```

### 2. Authentication Errors

**Symptom**: 401 Unauthorized

**Solutions**:

a) Verify API key:
```bash
# Check environment
echo $N8N_API_KEY

# Test directly
curl -X POST http://localhost:5678/webhook/ideaforge/health \
  -H "X-API-Key: $N8N_API_KEY"
```

b) Check n8n webhook configuration:
- Open n8n UI
- Edit webhook node
- Verify authentication settings
- Ensure API key matches

### 3. No Research Results

**Symptom**: Analysis completes but no research data

**Debug Steps**:

1. Check research flag:
```typescript
// Must be true
const analysis = await client.analyze('project.org', {
  enableResearch: true  // ← Required
});
```

2. Verify technology extraction:
```bash
ideaforge analyze project.org --dry-run --verbose
```

3. Test webhooks directly:
```bash
curl -X POST http://localhost:5678/webhook/ideaforge/hackernews-search \
  -H "X-API-Key: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "sessionId": "test-123"}'
```

### 4. Rate Limit Errors

**Symptom**: 429 or "Rate limit exceeded"

**Solutions**:

a) Enable caching:
```typescript
const client = new IdeaForgeClient({
  cacheEnabled: true,
  cacheTTL: 3600
});
```

b) Add request delays:
```typescript
// In n8n workflow
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
await delay(1000); // 1 second
```

c) Monitor limits:
```javascript
// Reddit: 60/minute
// HN: 10,000/hour
```

### 5. Reddit OAuth Issues

**Symptom**: Reddit searches fail

**Debug OAuth**:

1. Test credentials:
```bash
curl -X POST https://www.reddit.com/api/v1/access_token \
  -H "Authorization: Basic $(echo -n "$REDDIT_CLIENT_ID:$REDDIT_CLIENT_SECRET" | base64)" \
  -d "grant_type=client_credentials"
```

2. Check token expiry:
- Reddit tokens expire after 1 hour
- n8n should auto-refresh
- Check OAuth2 node settings

### 6. Timeout Errors

**Symptom**: Request timeout after 30 seconds

**Solutions**:

a) Increase timeout:
```bash
export N8N_TIMEOUT=60000  # 60 seconds
```

b) Optimize queries:
```typescript
// Reduce scope
{
  sources: ['hackernews'],  // One source
  limit: 10,               // Fewer results
  dateRange: 'last_week'   // Narrow timeframe
}
```

### 7. Cache Issues

**Symptom**: Stale or incorrect cached data

**Solutions**:

a) Clear cache:
```typescript
client.clearCache();
```

b) Disable for testing:
```typescript
const results = await client.analyze('project.org', {
  enableResearch: true,
  useCache: false
});
```

c) Check cache stats:
```typescript
const stats = client.getCacheStats();
console.log(stats);
```

## Debug Mode

Enable comprehensive logging:

```bash
# Environment variables
export DEBUG=ideaforge:*
export LOG_LEVEL=debug

# Run with verbose output
ideaforge analyze project.org --research --verbose

# n8n debug mode
export N8N_LOG_LEVEL=debug
```

## Performance Optimization

### Slow Research

1. **Use single source**:
   ```bash
   ideaforge analyze project.org --research --sources hackernews
   ```

2. **Limit results**:
   ```typescript
   { limit: 10, dateRange: 'last_month' }
   ```

3. **Enable caching**:
   ```bash
   CACHE_ENABLED=true ideaforge analyze project.org
   ```

### High Memory Usage

1. **Limit cache size**:
   ```bash
   export CACHE_MAX_SIZE_MB=50
   ```

2. **Clear old sessions**:
   ```typescript
   sessionManager.cleanup(7); // Keep last 7 days
   ```

## Error Messages Reference

| Error | Cause | Solution |
|-------|-------|----------|
| ECONNREFUSED | n8n not running | Start n8n service |
| 401 Unauthorized | Invalid API key | Check credentials |
| 429 Too Many Requests | Rate limited | Enable caching, add delays |
| ETIMEDOUT | Request too slow | Increase timeout, optimize query |
| Invalid response format | API changed | Update response parsing |

## Getting Help

1. **Check logs**:
   ```bash
   # Application logs
   tail -f ~/.ideaforge/logs/app.log
   
   # n8n logs
   docker logs n8n -f
   ```

2. **Run diagnostics**:
   ```bash
   npm run diagnose:n8n
   ```

3. **Enable debug output**:
   ```bash
   DEBUG=* ideaforge analyze project.org --research
   ```

## Health Check Script

Create `scripts/health-check.sh`:

```bash
#!/bin/bash

echo "=== n8n Integration Health Check ==="

# Check environment
echo -n "Environment variables... "
if [ -z "$N8N_BASE_URL" ] || [ -z "$N8N_API_KEY" ]; then
  echo "❌ Missing"
  exit 1
else
  echo "✅"
fi

# Check n8n connectivity
echo -n "n8n connection... "
if curl -f -s "$N8N_BASE_URL/webhook/ideaforge/health" > /dev/null; then
  echo "✅"
else
  echo "❌ Failed"
  exit 1
fi

# Test API endpoints
echo -n "HackerNews API... "
response=$(curl -s -X POST "$N8N_BASE_URL/webhook/ideaforge/hackernews-search" \
  -H "X-API-Key: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "sessionId": "health-check"}')

if echo "$response" | grep -q "results"; then
  echo "✅"
else
  echo "❌ Failed"
fi

echo "=== Health check complete ==="
```

## Monitoring

Add monitoring to catch issues early:

```javascript
// Monitor webhook performance
const monitorPerformance = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    if (duration > 5000) {
      console.warn(`Slow webhook: ${req.path} took ${duration}ms`);
    }
    
    metrics.record({
      path: req.path,
      duration,
      status: res.statusCode
    });
  });
  
  next();
};
```

## Common Fixes Summary

1. **Always check n8n is running first**
2. **Verify environment variables are set**
3. **Enable caching during development**
4. **Use debug mode for detailed errors**
5. **Monitor rate limits carefully**
6. **Test webhooks independently**
7. **Keep logs for troubleshooting**
```

## Definition of Done

✅ Common issues documented with solutions
✅ Debug mode instructions provided
✅ Performance optimization tips included
✅ Error reference table created
✅ Health check script provided
✅ Monitoring guidance included
✅ Clear diagnostic steps
✅ Examples for each issue 