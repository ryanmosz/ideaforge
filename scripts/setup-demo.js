#!/usr/bin/env node

/**
 * Quick setup script for IdeaForge demo
 * Helps users get started with minimal configuration
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n🚀 IdeaForge Demo Setup\n');

// Check if .env already exists
if (fs.existsSync('.env')) {
  console.log('✓ .env file already exists');
  console.log('\nTo run the demo:');
  console.log('  npm run demo           # Full demo with sample project');
  console.log('  npm run test:grammarly # Test with Grammarly clone example\n');
  process.exit(0);
}

console.log('This script will help you set up IdeaForge for demo purposes.\n');

// Create minimal .env content
const minimalEnv = `# IdeaForge Demo Configuration
# Minimal setup - only OpenAI API key is required

# REQUIRED: Your OpenAI API key
OPENAI_API_KEY=

# Optional: n8n configuration (only needed for external research features)
# N8N_WEBHOOK_URL=http://localhost:5678/webhook/ideaforge
`;

// Ask for OpenAI API key
rl.question('Enter your OpenAI API key (or press Enter to add it manually later): ', (apiKey) => {
  let envContent = minimalEnv;
  
  if (apiKey && apiKey.trim()) {
    envContent = envContent.replace('OPENAI_API_KEY=', `OPENAI_API_KEY=${apiKey.trim()}`);
    console.log('\n✓ API key added to configuration');
  } else {
    console.log('\n⚠️  You\'ll need to add your OpenAI API key to .env before running the demo');
  }
  
  // Write .env file
  fs.writeFileSync('.env', envContent);
  console.log('✓ Created .env file');
  
  // Build the project
  console.log('\n🔨 Building the project...');
  const { execSync } = require('child_process');
  
  try {
    execSync('npm run build', { stdio: 'pipe' });
    console.log('✓ Build successful');
  } catch (error) {
    console.log('⚠️  Build failed - run "npm run build" manually to see errors');
  }
  
  console.log('\n🎉 Setup complete!\n');
  console.log('Next steps:');
  
  if (!apiKey || !apiKey.trim()) {
    console.log('  1. Edit .env and add your OpenAI API key');
    console.log('  2. Run: npm run demo');
  } else {
    console.log('  1. Run: npm run demo           # Full demo');
    console.log('  2. Run: npm run test:grammarly # Grammarly clone example');
  }
  
  console.log('\nDemo commands:');
  console.log('  npm run demo           - Run full IdeaForge demo');
  console.log('  npm run test:grammarly - Test with marketing-focused Grammarly clone');
  console.log('\nFor more options, see README.md\n');
  
  rl.close();
}); 