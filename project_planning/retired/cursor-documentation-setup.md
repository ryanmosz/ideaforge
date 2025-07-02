# Critical: Cursor Documentation Setup for IdeaForge

## Why This Matters
Node.js and its ecosystem evolve rapidly. AI assistants often generate outdated patterns, deprecated APIs, or incompatible module syntax. Adding versioned docs to Cursor prevents hours of debugging CLI issues.

## How to Add Docs to Cursor

### Step 1: Open Cursor Settings
- Press `Cmd + ,` (Mac) or `Ctrl + ,` (Windows)
- Navigate to "Features" → "Docs"

### Step 2: Add These Documentation Sources

1. **Node.js API v20.x**
   - Click "Add new doc"
   - URL: `https://nodejs.org/docs/latest-v20.x/api/`
   - Name: "Node.js v20 API"
   - ✅ Enable for your project

2. **TypeScript Documentation**
   - Click "Add new doc"
   - URL: `https://www.typescriptlang.org/docs/`
   - Name: "TypeScript"
   - ✅ Enable for your project

3. **Commander.js (CLI Framework)**
   - Click "Add new doc"
   - URL: `https://github.com/tj/commander.js#readme`
   - Name: "Commander.js"
   - ✅ Enable for your project

4. **NPM Documentation**
   - URL: `https://docs.npmjs.com/`
   - Name: "NPM Docs"

5. **Axios (HTTP Client)**
   - URL: `https://axios-http.com/docs/intro`
   - Name: "Axios"

6. **Jest (Testing)**
   - URL: `https://jestjs.io/docs/getting-started`
   - Name: "Jest"

### Step 3: Project-Specific Documentation

7. **Chalk (Terminal Styling)**
   - URL: `https://github.com/chalk/chalk#readme`
   - Name: "Chalk"

8. **Ora (Loading Spinners)**
   - URL: `https://www.npmjs.com/package/ora`
   - Name: "Ora"

9. **ESLint**
   - URL: `https://eslint.org/docs/latest/`
   - Name: "ESLint"

10. **Org Mode Syntax**
    - URL: `https://orgmode.org/manual/`
    - Name: "Org Mode"

11. **Conventional Commits**
    - URL: `https://www.conventionalcommits.org/`
    - Name: "Conventional Commits"

12. **Markdown Guide**
    - URL: `https://www.markdownguide.org/`
    - Name: "Markdown"

## Specific Version Checks

### Check Your Versions
```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check TypeScript version
npx tsc --version

# Check all dependency versions
npm list --depth=0

# Check specific dependencies
cat package.json | grep "commander"
cat package.json | grep "typescript"
cat package.json | grep "axios"
```

### Common CLI Development Gotchas

#### Module System Issues
```javascript
// OLD (CommonJS) - What we're using
const { Command } = require('commander');
module.exports = { myFunction };

// NEW (ESM) - Don't mix these!
import { Command } from 'commander';
export { myFunction };
```

#### Path Handling
```javascript
// BAD - Platform-specific
const configPath = process.cwd() + '/config/settings.json';

// GOOD - Cross-platform
const path = require('path');
const configPath = path.join(process.cwd(), 'config', 'settings.json');
```

#### Async/Await in CLI
```javascript
// BAD - Unhandled promise rejection
program
  .action(async () => {
    await someAsyncOperation(); // Can crash silently
  });

// GOOD - Proper error handling
program
  .action(async () => {
    try {
      await someAsyncOperation();
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });
```

## Red Flags in Generated Code
Watch for these outdated or problematic patterns:
- Mixed module systems (require vs import)
- Missing error handling in async CLI commands
- Hardcoded paths instead of using `path.join()`
- Old Commander.js syntax (pre v7)
- Deprecated Node.js APIs (like `fs.exists`)
- Missing proper exit codes

## Quick Test
After adding docs, test by asking Cursor:
"Show me the current Commander.js syntax for creating a CLI command with options"

If it shows old syntax (like `.option()` without proper typing), the docs aren't properly loaded.

## IdeaForge-Specific Patterns

### Org-mode File Parsing
```javascript
// Ensure AI knows about our Org-mode usage
// Good pattern for parsing
const parseOrgFile = (content) => {
  const lines = content.split('\n');
  // Parse headers, tags, etc.
};
```

### CLI Output Formatting
```javascript
// Consistent output with Chalk
console.log(chalk.green('✓'), 'Analysis complete');
console.log(chalk.yellow('⚠'), 'Warning:', message);
console.log(chalk.red('✗'), 'Error:', error.message);
```

### File I/O Best Practices
```javascript
// Always use async/await with proper error handling
const fs = require('fs').promises;

try {
  const content = await fs.readFile(filePath, 'utf-8');
  // Process content
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error(chalk.red('File not found:'), filePath);
  } else {
    console.error(chalk.red('Read error:'), error.message);
  }
}
```

## Bonus: TypeScript Configuration
Ensure AI respects our TypeScript setup:
- Target: ES2022
- Module: CommonJS
- Strict mode enabled
- Source maps for debugging

## MCP Integration
The project supports MCP RepoPrompt tools for faster codebase navigation:
- `mcp_RepoPrompt_search` - Search across files
- `mcp_RepoPrompt_read_selected_files` - Read multiple files efficiently
- See `.cursor/rules/` for usage patterns

---

**Remember**: Properly configured documentation prevents the AI from suggesting deprecated patterns or incompatible code. This is especially critical for Node.js projects where the ecosystem moves fast! 