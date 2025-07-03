#!/usr/bin/env node

/**
 * Test script for HackerNews webhook
 * Usage: node test-hn-webhook.js [query]
 */

const axios = require('axios');

// Configuration
const N8N_URL = process.env.N8N_URL || 'http://localhost:5678';
const WEBHOOK_PATH = '/webhook/ideaforge/hackernews-search';
const API_KEY = 'local-dev-api-key-12345';

// Get query from command line or use default
const query = process.argv[2] || 'typescript';

async function testHNWebhook() {
  console.log('🧪 Testing HackerNews Webhook');
  console.log('============================');
  console.log(`📍 URL: ${N8N_URL}${WEBHOOK_PATH}`);
  console.log(`🔍 Query: "${query}"`);
  console.log('');

  const payload = {
    query: query,
    sessionId: 'test-session-' + Date.now(),
    options: {
      limit: 10,
      dateRange: 'last_year',
      sortBy: 'relevance'
    }
  };

  try {
    console.log('📤 Sending request...');
    const startTime = Date.now();
    
    const response = await axios.post(
      `${N8N_URL}${WEBHOOK_PATH}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        timeout: 30000 // 30 second timeout
      }
    );

    const duration = Date.now() - startTime;
    
    console.log(`✅ Response received in ${duration}ms`);
    console.log('');
    
    // Check response structure
    if (response.data.status === 'success') {
      const data = response.data.data;
      console.log(`📊 Results: ${data.length} items`);
      console.log('');
      
      // Show first 3 results
      console.log('Top Results:');
      console.log('------------');
      data.slice(0, 3).forEach((item, index) => {
        console.log(`\n${index + 1}. ${item.title}`);
        console.log(`   Score: ${item.score} | Type: ${item.metadata.type}`);
        console.log(`   URL: ${item.url}`);
        console.log(`   ${item.content.substring(0, 100)}...`);
      });
      
      // Show metadata
      console.log('\n📈 Metadata:');
      console.log('------------');
      const meta = response.data.metadata;
      console.log(`Query: ${meta.query}`);
      console.log(`Total Hits: ${meta.totalHits}`);
      console.log(`Returned Hits: ${meta.returnedHits}`);
      console.log(`Request Duration: ${meta.requestDuration}ms`);
      console.log(`Algolia Processing: ${meta.algoliaProcessingTime}ms`);
      
    } else {
      console.log('❌ Error Response:');
      console.log(JSON.stringify(response.data, null, 2));
    }

  } catch (error) {
    console.error('❌ Request failed:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.request) {
      console.error('No response received. Is n8n running?');
      console.error(`Try: npm run n8n:local`);
    } else {
      console.error(error.message);
    }
  }
}

// Run the test
testHNWebhook().catch(console.error); 