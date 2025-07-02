/**
 * Central registry of all tests in the IdeaForge project
 * Each test includes metadata for flexible execution
 */

export interface TestDefinition {
  id: string;
  name: string;
  description: string;  // What this test verifies
  type: 'jest' | 'bash' | 'custom';
  path: string;
  groups: string[];
  tags: string[];
  estimatedTime: number; // in seconds
  enabled: boolean;
  debugInfo?: string;   // Additional debug information
}

export const testRegistry: TestDefinition[] = [
  // ===== Setup Tests (T108) =====
  {
    id: 'setup.directories',
    name: 'Project Directory Structure',
    description: 'Verifies all required project directories exist (src/, tests/, bin/, etc.)',
    type: 'jest',
    path: 'tests/setup.test.ts',
    groups: ['unit', 'smoke', 'setup'],
    tags: ['quick', 't108', 'structure'],
    estimatedTime: 1,
    enabled: true,
    debugInfo: 'Checks: src/, src/cli/, src/models/, src/services/, src/utils/, src/config/, tests/, bin/'
  },
  {
    id: 'setup.config-files',
    name: 'Configuration Files',
    description: 'Verifies all config files exist (package.json, tsconfig.json, jest.config.js, etc.)',
    type: 'jest',
    path: 'tests/setup.test.ts',
    groups: ['unit', 'smoke', 'setup'],
    tags: ['quick', 't108', 'config'],
    estimatedTime: 1,
    enabled: true,
    debugInfo: 'Checks: package.json, tsconfig.json, jest.config.js, .eslintrc.js, .gitignore, .env.example'
  },
  {
    id: 'setup.executable',
    name: 'CLI Executable',
    description: 'Verifies bin/ideaforge exists and has executable permissions on macOS',
    type: 'jest',
    path: 'tests/setup.test.ts',
    groups: ['unit', 'smoke', 'setup'],
    tags: ['quick', 't108', 'cli'],
    estimatedTime: 1,
    enabled: true,
    debugInfo: 'Checks file existence and chmod +x status'
  },
  {
    id: 'setup.dependencies',
    name: 'NPM Dependencies',
    description: 'Verifies all required dependencies are installed with correct versions',
    type: 'jest',
    path: 'tests/setup.test.ts',
    groups: ['unit', 'smoke', 'setup'],
    tags: ['quick', 't108', 'dependencies'],
    estimatedTime: 1,
    enabled: true,
    debugInfo: 'Checks: commander, chalk, ora, axios, dotenv, typescript, jest, eslint'
  },

  // ===== CLI Tests (T108/T111) =====
  {
    id: 'cli.without-env',
    name: 'CLI without .env',
    description: 'Verifies CLI shows proper error message when .env file is missing',
    type: 'bash',
    path: 'tests/cli/test-commands.sh',
    groups: ['integration', 'cli'],
    tags: ['quick', 't108', 't111', 'error-handling'],
    estimatedTime: 2,
    enabled: true,
    debugInfo: 'Expected: "Configuration error: Missing required environment variable"'
  },
  {
    id: 'cli.with-env',
    name: 'CLI with valid .env',
    description: 'Verifies CLI loads successfully with valid environment configuration',
    type: 'bash',
    path: 'tests/cli/test-commands.sh',
    groups: ['integration', 'cli'],
    tags: ['quick', 't108', 't111', 'config'],
    estimatedTime: 2,
    enabled: true,
    debugInfo: 'Creates test .env and expects: "✓ Configuration loaded"'
  },
  {
    id: 'cli.help-command',
    name: 'Help Command',
    description: 'Verifies help command displays project description and available commands',
    type: 'bash',
    path: 'tests/cli/test-commands.sh',
    groups: ['integration', 'cli', 'smoke'],
    tags: ['quick', 't108', 't111'],
    estimatedTime: 2,
    enabled: true,
    debugInfo: 'Expected: "Transform your project ideas into actionable plans"'
  },
  
  // ===== CLI Executable Tests (T111) =====
  {
    id: 'cli.executable-file',
    name: 'CLI Executable File',
    description: 'Verifies CLI executable has correct shebang, permissions, and structure',
    type: 'jest',
    path: 'tests/cli/executable.test.ts',
    groups: ['unit', 'cli'],
    tags: ['quick', 't111'],
    estimatedTime: 1,
    enabled: true,
    debugInfo: 'Tests shebang, file permissions, and require path'
  },
  {
    id: 'cli.execution',
    name: 'CLI Execution',
    description: 'Verifies CLI runs properly with various scenarios',
    type: 'jest',
    path: 'tests/cli/executable.test.ts',
    groups: ['integration', 'cli'],
    tags: ['t111'],
    estimatedTime: 3,
    enabled: true,
    debugInfo: 'Tests direct execution, missing dist handling, version flag'
  },
  {
    id: 'cli.environment',
    name: 'CLI Environment Handling',
    description: 'Verifies CLI handles environment configuration correctly',
    type: 'jest',
    path: 'tests/cli/executable.test.ts',
    groups: ['integration', 'cli', 'config'],
    tags: ['t111', 't112'],
    estimatedTime: 2,
    enabled: true,
    debugInfo: 'Tests missing .env error and valid .env loading'
  },
  {
    id: 'cli.commands',
    name: 'CLI Command Availability',
    description: 'Verifies all CLI commands are available and respond to help',
    type: 'jest',
    path: 'tests/cli/executable.test.ts',
    groups: ['integration', 'cli'],
    tags: ['t111'],
    estimatedTime: 3,
    enabled: true,
    debugInfo: 'Tests init, analyze, refine, flow, tables, export commands'
  },
  {
    id: 'cli.error-handling',
    name: 'CLI Error Handling',
    description: 'Verifies CLI handles errors gracefully',
    type: 'jest',
    path: 'tests/cli/executable.test.ts',
    groups: ['integration', 'cli'],
    tags: ['t111'],
    estimatedTime: 2,
    enabled: true,
    debugInfo: 'Tests unknown commands and invalid options'
  },
  {
    id: 'cli.performance',
    name: 'CLI Performance',
    description: 'Verifies CLI starts up within performance requirements',
    type: 'jest',
    path: 'tests/cli/executable.test.ts',
    groups: ['performance', 'cli'],
    tags: ['t111'],
    estimatedTime: 3,
    enabled: true,
    debugInfo: 'Tests startup time is under 3 seconds'
  },

  // ===== Jest/TypeScript Tests (T109/T110) =====
  {
    id: 'jest.sample-test',
    name: 'Jest Sample Test',
    description: 'Basic Jest test to verify testing framework is working',
    type: 'jest',
    path: 'tests/sample.test.ts',
    groups: ['unit', 'jest-verification'],
    tags: ['quick', 't103', 't110'],
    estimatedTime: 1,
    enabled: true,
    debugInfo: 'Simple arithmetic test: expect(1 + 1).toBe(2)'
  },
  {
    id: 'jest.typescript-integration',
    name: 'Jest TypeScript Integration',
    description: 'Verifies Jest handles TypeScript features (types, classes, async)',
    type: 'jest',
    path: 'tests/jest/typescript-support.test.ts',
    groups: ['test-framework', 'jest'],
    tags: ['quick', 't110'],
    estimatedTime: 2,
    enabled: true,
    debugInfo: 'Tests type annotations, classes, decorators, async/await'
  },
  {
    id: 'jest.test-matchers',
    name: 'Jest TypeScript Matchers',
    description: 'Verifies Jest matchers work with TypeScript types',
    type: 'jest',
    path: 'tests/jest/typescript-support.test.ts',
    groups: ['test-framework', 'jest'],
    tags: ['quick', 't110'],
    estimatedTime: 1,
    enabled: true,
    debugInfo: 'Tests type-safe matchers and object matching'
  },
  {
    id: 'jest.coverage',
    name: 'Jest Code Coverage',
    description: 'Verifies Jest collects coverage for TypeScript code',
    type: 'jest',
    path: 'tests/jest/typescript-support.test.ts',
    groups: ['test-framework', 'jest'],
    tags: ['t110'],
    estimatedTime: 2,
    enabled: true,
    debugInfo: 'Tests coverage generation for TypeScript files'
  },
  {
    id: 'jest.configuration',
    name: 'Jest Configuration',
    description: 'Verifies Jest is properly configured for TypeScript',
    type: 'jest',
    path: 'tests/jest/typescript-support.test.ts',
    groups: ['test-framework', 'jest'],
    tags: ['t110'],
    estimatedTime: 1,
    enabled: true,
    debugInfo: 'Verifies ts-jest preset and transform configuration'
  },
  {
    id: 'jest.performance',
    name: 'Jest Performance',
    description: 'Verifies Jest runs TypeScript tests efficiently',
    type: 'jest',
    path: 'tests/jest/typescript-support.test.ts',
    groups: ['test-framework', 'jest'],
    tags: ['quick', 't110'],
    estimatedTime: 1,
    enabled: true,
    debugInfo: 'Tests that simple tests run in under 100ms'
  },

  // ===== TypeScript Compilation Tests (T109) =====
  {
    id: 'typescript.features',
    name: 'TypeScript Language Features',
    description: 'Verifies TypeScript features compile correctly (interfaces, types, generics, async)',
    type: 'jest',
    path: 'tests/typescript/compilation.test.ts',
    groups: ['unit', 'typescript'],
    tags: ['quick', 't109'],
    estimatedTime: 2,
    enabled: true,
    debugInfo: 'Tests interfaces, unions, intersections, enums, generics, async/await, classes'
  },
  {
    id: 'typescript.build-output',
    name: 'TypeScript Build Output',
    description: 'Verifies TypeScript generates JS files, declarations, and source maps',
    type: 'jest',
    path: 'tests/typescript/compilation.test.ts',
    groups: ['build', 'typescript'],
    tags: ['t109'],
    estimatedTime: 3,
    enabled: true,
    debugInfo: 'Checks dist/ for .js, .d.ts, and .js.map files'
  },
  {
    id: 'typescript.incremental',
    name: 'TypeScript Incremental Compilation',
    description: 'Verifies incremental builds work and are reasonably fast',
    type: 'jest',
    path: 'tests/typescript/compilation.test.ts',
    groups: ['build', 'typescript'],
    tags: ['t109'],
    estimatedTime: 5,
    enabled: true,
    debugInfo: 'Tests rebuild performance after file changes'
  },

  // ===== Environment Config Tests (T112) =====
  {
    id: 'env.validation',
    name: 'Environment Validation',
    description: 'Verifies environment configuration validates required variables',
    type: 'jest',
    path: 'tests/config/env-validation.test.ts',
    groups: ['unit', 'config'],
    tags: ['quick', 't105', 't112'],
    estimatedTime: 2,
    enabled: true,
    debugInfo: 'Tests loadConfig() with various .env configurations, defaults, edge cases'
  }
];

/**
 * Get all tests for a specific task
 */
export function getTestsForTask(taskId: string): TestDefinition[] {
  return testRegistry.filter(test => 
    test.tags.includes(taskId.toLowerCase()) && test.enabled
  );
}

/**
 * Get all tests in a group
 */
export function getTestsInGroup(groupName: string): TestDefinition[] {
  return testRegistry.filter(test => 
    test.groups.includes(groupName) && test.enabled
  );
}

/**
 * Get tests by estimated time
 */
export function getQuickTests(maxSeconds: number = 5): TestDefinition[] {
  return testRegistry.filter(test => 
    test.estimatedTime <= maxSeconds && test.enabled
  );
}

/**
 * Get test by ID
 */
export function getTestById(id: string): TestDefinition | undefined {
  return testRegistry.find(test => test.id === id);
} 