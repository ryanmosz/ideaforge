#!/usr/bin/env node

console.log(`
🚨 QUICK FIX: Remove Rate Limiting Nodes from n8n Workflows
==========================================================

The rate limiting nodes are causing errors. Here's how to fix it:

1. In your n8n interface, open each workflow:
   - hackernews-search
   - reddit-search

2. For each workflow:
   a) Find the "Rate Limiter" Function node (usually after the webhook)
   b) Delete it by:
      - Click on the Rate Limiter node
      - Press Delete key (or right-click → Delete)
   c) Connect the webhook directly to the next node
   d) Save the workflow (Ctrl+S or Cmd+S)
   e) Make sure it's still Active (green toggle)

3. Test the health check to confirm n8n is working:
   curl http://localhost:5678/webhook/ideaforge/health-check

4. The workflows should now work without rate limiting!

Note: Rate limiting can be added back post-demo with a proper implementation.
`); 