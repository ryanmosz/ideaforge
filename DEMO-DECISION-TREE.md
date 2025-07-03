# IdeaForge Demo Decision Tree 🎯

## Start Here

### Q: How much time do you have?

#### ⏱️ < 5 minutes
→ **Use Basic Demo (No Docker/n8n needed)**
```bash
npm run test:grammarly
```
Shows: AI analysis, MoSCoW prioritization, feature recommendations

#### ⏱️ 10-15 minutes  
→ **Fix n8n + Run Full Demo**
1. Check workflows: `npm run demo:fix-n8n`
2. If broken, fix them (5 min)
3. Run: `./scripts/demo-all-in-one.sh YOUR_OPENAI_KEY`

Shows: Everything above + HackerNews/Reddit insights

---

## Troubleshooting Flowchart

```
Demo not working?
├─ Basic demo fails?
│  └─ Check OpenAI key in .env
│
└─ Research features fail?
   ├─ Is Docker running?
   │  └─ No → Start Docker Desktop
   │
   ├─ Is n8n running?
   │  └─ No → docker start n8n
   │
   └─ Old workflows active?
      └─ Yes → npm run demo:fix-n8n
```

## Quick Commands Reference

| What You Want | Command |
|--------------|---------|
| Test if everything works | `npm run demo:fix-n8n` |
| Quick AI-only demo | `npm run test:grammarly` |
| Full demo with setup | `npm run demo:full YOUR_KEY` |
| Fix n8n workflows | Follow prompts from `npm run demo:fix-n8n` |
| Open n8n UI | `open http://localhost:5678` |

## Remember
- **Research is optional** - AI analysis alone is impressive
- **Old workflows** are the only blocker for research features
- **5 minutes** to fix workflows if needed
- **Fallback ready** - system handles missing research gracefully 