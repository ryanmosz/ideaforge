# IdeaForge Test Suite

This directory contains all tests for the IdeaForge project. We use Jest as our primary testing framework with TypeScript support.

## Running Tests

### Standard Jest Commands (Recommended)

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage report
npm test -- --coverage

# Run a specific test file
npm test -- tests/parsers/basic-parser.test.ts

# Run tests matching a pattern
npm test -- parser

# Run tests in a specific directory
npm test -- tests/parsers/

# Run tests with verbose output
npm test -- --verbose
```

### Test Runner Commands (Advanced)

The test runner provides more control over test execution:

```bash
# Run all tests using the test runner
npm run test:all

# Run quick tests only (under 5 seconds)
npm run test:quick

# Run tests for a specific task
npm run test:task t202

# Run tests by group
npm run test:group unit
npm run test:group integration
npm run test:group parser

# List all available tests
npm run test:list
```

### Common Issues and Solutions

#### 1. TypeScript Compilation Errors
If you get TypeScript errors when running `npm run test:all`, use the standard Jest command instead:
```bash
npm test
```

#### 2. Environment Configuration
Some tests require a `.env` file. Create one if missing:
```bash
cp .env.example .env
```

#### 3. Permission Errors (macOS/Linux)
If CLI tests fail due to permissions:
```bash
chmod +x bin/ideaforge
```

## Test Structure

### Test Groups
- **unit**: Fast, isolated unit tests
- **integration**: Tests that integrate multiple components
- **parser**: Org-mode parser tests
- **cli**: Command-line interface tests
- **config**: Configuration and environment tests
- **utils**: Utility function tests
- **smoke**: Quick tests to verify basic functionality
- **performance**: Tests that measure performance
- **error-handling**: Error handling and recovery tests

### Test Organization
```
tests/
├── README.md                    # This file
├── test-registry.ts            # Central test registry
├── test-runner.ts              # Advanced test runner
├── parsers/                    # Parser tests (T201-T210)
│   ├── basic-parser.test.ts    # Basic parsing functionality
│   ├── validator.test.ts       # Template validation
│   ├── data-extraction.test.ts # Data extraction from documents
│   ├── enhanced-tags.test.ts   # Tag and property support
│   ├── response-detection.test.ts # Response section detection
│   ├── error-handling.test.ts  # Error handling and recovery
│   └── comprehensive.test.ts   # Comprehensive edge cases
├── cli/                        # CLI tests
│   ├── executable.test.ts      # CLI executable tests
│   └── test-commands.sh        # Bash script tests
├── config/                     # Configuration tests
│   └── env-validation.test.ts  # Environment validation
├── utils/                      # Utility tests
│   └── error-handler.test.ts   # Error handling utilities
├── jest/                       # Jest framework tests
│   └── typescript-support.test.ts # TypeScript integration
├── typescript/                 # TypeScript compilation tests
│   └── compilation.test.ts     # Build and compilation
├── runners/                    # Test runner utilities
│   └── jest-runner.ts          # Jest test execution
├── setup.test.ts              # Project setup verification
└── sample.test.ts             # Simple example test
```

## Writing Tests

### Basic Test Structure
```typescript
import { OrgModeParser } from '../src/parsers/orgmode-parser';

describe('Component Name', () => {
  let parser: OrgModeParser;

  beforeEach(() => {
    parser = new OrgModeParser();
  });

  it('should do something specific', () => {
    const input = 'test input';
    const result = parser.parse(input);
    expect(result.success).toBe(true);
  });
});
```

### Test Best Practices
1. **Descriptive Names**: Use clear, descriptive test names
2. **Arrange-Act-Assert**: Structure tests with clear setup, action, and verification
3. **One Assertion Per Test**: Keep tests focused on a single behavior
4. **Mock External Dependencies**: Use Jest mocks for file system, network calls
5. **Test Edge Cases**: Include tests for error conditions and edge cases

## Coverage Reports

Generate and view coverage reports:

```bash
# Generate coverage report
npm test -- --coverage

# Generate coverage with specific reporters
npm test -- --coverage --coverageReporters=text-lcov

# Coverage files are created in:
# - coverage/lcov-report/index.html (HTML report)
# - coverage/coverage-final.json (JSON data)
```

## Debugging Tests

### VS Code Debugging
1. Set breakpoints in your test files
2. Use the "Jest: Debug" launch configuration
3. Or run individual tests with debugging:
   ```bash
   node --inspect-brk node_modules/.bin/jest --runInBand tests/parsers/basic-parser.test.ts
   ```

### Console Debugging
```typescript
it('should parse correctly', () => {
  const input = 'test';
  console.log('Input:', input);
  const result = parser.parse(input);
  console.log('Result:', result);
  expect(result).toBeDefined();
});
```

## Continuous Integration

Tests run automatically on:
- Every push to GitHub
- Pull request creation/update
- Scheduled daily builds

See `.github/workflows/` for CI configuration.

## Quick Reference

```bash
# Most common commands
npm test                    # Run all tests
npm test -- --watch        # Watch mode
npm test -- --coverage     # With coverage
npm test parser            # Run parser tests
npm test -- -t "should parse" # Run tests matching name
```

## Troubleshooting

If tests are failing:
1. Ensure all dependencies are installed: `npm install`
2. Rebuild the project: `npm run build`
3. Check for TypeScript errors: `npm run type-check`
4. Verify your Node version: `node --version` (should be 18+)
5. Clear Jest cache: `npx jest --clearCache`

For more help, check the main project README or open an issue on GitHub. 