# IdeaForge Demo - Quick Tester Guide

## Prerequisites

**Required:**
- Node.js 18+
- OpenAI API Key
- Docker Desktop (for HackerNews/Reddit research features)

## 🚀 Quick Setup with Docker

```bash
# 1. Install Docker Desktop for Mac
# Download from: https://www.docker.com/products/docker-desktop/
# Start Docker (look for whale icon in menu bar)

# 2. Clone and setup IdeaForge
git clone <repository-url>
cd G2P3
npm install
npm run setup  # Enter your OpenAI API key

# 3. Start n8n for research features
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -e N8N_BASIC_AUTH_ACTIVE=false \
  n8nio/n8n:latest

# 4. Import workflows (wait 10 seconds for n8n to start)
sleep 10
cd n8n-workflows
./deploy.sh
cd ..

# 5. Run the demo
./DEMO-RUN.sh
```

Check `DEMO-OUTPUT-NEW.org` - it will include research insights from HackerNews and Reddit!

## What You're Testing

IdeaForge transforms project ideas into structured requirements with:
- **MoSCoW Analysis**: Must/Should/Could/Won't prioritization
- **Kano Model**: Basic/Performance/Excitement feature categorization  
- **Dependencies**: Identifies relationships between requirements
- **HackerNews Research**: Real developer insights and discussions
- **Reddit Research**: Implementation experiences and recommendations
- **AI Synthesis**: Combines all research into actionable recommendations

Look for the "Project Overview" section - it contains the synthesized research including HackerNews discussions!

## Demo Files

All demo files start with `DEMO-` for easy identification:
- `DEMO-INPUT-grammarly.org` - Sample input (AI writing assistant)
- `DEMO-RUN.sh` - One-click demo script
- `DEMO-OUTPUT-NEW.org` - Generated output (created when you run demo)
- `DEMO-README.md` - Architecture documentation
- `DEMO-Flowchart.png` - System architecture diagram
- `DEMO-Langgraph.png` - AI orchestration flow

## Manual Testing

```bash
# Basic analysis
npm run dev -- analyze DEMO-INPUT-grammarly.org --output my-test.org --model gpt-4.1

# Try different AI models
npm run dev -- analyze DEMO-INPUT-grammarly.org --output my-test.org --model gpt-3.5-turbo

# Test with your own file
echo "* My Project Idea
** Overview
I want to build a mobile app for tracking gym workouts
** Requirements
- REQ-1: User login
- REQ-2: Exercise database
- REQ-3: Progress tracking" > my-idea.org

npm run dev -- analyze my-idea.org --output my-analysis.org --model gpt-4.1
```

## Testing Without Docker

If you absolutely can't install Docker, the core AI analysis still works:
```bash
# Basic analysis without research features
npm run dev -- analyze DEMO-INPUT-grammarly.org --output test-basic.org --model gpt-4.1
```
But you'll miss the HackerNews/Reddit insights that make IdeaForge unique!

## What to Look For

Good output should have:
1. **Project Overview** with technology recommendations
2. **MoSCoW Analysis** with categorized requirements
3. **Kano Analysis** with feature types
4. **User Stories** properly formatted
5. **Requirements** with proper tags (`:MUST:`, `:SHOULD:`, etc.)
6. **Research insights** (if --research flag used)

## Common Issues

**"OpenAI API key not configured"**
```bash
# Check your .env file
cat .env | grep OPENAI_API_KEY

# Re-run setup if needed
npm run setup
```

**Empty MoSCoW/Kano sections**
```bash
# Make sure AI_MODEL is set correctly in .env
echo "AI_MODEL=gpt-4.1" >> .env
```

**Research features not working**
- Docker must be running (check menu bar for whale icon)
- n8n must be accessible at http://localhost:5678
- Workflows must be imported (check n8n interface)

## Quick Cleanup

```bash
# Stop n8n
docker stop n8n
docker rm n8n

# Remove test outputs
rm -f my-test.org my-analysis.org test-research.org
```

## Need Help?

- Docker is required for the full IdeaForge experience with HackerNews/Reddit research
- Without Docker, you only get basic AI analysis (missing the key differentiator!)
- Check the Project Overview section in output - it should contain HackerNews insights 