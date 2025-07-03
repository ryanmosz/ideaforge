#!/bin/bash

# n8n Workflow Deployment Script
# This script helps deploy IdeaForge workflows to your n8n instance

echo "🚀 IdeaForge n8n Workflow Deployment"
echo "===================================="

# Check if n8n CLI is available
if ! command -v n8n &> /dev/null; then
    echo "❌ n8n CLI not found. Please install n8n globally: npm install -g n8n"
    exit 1
fi

# Default n8n URL (can be overridden with environment variable)
N8N_URL=${N8N_URL:-"http://localhost:5678"}

echo "📍 n8n instance: $N8N_URL"
echo ""

# Function to import a workflow
import_workflow() {
    local workflow_file=$1
    local workflow_name=$(basename "$workflow_file" .json)
    
    echo "📥 Importing $workflow_name..."
    
    # For local n8n, we need to copy the file to the n8n workflows directory
    # This is a simplified approach - for production, use n8n API
    
    if [ -f "$workflow_file" ]; then
        echo "   ✓ Found workflow file: $workflow_file"
        echo "   📋 To import this workflow:"
        echo "      1. Open n8n at $N8N_URL"
        echo "      2. Go to Workflows → Import from File"
        echo "      3. Select: $(pwd)/$workflow_file"
        echo ""
    else
        echo "   ❌ Workflow file not found: $workflow_file"
        return 1
    fi
}

# Import all workflows
echo "📦 Available workflows:"
echo ""

import_workflow "hackernews-search.json"
import_workflow "reddit-search.json"
import_workflow "health-check.json"

echo ""
echo "✅ Deployment preparation complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Ensure n8n is running: npm run n8n:local"
echo "   2. Import each workflow manually through the n8n UI"
echo "   3. Activate the workflows after import"
echo "   4. Update .env with the webhook URLs"
echo ""
echo "🔗 Webhook URLs will be:"
echo "   - HackerNews: $N8N_URL/webhook/ideaforge/hackernews-search"
echo "   - Reddit: $N8N_URL/webhook/ideaforge/reddit-search"
echo "   - Health: $N8N_URL/webhook/ideaforge/health"
echo "" 