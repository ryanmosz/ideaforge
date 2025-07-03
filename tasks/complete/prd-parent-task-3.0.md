# Parent Task 3.0 - Build CLI Framework and Command Structure

## 1. Task Overview

### Summary
Parent Task 3.0 implements the command-line interface that connects IdeaForge's parsing capabilities to the end user. This task transforms the existing parser and file handling infrastructure into a complete, working CLI tool with intuitive commands, progress feedback, and error handling.

### Architectural Position
This component serves as the user-facing layer of IdeaForge, sitting between the user's terminal and the core parsing/processing logic:
- **Depends on**: Parent Task 1.0 (project foundation) and Parent Task 2.0 (org-mode parsing)
- **Enables**: Parent Tasks 4.0-9.0 (LangGraph integration, n8n workflows, AI analysis)
- **Integration**: Connects FileHandler, OrgModeParser, Validator, and DataExtractor through CLI commands

### Post-Completion Capabilities
After completing this task, users will be able to:
- Run `ideaforge analyze` to process org-mode templates
- Use `ideaforge refine` to iteratively improve their project plans
- Export results using `ideaforge export` in multiple formats
- See real-time progress indicators during processing
- Receive clear error messages for common issues

## 2. Technical Design

### Architecture Overview
```
CLI Entry Point (index.ts)
    ├── Command Registry (Commander.js)
    │   ├── analyze → AnalyzeCommand
    │   ├── refine → RefineCommand  
    │   ├── export → ExportCommand
    │   └── visualize → VisualizeCommand
    │
    ├── Progress Manager (Ora integration)
    │   └── Standard progress messages
    │
    └── Error Handler
        └── User-friendly error formatting
```

### Key Interfaces
```typescript
interface CommandContext {
  fileHandler: FileHandler;
  progressManager: ProgressManager;
  errorHandler: ErrorHandler;
}

interface ProgressManager {
  start(message: string): void;
  update(message: string): void;
  succeed(message: string): void;
  fail(message: string): void;
}

interface CommandResult {
  success: boolean;
  message?: string;
  data?: any;
}
```

### Integration Points
- **FileHandler**: Already built, provides `readOrgFile()` and `writeDocument()`
- **Parser Chain**: OrgModeParser → Validator → DataExtractor
- **Export Formats**: 'orgmode' and 'cursor' already supported
- **Environment Config**: Uses existing config system from Task 1.0

### Technology Considerations
- **Commander.js 11.1.0**: Main CLI framework (immutable per tech stack)
- **Ora 7.0.1**: Progress spinners (immutable per tech stack)
- **Chalk 5.3.0**: Terminal colors (immutable per tech stack)
- **Node.js CommonJS**: Module system (not ESM)

## 3. Implementation Sequence

### Rationale for Order
1. **Progress system first** - Needed by all commands for user feedback
2. **Main CLI structure** - Foundation for all commands
3. **Analyze command** - Core functionality, most complex
4. **Export command** - Simple, builds confidence
5. **Refine command** - Depends on analyze working
6. **Visualization** - Nice-to-have, can be stubbed initially

### Critical Path
3.1 → 3.6 → 3.2 → 3.4 → 3.3 → 3.5

### Parallel Opportunities
- 3.4 (export) and 3.3 (refine) can be developed in parallel after 3.2
- 3.5 (visualization) is independent once CLI structure exists

### Risk Points
- 3.2 (analyze command) - Most complex integration, test thoroughly
- 3.3 (refine command) - Depends on :RESPONSE: tag handling
- File path validation across different OS environments

## 4. Detailed Subtask Breakdown

### 3.1 Implement main CLI entry point with Commander.js

**Description**: Enhance the existing CLI entry point to properly register all commands and handle global options.

**Implementation Steps**:
1. Update `src/cli/index.ts` to import Commander.js properly
2. Define program metadata (name, version, description)
3. Register all commands with proper descriptions
4. Add global options (--verbose, --quiet, --no-emoji)
5. Implement help text customization
6. Add version command support

**Code Example**:
```typescript
import { Command } from 'commander';
import { AnalyzeCommand } from './commands/analyze';
import { ExportCommand } from './commands/export';

const program = new Command();

program
  .name('ideaforge')
  .description('Transform project ideas into actionable plans')
  .version('1.0.0')
  .option('-v, --verbose', 'show detailed progress')
  .option('-q, --quiet', 'suppress progress messages')
  .option('--no-emoji', 'use plain text progress messages');

// Register commands
new AnalyzeCommand().register(program);
new ExportCommand().register(program);

program.parse();
```

**File Changes**:
- Modify: `src/cli/index.ts`
- Create: `src/cli/commands/base-command.ts` (abstract base class)

**Testing Approach**:
- Test CLI help output: `./bin/ideaforge --help`
- Verify version display: `./bin/ideaforge --version`
- Check unknown command handling
- Test global option parsing

**Definition of Done**:
- CLI shows proper help text with all commands
- Version command works
- Global options are accessible to all commands
- Unknown commands show helpful error

**Common Pitfalls**:
- Forgetting to call `program.parse()`
- Not handling the case when no command is provided
- Incorrect path resolution for the executable

### 3.2 Create analyze command for initial processing

**Description**: Implement the main `ideaforge analyze` command that processes org-mode files through the parsing pipeline.

**Implementation Steps**:
1. Create `src/cli/commands/analyze.ts`
2. Accept file path as required argument
3. Add optional --output flag for result location
4. Integrate with FileHandler to read the org file
5. Run through Parser → Validator → DataExtractor chain
6. Show progress at each step
7. Handle errors gracefully
8. Write results to output file

**Code Example**:
```typescript
export class AnalyzeCommand extends BaseCommand {
  register(program: Command): void {
    program
      .command('analyze <file>')
      .description('Analyze org-mode project template')
      .option('-o, --output <path>', 'output file path', 'ideaforge-results.org')
      .action(async (file: string, options: any) => {
        await this.execute(file, options);
      });
  }

  async execute(file: string, options: any): Promise<void> {
    const progress = this.createProgress();
    
    try {
      progress.start('📄 Reading org-mode file...');
      const data = await this.fileHandler.readOrgFile(file);
      
      progress.update('✓ Document validated successfully');
      progress.update('🔍 Extracting project data...');
      
      // For now, just save the parsed data
      progress.update('💾 Saving analysis results...');
      await this.fileHandler.writeDocument(data, options.output, 'orgmode');
      
      progress.succeed('✅ Analysis complete!');
    } catch (error) {
      progress.fail('❌ Analysis failed');
      this.handleError(error);
    }
  }
}
```

**File Changes**:
- Create: `src/cli/commands/analyze.ts`
- Create: `src/cli/commands/base-command.ts`
- Modify: `src/cli/index.ts` (register command)

**Testing Approach**:
- Test with valid org-mode file: `./bin/ideaforge analyze ideaforge-template.org`
- Test with missing file
- Test with invalid org-mode structure
- Verify output file creation
- Check progress messages display

**Definition of Done**:
- Command processes org-mode files successfully
- Progress indicators show at each step
- Errors display user-friendly messages
- Output file is created at specified location
- Validation score is displayed

**Common Pitfalls**:
- Not resolving relative file paths correctly
- Forgetting to await async operations
- Poor error messages that don't help users
- Not checking if output path is writable

### 3.3 Create refine command for iterative improvements

**Description**: Implement `ideaforge refine` to process files with :RESPONSE: tags for iterative improvement.

**Implementation Steps**:
1. Create `src/cli/commands/refine.ts`
2. Accept file path with existing :RESPONSE: tags
3. Parse and identify response sections
4. Process responses (stub for now, full implementation in Task 4.0)
5. Generate new version with incorporated feedback
6. Show what changed in the progress output

**Code Example**:
```typescript
export class RefineCommand extends BaseCommand {
  register(program: Command): void {
    program
      .command('refine <file>')
      .description('Refine project plan based on :RESPONSE: feedback')
      .option('-o, --output <path>', 'output file path')
      .action(async (file: string, options: any) => {
        await this.execute(file, options);
      });
  }

  async execute(file: string, options: any): Promise<void> {
    const progress = this.createProgress();
    
    try {
      progress.start('📄 Reading refined org-mode file...');
      const data = await this.fileHandler.readOrgFile(file);
      
      // Check for :RESPONSE: tags
      const responseCount = this.countResponseTags(data);
      progress.update(`🔍 Found ${responseCount} :RESPONSE: sections`);
      
      if (responseCount === 0) {
        progress.warn('⚠️  No :RESPONSE: tags found');
        return;
      }
      
      progress.update('🔄 Processing feedback...');
      // Stub for now - will be implemented in Task 4.0
      
      const outputPath = options.output || this.generateVersionedPath(file);
      progress.update('💾 Saving refined version...');
      await this.fileHandler.writeDocument(data, outputPath, 'orgmode');
      
      progress.succeed(`✅ Refinement complete! Saved to ${outputPath}`);
    } catch (error) {
      progress.fail('❌ Refinement failed');
      this.handleError(error);
    }
  }
}
```

**File Changes**:
- Create: `src/cli/commands/refine.ts`
- Create: `src/utils/version-helper.ts` (for versioned filenames)
- Modify: `src/cli/index.ts` (register command)

**Testing Approach**:
- Test with file containing :RESPONSE: tags
- Test with file without :RESPONSE: tags
- Verify versioned output naming (v2, v3, etc.)
- Check that original file is preserved

**Definition of Done**:
- Command identifies :RESPONSE: tags correctly
- Generates versioned output files
- Shows helpful progress messages
- Warns when no responses found
- Original file remains unchanged

**Common Pitfalls**:
- Overwriting the input file accidentally
- Not handling version number extraction correctly
- Missing :RESPONSE: tags in nested sections

### 3.4 Create export command with format options

**Description**: Implement `ideaforge export` to convert processed files to different formats.

**Implementation Steps**:
1. Create `src/cli/commands/export.ts`
2. Accept input file and format option
3. Support 'cursor' and 'orgmode' formats
4. Use existing FileHandler export capabilities
5. Show format-specific success messages

**Code Example**:
```typescript
export class ExportCommand extends BaseCommand {
  register(program: Command): void {
    program
      .command('export <file>')
      .description('Export project plan to different formats')
      .option('-f, --format <type>', 'output format', 'cursor')
      .option('-o, --output <path>', 'output file path')
      .action(async (file: string, options: any) => {
        await this.execute(file, options);
      });
  }

  async execute(file: string, options: any): Promise<void> {
    const progress = this.createProgress();
    const format = options.format.toLowerCase();
    
    if (!['cursor', 'orgmode'].includes(format)) {
      this.handleError(new Error(`Unsupported format: ${format}`));
      return;
    }
    
    try {
      progress.start('📄 Reading source file...');
      const data = await this.fileHandler.readOrgFile(file);
      
      const outputPath = options.output || this.generateExportPath(file, format);
      progress.update(`📝 Exporting to ${format} format...`);
      
      await this.fileHandler.writeDocument(data, outputPath, format);
      
      const emoji = format === 'cursor' ? '📋' : '📄';
      progress.succeed(`${emoji} Exported to ${outputPath}`);
    } catch (error) {
      progress.fail('❌ Export failed');
      this.handleError(error);
    }
  }
}
```

**File Changes**:
- Create: `src/cli/commands/export.ts`
- Modify: `src/cli/index.ts` (register command)

**Testing Approach**:
- Export to cursor format: `./bin/ideaforge export results.org -f cursor`
- Export to orgmode format: `./bin/ideaforge export results.org -f orgmode`
- Test invalid format handling
- Verify output file contents

**Definition of Done**:
- Both export formats work correctly
- Output files have appropriate extensions
- Invalid formats show helpful error
- Success messages indicate format used

**Common Pitfalls**:
- Case sensitivity in format names
- Not inferring output extension from format
- Overwriting existing files without warning

### 3.5 Create visualization commands for diagrams and tables

**Description**: Implement visualization commands (initially as stubs for future implementation).

**Implementation Steps**:
1. Create `src/cli/commands/visualize.ts`
2. Add subcommands for 'flow' and 'tables'
3. Accept format options (png, svg, ascii)
4. Create placeholder implementations
5. Show "coming soon" messages

**Code Example**:
```typescript
export class VisualizeCommand extends BaseCommand {
  register(program: Command): void {
    const visualize = program
      .command('visualize')
      .description('Generate visualizations from project data');
    
    visualize
      .command('flow <file>')
      .description('Generate architecture flow diagram')
      .option('-f, --format <type>', 'output format (png|svg|ascii)', 'png')
      .action(async (file: string, options: any) => {
        const progress = this.createProgress();
        progress.start('🎨 Generating flow diagram...');
        progress.succeed('📊 Flow diagram generation coming in v2.0!');
      });
    
    visualize
      .command('tables <file>')
      .description('Extract MoSCoW/Kano tables')
      .action(async (file: string) => {
        const progress = this.createProgress();
        progress.start('📊 Extracting tables...');
        progress.succeed('📋 Table extraction coming in v2.0!');
      });
  }
}
```

**File Changes**:
- Create: `src/cli/commands/visualize.ts`
- Modify: `src/cli/index.ts` (register command)

**Testing Approach**:
- Run visualization commands
- Verify "coming soon" messages
- Check command help text

**Definition of Done**:
- Commands are registered and show in help
- Placeholder messages display correctly
- No errors when running commands

**Common Pitfalls**:
- Making promises about v2.0 features
- Not handling subcommands properly in Commander

### 3.6 Implement progress messaging system

**Description**: Create a centralized progress management system using Ora for consistent user feedback.

**Implementation Steps**:
1. Create `src/cli/progress-manager.ts`
2. Wrap Ora with our own interface
3. Handle --verbose, --quiet, --no-emoji flags
4. Create standard message templates
5. Support nested progress contexts
6. Handle progress in CI environments

**Code Example**:
```typescript
import ora, { Ora } from 'ora';
import chalk from 'chalk';

export class ProgressManager {
  private spinner: Ora | null = null;
  private options: ProgressOptions;
  
  constructor(options: ProgressOptions) {
    this.options = options;
  }
  
  start(message: string): void {
    if (this.options.quiet) return;
    
    const text = this.options.noEmoji ? 
      this.stripEmoji(message) : message;
    
    if (this.options.verbose || process.env.CI) {
      console.log(chalk.blue('→'), text);
    } else {
      this.spinner = ora(text).start();
    }
  }
  
  update(message: string): void {
    if (this.options.quiet) return;
    
    const text = this.options.noEmoji ? 
      this.stripEmoji(message) : message;
    
    if (this.options.verbose || process.env.CI) {
      console.log(chalk.blue('→'), text);
    } else if (this.spinner) {
      this.spinner.text = text;
    }
  }
  
  succeed(message: string): void {
    if (this.options.quiet) return;
    
    const text = this.options.noEmoji ? 
      this.stripEmoji(message) : message;
    
    if (this.options.verbose || process.env.CI) {
      console.log(chalk.green('✓'), text);
    } else if (this.spinner) {
      this.spinner.succeed(text);
    }
  }
  
  fail(message: string): void {
    const text = this.options.noEmoji ? 
      this.stripEmoji(message) : message;
    
    if (this.options.verbose || process.env.CI) {
      console.error(chalk.red('✗'), text);
    } else if (this.spinner) {
      this.spinner.fail(text);
    }
  }
  
  private stripEmoji(text: string): string {
    return text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/gu, '').trim();
  }
}
```

**File Changes**:
- Create: `src/cli/progress-manager.ts`
- Create: `src/cli/progress-messages.ts` (standard messages)
- Modify: All command files to use ProgressManager

**Testing Approach**:
- Test with --verbose flag
- Test with --quiet flag
- Test with --no-emoji flag
- Test in CI environment (set CI=true)
- Verify emoji stripping works

**Definition of Done**:
- Progress displays correctly in all modes
- Emoji can be disabled
- CI environment detection works
- Quiet mode suppresses all but errors
- Verbose mode shows linear output

**Common Pitfalls**:
- Not handling CI environment detection
- Emoji regex not catching all emojis
- Memory leaks from unclosed spinners
- Race conditions with parallel progress

## 5. Testing Strategy

### Unit Tests
- **ProgressManager**: Test all display modes and emoji handling
- **Command Classes**: Test argument parsing and option handling
- **Version Helper**: Test version number extraction and generation
- **Error Handler**: Test error message formatting

### Integration Tests
- Full command execution with real files
- Progress display in different terminal environments
- Error handling for common failure scenarios
- Command chaining (analyze → export)

### Manual Testing
```bash
# Test basic flow
./bin/ideaforge analyze ideaforge-template.org
./bin/ideaforge export ideaforge-results.org -f cursor
./bin/ideaforge refine ideaforge-results-v2.org

# Test options
./bin/ideaforge analyze template.org --verbose
./bin/ideaforge analyze template.org --quiet
./bin/ideaforge analyze template.org --no-emoji

# Test errors
./bin/ideaforge analyze missing-file.org
./bin/ideaforge export results.org -f invalid
```

### Mock Requirements
- Mock file system for unit tests
- Mock Ora for progress testing
- Sample org-mode files for integration tests

## 6. Integration Plan

### Existing Code Integration
```typescript
// src/cli/commands/base-command.ts
import { FileHandler } from '../../services/file-handler';
import { ProgressManager } from '../progress-manager';
import { ErrorHandler } from '../../utils/error-handler';

export abstract class BaseCommand {
  protected fileHandler: FileHandler;
  protected progressManager: ProgressManager;
  protected errorHandler: ErrorHandler;
  
  constructor(context: CommandContext) {
    this.fileHandler = context.fileHandler;
    this.progressManager = context.progressManager;
    this.errorHandler = context.errorHandler;
  }
}
```

### API Contracts
- Commands must extend BaseCommand
- Commands must implement `register()` and `execute()`
- Progress messages follow standard format
- Errors thrown with user-friendly messages

### Configuration
```typescript
// Environment variables used
process.env.CI // Detect CI environment
process.env.NO_COLOR // Respect color preferences
```

### Migration Steps
1. Update existing CLI stub to use Commander properly
2. Ensure all tests still pass after integration
3. Update bin/ideaforge to use new entry point
4. Test executable permissions on different platforms

## 7. Documentation Requirements

### Code Documentation
```typescript
/**
 * Analyzes an org-mode project template file
 * @param file - Path to the org-mode file
 * @param options - Command options including output path
 * @returns Promise that resolves when analysis is complete
 */
```

### README Updates
- Add "Getting Started" section with basic commands
- Include examples for each command
- Document all command-line options
- Add troubleshooting section

### API Documentation
- Document CommandContext interface
- Document ProgressManager methods
- Document standard error codes

### Usage Examples
```bash
# Basic analysis
ideaforge analyze my-project.org

# Analysis with custom output
ideaforge analyze my-project.org --output results/analysis.org

# Export to Cursor format
ideaforge export analysis.org --format cursor

# Quiet mode for scripts
ideaforge analyze project.org --quiet

# Verbose mode for debugging
ideaforge analyze project.org --verbose
```

## 8. Functional Requirements

1. **Command Registration**: System must register all commands with Commander.js at startup
2. **File Path Resolution**: System must correctly resolve relative and absolute file paths
3. **Progress Display**: System must show progress indicators during long operations
4. **Error Handling**: System must display user-friendly error messages for common issues
5. **Option Parsing**: System must parse and validate command-line options
6. **Help Text**: System must provide comprehensive help for all commands
7. **Version Display**: System must show version information when requested
8. **Format Validation**: System must validate export format options
9. **Response Detection**: System must identify :RESPONSE: tags in org-mode files
10. **Output Generation**: System must generate appropriate output filenames
11. **Mode Detection**: System must detect CI environments and adjust output
12. **Emoji Control**: System must allow disabling emoji in output

## 9. Success Metrics

### Functionality
- All commands execute without errors
- Progress indicators display for operations > 1 second
- Error messages help users fix issues
- Commands complete in reasonable time

### Quality
- Test coverage > 80% for CLI code
- All commands have integration tests
- No commands exceed 200 lines
- Clear separation of concerns

### Performance
- Startup time < 500ms
- Command execution overhead < 100ms
- Progress updates don't slow operations

## 10. Next Steps

### Immediate Follow-up (Parent Task 4.0)
After completing the CLI framework:
1. Implement LangGraph agent architecture
2. Connect analyze command to LangGraph processing
3. Wire refine command to feedback processing
4. Add AI-powered analysis to the pipeline

### Future Enhancements
- Add `ideaforge init` to create templates
- Implement `ideaforge config` for settings
- Add shell completion support
- Create `ideaforge validate` command
- Support for multiple file processing

### Integration Opportunities
- Connect to n8n webhooks (Task 5.0)
- Add progress for AI operations (Task 6.0)
- Implement real visualization (Task 7.0)
- Enable full refinement loop (Task 8.0) 