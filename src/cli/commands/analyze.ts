import { Command } from 'commander';
import { BaseCommand } from './base-command';
import * as path from 'path';

export class AnalyzeCommand extends BaseCommand {
  register(program: Command): void {
    program
      .command('analyze <file>')
      .description('Analyze an org-mode project template and extract structured data')
      .option('-o, --output <path>', 'output file path', 'ideaforge-results.org')
      .action(async (file: string, options: any) => {
        await this.execute(file, options);
      });
  }

  private async execute(file: string, options: any): Promise<void> {
    const progress = this.createProgress();
    
    try {
      // Start progress
      progress.start('📄 Reading org-mode file...');
      
      // Read and parse file
      const data = await this.fileHandler.readOrgFile(file);
      
      // Show successful parsing
      progress.update('✓ Document parsed successfully');
      
      // Extract data
      progress.update('🔍 Extracting project data...');
      const stats = this.getDataStats(data);
      progress.update(`📊 Found: ${stats}`);
      
      // Save results
      progress.update('💾 Saving analysis results...');
      const outputPath = path.resolve(options.output);
      await this.fileHandler.writeDocument(data, outputPath, 'orgmode');
      
      // Success
      progress.succeed(`✅ Analysis complete! Results saved to: ${outputPath}`);
      
    } catch (error) {
      progress.fail('❌ Analysis failed');
      this.handleError(error);
    }
  }
  
  private getDataStats(data: any): string {
    const parts = [];
    if (data.userStories?.length) {
      parts.push(`${data.userStories.length} user stories`);
    }
    if (data.requirements?.length) {
      parts.push(`${data.requirements.length} requirements`);
    }
    if (data.brainstormIdeas?.length) {
      parts.push(`${data.brainstormIdeas.length} ideas`);
    }
    return parts.join(', ') || 'no data';
  }
} 