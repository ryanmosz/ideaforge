import { Command } from 'commander';
import { BaseCommand } from './base-command';
import { VersionHelper } from '../../utils/version-helper';
import * as path from 'path';

export class RefineCommand extends BaseCommand {
  register(program: Command): void {
    program
      .command('refine <file>')
      .description('Refine project plan based on :RESPONSE: feedback tags')
      .option('-o, --output <path>', 'output file path (auto-versioned by default)')
      .action(async (file: string, options: any) => {
        await this.execute(file, options);
      });
  }

  private async execute(file: string, options: any): Promise<void> {
    const progress = this.createProgress();
    
    try {
      progress.start('📄 Reading org-mode file with responses...');
      const data = await this.fileHandler.readOrgFile(file);
      
      // Count :RESPONSE: tags
      const responseCount = this.countResponseTags(data);
      progress.update(`🔍 Found ${responseCount} :RESPONSE: section${responseCount !== 1 ? 's' : ''}`);
      
      if (responseCount === 0) {
        progress.warn('⚠️  No :RESPONSE: tags found. Add feedback using :RESPONSE: tags and try again.');
        return;
      }
      
      // Process responses (stub for now)
      progress.update('🔄 Processing feedback...');
      await this.processResponses(data);
      
      // Generate output path
      const outputPath = options.output || VersionHelper.generateVersionedPath(file);
      
      // Save refined version
      progress.update('💾 Saving refined version...');
      await this.fileHandler.writeDocument(data, outputPath, 'orgmode');
      
      // Show info about next iteration
      progress.info(`Next iteration: Add :RESPONSE: tags to ${path.basename(outputPath)} for further refinement`);
      
      progress.succeed(`✅ Refinement complete! Saved to: ${outputPath}`);
      
    } catch (error) {
      progress.fail('❌ Refinement failed');
      this.handleError(error);
    }
  }
  
  private countResponseTags(data: any): number {
    let count = 0;
    
    // Helper function to traverse sections
    const traverseSection = (section: any) => {
      if (!section) return;
      
      // Check if this section has RESPONSE tag
      if (section.tags && Array.isArray(section.tags)) {
        if (section.tags.includes('RESPONSE')) {
          count++;
        }
      }
      
      // Traverse subsections
      if (section.subsections && Array.isArray(section.subsections)) {
        section.subsections.forEach(traverseSection);
      }
    };
    
    // Start traversal from root sections
    if (data.sections && Array.isArray(data.sections)) {
      data.sections.forEach(traverseSection);
    }
    
    return count;
  }
  
  private async processResponses(_data: any): Promise<void> {
    // Stub for Task 4.0 - LangGraph integration
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In the future, this will:
    // 1. Extract :RESPONSE: content
    // 2. Send to LangGraph for processing
    // 3. Apply refinements to the document
    // 4. Update MoSCoW/Kano scores based on feedback
  }
} 