#!/usr/bin/env node

/**
 * Script to detect and fix n8n workflow issues before demo
 */

const axios = require('axios');
const { execSync } = require('child_process');

const COLORS = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  RESET: '\x1b[0m'
};

async function checkWorkflowStatus() {
  console.log(`${COLORS.BLUE}🔍 Checking n8n workflow status...${COLORS.RESET}\n`);
  
  // Check if n8n is running
  try {
    await axios.get('http://localhost:5678/healthz');
    console.log(`${COLORS.GREEN}✓ n8n is running${COLORS.RESET}`);
  } catch (error) {
    console.log(`${COLORS.RED}❌ n8n is not running!${COLORS.RESET}`);
    console.log(`   Run: docker start n8n`);
    console.log(`   Or: npm run n8n:local`);
    process.exit(1);
  }
  
  // Test HackerNews workflow
  const testPayload = {
    query: "test",
    sessionId: "fix-check-" + Date.now(),
    options: { limit: 1 }
  };
  
  try {
    const response = await axios.post(
      'http://localhost:5678/webhook/ideaforge/hackernews-search',
      testPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'local-dev-api-key-12345'
        }
      }
    );
    
    const data = response.data;
    
    // Check if old workflow is active
    if (data.processedAt && data.authenticated) {
      console.log(`${COLORS.RED}❌ Old echo workflow detected!${COLORS.RESET}`);
      console.log(`   The workflow is just echoing back the request.\n`);
      return false;
    } else if (data.status && data.data && data.metadata) {
      console.log(`${COLORS.GREEN}✓ Correct workflow is active!${COLORS.RESET}`);
      console.log(`   Research features are ready.\n`);
      return true;
    } else {
      console.log(`${COLORS.YELLOW}⚠️  Unknown workflow format${COLORS.RESET}`);
      console.log(JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log(`${COLORS.RED}❌ No workflow found at webhook URL${COLORS.RESET}`);
      console.log(`   Workflows need to be imported.\n`);
    } else {
      console.log(`${COLORS.RED}❌ Error testing workflow: ${error.message}${COLORS.RESET}\n`);
    }
    return false;
  }
}

function showFixInstructions() {
  console.log(`${COLORS.YELLOW}📋 To fix this issue:${COLORS.RESET}\n`);
  
  console.log(`${COLORS.BLUE}Step 1: Open n8n UI${COLORS.RESET}`);
  console.log(`   open http://localhost:5678\n`);
  
  console.log(`${COLORS.BLUE}Step 2: Remove old workflows${COLORS.RESET}`);
  console.log(`   1. Click on "Workflows" in the left sidebar`);
  console.log(`   2. Look for any IdeaForge-related workflows`);
  console.log(`   3. Delete or deactivate them (click workflow → trash icon)\n`);
  
  console.log(`${COLORS.BLUE}Step 3: Import new workflows${COLORS.RESET}`);
  console.log(`   1. Click "Add workflow" → "Import from File"`);
  console.log(`   2. Import these files:`);
  console.log(`      • ${process.cwd()}/n8n-workflows/hackernews-search.json`);
  console.log(`      • ${process.cwd()}/n8n-workflows/reddit-search.json`);
  console.log(`      • ${process.cwd()}/n8n-workflows/health-check.json\n`);
  
  console.log(`${COLORS.BLUE}Step 4: Activate workflows${COLORS.RESET}`);
  console.log(`   1. Click each imported workflow`);
  console.log(`   2. Toggle the "Active" switch in the top right`);
  console.log(`   3. You should see a green dot indicating it's active\n`);
  
  console.log(`${COLORS.BLUE}Step 5: Verify${COLORS.RESET}`);
  console.log(`   Run this script again: node scripts/fix-n8n-workflows.js\n`);
  
  console.log(`${COLORS.YELLOW}💡 Quick tip:${COLORS.RESET} You can also try the automated fix:`);
  console.log(`   open http://localhost:5678/workflows\n`);
}

async function offerAutomatedOpen() {
  console.log(`${COLORS.BLUE}Would you like to open n8n now? (y/n)${COLORS.RESET} `);
  
  // Simple approach for demo - in production would use readline
  console.log(`\n${COLORS.GREEN}Opening n8n UI...${COLORS.RESET}`);
  try {
    execSync('open http://localhost:5678/workflows');
  } catch (error) {
    console.log(`Please open manually: http://localhost:5678/workflows`);
  }
}

async function main() {
  console.log(`${COLORS.BLUE}=== IdeaForge n8n Workflow Fixer ===${COLORS.RESET}\n`);
  
  const isCorrect = await checkWorkflowStatus();
  
  if (!isCorrect) {
    showFixInstructions();
    await offerAutomatedOpen();
    
    console.log(`${COLORS.YELLOW}⏱️  This typically takes 5 minutes.${COLORS.RESET}`);
    console.log(`${COLORS.YELLOW}📝 Note: Research is optional - the demo works without it!${COLORS.RESET}\n`);
  } else {
    console.log(`${COLORS.GREEN}🎉 Everything is ready for the demo!${COLORS.RESET}`);
    console.log(`   Research features will enhance your demo.\n`);
    console.log(`${COLORS.BLUE}Run the demo:${COLORS.RESET}`);
    console.log(`   npm run demo:full YOUR_OPENAI_KEY`);
    console.log(`   or`);
    console.log(`   ./bin/ideaforge analyze example-grammarly-clone.org --research\n`);
  }
}

main().catch(error => {
  console.error(`${COLORS.RED}Error: ${error.message}${COLORS.RESET}`);
  process.exit(1);
}); 