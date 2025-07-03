#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { FileHandler } from '../services/file-handler';
import { ProgressManager } from './progress-manager';
import { CommandContext } from './types';
import { BaseCommand } from './commands/base-command';
import { AnalyzeCommand } from './commands/analyze';
import { ExportCommand } from './commands/export';
import { RefineCommand } from './commands/refine';
import { VisualizeCommand } from './commands/visualize';
import dotenv from 'dotenv';

// Load environment variables
// Skip loading .env in test environment unless explicitly specified
if (process.env.NODE_ENV !== 'test' || process.env.DOTENV_CONFIG_PATH) {
  dotenv.config({
    path: process.env.DOTENV_CONFIG_PATH
  });
}

// Create main program
const program = new Command();

// Configure program
program
  .name('ideaforge')
  .version('1.0.0')
  .description('Transform your project ideas into actionable plans')
  .configureHelp({
    sortSubcommands: true,
    subcommandTerm: (cmd) => cmd.name() + ' ' + cmd.usage()
  });

// Initialize shared context
const fileHandler = new FileHandler();
const progressManager = new ProgressManager();
const errorHandler = {
  handle: (error: any) => {
    if (error.message) {
      console.error(chalk.red('Error:'), error.message);
    } else {
      console.error(chalk.red('Error:'), error);
    }
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
  }
};

// @ts-ignore - context will be used by commands
const context: CommandContext = {
  fileHandler,
  progressManager,
  errorHandler
};

// Only check config if we have a known command that requires it
const args = process.argv.slice(2);
const knownCommands = ['analyze', 'refine', 'export', 'visualize', 'init'];
const firstArg = args[0];
const hasCommand = firstArg && !firstArg.startsWith('-') && knownCommands.includes(firstArg);
const hasHelpFlag = args.includes('--help') || args.includes('-h');

// Only check config if we have a command AND not asking for help
if (hasCommand && !hasHelpFlag) {
  // Check for required environment variables
  const requiredEnvVars = ['OPENAI_API_KEY', 'N8N_WEBHOOK_URL'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error(chalk.red('Configuration error:'), `Missing required environment variable${missingVars.length > 1 ? 's' : ''}: ${missingVars.join(', ')}`);
    console.error(chalk.yellow('Please copy .env.example to .env and fill in required values'));
    process.exit(1);
  }
}

// Register commands
const commands: BaseCommand[] = [
  new AnalyzeCommand(context),
  new ExportCommand(context),
  new RefineCommand(context),
  new VisualizeCommand(context),
  // TODO: Add other commands here
];

commands.forEach(cmd => cmd.register(program));

// Create command stubs (to be replaced with real commands)
program
  .command('init')
  .description('Create a new IdeaForge template file')
  .action(() => {
    console.log(chalk.blue('Coming soon:'), 'Initialize template functionality');
  });

// Custom help with examples
program.on('--help', () => {
  console.log('');
  console.log(chalk.bold('Examples:'));
  console.log('');
  console.log('  # Create a new project template');
  console.log('  $ ideaforge init');
  console.log('');
  console.log('  # Analyze your project ideas');
  console.log('  $ ideaforge analyze my-project.org --output analysis.org');
  console.log('');
  console.log('  # Refine with feedback (add :RESPONSE: tags in the file first)');
  console.log('  $ ideaforge refine analysis.org --output analysis-v2.org');
  console.log('');
  console.log('  # Generate architecture flow diagram');
  console.log('  $ ideaforge visualize flow analysis-final.org --format svg');
  console.log('');
  console.log('  # Export final plan for development');
  console.log('  $ ideaforge export analysis-final.org --format cursor --output tasks.md');
  console.log('');
  console.log(chalk.bold('Workflow:'));
  console.log('');
  console.log('  1. ideaforge init → Creates template.org');
  console.log('  2. Fill out template with your ideas and requirements');
  console.log('  3. ideaforge analyze → AI analysis & suggestions');
  console.log('  4. Edit output, add :RESPONSE: tags for feedback');
  console.log('  5. ideaforge refine → Iterate on your plan');
  console.log('  6. ideaforge export → Get actionable task list');
  console.log('');
});

// ASCII Logo
if (process.argv.length === 2) {
  console.log(chalk.cyan(`
  ╦┌┬┐┌─┐┌─┐╔═╗┌─┐┬─┐┌─┐┌─┐
  ║ ││├┤ ├─┤╠╣ │ │├┬┘│ ┬├┤ 
  ╩─┴┘└─┘┴ ┴╚  └─┘┴└─└─┘└─┘
  `));
  console.log(chalk.gray('  Transform ideas into action\n'));
}

// Parse arguments
program.parse();