import { Command } from 'commander';
import { BaseCommand } from './base-command';
import { VersionHelper } from '../../utils/version-helper';
import { AIModel, AI_MODELS } from '../../config';
import { AgentRunner } from '../../services/agent-runner';
import { ProgressEvent, RefinementResult } from '../../types/agent-runner.types';

export class RefineCommand extends BaseCommand {
  register(program: Command): void {
    program
      .command('refine <file>')
      .description('Process user responses and refine the project analysis')
      .option('-o, --output <path>', 'output file path (defaults to input filename with version)')
      .option(
        '-m, --model <model>',
        `AI model to use (${Object.keys(AI_MODELS).join(', ')})`,
        'o3-mini'
      )
      .action(async (file: string, options: any) => {
        await this.execute(file, options);
      });
  }

  private async execute(file: string, options: any): Promise<void> {
    const progress = this.createProgress();
    
    try {
      // Validate model
      if (options.model && !AI_MODELS[options.model as AIModel]) {
        throw new Error(`Invalid model: ${options.model}. Valid options are: ${Object.keys(AI_MODELS).join(', ')}`);
      }
      
      // Create agent runner
      const agentRunner = new AgentRunner(this.fileHandler);
      
      // Connect progress events
      agentRunner.on('progress', (event: ProgressEvent) => {
        if (event.level === 'error') {
          progress.fail(event.message);
        } else if (event.level === 'warning') {
          progress.warn(event.message);
        } else {
          progress.update(event.message);
        }
      });
      
      // Handle interruption
      let interrupted = false;
      
      const handleInterrupt = async () => {
        if (interrupted) return;
        interrupted = true;
        
        console.log('\n'); // New line for clean output
        progress.update('🛑 Gracefully stopping refinement...');
        
        try {
          await agentRunner.interrupt();
          progress.warn('⚠️  Refinement interrupted - partial results may be saved');
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
      
      // Start refinement
      progress.start('🔄 Starting refinement with user feedback...');
      
      const result = await agentRunner.refine(file, {
        modelName: options.model
      });
      
      // Clean up
      process.removeListener('SIGINT', handleInterrupt);
      process.removeListener('SIGTERM', handleInterrupt);
      
      // Generate output path
      const outputPath = options.output || 
        VersionHelper.generateVersionedPath(file, result.refinementIteration);
      
      // Save results
      progress.update('💾 Saving refined analysis...');
      
      // Convert to ParsedDocumentData format for compatibility
      const exportData = {
        metadata: result.metadata || {
          title: 'IdeaForge Analysis',
          author: 'IdeaForge AI',
          date: new Date().toISOString()
        },
        projectOverview: result.researchSynthesis || '',
        userStories: result.userStories,
        requirements: result.requirements,
        brainstormIdeas: result.brainstormIdeas,
        questionsAnswers: result.questionsAnswers,
        
        // Enhanced results from LangGraph
        moscowAnalysis: result.moscowAnalysis,
        kanoAnalysis: result.kanoAnalysis,
        dependencies: result.dependencies,
        suggestions: result.suggestions,
        alternativeIdeas: result.alternativeIdeas,
        
        // Refinement specific
        changelog: result.changelog,
        refinementIteration: result.refinementIteration,
        changesApplied: result.changesApplied,
        
        // Fields required by ParsedDocumentData but not in results
        technologyChoices: [],
        notes: [],
        questions: [],
        researchSubjects: [],
        
        // Metadata for compatibility
        validationScore: 100,
        parsingErrors: []
      } as any;
      
      await this.fileHandler.writeDocument(exportData, outputPath, 'orgmode');
      
      // Success
      progress.succeed(`✅ Refinement complete! Results saved to: ${outputPath}`);
      
      // Show refinement summary
      this.showRefinementSummary(result);
      
    } catch (error: any) {
      if (error.message.includes('interrupted')) {
        progress.warn('⚠️  Refinement was interrupted');
      } else if (error.message.includes('No previous analysis')) {
        progress.fail('❌ No previous analysis found');
        console.error('\n💡 Tip: Run "ideaforge analyze" on this file first\n');
      } else {
        progress.fail('❌ Refinement failed');
      }
      this.handleError(error);
    }
  }
  
  private showRefinementSummary(result: RefinementResult): void {
    console.log('\n🔄 Refinement Summary:');
    console.log(`   • Iteration: #${result.refinementIteration}`);
    console.log(`   • Changes Applied: ${result.changesApplied.length}`);
    
    if (result.changesApplied.length > 0) {
      console.log('\n📝 Changes:');
      result.changesApplied.forEach(change => {
        console.log(`   • ${change}`);
      });
    }
    
    console.log(`\n⏱️  Refinement completed in ${(result.executionTime / 1000).toFixed(1)}s\n`);
  }
} 