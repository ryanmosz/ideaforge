# IdeaForge Tester Setup Guide

## 🚀 Quick Demo (2 minutes)

If you just want to see IdeaForge in action:

```bash
# From project root directory
npm install
npm run setup  # Enter your OpenAI API key when prompted
npm run dev -- analyze demo/example-grammarly-demo.org --output demo/grammarly-analysis.org --model gpt-4.1
```

Check `demo/grammarly-analysis.org` for the AI-generated analysis!

---

## Complete Setup Guide

### Prerequisites

#### Required
- **macOS** (10.15 or later) or **Linux**
- **Node.js 18+** ([Download](https://nodejs.org/))
- **OpenAI API Key** ([Get one here](https://platform.openai.com/api-keys))

#### Optional (for Research Features)
- **Docker Desktop** ([Download](https://www.docker.com/products/docker-desktop/))
- **Git** (for cloning the repository)

### Installation Steps

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd G2P3
   npm install
   ```

2. **Configure OpenAI**
   ```bash
   npm run setup
   # Enter your OpenAI API key when prompted
   ```

3. **Run the Demo**
   ```bash
   # Basic analysis (AI only)
   npm run dev -- analyze demo/example-grammarly-demo.org --output demo/grammarly-analysis.org --model gpt-4.1
   
   # With research (requires Docker - see below)
   npm run dev -- analyze demo/example-grammarly-demo.org --output demo/grammarly-analysis.org --model gpt-4.1 --research
   ```

### Enabling Research Features (Optional)

Research features fetch real insights from HackerNews and Reddit. This requires Docker and n8n setup:

1. **Install Docker Desktop**
   - Download from [docker.com](https://www.docker.com/products/docker-desktop/)
   - Start Docker Desktop
   - Verify: `docker --version`

2. **Start n8n**
   ```bash
   # Run n8n workflow engine
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

3. **Import Workflows**
   - Open http://localhost:5678 in your browser
   - Import these workflow files:
     - `n8n-workflows/hackernews-search-v2.json`
     - `n8n-workflows/health-check-v2.json`
   - Activate each workflow (toggle the switch)

4. **Test Research**
   ```bash
   npm run dev -- analyze demo/example-grammarly-demo.org --output demo/grammarly-analysis.org --model gpt-4.1 --research
   ```

### What to Expect

The analysis will generate:
- **Project Overview**: Executive summary with technology recommendations
- **MoSCoW Analysis**: Requirements prioritized as Must/Should/Could/Won't Have
- **Kano Analysis**: Features categorized as Basic/Performance/Excitement
- **Requirements**: Detailed functional requirements with dependencies
- **Research Insights**: Real developer opinions from HackerNews (if enabled)

### Troubleshooting

**"OpenAI API key not found"**
- Run `npm run setup` again
- Check `.env` file exists with your key

**"Rate limit exceeded"**
- OpenAI free tier has limits
- Wait 1 minute and retry
- Check usage at platform.openai.com

**"Cannot connect to n8n"**
- Ensure Docker is running
- Check n8n container: `docker ps`
- Restart: `docker restart n8n`

**"Model not found"**
- Use `--model gpt-4` or `--model gpt-3.5-turbo`
- Default is `o3-mini` which may not be available

### Quick Commands

```bash
# View available options
npm run dev -- analyze --help

# Use different AI models
npm run dev -- analyze demo/example-grammarly-demo.org --model gpt-4

# Start fresh (ignore previous analysis)
npm run dev -- analyze demo/example-grammarly-demo.org --fresh

# Custom output location
npm run dev -- analyze demo/example-grammarly-demo.org --output my-analysis.org
```

### Cleanup

```bash
# Stop n8n (if running)
docker stop n8n
docker rm n8n

# Remove n8n data
rm -rf ~/.n8n
```

## Need Help?

- Basic features work without Docker - just OpenAI API key needed
- Research features are optional enhancements
- Check `demo/README.md` for architecture details 