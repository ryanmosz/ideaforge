#!/bin/bash

# IdeaForge Demo Runner
echo "🚀 Running IdeaForge Demo..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Input:  DEMO-INPUT-grammarly.org"
echo "Output: DEMO-OUTPUT-NEW.org"
echo "Model:  GPT-4.1"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if npm packages are installed
if [ ! -d "node_modules" ]; then
    echo "⚠️  Installing dependencies first..."
    npm install
fi

# Check for .env file
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Running setup..."
    npm run setup
fi

# Run the analysis
npm run dev -- analyze DEMO-INPUT-grammarly.org --output DEMO-OUTPUT-NEW.org --model gpt-4.1

echo ""
echo "✅ Demo complete! Check DEMO-OUTPUT-NEW.org for results." 