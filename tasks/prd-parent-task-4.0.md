# Product Requirements Document - Parent Task 4.0: Implement LangGraph Agent Architecture

## Task Overview

Parent Task 4.0 implements the core AI intelligence layer for IdeaForge using LangGraph. This task transforms the CLI from a simple file processor into an intelligent planning partner that can analyze project requirements, apply MoSCoW/Kano frameworks, process user feedback, and maintain conversation state across refinement iterations. LangGraph will orchestrate the entire analysis workflow through a graph of specialized nodes, each responsible for a specific aspect of the planning process.

### How It Fits Into IdeaForge Architecture

LangGraph serves as the "brain" of IdeaForge, sitting between the CLI interface (Task 3.0) and external integrations (Task 5.0):

```
CLI Commands → LangGraph Agent → Analysis Results
                    ↓
              State Management
                    ↓
            Iterative Refinement
```

### Dependencies on Other Parent Tasks
- **Requires**: Task 1.0 (Project Foundation) ✅ COMPLETE
- **Requires**: Task 2.0 (Org-mode Parsing) ✅ COMPLETE  
- **Requires**: Task 3.0 (CLI Framework) ✅ COMPLETE
- **Enables**: Task 5.0 (n8n Integration) - Will connect to LangGraph nodes
- **Enables**: Task 6.0 (AI Analysis) - Will use LangGraph for orchestration

### What Will Be Possible After Completion
- AI-powered analysis of project requirements and ideas
- Intelligent MoSCoW categorization with confidence scores
- Kano model evaluation for user value assessment
- Processing of :RESPONSE: tags for iterative refinement
- State persistence across multiple refinement sessions
- Foundation for external research integration (Task 5.0)

## Technical Design

### Architecture Overview

LangGraph will be implemented as a directed graph where:
- **Nodes** perform specific analysis or processing tasks
- **Edges** define the flow between nodes with conditional routing
- **State** (ProjectState) carries data through the graph
- **Checkpointing** enables persistence between sessions

```
                    ┌─────────────────┐
                    │ DocumentParser  │
                    └────────┬────────┘
                             ↓
                    ┌─────────────────┐
                    │ Requirements    │
                    │ Analysis       │
                    └────────┬────────┘
                             ↓
                  ┌──────────┴──────────┐
                  ↓                     ↓
          ┌─────────────┐      ┌─────────────┐
          │   MoSCoW    │      │    Kano     │
          │Categorizer  │      │ Evaluator   │
          └──────┬──────┘      └──────┬──────┘
                  └──────────┬──────────┘
                             ↓
                    ┌─────────────────┐
                    │  Dependency     │
                    │  Analysis       │
                    └────────┬────────┘
                             ↓
                    ┌─────────────────┐
                    │  Result         │
                    │  Generator      │
                    └─────────────────┘
```

### Key Interfaces and Data Structures

```typescript
// Core State Schema
interface ProjectState {
  // Document data
  documentPath: string;
  parsedDocument: OrgModeDocument;
  version: number;
  
  // Analysis results
  requirements: Requirement[];
  userStories: UserStory[];
  brainstormIdeas: BrainstormIdea[];
  
  // MoSCoW/Kano results
  moscowCategorizations: MoscowResult[];
  kanoEvaluations: KanoResult[];
  
  // Dependencies and suggestions
  dependencies: DependencyMap;
  suggestions: Suggestion[];
  alternatives: Alternative[];
  
  // Research data (for Task 5.0 integration)
  researchTopics: string[];
  researchResults: ResearchResult[];
  
  // Refinement tracking
  responses: ResponseTag[];
  changelog: ChangelogEntry[];
  
  // Metadata
  sessionId: string;
  timestamp: Date;
  errors: ErrorEntry[];
}

// Node interfaces
interface AnalysisNode {
  process(state: ProjectState): Promise<Partial<ProjectState>>;
}

// Result interfaces
interface MoscowResult {
  itemId: string;
  category: 'must' | 'should' | 'could' | 'wont';
  confidence: number; // 1-10
  rationale: string;
  evaluationQuestions: QuestionAnswer[];
}

interface KanoResult {
  itemId: string;
  type: 'basic' | 'performance' | 'excitement' | 'indifferent' | 'reverse';
  userValueScore: number;
  rationale: string;
}
```

### Integration Points

1. **CLI Integration**:
   - AnalyzeCommand → triggers LangGraph execution
   - RefineCommand → loads previous state and processes responses  
   - ExportCommand → formats LangGraph results
   
2. **Parser Integration**:
   - Uses existing OrgModeParser from Task 2.0
   - DataExtractor provides structured input to LangGraph
   
3. **Progress Integration**:
   - Each node reports progress via ProgressManager
   - Real-time updates as graph executes

### Technology-Specific Considerations

Following the **immutable tech stack**:
- **LangGraph**: Latest stable version (as specified)
- **TypeScript**: Strict mode, CommonJS modules
- **Node.js**: v16+ with async/await patterns
- **OpenAI API**: GPT-4 for all AI operations
- **File limits**: Keep all node implementations under 500 lines

## Implementation Sequence

The implementation follows a bottom-up approach, building foundational components before complex orchestration:

1. **Core Infrastructure** (Critical Path)
   - 4.1: LangGraph project structure
   - 4.2: ProjectState schema definition
   
2. **Analysis Nodes** (Can parallelize after 4.2)
   - 4.3.1: DocumentParserNode
   - 4.3.2: RequirementsAnalysisNode  
   - 4.3.3: MoscowCategorizationNode
   - 4.3.4: KanoEvaluationNode
   - 4.3.5: DependencyAnalysisNode
   
3. **Research Nodes** (Prepare for Task 5.0)
   - 4.4.1-4.4.5: Research node stubs
   
4. **Refinement Nodes** (Depends on core nodes)
   - 4.5.1-4.5.3: Response processing nodes
   
5. **Orchestration** (Final integration)
   - 4.6: Graph edges and routing
   - 4.7: State persistence
   - 4.8: CLI communication layer

### Critical Path
4.1 → 4.2 → 4.3.1 → 4.6 → 4.8

### Parallel Work Opportunities
- All 4.3.x nodes can be developed in parallel after 4.2
- Research nodes (4.4.x) can be stubbed while building core nodes
- Refinement nodes (4.5.x) can start after 4.3.1

### Risk Points
- **State Schema Changes**: Define ProjectState carefully upfront
- **Node Communication**: Ensure consistent state updates
- **OpenAI Integration**: Handle API failures gracefully
- **Performance**: Large documents may slow down analysis

## Detailed Subtask Breakdown

### 4.1: Set up LangGraph Project Structure

**Description**: Create the directory structure and configuration for LangGraph integration.

**Implementation Steps**:
1. Create directory structure:
   ```
   src/agents/
   ├── index.ts          # Main LangGraph agent export
   ├── state.ts          # ProjectState definition
   ├── graph.ts          # Graph construction
   ├── nodes/            # Individual node implementations
   ├── edges/            # Edge conditions and routing
   └── utils/            # LangGraph utilities
   ```

2. Install LangGraph dependencies:
   ```bash
   npm install @langchain/langgraph @langchain/core
   ```

3. Create base configuration for LangGraph

**Code Examples**:
```typescript
// src/agents/index.ts
import { StateGraph } from '@langchain/langgraph';
import { ProjectState } from './state';

export function createIdeaForgeAgent() {
  const graph = new StateGraph<ProjectState>({
    channels: {
      // Define state channels
    }
  });
  
  return graph;
}
```

**File Changes**:
- Create: `src/agents/` directory structure
- Modify: `package.json` to add LangGraph dependencies
- Create: `src/agents/index.ts`, `state.ts`, `graph.ts`

**Testing Approach**:
- Verify LangGraph imports work correctly
- Create basic test that constructs empty graph
- Ensure TypeScript compilation succeeds

**Definition of Done**:
- ✅ Directory structure created
- ✅ LangGraph dependencies installed
- ✅ Basic graph construction works
- ✅ Tests pass for basic setup

**Common Pitfalls**:
- Don't forget to add @types packages if needed
- Ensure LangGraph version is compatible with Node.js 16+
- Keep imports organized from the start

### 4.2: Define ProjectState TypeScript Schema

**Description**: Create the comprehensive state schema that will flow through the LangGraph nodes.

**Implementation Steps**:
1. Define all state interfaces in `state.ts`
2. Create type guards for runtime validation
3. Define state channels for LangGraph
4. Create state initialization functions

**Code Examples**:
```typescript
// src/agents/state.ts
export interface ProjectState {
  // Document data
  documentPath: string;
  parsedDocument: OrgModeDocument | null;
  version: number;
  
  // Analysis results
  requirements: Requirement[];
  userStories: UserStory[];
  brainstormIdeas: BrainstormIdea[];
  
  // ... rest of state
}

export const stateChannels = {
  documentPath: {
    value: (x: string, y: string) => y,
    default: () => ''
  },
  parsedDocument: {
    value: (x: any, y: any) => y,
    default: () => null
  },
  // ... define all channels
};

export function createInitialState(): ProjectState {
  return {
    documentPath: '',
    parsedDocument: null,
    version: 1,
    // ... initialize all fields
  };
}
```

**File Changes**:
- Create: `src/agents/state.ts` with full state definition
- Create: `src/agents/types.ts` for supporting interfaces
- Create: `tests/agents/state.test.ts`

**Testing Approach**:
- Test state initialization
- Test type guards work correctly
- Verify all fields have proper defaults

**Definition of Done**:
- ✅ Complete ProjectState interface defined
- ✅ All supporting types created
- ✅ State channels configured for LangGraph
- ✅ 100% test coverage for state module

**Common Pitfalls**:
- Make state serializable (no functions/classes)
- Include all fields needed by future tasks
- Document each field's purpose

### 4.3.1: DocumentParserNode - Parse org-mode structure

**Description**: Create the first LangGraph node that parses org-mode documents using existing parser.

**Implementation Steps**:
1. Create base AnalysisNode class
2. Implement DocumentParserNode
3. Integrate with existing OrgModeParser
4. Handle parsing errors gracefully

**Code Examples**:
```typescript
// src/agents/nodes/base-node.ts
export abstract class AnalysisNode {
  abstract name: string;
  
  abstract process(
    state: ProjectState, 
    config?: RunnableConfig
  ): Promise<Partial<ProjectState>>;
}

// src/agents/nodes/document-parser-node.ts
export class DocumentParserNode extends AnalysisNode {
  name = 'documentParser';
  
  constructor(
    private fileHandler: FileHandler,
    private parser: OrgModeParser,
    private progress: ProgressManager
  ) {
    super();
  }
  
  async process(state: ProjectState): Promise<Partial<ProjectState>> {
    this.progress.update('Parsing org-mode document...');
    
    const content = await this.fileHandler.read(state.documentPath);
    const parsed = this.parser.parse(content);
    
    return {
      parsedDocument: parsed,
      requirements: parsed.requirements || [],
      userStories: parsed.userStories || [],
      brainstormIdeas: parsed.brainstormIdeas || []
    };
  }
}
```

**File Changes**:
- Create: `src/agents/nodes/base-node.ts`
- Create: `src/agents/nodes/document-parser-node.ts`
- Create: `tests/agents/nodes/document-parser-node.test.ts`

**Testing Approach**:
- Test with valid org-mode files
- Test with invalid files
- Test error handling
- Mock FileHandler and OrgModeParser

**Definition of Done**:
- ✅ Node parses documents successfully
- ✅ Integrates with existing parser
- ✅ Progress updates work
- ✅ Error handling tested

**Common Pitfalls**:
- Don't duplicate parsing logic
- Handle large files efficiently
- Preserve all document metadata

### 4.3.2: RequirementsAnalysisNode - Understand project goals

**Description**: Analyze requirements to understand project goals and prepare for MoSCoW/Kano evaluation.

**Implementation Steps**:
1. Create RequirementsAnalysisNode class
2. Implement OpenAI integration for analysis
3. Extract key themes and goals
4. Prepare data for categorization nodes

**Code Examples**:
```typescript
// src/agents/nodes/requirements-analysis-node.ts
export class RequirementsAnalysisNode extends AnalysisNode {
  name = 'requirementsAnalysis';
  
  constructor(
    private openai: OpenAI,
    private progress: ProgressManager
  ) {
    super();
  }
  
  async process(state: ProjectState): Promise<Partial<ProjectState>> {
    this.progress.update('Analyzing project requirements...');
    
    const prompt = this.buildAnalysisPrompt(state);
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a project analysis expert...' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    });
    
    const analysis = JSON.parse(response.choices[0].message.content);
    
    return {
      requirements: this.enrichRequirements(state.requirements, analysis),
      // Additional analysis results
    };
  }
}
```

**File Changes**:
- Create: `src/agents/nodes/requirements-analysis-node.ts`
- Create: `src/agents/prompts/requirements-prompts.ts`
- Create: `tests/agents/nodes/requirements-analysis-node.test.ts`

**Testing Approach**:
- Mock OpenAI responses
- Test prompt generation
- Test analysis parsing
- Verify enrichment logic

**Definition of Done**:
- ✅ Analyzes all requirements
- ✅ Generates structured analysis
- ✅ OpenAI integration works
- ✅ Handles API errors gracefully

**Common Pitfalls**:
- Keep prompts focused and clear
- Handle token limits for large documents
- Parse AI responses defensively

### 4.3.3: MoscowCategorizationNode - Apply MoSCoW framework

**Description**: Categorize requirements and ideas using MoSCoW framework with specialized evaluation questions.

**Implementation Steps**:
1. Implement MoSCoW evaluation logic
2. Create evaluation questions for each category
3. Generate categorizations with confidence scores
4. Provide detailed rationale

**Code Examples**:
```typescript
// src/agents/nodes/moscow-categorization-node.ts
export class MoscowCategorizationNode extends AnalysisNode {
  name = 'moscowCategorization';
  
  private mustHaveQuestions = [
    "What will happen if this idea/feature is not included?",
    "Is there a simpler way to accomplish this?",
    "Will the product work without it?"
  ];
  
  async process(state: ProjectState): Promise<Partial<ProjectState>> {
    this.progress.update('Applying MoSCoW categorization...');
    
    const categorizations = await Promise.all(
      state.brainstormIdeas.map(idea => 
        this.categorizeIdea(idea, state.requirements)
      )
    );
    
    return {
      moscowCategorizations: categorizations
    };
  }
  
  private async categorizeIdea(
    idea: BrainstormIdea, 
    requirements: Requirement[]
  ): Promise<MoscowResult> {
    // Evaluation logic using OpenAI
  }
}
```

**File Changes**:
- Create: `src/agents/nodes/moscow-categorization-node.ts`
- Create: `src/agents/prompts/moscow-prompts.ts`
- Create: `tests/agents/nodes/moscow-categorization-node.test.ts`

**Testing Approach**:
- Test each category evaluation
- Verify confidence scoring
- Test with edge cases
- Ensure rationale quality

**Definition of Done**:
- ✅ All ideas categorized
- ✅ Confidence scores 1-10
- ✅ Detailed rationale provided
- ✅ Questions answered for each item

**Common Pitfalls**:
- Don't bias toward any category
- Ensure consistent evaluation
- Handle ambiguous cases

### 4.3.4: KanoEvaluationNode - Assess user value

**Description**: Apply Kano model to assess user satisfaction and value perception.

**Implementation Steps**:
1. Implement Kano model evaluation
2. Calculate user value scores
3. Determine Kano categories
4. Generate insights about user expectations

**Code Examples**:
```typescript
// src/agents/nodes/kano-evaluation-node.ts
export class KanoEvaluationNode extends AnalysisNode {
  name = 'kanoEvaluation';
  
  async process(state: ProjectState): Promise<Partial<ProjectState>> {
    this.progress.update('Evaluating user value with Kano model...');
    
    const evaluations = await Promise.all(
      state.brainstormIdeas.map(idea =>
        this.evaluateKano(idea, state.userStories)
      )
    );
    
    return {
      kanoEvaluations: evaluations
    };
  }
  
  private async evaluateKano(
    idea: BrainstormIdea,
    userStories: UserStory[]
  ): Promise<KanoResult> {
    // Kano evaluation logic
  }
}
```

**File Changes**:
- Create: `src/agents/nodes/kano-evaluation-node.ts`
- Create: `src/agents/prompts/kano-prompts.ts`
- Create: `tests/agents/nodes/kano-evaluation-node.test.ts`

**Testing Approach**:
- Test category determination
- Verify value scoring
- Test with various user stories
- Ensure consistent results

**Definition of Done**:
- ✅ All ideas evaluated
- ✅ Kano types assigned
- ✅ User value scores calculated
- ✅ Clear rationale provided

**Common Pitfalls**:
- Understand Kano categories deeply
- Consider user perspective
- Balance different user segments

### 4.3.5: DependencyAnalysisNode - Map feature relationships

**Description**: Analyze dependencies between features and requirements.

**Implementation Steps**:
1. Create dependency detection logic
2. Build dependency graph
3. Identify critical paths
4. Flag circular dependencies

**Code Examples**:
```typescript
// src/agents/nodes/dependency-analysis-node.ts
export class DependencyAnalysisNode extends AnalysisNode {
  name = 'dependencyAnalysis';
  
  async process(state: ProjectState): Promise<Partial<ProjectState>> {
    this.progress.update('Analyzing feature dependencies...');
    
    const dependencyMap = this.buildDependencyMap(
      state.brainstormIdeas,
      state.requirements
    );
    
    const criticalPath = this.findCriticalPath(dependencyMap);
    
    return {
      dependencies: dependencyMap,
      criticalPath
    };
  }
}
```

**File Changes**:
- Create: `src/agents/nodes/dependency-analysis-node.ts`
- Create: `src/agents/utils/graph-utils.ts`
- Create: `tests/agents/nodes/dependency-analysis-node.test.ts`

**Testing Approach**:
- Test dependency detection
- Test graph algorithms
- Verify circular detection
- Test with complex scenarios

**Definition of Done**:
- ✅ Dependencies mapped
- ✅ Critical path identified
- ✅ Circular deps flagged
- ✅ Visual representation ready

**Common Pitfalls**:
- Handle indirect dependencies
- Avoid infinite loops
- Keep performance optimal

### 4.4: Create Research Nodes (Stubs)

**Description**: Create stub implementations for research nodes that will integrate with n8n in Task 5.0.

**Implementation Steps**:
1. Create stub classes for all research nodes
2. Implement basic interfaces
3. Add TODO comments for n8n integration
4. Return mock data for testing

**Code Examples**:
```typescript
// src/agents/nodes/research/technology-extraction-node.ts
export class TechnologyExtractionNode extends AnalysisNode {
  name = 'technologyExtraction';
  
  async process(state: ProjectState): Promise<Partial<ProjectState>> {
    this.progress.update('Extracting technology keywords...');
    
    // TODO: Implement actual extraction logic
    // For now, return mock data
    const technologies = this.extractTechnologies(state.parsedDocument);
    
    return {
      researchTopics: technologies
    };
  }
  
  private extractTechnologies(doc: OrgModeDocument): string[] {
    // Stub implementation
    return ['react', 'nodejs', 'postgresql'];
  }
}
```

**File Changes**:
- Create: `src/agents/nodes/research/` directory
- Create: All 5 research node stubs
- Create: Basic tests for each stub

**Testing Approach**:
- Test stub responses
- Verify interface compliance
- Prepare for n8n integration

**Definition of Done**:
- ✅ All 5 stubs created
- ✅ Basic tests pass
- ✅ TODOs documented
- ✅ Ready for Task 5.0

**Common Pitfalls**:
- Don't over-engineer stubs
- Keep interfaces stable
- Document integration points

### 4.5: Create Refinement Nodes

**Description**: Implement nodes for processing user feedback and refinement iterations.

**Implementation Steps**:
1. Implement ResponseProcessingNode
2. Create FeedbackIntegrationNode
3. Build ChangelogGenerationNode
4. Handle version tracking

**Code Examples**:
```typescript
// src/agents/nodes/refinement/response-processing-node.ts
export class ResponseProcessingNode extends AnalysisNode {
  name = 'responseProcessing';
  
  async process(state: ProjectState): Promise<Partial<ProjectState>> {
    this.progress.update('Processing :RESPONSE: tags...');
    
    const responses = this.extractResponses(state.parsedDocument);
    const processedResponses = await this.analyzeResponses(responses);
    
    return {
      responses: processedResponses,
      version: state.version + 1
    };
  }
}
```

**File Changes**:
- Create: `src/agents/nodes/refinement/` directory
- Create: All 3 refinement nodes
- Create: Tests for refinement logic

**Testing Approach**:
- Test response extraction
- Test feedback integration
- Verify changelog generation
- Test version incrementing

**Definition of Done**:
- ✅ :RESPONSE: tags processed
- ✅ Feedback integrated
- ✅ Changelog generated
- ✅ Versions tracked

**Common Pitfalls**:
- Preserve feedback context
- Handle conflicting feedback
- Maintain changelog clarity

### 4.6: Build Graph Edges and Conditional Routing

**Description**: Connect all nodes with edges and implement conditional routing logic.

**Implementation Steps**:
1. Define edge conditions
2. Implement routing functions
3. Build the complete graph
4. Add error recovery paths

**Code Examples**:
```typescript
// src/agents/graph.ts
export function buildIdeaForgeGraph() {
  const graph = new StateGraph<ProjectState>({
    channels: stateChannels
  });
  
  // Add nodes
  graph.addNode('documentParser', documentParserNode);
  graph.addNode('requirementsAnalysis', requirementsAnalysisNode);
  // ... add all nodes
  
  // Define edges
  graph.addEdge('documentParser', 'requirementsAnalysis');
  
  // Conditional routing
  graph.addConditionalEdges(
    'requirementsAnalysis',
    (state) => {
      if (state.responses.length > 0) {
        return 'responseProcessing';
      }
      return 'moscowCategorization';
    },
    {
      'responseProcessing': 'responseProcessing',
      'moscowCategorization': 'moscowCategorization'
    }
  );
  
  // Set entry point
  graph.setEntryPoint('documentParser');
  
  return graph.compile();
}
```

**File Changes**:
- Create: `src/agents/edges/` directory
- Modify: `src/agents/graph.ts`
- Create: `src/agents/edges/routing.ts`
- Create: Tests for graph construction

**Testing Approach**:
- Test each routing condition
- Verify graph compilation
- Test error paths
- Ensure no dead ends

**Definition of Done**:
- ✅ All nodes connected
- ✅ Routing logic works
- ✅ Error paths defined
- ✅ Graph compiles successfully

**Common Pitfalls**:
- Avoid routing loops
- Handle all edge cases
- Keep routing logic simple

### 4.7: Implement State Persistence Between Sessions

**Description**: Add checkpointing to persist LangGraph state between CLI invocations.

**Implementation Steps**:
1. Implement memory saver
2. Create session management
3. Add state recovery logic
4. Handle version conflicts

**Code Examples**:
```typescript
// src/agents/persistence/memory-saver.ts
import { MemorySaver } from '@langchain/langgraph';

export class FileSystemMemorySaver extends MemorySaver {
  constructor(private basePath: string) {
    super();
  }
  
  async saveCheckpoint(checkpoint: Checkpoint): Promise<void> {
    const filePath = path.join(
      this.basePath, 
      `${checkpoint.threadId}.json`
    );
    await fs.writeFile(filePath, JSON.stringify(checkpoint));
  }
  
  async loadCheckpoint(threadId: string): Promise<Checkpoint | null> {
    // Load from filesystem
  }
}
```

**File Changes**:
- Create: `src/agents/persistence/` directory
- Create: `src/agents/persistence/memory-saver.ts`
- Create: `src/agents/persistence/session-manager.ts`
- Create: Tests for persistence

**Testing Approach**:
- Test save/load cycle
- Test concurrent access
- Verify data integrity
- Test version handling

**Definition of Done**:
- ✅ State persists to disk
- ✅ Sessions recoverable
- ✅ Version conflicts handled
- ✅ Performance acceptable

**Common Pitfalls**:
- Handle file locking
- Manage storage growth
- Secure sensitive data

### 4.8: Create LangGraph-CLI Communication Layer

**Description**: Build the integration layer between CLI commands and LangGraph agent.

**Implementation Steps**:
1. Create agent runner service
2. Integrate with existing commands
3. Add progress reporting
4. Handle interruptions

**Code Examples**:
```typescript
// src/services/agent-runner.ts
export class AgentRunner {
  private agent: CompiledGraph<ProjectState>;
  
  constructor(
    private progress: ProgressManager,
    private memorySaver: MemorySaver
  ) {
    this.agent = buildIdeaForgeGraph();
  }
  
  async analyze(documentPath: string): Promise<AnalysisResult> {
    const initialState = {
      documentPath,
      ...createInitialState()
    };
    
    const config = {
      configurable: {
        thread_id: this.generateThreadId(documentPath)
      }
    };
    
    const result = await this.agent.invoke(initialState, config);
    return this.formatResult(result);
  }
}
```

**File Changes**:
- Create: `src/services/agent-runner.ts`
- Modify: `src/cli/commands/analyze.ts`
- Modify: `src/cli/commands/refine.ts`
- Create: Integration tests

**Testing Approach**:
- Test CLI integration
- Verify progress updates
- Test interruption handling
- End-to-end testing

**Definition of Done**:
- ✅ CLI commands use LangGraph
- ✅ Progress updates work
- ✅ Results formatted correctly
- ✅ All existing tests pass

**Common Pitfalls**:
- Maintain backward compatibility
- Handle long-running operations
- Preserve CLI responsiveness

## Testing Strategy

### Unit Test Requirements

Each node requires comprehensive unit tests:
- Input validation
- Core processing logic
- Error handling
- State updates
- Progress reporting

Example test structure:
```typescript
describe('MoscowCategorizationNode', () => {
  let node: MoscowCategorizationNode;
  let mockOpenAI: jest.Mocked<OpenAI>;
  
  beforeEach(() => {
    mockOpenAI = createMockOpenAI();
    node = new MoscowCategorizationNode(mockOpenAI, mockProgress);
  });
  
  describe('process', () => {
    it('should categorize all ideas', async () => {
      // Test implementation
    });
    
    it('should handle API errors gracefully', async () => {
      // Test error handling
    });
  });
});
```

### Integration Test Scenarios

1. **Full Analysis Flow**:
   - Load org-mode file
   - Run through complete graph
   - Verify all nodes executed
   - Check final results

2. **Refinement Flow**:
   - Initial analysis
   - Add :RESPONSE: tags
   - Run refinement
   - Verify changes applied

3. **State Persistence**:
   - Run partial analysis
   - Interrupt and restart
   - Verify state recovered

### Manual Testing Procedures

1. **Basic Analysis Test**:
   ```bash
   npm run build
   ./bin/ideaforge analyze ideaforge-template.org
   # Verify progress messages
   # Check output file
   ```

2. **Refinement Test**:
   ```bash
   # Edit output with :RESPONSE: tags
   ./bin/ideaforge refine analysis.org
   # Verify version increment
   # Check changelog
   ```

3. **Performance Test**:
   ```bash
   # Use large org-mode file
   time ./bin/ideaforge analyze large-project.org
   # Should complete in < 5 minutes
   ```

### Mock Data Requirements

- Mock OpenAI responses for all prompts
- Sample org-mode documents of various sizes
- Pre-built ProjectState objects
- Mock n8n webhook responses (for stubs)

## Integration Plan

### How to Integrate with Existing Code

1. **Minimal Changes to Commands**:
   ```typescript
   // Before (in analyze.ts)
   const data = extractor.extract(parsed);
   
   // After
   const result = await agentRunner.analyze(filePath);
   ```

2. **Preserve Existing Interfaces**:
   - Keep command signatures same
   - Maintain output formats
   - Add new features as options

### API Contracts

```typescript
// Agent Runner API
interface AgentRunner {
  analyze(documentPath: string): Promise<AnalysisResult>;
  refine(documentPath: string): Promise<RefinementResult>;
  getSession(documentPath: string): Promise<SessionInfo>;
}

// Result interfaces match existing formats
interface AnalysisResult {
  requirements: ProcessedRequirement[];
  userStories: ProcessedUserStory[];
  ideas: CategorizedIdea[];
  suggestions: Suggestion[];
}
```

### Configuration Requirements

```env
# Required environment variables
OPENAI_API_KEY=sk-...

# Optional configuration
LANGGRAPH_STATE_DIR=.ideaforge/state
LANGGRAPH_LOG_LEVEL=info
```

### Migration Steps

1. **Phase 1**: Add LangGraph alongside existing logic
2. **Phase 2**: Route analyze/refine through LangGraph
3. **Phase 3**: Remove old analysis code
4. **Phase 4**: Enable advanced features

## Documentation Requirements

### Code Documentation Standards

```typescript
/**
 * Applies MoSCoW categorization to brainstormed ideas.
 * 
 * Uses specialized evaluation questions for each category:
 * - Must Have: Critical failure analysis
 * - Should Have: Value vs effort assessment
 * - Could Have: Nice-to-have evaluation
 * - Won't Have: Scope exclusion
 * 
 * @param state Current project state with ideas to categorize
 * @returns Updated state with MoSCoW categorizations
 */
async process(state: ProjectState): Promise<Partial<ProjectState>>
```

### README Updates

Add new sections:
- LangGraph Architecture Overview
- AI Analysis Capabilities  
- State Persistence Explanation
- Troubleshooting Guide

### API Documentation

Document all:
- Node interfaces
- State schema
- Configuration options
- Error codes

### Usage Examples

Create examples for:
- Basic analysis workflow
- Multi-iteration refinement
- Customizing evaluation criteria
- Debugging graph execution

## Functional Requirements

1. **FR-4.1**: System must parse org-mode documents through LangGraph DocumentParserNode
2. **FR-4.2**: System must analyze requirements to understand project goals and context
3. **FR-4.3**: System must categorize all ideas using MoSCoW framework with confidence scores
4. **FR-4.4**: System must evaluate user value using Kano model categories
5. **FR-4.5**: System must identify dependencies between features and requirements
6. **FR-4.6**: System must process :RESPONSE: tags for iterative refinement
7. **FR-4.7**: System must maintain conversation state across CLI invocations
8. **FR-4.8**: System must generate changelogs tracking decision evolution
9. **FR-4.9**: System must provide real-time progress updates during analysis
10. **FR-4.10**: System must complete analysis within 5-10 minutes for typical projects
11. **FR-4.11**: System must handle OpenAI API errors gracefully with retries
12. **FR-4.12**: System must support interruption and resumption of analysis

## Success Metrics

### Completion Criteria
- ✅ All nodes implemented and tested
- ✅ Graph executes end-to-end successfully
- ✅ State persistence works across sessions
- ✅ CLI commands integrated with LangGraph
- ✅ All existing tests still pass
- ✅ Documentation complete

### Performance Benchmarks
- Analysis completion: < 5 minutes for typical project
- State save/load: < 1 second
- Memory usage: < 500MB for large documents
- API calls: < 20 per analysis

### Quality Metrics
- Test coverage: > 80% for all modules
- TypeScript strict mode: No errors
- ESLint: No violations
- File size: All files < 500 lines

## Next Steps

### What Becomes Possible
After Task 4.0, IdeaForge will have:
- Intelligent AI-powered analysis
- Stateful conversation with refinement
- Foundation for external research (Task 5.0)
- Rich categorization and evaluation

### Which Parent Tasks Should Follow

1. **Task 5.0 - n8n Integration** (Recommended Next)
   - Connect research nodes to n8n webhooks
   - Implement external API calls
   - Add rate limiting and caching

2. **Task 6.0 - AI Analysis Enhancement**
   - Refine prompts based on real usage
   - Add more sophisticated evaluation
   - Implement A/B testing for prompts

### Future Enhancement Opportunities

- **Streaming Responses**: Show AI thinking in real-time
- **Parallel Processing**: Run independent nodes concurrently  
- **Custom Nodes**: Allow users to add domain-specific analysis
- **Graph Visualization**: Show execution flow visually
- **Multi-Model Support**: Add Claude, Gemini as alternatives
- **Collaborative State**: Share sessions between users

## LangGraph Setup Instructions

Since I can execute commands directly through the shell, I will handle all the setup programmatically when implementing this task. Here's what I'll do:

### 1. Installing LangGraph

**What I'll do**:
```bash
npm install @langchain/langgraph @langchain/core openai
```

**How I'll verify success**:
- Check package.json for the new dependencies
- Run `npm list @langchain/langgraph` to confirm installation
- Test imports in a simple script

### 2. Environment Configuration

**What I'll do**:
1. Check if `.env` file exists
2. Verify OPENAI_API_KEY is present
3. Add LangGraph configuration if missing:
   ```
   LANGGRAPH_STATE_DIR=.ideaforge/state
   LANGGRAPH_LOG_LEVEL=info
   ```

**How I'll verify**:
```bash
# Test environment loading
node -e "require('dotenv').config(); console.log(process.env.OPENAI_API_KEY ? 'API Key loaded' : 'API Key missing')"
```

### 3. OpenAI API Verification

**What I'll do**:
1. Create and run a test script to verify OpenAI connection
2. Test GPT-4 access with a simple completion
3. Remove test script after verification

**Verification script I'll run**:
```javascript
const { OpenAI } = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function test() {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Say "IdeaForge connected!"' }],
      max_tokens: 10
    });
    console.log('✅ OpenAI Connected:', response.choices[0].message.content);
  } catch (error) {
    console.error('❌ OpenAI Error:', error.message);
  }
}

test();
```

### 4. Directory Structure Creation

**What I'll do**:
```bash
mkdir -p src/agents/nodes/research
mkdir -p src/agents/nodes/refinement  
mkdir -p src/agents/edges
mkdir -p src/agents/persistence
mkdir -p src/agents/prompts
mkdir -p src/agents/utils
mkdir -p tests/agents/nodes
```

**How I'll verify**:
```bash
tree src/agents -d
```

### 5. TypeScript Configuration Verification

**What I'll do**:
1. Check tsconfig.json for proper configuration
2. Ensure strict mode and correct module settings
3. Run `npx tsc --noEmit` to verify no compilation errors

### 6. Implementation Testing

**What I'll do after each implementation**:
```bash
# Build the project
npm run build

# Run specific test
npm test -- tests/agents/nodes/[node-name].test.ts

# Run all tests to ensure nothing breaks
npm test
```

**How I'll track success**:
- Monitor test output for passes/failures
- Check coverage reports
- Verify no TypeScript errors

### 7. Integration Verification

**What I'll do**:
1. Create integration test scripts
2. Run them to verify graph compilation
3. Test with sample org-mode files
4. Clean up test artifacts

**Key Advantage**: Since I can run commands directly, I can:
- Immediately catch and fix installation issues
- Verify each step programmatically
- Run tests continuously during development
- Ensure all components work before marking tasks complete
- Provide real-time feedback on what's working or failing

This programmatic approach ensures higher quality implementation with immediate verification of each step.

Remember: Each subtask should be completed with its tests passing before moving to the next. This ensures a solid foundation for the IdeaForge AI intelligence layer. 

## Testing Procedure Requirements

**CRITICAL**: I will follow this testing procedure programmatically for every task implementation:

### For Each Subtask:
1. **Create Test Files First**
   - Write comprehensive test files BEFORE or ALONGSIDE implementation
   - Test files go in `/tests/` mirroring the `/src/` structure
   - Include both positive and negative test cases
   - Test edge cases and error conditions
   - Run tests immediately to see them fail (TDD approach)

2. **Verify Tests Pass**
   - Run `npm test` after implementing each subtask
   - Monitor test output to ensure ALL tests pass
   - Fix any failing tests immediately
   - Never skip or comment out failing tests
   - Track test count to ensure no regressions

3. **Test Coverage Requirements**
   - Each new function/method needs at least one test
   - Critical logic needs multiple test scenarios
   - Error handling paths must be tested
   - Integration points need specific tests
   - I'll check coverage reports: `npm test -- --coverage`

4. **Continuous Testing**
   - Run tests after every significant code change
   - Use `npm test:agents:watch` for rapid feedback during development
   - Run full test suite before marking any subtask complete
   - Verify no existing tests break (maintain 254+ passing tests)

5. **Test File Naming**
   - Match source file names: `feature.ts` → `feature.test.ts`
   - Use descriptive test names that explain what's being tested
   - Group related tests in describe blocks

### Example Test Implementation:
```typescript
// For a parser in src/parsers/data-extractor.ts
// Create tests/parsers/data-extractor.test.ts

describe('DataExtractor', () => {
  describe('extractUserStories', () => {
    it('should extract well-formed user stories', () => {
      // Test implementation
    });
    
    it('should handle missing components gracefully', () => {
      // Test error cases
    });
  });
});
```

**ADVANTAGES OF PROGRAMMATIC TESTING**:
- Immediate feedback on code quality
- Catch regressions instantly
- Verify error handling works correctly
- Ensure consistent behavior across changes
- Build confidence before moving to next task

Since I can run tests directly, I'll maintain a test-driven development approach throughout the implementation.

## Programmatic Implementation Advantages

Since I can execute commands and run tests directly, the implementation of Task 4.0 will benefit from:

### 1. **Real-Time Verification**
- Install dependencies and immediately verify they work
- Test each component as it's built
- Catch TypeScript errors during development
- Verify API connections before proceeding

### 2. **Continuous Quality Assurance**
- Run tests after every file creation
- Monitor test count to prevent regressions
- Check coverage reports automatically
- Ensure ESLint compliance (500-line limit)

### 3. **Rapid Iteration**
- Fix issues immediately when detected
- Test different approaches quickly
- Validate assumptions programmatically
- Refactor with confidence

### 4. **Comprehensive Error Handling**
- Test error paths as they're implemented
- Verify graceful degradation
- Ensure helpful error messages
- Validate recovery mechanisms

### 5. **Documentation Validation**
- Test code examples from documentation
- Verify all imports work correctly
- Ensure examples compile and run
- Keep documentation accurate

### Implementation Workflow
```
For each subtask:
1. Create test file → Run test (see it fail)
2. Implement feature → Run test (make it pass)
3. Run full suite → Ensure no regressions
4. Check coverage → Add tests if needed
5. Run build → Verify TypeScript compilation
6. Update task list → Mark subtask complete
```

This approach ensures high-quality, well-tested code throughout the LangGraph implementation. 