# Detailed Implementation Guide - Parent Task 4.0: LangGraph Agent Architecture

## Overview
This guide provides step-by-step implementation details for building the LangGraph intelligence layer of IdeaForge. As I implement each subtask, I'll run tests continuously to ensure quality and catch issues immediately.

## Environment Setup

Before starting, I'll verify:
1. Completed Parent Tasks 1.0, 2.0, and 3.0 ✅
2. OpenAI API key with GPT-4 access (will test programmatically)
3. Node.js 16+ and npm installed ✅
4. All existing tests passing (254 tests) ✅

## Task 4.1: Set up LangGraph project structure

### Objective
Create the foundational directory structure and install LangGraph dependencies.

### Implementation Steps

1. **Install Dependencies**
   
   I'll run:
   ```bash
   npm install @langchain/langgraph @langchain/core openai
   ```
   
   Then verify installation:
   ```bash
   npm list @langchain/langgraph
   ```

2. **Create Directory Structure**
   
   I'll execute:
   ```bash
   # Create all required directories
   mkdir -p src/agents/nodes/research
   mkdir -p src/agents/nodes/refinement  
   mkdir -p src/agents/edges
   mkdir -p src/agents/persistence
   mkdir -p src/agents/prompts
   mkdir -p src/agents/utils
   mkdir -p tests/agents/nodes/research
   mkdir -p tests/agents/nodes/refinement
   mkdir -p tests/agents/edges
   mkdir -p tests/agents/persistence
   ```

3. **Create Base Files**

   I'll create `src/agents/index.ts`:
   ```typescript
   import { StateGraph } from '@langchain/langgraph';
   import { ProjectState } from './state';
   
   /**
    * Creates and configures the IdeaForge LangGraph agent
    */
   export function createIdeaForgeAgent() {
     const graph = new StateGraph<ProjectState>({
       channels: {} // Will be defined in task 4.2
     });
     
     // Graph construction will be completed in later tasks
     
     return graph;
   }
   
   export * from './state';
   export * from './types';
   ```

   And create `src/agents/types.ts`:
   ```typescript
   // Common types used across the agent system
   
   export interface Requirement {
     id: string;
     title: string;
     description: string;
     moscowCategory?: 'must' | 'should' | 'could' | 'wont';
   }
   
   export interface UserStory {
     id: string;
     actor: string;
     action: string;
     benefit: string;
   }
   
   export interface BrainstormIdea {
     id: string;
     category: string;
     title: string;
     description: string;
   }
   
   export interface QuestionAnswer {
     question: string;
     answer: string;
   }
   ```

4. **Create Initial Test**
   
   I'll create `tests/agents/index.test.ts`:
   ```typescript
   import { createIdeaForgeAgent } from '../../src/agents';
   
   describe('IdeaForge Agent', () => {
     it('should create agent without errors', () => {
       expect(() => createIdeaForgeAgent()).not.toThrow();
     });
     
     it('should return a StateGraph instance', () => {
       const agent = createIdeaForgeAgent();
       expect(agent).toBeDefined();
       expect(agent.constructor.name).toBe('StateGraph');
     });
   });
   ```

5. **Update package.json Scripts**
   
   I'll add convenience scripts:
   ```json
   {
     "scripts": {
       "test:agents": "jest tests/agents --coverage",
       "test:agents:watch": "jest tests/agents --watch"
     }
   }
   ```

### Verification Steps

1. I'll run the new test:
   ```bash
   npm run test:agents
   ```

2. Verify TypeScript compilation:
   ```bash
   npm run build
   ```

3. Check directory structure:
   ```bash
   tree src/agents -d
   ```

### What I'll Monitor
- Installation completes without peer dependency warnings
- All directories created with proper permissions
- TypeScript compiles without errors
- Initial tests pass
- No impact on existing tests (still 254 passing)

### Definition of Done
- ✅ LangGraph dependencies installed (verified via npm list)
- ✅ Directory structure created (verified via tree command)
- ✅ Base files compile without errors (verified via npm run build)
- ✅ Initial test passes (verified via npm test)

## Task 4.2: Define ProjectState TypeScript schema

### Objective
Create the comprehensive state schema that flows through all LangGraph nodes.

### Implementation Steps

1. **Create State Definition**

   Create `src/agents/state.ts`:
   ```typescript
   import { OrgModeDocument } from '../parsers/orgmode-types';
   import {
     Requirement,
     UserStory,
     BrainstormIdea,
     QuestionAnswer
   } from './types';
   
   /**
    * Core state that flows through the LangGraph agent
    */
   export interface ProjectState {
     // Document data
     documentPath: string;
     parsedDocument: OrgModeDocument | null;
     version: number;
     
     // Extracted content
     requirements: Requirement[];
     userStories: UserStory[];
     brainstormIdeas: BrainstormIdea[];
     
     // Analysis results
     moscowCategorizations: MoscowResult[];
     kanoEvaluations: KanoResult[];
     
     // Dependencies
     dependencies: DependencyMap;
     criticalPath: string[];
     
     // Suggestions and alternatives
     suggestions: Suggestion[];
     alternatives: Alternative[];
     
     // Research data (for Task 5.0)
     researchTopics: string[];
     researchResults: ResearchResult[];
     
     // Refinement tracking
     responses: ResponseTag[];
     changelog: ChangelogEntry[];
     
     // Session metadata
     sessionId: string;
     timestamp: Date;
     errors: ErrorEntry[];
   }
   
   export interface MoscowResult {
     itemId: string;
     itemType: 'requirement' | 'idea';
     category: 'must' | 'should' | 'could' | 'wont';
     confidence: number; // 1-10
     rationale: string;
     evaluationQuestions: QuestionAnswer[];
     suggestedMigration?: string;
   }
   
   export interface KanoResult {
     itemId: string;
     itemType: 'requirement' | 'idea';
     category: 'basic' | 'performance' | 'excitement' | 'indifferent' | 'reverse';
     userValueScore: number; // 1-100
     rationale: string;
   }
   
   export interface DependencyMap {
     [itemId: string]: {
       dependsOn: string[];
       requiredBy: string[];
       type: 'hard' | 'soft';
     };
   }
   
   export interface Suggestion {
     id: string;
     type: 'feature' | 'architecture' | 'alternative';
     title: string;
     description: string;
     rationale: string;
     relatedItems: string[];
   }
   
   export interface Alternative {
     originalId: string;
     alternativeTitle: string;
     alternativeDescription: string;
     advantages: string[];
     disadvantages: string[];
   }
   
   export interface ResearchResult {
     source: 'hackernews' | 'reddit' | 'other';
     url: string;
     title: string;
     summary: string;
     relevanceScore: number;
     insights: string[];
   }
   
   export interface ResponseTag {
     id: string;
     section: string;
     originalText: string;
     userResponse: string;
     processedAt?: Date;
   }
   
   export interface ChangelogEntry {
     version: number;
     timestamp: Date;
     changes: string[];
     responsesProcessed: number;
   }
   
   export interface ErrorEntry {
     timestamp: Date;
     node: string;
     error: string;
     recovered: boolean;
   }
   ```

2. **Define State Channels**

   Add to `src/agents/state.ts`:
   ```typescript
   import { StateGraphArgs } from '@langchain/langgraph';
   
   /**
    * Channel definitions for LangGraph state management
    */
   export const stateChannels: StateGraphArgs<ProjectState>['channels'] = {
     // Document data channels
     documentPath: {
       value: (x: string, y: string) => y || x,
       default: () => ''
     },
     parsedDocument: {
       value: (x: any, y: any) => y || x,
       default: () => null
     },
     version: {
       value: (x: number, y: number) => y || x,
       default: () => 1
     },
     
     // Array channels (append by default)
     requirements: {
       value: (x: any[], y: any[]) => y?.length ? y : x,
       default: () => []
     },
     userStories: {
       value: (x: any[], y: any[]) => y?.length ? y : x,
       default: () => []
     },
     brainstormIdeas: {
       value: (x: any[], y: any[]) => y?.length ? y : x,
       default: () => []
     },
     
     // Analysis results
     moscowCategorizations: {
       value: (x: any[], y: any[]) => y?.length ? y : x,
       default: () => []
     },
     kanoEvaluations: {
       value: (x: any[], y: any[]) => y?.length ? y : x,
       default: () => []
     },
     
     // Complex objects
     dependencies: {
       value: (x: any, y: any) => ({ ...x, ...y }),
       default: () => ({})
     },
     criticalPath: {
       value: (x: any[], y: any[]) => y?.length ? y : x,
       default: () => []
     },
     
     // Research and suggestions
     suggestions: {
       value: (x: any[], y: any[]) => y?.length ? y : x,
       default: () => []
     },
     alternatives: {
       value: (x: any[], y: any[]) => y?.length ? y : x,
       default: () => []
     },
     researchTopics: {
       value: (x: any[], y: any[]) => y?.length ? y : x,
       default: () => []
     },
     researchResults: {
       value: (x: any[], y: any[]) => y?.length ? y : x,
       default: () => []
     },
     
     // Refinement tracking
     responses: {
       value: (x: any[], y: any[]) => y?.length ? y : x,
       default: () => []
     },
     changelog: {
       value: (x: any[], y: any[]) => [...x, ...y],
       default: () => []
     },
     
     // Metadata
     sessionId: {
       value: (x: string, y: string) => y || x,
       default: () => crypto.randomUUID()
     },
     timestamp: {
       value: (x: Date, y: Date) => y || x,
       default: () => new Date()
     },
     errors: {
       value: (x: any[], y: any[]) => [...x, ...y],
       default: () => []
     }
   };
   ```

3. **Create State Utilities**

   Add to `src/agents/state.ts`:
   ```typescript
   /**
    * Creates initial state for a new analysis session
    */
   export function createInitialState(documentPath: string): ProjectState {
     return {
       documentPath,
       parsedDocument: null,
       version: 1,
       requirements: [],
       userStories: [],
       brainstormIdeas: [],
       moscowCategorizations: [],
       kanoEvaluations: [],
       dependencies: {},
       criticalPath: [],
       suggestions: [],
       alternatives: [],
       researchTopics: [],
       researchResults: [],
       responses: [],
       changelog: [],
       sessionId: crypto.randomUUID(),
       timestamp: new Date(),
       errors: []
     };
   }
   
   /**
    * Type guard for ProjectState
    */
   export function isProjectState(value: any): value is ProjectState {
     return (
       typeof value === 'object' &&
       value !== null &&
       typeof value.documentPath === 'string' &&
       typeof value.version === 'number' &&
       Array.isArray(value.requirements) &&
       Array.isArray(value.userStories) &&
       Array.isArray(value.brainstormIdeas)
     );
   }
   
   /**
    * Creates a changelog entry for state changes
    */
   export function createChangelogEntry(
     version: number,
     changes: string[],
     responsesProcessed = 0
   ): ChangelogEntry {
     return {
       version,
       timestamp: new Date(),
       changes,
       responsesProcessed
     };
   }
   ```

4. **Update Agent Creation**

   Update `src/agents/index.ts`:
   ```typescript
   import { StateGraph } from '@langchain/langgraph';
   import { ProjectState, stateChannels } from './state';
   
   export function createIdeaForgeAgent() {
     const graph = new StateGraph<ProjectState>({
       channels: stateChannels
     });
     
     return graph;
   }
   ```

5. **Create Comprehensive Tests**

   Create `tests/agents/state.test.ts`:
   ```typescript
   import {
     ProjectState,
     createInitialState,
     isProjectState,
     createChangelogEntry,
     stateChannels
   } from '../../src/agents/state';
   
   describe('ProjectState', () => {
     describe('createInitialState', () => {
       it('should create valid initial state', () => {
         const state = createInitialState('/path/to/doc.org');
         
         expect(state.documentPath).toBe('/path/to/doc.org');
         expect(state.version).toBe(1);
         expect(state.parsedDocument).toBeNull();
         expect(state.requirements).toEqual([]);
         expect(state.sessionId).toMatch(/^[0-9a-f-]{36}$/);
       });
       
       it('should generate unique session IDs', () => {
         const state1 = createInitialState('doc1.org');
         const state2 = createInitialState('doc2.org');
         
         expect(state1.sessionId).not.toBe(state2.sessionId);
       });
     });
     
     describe('isProjectState', () => {
       it('should validate correct state objects', () => {
         const validState = createInitialState('test.org');
         expect(isProjectState(validState)).toBe(true);
       });
       
       it('should reject invalid state objects', () => {
         expect(isProjectState(null)).toBe(false);
         expect(isProjectState({})).toBe(false);
         expect(isProjectState({ documentPath: 123 })).toBe(false);
       });
     });
     
     describe('state channels', () => {
       it('should have default values for all channels', () => {
         Object.entries(stateChannels).forEach(([key, channel]) => {
           expect(channel.default).toBeDefined();
           expect(channel.value).toBeDefined();
         });
       });
       
       it('should merge array channels correctly', () => {
         const reqChannel = stateChannels.requirements;
         const existing = [{ id: '1' }];
         const newItems = [{ id: '2' }];
         
         expect(reqChannel.value(existing, newItems)).toEqual(newItems);
         expect(reqChannel.value(existing, [])).toEqual(existing);
       });
     });
   });
   ```

### Verification Steps

1. Run state tests:
   ```bash
   npm test tests/agents/state.test.ts
   ```

2. Verify TypeScript types:
   ```bash
   npx tsc --noEmit
   ```

3. Check state completeness against PRD requirements

### Common Issues & Solutions

- **Circular dependencies**: Keep state interfaces pure (no function imports)
- **Channel merge conflicts**: Test merge logic thoroughly
- **Serialization issues**: Ensure all state is JSON-serializable

### Definition of Done
- ✅ Complete ProjectState interface defined
- ✅ All state channels configured
- ✅ Utility functions implemented
- ✅ 100% test coverage for state module

## Task 4.3: Create core analysis nodes

### 4.3.1 DocumentParserNode - Parse org-mode structure ✓

### Objective
Create the first analysis node that integrates with the existing org-mode parser.

### Implementation Steps

1. **Create Base Node Class**

   Create `src/agents/nodes/base-node.ts`:
   ```typescript
   import { RunnableConfig } from '@langchain/core/runnables';
   import { ProjectState } from '../state';
   
   /**
    * Base class for all LangGraph analysis nodes
    */
   export abstract class AnalysisNode {
     abstract readonly name: string;
     
     /**
      * Process the state and return updates
      * @param state Current project state
      * @param config Optional runtime configuration
      * @returns Partial state with updates
      */
     abstract process(
       state: ProjectState,
       config?: RunnableConfig
     ): Promise<Partial<ProjectState>>;
     
     /**
      * Helper to create error entry
      */
     protected createError(error: Error): Partial<ProjectState> {
       return {
         errors: [{
           timestamp: new Date(),
           node: this.name,
           error: error.message,
           recovered: false
         }]
       };
     }
   }
   ```

2. **Implement DocumentParserNode**

   Create `src/agents/nodes/document-parser-node.ts`:
   ```typescript
   import { AnalysisNode } from './base-node';
   import { ProjectState } from '../state';
   import { FileHandler } from '../../services/file-handler';
   import { OrgModeParser } from '../../parsers/orgmode-parser';
   import { DataExtractor } from '../../parsers/data-extractor';
   import { ProgressManager } from '../../cli/progress-manager';
   
   export class DocumentParserNode extends AnalysisNode {
     readonly name = 'documentParser';
     
     constructor(
       private fileHandler: FileHandler,
       private parser: OrgModeParser,
       private extractor: DataExtractor,
       private progress: ProgressManager
     ) {
       super();
     }
     
     async process(state: ProjectState): Promise<Partial<ProjectState>> {
       try {
         this.progress.update('📄 Parsing org-mode document...');
         
         // Read file content
         const content = await this.fileHandler.read(state.documentPath);
         
         // Parse org-mode structure
         const parsed = this.parser.parse(content);
         
         // Extract structured data
         const extracted = this.extractor.extract(parsed);
         
         this.progress.update('✓ Document parsed successfully');
         
         // Map extracted data to state format
         return {
           parsedDocument: parsed,
           requirements: this.mapRequirements(extracted.requirements),
           userStories: this.mapUserStories(extracted.userStories),
           brainstormIdeas: this.mapBrainstormIdeas(extracted.ideas),
           researchTopics: extracted.additionalResearch || []
         };
       } catch (error) {
         this.progress.fail(`Failed to parse document: ${error.message}`);
         return this.createError(error as Error);
       }
     }
     
     private mapRequirements(requirements: any[]): ProjectState['requirements'] {
       return requirements.map((req, index) => ({
         id: `req-${index + 1}`,
         title: req.title || `Requirement ${index + 1}`,
         description: req.content || '',
         moscowCategory: req.moscow?.toLowerCase() as any || undefined
       }));
     }
     
     private mapUserStories(stories: any[]): ProjectState['userStories'] {
       return stories.map((story, index) => ({
         id: `story-${index + 1}`,
         actor: story.actor || 'User',
         action: story.action || '',
         benefit: story.benefit || ''
       }));
     }
     
     private mapBrainstormIdeas(ideas: any[]): ProjectState['brainstormIdeas'] {
       const mapped: ProjectState['brainstormIdeas'] = [];
       
       Object.entries(ideas).forEach(([category, items]) => {
         if (Array.isArray(items)) {
           items.forEach((item, index) => {
             mapped.push({
               id: `idea-${category}-${index + 1}`,
               category,
               title: item.title || `${category} Idea ${index + 1}`,
               description: item.content || ''
             });
           });
         }
       });
       
       return mapped;
     }
   }
   ```

3. **Create Node Factory**

   Create `src/agents/nodes/index.ts`:
   ```typescript
   import { DocumentParserNode } from './document-parser-node';
   import { FileHandler } from '../../services/file-handler';
   import { OrgModeParser } from '../../parsers/orgmode-parser';
   import { DataExtractor } from '../../parsers/data-extractor';
   import { ProgressManager } from '../../cli/progress-manager';
   
   /**
    * Factory function to create all nodes with dependencies
    */
   export function createNodes(
     fileHandler: FileHandler,
     progress: ProgressManager
   ) {
     // Create parsers
     const orgModeParser = new OrgModeParser();
     const dataExtractor = new DataExtractor();
     
     // Create nodes
     const documentParser = new DocumentParserNode(
       fileHandler,
       orgModeParser,
       dataExtractor,
       progress
     );
     
     return {
       documentParser
       // More nodes will be added here
     };
   }
   ```

4. **Create Comprehensive Tests**

   Create `tests/agents/nodes/document-parser-node.test.ts`:
   ```typescript
   import { DocumentParserNode } from '../../../src/agents/nodes/document-parser-node';
   import { createInitialState } from '../../../src/agents/state';
   import { FileHandler } from '../../../src/services/file-handler';
   import { OrgModeParser } from '../../../src/parsers/orgmode-parser';
   import { DataExtractor } from '../../../src/parsers/data-extractor';
   import { ProgressManager } from '../../../src/cli/progress-manager';
   
   describe('DocumentParserNode', () => {
     let node: DocumentParserNode;
     let mockFileHandler: jest.Mocked<FileHandler>;
     let mockParser: jest.Mocked<OrgModeParser>;
     let mockExtractor: jest.Mocked<DataExtractor>;
     let mockProgress: jest.Mocked<ProgressManager>;
     
     beforeEach(() => {
       // Create mocks
       mockFileHandler = {
         read: jest.fn(),
         write: jest.fn(),
         exists: jest.fn()
       } as any;
       
       mockParser = {
         parse: jest.fn()
       } as any;
       
       mockExtractor = {
         extract: jest.fn()
       } as any;
       
       mockProgress = {
         update: jest.fn(),
         succeed: jest.fn(),
         fail: jest.fn()
       } as any;
       
       node = new DocumentParserNode(
         mockFileHandler,
         mockParser,
         mockExtractor,
         mockProgress
       );
     });
     
     describe('process', () => {
       it('should parse document and extract data', async () => {
         // Arrange
         const state = createInitialState('test.org');
         const mockContent = '* Requirements\n** MUST Feature 1';
         const mockParsed = { type: 'document', children: [] };
         const mockExtracted = {
           requirements: [
             { title: 'Feature 1', content: 'Description', moscow: 'MUST' }
           ],
           userStories: [],
           ideas: { features: [] },
           additionalResearch: ['React', 'Node.js']
         };
         
         mockFileHandler.read.mockResolvedValue(mockContent);
         mockParser.parse.mockReturnValue(mockParsed);
         mockExtractor.extract.mockReturnValue(mockExtracted);
         
         // Act
         const result = await node.process(state);
         
         // Assert
         expect(mockFileHandler.read).toHaveBeenCalledWith('test.org');
         expect(mockParser.parse).toHaveBeenCalledWith(mockContent);
         expect(mockExtractor.extract).toHaveBeenCalledWith(mockParsed);
         
         expect(result.parsedDocument).toBe(mockParsed);
         expect(result.requirements).toHaveLength(1);
         expect(result.requirements![0]).toEqual({
           id: 'req-1',
           title: 'Feature 1',
           description: 'Description',
           moscowCategory: 'must'
         });
         expect(result.researchTopics).toEqual(['React', 'Node.js']);
       });
       
       it('should handle parsing errors gracefully', async () => {
         // Arrange
         const state = createInitialState('test.org');
         const error = new Error('File not found');
         mockFileHandler.read.mockRejectedValue(error);
         
         // Act
         const result = await node.process(state);
         
         // Assert
         expect(mockProgress.fail).toHaveBeenCalled();
         expect(result.errors).toHaveLength(1);
         expect(result.errors![0]).toMatchObject({
           node: 'documentParser',
           error: 'File not found',
           recovered: false
         });
       });
       
       it('should map brainstorm ideas with categories', async () => {
         // Arrange
         const state = createInitialState('test.org');
         const mockExtracted = {
           requirements: [],
           userStories: [],
           ideas: {
             features: [
               { title: 'Feature A', content: 'Description A' },
               { title: 'Feature B', content: 'Description B' }
             ],
             architecture: [
               { title: 'Pattern X', content: 'Use pattern X' }
             ]
           }
         };
         
         mockFileHandler.read.mockResolvedValue('content');
         mockParser.parse.mockReturnValue({} as any);
         mockExtractor.extract.mockReturnValue(mockExtracted);
         
         // Act
         const result = await node.process(state);
         
         // Assert
         expect(result.brainstormIdeas).toHaveLength(3);
         expect(result.brainstormIdeas![0]).toEqual({
           id: 'idea-features-1',
           category: 'features',
           title: 'Feature A',
           description: 'Description A'
         });
         expect(result.brainstormIdeas![2].category).toBe('architecture');
       });
     });
   });
   ```

5. **Integration with Graph**

   Update `src/agents/graph.ts`:
   ```typescript
   import { StateGraph } from '@langchain/langgraph';
   import { ProjectState, stateChannels } from './state';
   import { createNodes } from './nodes';
   import { FileHandler } from '../services/file-handler';
   import { ProgressManager } from '../cli/progress-manager';
   
   export function buildIdeaForgeGraph(
     fileHandler: FileHandler,
     progress: ProgressManager
   ) {
     const graph = new StateGraph<ProjectState>({
       channels: stateChannels
     });
     
     // Create nodes
     const nodes = createNodes(fileHandler, progress);
     
     // Add document parser node
     graph.addNode('documentParser', (state) => 
       nodes.documentParser.process(state)
     );
     
     // Set entry point
     graph.setEntryPoint('documentParser');
     
     return graph;
   }
   ```

### Verification Steps

1. Run node tests:
   ```bash
   npm test tests/agents/nodes/document-parser-node.test.ts
   ```

2. Test with real org-mode file:
   ```bash
   # Create test script
   cat > test-parser-node.js << 'EOF'
   const { DocumentParserNode } = require('./dist/agents/nodes/document-parser-node');
   const { FileHandler } = require('./dist/services/file-handler');
   const { OrgModeParser } = require('./dist/parsers/orgmode-parser');
   const { DataExtractor } = require('./dist/parsers/data-extractor');
   const { ProgressManager } = require('./dist/cli/progress-manager');
   const { createInitialState } = require('./dist/agents/state');
   
   async function test() {
     const fileHandler = new FileHandler();
     const parser = new OrgModeParser();
     const extractor = new DataExtractor();
     const progress = new ProgressManager();
     
     const node = new DocumentParserNode(
       fileHandler,
       parser,
       extractor,
       progress
     );
     
     const state = createInitialState('ideaforge-template.org');
     const result = await node.process(state);
     
     console.log('Requirements found:', result.requirements?.length);
     console.log('User stories found:', result.userStories?.length);
     console.log('Ideas found:', result.brainstormIdeas?.length);
   }
   
   test().catch(console.error);
   EOF
   
   npm run build && node test-parser-node.js
   rm test-parser-node.js
   ```

### Common Issues & Solutions

- **Import path errors**: Use relative imports consistently
- **Mock setup**: Ensure all methods are mocked properly
- **State mapping**: Handle missing fields gracefully

### Definition of Done
- ✅ DocumentParserNode implemented
- ✅ Integrates with existing parsers
- ✅ Maps data to ProjectState format
- ✅ Error handling works
- ✅ Progress updates shown
- ✅ All tests pass

### 4.3.2 RequirementsAnalysisNode - Understand project goals ✓

### Objective
Create a node that analyzes requirements using OpenAI to understand project goals and context.

### Implementation Steps

1. **Setup OpenAI Client**

   Create `src/agents/utils/openai-client.ts`:
   ```typescript
   import OpenAI from 'openai';
   
   let openaiClient: OpenAI | null = null;
   
   /**
    * Get or create OpenAI client instance
    */
   export function getOpenAIClient(): OpenAI {
     if (!openaiClient) {
       const apiKey = process.env.OPENAI_API_KEY;
       if (!apiKey) {
         throw new Error('OPENAI_API_KEY environment variable is required');
       }
       
       openaiClient = new OpenAI({
         apiKey,
         maxRetries: 3,
         timeout: 60000 // 60 seconds
       });
     }
     
     return openaiClient;
   }
   
   /**
    * Helper to safely parse JSON from AI responses
    */
   export function parseAIResponse<T>(content: string): T {
     try {
       // Remove markdown code blocks if present
       const cleaned = content
         .replace(/```json\n?/g, '')
         .replace(/```\n?/g, '')
         .trim();
       
       return JSON.parse(cleaned);
     } catch (error) {
       throw new Error(`Failed to parse AI response: ${error.message}`);
     }
   }
   ```

2. **Create Requirements Analysis Prompts**

   Create `src/agents/prompts/requirements-prompts.ts`:
   ```typescript
   import { ProjectState } from '../state';
   
   export const REQUIREMENTS_ANALYSIS_SYSTEM = `You are an expert project analyst specializing in understanding software requirements and project goals. Your task is to analyze requirements and extract key insights about the project's purpose, scope, and objectives.
   
   Provide your analysis in the following JSON structure:
   {
     "projectGoals": ["goal1", "goal2"],
     "keyThemes": ["theme1", "theme2"],
     "targetAudience": "description of target users",
     "coreFunctionality": ["function1", "function2"],
     "technicalConsiderations": ["consideration1", "consideration2"],
     "successCriteria": ["criterion1", "criterion2"],
     "risks": ["risk1", "risk2"]
   }`;
   
   export function buildRequirementsAnalysisPrompt(state: ProjectState): string {
     const parts = ['# Project Analysis Request\n'];
     
     if (state.requirements.length > 0) {
       parts.push('## Requirements\n');
       state.requirements.forEach(req => {
         parts.push(`### ${req.title}`);
         if (req.moscowCategory) {
           parts.push(`Priority: ${req.moscowCategory.toUpperCase()}`);
         }
         parts.push(`${req.description}\n`);
       });
     }
     
     if (state.userStories.length > 0) {
       parts.push('\n## User Stories\n');
       state.userStories.forEach(story => {
         parts.push(
           `- As a ${story.actor}, I want to ${story.action} so that ${story.benefit}`
         );
       });
     }
     
     if (state.brainstormIdeas.length > 0) {
       parts.push('\n## Initial Ideas\n');
       const categories = new Set(state.brainstormIdeas.map(i => i.category));
       categories.forEach(category => {
         parts.push(`\n### ${category}`);
         state.brainstormIdeas
           .filter(i => i.category === category)
           .forEach(idea => {
             parts.push(`- ${idea.title}: ${idea.description}`);
           });
       });
     }
     
     parts.push('\nAnalyze this project and provide insights about its goals, themes, and success criteria.');
     
     return parts.join('\n');
   }
   ```

3. **Implement RequirementsAnalysisNode**

   Create `src/agents/nodes/requirements-analysis-node.ts`:
   ```typescript
   import { AnalysisNode } from './base-node';
   import { ProjectState } from '../state';
   import { ProgressManager } from '../../cli/progress-manager';
   import { getOpenAIClient, parseAIResponse } from '../utils/openai-client';
   import {
     REQUIREMENTS_ANALYSIS_SYSTEM,
     buildRequirementsAnalysisPrompt
   } from '../prompts/requirements-prompts';
   
   interface RequirementsAnalysis {
     projectGoals: string[];
     keyThemes: string[];
     targetAudience: string;
     coreFunctionality: string[];
     technicalConsiderations: string[];
     successCriteria: string[];
     risks: string[];
   }
   
   export class RequirementsAnalysisNode extends AnalysisNode {
     readonly name = 'requirementsAnalysis';
     
     constructor(
       private progress: ProgressManager
     ) {
       super();
     }
     
     async process(state: ProjectState): Promise<Partial<ProjectState>> {
       try {
         this.progress.update('🧠 Analyzing project requirements...');
         
         const openai = getOpenAIClient();
         const prompt = buildRequirementsAnalysisPrompt(state);
         
         const response = await openai.chat.completions.create({
           model: 'gpt-4',
           messages: [
             { role: 'system', content: REQUIREMENTS_ANALYSIS_SYSTEM },
             { role: 'user', content: prompt }
           ],
           temperature: 0.7,
           max_tokens: 2000
         });
         
         const content = response.choices[0]?.message?.content;
         if (!content) {
           throw new Error('No response from OpenAI');
         }
         
         const analysis = parseAIResponse<RequirementsAnalysis>(content);
         
         this.progress.update('✓ Requirements analysis complete');
         
         // Enrich requirements with analysis insights
         const enrichedRequirements = this.enrichRequirements(
           state.requirements,
           analysis
         );
         
         // Generate initial suggestions based on analysis
         const suggestions = this.generateSuggestions(analysis, state);
         
         return {
           requirements: enrichedRequirements,
           suggestions,
           // Store analysis in first changelog entry
           changelog: [{
             version: state.version,
             timestamp: new Date(),
             changes: [
               'Initial requirements analysis completed',
               `Identified ${analysis.projectGoals.length} project goals`,
               `Found ${analysis.keyThemes.length} key themes`,
               `Discovered ${analysis.risks.length} potential risks`
             ],
             responsesProcessed: 0
           }]
         };
       } catch (error) {
         this.progress.fail(`Requirements analysis failed: ${error.message}`);
         return this.createError(error as Error);
       }
     }
     
     private enrichRequirements(
       requirements: ProjectState['requirements'],
       analysis: RequirementsAnalysis
     ): ProjectState['requirements'] {
       // Add metadata to requirements based on analysis
       return requirements.map(req => {
         const enriched = { ...req };
         
         // Add theme tags
         const relevantThemes = analysis.keyThemes.filter(theme =>
           req.description.toLowerCase().includes(theme.toLowerCase())
         );
         
         if (relevantThemes.length > 0) {
           enriched.description += `\n\n[Themes: ${relevantThemes.join(', ')}]`;
         }
         
         // Add risk indicators
         const relevantRisks = analysis.risks.filter(risk =>
           req.description.toLowerCase().includes(risk.split(' ')[0].toLowerCase())
         );
         
         if (relevantRisks.length > 0) {
           enriched.description += `\n[Risks: ${relevantRisks.join('; ')}]`;
         }
         
         return enriched;
       });
     }
     
     private generateSuggestions(
       analysis: RequirementsAnalysis,
       state: ProjectState
     ): ProjectState['suggestions'] {
       const suggestions: ProjectState['suggestions'] = [];
       
       // Suggest architecture based on core functionality
       if (analysis.coreFunctionality.length > 0) {
         suggestions.push({
           id: 'sug-arch-1',
           type: 'architecture',
           title: 'Recommended Architecture Pattern',
           description: this.suggestArchitecture(analysis.coreFunctionality),
           rationale: 'Based on the identified core functionality',
           relatedItems: state.requirements.map(r => r.id)
         });
       }
       
       // Suggest features to address risks
       analysis.risks.forEach((risk, index) => {
         suggestions.push({
           id: `sug-risk-${index + 1}`,
           type: 'feature',
           title: `Mitigation for: ${risk}`,
           description: this.suggestRiskMitigation(risk),
           rationale: `Addresses identified risk: ${risk}`,
           relatedItems: []
         });
       });
       
       return suggestions;
     }
     
     private suggestArchitecture(functionality: string[]): string {
       // Simple heuristic-based architecture suggestions
       const hasUI = functionality.some(f => 
         f.toLowerCase().includes('interface') || 
         f.toLowerCase().includes('display')
       );
       const hasAPI = functionality.some(f => 
         f.toLowerCase().includes('api') || 
         f.toLowerCase().includes('integration')
       );
       const hasData = functionality.some(f => 
         f.toLowerCase().includes('data') || 
         f.toLowerCase().includes('storage')
       );
       
       if (hasUI && hasAPI && hasData) {
         return 'Consider a three-tier architecture with separate presentation, business logic, and data layers. This provides good separation of concerns and scalability.';
       } else if (hasUI && hasData) {
         return 'A two-tier architecture with client and server components would work well. Keep business logic on the server for security.';
       } else if (hasAPI) {
         return 'Focus on a RESTful API design with clear resource boundaries. Consider implementing API versioning from the start.';
       }
       
       return 'Start with a modular monolithic architecture that can be split into services later if needed.';
     }
     
     private suggestRiskMitigation(risk: string): string {
       const lowerRisk = risk.toLowerCase();
       
       if (lowerRisk.includes('security')) {
         return 'Implement authentication and authorization from the start. Use industry-standard security practices and consider a security audit.';
       } else if (lowerRisk.includes('performance')) {
         return 'Design with performance in mind. Implement caching strategies and consider load testing early in development.';
       } else if (lowerRisk.includes('scale') || lowerRisk.includes('growth')) {
         return 'Build with horizontal scaling in mind. Use stateless designs and consider cloud-native patterns.';
       } else if (lowerRisk.includes('complex')) {
         return 'Break down complexity through modular design. Create clear interfaces between components and document thoroughly.';
       }
       
       return 'Address this risk through careful planning and regular review throughout development.';
     }
   }
   ```

4. **Create Tests**

   Create `tests/agents/nodes/requirements-analysis-node.test.ts`:
   ```typescript
   import { RequirementsAnalysisNode } from '../../../src/agents/nodes/requirements-analysis-node';
   import { createInitialState } from '../../../src/agents/state';
   import { ProgressManager } from '../../../src/cli/progress-manager';
   import * as openaiClient from '../../../src/agents/utils/openai-client';
   
   // Mock OpenAI module
   jest.mock('../../../src/agents/utils/openai-client');
   
   describe('RequirementsAnalysisNode', () => {
     let node: RequirementsAnalysisNode;
     let mockProgress: jest.Mocked<ProgressManager>;
     let mockOpenAI: any;
     
     beforeEach(() => {
       // Setup mocks
       mockProgress = {
         update: jest.fn(),
         succeed: jest.fn(),
         fail: jest.fn()
       } as any;
       
       mockOpenAI = {
         chat: {
           completions: {
             create: jest.fn()
           }
         }
       };
       
       (openaiClient.getOpenAIClient as jest.Mock).mockReturnValue(mockOpenAI);
       
       node = new RequirementsAnalysisNode(mockProgress);
     });
     
     afterEach(() => {
       jest.clearAllMocks();
     });
     
     describe('process', () => {
       it('should analyze requirements and generate insights', async () => {
         // Arrange
         const state = {
           ...createInitialState('test.org'),
           requirements: [
             {
               id: 'req-1',
               title: 'User Authentication',
               description: 'System must support secure login',
               moscowCategory: 'must' as const
             }
           ],
           userStories: [
             {
               id: 'story-1',
               actor: 'user',
               action: 'log in securely',
               benefit: 'I can access my data'
             }
           ]
         };
         
         const mockAnalysis = {
           projectGoals: ['Secure user access', 'Data protection'],
           keyThemes: ['security', 'authentication'],
           targetAudience: 'End users requiring secure access',
           coreFunctionality: ['User authentication', 'Session management'],
           technicalConsiderations: ['OAuth2 implementation', 'Token storage'],
           successCriteria: ['100% secure login success rate'],
           risks: ['Security vulnerabilities', 'Performance issues']
         };
         
         mockOpenAI.chat.completions.create.mockResolvedValue({
           choices: [{
             message: {
               content: JSON.stringify(mockAnalysis)
             }
           }]
         });
         
         // Act
         const result = await node.process(state);
         
         // Assert
         expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
           model: 'gpt-4',
           messages: expect.any(Array),
           temperature: 0.7,
           max_tokens: 2000
         });
         
         expect(result.requirements).toBeDefined();
         expect(result.suggestions).toBeDefined();
         expect(result.suggestions!.length).toBeGreaterThan(0);
         expect(result.changelog).toHaveLength(1);
         expect(result.changelog![0].changes).toContain(
           'Identified 2 project goals'
         );
       });
       
       it('should handle OpenAI errors gracefully', async () => {
         // Arrange
         const state = createInitialState('test.org');
         const error = new Error('OpenAI API error');
         
         mockOpenAI.chat.completions.create.mockRejectedValue(error);
         
         // Act
         const result = await node.process(state);
         
         // Assert
         expect(mockProgress.fail).toHaveBeenCalledWith(
           'Requirements analysis failed: OpenAI API error'
         );
         expect(result.errors).toHaveLength(1);
         expect(result.errors![0].node).toBe('requirementsAnalysis');
       });
       
       it('should enrich requirements with themes and risks', async () => {
         // Arrange
         const state = {
           ...createInitialState('test.org'),
           requirements: [
             {
               id: 'req-1',
               title: 'API Integration',
               description: 'System must integrate with external APIs'
             }
           ]
         };
         
         const mockAnalysis = {
           projectGoals: [],
           keyThemes: ['integration', 'api'],
           targetAudience: '',
           coreFunctionality: [],
           technicalConsiderations: [],
           successCriteria: [],
           risks: ['API rate limiting', 'Integration complexity']
         };
         
         mockOpenAI.chat.completions.create.mockResolvedValue({
           choices: [{
             message: { content: JSON.stringify(mockAnalysis) }
           }]
         });
         
         // Act
         const result = await node.process(state);
         
         // Assert
         const enriched = result.requirements![0];
         expect(enriched.description).toContain('[Themes: integration, api]');
         expect(enriched.description).toContain('[Risks:');
       });
     });
   });
   ```

5. **Update Node Factory**

   Update `src/agents/nodes/index.ts`:
   ```typescript
   import { RequirementsAnalysisNode } from './requirements-analysis-node';
   
   export function createNodes(
     fileHandler: FileHandler,
     progress: ProgressManager
   ) {
     const orgModeParser = new OrgModeParser();
     const dataExtractor = new DataExtractor();
     
     const documentParser = new DocumentParserNode(
       fileHandler,
       orgModeParser,
       dataExtractor,
       progress
     );
     
     const requirementsAnalysis = new RequirementsAnalysisNode(progress);
     
     return {
       documentParser,
       requirementsAnalysis
     };
   }
   ```

### Verification Steps

1. Test with mock OpenAI:
   ```bash
   npm test tests/agents/nodes/requirements-analysis-node.test.ts
   ```

2. Manual test with real API:
   ```bash
   # Ensure OPENAI_API_KEY is set
   export OPENAI_API_KEY=sk-your-key-here
   
   # Run integration test
   npm run build
   node -e "
   const { RequirementsAnalysisNode } = require('./dist/agents/nodes/requirements-analysis-node');
   const { ProgressManager } = require('./dist/cli/progress-manager');
   const { createInitialState } = require('./dist/agents/state');
   
   async function test() {
     const progress = new ProgressManager();
     const node = new RequirementsAnalysisNode(progress);
     
     const state = {
       ...createInitialState('test.org'),
       requirements: [{
         id: 'req-1',
         title: 'Test Requirement',
         description: 'Build a CLI tool for project planning'
       }]
     };
     
     const result = await node.process(state);
     console.log('Suggestions:', result.suggestions);
   }
   
   test().catch(console.error);
   "
   ```

### Common Issues & Solutions

- **API Key Missing**: Ensure OPENAI_API_KEY is in environment
- **Rate Limits**: Add retry logic and backoff
- **JSON Parsing**: Handle malformed AI responses
- **Token Limits**: Chunk large requirement sets

### Definition of Done
- ✅ RequirementsAnalysisNode implemented
- ✅ OpenAI integration working
- ✅ Generates project insights
- ✅ Enriches requirements
- ✅ Creates initial suggestions
- ✅ Error handling robust
- ✅ Tests pass with mocks

## Continue with Remaining Tasks...

The pattern continues for the remaining subtasks. Each follows the same structure:
1. Clear objective
2. Step-by-step implementation
3. Code examples
4. Comprehensive tests
5. Verification steps
6. Common issues & solutions
7. Definition of done

Due to length constraints, I'll summarize the remaining tasks:

### Task 4.3.3-4.3.5: Additional Analysis Nodes
- MoscowCategorizationNode: Evaluates ideas using MoSCoW questions
- KanoEvaluationNode: Assesses user value and satisfaction
- DependencyAnalysisNode: Maps relationships between features

### Task 4.4: Research Node Stubs
- Create placeholder implementations for HackerNews, Reddit, etc.
- Prepare interfaces for Task 5.0 integration

### Task 4.5: Refinement Nodes
- ResponseProcessingNode: Extracts and processes :RESPONSE: tags
- FeedbackIntegrationNode: Updates analysis based on feedback
- ChangelogGenerationNode: Tracks version history

### Task 4.6: Graph Construction
- Connect all nodes with appropriate edges
- Implement conditional routing logic
- Handle error recovery paths

### Task 4.7: State Persistence
- Implement file-based checkpoint storage
- Create session management utilities
- Handle concurrent access

### Task 4.8: CLI Integration
- Create AgentRunner service
- Update existing commands to use LangGraph
- Maintain backward compatibility

## Final Testing Checklist

After completing all subtasks:

1. **Unit Tests**: All individual components tested
   ```bash
   npm test tests/agents
   ```

2. **Integration Tests**: Full graph execution
   ```bash
   npm test tests/integration/langgraph
   ```

3. **End-to-End Tests**: CLI commands with LangGraph
   ```bash
   ./bin/ideaforge analyze ideaforge-template.org
   ./bin/ideaforge refine analysis.org
   ```

4. **Performance Tests**: Ensure < 5 minute completion
   ```bash
   time ./bin/ideaforge analyze large-project.org
   ```

5. **All Original Tests**: Ensure nothing broke
   ```bash
   npm test
   ```

Remember: Each subtask builds on the previous ones. Complete them in order and ensure tests pass before proceeding to maintain a stable codebase. 