#!/usr/bin/env node

/**
 * Master Test Runner for IdeaForge
 * Provides flexible test execution with detailed logging and debugging
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { Command } from 'commander';
import { 
  testRegistry, 
  TestDefinition,
  getTestsForTask,
  getTestsInGroup,
  getQuickTests,
  getTestById
} from './test-registry';
import { JestRunner } from './runners/jest-runner';

// Configure logging
const LOG_FILE = path.join(__dirname, 'test-runner.log');
const DEBUG = process.env.DEBUG_TESTS === 'true';

interface TestResult {
  test: TestDefinition;
  passed: boolean;
  duration: number;
  output: string;
  error?: string;
}

class TestRunner {
  private results: TestResult[] = [];
  private startTime: number = 0;
  private jestRunner: JestRunner;

  constructor(private options: any) {
    this.initLogFile();
    this.jestRunner = new JestRunner({
      verbose: options.verbose,
      debug: options.verbose || DEBUG
    });
  }

  private initLogFile() {
    const timestamp = new Date().toISOString();
    fs.writeFileSync(LOG_FILE, `=== Test Run Started at ${timestamp} ===\n\n`);
  }

  private log(message: string, level: 'info' | 'error' | 'debug' = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    
    fs.appendFileSync(LOG_FILE, logMessage);
    
    if (level === 'debug' && !DEBUG) return;
    
    const coloredMessage = level === 'error' 
      ? chalk.red(message)
      : level === 'debug' 
      ? chalk.gray(message) 
      : message;
    
    console.log(coloredMessage);
  }

  private async runSingleTest(test: TestDefinition): Promise<TestResult> {
    const startTime = Date.now();
    
    this.log(`\n${chalk.blue('━'.repeat(60))}`);
    this.log(`Running: ${chalk.bold(test.name)} (${test.id})`);
    this.log(`Description: ${test.description}`);
    if (test.debugInfo) {
      this.log(`Debug Info: ${chalk.gray(test.debugInfo)}`, 'debug');
    }
    
    try {
      let output = '';
      let passed = true;

      switch (test.type) {
        case 'jest':
          output = await this.runJestTest(test);
          passed = !output.includes('FAIL');
          break;
        
        case 'bash':
          const result = await this.runBashTest(test);
          output = result.output;
          passed = result.passed;
          break;
        
        case 'custom':
          output = await this.runCustomTest(test);
          passed = !output.toLowerCase().includes('error');
          break;
      }

      const duration = Date.now() - startTime;
      const testResult: TestResult = { test, passed, duration, output };

      if (passed) {
        this.log(chalk.green(`✅ PASSED`) + ` (${duration}ms)`);
      } else {
        this.log(chalk.red(`❌ FAILED`) + ` (${duration}ms)`, 'error');
        this.log('Output:', 'error');
        this.log(output, 'error');
      }

      return testResult;

    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.log(chalk.red(`❌ ERROR: ${error.message}`), 'error');
      return {
        test,
        passed: false,
        duration,
        output: '',
        error: error.message
      };
    }
  }

  private async runJestTest(test: TestDefinition): Promise<string> {
    const result = await this.jestRunner.run(test);
    return result.output;
  }

  private async runBashTest(test: TestDefinition): Promise<{ output: string; passed: boolean }> {
    // For bash tests, we need to run the specific test within the script
    // This is a simplified version - in reality we'd parse the bash script
    try {
      const output = execSync(test.path, { encoding: 'utf8' });
      const passed = !output.includes('FAILED');
      return { output, passed };
    } catch (error: any) {
      return { output: error.stdout || error.message, passed: false };
    }
  }

  private async runCustomTest(test: TestDefinition): Promise<string> {
    try {
      const output = execSync(test.path, { encoding: 'utf8' });
      return output;
    } catch (error: any) {
      return error.stdout || error.message;
    }
  }

  public async run(tests: TestDefinition[]) {
    this.startTime = Date.now();
    
    console.log(chalk.bold('\n🧪 IdeaForge Test Runner\n'));
    console.log(`Running ${tests.length} tests...`);
    console.log(`Estimated time: ${this.estimateTotalTime(tests)}s\n`);

    // Show test plan
    if (this.options.verbose || this.options.dryRun) {
      console.log(chalk.bold('Test Plan:'));
      tests.forEach(test => {
        console.log(`  - ${test.name} (${test.estimatedTime}s) [${test.groups.join(', ')}]`);
      });
      console.log();
    }

    if (this.options.dryRun) {
      console.log(chalk.yellow('Dry run mode - no tests executed'));
      return;
    }

    // Run tests
    for (const test of tests) {
      const result = await this.runSingleTest(test);
      this.results.push(result);
    }

    this.printSummary();
  }

  private estimateTotalTime(tests: TestDefinition[]): number {
    return tests.reduce((sum, test) => sum + test.estimatedTime, 0);
  }

  private printSummary() {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;

    console.log(chalk.bold(`\n${'═'.repeat(60)}`));
    console.log(chalk.bold('Test Summary'));
    console.log(chalk.bold(`${'═'.repeat(60)}`));
    
    console.log(`Total Tests: ${this.results.length}`);
    console.log(`Passed: ${chalk.green(passed)}`);
    console.log(`Failed: ${chalk.red(failed)}`);
    console.log(`Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    
    if (failed > 0) {
      console.log(chalk.red('\nFailed Tests:'));
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(chalk.red(`  ❌ ${r.test.name} (${r.test.id})`));
          console.log(`     ${r.test.description}`);
          if (r.error) {
            console.log(`     Error: ${r.error}`);
          }
        });
    }

    console.log(`\nDetailed log: ${LOG_FILE}`);
  }
}

// CLI setup
const program = new Command();

program
  .name('test-runner')
  .description('Master test runner for IdeaForge')
  .version('1.0.0');

program
  .option('-t, --test <id>', 'Run a single test by ID')
  .option('-g, --group <name>', 'Run all tests in a group')
  .option('--tag <tag>', 'Run tests with specific tag')
  .option('--task <taskId>', 'Run tests for a specific task (e.g., t108)')
  .option('-a, --all', 'Run all enabled tests')
  .option('-q, --quick [seconds]', 'Run quick tests (default: 5 seconds)', '5')
  .option('--current', 'Run tests for current task (auto-detected)')
  .option('-e, --exclude <tags>', 'Exclude tests with these tags (comma-separated)')
  .option('-v, --verbose', 'Show detailed output')
  .option('--dry-run', 'Show what would be run without executing')
  .option('--list', 'List all available tests')
  .action(async (options) => {
    let testsToRun: TestDefinition[] = [];

    // List mode
    if (options.list) {
      console.log(chalk.bold('\nAvailable Tests:\n'));
      testRegistry.forEach(test => {
        const status = test.enabled ? chalk.green('✓') : chalk.red('✗');
        console.log(`${status} ${test.id.padEnd(25)} ${test.name}`);
        console.log(`  ${chalk.gray(test.description)}`);
        console.log(`  Groups: ${test.groups.join(', ')} | Tags: ${test.tags.join(', ')}`);
        console.log();
      });
      return;
    }

    // Determine which tests to run
    if (options.test) {
      const test = getTestById(options.test);
      if (!test) {
        console.error(chalk.red(`Test not found: ${options.test}`));
        process.exit(1);
      }
      testsToRun = [test];
    } else if (options.group) {
      testsToRun = getTestsInGroup(options.group);
    } else if (options.task) {
      testsToRun = getTestsForTask(options.task);
    } else if (options.tag) {
      testsToRun = testRegistry.filter(t => t.tags.includes(options.tag) && t.enabled);
    } else if (options.quick) {
      const maxTime = parseInt(options.quick);
      testsToRun = getQuickTests(maxTime);
    } else if (options.current) {
      // Auto-detect current task from git branch or recent files
      // For now, default to T108
      testsToRun = getTestsForTask('t108');
    } else if (options.all) {
      testsToRun = testRegistry.filter(t => t.enabled);
    } else {
      // Default: run quick tests
      testsToRun = getQuickTests();
    }

    // Apply exclusions
    if (options.exclude) {
      const excludeTags = options.exclude.split(',').map((t: string) => t.trim());
      testsToRun = testsToRun.filter(test => 
        !test.tags.some(tag => excludeTags.includes(tag))
      );
    }

    if (testsToRun.length === 0) {
      console.log(chalk.yellow('No tests match the criteria'));
      return;
    }

    // Run the tests
    const runner = new TestRunner(options);
    await runner.run(testsToRun);
  });

program.parse(process.argv);

// If no arguments provided, show help
if (process.argv.length === 2) {
  program.outputHelp();
} 