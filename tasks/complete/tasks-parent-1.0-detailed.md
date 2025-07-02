# Detailed Tasks: Parent Task 1.0 - Project Foundation

## T101: Initialize Node.js/TypeScript project structure

### Prerequisites
- Node.js >= 16.0.0 installed
- npm available in PATH
- Git initialized in project directory

### Implementation Steps
1. Run `npm init -y` to create initial package.json
2. Update package.json with project metadata:
   ```json
   {
     "name": "ideaforge",
     "version": "0.1.0",
     "description": "Transform your project ideas into actionable plans",
     "author": "Your Name",
     "license": "MIT",
     "engines": {
       "node": ">=16.0.0"
     }
   }
   ```
3. Create directory structure:
   ```bash
   mkdir -p src/cli src/models src/services src/utils src/config tests bin
   ```
4. Create .gitignore file with Node.js patterns:
   ```
   node_modules/
   dist/
   .env
   .env.local
   *.log
   .DS_Store
   coverage/
   .vscode/
   .idea/
   ```
5. Create initial README.md with project description

### Testing Procedures
1. Verify package.json exists and has correct name
2. Check all directories were created: `ls -la src/`
3. Ensure .gitignore is properly configured: `git status`

### Definition of Done
- ✅ package.json exists with correct metadata
- ✅ All required directories created
- ✅ .gitignore configured for Node.js
- ✅ README.md created with basic content

---

## T102: Configure TypeScript compiler with strict settings

### Prerequisites
- T101 completed (project structure exists)
- package.json file present

### Implementation Steps
1. Install TypeScript as dev dependency:
   ```bash
   npm install --save-dev typescript@5.2.2 @types/node@20.10.0
   ```
2. Create tsconfig.json with strict configuration:
   ```json
   {
     "compilerOptions": {
       "target": "ES2022",
       "module": "commonjs",
       "lib": ["ES2022"],
       "outDir": "./dist",
       "rootDir": "./src",
       "strict": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "forceConsistentCasingInFileNames": true,
       "resolveJsonModule": true,
       "declaration": true,
       "declarationMap": true,
       "sourceMap": true,
       "noUnusedLocals": true,
       "noUnusedParameters": true,
       "noImplicitReturns": true,
       "noFallthroughCasesInSwitch": true
     },
     "include": ["src/**/*"],
     "exclude": ["node_modules", "dist", "tests"]
   }
   ```
3. Add build script to package.json:
   ```json
   "scripts": {
     "build": "tsc",
     "build:watch": "tsc --watch"
   }
   ```
4. Create a simple test file `src/index.ts`:
   ```typescript
   console.log('IdeaForge CLI');
   ```

### Testing Procedures
1. Run `npm run build` - should compile without errors
2. Check dist/ directory was created
3. Verify source maps exist in dist/
4. Run `npx tsc --noEmit` to verify configuration

### Definition of Done
- ✅ TypeScript installed at version 5.2.2
- ✅ tsconfig.json configured with strict mode
- ✅ Build script successfully compiles
- ✅ Source maps generated in dist/

---

## T103: Set up Jest testing framework

### Prerequisites
- T102 completed (TypeScript configured)
- package.json with TypeScript installed

### Implementation Steps
1. Install Jest and TypeScript support:
   ```bash
   npm install --save-dev jest@29.7.0 @types/jest@29.5.10 ts-jest@29.1.1
   ```
2. Create jest.config.js:
   ```javascript
   module.exports = {
     preset: 'ts-jest',
     testEnvironment: 'node',
     roots: ['<rootDir>/tests'],
     testMatch: ['**/*.test.ts'],
     collectCoverageFrom: [
       'src/**/*.ts',
       '!src/**/*.d.ts',
     ],
     coverageDirectory: 'coverage',
     coverageReporters: ['text', 'lcov', 'html'],
   };
   ```
3. Add test scripts to package.json:
   ```json
   "scripts": {
     "test": "jest",
     "test:watch": "jest --watch",
     "test:coverage": "jest --coverage"
   }
   ```
4. Create sample test `tests/sample.test.ts`:
   ```typescript
   describe('Sample Test', () => {
     it('should pass a basic test', () => {
       expect(1 + 1).toBe(2);
     });
   });
   ```

### Testing Procedures
1. Run `npm test` - sample test should pass
2. Run `npm run test:coverage` - coverage report should generate
3. Check coverage/ directory exists
4. Verify TypeScript tests compile correctly

### Definition of Done
- ✅ Jest installed with ts-jest preset
- ✅ jest.config.js properly configured
- ✅ Sample test passes
- ✅ Coverage reporting works

---

## T104: Install core dependencies with exact versions

### Prerequisites
- T101-T103 completed
- package.json exists with scripts

### Implementation Steps
1. Install production dependencies:
   ```bash
   npm install commander@11.1.0 chalk@5.3.0 ora@7.0.1 axios@1.6.0
   ```
2. Install additional dev dependencies:
   ```bash
   npm install --save-dev \
     eslint@8.54.0 \
     @typescript-eslint/parser@6.13.0 \
     @typescript-eslint/eslint-plugin@6.13.0 \
     ts-node@10.9.1
   ```
3. Add dev script to package.json:
   ```json
   "scripts": {
     "dev": "ts-node src/cli/index.ts"
   }
   ```
4. Verify all dependencies installed at correct versions:
   ```bash
   npm list --depth=0
   ```

### Testing Procedures
1. Check package.json has all dependencies at exact versions
2. Run `npm ls` to verify no missing dependencies
3. Create test imports in src/index.ts:
   ```typescript
   import { Command } from 'commander';
   import chalk from 'chalk';
   import ora from 'ora';
   import axios from 'axios';
   
   console.log(chalk.green('Dependencies loaded successfully'));
   ```
4. Run `npm run build` to verify imports work

### Definition of Done
- ✅ All production dependencies installed at exact versions
- ✅ All dev dependencies installed at exact versions
- ✅ No npm warnings or peer dependency issues
- ✅ Can import and use each package

---

## T105: Create environment configuration system

### Prerequisites
- T104 completed (all dependencies installed)
- src/config/ directory exists

### Implementation Steps
1. Create .env.example file:
   ```bash
   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key_here
   
   # n8n Webhook Configuration  
   N8N_WEBHOOK_URL=https://your-n8n-instance.elestio.app/webhook/ideaforge
   
   # Optional Configuration
   LOG_LEVEL=info
   NODE_ENV=development
   ```
2. Install dotenv:
   ```bash
   npm install dotenv@16.3.1
   ```
3. Create src/config/index.ts:
   ```typescript
   import * as dotenv from 'dotenv';
   import * as path from 'path';
   
   // Load .env file
   dotenv.config({ path: path.resolve(process.cwd(), '.env') });
   
   interface Config {
     openaiApiKey: string;
     n8nWebhookUrl: string;
     logLevel: string;
     nodeEnv: string;
   }
   
   export function loadConfig(): Config {
     const required = ['OPENAI_API_KEY', 'N8N_WEBHOOK_URL'];
     
     for (const key of required) {
       if (!process.env[key]) {
         throw new Error(`Missing required environment variable: ${key}`);
       }
     }
   
     return {
       openaiApiKey: process.env.OPENAI_API_KEY!,
       n8nWebhookUrl: process.env.N8N_WEBHOOK_URL!,
       logLevel: process.env.LOG_LEVEL || 'info',
       nodeEnv: process.env.NODE_ENV || 'development',
     };
   }
   ```
4. Update .gitignore to include .env files:
   ```
   .env
   .env.local
   .env.*.local
   ```

### Testing Procedures
1. Copy .env.example to .env with test values
2. Run test to load config:
   ```typescript
   import { loadConfig } from './src/config';
   try {
     const config = loadConfig();
     console.log('Config loaded successfully');
   } catch (error) {
     console.error('Config error:', error.message);
   }
   ```
3. Remove an env var and verify error is thrown
4. Check .env is not tracked by git

### Definition of Done
- ✅ .env.example documents all variables
- ✅ Configuration module validates required vars
- ✅ .env properly git-ignored
- ✅ Config loading works with proper error handling

---

## T106: Configure ESLint for code quality

### Prerequisites
- T104 completed (ESLint dependencies installed)
- TypeScript configured

### Implementation Steps
1. Create .eslintrc.js:
   ```javascript
   module.exports = {
     parser: '@typescript-eslint/parser',
     plugins: ['@typescript-eslint'],
     extends: [
       'eslint:recommended',
       'plugin:@typescript-eslint/recommended',
     ],
     env: {
       node: true,
       es2022: true,
       jest: true,
     },
     parserOptions: {
       ecmaVersion: 2022,
       sourceType: 'module',
       project: './tsconfig.json',
     },
     rules: {
       'max-lines': ['error', { max: 500 }],
       '@typescript-eslint/explicit-function-return-type': 'warn',
       '@typescript-eslint/no-unused-vars': 'error',
       '@typescript-eslint/no-explicit-any': 'error',
       'no-console': ['warn', { allow: ['warn', 'error'] }],
     },
   };
   ```
2. Add lint scripts to package.json:
   ```json
   "scripts": {
     "lint": "eslint src/**/*.ts",
     "lint:fix": "eslint src/**/*.ts --fix"
   }
   ```
3. Create .eslintignore:
   ```
   node_modules/
   dist/
   coverage/
   *.config.js
   ```

### Testing Procedures
1. Run `npm run lint` on existing code
2. Create a file with intentional issues:
   ```typescript
   // Bad code to test linting
   const unused = 'test';
   function longFunction() {
     // Add 500+ lines to test max-lines rule
   }
   ```
3. Verify ESLint catches the issues
4. Run `npm run lint:fix` to test auto-fixing

### Definition of Done
- ✅ ESLint configured with TypeScript support
- ✅ 500-line limit rule active
- ✅ Lint script finds issues correctly
- ✅ No false positives on valid code

---

## T107: Create executable CLI entry point

### Prerequisites
- T101 completed (bin/ directory exists)
- T104 completed (dependencies installed)

### Implementation Steps
1. Create bin/ideaforge:
   ```bash
   #!/usr/bin/env node
   require('../dist/cli/index.js');
   ```
2. Make it executable:
   ```bash
   chmod +x bin/ideaforge
   ```
3. Update package.json bin field:
   ```json
   {
     "bin": {
       "ideaforge": "./bin/ideaforge"
     },
     "main": "dist/cli/index.js"
   }
   ```
4. Create src/cli/index.ts:
   ```typescript
   #!/usr/bin/env node
   import { Command } from 'commander';
   import chalk from 'chalk';
   
   const program = new Command();
   
   program
     .name('ideaforge')
     .description('Transform your project ideas into actionable plans')
     .version('0.1.0');
   
   program
     .command('test')
     .description('Test command to verify CLI works')
     .action(() => {
       console.log(chalk.green('✓ IdeaForge CLI is working!'));
     });
   
   program.parse(process.argv);
   ```

### Testing Procedures
1. Run `npm run build`
2. Run `./bin/ideaforge --help`
3. Run `./bin/ideaforge test`
4. Run `npm link` and test global installation
5. Test on Windows with Git Bash if available

### Definition of Done
- ✅ bin/ideaforge is executable
- ✅ CLI shows help text
- ✅ Test command works
- ✅ Can be installed globally with npm link

---

## T108: Verify complete setup with smoke tests

### Prerequisites
- T101-T107 completed
- All configurations in place

### Implementation Steps
1. Create tests/setup.test.ts:
   ```typescript
   import * as fs from 'fs';
   import * as path from 'path';
   
   describe('Project Setup Verification', () => {
     it('should have all required directories', () => {
       const dirs = ['src', 'src/cli', 'src/models', 'src/services', 'src/utils', 'src/config', 'tests', 'bin'];
       dirs.forEach(dir => {
         expect(fs.existsSync(path.join(process.cwd(), dir))).toBe(true);
       });
     });
   
     it('should have all config files', () => {
       const files = ['package.json', 'tsconfig.json', 'jest.config.js', '.eslintrc.js', '.gitignore'];
       files.forEach(file => {
         expect(fs.existsSync(path.join(process.cwd(), file))).toBe(true);
       });
     });
   
     it('should have executable bin script', () => {
       const binPath = path.join(process.cwd(), 'bin/ideaforge');
       expect(fs.existsSync(binPath)).toBe(true);
       const stats = fs.statSync(binPath);
       expect(stats.mode & 0o111).toBeTruthy(); // Check executable bit
     });
   });
   ```
2. Run all verification commands:
   ```bash
   npm run build
   npm test
   npm run lint
   ./bin/ideaforge --version
   ```
3. Create a checklist of manual verifications

### Testing Procedures
1. Run the setup test suite
2. Verify all npm scripts work
3. Check no TypeScript compilation errors
4. Ensure environment config loads properly

### Definition of Done
- ✅ All automated tests pass
- ✅ Build completes without errors
- ✅ Linting passes
- ✅ CLI executable works
- ✅ Environment configuration validated

---

## T109: Test TypeScript compilation pipeline

### Prerequisites
- T108 completed
- TypeScript configured and building

### Implementation Steps
1. Create test file with various TypeScript features:
   ```typescript
   // tests/typescript-features.test.ts
   interface TestInterface {
     name: string;
     value: number;
   }
   
   type TestType = 'option1' | 'option2';
   
   async function testAsync(): Promise<void> {
     await new Promise(resolve => setTimeout(resolve, 100));
   }
   
   describe('TypeScript Features', () => {
     it('should support interfaces', () => {
       const obj: TestInterface = { name: 'test', value: 42 };
       expect(obj.name).toBe('test');
     });
   
     it('should support union types', () => {
       const value: TestType = 'option1';
       expect(['option1', 'option2']).toContain(value);
     });
   
     it('should support async/await', async () => {
       await expect(testAsync()).resolves.toBeUndefined();
     });
   });
   ```
2. Test incremental compilation:
   ```bash
   npm run build
   touch src/cli/index.ts
   time npm run build  # Should be faster
   ```
3. Verify declaration files generated in dist/

### Testing Procedures
1. Run full build and check for .d.ts files
2. Modify a source file and rebuild
3. Check source maps work for debugging
4. Verify no compilation errors

### Definition of Done
- ✅ TypeScript features compile correctly
- ✅ Declaration files generated
- ✅ Incremental compilation works
- ✅ Source maps present and valid

---

## T110: Verify Jest runs with TypeScript support

### Prerequisites
- T109 completed
- Jest configured with ts-jest

### Implementation Steps
1. Create comprehensive test suite:
   ```typescript
   // tests/jest-typescript.test.ts
   import { loadConfig } from '../src/config';
   
   // Mock environment variables
   const originalEnv = process.env;
   
   beforeEach(() => {
     jest.resetModules();
     process.env = { ...originalEnv };
   });
   
   afterEach(() => {
     process.env = originalEnv;
   });
   
   describe('Jest TypeScript Integration', () => {
     it('should handle TypeScript imports', () => {
       expect(typeof loadConfig).toBe('function');
     });
   
     it('should support mocking', () => {
       const mockFn = jest.fn().mockReturnValue('mocked');
       expect(mockFn()).toBe('mocked');
       expect(mockFn).toHaveBeenCalledTimes(1);
     });
   
     it('should handle async tests', async () => {
       const promise = Promise.resolve('async value');
       await expect(promise).resolves.toBe('async value');
     });
   });
   ```
2. Test coverage reporting:
   ```bash
   npm run test:coverage
   ```
3. Verify coverage reports in coverage/lcov-report/index.html

### Testing Procedures
1. Run all tests with coverage
2. Check HTML coverage report
3. Verify TypeScript paths resolve correctly
4. Test watch mode works

### Definition of Done
- ✅ Jest runs TypeScript tests directly
- ✅ Coverage reports generate correctly
- ✅ Mocking works as expected
- ✅ Async tests handled properly

---

## T111: Test CLI executable on all platforms

### Prerequisites
- T107 completed (CLI entry point created)
- T108 completed (basic verification done)

### Implementation Steps
1. Create cross-platform test script:
   ```typescript
   // tests/cli-cross-platform.test.ts
   import { execSync } from 'child_process';
   import * as path from 'path';
   import * as os from 'os';
   
   describe('CLI Cross-Platform', () => {
     const cliPath = path.join(process.cwd(), 'bin', 'ideaforge');
     
     it('should execute on current platform', () => {
       const output = execSync(`node ${cliPath} --version`, { encoding: 'utf8' });
       expect(output).toContain('0.1.0');
     });
   
     it('should handle different line endings', () => {
       const output = execSync(`node ${cliPath} test`, { encoding: 'utf8' });
       expect(output.trim()).toContain('IdeaForge CLI is working');
     });
   
     it('should work with npm run', () => {
       const output = execSync('npm run dev -- --help', { encoding: 'utf8' });
       expect(output).toContain('ideaforge');
     });
   });
   ```
2. Test with different shells if available:
   ```bash
   # Bash
   ./bin/ideaforge test
   
   # PowerShell (Windows)
   node ./bin/ideaforge test
   
   # CMD (Windows)
   node bin\ideaforge test
   ```

### Testing Procedures
1. Run tests on macOS/Linux with bash
2. If available, test on Windows
3. Test with npm link installation
4. Verify shebang line works correctly

### Definition of Done
- ✅ CLI works on current platform
- ✅ Handles path separators correctly
- ✅ npm scripts work cross-platform
- ✅ No platform-specific errors

---

## T112: Validate environment configuration loading

### Prerequisites
- T105 completed (env config created)
- .env.example file exists

### Implementation Steps
1. Create environment validation tests:
   ```typescript
   // tests/env-config.test.ts
   import { loadConfig } from '../src/config';
   import * as fs from 'fs';
   import * as path from 'path';
   
   describe('Environment Configuration', () => {
     const originalEnv = process.env;
     
     beforeEach(() => {
       jest.resetModules();
       process.env = { ...originalEnv };
     });
     
     afterEach(() => {
       process.env = originalEnv;
     });
     
     it('should load valid configuration', () => {
       process.env.OPENAI_API_KEY = 'test-key';
       process.env.N8N_WEBHOOK_URL = 'https://test.com/webhook';
       
       const config = loadConfig();
       expect(config.openaiApiKey).toBe('test-key');
       expect(config.n8nWebhookUrl).toBe('https://test.com/webhook');
     });
     
     it('should throw on missing required variables', () => {
       delete process.env.OPENAI_API_KEY;
       expect(() => loadConfig()).toThrow('Missing required environment variable: OPENAI_API_KEY');
     });
     
     it('should use defaults for optional variables', () => {
       process.env.OPENAI_API_KEY = 'test-key';
       process.env.N8N_WEBHOOK_URL = 'https://test.com/webhook';
       delete process.env.LOG_LEVEL;
       
       const config = loadConfig();
       expect(config.logLevel).toBe('info');
       expect(config.nodeEnv).toBe('development');
     });
     
     it('should have .env.example with all variables', () => {
       const envExample = fs.readFileSync('.env.example', 'utf8');
       expect(envExample).toContain('OPENAI_API_KEY');
       expect(envExample).toContain('N8N_WEBHOOK_URL');
       expect(envExample).toContain('LOG_LEVEL');
       expect(envExample).toContain('NODE_ENV');
     });
   });
   ```
2. Create CLI integration with config:
   ```typescript
   // In src/cli/index.ts, add:
   import { loadConfig } from '../config';
   
   try {
     const config = loadConfig();
     // Config loaded successfully
   } catch (error) {
     console.error(chalk.red('Configuration error:'), error.message);
     console.error(chalk.yellow('Please copy .env.example to .env and fill in required values'));
     process.exit(1);
   }
   ```

### Testing Procedures
1. Run tests with various env configurations
2. Test with missing .env file
3. Test with invalid values
4. Verify helpful error messages

### Definition of Done
- ✅ Config loads with valid environment
- ✅ Clear errors for missing variables
- ✅ Defaults work correctly
- ✅ .env.example is complete
- ✅ CLI shows helpful error messages 