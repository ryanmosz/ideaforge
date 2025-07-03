# Task 3.0 - Build CLI Framework and Command Structure - Detailed Implementation Guide

## Overview

This task connects IdeaForge's parsing capabilities to the user through a command-line interface. The implementation builds on the existing parser and file handler from Tasks 1.0 and 2.0.

## Relevant Files

### Existing Files to Modify
- ✅ `src/cli/index.ts` - Main CLI entry point (UPDATED - simplified without verbose/quiet/no-emoji)
- `src/utils/error-handler.ts` - Enhance with CLI-specific error formatting

### New Files to Create
- ✅ `src/cli/commands/base-command.ts` - Abstract base class for all commands (COMPLETE)
- `src/cli/commands/analyze.ts` - Analyze command implementation
- `src/cli/commands/refine.ts` - Refine command implementation
- `src/cli/commands/export.ts` - Export command implementation
- `src/cli/commands/visualize.ts` - Visualization command stubs
- ✅ `src/cli/progress-manager.ts` - Progress display management (COMPLETE)
- `src/cli/progress-messages.ts` - Standard progress message templates
- `src/utils/version-helper.ts` - Version number utilities
- ✅ `src/cli/types.ts` - TypeScript interfaces for CLI (COMPLETE)

### Test Files to Create
- `tests/cli/commands/analyze.test.ts` - Analyze command tests
- `tests/cli/commands/refine.test.ts` - Refine command tests
- `tests/cli/commands/export.test.ts` - Export command tests
- `tests/cli/commands/visualize.test.ts` - Visualization command tests
- ✅ `tests/cli/progress-manager.test.ts` - Progress manager tests (COMPLETE - 17 tests)
- `tests/utils/version-helper.test.ts` - Version helper tests

### Mock Files Created
- ✅ `tests/__mocks__/ora.ts` - Mock for ora ESM module (COMPLETE)
- ✅ `tests/__mocks__/chalk.ts` - Mock for chalk ESM module (COMPLETE)

### Configuration Modified
- ✅ `jest.config.js` - Added moduleNameMapper for ESM module mocks (COMPLETE)

## Implementation Sequence

Follow this order for optimal development flow:
1. **3.6** → **3.1** → **3.2** → **3.4** → **3.3** → **3.5**

## Detailed Subtask Implementation

### 3.1 - Implement main CLI entry point with Commander.js

**Purpose**: Create the foundation for all CLI commands with proper option handling.

**Dependencies**:
- Commander.js 11.1.0 (already installed)
- Progress manager from 3.6 (implement first)

**Implementation Steps**:

1. **Update `src/cli/index.ts`**:
```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { AnalyzeCommand } from './commands/analyze';
import { RefineCommand } from './commands/refine';
import { ExportCommand } from './commands/export';
import { VisualizeCommand } from './commands/visualize';
import { ProgressManager } from './progress-manager';
import { FileHandler } from '../services/file-handler';
import { ErrorHandler } from '../utils/error-handler';
import { CommandContext } from './types';

const program = new Command();

// Set up program metadata
program
  .name('ideaforge')
  .description('Transform project ideas into actionable plans using MoSCoW and Kano frameworks')
  .version('1.0.0', '-V, --version', 'output the version number')
  .option('-v, --verbose', 'show detailed progress messages')
  .option('-q, --quiet', 'suppress all but error messages')
  .option('--no-emoji', 'disable emoji in output messages');

// Parse global options early
program.parse(process.argv);
const opts = program.opts();

// Create shared context
const context: CommandContext = {
  fileHandler: new FileHandler(),
  progressManager: new ProgressManager({
    verbose: opts.verbose,
    quiet: opts.quiet,
    noEmoji: !opts.emoji
  }),
  errorHandler: new ErrorHandler()
};

// Register all commands
new AnalyzeCommand(context).register(program);
new RefineCommand(context).register(program);
new ExportCommand(context).register(program);
new VisualizeCommand(context).register(program);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

// Parse and execute
program.parse();
```

2. **Create `src/cli/types.ts`**:
```typescript
export interface CommandContext {
  fileHandler: FileHandler;
  progressManager: ProgressManager;
  errorHandler: ErrorHandler;
}

export interface ProgressOptions {
  verbose: boolean;
  quiet: boolean;
  noEmoji: boolean;
}
```

3. **Create base command class `src/cli/commands/base-command.ts`**:
```typescript
import { Command } from 'commander';
import { CommandContext } from '../types';
import { ProgressManager } from '../progress-manager';
import { FileHandler } from '../../services/file-handler';
import { ErrorHandler } from '../../utils/error-handler';

export abstract class BaseCommand {
  protected fileHandler: FileHandler;
  protected progressManager: ProgressManager;
  protected errorHandler: ErrorHandler;

  constructor(protected context: CommandContext) {
    this.fileHandler = context.fileHandler;
    this.progressManager = context.progressManager;
    this.errorHandler = context.errorHandler;
  }

  abstract register(program: Command): void;
  
  protected createProgress() {
    return this.progressManager;
  }
  
  protected handleError(error: any): void {
    this.errorHandler.handle(error);
    process.exit(1);
  }
}
```

**Testing**:
```bash
# After implementation
./bin/ideaforge --help        # Should show all commands
./bin/ideaforge --version     # Should show 1.0.0
./bin/ideaforge analyze       # Should show error about missing file argument
```

**Common Issues**:
- Ensure shebang line is present for Unix systems
- Check file permissions on bin/ideaforge
- Remember to handle the case when no command is provided

### 3.2 - Create analyze command for initial processing

**Purpose**: Main command that processes org-mode templates through the parsing pipeline.

**Implementation**:

1. **Create `src/cli/commands/analyze.ts`**:
```typescript
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
      
      // Show validation results
      if (data.validationScore !== undefined) {
        progress.update(`✓ Document validated (score: ${data.validationScore}/100)`);
      } else {
        progress.update('✓ Document parsed successfully');
      }
      
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
    if (data.brainstormingIdeas?.length) {
      parts.push(`${data.brainstormingIdeas.length} ideas`);
    }
    return parts.join(', ') || 'no data';
  }
}
```

2. **Create test file `tests/cli/commands/analyze.test.ts`**:
```typescript
import { AnalyzeCommand } from '../../../src/cli/commands/analyze';
import { CommandContext } from '../../../src/cli/types';
import { Command } from 'commander';

describe('AnalyzeCommand', () => {
  let command: AnalyzeCommand;
  let mockContext: CommandContext;
  let program: Command;

  beforeEach(() => {
    mockContext = {
      fileHandler: {
        readOrgFile: jest.fn(),
        writeDocument: jest.fn()
      },
      progressManager: {
        start: jest.fn(),
        update: jest.fn(),
        succeed: jest.fn(),
        fail: jest.fn()
      },
      errorHandler: {
        handle: jest.fn()
      }
    } as any;
    
    command = new AnalyzeCommand(mockContext);
    program = new Command();
  });

  it('should register analyze command', () => {
    command.register(program);
    const analyzeCmd = program.commands.find(cmd => cmd.name() === 'analyze');
    expect(analyzeCmd).toBeDefined();
    expect(analyzeCmd?.description()).toContain('Analyze an org-mode project template');
  });

  // Add more tests for execute method
});
```

**Manual Testing**:
```bash
# Test with template file
./bin/ideaforge analyze ideaforge-template.org

# Test with custom output
./bin/ideaforge analyze ideaforge-template.org --output my-results.org

# Test with non-existent file
./bin/ideaforge analyze missing.org

# Test with invalid org file
echo "not an org file" > invalid.txt
./bin/ideaforge analyze invalid.txt
```

### 3.3 - Create refine command for iterative improvements

**Purpose**: Process files with :RESPONSE: tags for iterative refinement.

**Implementation**:

1. **Create `src/utils/version-helper.ts`**:
```typescript
export class VersionHelper {
  /**
   * Extract version number from filename
   * @example "project-v2.org" -> 2
   */
  static extractVersion(filename: string): number {
    const match = filename.match(/-v(\d+)\./);
    return match ? parseInt(match[1], 10) : 1;
  }

  /**
   * Generate versioned filename
   * @example ("project.org", 2) -> "project-v2.org"
   */
  static generateVersionedPath(originalPath: string, version?: number): string {
    const dir = path.dirname(originalPath);
    const ext = path.extname(originalPath);
    const base = path.basename(originalPath, ext);
    
    // Remove existing version suffix
    const cleanBase = base.replace(/-v\d+$/, '');
    
    // Determine new version
    const newVersion = version || this.extractVersion(originalPath) + 1;
    
    return path.join(dir, `${cleanBase}-v${newVersion}${ext}`);
  }
}
```

2. **Create `src/cli/commands/refine.ts`**:
```typescript
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
      
      progress.succeed(`✅ Refinement complete! Saved to: ${outputPath}`);
      
    } catch (error) {
      progress.fail('❌ Refinement failed');
      this.handleError(error);
    }
  }
  
  private countResponseTags(data: any): number {
    // This is a simplified version - in real implementation,
    // you'd traverse the document structure
    let count = 0;
    const traverse = (obj: any) => {
      if (obj && typeof obj === 'object') {
        if (obj.tags && obj.tags.includes('RESPONSE')) {
          count++;
        }
        Object.values(obj).forEach(traverse);
      }
    };
    traverse(data);
    return count;
  }
  
  private async processResponses(data: any): Promise<void> {
    // Stub for Task 4.0 - LangGraph integration
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
```

### 3.4 - Create export command with format options

**Purpose**: Export processed files to different formats (cursor/orgmode).

**Implementation**:

1. **Create `src/cli/commands/export.ts`**:
```typescript
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
      await this.fileHandler.writeDocument(data, outputPath, format);
      
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
}
```

### 3.5 - Create visualization commands (stubs)

**Purpose**: Placeholder commands for future visualization features.

**Implementation**:

1. **Create `src/cli/commands/visualize.ts`**:
```typescript
import { Command } from 'commander';
import { BaseCommand } from './base-command';

export class VisualizeCommand extends BaseCommand {
  register(program: Command): void {
    const visualize = program
      .command('visualize')
      .description('Generate visualizations from project data (coming soon)');
    
    // Flow diagram subcommand
    visualize
      .command('flow <file>')
      .description('Generate architecture flow diagram')
      .option('-f, --format <type>', 'output format (png|svg|ascii)', 'png')
      .action(async (file: string, options: any) => {
        await this.executeFlow(file, options);
      });
    
    // Tables subcommand
    visualize
      .command('tables <file>')
      .description('Extract MoSCoW/Kano tables')
      .option('-o, --output <path>', 'output file path')
      .action(async (file: string, options: any) => {
        await this.executeTables(file, options);
      });
  }

  private async executeFlow(file: string, options: any): Promise<void> {
    const progress = this.createProgress();
    progress.start('🎨 Preparing to generate flow diagram...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    progress.succeed('📊 Flow diagram generation will be available in v2.0!');
  }

  private async executeTables(file: string, options: any): Promise<void> {
    const progress = this.createProgress();
    progress.start('📊 Preparing to extract tables...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    progress.succeed('📋 Table extraction will be available in v2.0!');
  }
}
```

### 3.6 - Implement progress messaging system

**Purpose**: Centralized progress management with support for different display modes.

**Implementation**:

1. **Create `src/cli/progress-manager.ts`**:
```typescript
import ora, { Ora } from 'ora';
import chalk from 'chalk';
import { ProgressOptions } from './types';

export class ProgressManager {
  private spinner: Ora | null = null;
  private options: ProgressOptions;
  
  constructor(options: ProgressOptions) {
    this.options = options;
  }
  
  start(message: string): void {
    if (this.options.quiet) return;
    
    const text = this.formatMessage(message);
    
    if (this.isLinearMode()) {
      console.log(chalk.blue('→'), text);
    } else {
      this.spinner = ora({
        text,
        color: 'blue'
      }).start();
    }
  }
  
  update(message: string): void {
    if (this.options.quiet) return;
    
    const text = this.formatMessage(message);
    
    if (this.isLinearMode()) {
      console.log(chalk.blue('→'), text);
    } else if (this.spinner) {
      this.spinner.text = text;
    }
  }
  
  succeed(message: string): void {
    if (this.options.quiet) return;
    
    const text = this.formatMessage(message);
    
    if (this.isLinearMode()) {
      console.log(chalk.green('✓'), text);
    } else if (this.spinner) {
      this.spinner.succeed(text);
      this.spinner = null;
    }
  }
  
  fail(message: string): void {
    const text = this.formatMessage(message);
    
    if (this.isLinearMode()) {
      console.error(chalk.red('✗'), text);
    } else if (this.spinner) {
      this.spinner.fail(text);
      this.spinner = null;
    } else {
      console.error(chalk.red('✗'), text);
    }
  }
  
  warn(message: string): void {
    if (this.options.quiet) return;
    
    const text = this.formatMessage(message);
    
    if (this.spinner) {
      this.spinner.warn(text);
      this.spinner = null;
    } else {
      console.warn(chalk.yellow('⚠'), text);
    }
  }
  
  private formatMessage(message: string): string {
    if (this.options.noEmoji) {
      return this.stripEmoji(message);
    }
    return message;
  }
  
  private stripEmoji(text: string): string {
    // Remove common emoji ranges
    return text
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Misc symbols & pictographs
      .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Misc symbols
      .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
      .replace(/[\u{1F000}-\u{1F02F}]/gu, '') // Mahjong tiles
      .replace(/[\u{1F0A0}-\u{1F0FF}]/gu, '') // Playing cards
      .replace(/[\u{1F100}-\u{1F1FF}]/gu, '') // Enclosed alphanumeric
      .trim();
  }
  
  private isLinearMode(): boolean {
    return this.options.verbose || process.env.CI === 'true' || !process.stdout.isTTY;
  }
}
```

2. **Create standard messages in `src/cli/progress-messages.ts`**:
```typescript
export const ProgressMessages = {
  // Analyze command
  READING_FILE: '📄 Reading org-mode file...',
  VALIDATING: '🔍 Validating document structure...',
  EXTRACTING: '📊 Extracting project data...',
  SAVING: '💾 Saving results...',
  
  // Refine command
  READING_REFINED: '📄 Reading org-mode file with responses...',
  COUNTING_RESPONSES: '🔍 Searching for :RESPONSE: tags...',
  PROCESSING_FEEDBACK: '🔄 Processing feedback...',
  
  // Export command
  READING_SOURCE: '📄 Reading source file...',
  EXPORTING: '📝 Exporting to format...',
  
  // Success messages
  SUCCESS_GENERIC: '✅ Operation complete!',
  SUCCESS_ANALYZE: '✅ Analysis complete!',
  SUCCESS_REFINE: '✅ Refinement complete!',
  SUCCESS_EXPORT: '✅ Export complete!',
  
  // Error messages
  ERROR_GENERIC: '❌ Operation failed',
  ERROR_FILE_NOT_FOUND: '❌ File not found',
  ERROR_INVALID_FORMAT: '❌ Invalid file format'
};
```

## Testing Strategy

### Unit Test Coverage

Each subtask requires comprehensive unit tests:

1. **Progress Manager Tests** (`tests/cli/progress-manager.test.ts`):
   - Test all display modes (normal, verbose, quiet, no-emoji)
   - Test CI environment detection
   - Test emoji stripping
   - Test spinner lifecycle

2. **Command Tests**:
   - Test command registration
   - Test option parsing
   - Test error handling
   - Test success paths
   - Mock file system operations

3. **Version Helper Tests** (`tests/utils/version-helper.test.ts`):
   - Test version extraction from filenames
   - Test versioned filename generation
   - Test edge cases (no version, high versions)

### Integration Testing

Create `tests/cli/integration.test.ts`:
```typescript
describe('CLI Integration Tests', () => {
  it('should analyze a valid org file', async () => {
    // Test full command execution
  });
  
  it('should handle analyze -> export workflow', async () => {
    // Test command chaining
  });
  
  it('should handle errors gracefully', async () => {
    // Test error scenarios
  });
});
```

### Manual Testing Checklist

After implementation, verify:

```bash
# Basic commands
✓ ./bin/ideaforge --help
✓ ./bin/ideaforge --version
✓ ./bin/ideaforge analyze ideaforge-template.org
✓ ./bin/ideaforge export ideaforge-results.org -f cursor
✓ ./bin/ideaforge refine ideaforge-results.org

# Options
✓ ./bin/ideaforge analyze template.org --verbose
✓ ./bin/ideaforge analyze template.org --quiet
✓ ./bin/ideaforge analyze template.org --no-emoji

# Error cases
✓ ./bin/ideaforge analyze missing-file.org
✓ ./bin/ideaforge export results.org -f invalid
✓ ./bin/ideaforge refine file-without-responses.org

# CI environment
✓ CI=true ./bin/ideaforge analyze template.org
```

## Common Implementation Patterns

### Error Handling Pattern
```typescript
try {
  // Command logic
} catch (error) {
  progress.fail('❌ Operation failed');
  this.handleError(error);
}
```

### Progress Update Pattern
```typescript
progress.start('Starting operation...');
progress.update('Processing...');
progress.succeed('Operation complete!');
```

### File Path Resolution
```typescript
const resolvedPath = path.resolve(userProvidedPath);
const outputPath = options.output || this.generateDefaultPath(inputPath);
```

## Troubleshooting Guide

### Common Issues and Solutions

1. **"Command not found" error**:
   - Check shebang line in `src/cli/index.ts`
   - Verify executable permissions: `chmod +x bin/ideaforge`
   - Ensure `npm link` or `npm install -g` was run

2. **Progress indicators not showing**:
   - Check if running in CI environment
   - Verify terminal supports TTY
   - Test with --verbose flag

3. **File paths not resolving**:
   - Always use `path.resolve()` for user input
   - Handle both relative and absolute paths
   - Test on different operating systems

4. **Tests failing**:
   - Mock file system operations properly
   - Reset mocks between tests
   - Check for async operation handling

## Final Notes

- Keep all command files under 200 lines
- Maintain consistent error messages
- Document all public methods
- Follow the established patterns
- Test edge cases thoroughly