#!/bin/bash

echo "🧪 Testing IdeaForge Demo Setup (No Reddit)"
echo "==========================================="
echo ""

# Test 1: Health Check
echo "1️⃣ Testing Health Check..."
curl -s http://localhost:5678/webhook/ideaforge/health | python3 -m json.tool
echo ""

# Test 2: HackerNews Search
echo "2️⃣ Testing HackerNews Search..."
curl -s -X POST http://localhost:5678/webhook/ideaforge/hackernews-search \
  -H "Content-Type: application/json" \
  -H "X-API-Key: local-dev-api-key-12345" \
  -d '{"query": "react performance", "sessionId": "demo-test"}' | \
  python3 -c "import sys, json; data=json.load(sys.stdin); print(f'Status: {data.get(\"status\", \"error\")}'); print(f'Results: {len(data.get(\"data\", []))} items found')"
echo ""

# Test 3: Full Demo
echo "3️⃣ Ready to run full demo:"
echo "   npm run test:grammarly"
echo ""
echo "✅ If both tests above worked, you're ready for your demo!" 