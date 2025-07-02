# Parent Task 1.0: Set up project foundation and development environment

## 1. Task Overview

### Summary
This parent task establishes the foundational infrastructure for the IdeaForge CLI tool. It creates the essential project structure, configures TypeScript for a clean, type-safe development experience, sets up testing capabilities, and installs all required dependencies. This task transforms an empty directory into a fully functional Node.js/TypeScript development environment ready for feature implementation.

### Architecture Fit
This is the foundation layer that all other components build upon. It establishes:
- The directory structure that organizes all future code
- The TypeScript configuration that ensures type safety across the project
- The testing infrastructure that validates all functionality
- The dependency management system that provides required tools

### Dependencies
- **None** - This is the first task and has no dependencies on other parent tasks

### Post-Completion Capabilities
- Writing TypeScript code with full type safety and IntelliSense support
- Running unit tests with Jest for quality assurance
- Building distributable JavaScript from TypeScript source
- Using Commander.js to structure CLI commands
- Styling terminal output with Chalk for better UX
- Showing progress indicators with Ora spinners
- Making HTTP requests with Axios for API integration
- Managing environment variables securely

## 2. Technical Design

### Architecture
```
ideaforge/
├── bin/                    # Executable scripts
│   └── ideaforge          # Main CLI entry point (chmod +x)
├── src/                   # TypeScript source code
│   ├── cli/              # CLI command implementations
│   │   └── index.ts      # Main entry point
│   ├── models/           # TypeScript interfaces and types
│   ├── services/         # Business logic and AI integration
│   ├── utils/            # Shared utility functions
│   └── config/           # Configuration management
├── dist/                  # Compiled JavaScript (git-ignored)
├── tests/                 # Test files
├── tasks/                 # Task lists and planning docs
├── .env.example          # Environment variable template
├── .gitignore            # Git ignore patterns
├── .eslintrc.js          # ESLint configuration
├── package.json          # Project metadata and scripts
├── tsconfig.json         # TypeScript compiler config
├── jest.config.js        # Jest testing config
└── README.md             # Project documentation
```

### Key Interfaces and Data Structures

```typescript
// src/config/types.ts
interface Config {
  openaiApiKey: string;
  n8nWebhookUrl: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  nodeEnv: 'development' | 'production' | 'test';
}

// src/cli/types.ts
interface CLIContext {
  config: Config;
  command: string;
  options: Record<string, any>;
}
```

### Integration Points
- **bin/ideaforge** → **dist/cli/index.js**: Shell script to compiled entry
- **src/config** → **Environment**: Loads and validates env variables
- **package.json scripts** → **npm commands**: Standardized workflows
- **TypeScript** → **All source files**: Type checking and compilation

### Technology Considerations (Per tech-stack-definition.md)
- **Node.js 16+**: Use built-in promises, async/await everywhere
- **TypeScript 5.2.2**: Strict mode for maximum type safety
- **CommonJS modules**: Required for Node.js compatibility (no ESM)
- **Commander.js 11.1.0**: Declarative CLI command structure
- **File limits**: Enforce 500-line maximum through ESLint

## 3. Implementation Sequence

### Critical Path
1. **T101**: Initialize project structure → Required before any other work
2. **T102**: Configure TypeScript → Required for type-safe development
3. **T105**: Environment configuration → Required for API integration
4. **T107**: CLI entry point → Required for testing commands

### Parallel Opportunities
- **T103** (Jest) + **T104** (dependencies): Can be done simultaneously
- **T106** (ESLint) can be done anytime after TypeScript setup
- **T108-T112** (verification tests): Can be parallelized

### Risk Points
- **TypeScript misconfiguration**: Would require rewriting all future code
- **Wrong module system**: Would break Node.js compatibility
- **Missing dependencies**: Would block feature implementation
- **Environment setup errors**: Would prevent API integration

## 4. Detailed Subtask Breakdown

### T101: Initialize Node.js/TypeScript project structure

**Description**: Create the foundational project structure with npm initialization and directory layout.

**Implementation Steps**:
1. Run `npm init -y` to create package.json
2. Update package.json with project metadata:
   ```json
   {
     "name": "ideaforge",
     "version": "0.1.0",
     "description": "Transform your project ideas into actionable plans",
     "engines": { "node": ">=16.0.0" }
   }
   ```
3. Create directory structure:
   ```bash
   mkdir -p src/cli src/models src/services src/utils src/config tests bin tasks
   ```
4. Create .gitignore with Node.js patterns
5. Create initial README.md

**Code Examples**:
```bash
# Full setup script
npm init -y
mkdir -p src/{cli,models,services,utils,config} tests bin tasks
echo "node_modules/\ndist/\n.env\n*.log\ncoverage/" > .gitignore
echo "# IdeaForge\n\nTransform your project ideas into actionable plans" > README.md
```

**File Changes**:
- Create: package.json, .gitignore, README.md
- Create: All directory structure

**Testing Approach**:
- Verify all directories exist with `ls -la`
- Check package.json has correct fields
- Ensure .gitignore works with `git status`

**Definition of Done**:
- ✅ All directories created
- ✅ package.json has correct metadata
- ✅ .gitignore properly configured
- ✅ Git recognizes the structure

**Common Pitfalls**:
- Forgetting to create the tasks directory
- Not setting Node.js engine requirement
- Using wrong project name in package.json

### T102: Configure TypeScript compiler with strict settings

**Description**: Set up TypeScript with strict compilation for maximum type safety.

**Implementation Steps**:
1. Install TypeScript and Node types:
   ```bash
   npm install --save-dev typescript@5.2.2 @types/node@20.10.0
   ```
2. Create tsconfig.json with strict settings
3. Add build scripts to package.json
4. Create test file to verify compilation

**Code Examples**:
```json
// tsconfig.json
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

**File Changes**:
- Create: tsconfig.json
- Update: package.json (add typescript, build script)

**Testing Approach**:
- Run `npm run build` with empty src/index.ts
- Verify dist/ directory created
- Check source maps generated

**Definition of Done**:
- ✅ TypeScript compiles without errors
- ✅ Strict mode enabled
- ✅ Source maps work
- ✅ Declaration files generated

**Common Pitfalls**:
- Using ES modules instead of CommonJS
- Forgetting to exclude test files
- Not enabling strict mode

### T103: Set up Jest testing framework

**Description**: Configure Jest for unit testing with TypeScript support.

**Implementation Steps**:
1. Install Jest dependencies:
   ```bash
   npm install --save-dev jest@29.7.0 @types/jest@29.5.10 ts-jest@29.1.1
   ```
2. Create jest.config.js
3. Add test scripts to package.json
4. Create sample test

**Code Examples**:
```javascript
// jest.config.js
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

**File Changes**:
- Create: jest.config.js
- Create: tests/sample.test.ts
- Update: package.json (add test scripts)

**Testing Approach**:
- Run `npm test` with sample test
- Verify coverage with `npm run test:coverage`
- Check HTML report generates

**Definition of Done**:
- ✅ Jest runs TypeScript tests
- ✅ Coverage reporting works
- ✅ Sample test passes
- ✅ Watch mode functions

**Common Pitfalls**:
- Wrong test file patterns
- Missing ts-jest preset
- Coverage not configured

### T104: Install core dependencies with exact versions

**Description**: Install all required npm packages per tech stack definition.

**Implementation Steps**:
1. Install production dependencies:
   ```bash
   npm install commander@11.1.0 chalk@5.3.0 ora@7.0.1 axios@1.6.0 dotenv@16.3.1
   ```
2. Install dev dependencies:
   ```bash
   npm install --save-dev \
     eslint@8.54.0 \
     @typescript-eslint/parser@6.13.0 \
     @typescript-eslint/eslint-plugin@6.13.0 \
     ts-node@10.9.1
   ```
3. Verify exact versions
4. Add dev script

**Code Examples**:
```json
// package.json scripts
{
  "scripts": {
    "build": "tsc",
    "dev": "ts-node src/cli/index.ts",
    "test": "jest",
    "lint": "eslint src/**/*.ts"
  }
}
```

**File Changes**:
- Update: package.json (all dependencies)
- Update: package-lock.json

**Testing Approach**:
- Run `npm list --depth=0`
- Import each package in test file
- Verify no version warnings

**Definition of Done**:
- ✅ All packages at exact versions
- ✅ No peer dependency warnings
- ✅ Can import all packages
- ✅ Dev script works

**Common Pitfalls**:
- Installing latest instead of specified versions
- Missing peer dependencies
- Version conflicts

### T105: Create environment configuration system

**Description**: Build secure environment variable management for API keys.

**Implementation Steps**:
1. Create .env.example template
2. Create configuration module
3. Add validation logic
4. Update .gitignore

**Code Examples**:
```typescript
// src/config/index.ts
import * as dotenv from 'dotenv';
import * as path from 'path';

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

**File Changes**:
- Create: .env.example
- Create: src/config/index.ts
- Update: .gitignore (add .env patterns)

**Testing Approach**:
- Test with valid .env file
- Test with missing variables
- Verify .env not tracked

**Definition of Done**:
- ✅ Config loads successfully
- ✅ Validates required vars
- ✅ .env ignored by git
- ✅ Clear error messages

**Common Pitfalls**:
- Committing .env file
- Not validating at startup
- Poor error messages

### T106: Configure ESLint for code quality

**Description**: Set up ESLint with TypeScript support and 500-line limit.

**Implementation Steps**:
1. Create .eslintrc.js configuration
2. Add lint scripts
3. Create .eslintignore
4. Test on sample files

**Code Examples**:
```javascript
// .eslintrc.js
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
  rules: {
    'max-lines': ['error', { max: 500 }],
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
  },
};
```

**File Changes**:
- Create: .eslintrc.js
- Create: .eslintignore
- Update: package.json (lint scripts)

**Testing Approach**:
- Run on existing code
- Create file with violations
- Test auto-fix feature

**Definition of Done**:
- ✅ ESLint runs successfully
- ✅ 500-line limit enforced
- ✅ TypeScript rules work
- ✅ No false positives

**Common Pitfalls**:
- Too strict initial rules
- Not excluding generated files
- Conflicting rule sets

### T107: Create executable CLI entry point

**Description**: Build the main CLI executable with Commander.js structure.

**Implementation Steps**:
1. Create bin/ideaforge script
2. Make it executable
3. Create src/cli/index.ts
4. Configure package.json bin field

**Code Examples**:
```typescript
// src/cli/index.ts
#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '../config';

const program = new Command();

// Try to load config
try {
  const config = loadConfig();
  console.log(chalk.green('✓ Configuration loaded'));
} catch (error: any) {
  console.error(chalk.red('Configuration error:'), error.message);
  console.error(chalk.yellow('Please copy .env.example to .env and fill in required values'));
  process.exit(1);
}

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

**File Changes**:
- Create: bin/ideaforge
- Create: src/cli/index.ts
- Update: package.json (bin field)

**Testing Approach**:
- Run `./bin/ideaforge --help`
- Test with npm link
- Verify on different shells

**Definition of Done**:
- ✅ CLI shows help text
- ✅ Test command works
- ✅ Config validation runs
- ✅ Cross-platform compatible

**Common Pitfalls**:
- Wrong shebang line
- Not making script executable
- Path issues on Windows

### T108: Verify complete setup with smoke tests

**Description**: Create comprehensive tests to verify the entire setup.

**Implementation Steps**:
1. Create setup verification tests
2. Run all build commands
3. Test all npm scripts
4. Document any issues

**Code Examples**:
```typescript
// tests/setup.test.ts
import * as fs from 'fs';
import * as path from 'path';

describe('Project Setup Verification', () => {
  it('should have all required directories', () => {
    const dirs = [
      'src', 'src/cli', 'src/models', 
      'src/services', 'src/utils', 'src/config', 
      'tests', 'bin', 'tasks'
    ];
    dirs.forEach(dir => {
      expect(fs.existsSync(path.join(process.cwd(), dir))).toBe(true);
    });
  });

  it('should have all config files', () => {
    const files = [
      'package.json', 'tsconfig.json', 
      'jest.config.js', '.eslintrc.js', '.gitignore'
    ];
    files.forEach(file => {
      expect(fs.existsSync(path.join(process.cwd(), file))).toBe(true);
    });
  });
});
```

**File Changes**:
- Create: tests/setup.test.ts
- Create: tests/typescript-features.test.ts

**Testing Approach**:
- Run full test suite
- Build project
- Lint all code
- Execute CLI

**Definition of Done**:
- ✅ All tests pass
- ✅ Build succeeds
- ✅ Lint passes
- ✅ CLI runs

**Common Pitfalls**:
- Missing test cases
- Not testing edge cases
- Incomplete verification

## 5. Testing Strategy

### Unit Tests
- Configuration module validation
- TypeScript compilation tests
- ESLint rule verification
- CLI command parsing

### Integration Tests
- Full build pipeline test
- Environment loading with CLI
- Cross-platform execution
- Package installation verification

### Manual Testing
1. Clone fresh copy
2. Run `npm install`
3. Copy .env.example to .env
4. Run all npm scripts
5. Test CLI commands
6. Verify on different OS

### Mock Data
- Sample .env with test values
- Test TypeScript files
- Example CLI inputs

## 6. Integration Plan

### Existing Code Integration
- This is the foundation - no existing code yet
- Future tasks will import from this structure

### API Contracts
```typescript
// Config module
export function loadConfig(): Config;

// CLI types
export interface CLIContext;
export interface CommandOptions;
```

### Configuration Requirements
- Node.js >= 16.0.0
- npm or yarn
- Git for version control
- Valid .env file

### Migration Steps
- Not applicable (greenfield project)

## 7. Documentation Requirements

### Code Documentation
- TSDoc comments for all exports
- Inline comments for complex logic
- README with setup instructions
- Environment variable documentation

### README Updates
```markdown
# IdeaForge

## Installation
1. Clone repository
2. Run `npm install`
3. Copy `.env.example` to `.env`
4. Fill in required API keys
5. Run `npm run build`

## Development
- `npm run dev` - Run in development
- `npm test` - Run tests
- `npm run lint` - Check code quality
```

### API Documentation
- Document all exported functions
- Include usage examples
- List all env variables

### Usage Examples
```bash
# Build project
npm run build

# Run CLI
./bin/ideaforge test

# Development mode
npm run dev -- test
```

## 8. Functional Requirements

1. **Project Structure**: Complete Node.js/TypeScript project layout
2. **TypeScript Compilation**: Strict mode, CommonJS output
3. **Testing Framework**: Jest with TypeScript support
4. **Code Quality**: ESLint with 500-line limit
5. **CLI Framework**: Commander.js integration
6. **Environment Management**: Secure config loading
7. **Cross-Platform**: Works on Windows/Mac/Linux
8. **Developer Experience**: Clear scripts and documentation

## 9. Success Metrics

- **Build Time**: < 10 seconds for full compilation
- **Test Execution**: < 5 seconds for unit tests
- **Lint Performance**: < 3 seconds for full project
- **Zero Errors**: No TypeScript/ESLint errors
- **100% Scripts Work**: All npm scripts function
- **Clear Errors**: Helpful messages for missing config

## 10. Next Steps

### Immediate Next Tasks
- **Task 2.0**: Implement org-mode parsing and file handling
- **Task 3.0**: Build CLI command structure
- **Task 4.0**: Start LangGraph integration

### Future Enhancements
- GitHub Actions CI/CD setup
- Docker development container
- Automated dependency updates
- Performance profiling tools

### Research Needs
- LangGraph TypeScript examples
- n8n webhook best practices
- Org-mode parsing libraries 