# Parent Task 1.0: Set up project foundation and development environment

## Task Overview

This parent task establishes the foundational infrastructure for the IdeaForge CLI tool. It creates the essential project structure, configures TypeScript for a clean, type-safe development experience, sets up testing capabilities, and installs all required dependencies. This task transforms an empty directory into a fully functional Node.js/TypeScript development environment ready for feature implementation.

### What This Task Accomplishes
- Creates a professional Node.js/TypeScript project structure
- Configures build tools for reliable compilation
- Establishes testing infrastructure for quality assurance
- Installs and configures all core dependencies
- Sets up environment variable management

### How It Fits Into IdeaForge Architecture
This is the foundation layer that all other components build upon. Without proper project setup:
- TypeScript types won't be available for development
- Dependencies won't be resolved for implementation
- Testing infrastructure won't exist for quality assurance
- Build processes won't work for distribution

### Dependencies on Other Parent Tasks
- **None** - This is the first task and has no dependencies

### What Will Be Possible After Completion
- Writing TypeScript code with full type safety
- Running tests with Jest
- Building distributable JavaScript from TypeScript
- Using Commander.js for CLI structure
- Styling terminal output with Chalk
- Showing progress with Ora spinners
- Making HTTP requests with Axios
- Managing environment variables

## Technical Design

### Architecture Overview
```
ideaforge/
├── bin/                    # Executable scripts
│   └── ideaforge          # Main CLI entry point (chmod +x)
├── src/                   # TypeScript source code
│   ├── cli/              # CLI-specific code
│   │   └── index.ts      # Main CLI implementation
│   ├── models/           # TypeScript interfaces and types
│   ├── services/         # Business logic services
│   ├── utils/            # Utility functions
│   └── config/           # Configuration management
├── dist/                  # Compiled JavaScript (git-ignored)
├── tests/                 # Test files
├── .env.example          # Environment template
├── .gitignore            # Git ignore patterns
├── package.json          # Project configuration
├── tsconfig.json         # TypeScript configuration
├── jest.config.js        # Jest test configuration
└── README.md             # Project documentation
```

### Key Configuration Files

#### tsconfig.json
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

#### package.json Core Structure
```json
{
  "name": "ideaforge",
  "version": "0.1.0",
  "description": "Transform your project ideas into actionable plans",
  "main": "dist/cli/index.js",
  "bin": {
    "ideaforge": "./bin/ideaforge"
  },
  "scripts": {
    "build": "tsc",
    "dev": "ts-node src/cli/index.ts",
    "test": "jest",
    "lint": "eslint src/**/*.ts",
    "prepare": "npm run build"
  }
}
```

### Integration Points
- **bin/ideaforge** → **dist/cli/index.js**: Executable to compiled entry point
- **package.json scripts** → **Development workflow**: Standard npm commands
- **TypeScript config** → **All source files**: Type checking and compilation
- **Jest config** → **Test files**: Testing infrastructure

### Technology-Specific Considerations
- **CommonJS modules**: Required for Node.js compatibility (not ESM)
- **ES2022 target**: Modern JavaScript features while maintaining compatibility
- **Strict TypeScript**: Maximum type safety from the start
- **500-line limit**: Enforced through linting and code review

## Implementation Sequence

1. **Initialize npm project and create basic structure** (Critical Path)
2. **Configure TypeScript compiler** (Critical Path)
3. **Set up testing framework** (Can be parallel with #4)
4. **Install core dependencies** (Can be parallel with #3)
5. **Create environment configuration** (Depends on #1)

### Critical Path
1 → 2 → 5 (Project must exist before TypeScript config, env config needs structure)

### Parallel Opportunities
- Subtasks 3 and 4 can be done simultaneously after TypeScript is configured

### Risk Points
- Incorrect TypeScript configuration could require rework of all future code
- Wrong module system choice would break Node.js compatibility
- Missing strict mode would allow type-unsafe code to accumulate

## Detailed Subtask Breakdown

### 1.1 Initialize Node.js/TypeScript project structure

**Description**: Create the foundational project structure and initialize npm.

**Implementation Steps**:
1. Initialize npm project with appropriate metadata
2. Create directory structure for source code
3. Create executable bin script
4. Set up basic .gitignore file
5. Create initial README.md

**Code Examples**:
```bash
# Initialize project
npm init -y

# Create directories
mkdir -p src/cli src/models src/services src/utils src/config tests bin

# Create executable
echo '#!/usr/bin/env node' > bin/ideaforge
echo 'require("../dist/cli/index.js");' >> bin/ideaforge
chmod +x bin/ideaforge
```

**.gitignore content**:
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

**File Changes**:
- Create: package.json
- Create: bin/ideaforge
- Create: .gitignore
- Create: README.md
- Create: Directory structure

**Testing Approach**:
- Verify `npm init` created valid package.json
- Ensure bin/ideaforge is executable (`ls -la bin/`)
- Check directory structure exists

**Definition of Done**:
- ✅ package.json exists with correct metadata
- ✅ bin/ideaforge is executable
- ✅ All directories created
- ✅ .gitignore properly configured

**Common Pitfalls**:
- Forgetting to chmod +x the bin script
- Using Windows line endings in bin script
- Not setting correct Node.js engine requirement

### 1.2 Configure build tools and TypeScript compiler

**Description**: Set up TypeScript with strict configuration for type safety.

**Implementation Steps**:
1. Install TypeScript as dev dependency
2. Create tsconfig.json with strict settings
3. Configure CommonJS module system
4. Set up source and output directories
5. Enable source maps for debugging

**Code Examples**:
```bash
npm install --save-dev typescript @types/node
```

**File Changes**:
- Create: tsconfig.json
- Update: package.json (add typescript dependency)

**Testing Approach**:
- Run `npx tsc --noEmit` to verify configuration
- Create simple test.ts file and compile it
- Verify dist/ directory is created after build

**Definition of Done**:
- ✅ TypeScript installed
- ✅ tsconfig.json configured with strict mode
- ✅ Build command successfully compiles empty project
- ✅ Source maps enabled

**Common Pitfalls**:
- Using ES modules instead of CommonJS
- Forgetting to exclude test files from compilation
- Not enabling strict mode from the start

### 1.3 Set up testing framework (Jest)

**Description**: Configure Jest for unit testing with TypeScript support.

**Implementation Steps**:
1. Install Jest and TypeScript support
2. Create Jest configuration file
3. Add test scripts to package.json
4. Create sample test to verify setup
5. Configure test coverage settings

**Code Examples**:
```bash
npm install --save-dev jest @types/jest ts-jest
```

**jest.config.js**:
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

**File Changes**:
- Create: jest.config.js
- Update: package.json (add jest dependencies and test script)
- Create: tests/sample.test.ts

**Testing Approach**:
- Run `npm test` with sample test
- Verify coverage reports generate
- Ensure TypeScript tests compile and run

**Definition of Done**:
- ✅ Jest installed with TypeScript support
- ✅ jest.config.js properly configured
- ✅ Sample test passes
- ✅ Coverage reporting works

**Common Pitfalls**:
- Incorrect test file patterns
- Not configuring ts-jest preset
- Missing test directory in configuration

### 1.4 Install core dependencies

**Description**: Install all required npm packages per tech stack definition.

**Implementation Steps**:
1. Install Commander.js for CLI framework
2. Install Chalk for terminal styling
3. Install Ora for loading spinners
4. Install Axios for HTTP requests
5. Install ESLint and TypeScript plugins

**Code Examples**:
```bash
# Production dependencies (exact versions per tech stack)
npm install commander@11.1.0 chalk@5.3.0 ora@7.0.1 axios@1.6.0

# Development dependencies
npm install --save-dev \
  eslint@8.54.0 \
  @typescript-eslint/parser@6.13.0 \
  @typescript-eslint/eslint-plugin@6.13.0 \
  ts-node@10.9.1
```

**.eslintrc.js**:
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
  },
  rules: {
    'max-lines': ['error', 500],
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-unused-vars': 'error',
  },
};
```

**File Changes**:
- Update: package.json (add all dependencies)
- Create: .eslintrc.js
- Update: package.json scripts (add lint command)

**Testing Approach**:
- Verify all packages installed with correct versions
- Test each package with simple import statement
- Run ESLint on sample file

**Definition of Done**:
- ✅ All dependencies installed with exact versions
- ✅ No npm warnings or peer dependency issues
- ✅ ESLint configuration works
- ✅ Can import and use each package

**Common Pitfalls**:
- Installing latest versions instead of specified versions
- Missing peer dependencies
- Incompatible package versions

### 1.5 Create environment configuration structure

**Description**: Set up environment variable management for API keys and configuration.

**Implementation Steps**:
1. Create .env.example template
2. Add .env to .gitignore
3. Create configuration loader module
4. Document required environment variables
5. Add validation for required variables

**Code Examples**:

**.env.example**:
```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# n8n Webhook Configuration  
N8N_WEBHOOK_URL=https://your-n8n-instance.elestio.app/webhook/ideaforge

# Optional Configuration
LOG_LEVEL=info
NODE_ENV=development
```

**src/config/index.ts**:
```typescript
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
- Update: .gitignore (ensure .env is ignored)
- Update: README.md (document env setup)

**Testing Approach**:
- Copy .env.example to .env with test values
- Verify config loader throws on missing variables
- Test that .env is properly ignored by git

**Definition of Done**:
- ✅ .env.example documents all variables
- ✅ Configuration module validates required vars
- ✅ .env properly git-ignored
- ✅ README includes setup instructions

**Common Pitfalls**:
- Committing .env file accidentally
- Not validating required variables at startup
- Hardcoding values instead of using env vars

## Testing Strategy

### Unit Test Requirements
- Test configuration loading with missing/invalid variables
- Test that TypeScript compilation includes all files
- Verify package.json scripts work correctly
- Test ESLint rules catch issues

### Integration Test Scenarios
- Full build process from TypeScript to JavaScript
- Executable bin script launches without errors
- All dependencies load without conflicts

### Manual Testing Procedures
1. Fresh clone and npm install
2. Copy .env.example to .env
3. Run `npm run build`
4. Run `./bin/ideaforge --help`
5. Run `npm test`
6. Run `npm run lint`

### Mock Data Needed
- Sample .env file with test API keys
- Simple TypeScript file for compilation testing
- Basic test file for Jest verification

## Integration Plan

### How to Integrate with Existing Code
- This is the first task, so no existing code to integrate with
- Future tasks will import from the structure created here

### API Contracts
- Export configuration through `src/config/index.ts`
- CLI entry point at `src/cli/index.ts`
- Type definitions in `src/models/` directory

### Configuration Requirements
- Node.js >= 16.0.0
- npm or yarn for package management
- Git for version control

### Migration Steps
- No migration needed - this is greenfield development

## Documentation Requirements

### Code Documentation Standards
- Use TSDoc comments for all public functions
- Include examples in documentation
- Document all configuration options
- Add inline comments for complex logic

### README Updates
- Installation instructions
- Environment setup guide  
- Development workflow
- Available npm scripts

### API Documentation
- Document config module exports
- List all environment variables
- Include type definitions

### Usage Examples
```bash
# Development
npm run dev -- --help

# Building
npm run build

# Testing
npm test

# Linting
npm run lint
```

## Estimated Timeline

### Hours per Subtask (Junior Developer)
- 1.1 Initialize project structure: **1 hour**
- 1.2 Configure TypeScript: **2 hours** 
- 1.3 Set up Jest: **2 hours**
- 1.4 Install dependencies: **1.5 hours**
- 1.5 Environment configuration: **1.5 hours**

### Total Time Estimate
**8 hours** (1 full working day)

### Suggested Daily Goals
- **Morning**: Complete subtasks 1.1 and 1.2
- **Afternoon**: Complete subtasks 1.3, 1.4, and 1.5
- **End of day**: All tests passing, project builds successfully

### Checkpoint Milestones
- **25%**: Project structure created, npm initialized
- **50%**: TypeScript configured and building
- **75%**: Jest working with sample test
- **100%**: All dependencies installed, environment configured

## Success Metrics

### Completion Criteria
- ✅ All subtasks marked complete
- ✅ `npm run build` succeeds without errors
- ✅ `npm test` runs sample test successfully
- ✅ `npm run lint` reports no issues
- ✅ `./bin/ideaforge` is executable
- ✅ All dependencies at specified versions

### Quality Metrics
- Zero TypeScript compilation errors
- 100% of files pass ESLint rules
- No security vulnerabilities in dependencies
- Configuration validates all required variables

### Performance Benchmarks
- Build completes in under 10 seconds
- Tests run in under 5 seconds
- Linting completes in under 3 seconds

## Next Steps

### What Becomes Possible
With the foundation in place, we can now:
- Implement org-mode parsing (Task 2.0)
- Build CLI commands with Commander.js (Task 3.0) 
- Start LangGraph integration (Task 4.0)
- Add any feature requiring TypeScript/Node.js

### Recommended Next Task
**Task 2.0: Implement org-mode parsing and file handling**
- Now that TypeScript is configured, we can create type-safe parsers
- File I/O utilities can be built on Node.js fs module
- Testing framework is ready for parser tests

### Future Enhancement Opportunities
- Add commit hooks for automatic linting
- Set up GitHub Actions for CI/CD
- Add pre-push testing requirements
- Create development container configuration 