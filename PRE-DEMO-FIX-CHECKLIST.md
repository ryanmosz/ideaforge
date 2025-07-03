# Pre-Demo Fix Checklist ⚠️

## 🚨 CRITICAL ISSUE FOUND
The rate limiting nodes in the workflows are causing an error:
```
"$getWorkflowStaticData is not defined [Line 3]"
```

## Quick Fix (2 minutes)

Run this command for instructions:
```bash
npm run demo:quick-fix
```

OR manually fix:

1. **Open n8n interface** at http://localhost:5678
2. **For each workflow** (hackernews-search, reddit-search):
   - Find the "Rate Limiter" Function node
   - Delete it (click node → press Delete)
   - Connect webhook directly to next node
   - Save workflow (Ctrl+S)
   - Ensure still Active (green toggle)

## The Issue
Currently, n8n has an **old test workflow** that just echoes requests instead of searching HackerNews/Reddit. This needs to be fixed before the demo to enable research features.

## Quick Fix (5 minutes)

### Option A: Run the Fix Script
```bash
npm run demo:fix-n8n
```
This will:
1. Check if workflows are correct
2. Open n8n UI if they need fixing
3. Guide you through the process

### Option B: Manual Fix
1. Open n8n: http://localhost:5678
2. Delete any existing IdeaForge workflows
3. Import new workflows:
   - Click "Add Workflow" → "Import from File"
   - Import: `n8n-workflows/hackernews-search.json`
   - Import: `n8n-workflows/reddit-search.json`
   - Import: `n8n-workflows/health-check.json`
4. **IMPORTANT**: Activate each workflow (toggle switch to green)
5. Verify: `npm run demo:fix-n8n`

## Demo Without Research (If Time is Critical)

The demo works perfectly without research features! Just run:
```bash
# Basic demo (AI-only, no research)
npm run test:grammarly
```

This still shows:
- MoSCoW prioritization
- AI-powered analysis
- Feature recommendations
- Risk assessment

Research adds community insights but isn't required for an impressive demo.

## Full Demo Command (After Fix)

Once workflows are fixed:
```bash
# Full demo with research
npm run demo:full YOUR_OPENAI_KEY
```

Or just analyze with research:
```bash
./bin/ideaforge analyze example-grammarly-clone.org --research
```

## Time Estimates
- **Fixing workflows**: 5 minutes
- **Running full demo**: 2 minutes
- **Basic demo (no fix needed)**: 30 seconds

## Remember
- Research is a **bonus feature**, not core functionality
- The AI analysis alone is impressive
- If pressed for time, skip research and just show AI analysis 