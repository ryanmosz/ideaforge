#!/bin/bash

# IdeaForge All-in-One Demo Setup Script
# Usage: ./demo-all-in-one.sh YOUR_OPENAI_API_KEY

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if OpenAI key is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: OpenAI API key required${NC}"
    echo "Usage: $0 YOUR_OPENAI_API_KEY"
    exit 1
fi

OPENAI_KEY="$1"

echo -e "${BLUE}🚀 IdeaForge All-in-One Demo Setup${NC}"
echo "======================================"

# Step 1: Check prerequisites
echo -e "\n${YELLOW}Step 1: Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 18+ first.${NC}"
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js 18+ required. Current version: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v) installed${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Installing Docker is required for research features.${NC}"
    echo "   Please install Docker Desktop from: https://www.docker.com/products/docker-desktop/"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running. Please start Docker Desktop.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker is running${NC}"

# Step 2: Install dependencies
echo -e "\n${YELLOW}Step 2: Installing dependencies...${NC}"
npm install

# Step 3: Create .env file
echo -e "\n${YELLOW}Step 3: Setting up environment...${NC}"
cat > .env << EOF
# OpenAI Configuration
OPENAI_API_KEY=$OPENAI_KEY

# n8n Local Configuration (Auto-configured)
N8N_BASE_URL=http://localhost:5678
N8N_WEBHOOK_PATH=webhook
N8N_API_KEY=local-dev-api-key-12345
N8N_TIMEOUT=30000
N8N_RETRIES=3

# AI Model Configuration
AI_MODEL=o1-mini

# Reddit Configuration (Optional - for Reddit research)
# REDDIT_CLIENT_ID=your_reddit_client_id_here
# REDDIT_CLIENT_SECRET=your_reddit_client_secret_here
# REDDIT_USER_AGENT=IdeaForge/1.0
EOF
echo -e "${GREEN}✓ Environment configured${NC}"

# Step 4: Check if n8n is already running
echo -e "\n${YELLOW}Step 4: Setting up n8n...${NC}"
if docker ps | grep -q n8n; then
    echo "Stopping existing n8n container..."
    docker stop n8n &> /dev/null
    docker rm n8n &> /dev/null
fi

# Start n8n
echo "Starting n8n in Docker..."
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
    n8nio/n8n:latest &> /dev/null

# Wait for n8n to start
echo "Waiting for n8n to start..."
for i in {1..30}; do
    if curl -s http://localhost:5678/healthz &> /dev/null; then
        echo -e "${GREEN}✓ n8n is running${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ n8n failed to start. Check Docker logs: docker logs n8n${NC}"
        exit 1
    fi
    sleep 2
done

# Step 5: Deploy and verify workflows
echo -e "\n${YELLOW}Step 5: Checking workflows...${NC}"

# First check if workflows are correctly configured
if node scripts/fix-n8n-workflows.js | grep -q "Correct workflow is active"; then
    echo -e "${GREEN}✓ Workflows are already configured correctly${NC}"
else
    echo -e "${YELLOW}⚠️  Workflows need to be imported manually${NC}"
    echo -e "${BLUE}Opening n8n for manual workflow import...${NC}"
    open http://localhost:5678/workflows || echo "Please open http://localhost:5678/workflows"
    
    echo -e "\n${YELLOW}Manual steps required:${NC}"
    echo "1. Delete any existing IdeaForge workflows"
    echo "2. Import workflows from: n8n-workflows/*.json"
    echo "3. Activate each workflow (toggle switch)"
    echo "4. Run: node scripts/fix-n8n-workflows.js to verify"
    echo -e "\n${YELLOW}Press Enter when workflows are imported and activated...${NC}"
    read -r
    
    # Verify again
    if node scripts/fix-n8n-workflows.js | grep -q "Correct workflow is active"; then
        echo -e "${GREEN}✓ Workflows configured successfully${NC}"
    else
        echo -e "${YELLOW}⚠️  Continuing without research features${NC}"
        echo "   (Demo will still work with AI-only analysis)"
    fi
fi

# Step 6: Create demo directory
echo -e "\n${YELLOW}Step 6: Setting up demo files...${NC}"
mkdir -p demo-workspace
cp example-grammarly-clone.org demo-workspace/
echo -e "${GREEN}✓ Demo workspace created${NC}"

# Step 7: Run initial demo
echo -e "\n${YELLOW}Step 7: Running demo...${NC}"
echo -e "${BLUE}Analyzing the Grammarly clone example with AI + Research...${NC}"
./bin/ideaforge analyze demo-workspace/example-grammarly-clone.org \
    --output demo-workspace/grammarly-analysis.org \
    --research

# Step 8: Show results and next steps
echo -e "\n${GREEN}🎉 Demo Setup Complete!${NC}"
echo "========================="
echo -e "\n${BLUE}What just happened:${NC}"
echo "1. ✓ Installed all dependencies"
echo "2. ✓ Configured your OpenAI API key"
echo "3. ✓ Started n8n workflow engine in Docker"
echo "4. ✓ Deployed HackerNews & Reddit search workflows"
echo "5. ✓ Analyzed a Grammarly clone project with AI + Research"

echo -e "\n${BLUE}Your demo files:${NC}"
echo "• Input:  demo-workspace/example-grammarly-clone.org"
echo "• Output: demo-workspace/grammarly-analysis.org"

echo -e "\n${BLUE}Try it yourself:${NC}"
echo "1. Edit the example: nano demo-workspace/example-grammarly-clone.org"
echo "2. Re-run analysis: ./bin/ideaforge analyze demo-workspace/example-grammarly-clone.org --research"
echo "3. Create your own: ./bin/ideaforge init (creates ideaforge-template.org)"

echo -e "\n${BLUE}Useful commands:${NC}"
echo "• View n8n UI: open http://localhost:5678"
echo "• Check logs: docker logs n8n"
echo "• Stop n8n: docker stop n8n"
echo "• Restart: docker restart n8n"

echo -e "\n${YELLOW}Note: Reddit search requires additional OAuth setup.${NC}"
echo "      HackerNews search is fully functional!"

# Open the analysis in default editor if available
if command -v code &> /dev/null; then
    echo -e "\n${BLUE}Opening results in VS Code...${NC}"
    code demo-workspace/grammarly-analysis.org
elif command -v open &> /dev/null; then
    echo -e "\n${BLUE}Opening demo workspace...${NC}"
    open demo-workspace/
fi 