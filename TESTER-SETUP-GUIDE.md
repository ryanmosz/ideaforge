# IdeaForge Tester Setup Guide (Mac)

## 🚀 NEW: One-Command Setup

If you have Docker installed and running:
```bash
# Clone, setup, and run full demo with one command:
./scripts/demo-all-in-one.sh YOUR_OPENAI_API_KEY
```

This script automates EVERYTHING including Docker setup, n8n deployment, and running the demo!

---

## Overview

IdeaForge is an AI-powered project planning tool that transforms your ideas into structured requirements. This guide will help you set up and test IdeaForge on your Mac in under 10 minutes.

## What You'll Test

- **Basic Mode**: AI analyzes your project ideas locally (requires only OpenAI API key)
- **Research Mode**: AI fetches insights from HackerNews/Reddit (requires Docker + n8n)

## Prerequisites

### Required
- **macOS** (10.15 or later)
- **Node.js 18+** (check with `node --version`)
  - Install via [nodejs.org](https://nodejs.org/) or `brew install node`
- **OpenAI API Key** ([Get one here](https://platform.openai.com/api-keys))

### Optional (for Research Features)
- **Docker Desktop for Mac** ([Download](https://www.docker.com/products/docker-desktop/))
  - Requires macOS 10.15+
  - Allocate at least 4GB RAM in Docker preferences
- **Git** (pre-installed on macOS)

## Quick Start (Basic Features Only - 5 minutes)

1. **Download and Setup**
   ```bash
   # Clone the repository
   git clone <repository-url>
   cd G2P3
   
   # Install dependencies
   npm install
   
   # Run interactive setup
   npm run setup
   ```
   When prompted, enter your OpenAI API key.

2. **Test the Demo**
   ```bash
   npm run test:grammarly
   ```
   This runs our Grammarly clone example showing AI-powered analysis.

3. **Try Your Own Ideas**
   ```bash
   # Analyze any project idea
   npm run analyze <your-file.org>
   
   # Or use our AI task manager example
   npm run demo
   ```

## Full Setup (With Research Features - 10 minutes)

### Step 1: Install Docker Desktop

1. Download Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop/)
2. Install and start Docker Desktop
3. In Docker preferences (⚙️ icon):
   - General: Enable "Start Docker Desktop when you log in"
   - Resources: Allocate at least 4GB memory
4. Verify Docker is running:
   ```bash
   docker --version
   # Should show: Docker version 20.x or higher
   ```

### Step 2: Set Up n8n (Local Workflow Engine)

n8n handles external API calls to HackerNews and Reddit. We provide a pre-configured setup:

1. **Create .env file with local n8n configuration**
   ```bash
   # Copy this exact configuration (tested and working for local development)
   cat > .env << 'EOF'
   # OpenAI Configuration (Required)
   OPENAI_API_KEY=your_actual_openai_key_here
   
   # n8n Local Configuration (For Research Features)
   # These are the exact settings that work on the demo machine
   N8N_BASE_URL=http://localhost:5678
   N8N_WEBHOOK_PATH=webhook
   N8N_API_KEY=local-dev-api-key-12345
   N8N_TIMEOUT=30000
   N8N_RETRIES=3
   
   # Note: We're using localhost, not the cloud instance
   # The commented line below is for reference only:
   #N8N_WEBHOOK_URL=https://n8n-rmm00-u50038.vm.elestio.app/webhook/ideaforge
   EOF
   ```
   
   **Important**: Replace `your_actual_openai_key_here` with your real OpenAI API key!

2. **Start n8n in Docker**
   ```bash
   # Run n8n (this will download the image on first run)
   docker run -d \
     --name n8n \
     -p 5678:5678 \
     -v ~/.n8n:/home/node/.n8n \
     -e N8N_BASIC_AUTH_ACTIVE=false \
     -e N8N_HOST=localhost \
     -e N8N_PORT=5678 \
     -e N8N_PROTOCOL=http \
     -e EXECUTIONS_PROCESS=main \
     -e GENERIC_TIMEZONE=America/New_York \
     n8nio/n8n:latest
   ```

3. **Import IdeaForge Workflows**
   ```bash
   # Wait 10 seconds for n8n to start
   sleep 10
   
   # Deploy our workflows
   cd n8n-workflows
   ./deploy.sh
   cd ..
   ```

4. **Verify n8n is Running**
   - Open http://localhost:5678 in your browser
   - You should see the n8n interface
   - Check for 3 workflows: "HackerNews Search", "Reddit Search", "Health Check"

### Step 3: Test Research Features

```bash
# Test with research enabled
npm run analyze -- --research example-grammarly-clone.org

# Or run the full demo
npm run demo
```

You should see the AI fetch insights from HackerNews and Reddit!

## Troubleshooting

### Docker Issues

**"Cannot connect to Docker daemon"**
- Make sure Docker Desktop is running (look for whale icon in menu bar)
- Try: `docker ps` to verify

**"Port 5678 already in use"**
```bash
# Stop existing n8n container
docker stop n8n
docker rm n8n
# Then run the docker run command again
```

### n8n Issues

**"Connection refused on localhost:5678"**
```bash
# Check if n8n is running
docker ps | grep n8n

# View n8n logs
docker logs n8n

# Restart n8n
docker restart n8n
```

**"Workflows not found"**
```bash
# Re-run deployment
cd n8n-workflows
./deploy.sh
```

### OpenAI Issues

**"OpenAI API key not configured"**
- Check your .env file has the correct key
- Verify key at https://platform.openai.com/api-keys

**"Rate limit exceeded"**
- Wait 1 minute and try again
- Check usage at https://platform.openai.com/usage

## What to Test

1. **Basic Analysis** (no Docker needed)
   - `npm run test:grammarly` - Pre-configured example
   - `npm run demo` - AI Task Manager example
   - Create your own .org file and analyze it

2. **Research Features** (requires Docker + n8n)
   - Add `--research` flag to any analyze command
   - Watch the AI fetch real insights from HackerNews/Reddit
   - Try different project types to see varied research results

## Cleanup

When you're done testing:

```bash
# Stop n8n
docker stop n8n

# Remove n8n container (preserves workflows)
docker rm n8n

# Optional: Remove n8n data
rm -rf ~/.n8n

# Stop Docker Desktop
# Click Docker icon in menu bar → Quit Docker Desktop
```

## Need Help?

- **Basic features work but research doesn't?** Check Docker and n8n setup
- **Everything seems broken?** Run `npm run setup` again
- **Specific errors?** Check the Troubleshooting section above

Remember: You can always test basic AI analysis without Docker/n8n. The research features are optional enhancements! 