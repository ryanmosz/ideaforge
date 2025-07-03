# Product Requirements Document - Task 4.8: Create LangGraph-CLI Communication Layer

## Task Overview

Task 4.8 implements the critical bridge between the existing CLI commands and the new LangGraph agent architecture. This task creates the AgentRunner service that orchestrates LangGraph graph execution, manages progress reporting, handles interruptions, and formats results for the CLI. This is the final integration step that makes all the LangGraph functionality accessible through the familiar IdeaForge commands.

### How It Fits Into IdeaForge Architecture

The AgentRunner service acts as the adapter layer between two worlds:
- **CLI World**: Commands, progress messages, file I/O, user interaction
- **LangGraph World**: Nodes, state management, AI processing, graph execution

```
CLI Commands (analyze/refine) 
    ↓
AgentRunner Service ← You are here
    ↓
LangGraph Graph Execution
    ↓
Individual Nodes (Parser, Analysis, Research, etc.)
```

### Dependencies on Other Parent Tasks
- **Requires**: Task 1.0 (Project Foundation) ✅ COMPLETE
- **Requires**: Task 2.0 (Org-mode Parsing) ✅ COMPLETE  
- **Requires**: Task 3.0 (CLI Framework) ✅ COMPLETE
- **Requires**: Task 4.1-4.7 (LangGraph Components) ✅ COMPLETE

### What Will Be Possible After Completion
- Run `ideaforge analyze` with full LangGraph intelligence
- Execute `ideaforge refine` with state persistence
- See real-time progress updates during AI processing
- Gracefully interrupt long-running analyses (Ctrl+C)
- Maintain backward compatibility with existing workflows

## Technical Design

### Architecture Overview

The AgentRunner service provides a clean API for CLI commands while handling all LangGraph complexity:

```typescript
interface AgentRunner {
  // Main entry points
  analyze(documentPath: string, options?: AnalyzeOptions): Promise<AnalysisResult>;
  refine(documentPath: string, options?: RefineOptions): Promise<RefinementResult>;
  
  // Session management
  getSession(documentPath: string): Promise<SessionInfo>;
  clearSession(documentPath: string): Promise<void>;
  
  // Progress and interruption
  onProgress(callback: (message: string) => void): void;
  interrupt(): void;
}
```

### Key Interfaces and Data Structures

```typescript
// Options for analysis
interface AnalyzeOptions {
  outputPath?: string;
  modelName?: string;
  forceNewSession?: boolean;
}

// Options for refinement
interface RefineOptions {
  outputPath?: string;
  modelName?: string;
  continueSession?: boolean;
}

// Result structures that match existing CLI expectations
interface AnalysisResult {
  // Core data (matches existing format)
  requirements: ProcessedRequirement[];
  userStories: ProcessedUserStory[];
  brainstormIdeas: CategorizedIdea[];
  questionsAnswers: QuestionAnswer[];
  
  // Enhanced with LangGraph analysis
  moscowAnalysis: MoscowAnalysis;
  kanoAnalysis: KanoAnalysis;
  dependencies: DependencyMap;
  suggestions: Suggestion[];
  alternativeIdeas: Alternative[];
  researchSynthesis?: string;
  
  // Metadata
  sessionId: string;
  executionTime: number;
  nodesExecuted: string[];
}

// Result for refinement operations
interface RefinementResult extends AnalysisResult {
  changelog: ChangelogEntry[];
  refinementIteration: number;
  changesApplied: string[];
}

// Progress event structure
interface ProgressEvent {
  node: string;
  message: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error';
}
```

### Integration Points

1. **CLI Command Integration**:
   - AnalyzeCommand uses AgentRunner.analyze()
   - RefineCommand uses AgentRunner.refine()
   - Commands pass progress callbacks for real-time updates
   
2. **LangGraph Integration**:
   - AgentRunner builds the graph using buildIdeaForgeGraph()
   - Manages SessionManager for state persistence
   - Handles graph execution and result collection

3. **Progress Manager Integration**:
   - AgentRunner emits progress events
   - CLI ProgressManager displays them with spinners
   - Maintains existing visual feedback patterns

### Technology-Specific Considerations

Following the **immutable tech stack**:
- **Node.js**: Use native EventEmitter for progress events
- **TypeScript**: Strict interfaces for type safety
- **LangGraph**: Proper graph compilation and execution
- **No new dependencies**: Use only approved packages

## Implementation Sequence

### Critical Path
1. **AgentRunner Core** → **Progress Integration** → **Command Updates** → **Error Handling**

### Ordered List of Subtasks
1. **4.8.1**: Create AgentRunner service class with basic structure
2. **4.8.2**: Implement analyze method with graph execution
3. **4.8.3**: Implement refine method with session handling  
4. **4.8.4**: Add progress event streaming
5. **4.8.5**: Update CLI commands to use AgentRunner
6. **4.8.6**: Implement interruption handling (Ctrl+C)
7. **4.8.7**: Add comprehensive error handling and recovery

### Parallel Work Opportunities
- Progress streaming (4.8.4) can be developed alongside command updates (4.8.5)
- Error handling patterns (4.8.7) can be designed while implementing core methods

### Risk Points
- State format compatibility between CLI and LangGraph
- Progress message formatting consistency
- Interruption cleanup to prevent corrupted state
- Memory usage with large documents

## Detailed Subtask Breakdown

### 4.8.1: Create AgentRunner Service Class

**Description**: Build the foundational AgentRunner service with dependency injection and basic structure.

**Implementation Steps**:
1. Create `src/services/agent-runner.ts`
2. Define the AgentRunner class with constructor
3. Inject dependencies (FileHandler, SessionManager)
4. Set up EventEmitter for progress
5. Create method stubs for analyze/refine

**Code Example**:
```typescript
import { EventEmitter } from 'events';
import { buildIdeaForgeGraph } from '../agents/graph';
import { SessionManager } from '../agents/persistence';
import { FileHandler } from './file-handler';
import { ProjectState } from '../agents/state';

export class AgentRunner extends EventEmitter {
  private sessionManager: SessionManager;
  private fileHandler: FileHandler;
  private interrupted: boolean = false;
  
  constructor(fileHandler: FileHandler, statePath?: string) {
    super();
    this.fileHandler = fileHandler;
    this.sessionManager = new SessionManager(statePath);
  }
  
  async analyze(documentPath: string, options?: AnalyzeOptions): Promise<AnalysisResult> {
    // Implementation to follow
  }
  
  interrupt(): void {
    this.interrupted = true;
    this.emit('interrupted');
  }
}
```

**File Changes**:
- Create: `src/services/agent-runner.ts`
- Create: `tests/services/agent-runner.test.ts`

**Testing Approach**:
- Unit test constructor and dependency injection
- Test event emitter functionality
- Mock dependencies for isolation

**Definition of Done**:
- ✅ AgentRunner class created
- ✅ Dependencies properly injected
- ✅ Event emitter configured
- ✅ Tests pass with 100% coverage

**Common Pitfalls**:
- Forgetting to extend EventEmitter
- Not properly typing the event callbacks
- Missing cleanup in destructor

### 4.8.2: Implement Analyze Method

**Description**: Implement the core analyze method that executes the LangGraph and returns results.

**Implementation Steps**:
1. Load document using FileHandler
2. Create or get session from SessionManager
3. Build LangGraph with checkpointer
4. Create initial state from document
5. Execute graph with progress callbacks
6. Transform final state to AnalysisResult
7. Handle interruptions during execution

**Code Example**:
```typescript
async analyze(documentPath: string, options: AnalyzeOptions = {}): Promise<AnalysisResult> {
  const startTime = Date.now();
  this.interrupted = false;
  
  try {
    // Emit start event
    this.emitProgress('start', 'Starting analysis...');
    
    // Load document
    this.emitProgress('documentParser', 'Loading document...');
    const document = await this.fileHandler.readOrgFile(documentPath);
    
    // Get or create session
    const session = await this.sessionManager.getOrCreateSession(
      documentPath,
      { forceNew: options.forceNewSession }
    );
    
    // Build graph with checkpointer
    const checkpointer = this.sessionManager.getCheckpointer();
    const graph = buildIdeaForgeGraph(
      this.createProgressManager(),
      checkpointer,
      options.modelName
    );
    
    // Create initial state
    const initialState: ProjectState = {
      filePath: documentPath,
      fileContent: document.content,
      // ... other initial values
    };
    
    // Execute graph
    const config = {
      configurable: { thread_id: session.threadId },
      callbacks: {
        onNodeStart: (node: string) => {
          if (this.interrupted) throw new Error('Analysis interrupted');
          this.emitProgress(node, `Processing ${node}...`);
        }
      }
    };
    
    const finalState = await graph.invoke(initialState, config);
    
    // Transform to result format
    return this.transformToAnalysisResult(finalState, {
      sessionId: session.threadId,
      executionTime: Date.now() - startTime
    });
    
  } catch (error) {
    if (this.interrupted) {
      this.emitProgress('error', 'Analysis interrupted by user');
      throw new Error('Analysis interrupted');
    }
    throw error;
  }
}
```

**File Changes**:
- Update: `src/services/agent-runner.ts`
- Update: `tests/services/agent-runner.test.ts`

**Testing Approach**:
- Mock FileHandler and graph execution
- Test successful analysis flow
- Test interruption handling
- Test error scenarios

**Definition of Done**:
- ✅ Analyze method executes graph
- ✅ Progress events emitted correctly
- ✅ Results properly formatted
- ✅ Interruption handled gracefully
- ✅ Tests cover all paths

### 4.8.3: Implement Refine Method

**Description**: Implement the refine method that processes :RESPONSE: tags using existing state.

**Implementation Steps**:
1. Load document with responses
2. Get existing session (error if not found)
3. Build graph with checkpointer
4. Load previous state from session
5. Update state with new responses
6. Execute graph from ResponseProcessingNode
7. Transform results including changelog

**Code Example**:
```typescript
async refine(documentPath: string, options: RefineOptions = {}): Promise<RefinementResult> {
  const startTime = Date.now();
  this.interrupted = false;
  
  try {
    // Load document
    const document = await this.fileHandler.readOrgFile(documentPath);
    
    // Get existing session (required for refinement)
    const session = await this.sessionManager.getOrCreateSession(
      documentPath,
      { forceNew: false }
    );
    
    if (!session.currentCheckpointId) {
      throw new Error('No previous analysis found. Run analyze first.');
    }
    
    // Build graph
    const checkpointer = this.sessionManager.getCheckpointer();
    const graph = buildIdeaForgeGraph(
      this.createProgressManager(),
      checkpointer,
      options.modelName
    );
    
    // Load previous state
    const checkpoint = await checkpointer.get(session.threadId);
    const previousState = checkpoint?.channel_values as ProjectState;
    
    // Update with new content
    const updatedState: ProjectState = {
      ...previousState,
      fileContent: document.content,
      refinementIteration: (previousState.refinementIteration || 0) + 1
    };
    
    // Execute from response processing
    const config = {
      configurable: { 
        thread_id: session.threadId,
        checkpoint_id: session.currentCheckpointId
      },
      startFrom: 'responseProcessing'
    };
    
    const finalState = await graph.invoke(updatedState, config);
    
    // Transform including changelog
    const result = this.transformToAnalysisResult(finalState, {
      sessionId: session.threadId,
      executionTime: Date.now() - startTime
    });
    
    return {
      ...result,
      changelog: finalState.changelog,
      refinementIteration: finalState.refinementIteration,
      changesApplied: this.extractChangesApplied(finalState)
    };
    
  } catch (error) {
    if (this.interrupted) {
      throw new Error('Refinement interrupted');
    }
    throw error;
  }
}
```

**Testing Approach**:
- Test with existing session
- Test without previous analysis
- Test response processing
- Test changelog generation

### 4.8.4: Add Progress Event Streaming

**Description**: Implement real-time progress streaming that integrates with CLI ProgressManager.

**Implementation Steps**:
1. Create progress event types
2. Implement emitProgress helper
3. Add progress callbacks to graph
4. Create progress manager adapter
5. Handle progress levels (info/warning/error)

**Code Example**:
```typescript
private emitProgress(node: string, message: string, level: 'info' | 'warning' | 'error' = 'info') {
  const event: ProgressEvent = {
    node,
    message,
    timestamp: new Date(),
    level
  };
  
  this.emit('progress', event);
  
  // Also log for debugging
  if (process.env.DEBUG) {
    console.log(`[${node}] ${message}`);
  }
}

private createProgressManager() {
  // Adapter that converts node progress to events
  return {
    start: (msg: string) => this.emitProgress('current', msg),
    update: (msg: string) => this.emitProgress('current', msg),
    succeed: (msg: string) => this.emitProgress('current', `✓ ${msg}`, 'info'),
    fail: (msg: string) => this.emitProgress('current', `✗ ${msg}`, 'error'),
    warn: (msg: string) => this.emitProgress('current', `⚠ ${msg}`, 'warning')
  };
}

// Usage in commands
agentRunner.on('progress', (event: ProgressEvent) => {
  if (event.level === 'error') {
    this.progressManager.fail(event.message);
  } else if (event.level === 'warning') {
    this.progressManager.warn(event.message);
  } else {
    this.progressManager.update(event.message);
  }
});
```

### 4.8.5: Update CLI Commands

**Description**: Modify analyze and refine commands to use AgentRunner instead of direct parsing.

**Implementation Steps**:
1. Update AnalyzeCommand to use AgentRunner
2. Update RefineCommand to use AgentRunner  
3. Connect progress events to ProgressManager
4. Handle results formatting
5. Maintain backward compatibility

**Code Example**:
```typescript
// In analyze.ts
private async execute(file: string, options: any): Promise<void> {
  const progress = this.createProgress();
  
  try {
    // Create agent runner
    const agentRunner = new AgentRunner(this.fileHandler);
    
    // Connect progress events
    agentRunner.on('progress', (event: ProgressEvent) => {
      progress.update(event.message);
    });
    
    // Handle interruption
    process.on('SIGINT', () => {
      agentRunner.interrupt();
      progress.fail('Analysis interrupted');
      process.exit(1);
    });
    
    // Run analysis
    progress.start('🤖 Starting AI-powered analysis...');
    
    const result = await agentRunner.analyze(file, {
      modelName: options.model,
      forceNewSession: options.fresh
    });
    
    // Save results
    progress.update('💾 Saving analysis results...');
    const outputPath = path.resolve(options.output);
    await this.fileHandler.writeDocument(result, outputPath, 'orgmode');
    
    // Show summary
    progress.succeed(`✅ Analysis complete! Results saved to: ${outputPath}`);
    this.showAnalysisSummary(result);
    
  } catch (error) {
    progress.fail('❌ Analysis failed');
    this.handleError(error);
  }
}
```

### 4.8.6: Implement Interruption Handling

**Description**: Add graceful interruption support for long-running operations.

**Implementation Steps**:
1. Set up SIGINT handler
2. Implement cleanup on interruption
3. Save partial state if possible
4. Restore terminal state
5. Exit cleanly

**Code Example**:
```typescript
// In AgentRunner
private setupInterruptHandler(): void {
  const cleanup = async () => {
    if (this.isExecuting) {
      this.interrupted = true;
      
      // Try to save partial state
      try {
        await this.sessionManager.saveState();
        this.emitProgress('system', 'Partial state saved', 'warning');
      } catch (error) {
        this.emitProgress('system', 'Could not save state', 'error');
      }
      
      // Emit final event
      this.emit('interrupted');
    }
  };
  
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

// In commands
process.on('SIGINT', async () => {
  console.log('\n\nInterrupting analysis...');
  agentRunner.interrupt();
  
  // Give time for cleanup
  setTimeout(() => {
    console.log('Force exiting...');
    process.exit(1);
  }, 2000);
});
```

### 4.8.7: Add Comprehensive Error Handling

**Description**: Implement robust error handling with helpful messages and recovery options.

**Implementation Steps**:
1. Create error classification system
2. Add retry logic for transient errors
3. Provide helpful error messages
4. Suggest recovery actions
5. Log errors for debugging

**Code Example**:
```typescript
private async handleError(error: any, context: string): Promise<never> {
  // Classify error
  if (error.message?.includes('OPENAI_API_KEY')) {
    throw new Error(
      'OpenAI API key not configured. Please set OPENAI_API_KEY in your .env file.'
    );
  }
  
  if (error.response?.status === 429) {
    throw new Error(
      'OpenAI rate limit exceeded. Please wait a moment and try again.'
    );
  }
  
  if (error.code === 'ENOENT') {
    throw new Error(
      `File not found: ${error.path}. Please check the file path and try again.`
    );
  }
  
  // Log full error in debug mode
  if (process.env.DEBUG) {
    console.error('Full error:', error);
  }
  
  // Generic error with context
  throw new Error(`${context} failed: ${error.message}`);
}
```

## Testing Strategy

### Unit Test Requirements

Each component needs comprehensive tests:

```typescript
describe('AgentRunner', () => {
  let agentRunner: AgentRunner;
  let mockFileHandler: jest.Mocked<FileHandler>;
  let mockGraph: any;
  
  beforeEach(() => {
    mockFileHandler = createMockFileHandler();
    agentRunner = new AgentRunner(mockFileHandler);
  });
  
  describe('analyze', () => {
    it('should execute full analysis successfully', async () => {
      // Test implementation
    });
    
    it('should handle interruption gracefully', async () => {
      // Test interruption
    });
    
    it('should emit progress events', async () => {
      // Test progress
    });
  });
});
```

### Integration Test Scenarios

1. **End-to-End Analysis**:
   ```bash
   ./bin/ideaforge analyze test-project.org
   # Verify all nodes execute
   # Check output format
   ```

2. **Refinement Flow**:
   ```bash
   ./bin/ideaforge analyze project.org
   # Add :RESPONSE: tags
   ./bin/ideaforge refine project.org
   # Verify changes applied
   ```

3. **Interruption Recovery**:
   ```bash
   ./bin/ideaforge analyze large-project.org
   # Ctrl+C during execution
   ./bin/ideaforge analyze large-project.org --resume
   # Verify continues from checkpoint
   ```

### Manual Testing Procedures

1. Test with small org file (< 1KB)
2. Test with medium org file (10KB)
3. Test with large org file (> 100KB)
4. Test interruption at various stages
5. Test error scenarios (no API key, invalid file)

## Integration Plan

### Existing Code Integration

The AgentRunner fits seamlessly into existing architecture:

```typescript
// Before (in analyze command)
const parsed = parser.parse(content);
const data = extractor.extract(parsed);

// After (with AgentRunner)
const result = await agentRunner.analyze(file, options);
```

### API Contracts

AgentRunner implements these interfaces:

```typescript
interface IAgentRunner {
  analyze(documentPath: string, options?: AnalyzeOptions): Promise<AnalysisResult>;
  refine(documentPath: string, options?: RefineOptions): Promise<RefinementResult>;
  getSession(documentPath: string): Promise<SessionInfo>;
  interrupt(): void;
  on(event: 'progress', listener: (event: ProgressEvent) => void): this;
  on(event: 'interrupted', listener: () => void): this;
}
```

### Migration Steps

1. **Phase 1**: Add AgentRunner alongside existing code
2. **Phase 2**: Update commands to use AgentRunner optionally (--use-ai flag)
3. **Phase 3**: Make AgentRunner the default
4. **Phase 4**: Remove old analysis code

## Documentation Requirements

### Code Documentation

```typescript
/**
 * AgentRunner orchestrates LangGraph execution for the CLI.
 * 
 * Responsibilities:
 * - Manages graph lifecycle and execution
 * - Handles state persistence through sessions  
 * - Streams progress events to CLI
 * - Provides interruption and error handling
 * 
 * @example
 * const runner = new AgentRunner(fileHandler);
 * runner.on('progress', (e) => console.log(e.message));
 * const result = await runner.analyze('project.org');
 */
export class AgentRunner extends EventEmitter {
```

### README Updates

Add new section on AI-powered analysis:
- How to use analyze/refine with AI
- Progress indicators explanation
- Session management details
- Troubleshooting common issues

### Usage Examples

```bash
# Basic analysis
ideaforge analyze my-project.org

# Analysis with specific model
ideaforge analyze my-project.org --model gpt-4.5-preview

# Fresh analysis (new session)
ideaforge analyze my-project.org --fresh

# Refinement
ideaforge refine my-project-v1.org

# Check session info
ideaforge session my-project.org
```

## Functional Requirements

1. **FR-4.8.1**: AgentRunner must execute LangGraph with all nodes
2. **FR-4.8.2**: Must stream real-time progress to CLI  
3. **FR-4.8.3**: Must handle interruptions gracefully
4. **FR-4.8.4**: Must maintain backward compatibility
5. **FR-4.8.5**: Must format results to match existing CLI output
6. **FR-4.8.6**: Must persist state between analyze/refine calls
7. **FR-4.8.7**: Must provide helpful error messages
8. **FR-4.8.8**: Must complete typical analysis in < 5 minutes

## Success Metrics

### Completion Criteria
- ✅ All CLI commands use AgentRunner
- ✅ Progress updates display in real-time
- ✅ Interruption works without corruption
- ✅ All existing tests still pass
- ✅ New tests provide > 90% coverage

### Performance Benchmarks
- Command startup: < 500ms
- Progress update latency: < 100ms
- Memory usage: < 500MB for large docs
- Interruption cleanup: < 2 seconds

### Quality Metrics
- Zero regression in existing functionality
- Error messages actionable by users
- Progress messages clear and informative
- Code follows existing patterns

## Next Steps

### What Becomes Possible
With Task 4.8 complete, IdeaForge will have:
- Full AI-powered analysis through familiar CLI
- Stateful conversations with refinement
- Professional progress feedback
- Robust error handling and recovery

### Which Parent Tasks Should Follow

1. **Task 5.0 - n8n Integration** (Recommended Next)
   - Connect research nodes to external APIs
   - Add Hacker News and Reddit insights
   - Implement rate limiting

2. **Task 8.0 - Refinement Loop**
   - Enhance response processing
   - Add more sophisticated change detection
   - Implement multi-version comparison

### Future Enhancement Opportunities

- **Streaming Results**: Show analysis as it happens
- **Parallel Execution**: Run independent nodes concurrently
- **Resume Sessions**: Continue interrupted analysis
- **Export Sessions**: Share analysis state
- **Web UI Integration**: Reuse AgentRunner for future GUI 