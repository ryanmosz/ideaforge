# IdeaForge Tester Setup Guide

## 🚀 Fastest Demo (30 seconds)

**After setup, just run:**

```bash
cd demo
./run-demo.sh
```

The demo script handles everything and shows clean output perfect for screen recording!

---

## First Time Setup (2 minutes)

### Prerequisites
- **Node.js 18+** ([Download](https://nodejs.org/))
- **OpenAI API Key** ([Get one here](https://platform.openai.com/api-keys))

### Quick Setup

```bash
# 1. Clone the project
git clone <repository-url>
cd G2P3

# 2. Install and configure
npm install
npm run setup  # Enter your OpenAI API key

# 3. Go to demo folder
cd demo

# 4. Run the demo!
./run-demo.sh
```

## Demo Script Options

The `run-demo.sh` script provides a clean interface:

```bash
# Basic AI analysis (default)
./run-demo.sh

# With research insights (needs Docker + n8n)
./run-demo.sh --research

# Use different AI models
./run-demo.sh --model gpt-4
./run-demo.sh --model gpt-3.5-turbo

# Analyze your own file
./run-demo.sh --input my-idea.org --output my-analysis.org

# See all options
./run-demo.sh --help
```

## Manual Commands (Alternative)

If you prefer direct commands:

```bash
# From the demo folder
../bin/ideaforge analyze example-grammarly-demo.org --output grammarly-analysis.org --model gpt-4.1
```

## Enabling Research Features (Optional)

Research features fetch real insights from HackerNews and Reddit:

### 1. Install Docker Desktop
- Download from [docker.com](https://www.docker.com/products/docker-desktop/)
- Start Docker Desktop
- Verify: `docker --version`

### 2. Start n8n
```bash
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  -e N8N_BASIC_AUTH_ACTIVE=false \
  -e N8N_HOST=localhost \
  -e N8N_PORT=5678 \
  -e N8N_PROTOCOL=http \
  n8nio/n8n:latest
```

### 3. Import Workflows
1. Open http://localhost:5678
2. Click "Add workflow" → "Import from File"
3. Import from project root:
   - `n8n-workflows/hackernews-search-v2.json`
   - `n8n-workflows/health-check-v2.json`
4. Activate each workflow (toggle to green)

### 4. Test with Research
```bash
./run-demo.sh --research
```

## What's in the Demo

- **`example-grammarly-demo.org`** - Sample project description
- **`grammarly-analysis.org`** - AI-generated analysis output
- **`run-demo.sh`** - Clean demo runner script
- **`README.md`** - System architecture details

## Expected Output

The analysis generates:
- **Executive Summary** with technology recommendations
- **MoSCoW Analysis** - Must/Should/Could/Won't Have priorities
- **Kano Analysis** - Basic/Performance/Excitement features
- **Requirements** with dependency mapping
- **Research Insights** from developers (if --research enabled)

## Troubleshooting

### OpenAI Issues
- **"API key not found"** → Run `npm run setup` from project root
- **"Rate limit"** → Wait 60 seconds, or check usage at platform.openai.com
- **"Model not found"** → Use `--model gpt-4` or `--model gpt-3.5-turbo`

### Docker/n8n Issues
- **"Cannot connect"** → Ensure Docker Desktop is running
- **"Port 5678 in use"** → `docker stop n8n && docker rm n8n`
- **Check status** → `docker ps | grep n8n`

## Creating Your Own Analysis

```bash
# Write your project idea
nano my-startup.org

# Analyze it
./run-demo.sh --input my-startup.org --output my-startup-analysis.org
```

## Quick Reference

```bash
# All from demo folder:
./run-demo.sh                    # Basic demo
./run-demo.sh --research         # With HN/Reddit insights
./run-demo.sh --model gpt-4      # Different model
./run-demo.sh --help            # See all options
``` 