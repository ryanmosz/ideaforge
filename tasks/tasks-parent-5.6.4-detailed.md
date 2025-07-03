# Task 5.6 Detailed Implementation Part 4: Usage Examples (5.6.7)

## Overview
This file covers creating usage examples for the n8n integration system.

## Implementation Details

### 5.6.7 Add usage examples

**Objective**: Create practical examples demonstrating how to use the n8n integration.

**Step 1: Create Basic Usage Example**

Create `examples/basic-usage.ts`:

```typescript
import { IdeaForgeClient } from '../src/client';
import { config } from 'dotenv';

config();

// Example 1: Basic analysis with research
async function basicExample() {
  const client = new IdeaForgeClient({
    n8nUrl: process.env.N8N_BASE_URL,
    n8nApiKey: process.env.N8N_API_KEY
  });
  
  const analysis = await client.analyze('project.org', {
    enableResearch: true,
    researchSources: ['hackernews', 'reddit']
  });
  
  console.log('Technologies:', analysis.technologies);
  console.log('HN results:', analysis.research.hackerNews.length);
  console.log('Reddit results:', analysis.research.reddit.length);
}

// Example 2: Cached research
async function cachedExample() {
  const client = new IdeaForgeClient({
    cacheEnabled: true,
    cacheTTL: 3600
  });
  
  // First call - hits API
  await client.analyze('project.org', { enableResearch: true });
  
  // Second call - uses cache
  await client.analyze('project.org', { enableResearch: true });
}

// Example 3: Research only
async function researchOnly() {
  const client = new IdeaForgeClient();
  
  const results = await client.research({
    topics: ['react hooks', 'typescript'],
    sources: ['hackernews'],
    options: { minScore: 100 }
  });
  
  results.forEach(r => {
    console.log(`[${r.score}] ${r.title} - ${r.url}`);
  });
}
```

**Step 2: Create CLI Examples**

Create `examples/cli-examples.sh`:

```bash
#!/bin/bash

# Basic analysis with research
ideaforge analyze project.org --research

# Specify sources
ideaforge analyze project.org --research --sources hackernews

# Add custom topics
ideaforge analyze project.org --research --topics "GraphQL,Docker"

# Research only mode
ideaforge research --query "React 2024" --export results.json

# Cached development
CACHE_ENABLED=true ideaforge analyze project.org --research

# Export formats
ideaforge analyze project.org --research --export json --output analysis.json
ideaforge analyze project.org --research --export markdown --output analysis.md

# Batch processing
for file in *.org; do
  ideaforge analyze "$file" --research --output "results/$(basename $file .org).json"
done
```

**Step 3: Create Integration Examples**

Create `examples/integration-patterns.ts`:

```typescript
import { StateGraph } from '@langchain/langgraph';
import { N8nBridge } from '../src/agents/bridges/n8n-bridge';

// Custom research node for LangGraph
export function createResearchNode() {
  return async (state) => {
    const bridge = new N8nBridge({
      baseUrl: process.env.N8N_BASE_URL,
      apiKey: process.env.N8N_API_KEY
    });
    
    const technologies = state.technologies || [];
    
    // Research each technology
    const results = await Promise.all(
      technologies.map(tech =>
        bridge.requestResearch('hackernews', tech, {
          sessionId: state.sessionId,
          limit: 10
        })
      )
    );
    
    return {
      ...state,
      researchResults: results.flat()
    };
  };
}

// Add to graph
const graph = new StateGraph({ channels: stateSchema })
  .addNode('research', createResearchNode())
  .addEdge('extractTech', 'research');
```

**Step 4: Create Examples README**

Create `examples/README.md`:

```markdown
# IdeaForge n8n Integration Examples

## Quick Start

```bash
# Install and configure
npm install
cp .env.example .env
# Edit .env with your credentials

# Run examples
npm run examples
```

## Basic Usage

```typescript
const client = new IdeaForgeClient({
  n8nUrl: process.env.N8N_BASE_URL,
  n8nApiKey: process.env.N8N_API_KEY
});

// Analyze with research
const analysis = await client.analyze('project.org', {
  enableResearch: true
});
```

## CLI Usage

```bash
# Basic command
ideaforge analyze project.org --research

# With options
ideaforge analyze project.org \
  --research \
  --sources hackernews,reddit \
  --cache \
  --export json
```

## Advanced Patterns

### Caching Strategy
```typescript
const client = new IdeaForgeClient({
  cacheEnabled: true,
  cacheTTL: 7200, // 2 hours
  cacheDebug: true
});
```

### Error Handling
```typescript
try {
  const results = await client.research({ topics: ['react'] });
} catch (error) {
  if (error.code === 'RATE_LIMIT') {
    await delay(error.retryAfter * 1000);
  }
}
```

### Rate Limiting
```typescript
const results = [];
for (const topic of topics) {
  results.push(await client.research({ topics: [topic] }));
  await delay(1000); // 1 second between requests
}
```

## Environment Variables

```bash
# Required
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=your-api-key

# Optional
CACHE_ENABLED=true
CACHE_TTL_MINUTES=60
DEBUG=ideaforge:*
```

## Troubleshooting

### No Results
- Check `enableResearch: true` is set
- Verify n8n is running
- Check API credentials

### Rate Limits
- Enable caching
- Add delays between requests
- Use fewer sources

### Debug Mode
```bash
DEBUG=ideaforge:* ideaforge analyze project.org --research --verbose
```
```

**Step 5: Create Test Script**

Add to `package.json`:

```json
{
  "scripts": {
    "examples": "ts-node examples/basic-usage.ts",
    "examples:cli": "bash examples/cli-examples.sh"
  }
}
```

## Testing Examples

1. **Run basic examples**:
   ```bash
   npm run examples
   ```

2. **Test CLI examples**:
   ```bash
   chmod +x examples/cli-examples.sh
   ./examples/cli-examples.sh
   ```

3. **Verify output**:
   - Check console output
   - Verify JSON files created
   - Confirm cache is working

## Definition of Done

✅ Basic TypeScript examples created
✅ CLI usage examples documented
✅ Integration patterns demonstrated
✅ README with clear instructions
✅ Environment setup documented
✅ Error handling shown
✅ Examples are runnable
✅ Common patterns covered 