#!/usr/bin/env node

console.log(`
📋 Testing HackerNews V2 Workflow
=================================

1. First, import the workflow:
   - In n8n, go to Workflows
   - Click "Add workflow" → "Import from File" 
   - Select: n8n-workflows/hackernews-search-v2.json
   - Save and activate it

2. Delete the old workflow:
   - Find the old "IdeaForge - HackerNews Search" 
   - Delete it to avoid conflicts

3. Test the V2 workflow:
`);

// Test the webhook
const testWebhook = async () => {
  try {
    const response = await fetch('http://localhost:5678/webhook-test/ideaforge/hackernews-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'local-dev-api-key-12345'
      },
      body: JSON.stringify({
        query: 'react performance',
        sessionId: 'test-v2-' + Date.now()
      })
    });

    const data = await response.json();
    
    if (response.ok && data.status === 'success') {
      console.log('✅ V2 Workflow is working!');
      console.log(`   Found ${data.data?.length || 0} results`);
      if (data.data && data.data[0]) {
        console.log(`   Top result: "${data.data[0].title}"`);
      }
    } else {
      console.log('❌ Error:', data.error || data.message || 'Unknown error');
    }
  } catch (error) {
    console.log('❌ Connection error:', error.message);
    console.log('   Make sure n8n is running and the workflow is active');
  }
};

// Run the test
setTimeout(testWebhook, 1000); 