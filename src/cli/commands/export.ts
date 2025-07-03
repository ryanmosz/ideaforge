import { Command } from 'commander';
import { BaseCommand } from './base-command';
import * as path from 'path';

export class ExportCommand extends BaseCommand {
  private readonly FORMATS = ['cursor', 'orgmode'];
  
  register(program: Command): void {
    program
      .command('export <file>')
      .description('Export project plan to different formats (cursor or orgmode)')
      .option('-f, --format <type>', 'output format (cursor|orgmode)', 'cursor')
      .option('-o, --output <path>', 'output file path')
      .action(async (file: string, options: any) => {
        await this.execute(file, options);
      });
  }

  private async execute(file: string, options: any): Promise<void> {
    const progress = this.createProgress();
    const format = options.format.toLowerCase();
    
    // Validate format
    if (!this.FORMATS.includes(format)) {
      this.handleError(new Error(
        `Invalid format: ${format}. Supported formats: ${this.FORMATS.join(', ')}`
      ));
      return;
    }
    
    try {
      progress.start('📄 Reading source file...');
      const data = await this.fileHandler.readOrgFile(file);
      
      // Generate output path if not provided
      const outputPath = options.output || this.generateExportPath(file, format);
      
      progress.update(`📝 Exporting to ${format} format...`);
      const result = await this.fileHandler.writeDocument(data, outputPath, format);
      
      // Show statistics if available
      if (result.statistics) {
        progress.info(this.formatStatistics(result.statistics, format));
      }
      
      const emoji = format === 'cursor' ? '📋' : '📄';
      progress.succeed(`${emoji} Exported successfully to: ${outputPath}`);
      
    } catch (error) {
      progress.fail('❌ Export failed');
      this.handleError(error);
    }
  }
  
  private generateExportPath(inputFile: string, format: string): string {
    const dir = path.dirname(inputFile);
    const base = path.basename(inputFile, path.extname(inputFile));
    const ext = format === 'cursor' ? '.md' : '.org';
    return path.join(dir, `${base}-export${ext}`);
  }
  
  private formatStatistics(stats: Record<string, number>, format: string): string {
    if (format === 'cursor') {
      const parts = [];
      if (stats.totalTasks !== undefined) {
        parts.push(`${stats.totalTasks} tasks`);
      }
      if (stats.userStoryTasks !== undefined) {
        parts.push(`${stats.userStoryTasks} user story tasks`);
      }
      if (stats.requirementTasks !== undefined) {
        parts.push(`${stats.requirementTasks} requirement tasks`);
      }
      return `Generated: ${parts.join(', ')}`;
    } else {
      const parts = [];
      if (stats.sections !== undefined) {
        parts.push(`${stats.sections} sections`);
      }
      if (stats.words !== undefined) {
        parts.push(`${stats.words} words`);
      }
      return `Document stats: ${parts.join(', ')}`;
    }
  }
} 