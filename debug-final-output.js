const { AgentRunner } = require('./dist/services/agent-runner');
const { FileHandler } = require('./dist/services/file-handler');

async function debugOutput() {
  console.log('🔍 Debugging final output structure...\n');
  
  const fileHandler = new FileHandler();
  const agentRunner = new AgentRunner(fileHandler);
  
  // Set environment variable
  process.env.AI_MODEL = 'gpt-4.1';
  
  agentRunner.on('progress', () => {}); // Suppress progress
  
  try {
    const result = await agentRunner.analyze('grammarly-demo-simple.org', {
      forceNewSession: true
    });
    
    console.log('📊 Analysis Result Structure:');
    console.log('Has moscowAnalysis?', !!result.moscowAnalysis);
    console.log('Has kanoAnalysis?', !!result.kanoAnalysis);
    
    if (result.moscowAnalysis) {
      console.log('\n📋 MoSCoW Analysis:');
      console.log('Must have:', result.moscowAnalysis.must?.length || 0);
      console.log('Should have:', result.moscowAnalysis.should?.length || 0);
      console.log('Could have:', result.moscowAnalysis.could?.length || 0);
      console.log('Won\'t have:', result.moscowAnalysis.wont?.length || 0);
      
      // Show a sample
      if (result.moscowAnalysis.must?.length > 0) {
        console.log('\nFirst MUST item:', JSON.stringify(result.moscowAnalysis.must[0], null, 2));
      }
    }
    
    if (result.kanoAnalysis) {
      console.log('\n📈 Kano Analysis:');
      console.log('Basic:', result.kanoAnalysis.basic?.length || 0);
      console.log('Performance:', result.kanoAnalysis.performance?.length || 0);
      console.log('Excitement:', result.kanoAnalysis.excitement?.length || 0);
    }
    
    // Check research synthesis
    console.log('\n📚 Research Synthesis:', result.researchSynthesis ? 'Present' : 'Missing');
    if (result.researchSynthesis) {
      console.log('Length:', result.researchSynthesis.length, 'characters');
      console.log('Preview:', result.researchSynthesis.substring(0, 100) + '...');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugOutput(); 