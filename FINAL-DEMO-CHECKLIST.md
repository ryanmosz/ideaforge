# Final Demo Checklist 🚀

## n8n Setup
- [x] Delete old workflows with rate limiting errors
- [x] Import **hackernews-search-v2.json**
- [ ] Import **health-check-v2.json**
- [ ] Ensure both are Active (green toggle)
- [ ] Skip Reddit for now

## Quick Tests
Once both workflows are imported and active:

```bash
# Test your setup
./scripts/test-demo-ready.sh

# Should see:
# - Health check: "status": "healthy"
# - HackerNews: "Status: success" with results
```

## Run Full Demo

```bash
# The Grammarly clone example
npm run test:grammarly
```

## What Works
- ✅ AI-powered requirement analysis (MoSCoW, Kano)
- ✅ Research from HackerNews (real data)
- ✅ Beautiful formatted output
- ✅ No authentication errors
- ✅ No rate limiting issues

## Talking Points
- "IdeaForge analyzes project requirements using AI"
- "It can research current discussions on HackerNews"
- "The tool categorizes features by priority and user impact"
- "Everything runs locally with OpenAI integration"

## If Something Goes Wrong
- Basic demo without research: Remove `--research` flag
- Check n8n is running: `docker ps`
- Verify OpenAI key: `echo $OPENAI_API_KEY`

You're ready! Good luck with your demo! 🎉 