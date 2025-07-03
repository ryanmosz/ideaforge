#!/usr/bin/env node

console.log(`
🚀 Deploy V2 Workflows to n8n
=============================

We've created 3 fixed workflows that work without rate limiting:

1. ✅ HackerNews V2 - Real search functionality
   File: n8n-workflows/hackernews-search-v2.json
   
2. 🎭 Reddit V2 Mock - Returns demo data (no OAuth needed)
   File: n8n-workflows/reddit-search-v2-mock.json
   
3. ✅ Health Check V2 - Simple status check
   File: n8n-workflows/health-check-v2.json

DEPLOYMENT STEPS:
----------------

1. Delete old workflows in n8n:
   - Go to Workflows page
   - Delete: "IdeaForge - HackerNews Search"
   - Delete: "IdeaForge - Reddit Search"
   - Delete: "IdeaForge - Health Check"

2. Import V2 workflows:
   - Click "Add workflow" → "Import from File"
   - Import each V2 workflow file
   - Make sure each is Active (green toggle)

3. Test everything works:
   
   Health check:
   curl http://localhost:5678/webhook/ideaforge/health
   
   HackerNews (real data):
   curl -X POST http://localhost:5678/webhook/ideaforge/hackernews-search \\
     -H "Content-Type: application/json" \\
     -H "X-API-Key: local-dev-api-key-12345" \\
     -d '{"query": "react", "sessionId": "test-v2"}'
   
   Reddit (mock data):
   curl -X POST http://localhost:5678/webhook/ideaforge/reddit-search \\
     -H "Content-Type: application/json" \\
     -H "X-API-Key: local-dev-api-key-12345" \\
     -d '{"query": "react", "sessionId": "test-v2"}'

4. Run full IdeaForge demo:
   npm run test:grammarly

NOTES:
- Reddit returns mock data (perfect for demos)
- HackerNews uses real API (no auth needed)
- No rate limiting errors!
`); 