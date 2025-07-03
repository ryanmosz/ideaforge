#!/bin/bash

# n8n Workflow Deployment Script
# Helps import IdeaForge workflows into an n8n instance

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
N8N_URL="${N8N_BASE_URL:-http://localhost:5678}"
N8N_API_KEY="${N8N_API_KEY}"

echo -e "${GREEN}IdeaForge n8n Workflow Deployment${NC}"
echo "=================================="
echo

# Check if workflows exist
if [ ! -f "hackernews-search.json" ] || [ ! -f "reddit-search.json" ] || [ ! -f "health-check.json" ]; then
    echo -e "${RED}Error: Workflow files not found!${NC}"
    echo "Please run this script from the n8n-workflows directory."
    exit 1
fi

# Function to import a workflow
import_workflow() {
    local file=$1
    local name=$2
    
    echo -e "${YELLOW}Importing $name...${NC}"
    
    # Note: This is a placeholder for the actual n8n API call
    # n8n doesn't have a direct REST API for importing workflows
    # You'll need to use the UI or n8n CLI
    
    echo -e "${GREEN}✓ $name ready to import${NC}"
    echo "  Please import $file manually via n8n UI:"
    echo "  1. Go to $N8N_URL"
    echo "  2. Workflows → Import from File → Select $file"
    echo
}

# Import workflows
import_workflow "hackernews-search.json" "HackerNews Search"
import_workflow "reddit-search.json" "Reddit Search"
import_workflow "health-check.json" "Health Check"

echo -e "${GREEN}Import Instructions Complete!${NC}"
echo
echo "After importing, remember to:"
echo "1. Activate each workflow"
echo "2. Update the API key if needed"
echo "3. Test each endpoint"
echo
echo "Test health check:"
echo "  curl $N8N_URL/webhook/ideaforge/health"
echo

# Check if health endpoint is accessible
echo -e "${YELLOW}Checking n8n availability...${NC}"
if curl -s -f "$N8N_URL" > /dev/null; then
    echo -e "${GREEN}✓ n8n is accessible at $N8N_URL${NC}"
else
    echo -e "${RED}✗ Cannot reach n8n at $N8N_URL${NC}"
    echo "  Make sure n8n is running and accessible."
fi 