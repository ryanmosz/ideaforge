# IdeaForge Test Runner

The IdeaForge test runner provides a unified interface for running all project tests with flexible execution options.

## Quick Start

```bash
# Run quick tests (default after each subtask)
npm run test:quick

# Run tests for current task
npm run test:current

# Run all tests
npm run test:all

# List all available tests
npm run test:list
```

## Command Line Usage

```bash
# Run the test runner directly
npm run test:runner -- [options]

Options:
  -t, --test <id>         Run a single test by ID
  -g, --group <name>      Run all tests in a group
  --tag <tag>             Run tests with specific tag
  --task <taskId>         Run tests for a specific task (e.g., t108)
  -a, --all               Run all enabled tests
  -q, --quick [seconds]   Run quick tests (default: 5 seconds)
  --current               Run tests for current task (auto-detected)
  -e, --exclude <tags>    Exclude tests with these tags (comma-separated)
  -v, --verbose           Show detailed output
  --dry-run               Show what would be run without executing
  --list                  List all available tests
  -h, --help              Display help
```

## Examples

```bash
# Run a single test
npm run test:runner -- --test setup.directories

# Run all unit tests
npm run test:runner -- --group unit

# Run tests for task T109
npm run test:runner -- --task t109

# Run all tests except slow ones
npm run test:runner -- --all --exclude slow

# See what tests would run (dry run)
npm run test:runner -- --group integration --dry-run

# Run with verbose output and debugging
DEBUG_TESTS=true npm run test:runner -- --all --verbose
```

## Test Groups

- **unit**: Fast, isolated unit tests
- **integration**: Tests that interact with CLI, file system, or APIs
- **smoke**: Basic tests that verify setup
- **build**: Tests related to TypeScript compilation
- **quick**: All tests that run in under 5 seconds

## Test Tags

- **t108, t109, etc.**: Tests associated with specific tasks
- **quick**: Tests that run quickly (< 5 seconds)
- **slow**: Tests that take longer to run
- **cli**: Tests related to CLI functionality
- **config**: Tests related to configuration

## Adding New Tests

1. Add test definition to `test-registry.ts`:
```typescript
{
  id: 'my-test.feature',
  name: 'My Feature Test',
  description: 'Verifies that my feature works correctly',
  type: 'jest',  // or 'bash' or 'custom'
  path: 'tests/my-test.test.ts',
  groups: ['unit', 'quick'],
  tags: ['t110', 'feature'],
  estimatedTime: 2,  // seconds
  enabled: true,
  debugInfo: 'Tests the doThing() function with various inputs'
}
```

2. If it's a Jest test, add the pattern mapping to `jest-runner.ts`:
```typescript
'my-test.feature': 'should do the thing correctly'
```

## Test Output

- **Console**: Shows progress and summary
- **Log File**: Detailed output saved to `tests/test-runner.log`
- **Debug Mode**: Set `DEBUG_TESTS=true` for verbose logging

## Writing Tests with Documentation

### Jest Tests
```typescript
describe('My Feature', () => {
  it('should do the thing correctly', () => {
    // This test verifies that the doThing function
    // returns the expected output for valid input
    console.log('[DEBUG] Testing with input: valid');
    
    const result = doThing('valid');
    expect(result).toBe('success');
  });
});
```

### Bash Tests
```bash
# Test: Verify CLI handles missing files
echo "[DEBUG] Testing with non-existent file"
./bin/ideaforge analyze missing.org 2>&1

if [ $? -ne 0 ]; then
  echo "✓ Correctly failed on missing file"
else
  echo "✗ Should have failed on missing file"
fi
```

## Debugging Failed Tests

1. Check the test description in the output
2. Look at the debug info for what the test checks
3. Review the detailed log file at `tests/test-runner.log`
4. Run the specific test with verbose mode:
   ```bash
   npm run test:runner -- --test failing.test --verbose
   ```
5. Enable debug mode for more details:
   ```bash
   DEBUG_TESTS=true npm run test:runner -- --test failing.test
   ```

## CI/CD Integration

```yaml
# Run quick tests on every commit
- run: npm run test:quick

# Run full test suite on PR
- run: npm run test:all

# Run specific task tests
- run: npm run test:runner -- --task $CURRENT_TASK
``` 