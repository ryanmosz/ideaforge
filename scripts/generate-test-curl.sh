#!/bin/bash

echo "Copy and paste this command after clicking 'Execute workflow' in n8n:"
echo ""
echo "curl -X POST http://localhost:5678/webhook-test/ideaforge/hackernews-search \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -H \"X-API-Key: local-dev-api-key-12345\" \\"
echo "  -d '{\"query\": \"react performance\", \"sessionId\": \"test-$(date +%s)\"}'"
echo "" 