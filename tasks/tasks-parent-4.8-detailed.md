# Parent Task 4.8: Create LangGraph-CLI Communication Layer - Detailed Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing the AgentRunner service that bridges the CLI commands with the LangGraph agent architecture. Follow each subtask in order, running tests continuously to ensure quality.

## Files Created/Modified

### Task 4.8.1 (Completed):
- Created: `src/types/agent-runner.types.ts` - Type definitions for AgentRunner
- Created: `src/services/agent-runner.ts` - Main AgentRunner service class  
- Created: `tests/services/agent-runner.test.ts` - Comprehensive unit tests

## Environment Verification

Before starting:
1. Ensure Tasks 4.1-4.7 are complete ✅
2. All tests passing (should be 270+ tests)
3. LangGraph dependencies installed
4. TypeScript building successfully

## Task 4.8.1: Create AgentRunner Service Class

### Objective
Create the foundational AgentRunner service that will orchestrate LangGraph execution from CLI commands.

### Implementation Steps

1. **Create the types file**

   Create `src/types/agent-runner.types.ts`:
   ```typescript
   import { 
     ProcessedRequirement, 
     ProcessedUserStory, 
     CategorizedIdea,
     QuestionAnswer 
   } from '../models/document-types';
   import { 
     MoscowAnalysis, 
     KanoAnalysis, 
     Suggestion, 
     Alternative 
   } from '../agents/types';
   
   // Options for analysis
   export interface AnalyzeOptions {
     outputPath?: string;
     modelName?: string;
     forceNewSession?: boolean;
   }
   
   // Options for refinement
   export interface RefineOptions {
     outputPath?: string;
     modelName?: string;
     continueSession?: boolean;
   }
   
   // Progress event structure
   export interface ProgressEvent {
     node: string;
     message: string;
     timestamp: Date;
     level: 'info' | 'warning' | 'error';
   }
   
   // Result structure matching CLI expectations
   export interface AnalysisResult {
     // Core data (matches existing format)
     requirements: ProcessedRequirement[];
     userStories: ProcessedUserStory[];
     brainstormIdeas: CategorizedIdea[];
     questionsAnswers: QuestionAnswer[];
     
     // Enhanced with LangGraph analysis
     moscowAnalysis: MoscowAnalysis;
     kanoAnalysis: KanoAnalysis;
     dependencies: Array<{
       from: string;
       to: string;
       type: string;
       reason: string;
     }>;
     suggestions: Suggestion[];
     alternativeIdeas: Alternative[];
     researchSynthesis?: string;
     
     // Metadata
     sessionId: string;
     executionTime: number;
     nodesExecuted: string[];
     
     // For org-mode export compatibility
     metadata?: {
       title?: string;
       author?: string;
       date?: string;
     };
   }
   
   // Result for refinement operations
   export interface RefinementResult extends AnalysisResult {
     changelog: Array<{
       version: string;
       timestamp: Date;
       changes: string[];
       responsesProcessed: number;
     }>;
     refinementIteration: number;
     changesApplied: string[];
   }
   ```

2. **Create the AgentRunner class**

   Create `src/services/agent-runner.ts`:
   ```typescript
   import { EventEmitter } from 'events';
   import { buildIdeaForgeGraph } from '../agents/graph';
   import { SessionManager } from '../agents/persistence';
   import { FileHandler } from './file-handler';
   import { ProjectState } from '../agents/state';
   import { ProgressManager } from '../cli/progress-manager';
   import {
     AnalyzeOptions,
     RefineOptions,
     AnalysisResult,
     RefinementResult,
     ProgressEvent
   } from '../types/agent-runner.types';
   
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
     private sessionManager: SessionManager;
     private fileHandler: FileHandler;
     private interrupted: boolean = false;
     private isExecuting: boolean = false;
     
     constructor(fileHandler: FileHandler, statePath?: string) {
       super();
       this.fileHandler = fileHandler;
       this.sessionManager = new SessionManager(statePath);
       
       // Set up interruption handling
       this.setupInterruptHandler();
     }
     
     /**
      * Analyze an org-mode document using LangGraph
      */
     async analyze(documentPath: string, options: AnalyzeOptions = {}): Promise<AnalysisResult> {
       // Implementation in next task
       throw new Error('Not implemented');
     }
     
     /**
      * Refine an analysis with user responses
      */
     async refine(documentPath: string, options: RefineOptions = {}): Promise<RefinementResult> {
       // Implementation in task 4.8.3
       throw new Error('Not implemented');
     }
     
     /**
      * Get session information for a document
      */
     async getSession(documentPath: string): Promise<any> {
       return this.sessionManager.getOrCreateSession(documentPath);
     }
     
     /**
      * Clear session for a document
      */
     async clearSession(documentPath: string): Promise<void> {
       const session = await this.sessionManager.getOrCreateSession(documentPath);
       await this.sessionManager.clearSession(session.threadId);
     }
     
     /**
      * Interrupt the current execution
      */
     interrupt(): void {
       this.interrupted = true;
       this.emit('interrupted');
     }
     
     /**
      * Emit a progress event
      */
     private emitProgress(node: string, message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
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
     
     /**
      * Set up interrupt handlers
      */
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
       
       // Handle both SIGINT (Ctrl+C) and SIGTERM
       process.once('SIGINT', cleanup);
       process.once('SIGTERM', cleanup);
     }
   }
   ```

3. **Create unit tests**

   Create `tests/services/agent-runner.test.ts`:
   ```typescript
   import { AgentRunner } from '../../src/services/agent-runner';
   import { FileHandler } from '../../src/services/file-handler';
   import { SessionManager } from '../../src/agents/persistence';
   import { EventEmitter } from 'events';
   
   // Mock dependencies
   jest.mock('../../src/services/file-handler');
   jest.mock('../../src/agents/persistence');
   jest.mock('../../src/agents/graph');
   
   describe('AgentRunner', () => {
     let agentRunner: AgentRunner;
     let mockFileHandler: jest.Mocked<FileHandler>;
     let mockSessionManager: jest.Mocked<SessionManager>;
     
     beforeEach(() => {
       // Clear all mocks
       jest.clearAllMocks();
       
       // Create mock instances
       mockFileHandler = new FileHandler() as jest.Mocked<FileHandler>;
       agentRunner = new AgentRunner(mockFileHandler);
       
       // Get the mocked SessionManager instance
       mockSessionManager = (SessionManager as jest.MockedClass<typeof SessionManager>).mock.instances[0] as jest.Mocked<SessionManager>;
     });
     
     describe('constructor', () => {
       it('should initialize with FileHandler', () => {
         expect(agentRunner).toBeInstanceOf(EventEmitter);
         expect(SessionManager).toHaveBeenCalledWith(undefined);
       });
       
       it('should accept custom state path', () => {
         const customPath = '/custom/state/path';
         const runner = new AgentRunner(mockFileHandler, customPath);
         expect(SessionManager).toHaveBeenCalledWith(customPath);
       });
     });
     
     describe('getSession', () => {
       it('should retrieve session information', async () => {
         const mockSession = { threadId: 'test-thread', filePath: 'test.org' };
         mockSessionManager.getOrCreateSession.mockResolvedValue(mockSession);
         
         const session = await agentRunner.getSession('test.org');
         
         expect(mockSessionManager.getOrCreateSession).toHaveBeenCalledWith('test.org');
         expect(session).toEqual(mockSession);
       });
     });
     
     describe('clearSession', () => {
       it('should clear session for document', async () => {
         const mockSession = { threadId: 'test-thread', filePath: 'test.org' };
         mockSessionManager.getOrCreateSession.mockResolvedValue(mockSession);
         mockSessionManager.clearSession.mockResolvedValue(undefined);
         
         await agentRunner.clearSession('test.org');
         
         expect(mockSessionManager.getOrCreateSession).toHaveBeenCalledWith('test.org');
         expect(mockSessionManager.clearSession).toHaveBeenCalledWith('test-thread');
       });
     });
     
     describe('interrupt', () => {
       it('should emit interrupted event', (done) => {
         agentRunner.on('interrupted', () => {
           done();
         });
         
         agentRunner.interrupt();
       });
     });
     
     describe('progress events', () => {
       it('should be an EventEmitter', () => {
         expect(agentRunner.on).toBeDefined();
         expect(agentRunner.emit).toBeDefined();
         expect(agentRunner.removeListener).toBeDefined();
       });
     });
   });
   ```

### Verification Steps

1. Run the tests:
   ```bash
   npm test tests/services/agent-runner.test.ts
   ```

2. Verify TypeScript compilation:
   ```bash
   npm run build
   ```

3. Check that all tests still pass:
   ```bash
   npm test
   ```

### Common Issues & Solutions

- **EventEmitter TypeScript errors**: Import from 'events' not 'stream'
- **Mock setup issues**: Ensure mocks are cleared between tests
- **Signal handler conflicts**: Use `process.once` instead of `process.on`

### Definition of Done
- ✅ AgentRunner class created with EventEmitter
- ✅ Dependencies properly injected
- ✅ Session management methods work
- ✅ Interrupt handling set up
- ✅ All tests pass

## Task 4.8.2: Implement Analyze Method

### Objective
Implement the core analyze method that executes the LangGraph and returns formatted results.

### Implementation Steps

1. **Update AgentRunner with analyze implementation**

   Update `src/services/agent-runner.ts`, replace the analyze method:
   ```typescript
   /**
    * Analyze an org-mode document using LangGraph
    */
   async analyze(documentPath: string, options: AnalyzeOptions = {}): Promise<AnalysisResult> {
     const startTime = Date.now();
     this.interrupted = false;
     this.isExecuting = true;
     
     try {
       // Emit start event
       this.emitProgress('start', `Starting analysis of ${documentPath}...`);
       
       // Load document
       this.emitProgress('documentParser', 'Loading document...');
       const documentData = await this.fileHandler.readOrgFile(documentPath);
       
       // Get or create session
       this.emitProgress('session', 'Initializing session...');
       const session = await this.sessionManager.getOrCreateSession(
         documentPath,
         { forceNew: options.forceNewSession }
       );
       
       // Build graph with checkpointer
       this.emitProgress('graph', 'Building analysis graph...');
       const checkpointer = this.sessionManager.getCheckpointer();
       const progressAdapter = this.createProgressAdapter();
       
       const graph = buildIdeaForgeGraph(
         progressAdapter,
         checkpointer,
         options.modelName
       );
       
       // Create initial state
       const initialState: Partial<ProjectState> = {
         filePath: documentPath,
         fileContent: documentData.raw || '',
         refinementIteration: 0,
         currentNode: 'documentParser',
         errors: [],
         messages: []
       };
       
       // Execute graph with progress tracking
       const config = {
         configurable: { 
           thread_id: session.threadId 
         },
         callbacks: [
           {
             onChainStart: (run: any) => {
               if (this.interrupted) {
                 throw new Error('Analysis interrupted');
               }
             },
             onChainEnd: (run: any) => {
               // Track completion
             }
           }
         ]
       };
       
       this.emitProgress('execution', 'Running analysis...');
       const stream = await graph.stream(initialState, config);
       
       let finalState: ProjectState | null = null;
       const nodesExecuted: string[] = [];
       
       // Process stream updates
       for await (const update of stream) {
         if (this.interrupted) {
           throw new Error('Analysis interrupted by user');
         }
         
         // Track node execution
         const nodeName = Object.keys(update)[0];
         if (nodeName) {
           nodesExecuted.push(nodeName);
           this.emitProgress(nodeName, `Processing ${this.getNodeDisplayName(nodeName)}...`);
         }
         
         // Update state
         if (update.__end__) {
           finalState = update.__end__ as ProjectState;
         }
       }
       
       if (!finalState) {
         throw new Error('Analysis failed to produce final state');
       }
       
       // Save final state
       await this.sessionManager.saveState();
       
       // Transform to result format
       const result = this.transformToAnalysisResult(finalState, {
         sessionId: session.threadId,
         executionTime: Date.now() - startTime,
         nodesExecuted,
         metadata: documentData.metadata
       });
       
       this.emitProgress('complete', 'Analysis complete!');
       return result;
       
     } catch (error) {
       this.isExecuting = false;
       
       if (this.interrupted) {
         this.emitProgress('error', 'Analysis interrupted by user', 'warning');
         throw new Error('Analysis interrupted');
       }
       
       this.emitProgress('error', `Analysis failed: ${error.message}`, 'error');
       throw error;
       
     } finally {
       this.isExecuting = false;
     }
   }
   
   /**
    * Create progress adapter for nodes
    */
   private createProgressAdapter(): ProgressManager {
     return {
       start: (msg: string) => this.emitProgress('current', msg),
       update: (msg: string) => this.emitProgress('current', msg),
       succeed: (msg: string) => this.emitProgress('current', `✓ ${msg}`),
       fail: (msg: string) => this.emitProgress('current', `✗ ${msg}`, 'error'),
       warn: (msg: string) => this.emitProgress('current', `⚠ ${msg}`, 'warning'),
       info: (msg: string) => this.emitProgress('current', msg),
       stop: () => {},
       isSpinning: () => false
     } as ProgressManager;
   }
   
   /**
    * Get display name for a node
    */
   private getNodeDisplayName(node: string): string {
     const displayNames: Record<string, string> = {
       documentParser: 'document parsing',
       requirementsAnalysis: 'requirements analysis',
       moscowCategorization: 'MoSCoW categorization',
       kanoEvaluation: 'Kano evaluation',
       dependencyAnalysis: 'dependency analysis',
       technologyExtraction: 'technology extraction',
       hackerNewsSearch: 'Hacker News search',
       redditSearch: 'Reddit search',
       additionalResearch: 'additional research',
       researchSynthesis: 'research synthesis',
       responseProcessing: 'response processing',
       feedbackIntegration: 'feedback integration',
       changelogGeneration: 'changelog generation'
     };
     
     return displayNames[node] || node;
   }
   
   /**
    * Transform LangGraph state to CLI result format
    */
   private transformToAnalysisResult(
     state: ProjectState,
     metadata: {
       sessionId: string;
       executionTime: number;
       nodesExecuted: string[];
       metadata?: any;
     }
   ): AnalysisResult {
     return {
       // Core data
       requirements: state.requirements || [],
       userStories: state.userStories || [],
       brainstormIdeas: state.brainstormIdeas || [],
       questionsAnswers: state.questionsAnswers || [],
       
       // Analysis results
       moscowAnalysis: state.moscowAnalysis || {
         must: [],
         should: [],
         could: [],
         wont: []
       },
       kanoAnalysis: state.kanoAnalysis || {
         basic: [],
         performance: [],
         excitement: []
       },
       dependencies: state.dependencies || [],
       suggestions: state.projectSuggestions || [],
       alternativeIdeas: state.alternativeIdeas || [],
       researchSynthesis: state.researchSynthesis,
       
       // Metadata
       sessionId: metadata.sessionId,
       executionTime: metadata.executionTime,
       nodesExecuted: metadata.nodesExecuted,
       metadata: metadata.metadata
     };
   }
   ```

2. **Update tests for analyze method**

   Add to `tests/services/agent-runner.test.ts`:
   ```typescript
   import { buildIdeaForgeGraph } from '../../src/agents/graph';
   
   describe('analyze', () => {
     let mockGraph: any;
     let mockStream: any;
     
     beforeEach(() => {
       // Mock graph builder
       mockGraph = {
         stream: jest.fn()
       };
       
       mockStream = {
         [Symbol.asyncIterator]: jest.fn()
       };
       
       (buildIdeaForgeGraph as jest.Mock).mockReturnValue(mockGraph);
       mockGraph.stream.mockResolvedValue(mockStream);
     });
     
     it('should execute full analysis successfully', async () => {
       // Arrange
       const testPath = 'test.org';
       const mockDocument = {
         raw: '* Test Document',
         metadata: { title: 'Test' },
         requirements: [],
         userStories: [],
         brainstormIdeas: []
       };
       
       mockFileHandler.readOrgFile.mockResolvedValue(mockDocument);
       mockSessionManager.getOrCreateSession.mockResolvedValue({
         threadId: 'test-thread',
         filePath: testPath
       });
       mockSessionManager.getCheckpointer.mockReturnValue({});
       
       // Mock stream iterator
       const updates = [
         { documentParser: { fileContent: '* Test' } },
         { requirementsAnalysis: { requirements: [] } },
         { __end__: { 
           requirements: [],
           userStories: [],
           brainstormIdeas: [],
           questionsAnswers: [],
           moscowAnalysis: { must: [], should: [], could: [], wont: [] },
           kanoAnalysis: { basic: [], performance: [], excitement: [] },
           dependencies: [],
           projectSuggestions: [],
           alternativeIdeas: []
         }}
       ];
       
       let index = 0;
       mockStream[Symbol.asyncIterator].mockImplementation(() => ({
         async next() {
           if (index < updates.length) {
             return { value: updates[index++], done: false };
           }
           return { done: true };
         }
       }));
       
       // Act
       const result = await agentRunner.analyze(testPath);
       
       // Assert
       expect(mockFileHandler.readOrgFile).toHaveBeenCalledWith(testPath);
       expect(mockSessionManager.getOrCreateSession).toHaveBeenCalledWith(
         testPath,
         { forceNew: undefined }
       );
       expect(buildIdeaForgeGraph).toHaveBeenCalled();
       expect(result).toHaveProperty('sessionId', 'test-thread');
       expect(result).toHaveProperty('requirements');
       expect(result).toHaveProperty('nodesExecuted');
       expect(result.nodesExecuted).toContain('documentParser');
     });
     
     it('should handle interruption gracefully', async () => {
       // Arrange
       mockFileHandler.readOrgFile.mockResolvedValue({ raw: 'test' });
       mockSessionManager.getOrCreateSession.mockResolvedValue({
         threadId: 'test-thread',
         filePath: 'test.org'
       });
       
       // Mock stream that checks interruption
       mockStream[Symbol.asyncIterator].mockImplementation(() => ({
         async next() {
           // Simulate interruption
           agentRunner.interrupt();
           return { value: { documentParser: {} }, done: false };
         }
       }));
       
       // Act & Assert
       await expect(agentRunner.analyze('test.org'))
         .rejects.toThrow('Analysis interrupted');
     });
     
     it('should emit progress events', async () => {
       // Arrange
       mockFileHandler.readOrgFile.mockResolvedValue({ raw: 'test' });
       mockSessionManager.getOrCreateSession.mockResolvedValue({
         threadId: 'test-thread'
       });
       
       const progressEvents: any[] = [];
       agentRunner.on('progress', (event) => {
         progressEvents.push(event);
       });
       
       mockStream[Symbol.asyncIterator].mockImplementation(() => ({
         async next() {
           return { done: true };
         }
       }));
       
       // Act
       try {
         await agentRunner.analyze('test.org');
       } catch {
         // Expected to fail without proper state
       }
       
       // Assert
       expect(progressEvents.length).toBeGreaterThan(0);
       expect(progressEvents[0]).toHaveProperty('message');
       expect(progressEvents[0]).toHaveProperty('timestamp');
     });
   });
   ```

### Verification Steps

1. Run the new tests:
   ```bash
   npm test tests/services/agent-runner.test.ts
   ```

2. Build to check TypeScript:
   ```bash
   npm run build
   ```

3. Manual test with a real file:
   ```bash
   node -e "
   const { AgentRunner } = require('./dist/services/agent-runner');
   const { FileHandler } = require('./dist/services/file-handler');
   
   async function test() {
     const runner = new AgentRunner(new FileHandler());
     runner.on('progress', (e) => console.log(e.message));
     
     try {
       const result = await runner.analyze('ideaforge-template.org');
       console.log('Success!', Object.keys(result));
     } catch (error) {
       console.error('Error:', error.message);
     }
   }
   test();
   "
   ```

### Definition of Done
- ✅ Analyze method executes full graph
- ✅ Progress events emitted for each node
- ✅ Results properly formatted
- ✅ Interruption handled gracefully
- ✅ State saved to session
- ✅ All tests pass

## Task 4.8.3: Implement Refine Method

### Objective
Implement the refine method that processes :RESPONSE: tags using existing analysis state.

### Implementation Steps

1. **Add refine method implementation**

   Update the refine method in `src/services/agent-runner.ts`:
   ```typescript
   /**
    * Refine an analysis with user responses
    */
   async refine(documentPath: string, options: RefineOptions = {}): Promise<RefinementResult> {
     const startTime = Date.now();
     this.interrupted = false;
     this.isExecuting = true;
     
     try {
       // Emit start event
       this.emitProgress('start', `Starting refinement of ${documentPath}...`);
       
       // Load document with responses
       this.emitProgress('documentParser', 'Loading document with responses...');
       const documentData = await this.fileHandler.readOrgFile(documentPath);
       
       // Get existing session (required for refinement)
       this.emitProgress('session', 'Loading previous analysis session...');
       const session = await this.sessionManager.getOrCreateSession(
         documentPath,
         { forceNew: false }
       );
       
       // Verify session has previous analysis
       const checkpointer = this.sessionManager.getCheckpointer();
       const checkpoint = await checkpointer.get({ configurable: { thread_id: session.threadId } });
       
       if (!checkpoint) {
         throw new Error(
           'No previous analysis found for this document. ' +
           'Please run "ideaforge analyze" first.'
         );
       }
       
       // Build graph
       this.emitProgress('graph', 'Building refinement graph...');
       const progressAdapter = this.createProgressAdapter();
       const graph = buildIdeaForgeGraph(
         progressAdapter,
         checkpointer,
         options.modelName
       );
       
       // Get previous state
       const previousState = checkpoint.channel_values as ProjectState;
       
       // Update state with new content
       const updatedState: Partial<ProjectState> = {
         ...previousState,
         fileContent: documentData.raw || '',
         refinementIteration: (previousState.refinementIteration || 0) + 1,
         currentNode: 'responseProcessing' // Start from response processing
       };
       
       // Execute from response processing node
       const config = {
         configurable: { 
           thread_id: session.threadId,
           checkpoint_id: checkpoint.id
         }
       };
       
       this.emitProgress('execution', 'Processing responses and refining analysis...');
       const stream = await graph.stream(updatedState, config);
       
       let finalState: ProjectState | null = null;
       const nodesExecuted: string[] = [];
       
       // Process stream updates
       for await (const update of stream) {
         if (this.interrupted) {
           throw new Error('Refinement interrupted by user');
         }
         
         // Track node execution
         const nodeName = Object.keys(update)[0];
         if (nodeName) {
           nodesExecuted.push(nodeName);
           this.emitProgress(nodeName, `Processing ${this.getNodeDisplayName(nodeName)}...`);
         }
         
         // Update state
         if (update.__end__) {
           finalState = update.__end__ as ProjectState;
         }
       }
       
       if (!finalState) {
         throw new Error('Refinement failed to produce final state');
       }
       
       // Save updated state
       await this.sessionManager.saveState();
       
       // Transform to refinement result
       const analysisResult = this.transformToAnalysisResult(finalState, {
         sessionId: session.threadId,
         executionTime: Date.now() - startTime,
         nodesExecuted,
         metadata: documentData.metadata
       });
       
       // Add refinement-specific data
       const refinementResult: RefinementResult = {
         ...analysisResult,
         changelog: finalState.changelog || [],
         refinementIteration: finalState.refinementIteration || 1,
         changesApplied: this.extractChangesApplied(finalState)
       };
       
       this.emitProgress('complete', `Refinement complete! Iteration ${refinementResult.refinementIteration}`);
       return refinementResult;
       
     } catch (error) {
       this.isExecuting = false;
       
       if (this.interrupted) {
         this.emitProgress('error', 'Refinement interrupted by user', 'warning');
         throw new Error('Refinement interrupted');
       }
       
       this.emitProgress('error', `Refinement failed: ${error.message}`, 'error');
       throw error;
       
     } finally {
       this.isExecuting = false;
     }
   }
   
   /**
    * Extract list of changes applied during refinement
    */
   private extractChangesApplied(state: ProjectState): string[] {
     const changes: string[] = [];
     
     // Get latest changelog entry
     if (state.changelog && state.changelog.length > 0) {
       const latestEntry = state.changelog[state.changelog.length - 1];
       changes.push(...latestEntry.changes);
     }
     
     // Add response processing summary
     if (state.userResponses && state.userResponses.length > 0) {
       changes.push(`Processed ${state.userResponses.length} user responses`);
     }
     
     return changes;
   }
   ```

2. **Add tests for refine method**

   Add to `tests/services/agent-runner.test.ts`:
   ```typescript
   describe('refine', () => {
     it('should process refinement with existing session', async () => {
       // Arrange
       const testPath = 'test.org';
       const mockDocument = {
         raw: '* Test Document\n** Section\n:RESPONSE:\nUser feedback here\n:END:',
         metadata: { title: 'Test' }
       };
       
       const previousState: ProjectState = {
         filePath: testPath,
         fileContent: '* Test Document',
         requirements: [{ id: 'REQ-1', description: 'Test requirement' }],
         refinementIteration: 0,
         changelog: []
       } as any;
       
       const mockCheckpoint = {
         id: 'checkpoint-1',
         channel_values: previousState
       };
       
       mockFileHandler.readOrgFile.mockResolvedValue(mockDocument);
       mockSessionManager.getOrCreateSession.mockResolvedValue({
         threadId: 'test-thread',
         filePath: testPath
       });
       
       const mockCheckpointer = {
         get: jest.fn().mockResolvedValue(mockCheckpoint),
         put: jest.fn()
       };
       mockSessionManager.getCheckpointer.mockReturnValue(mockCheckpointer);
       
       // Mock stream with refinement flow
       const updates = [
         { responseProcessing: { userResponses: [{ content: 'feedback' }] } },
         { feedbackIntegration: {} },
         { changelogGeneration: {} },
         { __end__: {
           ...previousState,
           refinementIteration: 1,
           changelog: [{
             version: 'v2',
             timestamp: new Date(),
             changes: ['Integrated user feedback'],
             responsesProcessed: 1
           }],
           userResponses: [{ content: 'feedback', section: 'Section' }]
         }}
       ];
       
       mockStream[Symbol.asyncIterator].mockImplementation(() => {
         let index = 0;
         return {
           async next() {
             if (index < updates.length) {
               return { value: updates[index++], done: false };
             }
             return { done: true };
           }
         };
       });
       
       // Act
       const result = await agentRunner.refine(testPath);
       
       // Assert
       expect(mockFileHandler.readOrgFile).toHaveBeenCalledWith(testPath);
       expect(mockCheckpointer.get).toHaveBeenCalled();
       expect(result).toHaveProperty('refinementIteration', 1);
       expect(result).toHaveProperty('changelog');
       expect(result.changelog).toHaveLength(1);
       expect(result.changesApplied).toContain('Processed 1 user responses');
     });
     
     it('should error if no previous analysis exists', async () => {
       // Arrange
       mockFileHandler.readOrgFile.mockResolvedValue({ raw: 'test' });
       mockSessionManager.getOrCreateSession.mockResolvedValue({
         threadId: 'test-thread'
       });
       
       const mockCheckpointer = {
         get: jest.fn().mockResolvedValue(null)
       };
       mockSessionManager.getCheckpointer.mockReturnValue(mockCheckpointer);
       
       // Act & Assert
       await expect(agentRunner.refine('test.org'))
         .rejects.toThrow('No previous analysis found');
     });
   });
   ```

### Definition of Done
- ✅ Refine method loads previous state
- ✅ Executes from ResponseProcessingNode
- ✅ Generates changelog
- ✅ Increments refinement iteration
- ✅ Error if no previous analysis
- ✅ All tests pass

## Task 4.8.4: Add Progress Event Streaming

### Objective
Enhance progress reporting with structured events and better integration with CLI.

### Implementation Steps

1. **Create progress event handler utilities**

   Add to `src/services/agent-runner.ts`:
   ```typescript
   /**
    * Progress event handler with buffering and formatting
    */
   private progressBuffer: ProgressEvent[] = [];
   private progressFlushInterval?: NodeJS.Timeout;
   
   /**
    * Start progress event buffering
    */
   private startProgressBuffer(): void {
     this.progressFlushInterval = setInterval(() => {
       this.flushProgressBuffer();
     }, 100); // Flush every 100ms
   }
   
   /**
    * Stop progress event buffering
    */
   private stopProgressBuffer(): void {
     if (this.progressFlushInterval) {
       clearInterval(this.progressFlushInterval);
       this.progressFlushInterval = undefined;
     }
     this.flushProgressBuffer();
   }
   
   /**
    * Flush buffered progress events
    */
   private flushProgressBuffer(): void {
     if (this.progressBuffer.length === 0) return;
     
     // Emit all buffered events
     const events = [...this.progressBuffer];
     this.progressBuffer = [];
     
     events.forEach(event => {
       super.emit('progress', event);
     });
   }
   
   /**
    * Enhanced progress emission with buffering
    */
   private emitProgress(node: string, message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
     const event: ProgressEvent = {
       node,
       message,
       timestamp: new Date(),
       level
     };
     
     // Add to buffer
     this.progressBuffer.push(event);
     
     // Immediate emit for errors
     if (level === 'error') {
       this.flushProgressBuffer();
     }
     
     // Debug logging
     if (process.env.DEBUG) {
       const prefix = level === 'error' ? '❌' : level === 'warning' ? '⚠️' : '📍';
       console.log(`${prefix} [${node}] ${message}`);
     }
   }
   ```

2. **Update analyze and refine to use buffering**

   Update both methods to start/stop buffering:
   ```typescript
   async analyze(documentPath: string, options: AnalyzeOptions = {}): Promise<AnalysisResult> {
     const startTime = Date.now();
     this.interrupted = false;
     this.isExecuting = true;
     
     // Start progress buffering
     this.startProgressBuffer();
     
     try {
       // ... existing implementation ...
     } finally {
       this.isExecuting = false;
       this.stopProgressBuffer();
     }
   }
   ```

3. **Add progress aggregation for better UX**

   Add progress summarization:
   ```typescript
   /**
    * Create aggregated progress message
    */
   private createProgressSummary(nodesCompleted: string[], totalNodes: number): string {
     const percentage = Math.round((nodesCompleted.length / totalNodes) * 100);
     return `Progress: ${percentage}% (${nodesCompleted.length}/${totalNodes} steps completed)`;
   }
   
   /**
    * Emit aggregated progress
    */
   private emitAggregatedProgress(nodesExecuted: string[]): void {
     const totalNodes = 13; // Total possible nodes
     const summary = this.createProgressSummary(nodesExecuted, totalNodes);
     this.emitProgress('summary', summary);
   }
   ```

### Definition of Done
- ✅ Progress events buffered for performance
- ✅ Immediate emission for errors
- ✅ Debug logging implemented
- ✅ Progress aggregation added
- ✅ Tests updated for new behavior

## Task 4.8.5: Update CLI Commands

### Objective
Modify the analyze and refine commands to use AgentRunner instead of direct parsing.

### Implementation Steps

1. **Update AnalyzeCommand**

   Update `src/cli/commands/analyze.ts`:
   ```typescript
   import { AgentRunner } from '../../services/agent-runner';
   import { ProgressEvent } from '../../types/agent-runner.types';
   
   private async execute(file: string, options: any): Promise<void> {
     const progress = this.createProgress();
     
     try {
       // Validate model option
       if (options.model && !AI_MODELS[options.model as AIModel]) {
         throw new Error(`Invalid model: ${options.model}. Valid options are: ${Object.keys(AI_MODELS).join(', ')}`);
       }
       
       // Create agent runner
       const agentRunner = new AgentRunner(this.fileHandler);
       
       // Connect progress events
       let lastNode = '';
       agentRunner.on('progress', (event: ProgressEvent) => {
         // Update spinner with node-specific messages
         if (event.node !== lastNode) {
           lastNode = event.node;
           
           if (event.level === 'error') {
             progress.fail(event.message);
           } else if (event.level === 'warning') {
             progress.warn(event.message);
           } else {
             progress.update(event.message);
           }
         }
       });
       
       // Handle interruption
       const handleInterrupt = () => {
         progress.update('🛑 Interrupting analysis...');
         agentRunner.interrupt();
       };
       
       process.once('SIGINT', handleInterrupt);
       process.once('SIGTERM', handleInterrupt);
       
       // Start analysis
       progress.start('🤖 Starting AI-powered analysis...');
       
       const result = await agentRunner.analyze(file, {
         modelName: options.model,
         forceNewSession: options.fresh
       });
       
       // Clean up interrupt handlers
       process.removeListener('SIGINT', handleInterrupt);
       process.removeListener('SIGTERM', handleInterrupt);
       
       // Save results
       progress.update('💾 Saving analysis results...');
       const outputPath = path.resolve(options.output);
       
       // Convert to org-mode format
       const exportData = {
         ...result,
         validationScore: 100, // For compatibility
         parsingErrors: []
       };
       
       await this.fileHandler.writeDocument(exportData, outputPath, 'orgmode');
       
       // Success message
       progress.succeed(`✅ Analysis complete! Results saved to: ${outputPath}`);
       
       // Show summary
       this.showAnalysisSummary(result);
       
     } catch (error: any) {
       if (error.message.includes('interrupted')) {
         progress.warn('⚠️  Analysis was interrupted');
       } else {
         progress.fail('❌ Analysis failed');
       }
       this.handleError(error);
     }
   }
   
   private showAnalysisSummary(result: AnalysisResult): void {
     console.log('\n📊 Analysis Summary:');
     console.log(`   • Requirements: ${result.requirements.length}`);
     console.log(`   • User Stories: ${result.userStories.length}`);
     console.log(`   • Ideas Analyzed: ${result.brainstormIdeas.length}`);
     
     if (result.moscowAnalysis) {
       const { must, should, could, wont } = result.moscowAnalysis;
       console.log(`   • MoSCoW: ${must.length} Must, ${should.length} Should, ${could.length} Could, ${wont.length} Won't`);
     }
     
     if (result.dependencies && result.dependencies.length > 0) {
       console.log(`   • Dependencies: ${result.dependencies.length} relationships identified`);
     }
     
     if (result.suggestions && result.suggestions.length > 0) {
       console.log(`   • Suggestions: ${result.suggestions.length} improvements proposed`);
     }
     
     console.log(`\n⏱️  Analysis completed in ${(result.executionTime / 1000).toFixed(1)}s`);
     console.log(`🔍 Nodes executed: ${result.nodesExecuted.join(' → ')}\n`);
   }
   ```

2. **Update RefineCommand**

   Update `src/cli/commands/refine.ts`:
   ```typescript
   import { AgentRunner } from '../../services/agent-runner';
   
   private async execute(file: string, options: any): Promise<void> {
     const progress = this.createProgress();
     
     try {
       // Validate model
       if (options.model && !AI_MODELS[options.model as AIModel]) {
         throw new Error(`Invalid model: ${options.model}`);
       }
       
       // Create agent runner
       const agentRunner = new AgentRunner(this.fileHandler);
       
       // Connect progress events
       agentRunner.on('progress', (event: ProgressEvent) => {
         if (event.level === 'error') {
           progress.fail(event.message);
         } else if (event.level === 'warning') {
           progress.warn(event.message);
         } else {
           progress.update(event.message);
         }
       });
       
       // Handle interruption
       const handleInterrupt = () => {
         progress.update('🛑 Interrupting refinement...');
         agentRunner.interrupt();
       };
       
       process.once('SIGINT', handleInterrupt);
       
       // Start refinement
       progress.start('🔄 Starting refinement with user feedback...');
       
       const result = await agentRunner.refine(file, {
         modelName: options.model
       });
       
       // Clean up
       process.removeListener('SIGINT', handleInterrupt);
       
       // Generate output path
       const outputPath = options.output || 
         VersionHelper.generateVersionedPath(file, result.refinementIteration);
       
       // Save results
       progress.update('💾 Saving refined analysis...');
       await this.fileHandler.writeDocument(result, outputPath, 'orgmode');
       
       // Success
       progress.succeed(`✅ Refinement complete! Results saved to: ${outputPath}`);
       
       // Show refinement summary
       this.showRefinementSummary(result);
       
     } catch (error: any) {
       if (error.message.includes('interrupted')) {
         progress.warn('⚠️  Refinement was interrupted');
       } else if (error.message.includes('No previous analysis')) {
         progress.fail('❌ No previous analysis found');
         console.error('\n💡 Tip: Run "ideaforge analyze" on this file first\n');
       } else {
         progress.fail('❌ Refinement failed');
       }
       this.handleError(error);
     }
   }
   
   private showRefinementSummary(result: RefinementResult): void {
     console.log('\n🔄 Refinement Summary:');
     console.log(`   • Iteration: #${result.refinementIteration}`);
     console.log(`   • Changes Applied: ${result.changesApplied.length}`);
     
     if (result.changesApplied.length > 0) {
       console.log('\n📝 Changes:');
       result.changesApplied.forEach(change => {
         console.log(`   • ${change}`);
       });
     }
     
     console.log(`\n⏱️  Refinement completed in ${(result.executionTime / 1000).toFixed(1)}s\n`);
   }
   ```

3. **Add new CLI options**

   Update command definitions:
   ```typescript
   // In analyze.ts
   program
     .command('analyze <file>')
     .description('Analyze an org-mode project template with AI-powered insights')
     .option('-o, --output <path>', 'output file path', 'ideaforge-results.org')
     .option('-m, --model <model>', `AI model to use (${Object.keys(AI_MODELS).join(', ')})`, 'o3-mini')
     .option('--fresh', 'start fresh analysis (ignore previous sessions)')
     .action(async (file: string, options: any) => {
       await this.execute(file, options);
     });
   ```

### Definition of Done
- ✅ AnalyzeCommand uses AgentRunner
- ✅ RefineCommand uses AgentRunner
- ✅ Progress events properly displayed
- ✅ Interruption handled cleanly
- ✅ Summary information shown
- ✅ Backward compatibility maintained

## Task 4.8.6: Implement Interruption Handling

### Objective
Add robust interruption support that gracefully handles Ctrl+C during long operations.

### Implementation Steps

1. **Enhance interruption in AgentRunner**

   Update interruption handling in `src/services/agent-runner.ts`:
   ```typescript
   private interruptHandlers: Array<() => void> = [];
   private cleanupPromise?: Promise<void>;
   
   /**
    * Enhanced interruption with cleanup
    */
   async interrupt(): Promise<void> {
     if (this.interrupted) {
       return this.cleanupPromise || Promise.resolve();
     }
     
     this.interrupted = true;
     this.emitProgress('system', 'Interruption requested...', 'warning');
     
     // Start cleanup
     this.cleanupPromise = this.performCleanup();
     
     try {
       await this.cleanupPromise;
       this.emit('interrupted');
     } catch (error) {
       this.emitProgress('system', 'Cleanup failed', 'error');
       throw error;
     }
   }
   
   /**
    * Perform cleanup operations
    */
   private async performCleanup(): Promise<void> {
     const cleanupTasks: Promise<void>[] = [];
     
     // Save partial state if executing
     if (this.isExecuting) {
       cleanupTasks.push(
         this.sessionManager.saveState()
           .then(() => {
             this.emitProgress('system', 'Partial state saved', 'info');
           })
           .catch(() => {
             this.emitProgress('system', 'Could not save state', 'warning');
           })
       );
     }
     
     // Run registered cleanup handlers
     this.interruptHandlers.forEach(handler => {
       try {
         handler();
       } catch (error) {
         console.error('Cleanup handler error:', error);
       }
     });
     
     // Wait for all cleanup
     await Promise.allSettled(cleanupTasks);
     
     // Stop progress buffer
     this.stopProgressBuffer();
   }
   
   /**
    * Register a cleanup handler
    */
   onInterrupt(handler: () => void): void {
     this.interruptHandlers.push(handler);
   }
   ```

2. **Add timeout protection**

   Add execution timeouts:
   ```typescript
   private readonly DEFAULT_TIMEOUT = 5 * 60 * 1000; // 5 minutes
   
   /**
    * Execute with timeout protection
    */
   private async executeWithTimeout<T>(
     operation: Promise<T>,
     timeoutMs: number = this.DEFAULT_TIMEOUT
   ): Promise<T> {
     let timeoutId: NodeJS.Timeout;
     
     const timeoutPromise = new Promise<never>((_, reject) => {
       timeoutId = setTimeout(() => {
         this.interrupt();
         reject(new Error('Operation timed out'));
       }, timeoutMs);
     });
     
     try {
       const result = await Promise.race([operation, timeoutPromise]);
       clearTimeout(timeoutId!);
       return result;
     } catch (error) {
       clearTimeout(timeoutId!);
       throw error;
     }
   }
   ```

3. **Update CLI commands for better interruption**

   Enhance interrupt handling in commands:
   ```typitten
   // In analyze.ts execute method
   let interrupted = false;
   
   const handleInterrupt = async () => {
     if (interrupted) return;
     interrupted = true;
     
     console.log('\n'); // New line for clean output
     progress.update('🛑 Gracefully stopping analysis...');
     
     try {
       await agentRunner.interrupt();
       progress.warn('⚠️  Analysis interrupted - partial results may be saved');
     } catch (error) {
       progress.fail('❌ Failed to stop gracefully');
     }
     
     // Give time for cleanup
     setTimeout(() => {
       process.exit(1);
     }, 2000);
   };
   
   process.once('SIGINT', handleInterrupt);
   process.once('SIGTERM', handleInterrupt);
   
   // Ensure cleanup on exit
   process.once('beforeExit', () => {
     process.removeListener('SIGINT', handleInterrupt);
     process.removeListener('SIGTERM', handleInterrupt);
   });
   ```

### Definition of Done
- ✅ Graceful interruption with cleanup
- ✅ Partial state saved on interrupt
- ✅ Timeout protection added
- ✅ Clean console output
- ✅ No hanging processes
- ✅ Tests cover interruption scenarios

## Task 4.8.7: Add Comprehensive Error Handling

### Objective
Implement robust error handling with helpful messages and recovery suggestions.

### Implementation Steps

1. **Create error classifier**

   Add to `src/services/agent-runner.ts`:
   ```typescript
   /**
    * Classify and enhance error messages
    */
   private classifyError(error: any, context: string): Error {
     // API Key errors
     if (error.message?.includes('OPENAI_API_KEY') || 
         error.message?.includes('API key')) {
       return new Error(
         'OpenAI API key not configured.\n' +
         '  1. Copy .env.example to .env\n' +
         '  2. Add your OpenAI API key\n' +
         '  3. Try again'
       );
     }
     
     // Rate limit errors
     if (error.response?.status === 429 || 
         error.message?.includes('rate limit')) {
       return new Error(
         'OpenAI rate limit exceeded.\n' +
         '  • Wait a moment and try again\n' +
         '  • Consider using a different model\n' +
         '  • Check your OpenAI usage dashboard'
       );
     }
     
     // File errors
     if (error.code === 'ENOENT') {
       return new Error(
         `File not found: ${error.path}\n` +
         '  • Check the file path is correct\n' +
         '  • Ensure the file exists\n' +
         '  • Try using an absolute path'
       );
     }
     
     // Model errors
     if (error.message?.includes('model')) {
       return new Error(
         `AI model error: ${error.message}\n` +
         '  • Try a different model with --model\n' +
         '  • Available models: ${Object.keys(AI_MODELS).join(', ')}`
       );
     }
     
     // Network errors
     if (error.code === 'ECONNREFUSED' || 
         error.code === 'ETIMEDOUT') {
       return new Error(
         'Network connection failed.\n' +
         '  • Check your internet connection\n' +
         '  • Verify firewall settings\n' +
         '  • Try again in a moment'
       );
     }
     
     // State errors
     if (error.message?.includes('checkpoint') || 
         error.message?.includes('session')) {
       return new Error(
         `Session error: ${error.message}\n` +
         '  • Try running with --fresh flag\n' +
         '  • Clear session: ideaforge session --clear ${context}`
       );
     }
     
     // Generic error with context
     const enhancedMessage = `${context} failed: ${error.message}`;
     
     if (process.env.DEBUG) {
       console.error('\n[DEBUG] Full error:', error);
       console.error('[DEBUG] Stack trace:', error.stack);
     }
     
     return new Error(enhancedMessage);
   }
   
   /**
    * Wrap operations with error handling
    */
   private async withErrorHandling<T>(
     operation: () => Promise<T>,
     context: string
   ): Promise<T> {
     try {
       return await operation();
     } catch (error) {
       throw this.classifyError(error, context);
     }
   }
   ```

2. **Add retry logic for transient errors**

   ```typescript
   /**
    * Retry operation with exponential backoff
    */
   private async withRetry<T>(
     operation: () => Promise<T>,
     maxRetries: number = 3,
     context: string = 'Operation'
   ): Promise<T> {
     let lastError: any;
     
     for (let attempt = 1; attempt <= maxRetries; attempt++) {
       try {
         return await operation();
       } catch (error: any) {
         lastError = error;
         
         // Don't retry certain errors
         if (error.message?.includes('API key') ||
             error.code === 'ENOENT' ||
             this.interrupted) {
           throw error;
         }
         
         // Check if retryable
         const isRetryable = 
           error.response?.status === 429 || // Rate limit
           error.code === 'ETIMEDOUT' ||      // Timeout
           error.code === 'ECONNRESET';       // Connection reset
         
         if (!isRetryable || attempt === maxRetries) {
           throw error;
         }
         
         // Calculate backoff
         const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
         
         this.emitProgress(
           'retry',
           `${context} failed (attempt ${attempt}/${maxRetries}), retrying in ${backoffMs}ms...`,
           'warning'
         );
         
         await new Promise(resolve => setTimeout(resolve, backoffMs));
       }
     }
     
     throw lastError;
   }
   ```

3. **Create error recovery guide**

   Add help command to show recovery options:
   ```typescript
   // In CLI index.ts
   program
     .command('troubleshoot')
     .description('Show troubleshooting guide for common issues')
     .action(() => {
       console.log(`
   🔧 IdeaForge Troubleshooting Guide
   
   Common Issues and Solutions:
   
   1. "OpenAI API key not configured"
      • Copy .env.example to .env
      • Add your OpenAI API key
      • Get a key at: https://platform.openai.com/api-keys
   
   2. "Rate limit exceeded"
      • Wait 1-2 minutes before retrying
      • Use a different model: --model gpt-3.5-turbo
      • Check usage: https://platform.openai.com/usage
   
   3. "No previous analysis found"
      • Run 'ideaforge analyze' first
      • Check the file path is correct
      • Use 'ideaforge session <file>' to check status
   
   4. "Analysis interrupted"
      • Your partial results may be saved
      • Run the command again to continue
      • Use --fresh to start over
   
   5. "File not found"
      • Check the file path and spelling
      • Use absolute paths if needed
      • Ensure .org extension
   
   For more help:
   • Run with DEBUG=1 for detailed logs
   • Check docs: https://github.com/your/ideaforge
   • Report issues: https://github.com/your/ideaforge/issues
       `);
     });
   ```

### Testing Error Scenarios

Create `tests/services/agent-runner-errors.test.ts`:
```typescript
describe('AgentRunner Error Handling', () => {
  it('should handle missing API key', async () => {
    const error = new Error('Missing OPENAI_API_KEY');
    mockFileHandler.readOrgFile.mockRejectedValue(error);
    
    await expect(agentRunner.analyze('test.org'))
      .rejects.toThrow('OpenAI API key not configured');
  });
  
  it('should handle rate limits with retry', async () => {
    const rateLimitError = { response: { status: 429 } };
    let attempts = 0;
    
    mockFileHandler.readOrgFile.mockImplementation(() => {
      attempts++;
      if (attempts < 3) {
        throw rateLimitError;
      }
      return { raw: 'test' };
    });
    
    // Should eventually succeed after retries
    // Test implementation...
  });
});
```

### Definition of Done
- ✅ Error messages are helpful and actionable
- ✅ Retry logic for transient failures
- ✅ Troubleshooting guide available
- ✅ Debug mode provides full details
- ✅ No cryptic error messages
- ✅ All error paths tested

## Final Integration Testing

After completing all subtasks:

1. **End-to-End Test**:
   ```bash
   # Clean state
   rm -rf .ideaforge
   
   # Test full flow
   ./bin/ideaforge analyze ideaforge-template.org
   ./bin/ideaforge refine ideaforge-results.org
   ```

2. **Interruption Test**:
   ```bash
   # Start analysis and press Ctrl+C
   ./bin/ideaforge analyze large-file.org
   # Press Ctrl+C during execution
   # Verify graceful shutdown
   ```

3. **Error Scenarios**:
   ```bash
   # Missing API key
   unset OPENAI_API_KEY
   ./bin/ideaforge analyze test.org
   
   # Invalid file
   ./bin/ideaforge analyze missing.org
   
   # No previous analysis
   ./bin/ideaforge refine new-file.org
   ```

4. **Performance Test**:
   ```bash
   time ./bin/ideaforge analyze large-project.org
   # Should complete in < 5 minutes
   ```

5. **All Tests Pass**:
   ```bash
   npm test
   # Should have 280+ passing tests
   ```

## Summary

Task 4.8 creates the critical bridge between the CLI and LangGraph, enabling:
- AI-powered analysis through familiar commands
- Real-time progress feedback
- Graceful interruption handling
- Helpful error messages
- State persistence between sessions

With this complete, IdeaForge becomes a fully functional AI-powered planning assistant! 