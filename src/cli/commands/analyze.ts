import { Command } from 'commander';
import { BaseCommand } from './base-command';
import * as path from 'path';
import { AIModel, AI_MODELS } from '../../config';
import { AgentRunner } from '../../services/agent-runner';
import { ProgressEvent } from '../../types/agent-runner.types';

export class AnalyzeCommand extends BaseCommand {
  register(program: Command): void {
    program
      .command('analyze <file>')
      .description('Analyze an org-mode project template with AI-powered insights')
      .option('-o, --output <path>', 'output file path', 'ideaforge-results.org')
      .option(
        '-m, --model <model>',
        `AI model to use (${Object.keys(AI_MODELS).join(', ')})`,
        'o3-mini'
      )
      .option('--fresh', 'start fresh analysis (ignore previous sessions)')
      .action(async (file: string, options: any) => {
        await this.execute(file, options);
      });
  }

  private async execute(file: string, options: any): Promise<void> {
    const progress = this.createProgress();
    
    try {
      // Validate model option
      if (options.model && !AI_MODELS[options.model as AIModel]) {
        throw new Error(`Invalid model: ${options.model}. Valid options are: ${Object.keys(AI_MODELS).join(', ')}`);
      }
      
      // Create agent runner
      const agentRunner = new AgentRunner(this.fileHandler);
      
      // Connect progress events
      let lastNode = '';
      agentRunner.on('progress', (event: ProgressEvent) => {
        // Update spinner with node-specific messages
        if (event.node !== lastNode) {
          lastNode = event.node;
          
          if (event.level === 'error') {
            progress.fail(event.message);
          } else if (event.level === 'warning') {
            progress.warn(event.message);
          } else {
            progress.update(event.message);
          }
        }
      });
      
      // Handle interruption
      let interrupted = false;
      
      const handleInterrupt = async () => {
        if (interrupted) return;
        interrupted = true;
        
        console.log('\n'); // New line for clean output
        progress.update('🛑 Gracefully stopping analysis...');
        
        try {
          await agentRunner.interrupt();
          progress.warn('⚠️  Analysis interrupted - partial results may be saved');
        } catch (error) {
          progress.fail('❌ Failed to stop gracefully');
        }
        
        // Give time for cleanup
        setTimeout(() => {
          process.exit(1);
        }, 2000);
      };
      
      process.once('SIGINT', handleInterrupt);
      process.once('SIGTERM', handleInterrupt);
      
      // Ensure cleanup on exit
      process.once('beforeExit', () => {
        process.removeListener('SIGINT', handleInterrupt);
        process.removeListener('SIGTERM', handleInterrupt);
      });
      
      // Start analysis
      progress.start('🤖 Starting AI-powered analysis...');
      
      const result = await agentRunner.analyze(file, {
        modelName: options.model,
        forceNewSession: options.fresh
      });
      
      // Save results
      progress.update('💾 Saving analysis results...');
      const outputPath = path.resolve(options.output);
      
      // DEBUG: Log the MoSCoW and Kano data before export
      if (process.env.DEBUG) {
        console.log('\n[DEBUG] Analysis result:');
        console.log('- MoSCoW:', result.moscowAnalysis ? {
          must: result.moscowAnalysis.must?.length || 0,
          should: result.moscowAnalysis.should?.length || 0,
          could: result.moscowAnalysis.could?.length || 0,
          wont: result.moscowAnalysis.wont?.length || 0
        } : 'null');
        console.log('- Kano:', result.kanoAnalysis ? {
          basic: result.kanoAnalysis.basic?.length || 0,
          performance: result.kanoAnalysis.performance?.length || 0,
          excitement: result.kanoAnalysis.excitement?.length || 0
        } : 'null');
      }
      
      // Convert to ParsedDocumentData format for compatibility
      const exportData = {
        metadata: result.metadata || {
          title: 'IdeaForge Analysis',
          author: 'IdeaForge AI',
          date: new Date().toISOString()
        },
        projectOverview: result.researchSynthesis || '',
        // Transform user stories to match expected format
        userStories: result.userStories.map((story: any) => ({
          role: story.actor, // Map actor -> role
          action: story.action,
          benefit: story.benefit,
          rawText: `As a ${story.actor}, I want to ${story.action}, so that ${story.benefit}`
        })),
        // Transform requirements to match expected format
        requirements: result.requirements.map((req: any) => {
          // Find which MoSCoW category this requirement is in
          let moscowType = 'MUST'; // Default
          if (result.moscowAnalysis) {
            if (result.moscowAnalysis.should.some((r: any) => r.id === req.id)) {
              moscowType = 'SHOULD';
            } else if (result.moscowAnalysis.could.some((r: any) => r.id === req.id)) {
              moscowType = 'COULD';
            } else if (result.moscowAnalysis.wont.some((r: any) => r.id === req.id)) {
              moscowType = 'WONT';
            }
          }
          
          return {
            id: req.id,
            text: req.title || req.description, // Use title as text
            description: req.description,
            moscowType: { type: moscowType }, // Set proper MoSCoW type
            category: 'functional' as const // Default for now
          };
        }),
        // Transform brainstorm ideas to match expected format
        brainstormIdeas: result.brainstormIdeas.map((idea: any) => ({
          category: idea.category || 'General',
          text: idea.description || idea.title  // Use full description first
        })),
        questionsAnswers: result.questionsAnswers,
        
        // Enhanced results from LangGraph
        moscowAnalysis: result.moscowAnalysis,
        kanoAnalysis: result.kanoAnalysis,
        dependencies: result.dependencies,
        suggestions: result.suggestions,
        alternativeIdeas: result.alternativeIdeas,
        
        // Fields required by ParsedDocumentData but not in results
        technologyChoices: [],
        notes: [],
        questions: [],
        researchSubjects: [],
        
        // Metadata for compatibility
        validationScore: 100,
        parsingErrors: [],
        changelog: []
      } as any;
      
      await this.fileHandler.writeDocument(exportData, outputPath, 'orgmode');
      
      // Success message
      progress.succeed(`✅ Analysis complete! Results saved to: ${outputPath}`);
      
      // Show summary
      this.showAnalysisSummary(result);
      
    } catch (error: any) {
      if (error.message.includes('interrupted')) {
        progress.warn('⚠️  Analysis was interrupted');
      } else {
        progress.fail('❌ Analysis failed');
      }
      this.handleError(error);
    }
  }
  
  private showAnalysisSummary(result: any): void {
    console.log('\n📊 Analysis Summary:');
    console.log(`   • Requirements: ${result.requirements.length}`);
    console.log(`   • User Stories: ${result.userStories.length}`);
    console.log(`   • Ideas Analyzed: ${result.brainstormIdeas.length}`);
    
    if (result.moscowAnalysis) {
      const { must, should, could, wont } = result.moscowAnalysis;
      console.log(`   • MoSCoW: ${must.length} Must, ${should.length} Should, ${could.length} Could, ${wont.length} Won't`);
    }
    
    if (result.dependencies && result.dependencies.length > 0) {
      console.log(`   • Dependencies: ${result.dependencies.length} relationships identified`);
    }
    
    if (result.suggestions && result.suggestions.length > 0) {
      console.log(`   • Suggestions: ${result.suggestions.length} improvements proposed`);
    }
    
    console.log(`\n⏱️  Analysis completed in ${(result.executionTime / 1000).toFixed(1)}s`);
    console.log(`🔍 Nodes executed: ${result.nodesExecuted.join(' → ')}\n`);
  }
} 