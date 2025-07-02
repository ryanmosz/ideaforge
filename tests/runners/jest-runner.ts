/**
 * Jest Test Runner
 * Handles execution of Jest tests with proper isolation
 */

import { execSync } from 'child_process';
import { TestDefinition } from '../test-registry';

export interface JestRunnerOptions {
  verbose?: boolean;
  debug?: boolean;
}

export class JestRunner {
  constructor(private options: JestRunnerOptions = {}) {}

  /**
   * Run a specific Jest test
   */
  async run(test: TestDefinition): Promise<{
    passed: boolean;
    output: string;
    duration: number;
  }> {
    const startTime = Date.now();
    
    try {
      // Extract test description to use as pattern
      // For setup.test.ts, we need to match the specific test description
      const testPattern = this.getTestPattern(test);
      
      const args = [
        'npx', 'jest',
        test.path,
        '--no-coverage',
        '--colors',
        '--verbose=false'
      ];

      if (testPattern) {
        args.push(`--testNamePattern="${testPattern}"`);
      }

      if (!this.options.verbose) {
        args.push('--silent');
      }

      const cmd = args.join(' ');
      
      if (this.options.debug) {
        console.log(`[DEBUG] Running: ${cmd}`);
      }

      const output = execSync(cmd, {
        encoding: 'utf8',
        stdio: 'pipe',
        env: {
          ...process.env,
          FORCE_COLOR: '1'
        }
      });

      return {
        passed: true,
        output,
        duration: Date.now() - startTime
      };
    } catch (error: any) {
      const output = error.stdout || error.stderr || error.message;
      
      return {
        passed: false,
        output,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Get the test pattern based on test ID
   */
  private getTestPattern(test: TestDefinition): string {
    // Map test IDs to Jest test descriptions
    const patterns: Record<string, string> = {
      'setup.directories': 'should have all required directories',
      'setup.config-files': 'should have all config files',
      'setup.executable': 'should have executable bin script',
      'setup.dependencies': 'should have all required dependencies installed',
      'jest.sample-test': 'Sample Test',
      // TypeScript compilation tests
      'typescript.features': 'TypeScript Compilation Features',
      'typescript.build-output': 'TypeScript Build Output',
      'typescript.incremental': 'TypeScript Incremental Compilation',
      // Jest TypeScript support tests
      'jest.typescript-integration': 'Jest TypeScript Integration',
      'jest.test-matchers': 'Jest Test Matchers with TypeScript',
      'jest.coverage': 'Jest Code Coverage with TypeScript',
      'jest.configuration': 'Jest Configuration Verification',
      'jest.performance': 'Jest Performance with TypeScript',
      // CLI executable tests
      'cli.executable-file': 'Executable File',
      'cli.execution': 'CLI Execution',
      'cli.environment': 'Environment Handling',
      'cli.commands': 'Command Availability',
      'cli.error-handling': 'Error Handling',
      'cli.performance': 'Performance',
      // Environment config tests
      'env.validation': 'Environment Configuration Validation'
    };

    return patterns[test.id] || '';
  }

  /**
   * Run multiple Jest tests
   */
  async runMultiple(tests: TestDefinition[]): Promise<Map<string, any>> {
    const results = new Map();

    for (const test of tests) {
      const result = await this.run(test);
      results.set(test.id, result);
    }

    return results;
  }
} 