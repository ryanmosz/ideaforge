#!/usr/bin/env node

console.log(`
📋 n8n Workflow Fix Guide - Step by Step
========================================

Since the workflows need to be fixed in the n8n UI, here's exactly what to do:

1️⃣  Open n8n in your browser:
    http://localhost:5678

2️⃣  Fix the HackerNews workflow:
    a) Click on "hackernews-search" workflow
    b) You'll see nodes connected like this:
       
       [Webhook] → [Rate Limiter ❌] → [Process] → [Response]
       
    c) Click on the "Rate Limiter" node (it has the error)
    d) Press DELETE key to remove it
    e) Click and drag from [Webhook] output to [Process] input to reconnect
    f) Press Ctrl+S (or Cmd+S on Mac) to save
    g) Make sure the toggle in top-right is GREEN (active)

3️⃣  Fix the Reddit workflow:
    a) Go back to workflows list (click "Workflows" in sidebar)
    b) Click on "reddit-search" workflow
    c) Repeat the same process - delete Rate Limiter node and reconnect
    d) Save and ensure it's active

4️⃣  Test the fix:
    In n8n, for EACH workflow:
    a) Click "Execute workflow" button
    b) You should see "Workflow executed successfully"
    
    Then test from terminal:
    curl http://localhost:5678/webhook/ideaforge/health-check

5️⃣  If webhooks still don't work:
    - In n8n settings, check if you're in "Production" mode
    - Or use test mode: Click "Execute workflow" before each demo

⏱️  Total time: ~3 minutes

Ready? Open http://localhost:5678 and let's fix those workflows!
`); 