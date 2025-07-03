#!/usr/bin/env node

/**
 * Quick verification script to check if HN webhook is using updated workflow
 */

const axios = require('axios');

async function verifyWorkflow() {
  const payload = {
    query: "test",
    sessionId: "verify-" + Date.now(),
    options: { limit: 1 }
  };

  try {
    const response = await axios.post(
      'http://localhost:5678/webhook/ideaforge/hackernews-search',
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'local-dev-api-key-12345'
        }
      }
    );

    const data = response.data;
    
    // Check for expected fields from updated workflow
    if (data.status && data.data && data.metadata) {
      console.log('✅ Updated workflow is active!');
      console.log(`   - Status: ${data.status}`);
      console.log(`   - Results: ${data.data.length} items`);
      console.log(`   - Has metadata: ${!!data.metadata.algoliaProcessingTime}`);
    } else if (data.processedAt && data.authenticated) {
      console.log('❌ Old workflow is still active');
      console.log('   Please re-import n8n-workflows/hackernews-search.json');
    } else {
      console.log('⚠️  Unexpected response format');
      console.log(JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verifyWorkflow(); 