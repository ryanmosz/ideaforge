# IdeaForge Demo Checklist 🚀

## Pre-Demo Setup (5 minutes)

### 1. Environment Check
- [ ] Verify `.env` file has all required variables:
  ```bash
  OPENAI_API_KEY=sk-...
  N8N_BASE_URL=http://localhost:5678
  N8N_API_KEY=local-dev-api-key-12345
  ```

### 2. Start Services
- [ ] Start n8n: `npm run n8n:local`
- [ ] Verify n8n is running: http://localhost:5678
- [ ] Check health: `curl http://localhost:5678/webhook/ideaforge/health`

### 3. Build Project
- [ ] Run: `npm run build`
- [ ] Verify no TypeScript errors

### 4. Quick Test
- [ ] Run integration test: `npm test tests/integration/demo-research-flow.test.ts`
- [ ] Should see "Demo test passed!" message

## Demo Execution

### Option 1: Automated Demo (Recommended)
```bash
npm run demo
```
This will:
- Create a compelling sample project
- Run analysis with research
- Show impressive results

### Option 2: Manual Demo
1. Show the sample project file
2. Run: `ideaforge analyze demo-project.org --research`
3. Show the generated analysis
4. Export to different formats

## Key Points to Highlight

1. **Time Savings**: "What would take hours of research happens in seconds"
2. **Community Wisdom**: "Learns from thousands of real developer experiences"
3. **Actionable Insights**: "Not just analysis, but specific recommendations"
4. **Risk Mitigation**: "Catches issues before you write any code"

## Backup Plan

If n8n isn't working:
- Show the existing analysis files
- Focus on the planning workflow
- Mention research as "coming soon" feature

## Post-Demo
- [ ] Clean up demo files: `rm demo-*.org`
- [ ] Stop n8n if needed 