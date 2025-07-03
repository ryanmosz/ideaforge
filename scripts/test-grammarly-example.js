#!/usr/bin/env node

/**
 * Test script for IdeaForge with Grammarly Clone Example
 * 
 * This script demonstrates analyzing a marketing-focused writing assistant project
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function runTest() {
  console.log('\n🧪 Testing IdeaForge with Grammarly Clone Example\n');
  
  const exampleFile = 'example-grammarly-clone.org';
  const outputFile = 'grammarly-analysis.org';
  
  try {
    // Step 1: Verify example file exists
    if (!fs.existsSync(exampleFile)) {
      console.error(`❌ Example file ${exampleFile} not found!`);
      process.exit(1);
    }
    console.log(`✓ Found ${exampleFile}\n`);
    
    // Step 2: Show what we're analyzing
    console.log('📄 Project Summary:');
    console.log('  - Target: Marketing professionals');
    console.log('  - Key Feature: AI-powered tone transformation');
    console.log('  - Differentiator: Persuasion enhancement\n');
    
    // Step 3: Build the project
    console.log('🔨 Building IdeaForge...');
    try {
      execSync('npm run build', { stdio: 'pipe' });
      console.log('✓ Build successful\n');
    } catch (error) {
      console.error('❌ Build failed!');
      console.log('Run "npm run build" to see detailed errors\n');
      process.exit(1);
    }
    
    // Step 4: Run analysis WITHOUT research (faster for testing)
    console.log('🤖 Running AI Analysis (without external research)...\n');
    console.log(`$ ideaforge analyze ${exampleFile} --output ${outputFile}\n`);
    
    try {
      execSync(`node ./bin/ideaforge analyze ${exampleFile} --output ${outputFile}`, {
        stdio: 'inherit'
      });
      console.log('\n✓ Analysis complete!\n');
    } catch (error) {
      console.error('\n❌ Analysis failed!');
      
      // Check for specific error messages
      if (error.message && error.message.includes('N8N_WEBHOOK_URL')) {
        console.log('\n⚠️  Missing n8n configuration. This is optional for basic analysis.');
        console.log('To fix:');
        console.log('  1. Copy env.example to .env: cp env.example .env');
        console.log('  2. Add at minimum: N8N_WEBHOOK_URL=http://localhost:5678/webhook/ideaforge');
        console.log('  3. Or disable research features by not using --research flag\n');
      } else {
        console.log('\nTroubleshooting:');
        console.log('  1. Check if OpenAI API key is set in .env');
        console.log('  2. Ensure all dependencies are installed');
        console.log('  3. Run "npm run build" if you haven\'t already\n');
      }
      process.exit(1);
    }
    
    // Step 5: Show what was generated
    if (fs.existsSync(outputFile)) {
      console.log('📊 Analysis Highlights:\n');
      
      // Read first few lines to show a preview
      const content = fs.readFileSync(outputFile, 'utf8');
      const lines = content.split('\n');
      
      // Look for MoSCoW section
      const moscowIndex = lines.findIndex(line => line.includes('MoSCoW Analysis'));
      if (moscowIndex !== -1) {
        console.log('MoSCoW Prioritization found! ✓');
      }
      
      // Look for AI suggestions
      const aiIndex = lines.findIndex(line => line.includes('AI Suggestions') || line.includes('Recommendations'));
      if (aiIndex !== -1) {
        console.log('AI Recommendations found! ✓');
      }
      
      console.log(`\nFull analysis saved to: ${outputFile}\n`);
    }
    
    // Step 6: Test with research (optional)
    console.log('💡 To test with external research:');
    console.log('   1. Start n8n: npm run n8n:local');
    console.log(`   2. Run: ideaforge analyze ${exampleFile} --research --output ${outputFile}\n`);
    
    // Step 7: Show export options
    console.log('📤 Export Options:');
    console.log(`   - Markdown: ideaforge export ${outputFile} --format markdown`);
    console.log(`   - JSON: ideaforge export ${outputFile} --format json`);
    console.log(`   - Cursor Tasks: ideaforge export ${outputFile} --format cursor\n`);
    
    // Step 8: Additional analysis options
    console.log('🔄 Refinement Options:');
    console.log(`   1. Edit ${outputFile} and add :RESPONSE: tags`);
    console.log(`   2. Run: ideaforge refine ${outputFile} --output ${outputFile.replace('.org', '-v2.org')}`);
    console.log(`   3. Generate flow diagram: ideaforge flow ${outputFile}\n`);
    
    console.log('🎉 Test successful! Your Grammarly clone has been analyzed.\n');
    
    // Optional: Show a snippet of interesting findings
    console.log('💡 Expected Insights:');
    console.log('  • Tone transformation identified as high-value differentiator');
    console.log('  • Persuasion enhancement ranked as MUST have feature');
    console.log('  • Marketing-specific metrics suggested for success tracking');
    console.log('  • Real-time AI processing architecture recommended\n');
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run the test
runTest(); 