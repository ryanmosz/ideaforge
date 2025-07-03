#!/usr/bin/env node

console.log(`
🔧 Manual Test Process for HackerNews V2
========================================

IMPORTANT: n8n test mode requires manual triggering!

1. In n8n interface:
   - Make sure you're viewing the HackerNews V2 workflow
   - Click the "Execute workflow" button (top right)
   - You'll see "Workflow waiting for trigger..."

2. Within 2 minutes, run this curl command:

curl -X POST http://localhost:5678/webhook-test/ideaforge/hackernews-search \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: local-dev-api-key-12345" \\
  -d '{"query": "react performance", "sessionId": "test-manual-${Date.now()}"}'

3. Check n8n interface - you should see:
   - Green checkmarks on each node
   - The workflow execution completed
   - Click on nodes to see the data flow

4. To test again, repeat from step 1 (click Execute workflow)

NOTE: Each test webhook URL only works for ONE call after clicking Execute.

For production mode (no manual clicking needed):
- Save the workflow
- Make sure it's Active (green toggle)
- Use the production URL: http://localhost:5678/webhook/ideaforge/hackernews-search
`); 