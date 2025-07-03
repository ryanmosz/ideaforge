#!/usr/bin/env node

/**
 * Reddit OAuth verification script
 * Verifies that Reddit API credentials are properly configured
 */

const axios = require('axios');
const chalk = require('chalk');

// Configuration
const CLIENT_ID = process.env.REDDIT_CLIENT_ID;
const CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;
const USER_AGENT = process.env.REDDIT_USER_AGENT || 'IdeaForge/1.0';

console.log(chalk.blue.bold('Reddit OAuth Configuration Verification'));
console.log(chalk.gray('=' .repeat(50)));

// Check environment variables
function checkEnvironment() {
  console.log(chalk.yellow('\n1. Checking Environment Variables:'));
  
  const checks = [
    { 
      name: 'REDDIT_CLIENT_ID', 
      value: CLIENT_ID,
      masked: true 
    },
    { 
      name: 'REDDIT_CLIENT_SECRET', 
      value: CLIENT_SECRET,
      masked: true 
    },
    { 
      name: 'REDDIT_USER_AGENT', 
      value: USER_AGENT,
      masked: false 
    }
  ];
  
  let allPresent = true;
  
  checks.forEach(check => {
    if (check.value) {
      const displayValue = check.masked 
        ? check.value.substring(0, 4) + '...' + check.value.substring(check.value.length - 4)
        : check.value;
      console.log(chalk.green(`  ✓ ${check.name}: ${displayValue}`));
    } else {
      console.log(chalk.red(`  ✗ ${check.name}: Not set`));
      allPresent = false;
    }
  });
  
  return allPresent;
}

// Test OAuth token acquisition
async function testOAuthToken() {
  console.log(chalk.yellow('\n2. Testing OAuth Token Acquisition:'));
  
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.log(chalk.red('  ✗ Cannot test OAuth without credentials'));
    return null;
  }
  
  try {
    const authString = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    
    console.log(chalk.gray('  - Requesting access token...'));
    
    const response = await axios.post(
      'https://www.reddit.com/api/v1/access_token',
      'grant_type=client_credentials&scope=read',
      {
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': USER_AGENT
        },
        timeout: 10000
      }
    );
    
    if (response.data.access_token) {
      console.log(chalk.green('  ✓ Successfully obtained access token'));
      console.log(chalk.gray(`  - Token type: ${response.data.token_type}`));
      console.log(chalk.gray(`  - Expires in: ${response.data.expires_in} seconds`));
      console.log(chalk.gray(`  - Scope: ${response.data.scope}`));
      return response.data.access_token;
    } else {
      console.log(chalk.red('  ✗ No access token in response'));
      return null;
    }
    
  } catch (error) {
    console.log(chalk.red('  ✗ Failed to obtain access token'));
    
    if (error.response) {
      console.log(chalk.red(`  - Status: ${error.response.status}`));
      console.log(chalk.red(`  - Error: ${JSON.stringify(error.response.data, null, 2)}`));
      
      if (error.response.status === 401) {
        console.log(chalk.yellow('\n  Possible issues:'));
        console.log(chalk.yellow('  - Invalid client ID or secret'));
        console.log(chalk.yellow('  - App not properly configured on Reddit'));
      }
    } else {
      console.log(chalk.red(`  - Error: ${error.message}`));
    }
    
    return null;
  }
}

// Test API access with token
async function testApiAccess(token) {
  console.log(chalk.yellow('\n3. Testing Reddit API Access:'));
  
  if (!token) {
    console.log(chalk.red('  ✗ No token available for testing'));
    return false;
  }
  
  try {
    // Test 1: Get user info (for app)
    console.log(chalk.gray('  - Testing /api/v1/me endpoint...'));
    
    const meResponse = await axios.get('https://oauth.reddit.com/api/v1/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': USER_AGENT
      },
      timeout: 10000
    });
    
    console.log(chalk.green('  ✓ Successfully accessed /api/v1/me'));
    console.log(chalk.gray(`  - App ID: ${meResponse.data.name || 'N/A'}`));
    
    // Test 2: Get subreddit info
    console.log(chalk.gray('\n  - Testing subreddit access...'));
    
    const subredditResponse = await axios.get('https://oauth.reddit.com/r/programming/about.json', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': USER_AGENT
      },
      timeout: 10000
    });
    
    const subredditData = subredditResponse.data.data;
    console.log(chalk.green('  ✓ Successfully accessed r/programming'));
    console.log(chalk.gray(`  - Subscribers: ${subredditData.subscribers.toLocaleString()}`));
    console.log(chalk.gray(`  - Active users: ${subredditData.accounts_active?.toLocaleString() || 'N/A'}`));
    
    // Test 3: Search functionality
    console.log(chalk.gray('\n  - Testing search functionality...'));
    
    const searchResponse = await axios.get('https://oauth.reddit.com/search.json', {
      params: {
        q: 'typescript',
        limit: 5,
        sort: 'relevance'
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': USER_AGENT
      },
      timeout: 10000
    });
    
    const searchResults = searchResponse.data.data.children;
    console.log(chalk.green('  ✓ Successfully performed search'));
    console.log(chalk.gray(`  - Results found: ${searchResults.length}`));
    
    // Check rate limit headers
    const rateLimitRemaining = searchResponse.headers['x-ratelimit-remaining'];
    const rateLimitReset = searchResponse.headers['x-ratelimit-reset'];
    
    if (rateLimitRemaining) {
      console.log(chalk.gray(`  - Rate limit remaining: ${rateLimitRemaining}`));
      console.log(chalk.gray(`  - Rate limit resets: ${new Date(rateLimitReset * 1000).toLocaleTimeString()}`));
    }
    
    return true;
    
  } catch (error) {
    console.log(chalk.red('  ✗ API access test failed'));
    
    if (error.response) {
      console.log(chalk.red(`  - Status: ${error.response.status}`));
      console.log(chalk.red(`  - Error: ${error.response.data?.message || 'Unknown error'}`));
    } else {
      console.log(chalk.red(`  - Error: ${error.message}`));
    }
    
    return false;
  }
}

// Generate setup instructions
function printSetupInstructions() {
  console.log(chalk.blue.bold('\n📋 Reddit OAuth Setup Instructions:'));
  console.log(chalk.gray('=' .repeat(50)));
  
  console.log(chalk.yellow('\n1. Create a Reddit App:'));
  console.log('   - Go to: https://www.reddit.com/prefs/apps');
  console.log('   - Click "Create App" or "Create Another App"');
  console.log('   - Fill in:');
  console.log('     • Name: IdeaForge Research Bot');
  console.log('     • App type: Select "script"');
  console.log('     • Description: Research tool for gathering tech discussions');
  console.log('     • About URL: (optional)');
  console.log('     • Redirect URI: http://localhost:5678');
  console.log('   - Click "Create app"');
  
  console.log(chalk.yellow('\n2. Get Your Credentials:'));
  console.log('   - Client ID: The string under "personal use script"');
  console.log('   - Client Secret: The "secret" field');
  
  console.log(chalk.yellow('\n3. Set Environment Variables:'));
  console.log(chalk.green('   export REDDIT_CLIENT_ID="your_client_id_here"'));
  console.log(chalk.green('   export REDDIT_CLIENT_SECRET="your_client_secret_here"'));
  console.log(chalk.green('   export REDDIT_USER_AGENT="IdeaForge/1.0 (by /u/your_username)"'));
  
  console.log(chalk.yellow('\n4. Update n8n Workflow:'));
  console.log('   - Open n8n UI: http://localhost:5678');
  console.log('   - Import the Reddit workflow: n8n-workflows/reddit-search.json');
  console.log('   - Update the OAuth2 Token Manager node with your credentials');
  console.log('   - Save and activate the workflow');
  
  console.log(chalk.gray('\n' + '=' .repeat(50)));
}

// Main verification flow
async function verify() {
  // Check environment
  const envOk = checkEnvironment();
  
  if (!envOk) {
    printSetupInstructions();
    console.log(chalk.red('\n❌ Reddit OAuth verification failed: Missing credentials'));
    process.exit(1);
  }
  
  // Test OAuth
  const token = await testOAuthToken();
  
  if (!token) {
    printSetupInstructions();
    console.log(chalk.red('\n❌ Reddit OAuth verification failed: Could not obtain token'));
    process.exit(1);
  }
  
  // Test API access
  const apiOk = await testApiAccess(token);
  
  if (!apiOk) {
    console.log(chalk.red('\n❌ Reddit OAuth verification failed: API access issues'));
    process.exit(1);
  }
  
  console.log(chalk.green.bold('\n✅ Reddit OAuth verification successful!'));
  console.log(chalk.gray('Your Reddit API credentials are properly configured.'));
  console.log(chalk.gray('You can now test the webhook with: node scripts/test-reddit-webhook.js'));
}

// Run verification
verify().catch(error => {
  console.error(chalk.red('Verification failed with error:'), error);
  process.exit(1);
}); 