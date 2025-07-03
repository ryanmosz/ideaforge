#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '../config';
import { FileHandler } from '../services/file-handler';
import { ProgressManager } from './progress-manager';
import { CommandContext } from './types';

// Try to load config (skip in test mode for help/version commands or no command)
const isHelpOrVersion = process.argv.some(arg => 
  arg === '--help' || arg === '-h' || 
  arg === '--version' || arg === '-V'
);
const noCommand = process.argv.length === 2;

if (!isHelpOrVersion && !noCommand) {
  try {
    const config = loadConfig();
    // Config will be used in actual command implementations
    if (config && process.env.NODE_ENV !== 'test') {
      console.log(chalk.green('✓ Configuration loaded'));
    }
  } catch (error: any) {
    console.error(chalk.red('Configuration error:'), error.message);
    console.error(chalk.yellow('Please copy .env.example to .env and fill in required values'));
    process.exit(1);
  }
}

const program = new Command();

// ASCII art logo for fun
const logo = `
╔══════════════════════════════════════════╗
║      🚀 IdeaForge - Plan Before Code 🚀  ║
╚══════════════════════════════════════════╝
`;

program
  .name('ideaforge')
  .description('Transform your project ideas into actionable plans using MoSCoW and Kano frameworks')
  .version('1.0.0')
  .configureHelp({
    sortSubcommands: true,
    subcommandTerm: (cmd) => cmd.name()
  });

// Create shared context for all commands
// @ts-ignore - Will be used when commands are implemented in subtasks 3.2-3.5
const context: CommandContext = {
  fileHandler: new FileHandler(),
  progressManager: new ProgressManager()
};

// Init command (keeping as stub for now)
program
  .command('init')
  .description('Create a new IdeaForge template file in the current directory')
  .action(() => {
    console.log(chalk.yellow('⚠️  init command not yet implemented'));
    console.log(chalk.gray('This will create ideaforge-template.org in the current directory'));
  });

// Analyze command (keeping as stub for now)
program
  .command('analyze <file>')
  .description('Analyze your project ideas and requirements')
  .option('-o, --output <file>', 'output file path (default: ideaforge-results.org)')
  .action((file, options) => {
    console.log(chalk.yellow('⚠️  analyze command not yet implemented'));
    console.log(chalk.gray(`Would analyze: ${file}`));
    if (options.output) console.log(chalk.gray(`Output to: ${options.output}`));
  });

// Refine command (keeping as stub for now)
program
  .command('refine <file>')
  .description('Refine your analysis with feedback and edits')
  .option('-o, --output <file>', 'output file path (default: incremented version)')
  .action((file, _options) => {
    console.log(chalk.yellow('⚠️  refine command not yet implemented'));
    console.log(chalk.gray(`Would refine: ${file}`));
  });

// Flow command (keeping as stub for now)
program
  .command('flow <file>')
  .description('Generate architecture flow diagram from analysis')
  .option('-f, --format <type>', 'output format: png, svg, or ascii (default: png)', 'png')
  .option('-o, --output <file>', 'output file path')
  .action((file, options) => {
    console.log(chalk.yellow('⚠️  flow command not yet implemented'));
    console.log(chalk.gray(`Would generate ${options.format} diagram from: ${file}`));
  });

// Tables command (keeping as stub for now)
program
  .command('tables <file>')
  .description('Extract MoSCoW/Kano tables from analysis file')
  .option('-o, --output <file>', 'output file path (default: stdout)')
  .action((file, _options) => {
    console.log(chalk.yellow('⚠️  tables command not yet implemented'));
    console.log(chalk.gray(`Would extract tables from: ${file}`));
  });

// Export command (keeping as stub for now)
program
  .command('export <file>')
  .description('Export your final plan to different formats')
  .requiredOption('-f, --format <type>', 'export format: cursor or orgmode')
  .requiredOption('-o, --output <file>', 'output file path')
  .action((file, options) => {
    console.log(chalk.yellow('⚠️  export command not yet implemented'));
    console.log(chalk.gray(`Would export ${file} as ${options.format} to ${options.output}`));
  });

// Custom help with examples
program.on('--help', () => {
  console.log('');
  console.log(chalk.bold('Examples:'));
  console.log('');
  console.log(chalk.gray('  # Create a new project template'));
  console.log('  $ ideaforge init');
  console.log('');
  console.log(chalk.gray('  # Analyze your project ideas'));
  console.log('  $ ideaforge analyze my-project.org --output analysis.org');
  console.log('');
  console.log(chalk.gray('  # Refine with feedback (add :RESPONSE: tags in the file first)'));
  console.log('  $ ideaforge refine analysis.org --output analysis-v2.org');
  console.log('');
  console.log(chalk.gray('  # Generate architecture flow diagram'));
  console.log('  $ ideaforge flow analysis-final.org --format svg --output architecture.svg');
  console.log('');
  console.log(chalk.gray('  # Export final plan for development'));
  console.log('  $ ideaforge export analysis-final.org --format cursor --output tasks.md');
  console.log('');
  console.log(chalk.bold('Workflow:'));
  console.log('');
  console.log('  1. ' + chalk.cyan('ideaforge init') + ' → Creates template.org');
  console.log('  2. Fill out template with your ideas and requirements');
  console.log('  3. ' + chalk.cyan('ideaforge analyze') + ' → AI analysis & suggestions');
  console.log('  4. Edit output, add :RESPONSE: tags for feedback');
  console.log('  5. ' + chalk.cyan('ideaforge refine') + ' → Iterate on your plan');
  console.log('  6. ' + chalk.cyan('ideaforge export') + ' → Get actionable task list');
  console.log('');
});

// Show logo and help if no command provided
if (process.argv.length === 2) {
  console.log(chalk.blue(logo));
  program.outputHelp();
} else {
  // Parse arguments normally
  program.parse(process.argv);
}